import { TemplateVariable } from '@/types/dashboard';

export type VariableType = 'query' | 'custom' | 'interval' | 'datasource' | 'constant' | 'textbox';

export interface Variable extends TemplateVariable {
  id: string;
  type: VariableType;
  query?: string;
  datasource?: string;
  refresh?: 0 | 1 | 2; // Never, On Dashboard Load, On Time Range Change
  regex?: string;
  sort?: 0 | 1 | 2 | 3 | 4 | 5 | 6; // Disabled, Alphabetical (asc), Alphabetical (desc), Numerical (asc), Numerical (desc), Alphabetical (case-insensitive, asc), Alphabetical (case-insensitive, desc)
  multi?: boolean;
  includeAll?: boolean;
  allValue?: string;
  tags?: string[];
  tagsQuery?: string;
  tagValuesQuery?: string;
  useTags?: boolean;
}

export interface VariableModel {
  [key: string]: Variable;
}

export class VariableSystem {
  private variables: Map<string, Variable> = new Map();
  private values: Map<string, any> = new Map();
  private dependencies: Map<string, Set<string>> = new Map();
  private changeListeners: Set<(variable: Variable, value: any) => void> = new Set();

  constructor() {
    this.initializeDefaultVariables();
  }

  private initializeDefaultVariables() {
    // Time interval variable
    this.addVariable({
      id: '__interval',
      name: '__interval',
      type: 'interval',
      label: 'Interval',
      current: { text: '30s', value: '30s' },
      options: [
        { text: '10s', value: '10s' },
        { text: '30s', value: '30s' },
        { text: '1m', value: '1m' },
        { text: '5m', value: '5m' },
        { text: '10m', value: '10m' },
        { text: '30m', value: '30m' },
        { text: '1h', value: '1h' }
      ],
      query: '',
      hide: 2 // Hide variable
    });

    // Auto interval variable
    this.addVariable({
      id: '__interval_ms',
      name: '__interval_ms',
      type: 'interval',
      label: 'Interval (ms)',
      current: { text: '30000', value: 30000 },
      query: '',
      hide: 2
    });
  }

  addVariable(variable: Variable): void {
    this.variables.set(variable.id, variable);
    this.values.set(variable.id, variable.current?.value);
    
    // Parse dependencies from query
    if (variable.query) {
      const deps = this.extractDependencies(variable.query);
      this.dependencies.set(variable.id, deps);
    }
  }

  removeVariable(id: string): void {
    this.variables.delete(id);
    this.values.delete(id);
    this.dependencies.delete(id);
    
    // Remove from other variables' dependencies
    this.dependencies.forEach((deps, varId) => {
      deps.delete(id);
    });
  }

  async updateVariable(id: string, updates: Partial<Variable>): Promise<void> {
    const variable = this.variables.get(id);
    if (!variable) return;

    const updatedVariable = { ...variable, ...updates };
    this.variables.set(id, updatedVariable);

    // Update dependencies if query changed
    if (updates.query !== undefined) {
      const deps = this.extractDependencies(updates.query);
      this.dependencies.set(id, deps);
    }

    // Refresh variable values if needed
    if (updates.query || updates.refresh) {
      await this.refreshVariable(id);
    }
  }

  async setValue(id: string, value: any): Promise<void> {
    const variable = this.variables.get(id);
    if (!variable) return;

    this.values.set(id, value);
    
    // Update current value in variable
    if (variable.multi && Array.isArray(value)) {
      variable.current = {
        text: value.join(' + '),
        value: value
      };
    } else {
      const option = variable.options?.find(opt => opt.value === value);
      variable.current = option || { text: String(value), value };
    }

    // Notify listeners
    this.changeListeners.forEach(listener => listener(variable, value));

    // Refresh dependent variables
    await this.refreshDependentVariables(id);
  }

  getValue(id: string): any {
    return this.values.get(id);
  }

  getVariable(id: string): Variable | undefined {
    return this.variables.get(id);
  }

  getAllVariables(): Variable[] {
    return Array.from(this.variables.values());
  }

  async refreshVariable(id: string): Promise<void> {
    const variable = this.variables.get(id);
    if (!variable) return;

    switch (variable.type) {
      case 'query':
        await this.refreshQueryVariable(variable);
        break;
      case 'custom':
        this.refreshCustomVariable(variable);
        break;
      case 'interval':
        this.refreshIntervalVariable(variable);
        break;
      // Add other variable types as needed
    }
  }

  private async refreshQueryVariable(variable: Variable): Promise<void> {
    if (!variable.query) return;

    try {
      // Replace variables in query
      const interpolatedQuery = this.interpolateVariables(variable.query);
      
      // Execute query (this would be your actual data fetching logic)
      const results = await this.executeQuery(interpolatedQuery, variable.datasource);
      
      // Process results
      const options = this.processQueryResults(results, variable);
      variable.options = options;

      // Set default value if not set
      if (!variable.current && options.length > 0) {
        if (variable.multi && variable.includeAll) {
          await this.setValue(variable.id, ['$__all']);
        } else if (variable.multi) {
          await this.setValue(variable.id, [options[0].value]);
        } else {
          await this.setValue(variable.id, options[0].value);
        }
      }
    } catch (error) {
      console.error(`Failed to refresh query variable ${variable.id}:`, error);
    }
  }

  private refreshCustomVariable(variable: Variable): void {
    if (!variable.query) return;

    // Parse custom values (comma-separated)
    const values = variable.query.split(',').map(v => v.trim());
    variable.options = values.map(value => ({
      text: value,
      value: value
    }));

    // Add "All" option if enabled
    if (variable.includeAll) {
      variable.options.unshift({
        text: 'All',
        value: '$__all'
      });
    }
  }

  private refreshIntervalVariable(variable: Variable): void {
    // Interval variables have predefined options
    if (!variable.options) {
      variable.options = [
        { text: '1m', value: '1m' },
        { text: '5m', value: '5m' },
        { text: '10m', value: '10m' },
        { text: '30m', value: '30m' },
        { text: '1h', value: '1h' },
        { text: '3h', value: '3h' },
        { text: '6h', value: '6h' },
        { text: '12h', value: '12h' },
        { text: '1d', value: '1d' }
      ];
    }
  }

  private async refreshDependentVariables(changedVariableId: string): Promise<void> {
    const dependentVariables = Array.from(this.dependencies.entries())
      .filter(([_, deps]) => deps.has(changedVariableId))
      .map(([varId]) => varId);

    for (const varId of dependentVariables) {
      await this.refreshVariable(varId);
    }
  }

  interpolateVariables(text: string): string {
    let interpolated = text;

    // Replace $variableName with value
    this.variables.forEach((variable, id) => {
      const value = this.values.get(id);
      const pattern = new RegExp(`\\$${variable.name}`, 'g');
      
      if (Array.isArray(value)) {
        // Handle multi-value variables
        if (value.includes('$__all')) {
          // Replace with all values
          const allValues = variable.options
            ?.filter(opt => opt.value !== '$__all')
            .map(opt => opt.value) || [];
          interpolated = interpolated.replace(pattern, allValues.join(','));
        } else {
          interpolated = interpolated.replace(pattern, value.join(','));
        }
      } else {
        interpolated = interpolated.replace(pattern, String(value));
      }
    });

    // Handle special variables
    interpolated = interpolated.replace(/\$__interval/g, this.getValue('__interval') || '1m');
    interpolated = interpolated.replace(/\$__interval_ms/g, this.getValue('__interval_ms') || '60000');

    return interpolated;
  }

  private extractDependencies(query: string): Set<string> {
    const deps = new Set<string>();
    const variablePattern = /\$(\w+)/g;
    let match;

    while ((match = variablePattern.exec(query)) !== null) {
      const varName = match[1];
      const variable = Array.from(this.variables.values()).find(v => v.name === varName);
      if (variable) {
        deps.add(variable.id);
      }
    }

    return deps;
  }

  private async executeQuery(query: string, datasource?: string): Promise<any[]> {
    // This is a placeholder - implement your actual query execution logic
    // For now, return mock data based on query patterns
    
    if (query.includes('SELECT DISTINCT')) {
      // Mock equipment query
      if (query.includes('equipment')) {
        return [
          { text: 'Line 1', value: 'line1' },
          { text: 'Line 2', value: 'line2' },
          { text: 'Line 3', value: 'line3' }
        ];
      }
      // Mock shift query
      if (query.includes('shift')) {
        return [
          { text: 'Morning', value: 'morning' },
          { text: 'Afternoon', value: 'afternoon' },
          { text: 'Night', value: 'night' }
        ];
      }
    }

    return [];
  }

  private processQueryResults(results: any[], variable: Variable): Array<{ text: string; value: any }> {
    let options = results;

    // Apply regex filter if specified
    if (variable.regex) {
      const regex = new RegExp(variable.regex);
      options = options.filter(item => regex.test(item.text || item.value));
    }

    // Sort options
    if (variable.sort !== undefined && variable.sort !== 0) {
      options.sort((a, b) => {
        const aVal = a.text || a.value;
        const bVal = b.text || b.value;

        switch (variable.sort) {
          case 1: // Alphabetical (asc)
            return aVal.localeCompare(bVal);
          case 2: // Alphabetical (desc)
            return bVal.localeCompare(aVal);
          case 3: // Numerical (asc)
            return parseFloat(aVal) - parseFloat(bVal);
          case 4: // Numerical (desc)
            return parseFloat(bVal) - parseFloat(aVal);
          case 5: // Alphabetical (case-insensitive, asc)
            return aVal.toLowerCase().localeCompare(bVal.toLowerCase());
          case 6: // Alphabetical (case-insensitive, desc)
            return bVal.toLowerCase().localeCompare(aVal.toLowerCase());
          default:
            return 0;
        }
      });
    }

    // Add "All" option if enabled
    if (variable.includeAll) {
      options.unshift({
        text: 'All',
        value: variable.allValue || '$__all'
      });
    }

    return options;
  }

  onChange(listener: (variable: Variable, value: any) => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }
}

// Singleton instance
export const variableSystem = new VariableSystem();
