/**
 * Template Variable System - Grafana-compatible variable management
 * Supports query-based, chained, interval, and custom variables
 */

import { EventEmitter } from 'events';
import { DataSourceApi } from '@/core/plugins/types';

export enum VariableType {
  Query = 'query',
  Custom = 'custom',
  Textbox = 'textbox',
  Constant = 'constant',
  DataSource = 'datasource',
  Interval = 'interval',
  AdHoc = 'adhoc',
}

export enum VariableRefresh {
  Never = 'never',
  OnDashboardLoad = 'load',
  OnTimeRangeChange = 'time',
}

export interface VariableOption {
  text: string;
  value: string;
  selected?: boolean;
}

export interface TemplateVariable {
  id: string;
  name: string;
  label?: string;
  type: VariableType;
  query?: string;
  datasource?: string;
  current: VariableOption | VariableOption[];
  options: VariableOption[];
  multi: boolean;
  includeAll: boolean;
  allValue?: string;
  regex?: string;
  refresh: VariableRefresh;
  hide: 0 | 1 | 2; // 0: show, 1: hide label, 2: hide variable
  sort: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0: disabled, 1: alpha asc, 2: alpha desc, 3: numeric asc, 4: numeric desc, 5: alpha case-insensitive asc, 6: alpha case-insensitive desc
  tagValuesQuery?: string;
  tagsQuery?: string;
  useTags?: boolean;
  definition?: string;
  // Interval specific
  auto?: boolean;
  auto_min?: string;
  auto_count?: number;
  // Query specific
  queryValue?: string;
  // Dependencies
  dependsOn?: string[];
}

export interface VariableModel extends TemplateVariable {
  state: 'NotStarted' | 'Loading' | 'Done' | 'Error';
  error?: string;
}

export class TemplateVariableSystem extends EventEmitter {
  private variables: Map<string, VariableModel> = new Map();
  private datasources: Map<string, DataSourceApi> = new Map();
  private updateQueue: string[] = [];
  private isUpdating = false;

  constructor() {
    super();
  }

  // Add or update a variable
  addVariable(variable: TemplateVariable): void {
    const model: VariableModel = {
      ...variable,
      state: 'NotStarted',
    };
    
    this.variables.set(variable.name, model);
    this.emit('variableAdded', variable.name);
    
    // Queue update
    this.queueVariableUpdate(variable.name);
  }

  // Remove a variable
  removeVariable(name: string): void {
    this.variables.delete(name);
    this.emit('variableRemoved', name);
  }

  // Get all variables
  getVariables(): VariableModel[] {
    return Array.from(this.variables.values());
  }

  // Get a specific variable
  getVariable(name: string): VariableModel | undefined {
    return this.variables.get(name);
  }

  // Set data source for variable queries
  setDataSource(uid: string, datasource: DataSourceApi): void {
    this.datasources.set(uid, datasource);
  }

  // Queue variable update
  private queueVariableUpdate(name: string): void {
    if (!this.updateQueue.includes(name)) {
      this.updateQueue.push(name);
    }
    
    if (!this.isUpdating) {
      this.processUpdateQueue();
    }
  }

  // Process update queue
  private async processUpdateQueue(): Promise<void> {
    this.isUpdating = true;

    while (this.updateQueue.length > 0) {
      const name = this.updateQueue.shift()!;
      const variable = this.variables.get(name);
      
      if (variable) {
        await this.updateVariable(variable);
      }
    }

    this.isUpdating = false;
  }

  // Update a variable's values
  private async updateVariable(variable: VariableModel): Promise<void> {
    // Check dependencies
    if (variable.dependsOn && variable.dependsOn.length > 0) {
      const dependenciesReady = variable.dependsOn.every(dep => {
        const depVar = this.variables.get(dep);
        return depVar && depVar.state === 'Done';
      });

      if (!dependenciesReady) {
        // Queue for later
        setTimeout(() => this.queueVariableUpdate(variable.name), 100);
        return;
      }
    }

    variable.state = 'Loading';
    this.emit('variableUpdating', variable.name);

    try {
      switch (variable.type) {
        case VariableType.Query:
          await this.updateQueryVariable(variable);
          break;
        case VariableType.Custom:
          this.updateCustomVariable(variable);
          break;
        case VariableType.Interval:
          this.updateIntervalVariable(variable);
          break;
        case VariableType.DataSource:
          await this.updateDataSourceVariable(variable);
          break;
        case VariableType.Textbox:
          this.updateTextboxVariable(variable);
          break;
        case VariableType.Constant:
          this.updateConstantVariable(variable);
          break;
        case VariableType.AdHoc:
          await this.updateAdHocVariable(variable);
          break;
      }

      variable.state = 'Done';
      this.emit('variableUpdated', variable.name);

      // Update dependent variables
      this.updateDependentVariables(variable.name);
      
    } catch (error) {
      variable.state = 'Error';
      variable.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('variableError', variable.name, error);
    }
  }

  // Update query variable
  private async updateQueryVariable(variable: VariableModel): Promise<void> {
    if (!variable.query || !variable.datasource) {
      throw new Error('Query variable requires query and datasource');
    }

    const datasource = this.datasources.get(variable.datasource);
    if (!datasource) {
      throw new Error(`Data source ${variable.datasource} not found`);
    }

    // Replace variables in query
    const interpolatedQuery = this.interpolateVariables(variable.query);

    // Execute query
    const result = await datasource.metricFindQuery?.(interpolatedQuery);
    if (!result) {
      variable.options = [];
      return;
    }

    // Process results
    let options: VariableOption[] = result.map(item => ({
      text: item.text || item.value,
      value: item.value,
    }));

    // Apply regex filter if specified
    if (variable.regex) {
      const regex = new RegExp(variable.regex);
      options = options.filter(opt => regex.test(opt.value));
    }

    // Sort options
    options = this.sortOptions(options, variable.sort);

    // Add 'All' option if enabled
    if (variable.includeAll) {
      options.unshift({
        text: 'All',
        value: variable.allValue || '$__all',
      });
    }

    variable.options = options;

    // Set current value
    if (options.length > 0) {
      if (variable.multi) {
        variable.current = [options[0]];
      } else {
        variable.current = options[0];
      }
    }
  }

  // Update custom variable
  private updateCustomVariable(variable: VariableModel): void {
    if (!variable.query) {
      variable.options = [];
      return;
    }

    // Parse custom values (comma-separated)
    const values = variable.query.split(',').map(v => v.trim());
    let options: VariableOption[] = values.map(value => {
      const parts = value.split(':');
      return {
        text: parts[1] || parts[0],
        value: parts[0],
      };
    });

    // Sort options
    options = this.sortOptions(options, variable.sort);

    // Add 'All' option if enabled
    if (variable.includeAll) {
      options.unshift({
        text: 'All',
        value: variable.allValue || '$__all',
      });
    }

    variable.options = options;

    // Set current value
    if (options.length > 0) {
      if (variable.multi) {
        variable.current = [options[0]];
      } else {
        variable.current = options[0];
      }
    }
  }

  // Update interval variable
  private updateIntervalVariable(variable: VariableModel): void {
    if (!variable.query) {
      variable.options = [];
      return;
    }

    // Parse interval values
    const intervals = variable.query.split(',').map(v => v.trim());
    const options: VariableOption[] = intervals.map(interval => ({
      text: interval,
      value: interval,
    }));

    // Add auto option if enabled
    if (variable.auto) {
      options.unshift({
        text: 'auto',
        value: '$__auto_interval_' + variable.name,
      });
    }

    variable.options = options;
    variable.current = options[0];
  }

  // Update data source variable
  private async updateDataSourceVariable(variable: VariableModel): Promise<void> {
    // Get all data sources of specified type
    const allDataSources = Array.from(this.datasources.entries());
    let options: VariableOption[] = [];

    if (variable.query) {
      // Filter by type
      options = allDataSources
        .filter(([_, ds]) => ds.type === variable.query)
        .map(([uid, ds]) => ({
          text: ds.name,
          value: uid,
        }));
    } else {
      // All data sources
      options = allDataSources.map(([uid, ds]) => ({
        text: ds.name,
        value: uid,
      }));
    }

    variable.options = options;
    if (options.length > 0) {
      variable.current = options[0];
    }
  }

  // Update textbox variable
  private updateTextboxVariable(variable: VariableModel): void {
    const value = variable.query || '';
    variable.options = [{ text: value, value }];
    variable.current = variable.options[0];
  }

  // Update constant variable
  private updateConstantVariable(variable: VariableModel): void {
    const value = variable.query || '';
    variable.options = [{ text: value, value }];
    variable.current = variable.options[0];
  }

  // Update ad hoc variable
  private async updateAdHocVariable(variable: VariableModel): Promise<void> {
    // Ad hoc filters are handled differently
    variable.options = [];
    variable.current = [];
  }

  // Update dependent variables
  private updateDependentVariables(variableName: string): void {
    this.variables.forEach(variable => {
      if (variable.dependsOn && variable.dependsOn.includes(variableName)) {
        this.queueVariableUpdate(variable.name);
      }
    });
  }

  // Interpolate variables in a string
  interpolateVariables(text: string): string {
    let result = text;

    // Replace variable references
    this.variables.forEach((variable, name) => {
      const pattern = new RegExp(`\\$\\{?${name}\\}?`, 'g');
      const value = this.getVariableValue(variable);
      result = result.replace(pattern, value);
    });

    // Replace built-in variables
    result = result.replace(/\$__interval/g, '1m');
    result = result.replace(/\$__rate_interval/g, '1m');
    result = result.replace(/\$__range/g, '1h');

    return result;
  }

  // Get variable value as string
  private getVariableValue(variable: VariableModel): string {
    if (Array.isArray(variable.current)) {
      // Multi-value
      if (variable.current.some(opt => opt.value === '$__all')) {
        // All selected - return all values except 'All'
        return variable.options
          .filter(opt => opt.value !== '$__all')
          .map(opt => opt.value)
          .join(',');
      }
      return variable.current.map(opt => opt.value).join(',');
    } else {
      // Single value
      return variable.current?.value || '';
    }
  }

  // Sort options
  private sortOptions(options: VariableOption[], sort: number): VariableOption[] {
    switch (sort) {
      case 0: // disabled
        return options;
      case 1: // alpha asc
        return [...options].sort((a, b) => a.text.localeCompare(b.text));
      case 2: // alpha desc
        return [...options].sort((a, b) => b.text.localeCompare(a.text));
      case 3: // numeric asc
        return [...options].sort((a, b) => {
          const numA = parseFloat(a.value);
          const numB = parseFloat(b.value);
          return isNaN(numA) || isNaN(numB) ? 0 : numA - numB;
        });
      case 4: // numeric desc
        return [...options].sort((a, b) => {
          const numA = parseFloat(a.value);
          const numB = parseFloat(b.value);
          return isNaN(numA) || isNaN(numB) ? 0 : numB - numA;
        });
      case 5: // alpha case-insensitive asc
        return [...options].sort((a, b) => 
          a.text.toLowerCase().localeCompare(b.text.toLowerCase())
        );
      case 6: // alpha case-insensitive desc
        return [...options].sort((a, b) => 
          b.text.toLowerCase().localeCompare(a.text.toLowerCase())
        );
      default:
        return options;
    }
  }

  // Set variable value
  setVariableValue(name: string, value: string | string[]): void {
    const variable = this.variables.get(name);
    if (!variable) return;

    if (variable.multi && Array.isArray(value)) {
      variable.current = value.map(v => {
        const option = variable.options.find(opt => opt.value === v);
        return option || { text: v, value: v };
      });
    } else if (!variable.multi && typeof value === 'string') {
      const option = variable.options.find(opt => opt.value === value);
      variable.current = option || { text: value, value };
    }

    this.emit('variableValueChanged', name, value);
    
    // Update dependent variables
    this.updateDependentVariables(name);
  }

  // Refresh variables based on refresh setting
  refreshVariables(trigger: 'load' | 'time'): void {
    this.variables.forEach(variable => {
      if (
        variable.refresh === VariableRefresh.OnDashboardLoad && trigger === 'load' ||
        variable.refresh === VariableRefresh.OnTimeRangeChange && trigger === 'time'
      ) {
        this.queueVariableUpdate(variable.name);
      }
    });
  }

  // Get variable URL parameters
  getUrlParams(): Record<string, string> {
    const params: Record<string, string> = {};
    
    this.variables.forEach((variable, name) => {
      if (variable.hide !== 2) { // Not hidden
        const value = this.getVariableValue(variable);
        if (value) {
          params[`var-${name}`] = value;
        }
      }
    });

    return params;
  }

  // Set variables from URL parameters
  setFromUrlParams(params: URLSearchParams): void {
    params.forEach((value, key) => {
      if (key.startsWith('var-')) {
        const varName = key.substring(4);
        if (value.includes(',')) {
          this.setVariableValue(varName, value.split(','));
        } else {
          this.setVariableValue(varName, value);
        }
      }
    });
  }
}

export const templateVariableSystem = new TemplateVariableSystem();