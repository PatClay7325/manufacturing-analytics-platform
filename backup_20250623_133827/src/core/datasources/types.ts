/**
 * Data Source Types - Analytics-compatible data source interfaces
 * Defines the contract for all data source implementations
 */

export interface DataQuery {
  refId: string;
  expr?: string;
  interval?: string;
  intervalFactor?: number;
  legendFormat?: string;
  maxDataPoints?: number;
  hide?: boolean;
}

export interface TimeRange {
  from: Date | string;
  to: Date | string;
  raw: {
    from: string;
    to: string;
  };
}

export interface DataQueryRequest<T extends DataQuery = DataQuery> {
  app?: string;
  requestId?: string;
  timezone?: string;
  panelId?: number;
  dashboardId?: number;
  range: TimeRange;
  interval: string;
  intervalMs: number;
  maxDataPoints?: number;
  targets: T[];
  adhocFilters?: any[];
  scopedVars?: Record<string, any>;
  startTime?: number;
  endTime?: number;
}

export interface DataPoint {
  timestamp: number;
  value: number | string | null;
}

export interface TimeSeries {
  target: string;
  datapoints: DataPoint[];
  tags?: Record<string, string>;
  meta?: Record<string, any>;
}

export interface DataQueryResponse {
  data: TimeSeries[];
  state?: LoadingState;
  error?: DataQueryError;
  key?: string;
  request?: DataQueryRequest;
}

export interface DataQueryError {
  message: string;
  status?: string;
  statusText?: string;
  data?: {
    message?: string;
    error?: string;
  };
}

export enum LoadingState {
  NotStarted = 'NotStarted',
  Loading = 'Loading', 
  Streaming = 'Streaming',
  Done = 'Done',
  Error = 'Error',
}

export interface DataSourceInstanceSettings {
  id: number;
  uid: string;
  type: string;
  name: string;
  url: string;
  access: string;
  basicAuth?: boolean;
  basicAuthUser?: string;
  basicAuthPassword?: string;
  withCredentials?: boolean;
  isDefault?: boolean;
  jsonData: Record<string, any>;
  secureJsonData?: Record<string, any>;
  readOnly?: boolean;
  database?: string;
  user?: string;
}

export interface TestDataSourceResponse {
  status: 'success' | 'error';
  message: string;
  title?: string;
}

export interface MetricFindValue {
  text: string;
  value: string | number;
  expandable?: boolean;
}

export abstract class DataSourceApi<
  TQuery extends DataQuery = DataQuery,
  TOptions = any
> {
  name: string;
  type: string;
  uid: string;
  id: number;
  instanceSettings: DataSourceInstanceSettings;

  constructor(instanceSettings: DataSourceInstanceSettings) {
    this.instanceSettings = instanceSettings;
    this.id = instanceSettings.id;
    this.uid = instanceSettings.uid;
    this.type = instanceSettings.type;
    this.name = instanceSettings.name;
  }

  /**
   * Main query method - must be implemented by all data sources
   */
  abstract query(request: DataQueryRequest<TQuery>): Promise<DataQueryResponse>;

  /**
   * Test connection to data source
   */
  abstract testDatasource(): Promise<TestDataSourceResponse>;

  /**
   * Get metric names for template variables
   */
  abstract metricFindQuery?(query: string): Promise<MetricFindValue[]>;

  /**
   * Get tag keys for template variables
   */
  getTagKeys?(options?: any): Promise<MetricFindValue[]>;

  /**
   * Get tag values for template variables
   */
  getTagValues?(options: { key: string; filters?: any[] }): Promise<MetricFindValue[]>;

  /**
   * Import queries from another data source
   */
  importQueries?(queries: TQuery[], originMeta: any): Promise<TQuery[]>;

  /**
   * Get query hints
   */
  getQueryHints?(query: TQuery, results: any[]): any[];

  /**
   * Modify query before execution
   */
  modifyQuery?(query: TQuery, action: any): TQuery;

  /**
   * Get default query
   */
  getDefaultQuery?(app: string): Partial<TQuery>;

  /**
   * Filter ad-hoc filters
   */
  getAdhocFilters?(): any[];

  /**
   * Apply ad-hoc filters
   */
  applyTemplateVariables?(query: TQuery, scopedVars: Record<string, any>): TQuery;
}

export interface DataSourceSettings {
  id: number;
  uid: string;
  type: string;
  name: string;
  url: string;
  access: 'direct' | 'proxy';
  basicAuth: boolean;
  basicAuthUser?: string;
  basicAuthPassword?: string;
  withCredentials: boolean;
  isDefault: boolean;
  jsonData: Record<string, any>;
  secureJsonData?: Record<string, any>;
  readOnly: boolean;
  database?: string;
  user?: string;
  version?: number;
}