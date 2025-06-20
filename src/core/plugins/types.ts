/**
 * Grafana-compatible Plugin System Types
 * Provides complete plugin architecture for panels, data sources, and apps
 */

import { ComponentType, ReactNode } from 'react';
import { TimeRange, DataFrame, FieldType } from '@/types/data';

// Plugin Types matching Grafana's architecture
export enum PluginType {
  Panel = 'panel',
  DataSource = 'datasource',
  App = 'app',
}

export enum PluginState {
  Alpha = 'alpha',
  Beta = 'beta',
  Stable = 'stable',
  Deprecated = 'deprecated',
}

// Plugin Metadata
export interface PluginMeta {
  id: string;
  name: string;
  type: PluginType;
  info: PluginInfo;
  dependencies?: PluginDependencies;
  includes?: PluginInclude[];
  category?: string;
  hideFromList?: boolean;
  preload?: boolean;
  backend?: boolean;
  routes?: PluginRoute[];
  state?: PluginState;
  signature?: PluginSignature;
  module: string;
  baseUrl: string;
  annotations?: boolean;
  metrics?: boolean;
  alerting?: boolean;
  explore?: boolean;
  logs?: boolean;
  tracing?: boolean;
  streaming?: boolean;
  tables?: boolean;
  queryOptions?: {
    maxDataPoints?: boolean;
    minInterval?: boolean;
    cacheTimeout?: boolean;
  };
}

export interface PluginInfo {
  author: {
    name: string;
    url?: string;
    email?: string;
  };
  description: string;
  links?: Array<{
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
  screenshots?: Array<{
    name: string;
    path: string;
  }>;
  version: string;
  updated: string;
  keywords?: string[];
}

export interface PluginDependencies {
  grafanaDependency?: string;
  grafanaVersion: string;
  plugins: Array<{
    id: string;
    name: string;
    version: string;
    type: PluginType;
  }>;
}

export interface PluginInclude {
  name: string;
  path: string;
  type: string;
  component?: string;
  role?: string;
  addToNav?: boolean;
  defaultNav?: boolean;
  slug?: string;
  icon?: string;
  uid?: string;
}

export interface PluginRoute {
  path: string;
  method: string;
  reqRole?: string;
  url?: string;
  urlParams?: Record<string, any>;
  headers?: Record<string, string>;
  authType?: string;
  tokenAuth?: {
    url: string;
    params?: Record<string, string>;
  };
  jwtTokenAuth?: {
    url: string;
    scopes?: string[];
    params?: Record<string, string>;
  };
  body?: string;
}

export enum PluginSignature {
  Internal = 'internal',
  Valid = 'valid',
  Invalid = 'invalid',
  Modified = 'modified',
  Unsigned = 'unsigned',
}

// Panel Plugin specific types
export interface PanelPluginMeta extends PluginMeta {
  type: PluginType.Panel;
  skipDataQuery?: boolean;
  sort?: number;
}

export interface PanelPlugin<TOptions = any> {
  meta: PanelPluginMeta;
  panel: ComponentType<PanelProps<TOptions>>;
  editor?: ComponentType<PanelEditorProps<TOptions>>;
  defaults?: TOptions;
  optionEditors?: PanelOptionEditorsRegistry<TOptions>;
}

export interface PanelProps<TOptions = any> {
  id: number;
  data: PanelData;
  timeRange: TimeRange;
  timeZone: string;
  options: TOptions;
  fieldConfig: FieldConfigSource;
  transparent: boolean;
  width: number;
  height: number;
  title: string;
  renderCounter: number;
  replaceVariables: (value: string, scopedVars?: Record<string, any>) => string;
  onOptionsChange: (options: TOptions) => void;
  onFieldConfigChange: (config: FieldConfigSource) => void;
  onChangeTimeRange: (timeRange: TimeRange) => void;
}

export interface PanelEditorProps<TOptions = any> {
  options: TOptions;
  onOptionsChange: (options: TOptions) => void;
  data: PanelData;
}

export interface PanelData {
  series: DataFrame[];
  state?: LoadingState;
  timeRange?: TimeRange;
  error?: DataQueryError;
  request?: DataQueryRequest;
}

export enum LoadingState {
  NotStarted = 'NotStarted',
  Loading = 'Loading',
  Streaming = 'Streaming',
  Done = 'Done',
  Error = 'Error',
}

export interface DataQueryError {
  message?: string;
  status?: string;
  statusText?: string;
  refId?: string;
  traceId?: string;
}

export interface DataQueryRequest {
  requestId: string;
  interval: string;
  intervalMs: number;
  maxDataPoints?: number;
  range: TimeRange;
  scopedVars: Record<string, any>;
  targets: DataQuery[];
  timezone: string;
  app: string;
  startTime: number;
  endTime?: number;
}

export interface DataQuery {
  refId: string;
  hide?: boolean;
  key?: string;
  queryType?: string;
  datasource?: DataSourceRef | null;
}

export interface DataSourceRef {
  type?: string;
  uid?: string;
}

export interface FieldConfigSource {
  defaults: FieldConfig;
  overrides: ConfigOverride[];
}

export interface FieldConfig {
  displayName?: string;
  displayNameFromDS?: string;
  description?: string;
  path?: string;
  writeable?: boolean;
  filterable?: boolean;
  unit?: string;
  decimals?: number;
  min?: number;
  max?: number;
  mappings?: ValueMapping[];
  thresholds?: ThresholdsConfig;
  color?: FieldColorConfig;
  nullValueMode?: NullValueMode;
  links?: DataLink[];
  noValue?: string;
  custom?: Record<string, any>;
}

export interface ConfigOverride {
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

export interface ValueMapping {
  type: ValueMappingType;
  options: Record<string, any>;
}

export enum ValueMappingType {
  Value = 'value',
  Range = 'range',
  Regex = 'regex',
  Special = 'special',
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
  value: number;
  color: string;
}

export interface FieldColorConfig {
  mode: FieldColorMode;
  fixedColor?: string;
  seriesBy?: FieldColorSeriesBy;
}

export enum FieldColorMode {
  Thresholds = 'thresholds',
  PaletteClassic = 'palette-classic',
  PaletteSaturated = 'palette-saturated',
  ContinuousGrYlRd = 'continuous-GrYlRd',
  Fixed = 'fixed',
}

export enum FieldColorSeriesBy {
  Min = 'min',
  Max = 'max',
  Last = 'last',
}

export enum NullValueMode {
  Null = 'null',
  Ignore = 'connected',
  AsZero = 'null as zero',
}

export interface DataLink {
  title: string;
  url: string;
  targetBlank?: boolean;
}

// Data Source Plugin specific types
export interface DataSourcePluginMeta extends PluginMeta {
  type: PluginType.DataSource;
  queryOptions?: {
    maxDataPoints?: boolean;
    minInterval?: boolean;
    cacheTimeout?: boolean;
  };
  directUrl?: string;
}

export interface DataSourcePlugin<TQuery extends DataQuery = DataQuery, TOptions = any> {
  meta: DataSourcePluginMeta;
  DataSource: DataSourceConstructor<TQuery, TOptions>;
  components: DataSourcePluginComponents<TQuery, TOptions>;
}

export interface DataSourcePluginComponents<TQuery extends DataQuery = DataQuery, TOptions = any> {
  QueryEditor?: ComponentType<QueryEditorProps<TQuery, TOptions>>;
  ConfigEditor?: ComponentType<DataSourceConfigEditorProps<TOptions>>;
  ExploreQueryField?: ComponentType<ExploreQueryFieldProps<TQuery, TOptions>>;
  QueryCtrl?: any; // For angular compatibility
  AnnotationsQueryCtrl?: any; // For angular compatibility
}

export interface QueryEditorProps<TQuery extends DataQuery = DataQuery, TOptions = any> {
  datasource: DataSourceApi<TQuery, TOptions>;
  query: TQuery;
  onChange: (query: TQuery) => void;
  onRunQuery: () => void;
  data?: PanelData;
  range?: TimeRange;
}

export interface DataSourceConfigEditorProps<TOptions = any> {
  options: DataSourceSettings<TOptions>;
  onOptionsChange: (options: DataSourceSettings<TOptions>) => void;
}

export interface ExploreQueryFieldProps<TQuery extends DataQuery = DataQuery, TOptions = any> {
  datasource: DataSourceApi<TQuery, TOptions>;
  query: TQuery;
  onChange: (query: TQuery) => void;
  onRunQuery: () => void;
  history: Array<{ ts: number; query: TQuery }>;
  absoluteRange: TimeRange;
}

export interface DataSourceSettings<TOptions = any> {
  id?: number;
  uid?: string;
  orgId?: number;
  name: string;
  type: string;
  typeName?: string;
  typeLogoUrl?: string;
  access: DataSourceAccess;
  url?: string;
  user?: string;
  database?: string;
  basicAuth?: boolean;
  basicAuthUser?: string;
  withCredentials?: boolean;
  isDefault?: boolean;
  jsonData: TOptions;
  secureJsonData?: Record<string, string>;
  secureJsonFields?: Record<string, boolean>;
  readOnly?: boolean;
}

export enum DataSourceAccess {
  Proxy = 'proxy',
  Direct = 'direct',
}

export type DataSourceConstructor<TQuery extends DataQuery = DataQuery, TOptions = any> = new (
  instanceSettings: DataSourceSettings<TOptions>
) => DataSourceApi<TQuery, TOptions>;

export abstract class DataSourceApi<TQuery extends DataQuery = DataQuery, TOptions = any> {
  name: string;
  id: number;
  type: string;
  uid: string;
  meta: DataSourcePluginMeta;

  constructor(public instanceSettings: DataSourceSettings<TOptions>) {
    this.name = instanceSettings.name;
    this.id = instanceSettings.id!;
    this.type = instanceSettings.type;
    this.uid = instanceSettings.uid!;
    this.meta = {} as DataSourcePluginMeta; // Will be set by plugin loader
  }

  abstract query(request: DataQueryRequest): Promise<DataQueryResponse> | Observable<DataQueryResponse>;
  abstract testDatasource(): Promise<TestDataSourceResponse>;

  interpolateVariablesInQueries?(queries: TQuery[], scopedVars: Record<string, any>): TQuery[];
  metricFindQuery?(query: string, options?: any): Promise<MetricFindValue[]>;
  getQueryDisplayText?(query: TQuery): string;
  languageProvider?: any;
  getTagKeys?(options?: any): Promise<MetricFindValue[]>;
  getTagValues?(options: any): Promise<MetricFindValue[]>;
}

export interface DataQueryResponse {
  data: DataFrame[];
  key?: string;
  state?: LoadingState;
  error?: DataQueryError;
  traceIds?: string[];
}

export interface TestDataSourceResponse {
  status: string;
  message: string;
  title?: string;
  details?: any;
}

export interface MetricFindValue {
  text: string;
  value?: string | number;
  expandable?: boolean;
}

export interface Observable<T> {
  subscribe(observer: Observer<T>): Subscription;
}

export interface Observer<T> {
  next: (value: T) => void;
  error?: (error: any) => void;
  complete?: () => void;
}

export interface Subscription {
  unsubscribe(): void;
}

// App Plugin specific types
export interface AppPluginMeta extends PluginMeta {
  type: PluginType.App;
}

export interface AppPlugin {
  meta: AppPluginMeta;
  root?: ComponentType<AppRootProps>;
  rootNav?: NavItem;
  pages?: Record<string, ComponentType<AppPageProps>>;
  init?(meta: AppPluginMeta): void;
}

export interface AppRootProps {
  meta: AppPluginMeta;
  basename: string;
  onNavChanged: (nav: NavItem) => void;
  query: Record<string, any>;
  path: string;
}

export interface AppPageProps {
  meta: AppPluginMeta;
  query: Record<string, any>;
  path: string;
}

export interface NavItem {
  text: string;
  icon?: string;
  img?: string;
  id: string;
  url?: string;
  children?: NavItem[];
  active?: boolean;
  hideFromTabs?: boolean;
}

// Plugin Registry Types
export interface PluginRegistry {
  panels: Map<string, PanelPlugin>;
  datasources: Map<string, DataSourcePlugin>;
  apps: Map<string, AppPlugin>;
}

// Panel Option Editors
export type PanelOptionEditorsRegistry<TOptions = any> = Array<
  OptionEditorConfig<TOptions, any, any>
>;

export interface OptionEditorConfig<TOptions, TValue = any, TSettings = any> {
  path: string;
  name: string;
  description?: string;
  defaultValue?: TValue;
  editor: ComponentType<OptionEditorProps<TValue, TSettings>>;
  settings?: TSettings;
  showIf?: (options: TOptions) => boolean;
  category?: string[];
}

export interface OptionEditorProps<TValue, TSettings = any> {
  value: TValue;
  onChange: (value: TValue) => void;
  item: OptionEditorConfig<any, TValue, TSettings>;
}

// Export utility types
export type { TimeRange, DataFrame, FieldType };