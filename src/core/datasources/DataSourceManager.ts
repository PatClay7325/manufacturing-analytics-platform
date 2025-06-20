/**
 * Data Source Manager - Central registry for all data source instances
 */

import { DataSourceApi, DataSourceInstanceSettings, DataSourceSettings } from './types';
import { PrometheusDataSource } from './PrometheusDataSource';

export interface DataSourceConstructor {
  new (instanceSettings: DataSourceInstanceSettings): DataSourceApi;
}

class DataSourceRegistry {
  private static instance: DataSourceRegistry;
  private dataSources = new Map<string, DataSourceApi>();
  private dataSourceTypes = new Map<string, DataSourceConstructor>();
  private settings = new Map<string, DataSourceSettings>();

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

  getDataSource(uid: string): DataSourceApi | null {
    if (this.dataSources.has(uid)) {
      return this.dataSources.get(uid)!;
    }

    const settings = this.settings.get(uid);
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
      const instanceSettings: DataSourceInstanceSettings = {
        id: settings.id,
        uid: settings.uid,
        type: settings.type,
        name: settings.name,
        url: settings.url,
        access: settings.access,
        basicAuth: settings.basicAuth,
        basicAuthUser: settings.basicAuthUser,
        basicAuthPassword: settings.basicAuthPassword,
        withCredentials: settings.withCredentials,
        isDefault: settings.isDefault,
        jsonData: settings.jsonData,
        secureJsonData: settings.secureJsonData,
        readOnly: settings.readOnly,
        database: settings.database,
        user: settings.user,
      };

      const dataSource = new Constructor(instanceSettings);
      this.dataSources.set(uid, dataSource);
      
      console.log(`Created data source instance: ${settings.name} (${settings.type})`);
      return dataSource;
    } catch (error) {
      console.error(`Failed to create data source instance: ${error}`);
      return null;
    }
  }

  addDataSource(settings: DataSourceSettings): void {
    this.settings.set(settings.uid, settings);
    if (this.dataSources.has(settings.uid)) {
      this.dataSources.delete(settings.uid);
    }
    console.log(`Added data source: ${settings.name} (${settings.type})`);
  }

  initializeDefaults(): void {
    const prometheusSettings: DataSourceSettings = {
      id: 1,
      uid: 'prometheus-manufacturing',
      type: 'prometheus',
      name: 'Manufacturing Prometheus',
      url: 'http://localhost:9090',
      access: 'proxy',
      basicAuth: false,
      withCredentials: false,
      isDefault: true,
      jsonData: {
        timeInterval: '30s',
        queryTimeout: '60s',
        httpMethod: 'GET',
      },
      readOnly: false,
      version: 1,
    };

    this.addDataSource(prometheusSettings);
    console.log('Initialized default data sources');
  }

  getAllDataSources(): DataSourceSettings[] {
    return Array.from(this.settings.values());
  }

  getDefaultDataSource(): DataSourceApi | null {
    const defaultSettings = Array.from(this.settings.values()).find(s => s.isDefault);
    return defaultSettings ? this.getDataSource(defaultSettings.uid) : null;
  }
}

export const dataSourceManager = DataSourceRegistry.getInstance();
dataSourceManager.initializeDefaults();