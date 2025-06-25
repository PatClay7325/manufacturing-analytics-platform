/**
 * Simple Plugin System - A working implementation of the plugin architecture
 * This provides the core functionality for registering and using plugins
 */

import React from 'react';
import { EventEmitter } from 'events';

// Types
export interface PluginMeta {
  id: string;
  name: string;
  type: 'panel' | 'datasource' | 'app';
  description?: string;
  version: string;
  author?: string;
}

export interface PanelPlugin {
  meta: PluginMeta;
  component: React.ComponentType<any>;
  configComponent?: React.ComponentType<any>;
  defaults?: Record<string, any>;
}

export interface DataSourcePlugin {
  meta: PluginMeta;
  DataSource: new (config: any) => any;
  ConfigEditor?: React.ComponentType<any>;
  QueryEditor?: React.ComponentType<any>;
}

// Simple Plugin Registry
export class SimplePluginRegistry extends EventEmitter {
  private static instance: SimplePluginRegistry;
  private panels = new Map<string, PanelPlugin>();
  private datasources = new Map<string, DataSourcePlugin>();

  private constructor() {
    super();
  }

  static getInstance(): SimplePluginRegistry {
    if (!SimplePluginRegistry.instance) {
      SimplePluginRegistry.instance = new SimplePluginRegistry();
    }
    return SimplePluginRegistry.instance;
  }

  // Register a panel plugin
  registerPanel(plugin: PanelPlugin): void {
    this.panels.set(plugin.meta.id, plugin);
    this.emit('panel:registered', plugin.meta.id);
    console.log(`Registered panel plugin: ${plugin.meta.name}`);
  }

  // Register a datasource plugin
  registerDataSource(plugin: DataSourcePlugin): void {
    this.datasources.set(plugin.meta.id, plugin);
    this.emit('datasource:registered', plugin.meta.id);
    console.log(`Registered datasource plugin: ${plugin.meta.name}`);
  }

  // Get panel plugin
  getPanel(id: string): PanelPlugin | undefined {
    return this.panels.get(id);
  }

  // Get all panels
  getPanels(): PanelPlugin[] {
    return Array.from(this.panels.values());
  }

  // Get datasource plugin
  getDataSource(id: string): DataSourcePlugin | undefined {
    return this.datasources.get(id);
  }

  // Get all datasources
  getDataSources(): DataSourcePlugin[] {
    return Array.from(this.datasources.values());
  }

  // Create panel instance
  createPanelInstance(id: string, props: any): React.ReactElement | null {
    const plugin = this.panels.get(id);
    if (!plugin) {
      console.error(`Panel plugin ${id} not found`);
      return null;
    }

    return React.createElement(plugin.component, props);
  }

  // Create datasource instance
  createDataSourceInstance(id: string, config: any): any {
    const plugin = this.datasources.get(id);
    if (!plugin) {
      throw new Error(`DataSource plugin ${id} not found`);
    }

    return new plugin.DataSource(config);
  }
}

// Export singleton
export const pluginRegistry = SimplePluginRegistry.getInstance();