/**
 * Data Source Manager - Central registry for all data source instances
 */

import { DataSourcePlugin, DataSourceInstanceSettings } from './DataSourcePlugin';
import { PrometheusDataSource } from './plugins/PrometheusDataSource';

export interface DataSourceConstructor {
  new (instanceSettings: DataSourceInstanceSettings): DataSourcePlugin;
}

class DataSourceRegistry {
  private static instance: DataSourceRegistry;
  private dataSources = new Map<string, DataSourcePlugin>();
  private dataSourceTypes = new Map<string, DataSourceConstructor>();
  private settings = new Map<string, DataSourceInstanceSettings>();

  private constructor() {
    this.registerBuiltInDataSources();
  }

  static getInstance(): DataSourceRegistry {
    if (!DataSourceRegistry.instance) {
      DataSourceRegistry.instance = new DataSourceRegistry();
    }
    return DataSourceRegistry.instance;
  }

  private registerBuiltInDataSources(): void {
    this.dataSourceTypes.set('prometheus', PrometheusDataSource);
    console.log('Registered built-in data sources: prometheus');
  }

  getDataSource(uid: string): DataSourcePlugin | null {
    // First check if it's already instantiated
    if (this.dataSources.has(uid)) {
      return this.dataSources.get(uid)!;
    }

    // Try to find by name if uid doesn't match
    const settingsByName = Array.from(this.settings.values()).find(s => s.name === uid);
    const settings = this.settings.get(uid) || settingsByName;
    
    if (!settings) {
      console.error(`Data source settings not found for uid: ${uid}`);
      return null;
    }

    const Constructor = this.dataSourceTypes.get(settings.type);
    if (!Constructor) {
      console.error(`Data source type not registered: ${settings.type}`);
      return null;
    }

    try {
      const dataSource = new Constructor(settings);
      this.dataSources.set(settings.uid, dataSource);
      
      console.log(`Created data source instance: ${settings.name} (${settings.type})`);
      return dataSource;
    } catch (error) {
      console.error(`Failed to create data source instance: ${error}`);
      return null;
    }
  }

  addDataSource(settings: DataSourceInstanceSettings): void {
    this.settings.set(settings.uid, settings);
    if (this.dataSources.has(settings.uid)) {
      this.dataSources.delete(settings.uid);
    }
    console.log(`Added data source: ${settings.name} (${settings.type})`);
  }

  initializeDefaults(): void {
    const prometheusSettings: DataSourceInstanceSettings = {
      id: 1,
      uid: 'prometheus-manufacturing',
      type: 'prometheus',
      name: 'Manufacturing Prometheus',
      url: process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://localhost:9090',
      jsonData: {
        timeInterval: '30s',
        queryTimeout: '60s',
        httpMethod: 'GET',
      },
      basicAuth: false,
      withCredentials: false,
      isDefault: true,
      version: 1,
    };

    this.addDataSource(prometheusSettings);
    console.log('Initialized default data sources');
  }

  getAllDataSources(): DataSourceInstanceSettings[] {
    return Array.from(this.settings.values());
  }

  getDefaultDataSource(): DataSourcePlugin | null {
    const defaultSettings = Array.from(this.settings.values()).find(s => s.isDefault);
    return defaultSettings ? this.getDataSource(defaultSettings.uid) : null;
  }
}

export const dataSourceManager = DataSourceRegistry.getInstance();
dataSourceManager.initializeDefaults();

// Export function for easier access
export function getDataSourceManager(): DataSourceRegistry {
  return dataSourceManager;
}