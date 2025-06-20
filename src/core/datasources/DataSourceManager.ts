import { EventEmitter } from 'events';

// ============================================================================
// DATA SOURCE INTERFACES
// ============================================================================

export interface DataSource {
  id: string;
  name: string;
  type: DataSourceType;
  config: DataSourceConfig;
  meta: DataSourceMeta;
  enabled: boolean;
  readonly: boolean;
  version: string;
}

export interface DataSourceConfig {
  url?: string;
  database?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  timeout?: number;
  maxConnections?: number;
  ssl?: boolean;
  headers?: Record<string, string>;
  parameters?: Record<string, any>;
  customSettings?: Record<string, any>;
}

export interface DataSourceMeta {
  description: string;
  icon: string;
  category: DataSourceCategory;
  documentation?: string;
  supportedQueries: QueryType[];
  requiredFields: string[];
  optionalFields: string[];
  capabilities: DataSourceCapability[];
  examples?: QueryExample[];
}

export interface QueryExample {
  name: string;
  description: string;
  query: string;
  variables?: Record<string, any>;
}

export enum DataSourceType {
  PostgreSQL = 'postgresql',
  MySQL = 'mysql',
  TimescaleDB = 'timescaledb',
  InfluxDB = 'influxdb',
  Prometheus = 'prometheus',
  Elasticsearch = 'elasticsearch',
  MongoDB = 'mongodb',
  Redis = 'redis',
  MQTT = 'mqtt',
  OPCUA = 'opcua',
  ModbusTCP = 'modbus-tcp',
  RestAPI = 'rest-api',
  GraphQL = 'graphql',
  CSV = 'csv',
  JSON = 'json',
  WebSocket = 'websocket',
  Custom = 'custom'
}

export enum DataSourceCategory {
  Database = 'database',
  TimeSeries = 'timeseries',
  Industrial = 'industrial',
  API = 'api',
  File = 'file',
  Stream = 'stream',
  Cache = 'cache'
}

export enum QueryType {
  SQL = 'sql',
  PromQL = 'promql',
  Lucene = 'lucene',
  MongoDB = 'mongodb',
  GraphQL = 'graphql',
  REST = 'rest',
  Custom = 'custom'
}

export enum DataSourceCapability {
  Query = 'query',
  Stream = 'stream',
  Write = 'write',
  Schema = 'schema',
  Annotations = 'annotations',
  Variables = 'variables',
  Alerting = 'alerting',
  Explore = 'explore'
}

// ============================================================================
// DATA SOURCE PLUGIN INTERFACE
// ============================================================================

export interface DataSourcePlugin {
  id: DataSourceType;
  name: string;
  meta: DataSourceMeta;
  configEditor: React.ComponentType<DataSourceConfigEditorProps>;
  queryEditor: React.ComponentType<DataSourceQueryEditorProps>;
  connector: DataSourceConnector;
  validator?: DataSourceValidator;
}

export interface DataSourceConfigEditorProps {
  dataSource: DataSource;
  onChange: (config: DataSourceConfig) => void;
  onTest: () => Promise<TestResult>;
}

export interface DataSourceQueryEditorProps {
  dataSource: DataSource;
  query: DataQuery;
  onChange: (query: DataQuery) => void;
  onRunQuery: () => void;
  data?: QueryResult;
}

export interface DataQuery {
  refId: string;
  datasource: string;
  rawQuery?: string;
  table?: string;
  fields?: string[];
  where?: QueryCondition[];
  groupBy?: string[];
  orderBy?: QuerySort[];
  limit?: number;
  timeField?: string;
  timeRange?: TimeRange;
  variables?: Record<string, any>;
  format?: QueryFormat;
  alias?: string;
  hide?: boolean;
}

export interface QueryCondition {
  field: string;
  operator: string;
  value: any;
  type?: 'and' | 'or';
}

export interface QuerySort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface TimeRange {
  from: string;
  to: string;
}

export enum QueryFormat {
  Table = 'table',
  TimeSeries = 'time_series',
  Logs = 'logs',
  Trace = 'trace'
}

export interface QueryResult {
  data: DataFrame[];
  error?: string;
  meta?: QueryResultMeta;
}

export interface DataFrame {
  name?: string;
  fields: DataField[];
  length: number;
  meta?: DataFrameMeta;
}

export interface DataField {
  name: string;
  type: FieldType;
  values: any[];
  config?: FieldConfig;
  labels?: Record<string, string>;
}

export interface FieldConfig {
  displayName?: string;
  unit?: string;
  decimals?: number;
  min?: number;
  max?: number;
  color?: string;
}

export interface DataFrameMeta {
  executedQueryString?: string;
  custom?: Record<string, any>;
}

export interface QueryResultMeta {
  executionTime?: number;
  rowCount?: number;
  sql?: string;
  notices?: Notice[];
}

export interface Notice {
  severity: 'info' | 'warning' | 'error';
  text: string;
}

export enum FieldType {
  Time = 'time',
  Number = 'number',
  String = 'string',
  Boolean = 'boolean',
  Other = 'other'
}

// ============================================================================
// DATA SOURCE CONNECTOR INTERFACE
// ============================================================================

export interface DataSourceConnector {
  connect(config: DataSourceConfig): Promise<void>;
  disconnect(): Promise<void>;
  query(query: DataQuery): Promise<QueryResult>;
  testConnection(config: DataSourceConfig): Promise<TestResult>;
  getSchema?(): Promise<SchemaInfo>;
  streamQuery?(query: DataQuery): AsyncIterable<QueryResult>;
}

export interface TestResult {
  status: 'success' | 'error';
  message: string;
  details?: any;
  latency?: number;
}

export interface SchemaInfo {
  tables: TableInfo[];
  functions?: FunctionInfo[];
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  type: 'table' | 'view' | 'materialized_view';
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  description?: string;
}

export interface FunctionInfo {
  name: string;
  description?: string;
  parameters: ParameterInfo[];
  returnType: string;
}

export interface ParameterInfo {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface DataSourceValidator {
  validateConfig(config: DataSourceConfig): ValidationResult;
  validateQuery(query: DataQuery): ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

// ============================================================================
// DATA SOURCE MANAGER
// ============================================================================

export class DataSourceManager extends EventEmitter {
  private dataSources = new Map<string, DataSource>();
  private plugins = new Map<DataSourceType, DataSourcePlugin>();
  private connections = new Map<string, DataSourceConnector>();

  /**
   * Register a data source plugin
   */
  registerPlugin(plugin: DataSourcePlugin): void {
    this.plugins.set(plugin.id, plugin);
    this.emit('plugin:registered', plugin);
    console.log(`Registered data source plugin: ${plugin.name}`);
  }

  /**
   * Get all registered plugins
   */
  getPlugins(): DataSourcePlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin by type
   */
  getPlugin(type: DataSourceType): DataSourcePlugin | undefined {
    return this.plugins.get(type);
  }

  /**
   * Get plugins by category
   */
  getPluginsByCategory(category: DataSourceCategory): DataSourcePlugin[] {
    return this.getPlugins().filter(plugin => plugin.meta.category === category);
  }

  /**
   * Create a new data source
   */
  async createDataSource(
    id: string,
    name: string,
    type: DataSourceType,
    config: DataSourceConfig
  ): Promise<DataSource> {
    const plugin = this.getPlugin(type);
    if (!plugin) {
      throw new Error(`Unknown data source type: ${type}`);
    }

    // Validate configuration
    if (plugin.validator) {
      const validation = plugin.validator.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    }

    const dataSource: DataSource = {
      id,
      name,
      type,
      config,
      meta: plugin.meta,
      enabled: true,
      readonly: false,
      version: '1.0.0'
    };

    this.dataSources.set(id, dataSource);
    this.emit('datasource:created', dataSource);

    return dataSource;
  }

  /**
   * Update a data source
   */
  async updateDataSource(id: string, updates: Partial<DataSource>): Promise<DataSource> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      throw new Error(`Data source not found: ${id}`);
    }

    const updated = { ...dataSource, ...updates };
    this.dataSources.set(id, updated);
    this.emit('datasource:updated', updated);

    return updated;
  }

  /**
   * Delete a data source
   */
  async deleteDataSource(id: string): Promise<void> {
    const dataSource = this.dataSources.get(id);
    if (!dataSource) {
      throw new Error(`Data source not found: ${id}`);
    }

    // Disconnect if connected
    const connection = this.connections.get(id);
    if (connection) {
      await connection.disconnect();
      this.connections.delete(id);
    }

    this.dataSources.delete(id);
    this.emit('datasource:deleted', { id, dataSource });
  }

  /**
   * Get a data source by ID
   */
  getDataSource(id: string): DataSource | undefined {
    return this.dataSources.get(id);
  }

  /**
   * Get all data sources
   */
  getDataSources(): DataSource[] {
    return Array.from(this.dataSources.values());
  }

  /**
   * Get data sources by type
   */
  getDataSourcesByType(type: DataSourceType): DataSource[] {
    return this.getDataSources().filter(ds => ds.type === type);
  }

  /**
   * Test data source connection
   */
  async testDataSource(id: string): Promise<TestResult> {
    const dataSource = this.getDataSource(id);
    if (!dataSource) {
      throw new Error(`Data source not found: ${id}`);
    }

    const plugin = this.getPlugin(dataSource.type);
    if (!plugin) {
      throw new Error(`Plugin not found for type: ${dataSource.type}`);
    }

    return plugin.connector.testConnection(dataSource.config);
  }

  /**
   * Connect to a data source
   */
  async connectDataSource(id: string): Promise<void> {
    const dataSource = this.getDataSource(id);
    if (!dataSource) {
      throw new Error(`Data source not found: ${id}`);
    }

    if (!dataSource.enabled) {
      throw new Error(`Data source is disabled: ${id}`);
    }

    const plugin = this.getPlugin(dataSource.type);
    if (!plugin) {
      throw new Error(`Plugin not found for type: ${dataSource.type}`);
    }

    // Check if already connected
    if (this.connections.has(id)) {
      return;
    }

    const connector = plugin.connector;
    await connector.connect(dataSource.config);
    this.connections.set(id, connector);
    this.emit('datasource:connected', dataSource);
  }

  /**
   * Disconnect from a data source
   */
  async disconnectDataSource(id: string): Promise<void> {
    const connection = this.connections.get(id);
    if (!connection) {
      return;
    }

    await connection.disconnect();
    this.connections.delete(id);
    
    const dataSource = this.getDataSource(id);
    this.emit('datasource:disconnected', dataSource);
  }

  /**
   * Execute a query
   */
  async query(dataSourceId: string, query: DataQuery): Promise<QueryResult> {
    const dataSource = this.getDataSource(dataSourceId);
    if (!dataSource) {
      throw new Error(`Data source not found: ${dataSourceId}`);
    }

    const plugin = this.getPlugin(dataSource.type);
    if (!plugin) {
      throw new Error(`Plugin not found for type: ${dataSource.type}`);
    }

    // Validate query
    if (plugin.validator) {
      const validation = plugin.validator.validateQuery(query);
      if (!validation.valid) {
        throw new Error(`Invalid query: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    }

    // Ensure connection
    await this.connectDataSource(dataSourceId);
    
    const connection = this.connections.get(dataSourceId);
    if (!connection) {
      throw new Error(`Failed to connect to data source: ${dataSourceId}`);
    }

    const startTime = Date.now();
    try {
      const result = await connection.query(query);
      const executionTime = Date.now() - startTime;
      
      // Add execution metadata
      if (result.meta) {
        result.meta.executionTime = executionTime;
      } else {
        result.meta = { executionTime };
      }

      this.emit('query:executed', { dataSource, query, result, executionTime });
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.emit('query:error', { dataSource, query, error, executionTime });
      throw error;
    }
  }

  /**
   * Stream query results
   */
  async* streamQuery(dataSourceId: string, query: DataQuery): AsyncIterable<QueryResult> {
    const dataSource = this.getDataSource(dataSourceId);
    if (!dataSource) {
      throw new Error(`Data source not found: ${dataSourceId}`);
    }

    const connection = this.connections.get(dataSourceId);
    if (!connection) {
      await this.connectDataSource(dataSourceId);
    }

    const connector = this.connections.get(dataSourceId);
    if (!connector?.streamQuery) {
      throw new Error(`Streaming not supported for data source: ${dataSourceId}`);
    }

    yield* connector.streamQuery(query);
  }

  /**
   * Get data source schema
   */
  async getSchema(dataSourceId: string): Promise<SchemaInfo | undefined> {
    await this.connectDataSource(dataSourceId);
    
    const connection = this.connections.get(dataSourceId);
    if (!connection?.getSchema) {
      return undefined;
    }

    return connection.getSchema();
  }

  /**
   * Get data source status
   */
  getDataSourceStatus(id: string): 'connected' | 'disconnected' | 'error' | 'unknown' {
    const dataSource = this.getDataSource(id);
    if (!dataSource) {
      return 'unknown';
    }

    if (!dataSource.enabled) {
      return 'disconnected';
    }

    return this.connections.has(id) ? 'connected' : 'disconnected';
  }

  /**
   * Get all data source statuses
   */
  getDataSourceStatuses(): Record<string, string> {
    const statuses: Record<string, string> = {};
    this.getDataSources().forEach(ds => {
      statuses[ds.id] = this.getDataSourceStatus(ds.id);
    });
    return statuses;
  }

  /**
   * Clear all connections
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.keys()).map(id => 
      this.disconnectDataSource(id)
    );
    await Promise.all(disconnectPromises);
  }

  /**
   * Enable/disable a data source
   */
  async setDataSourceEnabled(id: string, enabled: boolean): Promise<void> {
    const dataSource = this.getDataSource(id);
    if (!dataSource) {
      throw new Error(`Data source not found: ${id}`);
    }

    if (!enabled && this.connections.has(id)) {
      await this.disconnectDataSource(id);
    }

    await this.updateDataSource(id, { enabled });
  }
}

// Global data source manager instance
export const dataSourceManager = new DataSourceManager();