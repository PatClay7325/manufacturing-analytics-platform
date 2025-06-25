import { DataQuery, DataSourceRef, TimeRange } from '@/types/dashboard';

export interface QueryOptions {
  targets: DataQuery[];
  timeRange: TimeRange;
  maxDataPoints?: number;
  interval?: string;
  scopedVars?: Record<string, any>;
}

export interface QueryResult {
  data: TimeSeriesData[];
  error?: string;
  state: 'loading' | 'done' | 'error';
}

export interface TimeSeriesData {
  target: string;
  datapoints: Array<[number, number]>; // [value, timestamp]
  tags?: Record<string, string>;
}

export interface VariableQueryOptions {
  query: string;
  timeRange?: TimeRange;
  scopedVars?: Record<string, any>;
}

export interface VariableOption {
  text: string;
  value: string;
}

export interface TestResult {
  status: 'success' | 'error';
  message: string;
  details?: any;
}

export interface MetricFindValue {
  text: string;
  value: string;
  expandable?: boolean;
}

/**
 * Base interface for all data source plugins
 */
export abstract class DataSourcePlugin {
  constructor(
    public instanceSettings: DataSourceInstanceSettings
  ) {}

  /**
   * Execute queries and return time series data
   */
  abstract query(options: QueryOptions): Promise<QueryResult>;

  /**
   * Test data source connection
   */
  abstract testDatasource(): Promise<TestResult>;

  /**
   * Get variable options for template variables
   */
  abstract metricFindQuery(query: string, options?: VariableQueryOptions): Promise<MetricFindValue[]>;

  /**
   * Get tag keys for ad hoc filters
   */
  abstract getTagKeys?(): Promise<MetricFindValue[]>;

  /**
   * Get tag values for ad hoc filters
   */
  abstract getTagValues?(key: string): Promise<MetricFindValue[]>;

  /**
   * Interpolate variables in query
   */
  interpolateVariablesInQueries?(queries: DataQuery[], scopedVars: Record<string, any>): DataQuery[];
}

export interface DataSourceInstanceSettings {
  id: number;
  uid: string;
  type: string;
  name: string;
  url: string;
  jsonData: any;
  secureJsonData?: any;
  basicAuth?: boolean;
  basicAuthUser?: string;
  withCredentials?: boolean;
  isDefault?: boolean;
  version?: number;
}