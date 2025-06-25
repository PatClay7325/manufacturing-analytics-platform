import { Observable } from 'rxjs';
import { ComponentType } from 'react';
import {
  DataFrame,
  DataSourceInstanceSettings,
  DataQuery,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceJsonData,
  FieldType,
  LoadingState,
  CoreApp,
  PluginType,
  PluginSignatureStatus
} from '@grafana/data';

// Core data structures matching Grafana's exact specification
export interface DataSourcePlugin<
  TQuery extends DataQuery = DataQuery,
  TOptions extends DataSourceJsonData = DataSourceJsonData
> {
  id: string;
  name: string;
  type: string;
  module: string;
  baseUrl?: string;
  info: DataSourcePluginMeta;
  components: DataSourcePluginComponents<TQuery, TOptions>;
  
  // Instance of the datasource
  DataSource: DataSourceConstructor<TQuery, TOptions>;
  
  // Config control
  angularConfigCtrl?: any;
}

export interface DataSourceConstructor<
  TQuery extends DataQuery = DataQuery,
  TOptions extends DataSourceJsonData = DataSourceJsonData
> {
  new(instanceSettings: DataSourceInstanceSettings<TOptions>): DataSourceApi<TQuery, TOptions>;
}

export abstract class DataSourceApi<
  TQuery extends DataQuery = DataQuery,
  TOptions extends DataSourceJsonData = DataSourceJsonData
> {
  /**
   * Unique instance identifier
   */
  readonly id: number;
  readonly uid: string;
  readonly type: string;
  readonly name: string;

  /**
   * Request counter for queries
   */
  requestCounter = 0;

  constructor(public instanceSettings: DataSourceInstanceSettings<TOptions>) {
    this.id = instanceSettings.id;
    this.uid = instanceSettings.uid;
    this.type = instanceSettings.type;
    this.name = instanceSettings.name;
  }

  /**
   * Execute queries and return data frames
   */
  abstract query(request: DataQueryRequest<TQuery>): Observable<DataQueryResponse>;

  /**
   * Test datasource connection
   */
  abstract testDatasource(): Promise<DataSourceTestResult>;

  /**
   * Get metric options for query builder
   */
  async metricFindQuery?(query: string, options?: any): Promise<MetricFindValue[]>;

  /**
   * Get tag keys for ad hoc filters
   */
  async getTagKeys?(options?: any): Promise<MetricFindValue[]>;

  /**
   * Get tag values for ad hoc filters
   */
  async getTagValues?(options: any): Promise<MetricFindValue[]>;

  /**
   * Annotation support
   */
  async annotationQuery?(options: AnnotationQueryRequest<TQuery>): Promise<AnnotationEvent[]>;

  /**
   * Health check
   */
  async checkHealth?(): Promise<HealthCheckResult>;

  /**
   * Language provider for query suggestions
   */
  languageProvider?: any;

  /**
   * Get query hints
   */
  getQueryHints?(query: TQuery, results: any[]): QueryHint[];

  /**
   * Import queries from other systems
   */
  importQueries?(queries: TQuery[], originDataSource: DataSourceApi<TQuery, TOptions>): TQuery[];

  /**
   * Custom variable support
   */
  variables?: CustomVariableSupport<TQuery>;

  /**
   * Stream support
   */
  streamOptionsProvider?: StreamOptionsProvider<TQuery>;

  /**
   * Get data provider for live measurements
   */
  getDataProvider?(type: DataProviderType, request: DataQueryRequest<TQuery>): Observable<DataQueryResponse>;

  /**
   * Filter queries (for example, incomplete queries)
   */
  filterQuery?(query: TQuery): boolean;

  /**
   * Interpolate template variables
   */
  interpolateVariablesInQueries?(queries: TQuery[], scopedVars: ScopedVars): TQuery[];

  /**
   * Get supported features
   */
  getSupportedFeatures?(): DataSourceFeatures;
}

// Component interfaces
export interface DataSourcePluginComponents<
  TQuery extends DataQuery = DataQuery,
  TOptions extends DataSourceJsonData = DataSourceJsonData
> {
  QueryEditor: ComponentType<QueryEditorProps<TQuery, TOptions>>;
  ConfigEditor: ComponentType<DataSourceConfigEditorProps<TOptions>>;
  CheatSheet?: ComponentType<{}>;
  QueryCtrl?: any;
  AnnotationsQueryCtrl?: any;
  ExploreQueryField?: ComponentType<ExploreQueryFieldProps<TQuery, TOptions>>;
  ExploreStartPage?: ComponentType<ExploreStartPageProps<TQuery>>;
  VariableQueryEditor?: ComponentType<VariableQueryEditorProps<TQuery, TOptions>>;
  MetadataInspector?: ComponentType<MetadataInspectorProps<TQuery, TOptions>>;
}

// Query and data structures
export interface DataQuery {
  refId: string;
  hide?: boolean;
  key?: string;
  queryType?: string;
  datasource?: DataSourceRef | string | null;
  interval?: string;
  intervalMs?: number;
  maxDataPoints?: number;
}

export interface DataSourceRef {
  type?: string;
  uid?: string;
}

export interface DataQueryRequest<TQuery extends DataQuery = DataQuery> {
  requestId: string;
  interval: string;
  intervalMs: number;
  range: TimeRange;
  targets: TQuery[];
  scopedVars: ScopedVars;
  timezone: string;
  app: CoreApp | string;
  startTime: number;
  rangeRaw: RawTimeRange;
  searchFilter?: string;
  maxDataPoints?: number;
  liveStreaming?: boolean;
  queryGroupId?: string;
}

export interface DataQueryResponse {
  data: DataFrame[];
  key?: string;
  state?: LoadingState;
  error?: DataQueryError;
  errors?: DataQueryError[];
  request?: DataQueryRequest;
  timeRange?: TimeRange;
  traceIds?: string[];
}

// DataFrame structures (Grafana's unified data model)
export interface DataFrame {
  name?: string;
  refId?: string;
  fields: Field[];
  length: number;
  meta?: DataFrameMeta;
}

export interface Field<T = any> {
  name: string;
  type: FieldType;
  config: FieldConfig;
  values: T[] | ArrayVector<T>;
  labels?: Labels;
  state?: FieldState | null;
  display?: DisplayProcessor;
}

export interface FieldConfig<TOptions = any> {
  displayName?: string;
  displayNameFromDS?: string;
  description?: string;
  filterable?: boolean;
  writeable?: boolean;
  unit?: string;
  decimals?: number | null;
  min?: number | null;
  max?: number | null;
  mappings?: ValueMapping[];
  thresholds?: ThresholdsConfig;
  color?: FieldColorConfigSettings;
  nullValueMode?: NullValueMode;
  links?: DataLink[];
  noValue?: string;
  path?: string;
  custom?: TOptions;
}

// Time range structures
export interface TimeRange {
  from: DateTime;
  to: DateTime;
  raw: RawTimeRange;
}

export interface RawTimeRange {
  from: DateTime | string;
  to: DateTime | string;
}

export type DateTime = Date | string | number;

// Variable structures
export interface ScopedVars {
  [key: string]: ScopedVar;
}

export interface ScopedVar<T = any> {
  text: string | string[];
  value: T;
  selected?: boolean;
}

// Testing and health
export interface DataSourceTestResult {
  status: 'success' | 'error';
  message: string;
  details?: any;
}

export interface HealthCheckResult {
  status: 'ok' | 'warn' | 'error' | 'unknown';
  message: string;
  details?: Record<string, any>;
}

// Metric finding
export interface MetricFindValue {
  text: string;
  value?: string | number;
  expandable?: boolean;
}

// Annotations
export interface AnnotationQueryRequest<TQuery extends DataQuery = DataQuery> {
  range: TimeRange;
  rangeRaw: RawTimeRange;
  annotation: AnnotationQuery<TQuery>;
  dashboard: DashboardModel;
}

export interface AnnotationQuery<TQuery extends DataQuery = DataQuery> {
  datasource: string | null;
  enable: boolean;
  name?: string;
  iconColor?: string;
  hide?: boolean;
  target?: TQuery;
  limit?: number;
  matchAny?: boolean;
  tags?: string[];
  type?: string;
}

export interface AnnotationEvent {
  id?: string;
  annotation?: any;
  dashboardId?: number;
  panelId?: number;
  userId?: number;
  login?: string;
  email?: string;
  avatarUrl?: string;
  time: number;
  timeEnd?: number;
  isRegion?: boolean;
  title?: string;
  text?: string;
  type?: string;
  tags?: string[];
  color?: string;
  source?: any;
}

// Component prop types
export interface QueryEditorProps<
  TQuery extends DataQuery = DataQuery,
  TOptions extends DataSourceJsonData = DataSourceJsonData
> {
  datasource: DataSourceApi<TQuery, TOptions>;
  query: TQuery;
  onChange: (query: TQuery) => void;
  onRunQuery: () => void;
  onBlur?: () => void;
  data?: DataFrame[];
  range?: TimeRange;
  history?: HistoryItem[];
  queries?: TQuery[];
  app?: CoreApp;
}

export interface DataSourceConfigEditorProps<
  TOptions extends DataSourceJsonData = DataSourceJsonData
> {
  options: DataSourceSettings<TOptions>;
  onOptionsChange: (options: DataSourceSettings<TOptions>) => void;
}

// Settings and configuration
export interface DataSourceInstanceSettings<TOptions = DataSourceJsonData> {
  id: number;
  uid: string;
  type: string;
  name: string;
  url?: string;
  user?: string;
  database?: string;
  basicAuth?: boolean;
  basicAuthUser?: string;
  jsonData: TOptions;
  secureJsonFields: KeyValue<boolean>;
  readOnly: boolean;
  withCredentials?: boolean;
  access?: 'direct' | 'proxy';
  isDefault?: boolean;
}

export interface DataSourceSettings<TOptions = DataSourceJsonData> extends DataSourceInstanceSettings<TOptions> {
  orgId: number;
  password?: string;
  basicAuthPassword?: string;
  secureJsonData?: SecureJsonData;
  version?: number;
  created?: string;
  updated?: string;
}

export interface DataSourceJsonData {
  authType?: string;
  defaultRegion?: string;
  profile?: string;
  manageAlerts?: boolean;
  alertmanagerUid?: string;
}

export interface SecureJsonData {
  [key: string]: string;
}

// Supporting types
export interface KeyValue<T = any> {
  [key: string]: T;
}

export interface DataSourcePluginMeta {
  id: string;
  type: PluginType;
  name: string;
  info: PluginMetaInfo;
  module: string;
  baseUrl: string;
  annotations?: boolean;
  metrics?: boolean;
  alerting?: boolean;
  explore?: boolean;
  tracing?: boolean;
  logs?: boolean;
  streaming?: boolean;
  backend?: boolean;
  mixed?: boolean;
  hasQueryHelp?: boolean;
  category?: string;
  sort?: number;
  signature?: PluginSignatureStatus;
  dependencies?: PluginDependencies;
}

export interface PluginMetaInfo {
  author: {
    name: string;
    url?: string;
  };
  description: string;
  links: Array<{
    name: string;
    url: string;
  }>;
  logos: {
    small: string;
    large: string;
  };
  build?: {
    time?: number;
    repo?: string;
    branch?: string;
    hash?: string;
  };
  screenshots: Array<{
    name: string;
    path: string;
  }>;
  version: string;
  updated: string;
  keywords?: string[];
}

// Enums
export enum FieldType {
  time = 'time',
  number = 'number',
  string = 'string',
  boolean = 'boolean',
  trace = 'trace',
  geo = 'geo',
  other = 'other',
}

export enum LoadingState {
  NotStarted = 'NotStarted',
  Loading = 'Loading',
  Streaming = 'Streaming',
  Done = 'Done',
  Error = 'Error',
}

export enum CoreApp {
  CloudAlerting = 'cloud-alerting',
  Dashboard = 'dashboard',
  Explore = 'explore',
  Unknown = 'unknown',
  PanelEditor = 'panel-editor',
  PanelViewer = 'panel-viewer',
}

export enum PluginType {
  panel = 'panel',
  datasource = 'datasource',
  app = 'app',
  renderer = 'renderer',
  secretsmanager = 'secretsmanager',
}

export enum PluginSignatureStatus {
  internal = 'internal',
  valid = 'valid',
  invalid = 'invalid',
  modified = 'modified',
  unsigned = 'unsigned',
}

// Additional interfaces
export interface DataQueryError {
  data?: any;
  message?: string;
  status?: number;
  statusText?: string;
  refId?: string;
  cancelled?: boolean;
}

export interface DataFrameMeta {
  type?: DataFrameType;
  typeVersion?: [number, number];
  custom?: any;
  stats?: FieldStats[];
  notices?: DataLinkBuiltInVars[];
  path?: string;
  pathSeparator?: string;
  preferredVisualisationType?: PreferredVisualisationType;
  executedQueryString?: string;
}

export interface HistoryItem {
  ts: number;
  query: DataQuery;
}

export interface QueryHint {
  type: string;
  label: string;
  fix?: QueryFix;
}

export interface QueryFix {
  type: string;
  label?: string;
  action?: any;
}

export interface VariableQueryEditorProps<
  TQuery extends DataQuery = DataQuery,
  TOptions extends DataSourceJsonData = DataSourceJsonData
> {
  datasource: DataSourceApi<TQuery, TOptions>;
  query: VariableQuery;
  onChange: (query: VariableQuery, definition?: string) => void;
}

export interface VariableQuery {
  query: string;
  refId?: string;
}

export interface ExploreQueryFieldProps<
  TQuery extends DataQuery = DataQuery,
  TOptions extends DataSourceJsonData = DataSourceJsonData
> {
  datasource: DataSourceApi<TQuery, TOptions>;
  query: TQuery;
  onChange: (query: TQuery) => void;
  onRunQuery: () => void;
  onBlur?: () => void;
  history?: HistoryItem[];
  data?: DataFrame[];
  absoluteRange?: AbsoluteTimeRange;
}

export interface ExploreStartPageProps<TQuery extends DataQuery = DataQuery> {
  datasource?: DataSourceApi<TQuery>;
  exploreId: string;
  onClickExample: (query: TQuery) => void;
}

export interface MetadataInspectorProps<
  TQuery extends DataQuery = DataQuery,
  TOptions extends DataSourceJsonData = DataSourceJsonData
> {
  datasource: DataSourceApi<TQuery, TOptions>;
  data: DataFrame[];
}

export interface AbsoluteTimeRange {
  from: number;
  to: number;
}

export interface DashboardModel {
  id: number;
  uid: string;
  title: string;
  panels: PanelModel[];
  templating: { list: VariableModel[] };
  annotations: { list: AnnotationQuery[] };
}

export interface PanelModel {
  id: number;
  gridPos: GridPos;
  type: string;
  title: string;
  datasource?: DataSourceRef;
  targets: DataQuery[];
  options: any;
  fieldConfig: FieldConfigSource;
}

export interface GridPos {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FieldConfigSource {
  defaults: FieldConfig;
  overrides: ConfigOverrideRule[];
}

export interface ConfigOverrideRule {
  matcher: MatcherConfig;
  properties: DynamicConfigValue[];
}

export interface MatcherConfig {
  id: string;
  options?: any;
}

export interface DynamicConfigValue {
  id: string;
  value?: any;
}

export interface VariableModel {
  name: string;
  type: string;
  current: VariableOption;
  options: VariableOption[];
}

export interface VariableOption {
  text: string | string[];
  value: string | string[];
  selected?: boolean;
}

// Custom variable support
export interface CustomVariableSupport<TQuery extends DataQuery = DataQuery> {
  editor: ComponentType<VariableQueryEditorProps<TQuery>>;
  query: (request: DataQueryRequest<TQuery>) => Observable<DataQueryResponse>;
}

// Stream options
export interface StreamOptionsProvider<TQuery extends DataQuery = DataQuery> {
  getStreamOptions: (query: TQuery) => StreamOptions;
}

export interface StreamOptions {
  url?: string;
  withCredentials?: boolean;
  buffer?: StreamBuffer;
}

export interface StreamBuffer {
  maxLength?: number;
  maxTime?: number;
}

// Data provider types
export enum DataProviderType {
  Live = 'live',
  Logs = 'logs',
  Traces = 'traces',
}

// Features support
export interface DataSourceFeatures {
  explore?: boolean;
  alerting?: boolean;
  annotations?: boolean;
  metrics?: boolean;
  logs?: boolean;
  traces?: boolean;
  streaming?: boolean;
  customQuery?: boolean;
  recording?: boolean;
}

// Type guards
export function isDataFrame(data: any): data is DataFrame {
  return data && Array.isArray(data.fields) && typeof data.length === 'number';
}

export function isDateTime(value: any): value is DateTime {
  return value instanceof Date || typeof value === 'string' || typeof value === 'number';
}

// Helper types
export type Labels = Record<string, string>;
export type NullValueMode = 'null' | 'connected' | 'null as zero';
export type DataFrameType = 'timeseries' | 'table' | 'logs' | 'traces' | 'node-graph';
export type PreferredVisualisationType = 'graph' | 'table' | 'logs' | 'trace' | 'nodeGraph';
export type DisplayProcessor = (value: any) => DisplayValue;

export interface DisplayValue {
  text: string;
  numeric?: number;
  color?: string;
  percent?: number;
}

export interface ArrayVector<T = any> {
  buffer: T[];
  length: number;
}

export interface FieldState {
  displayName?: string | null;
  seriesIndex?: number;
  range?: NumericRange;
  calcs?: Record<string, any>;
  mappings?: ValueMapping[];
}

export interface NumericRange {
  min?: number | null;
  max?: number | null;
  delta?: number;
}

export interface ValueMapping {
  type: MappingType;
  options: any;
}

export enum MappingType {
  ValueToText = 'value',
  RangeToText = 'range',
  RegexToText = 'regex',
  SpecialValue = 'special',
}

export interface DataLink {
  title: string;
  url: string;
  targetBlank?: boolean;
  internal?: InternalDataLink;
}

export interface InternalDataLink {
  query: DataQuery;
  datasourceUid?: string;
  datasourceName?: string;
}

export interface ThresholdsConfig {
  mode: ThresholdsMode;
  steps: Threshold[];
}

export enum ThresholdsMode {
  Absolute = 'absolute',
  Percentage = 'percentage',
}

export interface Threshold {
  value: number | null;
  color: string;
}

export interface FieldColorConfigSettings {
  mode: FieldColorModeId;
  fixedColor?: string;
  seriesBy?: FieldColorSeriesByMode;
}

export type FieldColorModeId = 
  | 'thresholds' 
  | 'palette-classic' 
  | 'palette-saturated'
  | 'continuous-GrYlRd'
  | 'fixed';

export type FieldColorSeriesByMode = 'min' | 'max' | 'last';

export interface FieldStats {
  name: string;
  min?: number;
  max?: number;
  mean?: number;
  stdDev?: number;
  count?: number;
}

export interface DataLinkBuiltInVars {
  keepTime?: boolean;
  includeVars?: boolean;
}

export interface PluginDependencies {
  grafanaVersion: string;
  plugins: PluginDependencyInfo[];
}

export interface PluginDependencyInfo {
  id: string;
  name: string;
  version: string;
  type: PluginType;
}