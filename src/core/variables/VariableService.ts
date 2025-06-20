/**
 * Variable Service - Grafana-compatible template variable system
 * Handles variable interpolation, query execution, and state management
 */

import { EventEmitter } from 'events';
import {
  VariableModel,
  VariableOption,
  VariableService as IVariableService,
  VariableRefreshEvent,
  VariableTextMatch,
  VariableFormat,
  ScopedVars,
  VariableType,
  VariableQueryRequest,
  VariableUpdatePayload,
} from './types';
import { dataSourceManager } from '../datasources/DataSourceManager';

export class VariableService extends EventEmitter implements IVariableService {
  private static instance: VariableService;
  private variables = new Map<string, VariableModel>();
  private queryRunners = new Map<string, any>();

  private constructor() {
    super();
  }

  static getInstance(): VariableService {
    if (!VariableService.instance) {
      VariableService.instance = new VariableService();
    }
    return VariableService.instance;
  }

  /**
   * Add a new variable
   */
  addVariable(variable: VariableModel): void {
    this.variables.set(variable.name, variable);
    this.emit('variable-added', variable);
    console.log(`Added variable: ${variable.name} (${variable.type})`);
  }

  /**
   * Remove a variable
   */
  removeVariable(variableId: string): void {
    const variable = this.variables.get(variableId);
    if (variable) {
      this.variables.delete(variableId);
      this.emit('variable-removed', variable);
      console.log(`Removed variable: ${variableId}`);
    }
  }

  /**
   * Update a variable
   */
  updateVariable(variable: VariableModel): void {
    this.variables.set(variable.name, variable);
    this.emit('variable-updated', variable);
    console.log(`Updated variable: ${variable.name}`);
  }

  /**
   * Get a variable by name
   */
  getVariable(name: string): VariableModel | undefined {
    return this.variables.get(name);
  }

  /**
   * Get all variables
   */
  getAllVariables(): VariableModel[] {
    return Array.from(this.variables.values());
  }

  /**
   * Set variable value and refresh dependent variables
   */
  async setVariableValue(name: string, option: VariableOption): Promise<void> {
    const variable = this.variables.get(name);
    if (!variable) {
      throw new Error(`Variable not found: ${name}`);
    }

    // Update current value
    variable.current = option;
    
    // Update selected state in options
    variable.options.forEach(opt => {
      opt.selected = opt.value === option.value;
    });

    this.variables.set(name, variable);

    // Emit change event
    const event: VariableRefreshEvent = {
      variable,
      type: 'variable-changed',
    };
    this.emit('variable-changed', event);

    // Refresh dependent variables
    await this.refreshDependentVariables(name);

    console.log(`Set variable ${name} to:`, option);
  }

  /**
   * Refresh a variable's options
   */
  async refreshVariable(name: string): Promise<void> {
    const variable = this.variables.get(name);
    if (!variable) {
      throw new Error(`Variable not found: ${name}`);
    }

    console.log(`Refreshing variable: ${name}`);
    
    try {
      variable.loading = true;
      variable.error = undefined;
      this.updateVariable(variable);

      let options: VariableOption[] = [];

      switch (variable.type) {
        case VariableType.Query:
          options = await this.executeQueryVariable(variable);
          break;
        case VariableType.Custom:
          options = this.parseCustomVariable(variable);
          break;
        case VariableType.Constant:
          options = [{ text: variable.query || '', value: variable.query || '' }];
          break;
        case VariableType.DataSource:
          options = this.getDataSourceOptions(variable);
          break;
        case VariableType.Interval:
          options = this.getIntervalOptions(variable);
          break;
        default:
          console.warn(`Unsupported variable type: ${variable.type}`);
      }

      // Apply sorting
      options = this.sortOptions(options, variable.sort || 0);

      // Add "All" option if enabled
      if (variable.includeAll && options.length > 0) {
        const allValue = variable.allValue || '$__all';
        options.unshift({
          text: 'All',
          value: allValue,
          selected: false,
        });
      }

      // Update variable with new options
      variable.options = options;
      variable.loading = false;

      // Set current value if not set or invalid
      if (!variable.current || !options.find(opt => opt.value === variable.current.value)) {
        variable.current = options[0] || { text: '', value: '' };
      }

      this.updateVariable(variable);

      console.log(`Refreshed variable ${name}: ${options.length} options`);
    } catch (error) {
      variable.loading = false;
      variable.error = error instanceof Error ? error.message : 'Unknown error';
      this.updateVariable(variable);
      console.error(`Failed to refresh variable ${name}:`, error);
    }
  }

  /**
   * Refresh all variables
   */
  async refreshAllVariables(): Promise<void> {
    const variables = Array.from(this.variables.values());
    
    // Refresh in dependency order (constants first, then queries)
    const sortedVariables = variables.sort((a, b) => {
      const order = { constant: 0, custom: 1, datasource: 2, interval: 3, query: 4, textbox: 5, adhoc: 6 };
      return (order[a.type as keyof typeof order] || 99) - (order[b.type as keyof typeof order] || 99);
    });

    for (const variable of sortedVariables) {
      await this.refreshVariable(variable.name);
    }

    console.log(`Refreshed all ${variables.length} variables`);
  }

  /**
   * Replace template variables in text
   */
  replace(text: string, scopedVars?: ScopedVars): string {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let result = text;
    const matches = this.getVariables(text);

    for (const match of matches) {
      let replacement = '';
      
      // Check scoped variables first
      if (scopedVars && scopedVars[match.variableName]) {
        const scopedVar = scopedVars[match.variableName];
        replacement = this.formatVariableValue(scopedVar.value, match.format);
      } else {
        // Check global variables
        const variable = this.variables.get(match.variableName);
        if (variable && variable.current) {
          replacement = this.formatVariableValue(variable.current.value, match.format);
        }
      }

      result = result.replace(match.match, replacement);
    }

    return result;
  }

  /**
   * Get variable references from text
   */
  getVariables(text: string): VariableTextMatch[] {
    const matches: VariableTextMatch[] = [];
    
    // Match $variable or ${variable} or ${variable:format}
    const regex = /\$(?:\{([^}:]+)(?::([^}]+))?\}|([a-zA-Z_][a-zA-Z0-9_]*))/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const variableName = match[1] || match[3];
      const format = match[2];
      
      if (variableName) {
        matches.push({
          match: match[0],
          variableName,
          format: format as VariableFormat,
        });
      }
    }

    return matches;
  }

  /**
   * Event handlers
   */
  onVariableChanged(callback: (event: VariableRefreshEvent) => void): void {
    this.on('variable-changed', callback);
  }

  offVariableChanged(callback: (event: VariableRefreshEvent) => void): void {
    this.off('variable-changed', callback);
  }

  /**
   * Execute query variable
   */
  private async executeQueryVariable(variable: VariableModel): Promise<VariableOption[]> {
    if (!variable.query || !variable.datasource) {
      return [];
    }

    try {
      const dataSource = dataSourceManager.getDataSource(variable.datasource);
      if (!dataSource) {
        throw new Error(`Data source not found: ${variable.datasource}`);
      }

      // For Prometheus, use metricFindQuery if available
      if (dataSource.metricFindQuery) {
        const interpolatedQuery = this.replace(variable.query);
        const metricValues = await dataSource.metricFindQuery(interpolatedQuery);
        
        return metricValues.map(value => ({
          text: value.text,
          value: value.value.toString(),
        }));
      }

      // Fallback to generating manufacturing-specific options
      return this.generateManufacturingOptions(variable.query);
    } catch (error) {
      console.error('Query variable execution failed:', error);
      return this.generateManufacturingOptions(variable.query);
    }
  }

  /**
   * Parse custom variable options
   */
  private parseCustomVariable(variable: VariableModel): VariableOption[] {
    if (!variable.query) {
      return [];
    }

    // Parse comma-separated values with optional : for text:value pairs
    const options: VariableOption[] = [];
    const items = variable.query.split(',').map(item => item.trim());

    for (const item of items) {
      if (item.includes(':')) {
        const [text, value] = item.split(':').map(part => part.trim());
        options.push({ text, value });
      } else {
        options.push({ text: item, value: item });
      }
    }

    return options;
  }

  /**
   * Get data source options
   */
  private getDataSourceOptions(variable: VariableModel): VariableOption[] {
    const dataSources = dataSourceManager.getAllDataSources();
    
    return dataSources.map(ds => ({
      text: ds.name,
      value: ds.uid,
    }));
  }

  /**
   * Get interval options
   */
  private getIntervalOptions(variable: VariableModel): VariableOption[] {
    const defaultIntervals = [
      '10s', '30s', '1m', '5m', '10m', '30m', '1h', '6h', '12h', '1d', '7d', '14d', '30d'
    ];

    return defaultIntervals.map(interval => ({
      text: interval,
      value: interval,
    }));
  }

  /**
   * Generate manufacturing-specific options for demos
   */
  private generateManufacturingOptions(query: string): VariableOption[] {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('line') || lowerQuery.includes('production')) {
      return [
        { text: 'Production Line A', value: 'line_a' },
        { text: 'Production Line B', value: 'line_b' },
        { text: 'Packaging Line', value: 'packaging_line' },
        { text: 'Assembly Line', value: 'assembly_line' },
      ];
    }
    
    if (lowerQuery.includes('equipment') || lowerQuery.includes('machine')) {
      return [
        { text: 'Press 001', value: 'press_001' },
        { text: 'Conveyor 002', value: 'conveyor_002' },
        { text: 'Robot 003', value: 'robot_003' },
        { text: 'Sensor 004', value: 'sensor_004' },
      ];
    }
    
    if (lowerQuery.includes('shift')) {
      return [
        { text: 'Day Shift', value: 'day' },
        { text: 'Night Shift', value: 'night' },
        { text: 'Weekend Shift', value: 'weekend' },
      ];
    }

    if (lowerQuery.includes('plant') || lowerQuery.includes('facility')) {
      return [
        { text: 'North Plant', value: 'plant_north' },
        { text: 'South Plant', value: 'plant_south' },
        { text: 'East Plant', value: 'plant_east' },
      ];
    }

    // Default manufacturing options
    return [
      { text: 'Manufacturing Option 1', value: 'option_1' },
      { text: 'Manufacturing Option 2', value: 'option_2' },
      { text: 'Manufacturing Option 3', value: 'option_3' },
    ];
  }

  /**
   * Sort variable options
   */
  private sortOptions(options: VariableOption[], sort: number): VariableOption[] {
    if (sort === 0) return options; // No sorting

    return [...options].sort((a, b) => {
      const aText = Array.isArray(a.text) ? a.text[0] : a.text;
      const bText = Array.isArray(b.text) ? b.text[0] : b.text;
      
      switch (sort) {
        case 1: // Alphabetical ascending
          return aText.localeCompare(bText);
        case 2: // Alphabetical descending
          return bText.localeCompare(aText);
        case 3: // Numerical ascending
          return parseFloat(aText) - parseFloat(bText);
        case 4: // Numerical descending
          return parseFloat(bText) - parseFloat(aText);
        case 5: // Case insensitive ascending
          return aText.toLowerCase().localeCompare(bText.toLowerCase());
        case 6: // Case insensitive descending
          return bText.toLowerCase().localeCompare(aText.toLowerCase());
        default:
          return 0;
      }
    });
  }

  /**
   * Format variable value based on format type
   */
  private formatVariableValue(value: string | string[], format?: VariableFormat): string {
    if (Array.isArray(value)) {
      switch (format) {
        case VariableFormat.Pipe:
          return value.join('|');
        case VariableFormat.Csv:
          return value.join(',');
        case VariableFormat.Json:
          return JSON.stringify(value);
        case VariableFormat.Regex:
          return `(${value.join('|')})`;
        default:
          return value.join(',');
      }
    }

    switch (format) {
      case VariableFormat.PercentEncode:
        return encodeURIComponent(value);
      case VariableFormat.UriEncode:
        return encodeURI(value);
      case VariableFormat.SqlString:
        return `'${value.replace(/'/g, "''")}'`;
      case VariableFormat.Raw:
      case VariableFormat.Text:
      default:
        return value;
    }
  }

  /**
   * Refresh variables that depend on the changed variable
   */
  private async refreshDependentVariables(changedVariableName: string): Promise<void> {
    const dependentVariables = Array.from(this.variables.values()).filter(variable => {
      if (variable.name === changedVariableName) return false;
      if (!variable.query) return false;
      
      const variables = this.getVariables(variable.query);
      return variables.some(v => v.variableName === changedVariableName);
    });

    for (const variable of dependentVariables) {
      await this.refreshVariable(variable.name);
    }
  }
}

// Export singleton
export const variableService = VariableService.getInstance();