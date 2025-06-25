/**
 * Analytics-compatible Variable Types and Interfaces
 * Implements all variable types supported by AnalyticsPlatform
 */

export type VariableType = 
  | 'query' 
  | 'custom' 
  | 'constant' 
  | 'datasource' 
  | 'interval' 
  | 'textbox' 
  | 'adhoc';

export type VariableRefresh = 
  | 'never' 
  | 'on-dashboard-load' 
  | 'on-time-range-change';

export type VariableSort = 
  | 'disabled' 
  | 'alphabetical' 
  | 'numerical' 
  | 'alphabetical-case-insensitive';

export type VariableHide = 
  | '' 
  | 'label' 
  | 'variable';

export interface VariableOption {
  text: string;
  value: string | string[];
  selected: boolean;
}

export interface Variable {
  id: string;
  name: string;
  label?: string;
  type: VariableType;
  query?: string;
  datasource?: string | null;
  current: VariableOption;
  options: VariableOption[];
  multi?: boolean;
  includeAll?: boolean;
  allValue?: string | null;
  refresh?: VariableRefresh;
  regex?: string;
  sort?: VariableSort;
  hide?: VariableHide;
  skipUrlSync?: boolean;
  description?: string;
  error?: string | null;
  state?: 'NotStarted' | 'Loading' | 'Streaming' | 'Done' | 'Error';
}

export interface QueryVariable extends Variable {
  type: 'query';
  datasource: string;
  query: string;
  regex?: string;
  sort?: VariableSort;
  refresh?: VariableRefresh;
  multi?: boolean;
  includeAll?: boolean;
  allValue?: string | null;
}

export interface CustomVariable extends Variable {
  type: 'custom';
  query: string; // CSV values
  multi?: boolean;
  includeAll?: boolean;
  allValue?: string | null;
}

export interface ConstantVariable extends Variable {
  type: 'constant';
  query: string; // The constant value
}

export interface DataSourceVariable extends Variable {
  type: 'datasource';
  query: string; // DataSource type (prometheus, influxdb, etc.)
  regex?: string;
  multi?: boolean;
  includeAll?: boolean;
}

export interface IntervalVariable extends Variable {
  type: 'interval';
  query: string; // Comma-separated intervals
  auto?: boolean;
  auto_min?: string;
  auto_count?: number;
}

export interface TextBoxVariable extends Variable {
  type: 'textbox';
  query?: string; // Default value
}

export interface AdHocVariable extends Variable {
  type: 'adhoc';
  datasource: string;
}

export interface BuiltInVariable {
  name: string;
  value: string | (() => string);
  description: string;
}

export interface VariableInterpolation {
  value: string | string[];
  format?: string;
}

export interface VariableUrlState {
  [key: string]: string | string[];
}

export interface TimeRange {
  from: string | Date;
  to: string | Date;
  raw: {
    from: string;
    to: string;
  };
}

export interface VariableContext {
  timeRange: TimeRange;
  scopedVars?: Record<string, any>;
  datasources?: DataSourceInstance[];
}

export interface DataSourceInstance {
  uid: string;
  name: string;
  type: string;
  url?: string;
  isDefault?: boolean;
}

export interface VariableQueryResult {
  text: string;
  value: string;
}

export interface VariableQueryOptions {
  datasource: string;
  query: string;
  regex?: string;
  sort?: VariableSort;
  multi?: boolean;
  includeAll?: boolean;
  allValue?: string | null;
  timeRange?: TimeRange;
}

export interface VariableDependencies {
  [variableName: string]: string[]; // List of variables this variable depends on
}

// Type guards
export function isQueryVariable(variable: Variable): variable is QueryVariable {
  return variable.type === 'query';
}

export function isCustomVariable(variable: Variable): variable is CustomVariable {
  return variable.type === 'custom';
}

export function isConstantVariable(variable: Variable): variable is ConstantVariable {
  return variable.type === 'constant';
}

export function isDataSourceVariable(variable: Variable): variable is DataSourceVariable {
  return variable.type === 'datasource';
}

export function isIntervalVariable(variable: Variable): variable is IntervalVariable {
  return variable.type === 'interval';
}

export function isTextBoxVariable(variable: Variable): variable is TextBoxVariable {
  return variable.type === 'textbox';
}

export function isAdHocVariable(variable: Variable): variable is AdHocVariable {
  return variable.type === 'adhoc';
}