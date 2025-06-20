/**
 * Variable System Types - Grafana-compatible template variables
 * Supports query variables, custom variables, constant variables, and more
 */

export enum VariableType {
  Query = 'query',
  Custom = 'custom',
  Constant = 'constant',
  DataSource = 'datasource',
  Interval = 'interval',
  TextBox = 'textbox',
  Adhoc = 'adhoc',
}

export enum VariableHide {
  DontHide = 0,
  HideLabel = 1,
  HideVariable = 2,
}

export enum VariableRefresh {
  Never = 0,
  OnDashboardLoad = 1,
  OnTimeRangeChange = 2,
}

export enum VariableSort {
  Disabled = 0,
  AlphabeticalAsc = 1,
  AlphabeticalDesc = 2,
  NumericalAsc = 3,
  NumericalDesc = 4,
  AlphabeticalCaseInsensitiveAsc = 5,
  AlphabeticalCaseInsensitiveDesc = 6,
}

export interface VariableOption {
  text: string | string[];
  value: string | string[];
  selected?: boolean;
}

export interface VariableModel {
  id: string;
  name: string;
  type: VariableType;
  label?: string;
  description?: string;
  hide: VariableHide;
  skipUrlSync?: boolean;
  
  // Current state
  current: VariableOption;
  options: VariableOption[];
  
  // Configuration
  multi?: boolean;
  includeAll?: boolean;
  allValue?: string;
  
  // Query variables
  query?: string;
  datasource?: string;
  refresh?: VariableRefresh;
  regex?: string;
  sort?: VariableSort;
  
  // Custom variables
  custom?: string;
  
  // Interval variables
  auto?: boolean;
  auto_count?: number;
  auto_min?: string;
  
  // Error state
  error?: string;
  loading?: boolean;
}

export interface VariableQueryRequest {
  variable: VariableModel;
  searchFilter?: string;
  scopedVars?: ScopedVars;
}

export interface ScopedVars {
  [key: string]: ScopedVar;
}

export interface ScopedVar {
  text: string | string[];
  value: string | string[];
  selected?: boolean;
}

export interface VariableWithOptions extends VariableModel {
  options: VariableOption[];
  current: VariableOption;
}

export interface VariableRefreshEvent {
  variable: VariableModel;
  type: 'variable-changed' | 'time-range-changed' | 'dashboard-loaded';
}

export interface VariableInterpolation {
  variable: string;
  format?: VariableFormat;
  scopedVars?: ScopedVars;
}

export enum VariableFormat {
  Lucene = 'lucene',
  Regex = 'regex',
  Pipe = 'pipe',
  Distributed = 'distributed',
  Csv = 'csv',
  Json = 'json',
  SqlString = 'sqlstring',
  Raw = 'raw',
  Text = 'text',
  PercentEncode = 'percentencode',
  UriEncode = 'uriencode',
  QueryParam = 'queryparam',
  Glob = 'glob',
  Date = 'date',
}

export interface VariableTextMatch {
  match: string;
  variableName: string;
  fieldPath?: string;
  format?: VariableFormat;
}

export interface VariableUpdatePayload {
  variable: VariableModel;
  option: VariableOption;
  updateUrl?: boolean;
}

export interface VariableQueryRunner {
  executeQuery(request: VariableQueryRequest): Promise<VariableOption[]>;
}

export interface VariableService {
  // Variable management
  addVariable(variable: VariableModel): void;
  removeVariable(variableId: string): void;
  updateVariable(variable: VariableModel): void;
  getVariable(name: string): VariableModel | undefined;
  getAllVariables(): VariableModel[];
  
  // Variable value updates
  setVariableValue(name: string, option: VariableOption): Promise<void>;
  refreshVariable(name: string): Promise<void>;
  refreshAllVariables(): Promise<void>;
  
  // Variable interpolation
  replace(text: string, scopedVars?: ScopedVars): string;
  getVariables(text: string): VariableTextMatch[];
  
  // Event handling
  onVariableChanged(callback: (event: VariableRefreshEvent) => void): void;
  offVariableChanged(callback: (event: VariableRefreshEvent) => void): void;
}