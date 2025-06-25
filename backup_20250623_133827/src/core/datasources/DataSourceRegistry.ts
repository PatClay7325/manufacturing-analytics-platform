/**
 * Adaptive Factory Manufacturing Intelligence Platform
 * Data Source Registry - Central management for all data source types
 * 
 * Original implementation for manufacturing data source integration
 */

import { 
  DataSource, 
  DataSourceType, 
  DataSourceRequest, 
  DataSourceResponse,
  DataFrame,
  DataQuery 
} from '@/types/datasource';
import { TimeRange } from '@/types/dashboard';
import { EventEmitter } from 'events';

// ============================================================================
// DATA SOURCE PLUGIN INTERFACE
// ============================================================================

export interface DataSourcePlugin<TQuery extends DataQuery = DataQuery, TOptions = any> {
  type: DataSourceType;
  name: string;
  description: string;
  category: DataSourceCategory;
  configComponent?: React.ComponentType<DataSourceConfigProps<TOptions>>;
  queryComponent: React.ComponentType<QueryEditorProps<TQuery>>;
  testComponent?: React.ComponentType<DataSourceTestProps<TOptions>>;
  defaultQuery: Partial<TQuery>;
  annotations?: boolean;
  metrics?: boolean;
  logs?: boolean;
  streaming?: boolean;
  backend?: boolean;
  manufacturing?: ManufacturingDataSourceConfig;
  meta: DataSourcePluginMeta;
  createDataSourceApi: (instanceSettings: DataSourceInstanceSettings<TOptions>) => DataSourceApi<TQuery>;
}

export interface DataSourceApi<TQuery extends DataQuery = DataQuery> {
  query(request: DataSourceRequest<TQuery>): Promise<DataSourceResponse>;
  testDatasource?(): Promise<DataSourceTestResult>;
  annotationQuery?(request: AnnotationQueryRequest): Promise<AnnotationEvent[]>;
  metricFindQuery?(query: string): Promise<MetricFindValue[]>;
  getTagKeys?(options: any): Promise<MetricFindValue[]>;
  getTagValues?(options: any): Promise<MetricFindValue[]>;
  interpolateVariablesInQueries?(queries: TQuery[], scopedVars: any): TQuery[];
}

export interface DataSourceInstanceSettings<TOptions = any> {
  id: number;
  uid: string;
  name: string;
  type: DataSourceType;
  url?: string;
  jsonData: TOptions;
  secureJsonData?: Record<string, string>;
  meta: DataSourcePlugin;
}

export type DataSourceCategory = 
  | 'database'
  | 'timeseries'
  | 'industrial'
  | 'manufacturing'
  | 'cloud'
  | 'streaming'
  | 'file'
  | 'simulation'
  | 'other';

export interface DataSourceConfigProps<TOptions = any> {
  options: DataSourceInstanceSettings<TOptions>;
  onOptionsChange: (options: DataSourceInstanceSettings<TOptions>) => void;
}

export interface QueryEditorProps<TQuery extends DataQuery = DataQuery> {
  query: TQuery;
  datasource: DataSourceApi<TQuery>;
  onChange: (query: TQuery) => void;
  onRunQuery: () => void;
  data?: DataFrame[];
}

export interface DataSourceTestProps<TOptions = any> {
  options: DataSourceInstanceSettings<TOptions>;
  onTestResult: (result: DataSourceTestResult) => void;
}

export interface DataSourceTestResult {
  status: 'success' | 'error';
  message: string;
  details?: any;
}

export interface AnnotationQueryRequest {
  range: TimeRange;
  rangeRaw: any;
  annotation: any;
  dashboard?: any;
}

export interface AnnotationEvent {
  time: number;
  timeEnd?: number;
  title: string;
  text?: string;
  tags?: string[];
}

export interface MetricFindValue {
  text: string;
  value?: string | number;
  expandable?: boolean;
}

export interface ManufacturingDataSourceConfig {
  equipmentIntegration?: boolean;
  realTimeData?: boolean;
  historicalData?: boolean;
  oeeMertrics?: boolean;
  qualityData?: boolean;
  maintenanceData?: boolean;
  energyMonitoring?: boolean;
  protocolSupport?: string[];
}

export interface DataSourcePluginMeta {
  id: string;
  name: string;
  version: string;
  info: {
    author: string;
    description: string;
    keywords: string[];
    documentation?: string;
  };
  dependencies?: string[];
}

// ============================================================================
// DATA SOURCE REGISTRY CLASS
// ============================================================================

export class DataSourceRegistry extends EventEmitter {
  private plugins: Map<DataSourceType, DataSourcePlugin> = new Map();
  private instances: Map<string, DataSourceInstanceSettings> = new Map();
  private apis: Map<string, DataSourceApi> = new Map();
  private categoryIndex: Map<DataSourceCategory, DataSourceType[]> = new Map();
  
  constructor() {
    super();
    this.initializeBuiltInDataSources();
  }

  // ============================================================================
  // PLUGIN REGISTRATION
  // ============================================================================

  registerPlugin<TQuery extends DataQuery = DataQuery, TOptions = any>(
    plugin: DataSourcePlugin<TQuery, TOptions>
  ): void {
    if (this.plugins.has(plugin.type)) {
      console.warn(`Data source plugin ${plugin.type} is already registered`);
      return;
    }

    this.plugins.set(plugin.type, plugin);
    
    // Update category index
    if (!this.categoryIndex.has(plugin.category)) {
      this.categoryIndex.set(plugin.category, []);
    }
    this.categoryIndex.get(plugin.category)!.push(plugin.type);
    
    console.log(`Registered data source plugin: ${plugin.type}`);
    this.emit('pluginRegistered', plugin);
  }

  getPlugin(type: DataSourceType): DataSourcePlugin | undefined {
    return this.plugins.get(type);
  }

  getAllPlugins(): DataSourcePlugin[] {
    return Array.from(this.plugins.values());
  }

  getPluginsByCategory(category: DataSourceCategory): DataSourcePlugin[] {
    const types = this.categoryIndex.get(category) || [];
    return types.map(type => this.plugins.get(type)!).filter(Boolean);
  }

  getManufacturingPlugins(): DataSourcePlugin[] {
    return this.getAllPlugins().filter(plugin => 
      plugin.category === 'manufacturing' || 
      plugin.category === 'industrial' ||
      plugin.manufacturing
    );
  }

  // ============================================================================
  // INSTANCE MANAGEMENT
  // ============================================================================

  async createInstance<TOptions = any>(
    config: Omit<DataSourceInstanceSettings<TOptions>, 'meta'>
  ): Promise<DataSourceInstanceSettings<TOptions>> {
    const plugin = this.getPlugin(config.type);
    if (!plugin) {
      throw new Error(`Unknown data source type: ${config.type}`);
    }

    const instance: DataSourceInstanceSettings<TOptions> = {
      ...config,
      meta: plugin
    };

    // Create API instance
    const api = plugin.createDataSourceApi(instance);
    
    // Test connection if supported
    if (api.testDatasource) {
      try {
        const testResult = await api.testDatasource();
        if (testResult.status === 'error') {
          throw new Error(`Data source test failed: ${testResult.message}`);
        }
      } catch (error) {
        console.warn(`Data source test failed for ${instance.name}:`, error);
      }
    }

    // Store instance and API
    this.instances.set(instance.uid, instance);
    this.apis.set(instance.uid, api);
    
    this.emit('instanceCreated', instance);
    return instance;
  }

  getInstance(uid: string): DataSourceInstanceSettings | undefined {
    return this.instances.get(uid);
  }

  getApi(uid: string): DataSourceApi | undefined {
    return this.apis.get(uid);
  }

  getAllInstances(): DataSourceInstanceSettings[] {
    return Array.from(this.instances.values());
  }

  async updateInstance<TOptions = any>(
    uid: string, 
    updates: Partial<DataSourceInstanceSettings<TOptions>>
  ): Promise<DataSourceInstanceSettings<TOptions>> {
    const instance = this.instances.get(uid);
    if (!instance) {
      throw new Error(`Data source instance not found: ${uid}`);
    }

    const updatedInstance = { ...instance, ...updates };
    
    // Recreate API if configuration changed
    if (updates.jsonData || updates.secureJsonData) {
      const api = instance.meta.createDataSourceApi(updatedInstance);
      this.apis.set(uid, api);
    }

    this.instances.set(uid, updatedInstance);
    this.emit('instanceUpdated', updatedInstance);
    
    return updatedInstance as DataSourceInstanceSettings<TOptions>;
  }

  async deleteInstance(uid: string): Promise<void> {
    const instance = this.instances.get(uid);
    if (!instance) {
      throw new Error(`Data source instance not found: ${uid}`);
    }

    this.instances.delete(uid);
    this.apis.delete(uid);
    
    this.emit('instanceDeleted', instance);
  }

  // ============================================================================
  // QUERY EXECUTION
  // ============================================================================

  async executeQuery<TQuery extends DataQuery = DataQuery>(
    datasourceUid: string,
    request: DataSourceRequest<TQuery>
  ): Promise<DataSourceResponse> {
    const api = this.getApi(datasourceUid);
    if (!api) {
      throw new Error(`Data source API not found: ${datasourceUid}`);
    }

    try {
      this.emit('queryStarted', datasourceUid, request);
      const response = await api.query(request);
      this.emit('queryCompleted', datasourceUid, request, response);
      return response;
    } catch (error) {
      this.emit('queryError', datasourceUid, request, error);
      throw error;
    }
  }

  async executeAnnotationQuery(
    datasourceUid: string,
    request: AnnotationQueryRequest
  ): Promise<AnnotationEvent[]> {
    const api = this.getApi(datasourceUid);
    if (!api || !api.annotationQuery) {
      throw new Error(`Annotation query not supported: ${datasourceUid}`);
    }

    return await api.annotationQuery(request);
  }

  async executeMetricFindQuery(
    datasourceUid: string,
    query: string
  ): Promise<MetricFindValue[]> {
    const api = this.getApi(datasourceUid);
    if (!api || !api.metricFindQuery) {
      throw new Error(`Metric find query not supported: ${datasourceUid}`);
    }

    return await api.metricFindQuery(query);
  }

  // ============================================================================
  // DATA SOURCE DISCOVERY
  // ============================================================================

  async discoverDataSources(): Promise<DataSourceDiscoveryResult[]> {
    const results: DataSourceDiscoveryResult[] = [];
    
    // Discover manufacturing systems on the network
    const manufacturingPlugins = this.getManufacturingPlugins();
    
    for (const plugin of manufacturingPlugins) {
      if (plugin.manufacturing?.equipmentIntegration) {
        try {
          const discovered = await this.discoverManufacturingEquipment(plugin);
          results.push(...discovered);
        } catch (error) {
          console.warn(`Failed to discover ${plugin.type}:`, error);
        }
      }
    }
    
    return results;
  }

  // ============================================================================
  // HEALTH MONITORING
  // ============================================================================

  async getDataSourceHealth(): Promise<DataSourceHealthStatus[]> {
    const statuses: DataSourceHealthStatus[] = [];
    
    for (const [uid, api] of this.apis.entries()) {
      const instance = this.instances.get(uid)!;
      
      try {
        let status: 'healthy' | 'warning' | 'error' = 'healthy';
        let message = 'Connected';
        
        if (api.testDatasource) {
          const testResult = await api.testDatasource();
          status = testResult.status === 'success' ? 'healthy' : 'error';
          message = testResult.message;
        }
        
        statuses.push({
          uid,
          name: instance.name,
          type: instance.type,
          status,
          message,
          lastChecked: new Date()
        });
      } catch (error) {
        statuses.push({
          uid,
          name: instance.name,
          type: instance.type,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
          lastChecked: new Date()
        });
      }
    }
    
    return statuses;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private initializeBuiltInDataSources(): void {
    // Built-in data sources will register themselves during module initialization
  }

  private async discoverManufacturingEquipment(
    plugin: DataSourcePlugin
  ): Promise<DataSourceDiscoveryResult[]> {
    // Implementation would depend on the specific protocol
    // This is a placeholder for network discovery logic
    return [];
  }
}

// ============================================================================
// SUPPORTING INTERFACES
// ============================================================================

export interface DataSourceDiscoveryResult {
  name: string;
  type: DataSourceType;
  url: string;
  description: string;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface DataSourceHealthStatus {
  uid: string;
  name: string;
  type: DataSourceType;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  lastChecked: Date;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function createDataSourceUid(): string {
  return 'ds_' + Math.random().toString(36).substr(2, 16);
}

export function validateDataSourceConfig<TOptions = any>(
  config: DataSourceInstanceSettings<TOptions>
): string[] {
  const errors: string[] = [];
  
  if (!config.name) {
    errors.push('Data source name is required');
  }
  
  if (!config.type) {
    errors.push('Data source type is required');
  }
  
  if (!config.uid) {
    errors.push('Data source UID is required');
  }
  
  return errors;
}

// Export singleton registry
export const dataSourceRegistry = new DataSourceRegistry();
export default DataSourceRegistry;