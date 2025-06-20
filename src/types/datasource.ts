/**
 * Adaptive Factory Manufacturing Intelligence Platform
 * Data Source Type Definitions
 * 
 * Comprehensive data source types and query capabilities
 */

// ============================================================================
// BASIC TYPES
// ============================================================================

// Basic query interface
export interface DataQuery {
  refId: string;
  hide?: boolean;
  datasource?: DataSourceRef | null;
}

// Time range interface
export interface TimeRange {
  from: string;
  to: string;
  raw?: {
    from: string;
    to: string;
  };
}

// Field config interface
export interface FieldConfig {
  unit?: string;
  displayName?: string;
  decimals?: number;
  min?: number;
  max?: number;
}

// Energy type
export type EnergyType = 'electricity' | 'gas' | 'steam' | 'compressed-air' | 'water';

// ============================================================================
// CORE DATA SOURCE TYPES
// ============================================================================

export interface DataSource {
  id: number;
  uid: string;
  name: string;
  type: DataSourceType;
  url?: string;
  access: 'direct' | 'proxy';
  isDefault: boolean;
  jsonData: DataSourceJsonData;
  secureJsonData?: DataSourceSecureJsonData;
  secureJsonFields?: Record<string, boolean>;
  readOnly: boolean;
  basicAuth: boolean;
  basicAuthUser?: string;
  withCredentials: boolean;
  version: number;
  meta: DataSourcePluginMeta;
}

export type DataSourceType = 
  // Industrial/Manufacturing data sources
  | 'opcua'
  | 'mqtt'
  | 'modbus'
  | 'ethernet-ip'
  | 'profinet'
  | 'bacnet'
  
  // Database data sources
  | 'postgres'
  | 'mysql'
  | 'mssql'
  | 'sqlite'
  | 'oracle'
  | 'influxdb'
  | 'timescaledb'
  | 'mongodb'
  
  // Time series databases
  | 'prometheus'
  | 'victoriametrics'
  | 'clickhouse'
  | 'questdb'
  | 'kdb'
  
  // Cloud and API sources
  | 'rest-api'
  | 'graphql'
  | 'aws-cloudwatch'
  | 'azure-monitor'
  | 'google-cloud'
  
  // File and streaming sources
  | 'csv'
  | 'json'
  | 'xml'
  | 'kafka'
  | 'redis'
  
  // Manufacturing systems
  | 'mes'
  | 'erp'
  | 'scada'
  | 'historian'
  | 'cmms'
  | 'wms'
  
  // Built-in sources
  | 'testdata'
  | 'random'
  | 'simulation';

export interface DataSourceJsonData {
  // Common options
  httpMethod?: string;
  manageAlerts?: boolean;
  alertmanagerUid?: string;
  
  // Time series specific
  timeInterval?: string;
  queryTimeout?: string;
  maxConcurrentQueries?: number;
  maxDataPoints?: number;
  
  // Authentication
  authType?: AuthType;
  
  // Connection settings
  connectionTimeout?: number;
  keepAlive?: boolean;
  maxIdleConnections?: number;
  
  // Manufacturing specific
  samplingRate?: number;
  bufferSize?: number;
  realTimeMode?: boolean;
  
  // Custom configuration
  [key: string]: any;
}

export interface DataSourceSecureJsonData {
  password?: string;
  apiKey?: string;
  accessToken?: string;
  clientSecret?: string;
  privateKey?: string;
  [key: string]: string | undefined;
}

export type AuthType = 'none' | 'basic' | 'oauth2' | 'token' | 'certificate';

export interface DataSourcePluginMeta {
  id: string;
  name: string;
  type: string;
  module: string;
  baseUrl: string;
  info: PluginMetaInfo;
  includes?: PluginInclude[];
  dependencies?: PluginDependencies;
  backend?: boolean;
  streaming?: boolean;
  alerting?: boolean;
  annotations?: boolean;
  metrics?: boolean;
  logs?: boolean;
  tracing?: boolean;
  explore?: boolean;
  tables?: boolean;
  category?: string;
}

// Data source instance settings
export interface DataSourceInstanceSettings<T extends DataSourceJsonData = DataSourceJsonData> {
  id: number;
  uid: string;
  type: string;
  name: string;
  url?: string;
  jsonData: T;
  secureJsonFields: { [key: string]: boolean };
  meta: DataSourcePluginMeta;
  readOnly?: boolean;
}

// Data source reference
export interface DataSourceRef {
  type?: string;
  uid?: string;
}

export interface PluginMetaInfo {
  author: PluginMetaInfoLink;
  description: string;
  links: PluginMetaInfoLink[];
  logos: PluginLogos;
  screenshots: PluginScreenshots[];
  updated: string;
  version: string;
  keywords?: string[];
}

export interface PluginMetaInfoLink {
  name: string;
  url: string;
}

export interface PluginLogos {
  small: string;
  large: string;
}

export interface PluginScreenshots {
  name: string;
  path: string;
}

export interface PluginInclude {
  type: string;
  name: string;
  path: string;
}

export interface PluginDependencies {
  grafanaVersion: string;
  plugins: PluginDependency[];
}

export interface PluginDependency {
  type: string;
  id: string;
  name: string;
  version: string;
}

// ============================================================================
// QUERY AND REQUEST TYPES
// ============================================================================

// Core app types
export type CoreApp = 'explore' | 'dashboard' | 'alerting' | 'panel';

// Loading state
export enum LoadingState {
  NotStarted = 'NotStarted',
  Loading = 'Loading',
  Streaming = 'Streaming',
  Done = 'Done',
  Error = 'Error'
}

// Scoped variables
export interface ScopedVars {
  [key: string]: {
    text?: string;
    value?: string | number | boolean;
  };
}

// Query result metadata
export interface QueryResultMeta {
  type?: 'timeseries' | 'table' | 'logs' | 'trace' | 'nodeGraph';
  custom?: Record<string, any>;
  preferredVisualisationType?: string;
  notices?: QueryResultMetaNotice[];
  stats?: QueryStats[];
  searchWords?: string[];
  executedQueryString?: string;
  frames?: number;
  traceId?: string;
}

export interface QueryResultMetaNotice {
  severity: 'info' | 'warning' | 'error';
  text: string;
  link?: string;
}

export interface QueryStats {
  displayName?: string;
  value: number;
  unit?: string;
  decimals?: number;
}

// Data query error
export interface DataQueryError {
  message?: string;
  status?: string;
  statusText?: string;
  refId?: string;
  data?: {
    message?: string;
    error?: string;
  };
}

// Display processor
export type DisplayProcessor = (value: any) => string;

// Data frame field index
export interface DataFrameFieldIndex {
  frameIndex: number;
  fieldIndex: number;
}

export interface DataSourceRequest<T extends DataQuery = DataQuery> {
  app: CoreApp;
  requestId: string;
  timezone: string;
  panelId?: number;
  dashboardId?: number;
  range: TimeRange;
  timeInfo?: string;
  targets: T[];
  maxDataPoints: number;
  intervalMs: number;
  startTime: number;
  scopedVars?: ScopedVars;
  cacheTimeout?: string;
  queryCachingTTL?: number;
  hideFromInspector?: boolean;
}

export interface DataSourceResponse {
  data: DataFrame[];
  error?: DataQueryError;
  key?: string;
  state?: LoadingState;
}

export interface DataFrame {
  name?: string;
  refId?: string;
  meta?: QueryResultMeta;
  fields: Field[];
  length: number;
}

export interface Field {
  name: string;
  type?: FieldType;
  config?: FieldConfig;
  values: any[];
  labels?: Labels;
  state?: FieldState;
  display?: DisplayProcessor;
}

export type FieldType = 
  | 'time'
  | 'number'
  | 'string'
  | 'boolean'
  | 'other'
  | 'enum'
  | 'geo'
  | 'trace';

export interface Labels {
  [key: string]: string;
}

export interface FieldState {
  range?: NumericRange;
  calcs?: FieldCalcs;
  displayName?: string;
  multipleFrames?: boolean;
  origin?: DataFrameFieldIndex;
  scopedVars?: ScopedVars;
}

export interface NumericRange {
  min?: number | null;
  max?: number | null;
  delta: number;
}

export interface FieldCalcs {
  [key: string]: any;
}

export interface DataFrameFieldIndex {
  frameIndex: number;
  fieldIndex: number;
}

export interface ScopedVars {
  [key: string]: ScopedVar;
}

export interface ScopedVar {
  text: string | string[];
  value: string | string[];
  [key: string]: any;
}

export interface QueryResultMeta {
  type?: string;
  typeVersion?: [number, number];
  custom?: Record<string, any>;
  stats?: QueryResultMetaStat[];
  notices?: QueryResultMetaNotice[];
  searchWords?: string[];
  limit?: number;
  path?: string;
  executedQueryString?: string;
  preferredVisualisationType?: VisType;
}

export interface QueryResultMetaStat {
  displayName: string;
  value: number;
  unit?: string;
}

export interface QueryResultMetaNotice {
  severity: NoticeSeverity;
  text: string;
  link?: string;
  inspect?: InspectType;
}

export type NoticeSeverity = 'info' | 'warning' | 'error';

export type InspectType = 'meta' | 'error' | 'data' | 'stats';

export type VisType = 'graph' | 'table' | 'logs' | 'trace' | 'nodeGraph';

export interface DataQueryError {
  data?: {
    message?: string;
    error?: string;
    response?: string;
  };
  message?: string;
  status?: string;
  statusText?: string;
  refId?: string;
}

export type LoadingState = 'NotStarted' | 'Loading' | 'Streaming' | 'Done' | 'Error';

export type CoreApp = 'dashboard' | 'explore' | 'alerting' | 'correlations' | 'unknown';

export interface DisplayProcessor {
  (value: any): DisplayValue;
}

export interface DisplayValue {
  text: string;
  numeric: number;
  color?: string;
  icon?: string;
  title?: string;
  suffix?: string;
  prefix?: string;
}

// ============================================================================
// MANUFACTURING-SPECIFIC DATA SOURCE TYPES
// ============================================================================

export interface OPCUADataSource extends DataSource {
  type: 'opcua';
  jsonData: OPCUADataSourceConfig;
}

export interface OPCUADataSourceConfig extends DataSourceJsonData {
  endpoint: string;
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy: string;
  username?: string;
  clientCertificate?: string;
  subscriptionSettings: {
    publishingInterval: number;
    maxNotificationsPerPublish: number;
    priority: number;
    samplingInterval: number;
    queueSize: number;
  };
}

export interface MQTTDataSource extends DataSource {
  type: 'mqtt';
  jsonData: MQTTDataSourceConfig;
}

export interface MQTTDataSourceConfig extends DataSourceJsonData {
  broker: string;
  port: number;
  protocol: 'mqtt' | 'mqtts' | 'ws' | 'wss';
  clientId?: string;
  keepAliveInterval: number;  // Changed from keepAlive to avoid conflict
  cleanSession: boolean;
  qos: 0 | 1 | 2;
  retained: boolean;
  topicPrefix?: string;
  willTopic?: string;
  willMessage?: string;
}

export interface HistorianDataSource extends DataSource {
  type: 'historian';
  jsonData: HistorianDataSourceConfig;
}

export interface HistorianDataSourceConfig extends DataSourceJsonData {
  server: string;
  database?: string;
  aggregationMethods: string[];
  maxTagsPerQuery: number;
  interpolationMethod: 'none' | 'linear' | 'previous' | 'next';
  timezone: string;
}

export interface MESDataSource extends DataSource {
  type: 'mes';
  jsonData: MESDataSourceConfig;
}

export interface MESDataSourceConfig extends DataSourceJsonData {
  apiEndpoint: string;
  version: string;
  plantId?: string;
  productionLines?: string[];
  realTimeEvents: boolean;
  batchSize: number;
}

export interface SCADADataSource extends DataSource {
  type: 'scada';
  jsonData: SCADADataSourceConfig;
}

export interface SCADADataSourceConfig extends DataSourceJsonData {
  protocol: 'modbus' | 'ethernet-ip' | 'profinet' | 'bacnet';
  host: string;
  port: number;
  unitId?: number;
  slaveId?: number;
  pollingInterval: number;
  registerTypes: RegisterType[];
}

export type RegisterType = 'coil' | 'discrete' | 'holding' | 'input';

// ============================================================================
// QUERY TYPES BY DATA SOURCE
// ============================================================================

export interface OPCUAQuery extends DataQuery {
  nodeId: string;
  browsePath?: string;
  samplingInterval?: number;
  aggregationType?: OPCUAAggregationType;
  processingInterval?: number;
}

export type OPCUAAggregationType = 
  | 'Raw'
  | 'Average'
  | 'Minimum'
  | 'Maximum'
  | 'Count'
  | 'Total'
  | 'StandardDeviation';

export interface MQTTQuery extends DataQuery {
  topic: string;
  qos?: 0 | 1 | 2;
  messageFormat: 'json' | 'text' | 'binary';
  jsonPath?: string;
  parser?: 'json' | 'csv' | 'regex';
  parserConfig?: any;
}

export interface SQLQuery extends DataQuery {
  rawSql: string;
  format: 'time_series' | 'table' | 'logs';
  timeColumn?: string;
  metricColumn?: string;
  valueColumns?: string[];
  whereClause?: string;
  groupBy?: string[];
  orderBy?: string;
  limit?: number;
}

export interface PrometheusQuery extends DataQuery {
  expr: string;
  format?: 'time_series' | 'table' | 'heatmap';
  instant?: boolean;
  range?: boolean;
  step?: string;
  legendFormat?: string;
  intervalFactor?: number;
  utcOffsetSec?: number;
}

export interface InfluxDBQuery extends DataQuery {
  query: string;
  measurement?: string;
  tags?: InfluxDBTag[];
  groupBy?: InfluxDBGroupBy[];
  select?: InfluxDBSelect[][];
  rawQuery?: boolean;
  policy?: string;
  resultFormat?: 'time_series' | 'table' | 'logs';
}

export interface InfluxDBTag {
  key: string;
  operator: string;
  value: string;
  condition?: string;
}

export interface InfluxDBGroupBy {
  type: string;
  params: string[];
}

export interface InfluxDBSelect {
  type: string;
  params?: string[];
}

export interface TestDataQuery extends DataQuery {
  scenarioId: string;
  stringInput?: string;
  stream?: {
    type: 'signal' | 'logs' | 'fetch';
    speed: number;
    spread: number;
    noise: number;
    bands?: number;
    url?: string;
  };
  pulseWave?: {
    timeStep: number;
    onCount: number;
    offCount: number;
    onValue: number;
    offValue: number;
  };
  csvWave?: {
    timeStep: number;
    valuesCSV: string;
  };
  labels?: string;
  lines?: number;
  levelColumn?: boolean;
}

// ============================================================================
// MANUFACTURING QUERY EXTENSIONS
// ============================================================================

export interface EquipmentQuery extends DataQuery {
  equipmentId: string;
  metrics: EquipmentMetric[];
  aggregation?: string;
  groupBy?: string;
  filters?: EquipmentFilter[];
}

export interface EquipmentMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  unit?: string;
  description?: string;
}

export interface EquipmentFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'ge' | 'le' | 'in' | 'nin';
  value: any;
}

export interface ProductionQuery extends DataQuery {
  productionLine?: string;
  shift?: string;
  product?: string;
  metrics: ProductionMetric[];
  timeGranularity: 'minute' | 'hour' | 'shift' | 'day';
}

export interface ProductionMetric {
  name: string;
  calculation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'rate';
  target?: number;
}

export interface QualityQuery extends DataQuery {
  process?: string;
  product?: string;
  characteristics: QualityCharacteristic[];
  controlChart?: boolean;
  capability?: boolean;
}

export interface QualityCharacteristic {
  name: string;
  type: 'variable' | 'attribute';
  target?: number;
  tolerance?: {
    upper: number;
    lower: number;
  };
}

export interface MaintenanceQuery extends DataQuery {
  equipmentType?: string;
  maintenanceType: 'preventive' | 'corrective' | 'predictive';
  scheduleHorizon?: number; // days
  includeCompleted?: boolean;
}

export interface EnergyQuery extends DataQuery {
  meters: string[];
  energyType?: EnergyType;
  costCalculation?: boolean;
  baseline?: boolean;
  efficiency?: boolean;
}