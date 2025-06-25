/**
 * VariableManager - Core variable management system
 * Handles variable initialization, updates, interpolation, and dependencies
 */

import {
  Variable,
  VariableOption,
  VariableContext,
  QueryVariable,
  CustomVariable,
  IntervalVariable,
  DataSourceVariable,
  ConstantVariable,
  TextBoxVariable,
  VariableDependencies,
  BuiltInVariable,
  TimeRange,
  VariableQueryOptions
} from './VariableTypes';
import { VariableInterpolator } from './VariableInterpolator';

export class VariableManager {
  private variables = new Map<string, Variable>();
  private listeners = new Set<(variables: Variable[]) => void>();
  private dependencies: VariableDependencies = {};
  private interpolator: VariableInterpolator;
  
  // Built-in variables that AnalyticsPlatform provides
  private builtInVariables: BuiltInVariable[] = [
    { 
      name: '__interval', 
      value: () => this.calculateInterval(), 
      description: 'Interval for time series data' 
    },
    { 
      name: '__interval_ms', 
      value: () => String(this.calculateIntervalMs()), 
      description: 'Interval in milliseconds' 
    },
    { 
      name: '__range', 
      value: () => this.getTimeRange(), 
      description: 'Time range as a string' 
    },
    { 
      name: '__range_s', 
      value: () => String(this.getTimeRangeSeconds()), 
      description: 'Time range in seconds' 
    },
    { 
      name: '__rate_interval', 
      value: () => this.calculateRateInterval(), 
      description: 'Recommended rate interval for Prometheus' 
    },
    {
      name: '__from',
      value: () => String(this.context?.timeRange?.from || 'now-6h'),
      description: 'Start of time range'
    },
    {
      name: '__to',
      value: () => String(this.context?.timeRange?.to || 'now'),
      description: 'End of time range'
    },
    {
      name: '__name',
      value: 'Manufacturing AnalyticsPlatform',
      description: 'Dashboard name'
    },
    {
      name: '__org',
      value: () => String(this.context?.org?.id || 1),
      description: 'Organization ID'
    },
    {
      name: '__user',
      value: () => this.context?.user?.login || 'anonymous',
      description: 'Current user login'
    }
  ];

  private context: VariableContext & { org?: any; user?: any } = {
    timeRange: {
      from: 'now-6h',
      to: 'now',
      raw: { from: 'now-6h', to: 'now' }
    }
  };

  constructor() {
    this.interpolator = new VariableInterpolator(this);
  }

  /**
   * Initialize variables for a dashboard
   */
  async initializeVariables(variables: Variable[], context?: VariableContext): Promise<void> {
    if (context) {
      this.context = { ...this.context, ...context };
    }

    // Clear existing variables
    this.variables.clear();
    this.dependencies = {};

    // Build dependency graph
    this.buildDependencyGraph(variables);

    // Sort variables by dependencies
    const sorted = this.topologicalSort(variables);

    // Initialize each variable in order
    for (const variable of sorted) {
      variable.state = 'Loading';
      this.variables.set(variable.name, variable);
      
      try {
        await this.refreshVariable(variable);
        variable.state = 'Done';
      } catch (error) {
        variable.state = 'Error';
        variable.error = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to initialize variable ${variable.name}:`, error);
      }
    }

    this.notifyListeners();
  }

  /**
   * Refresh a single variable
   */
  async refreshVariable(variable: Variable): Promise<void> {
    variable.state = 'Loading';
    variable.error = null;

    try {
      switch (variable.type) {
        case 'query':
          await this.refreshQueryVariable(variable as QueryVariable);
          break;
        case 'custom':
          this.refreshCustomVariable(variable as CustomVariable);
          break;
        case 'interval':
          this.refreshIntervalVariable(variable as IntervalVariable);
          break;
        case 'datasource':
          await this.refreshDataSourceVariable(variable as DataSourceVariable);
          break;
        case 'constant':
          this.refreshConstantVariable(variable as ConstantVariable);
          break;
        case 'textbox':
          this.refreshTextBoxVariable(variable as TextBoxVariable);
          break;
        case 'adhoc':
          // Ad hoc filters are handled differently
          break;
      }

      // Apply regex filter if present
      if (variable.regex && variable.options) {
        variable.options = this.applyRegexFilter(variable.options, variable.regex);
      }

      // Sort options
      if (variable.sort && variable.sort !== 'disabled' && variable.options) {
        variable.options = this.sortOptions(variable.options, variable.sort);
      }

      // Add "All" option if enabled
      if (variable.includeAll && variable.type !== 'constant' && variable.type !== 'textbox') {
        variable.options.unshift({
          text: 'All',
          value: variable.allValue || '$__all',
          selected: false
        });
      }

      // Set current value
      this.updateCurrentValue(variable);
      variable.state = 'Done';
    } catch (error) {
      variable.state = 'Error';
      variable.error = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Update a variable's value
   */
  updateVariable(name: string, value: string | string[]): void {
    const variable = this.variables.get(name);
    if (!variable) return;

    // Update current value
    if (variable.multi && Array.isArray(value)) {
      variable.current = {
        text: value.length === 0 ? 'None' : value.join(' + '),
        value: value,
        selected: true
      };
    } else {
      const option = variable.options.find(opt => opt.value === value);
      if (option) {
        variable.current = { ...option, selected: true };
      } else {
        // For textbox variables or custom values
        variable.current = {
          text: String(value),
          value: String(value),
          selected: true
        };
      }
    }

    // Update selected state in options
    variable.options.forEach(opt => {
      if (Array.isArray(value)) {
        opt.selected = value.includes(opt.value as string);
      } else {
        opt.selected = opt.value === value;
      }
    });

    // Refresh dependent variables
    this.refreshDependentVariables(name);
    this.notifyListeners();
  }

  /**
   * Get interpolated query string
   */
  interpolateQuery(query: string, scopedVars?: Record<string, any>): string {
    return this.interpolator.interpolate(query, scopedVars);
  }

  /**
   * Get all variables
   */
  getVariables(): Variable[] {
    return Array.from(this.variables.values());
  }

  /**
   * Get a specific variable
   */
  getVariable(name: string): Variable | undefined {
    return this.variables.get(name);
  }

  /**
   * Get built-in variables
   */
  getBuiltInVariables(): BuiltInVariable[] {
    return this.builtInVariables;
  }

  /**
   * Subscribe to variable changes
   */
  subscribe(listener: (variables: Variable[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update context (e.g., time range)
   */
  updateContext(context: Partial<VariableContext>): void {
    this.context = { ...this.context, ...context };
    
    // Refresh variables that depend on time range
    const timeRangeVariables = this.getVariables().filter(
      v => v.refresh === 'on-time-range-change'
    );
    
    timeRangeVariables.forEach(v => this.refreshVariable(v));
  }

  // Private methods

  private async refreshQueryVariable(variable: QueryVariable): Promise<void> {
    if (!variable.datasource || !variable.query) {
      variable.options = [];
      return;
    }

    // Interpolate the query with current variables
    const interpolatedQuery = this.interpolateQuery(variable.query);

    // Execute query against datasource
    // This is a placeholder - actual implementation would use DataSourceAPI
    const options: VariableQueryOptions = {
      datasource: variable.datasource,
      query: interpolatedQuery,
      regex: variable.regex,
      sort: variable.sort,
      timeRange: this.context.timeRange
    };

    // Mock implementation - replace with actual datasource query
    const results = await this.executeVariableQuery(options);
    
    variable.options = results.map(result => ({
      text: result.text,
      value: result.value,
      selected: false
    }));
  }

  private refreshCustomVariable(variable: CustomVariable): void {
    if (!variable.query) {
      variable.options = [];
      return;
    }

    // Parse CSV values
    const values = variable.query.split(',').map(v => v.trim()).filter(v => v);
    
    variable.options = values.map(value => {
      // Support key : value format
      const parts = value.split(':').map(p => p.trim());
      if (parts.length === 2) {
        return {
          text: parts[0],
          value: parts[1],
          selected: false
        };
      }
      
      return {
        text: value,
        value: value,
        selected: false
      };
    });
  }

  private refreshIntervalVariable(variable: IntervalVariable): void {
    if (!variable.query) {
      variable.options = [];
      return;
    }

    const intervals = variable.query.split(',').map(v => v.trim()).filter(v => v);
    
    variable.options = intervals.map(interval => ({
      text: interval,
      value: interval,
      selected: false
    }));

    // Add auto option if enabled
    if (variable.auto) {
      variable.options.unshift({
        text: 'auto',
        value: this.calculateInterval(),
        selected: false
      });
    }
  }

  private async refreshDataSourceVariable(variable: DataSourceVariable): Promise<void> {
    const datasources = this.context.datasources || [];
    
    let filtered = datasources;
    if (variable.query) {
      // Filter by type
      filtered = datasources.filter(ds => ds.type === variable.query);
    }

    variable.options = filtered.map(ds => ({
      text: ds.name,
      value: ds.uid,
      selected: false
    }));
  }

  private refreshConstantVariable(variable: ConstantVariable): void {
    variable.options = [{
      text: variable.query || '',
      value: variable.query || '',
      selected: true
    }];
    variable.current = variable.options[0];
  }

  private refreshTextBoxVariable(variable: TextBoxVariable): void {
    const value = variable.current?.value || variable.query || '';
    variable.options = [{
      text: String(value),
      value: String(value),
      selected: true
    }];
    variable.current = variable.options[0];
  }

  private buildDependencyGraph(variables: Variable[]): void {
    this.dependencies = {};
    
    variables.forEach(variable => {
      this.dependencies[variable.name] = [];
      
      // Check if this variable references other variables
      const query = variable.query || '';
      variables.forEach(otherVar => {
        if (variable.name !== otherVar.name) {
          const regex = new RegExp(`\\$\\{?${otherVar.name}\\}?`, 'g');
          if (regex.test(query)) {
            this.dependencies[variable.name].push(otherVar.name);
          }
        }
      });
    });
  }

  private topologicalSort(variables: Variable[]): Variable[] {
    const sorted: Variable[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (variable: Variable) => {
      if (visited.has(variable.name)) return;
      if (visiting.has(variable.name)) {
        throw new Error(`Circular dependency detected involving variable: ${variable.name}`);
      }

      visiting.add(variable.name);

      const deps = this.dependencies[variable.name] || [];
      deps.forEach(depName => {
        const depVar = variables.find(v => v.name === depName);
        if (depVar) visit(depVar);
      });

      visiting.delete(variable.name);
      visited.add(variable.name);
      sorted.push(variable);
    };

    variables.forEach(variable => visit(variable));
    return sorted;
  }

  private refreshDependentVariables(variableName: string): void {
    const dependents = Object.entries(this.dependencies)
      .filter(([_, deps]) => deps.includes(variableName))
      .map(([name]) => name);

    dependents.forEach(name => {
      const variable = this.variables.get(name);
      if (variable) {
        this.refreshVariable(variable);
      }
    });
  }

  private applyRegexFilter(options: VariableOption[], regex: string): VariableOption[] {
    try {
      const pattern = new RegExp(regex);
      return options.filter(option => pattern.test(option.text));
    } catch (error) {
      console.error('Invalid regex pattern:', regex, error);
      return options;
    }
  }

  private sortOptions(options: VariableOption[], sort: string): VariableOption[] {
    const sorted = [...options];
    
    switch (sort) {
      case 'alphabetical':
        sorted.sort((a, b) => a.text.localeCompare(b.text));
        break;
      case 'alphabetical-case-insensitive':
        sorted.sort((a, b) => a.text.toLowerCase().localeCompare(b.text.toLowerCase()));
        break;
      case 'numerical':
        sorted.sort((a, b) => {
          const numA = parseFloat(a.text);
          const numB = parseFloat(b.text);
          if (isNaN(numA) || isNaN(numB)) {
            return a.text.localeCompare(b.text);
          }
          return numA - numB;
        });
        break;
    }
    
    return sorted;
  }

  private updateCurrentValue(variable: Variable): void {
    if (!variable.options || variable.options.length === 0) {
      variable.current = {
        text: '',
        value: '',
        selected: false
      };
      return;
    }

    // If current value exists and is still valid, keep it
    if (variable.current?.value) {
      const currentOption = variable.options.find(opt => {
        if (Array.isArray(variable.current.value)) {
          return Array.isArray(opt.value) && 
            JSON.stringify(opt.value) === JSON.stringify(variable.current.value);
        }
        return opt.value === variable.current.value;
      });
      
      if (currentOption) {
        variable.current = { ...currentOption, selected: true };
        return;
      }
    }

    // Otherwise, select the first option
    variable.current = { ...variable.options[0], selected: true };
    variable.options[0].selected = true;
  }

  private notifyListeners(): void {
    const variables = Array.from(this.variables.values());
    this.listeners.forEach(listener => listener(variables));
  }

  // Execute variable query against real datasource
  private async executeVariableQuery(options: VariableQueryOptions): Promise<Array<{text: string; value: string}>> {
    const { datasource, query, regex, sort, timeRange } = options;
    
    if (!datasource || !query) {
      return [];
    }
    
    try {
      // Get datasource instance
      const { getDataSourceManager } = await import('../datasources/DataSourceManager');
      const dsManager = getDataSourceManager();
      const ds = dsManager.getDataSource(datasource.uid || datasource.name || '');
      
      if (!ds) {
        console.error(`Data source not found: ${datasource.uid || datasource.name}`);
        return [];
      }
      
      // Execute metric find query
      const results = await ds.metricFindQuery(query, { timeRange });
      
      // Apply regex filter if specified
      let filtered = results;
      if (regex) {
        try {
          const regexObj = new RegExp(regex);
          filtered = results.filter(result => regexObj.test(result.value));
        } catch (e) {
          console.error('Invalid regex:', regex, e);
        }
      }
      
      // Apply sorting if specified
      if (sort !== undefined) {
        filtered.sort((a, b) => {
          switch (sort) {
            case 1: // Alphabetical asc
              return a.text.localeCompare(b.text);
            case 2: // Alphabetical desc
              return b.text.localeCompare(a.text);
            case 3: // Numerical asc
              return parseFloat(a.value) - parseFloat(b.value);
            case 4: // Numerical desc
              return parseFloat(b.value) - parseFloat(a.value);
            default:
              return 0;
          }
        });
      }
      
      return filtered;
    } catch (error) {
      console.error('Error executing variable query:', error);
      return [];
    }
  }

  /**
   * Update the time range context
   */
  updateTimeRange(timeRange: any): void {
    this.context.timeRange = timeRange;
    
    // Refresh variables that depend on time range
    this.variables.forEach(variable => {
      if (variable.refresh === 'onTimeRangeChanged') {
        this.refreshVariable(variable);
      }
    });
    
    this.notifyListeners();
  }

  // Helper methods for built-in variables
  private calculateInterval(): string {
    // Calculate based on time range and panel width
    // This is a simplified version
    const seconds = this.getTimeRangeSeconds();
    if (seconds <= 3600) return '10s'; // 1 hour
    if (seconds <= 21600) return '1m'; // 6 hours
    if (seconds <= 86400) return '5m'; // 24 hours
    if (seconds <= 604800) return '30m'; // 7 days
    return '1h';
  }

  private calculateIntervalMs(): number {
    const interval = this.calculateInterval();
    const match = interval.match(/(\d+)([smhd])/);
    if (!match) return 10000;
    
    const [, num, unit] = match;
    const multipliers: Record<string, number> = {
      's': 1000,
      'm': 60000,
      'h': 3600000,
      'd': 86400000
    };
    
    return parseInt(num) * (multipliers[unit] || 1000);
  }

  private getTimeRange(): string {
    const { from, to } = this.context.timeRange;
    return `${from} to ${to}`;
  }

  private getTimeRangeSeconds(): number {
    // Simplified calculation - would need proper date parsing
    // For now, estimate based on relative time strings
    const from = String(this.context.timeRange.from);
    if (from.includes('now-')) {
      const match = from.match(/now-(\d+)([smhd])/);
      if (match) {
        const [, num, unit] = match;
        const multipliers: Record<string, number> = {
          's': 1,
          'm': 60,
          'h': 3600,
          'd': 86400
        };
        return parseInt(num) * (multipliers[unit] || 1);
      }
    }
    return 21600; // Default 6 hours
  }

  private calculateRateInterval(): string {
    // Prometheus best practice: 4x scrape interval
    const interval = this.calculateInterval();
    const match = interval.match(/(\d+)([smhd])/);
    if (!match) return '1m';
    
    const [, num, unit] = match;
    const value = parseInt(num) * 4;
    return `${value}${unit}`;
  }
}

// Export singleton instance
export const variableManager = new VariableManager();