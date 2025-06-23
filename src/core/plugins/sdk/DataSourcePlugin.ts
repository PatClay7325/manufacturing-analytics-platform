/**
 * Data Source Plugin SDK
 * Helpers for creating Analytics-compatible data source plugins
 */

import { ComponentType } from 'react';
import {
  DataSourcePlugin as DataSourcePluginType,
  DataSourcePluginMeta,
  DataSourceApi,
  DataSourceConstructor,
  DataQuery,
  PluginType,
  PluginSignature,
  QueryEditorProps,
  DataSourceConfigEditorProps,
  ExploreQueryFieldProps,
  DataSourcePluginComponents
} from '../types';

export class DataSourcePluginBuilder<
  TQuery extends DataQuery = DataQuery,
  TOptions = any
> {
  private plugin: Partial<DataSourcePluginType<TQuery, TOptions>> = {
    components: {}
  };

  constructor(DataSource: DataSourceConstructor<TQuery, TOptions>) {
    this.plugin.DataSource = DataSource;
  }

  setId(id: string): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as DataSourcePluginMeta;
    }
    this.plugin.meta.id = id;
    this.plugin.meta.type = PluginType.DataSource;
    return this;
  }

  setName(name: string): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as DataSourcePluginMeta;
    }
    this.plugin.meta.name = name;
    return this;
  }

  setDescription(description: string): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as DataSourcePluginMeta;
    }
    if (!this.plugin.meta.info) {
      this.plugin.meta.info = {} as any;
    }
    this.plugin.meta.info.description = description;
    return this;
  }

  setQueryEditor(editor: ComponentType<QueryEditorProps<TQuery, TOptions>>): this {
    this.plugin.components!.QueryEditor = editor;
    return this;
  }

  setConfigEditor(editor: ComponentType<DataSourceConfigEditorProps<TOptions>>): this {
    this.plugin.components!.ConfigEditor = editor;
    return this;
  }

  setExploreQueryField(editor: ComponentType<ExploreQueryFieldProps<TQuery, TOptions>>): this {
    this.plugin.components!.ExploreQueryField = editor;
    return this;
  }

  setAnnotations(enabled: boolean): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as DataSourcePluginMeta;
    }
    this.plugin.meta.annotations = enabled;
    return this;
  }

  setMetrics(enabled: boolean): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as DataSourcePluginMeta;
    }
    this.plugin.meta.metrics = enabled;
    return this;
  }

  setAlerting(enabled: boolean): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as DataSourcePluginMeta;
    }
    this.plugin.meta.alerting = enabled;
    return this;
  }

  setLogs(enabled: boolean): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as DataSourcePluginMeta;
    }
    this.plugin.meta.logs = enabled;
    return this;
  }

  setTracing(enabled: boolean): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as DataSourcePluginMeta;
    }
    this.plugin.meta.tracing = enabled;
    return this;
  }

  setStreaming(enabled: boolean): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as DataSourcePluginMeta;
    }
    this.plugin.meta.streaming = enabled;
    return this;
  }

  setBackend(enabled: boolean): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as DataSourcePluginMeta;
    }
    this.plugin.meta.backend = enabled;
    return this;
  }

  setQueryOptions(options: {
    maxDataPoints?: boolean;
    minInterval?: boolean;
    cacheTimeout?: boolean;
  }): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as DataSourcePluginMeta;
    }
    this.plugin.meta.queryOptions = options;
    return this;
  }

  addRoute(route: {
    path: string;
    method: string;
    reqRole?: string;
    url?: string;
    headers?: Record<string, string>;
  }): this {
    if (!this.plugin.meta) {
      this.plugin.meta = {} as DataSourcePluginMeta;
    }
    if (!this.plugin.meta.routes) {
      this.plugin.meta.routes = [];
    }
    this.plugin.meta.routes.push(route);
    return this;
  }

  build(): DataSourcePluginType<TQuery, TOptions> {
    // Ensure required fields
    if (!this.plugin.meta?.id) {
      throw new Error('Data source plugin must have an ID');
    }

    if (!this.plugin.meta.name) {
      throw new Error('Data source plugin must have a name');
    }

    if (!this.plugin.DataSource) {
      throw new Error('Data source plugin must have a DataSource class');
    }

    // Set defaults
    if (!this.plugin.meta.type) {
      this.plugin.meta.type = PluginType.DataSource;
    }

    if (!this.plugin.meta.info) {
      this.plugin.meta.info = {
        author: { name: 'Manufacturing AnalyticsPlatform' },
        description: this.plugin.meta.name,
        logos: {
          small: 'public/img/icn-datasource.svg',
          large: 'public/img/icn-datasource.svg'
        },
        version: '1.0.0',
        updated: new Date().toISOString()
      };
    }

    if (!this.plugin.meta.signature) {
      this.plugin.meta.signature = PluginSignature.Internal;
    }

    if (!this.plugin.meta.module) {
      this.plugin.meta.module = `app/plugins/datasource/${this.plugin.meta.id}/module`;
    }

    if (!this.plugin.meta.baseUrl) {
      this.plugin.meta.baseUrl = `public/app/plugins/datasource/${this.plugin.meta.id}`;
    }

    // Default capabilities
    if (this.plugin.meta.metrics === undefined) {
      this.plugin.meta.metrics = true;
    }

    return this.plugin as DataSourcePluginType<TQuery, TOptions>;
  }
}

// Helper function to create data source plugins
export function createDataSourcePlugin<
  TQuery extends DataQuery = DataQuery,
  TOptions = any
>(
  DataSource: DataSourceConstructor<TQuery, TOptions>
): DataSourcePluginBuilder<TQuery, TOptions> {
  return new DataSourcePluginBuilder(DataSource);
}

// Base query defaults
export function getDefaultQuery(): DataQuery {
  return {
    refId: 'A',
    hide: false,
  };
}

// Query utilities
export function isQueryHidden(query: DataQuery): boolean {
  return query.hide === true;
}

export function hasQueryRefId(query: DataQuery): boolean {
  return query.refId !== undefined && query.refId !== '';
}

export function getNextRefId(queries: DataQuery[]): string {
  const refIds = queries.map(q => q.refId).filter(Boolean);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  for (const letter of letters) {
    if (!refIds.includes(letter)) {
      return letter;
    }
  }
  
  // If all single letters are used, start with AA, AB, etc.
  for (const letter1 of letters) {
    for (const letter2 of letters) {
      const refId = letter1 + letter2;
      if (!refIds.includes(refId)) {
        return refId;
      }
    }
  }
  
  return 'A';
}