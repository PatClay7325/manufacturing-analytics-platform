/**
 * Plugin Registry - Core plugin management system
 * Manages registration, loading, and lifecycle of all plugins
 */

import { 
  PluginType, 
  PanelPlugin, 
  DataSourcePlugin, 
  AppPlugin,
  PluginMeta,
  PluginState,
  PluginSignature,
  DataSourceApi,
  DataQuery
} from './types';
import { EventEmitter } from 'events';

export class PluginRegistry extends EventEmitter {
  private static instance: PluginRegistry;
  
  private panels = new Map<string, PanelPlugin>();
  private datasources = new Map<string, DataSourcePlugin>();
  private apps = new Map<string, AppPlugin>();
  private pluginMeta = new Map<string, PluginMeta>();
  private loadedModules = new Set<string>();
  private pluginPaths = new Map<string, string>();
  
  // Plugin lifecycle hooks
  private preInstallHooks = new Map<string, Array<() => Promise<void>>>();
  private postInstallHooks = new Map<string, Array<() => Promise<void>>>();
  
  private constructor() {
    super();
    this.initializeBuiltInPlugins();
  }

  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  /**
   * Register a panel plugin
   */
  registerPanel(plugin: PanelPlugin): void {
    const id = plugin.meta.id;
    
    if (this.panels.has(id)) {
      console.warn(`Panel plugin ${id} is already registered. Overwriting.`);
    }

    // Validate plugin
    this.validatePanelPlugin(plugin);
    
    // Store plugin
    this.panels.set(id, plugin);
    this.pluginMeta.set(id, plugin.meta);
    
    // Emit registration event
    this.emit('panel:registered', plugin);
    
    console.log(`Registered panel plugin: ${id}`);
  }

  /**
   * Register a data source plugin
   */
  registerDataSource(plugin: DataSourcePlugin): void {
    const id = plugin.meta.id;
    
    if (this.datasources.has(id)) {
      console.warn(`DataSource plugin ${id} is already registered. Overwriting.`);
    }

    // Validate plugin
    this.validateDataSourcePlugin(plugin);
    
    // Store plugin
    this.datasources.set(id, plugin);
    this.pluginMeta.set(id, plugin.meta);
    
    // Emit registration event
    this.emit('datasource:registered', plugin);
    
    console.log(`Registered datasource plugin: ${id}`);
  }

  /**
   * Register an app plugin
   */
  registerApp(plugin: AppPlugin): void {
    const id = plugin.meta.id;
    
    if (this.apps.has(id)) {
      console.warn(`App plugin ${id} is already registered. Overwriting.`);
    }

    // Validate plugin
    this.validateAppPlugin(plugin);
    
    // Initialize app if needed
    if (plugin.init) {
      plugin.init(plugin.meta);
    }
    
    // Store plugin
    this.apps.set(id, plugin);
    this.pluginMeta.set(id, plugin.meta);
    
    // Emit registration event
    this.emit('app:registered', plugin);
    
    console.log(`Registered app plugin: ${id}`);
  }

  /**
   * Get a panel plugin by ID
   */
  getPanel(id: string): PanelPlugin | undefined {
    return this.panels.get(id);
  }

  /**
   * Get a data source plugin by ID
   */
  getDataSource(id: string): DataSourcePlugin | undefined {
    return this.datasources.get(id);
  }

  /**
   * Get an app plugin by ID
   */
  getApp(id: string): AppPlugin | undefined {
    return this.apps.get(id);
  }

  /**
   * Get plugin metadata by ID
   */
  getPluginMeta(id: string): PluginMeta | undefined {
    return this.pluginMeta.get(id);
  }

  /**
   * Get all panels
   */
  getAllPanels(): Map<string, PanelPlugin> {
    return new Map(this.panels);
  }

  /**
   * Get all data sources
   */
  getAllDataSources(): Map<string, DataSourcePlugin> {
    return new Map(this.datasources);
  }

  /**
   * Get all apps
   */
  getAllApps(): Map<string, AppPlugin> {
    return new Map(this.apps);
  }

  /**
   * Get panels for picker (excludes hidden panels)
   */
  getPanelsForPicker(): PanelPlugin[] {
    return Array.from(this.panels.values())
      .filter(panel => !panel.meta.hideFromList)
      .sort((a, b) => (a.meta.sort || 100) - (b.meta.sort || 100));
  }

  /**
   * Load a plugin module dynamically
   */
  async loadPluginModule(modulePath: string, pluginId: string): Promise<any> {
    if (this.loadedModules.has(modulePath)) {
      return;
    }

    try {
      // Dynamic import for plugin module
      const module = await import(modulePath);
      
      // Mark as loaded
      this.loadedModules.add(modulePath);
      this.pluginPaths.set(pluginId, modulePath);
      
      // Auto-register if module exports plugin
      if (module.plugin) {
        const plugin = module.plugin;
        
        if (plugin.meta) {
          switch (plugin.meta.type) {
            case PluginType.Panel:
              this.registerPanel(plugin);
              break;
            case PluginType.DataSource:
              this.registerDataSource(plugin);
              break;
            case PluginType.App:
              this.registerApp(plugin);
              break;
          }
        }
      }
      
      return module;
    } catch (error) {
      console.error(`Failed to load plugin module: ${modulePath}`, error);
      throw error;
    }
  }

  /**
   * Unload a plugin
   */
  unloadPlugin(pluginId: string): void {
    // Remove from registries
    this.panels.delete(pluginId);
    this.datasources.delete(pluginId);
    this.apps.delete(pluginId);
    this.pluginMeta.delete(pluginId);
    
    // Remove module path
    const modulePath = this.pluginPaths.get(pluginId);
    if (modulePath) {
      this.loadedModules.delete(modulePath);
      this.pluginPaths.delete(pluginId);
    }
    
    // Emit unload event
    this.emit('plugin:unloaded', pluginId);
  }

  /**
   * Create data source instance
   */
  createDataSourceInstance<TQuery extends DataQuery = DataQuery, TOptions = any>(
    settings: any
  ): DataSourceApi<TQuery, TOptions> {
    const plugin = this.datasources.get(settings.type);
    
    if (!plugin) {
      throw new Error(`Data source plugin ${settings.type} not found`);
    }

    const instance = new plugin.DataSource(settings);
    instance.meta = plugin.meta;
    
    return instance as DataSourceApi<TQuery, TOptions>;
  }

  /**
   * Add pre-install hook for a plugin type
   */
  addPreInstallHook(pluginId: string, hook: () => Promise<void>): void {
    const hooks = this.preInstallHooks.get(pluginId) || [];
    hooks.push(hook);
    this.preInstallHooks.set(pluginId, hooks);
  }

  /**
   * Add post-install hook for a plugin type
   */
  addPostInstallHook(pluginId: string, hook: () => Promise<void>): void {
    const hooks = this.postInstallHooks.get(pluginId) || [];
    hooks.push(hook);
    this.postInstallHooks.set(pluginId, hooks);
  }

  /**
   * Validate panel plugin structure
   */
  private validatePanelPlugin(plugin: PanelPlugin): void {
    if (!plugin.meta || !plugin.meta.id) {
      throw new Error('Panel plugin must have meta.id');
    }
    
    if (!plugin.panel) {
      throw new Error(`Panel plugin ${plugin.meta.id} must have a panel component`);
    }
    
    if (plugin.meta.type !== PluginType.Panel) {
      throw new Error(`Plugin ${plugin.meta.id} type must be 'panel'`);
    }
  }

  /**
   * Validate data source plugin structure
   */
  private validateDataSourcePlugin(plugin: DataSourcePlugin): void {
    if (!plugin.meta || !plugin.meta.id) {
      throw new Error('DataSource plugin must have meta.id');
    }
    
    if (!plugin.DataSource) {
      throw new Error(`DataSource plugin ${plugin.meta.id} must have a DataSource class`);
    }
    
    if (plugin.meta.type !== PluginType.DataSource) {
      throw new Error(`Plugin ${plugin.meta.id} type must be 'datasource'`);
    }
  }

  /**
   * Validate app plugin structure
   */
  private validateAppPlugin(plugin: AppPlugin): void {
    if (!plugin.meta || !plugin.meta.id) {
      throw new Error('App plugin must have meta.id');
    }
    
    if (plugin.meta.type !== PluginType.App) {
      throw new Error(`Plugin ${plugin.meta.id} type must be 'app'`);
    }
  }

  /**
   * Initialize built-in plugins that match Analytics' core plugins
   */
  private initializeBuiltInPlugins(): void {
    // This will be populated by individual plugin registrations
    console.log('Plugin Registry initialized. Ready to register plugins.');
  }

  /**
   * Get plugin stats
   */
  getStats() {
    return {
      panels: this.panels.size,
      datasources: this.datasources.size,
      apps: this.apps.size,
      total: this.pluginMeta.size,
      loaded: this.loadedModules.size
    };
  }

  /**
   * Search plugins by criteria
   */
  searchPlugins(criteria: {
    type?: PluginType;
    category?: string;
    state?: PluginState;
    signature?: PluginSignature;
  }): PluginMeta[] {
    let results = Array.from(this.pluginMeta.values());
    
    if (criteria.type) {
      results = results.filter(p => p.type === criteria.type);
    }
    
    if (criteria.category) {
      results = results.filter(p => p.category === criteria.category);
    }
    
    if (criteria.state) {
      results = results.filter(p => p.state === criteria.state);
    }
    
    if (criteria.signature) {
      results = results.filter(p => p.signature === criteria.signature);
    }
    
    return results;
  }
}

// Export singleton instance getter
export const getPluginRegistry = () => PluginRegistry.getInstance();