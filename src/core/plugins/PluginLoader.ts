/**
 * Plugin Loader - Handles dynamic loading and initialization of plugins
 * Supports hot-reloading and plugin dependencies
 */

import { getPluginRegistry } from './PluginRegistry';
import { PluginMeta, PluginType } from './types';
import { EventEmitter } from 'events';

interface PluginManifest {
  id: string;
  type: PluginType;
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  main: string;
  info: {
    author: {
      name: string;
      url?: string;
    };
    description: string;
    logos: {
      small: string;
      large: string;
    };
  };
}

export class PluginLoader extends EventEmitter {
  private static instance: PluginLoader;
  private registry = getPluginRegistry();
  private loadQueue: Map<string, Promise<void>> = new Map();
  private pluginManifests: Map<string, PluginManifest> = new Map();
  private pluginWatchers: Map<string, any> = new Map();
  private dependencyGraph: Map<string, Set<string>> = new Map();

  private constructor() {
    super();
    this.setupHotReload();
  }

  static getInstance(): PluginLoader {
    if (!PluginLoader.instance) {
      PluginLoader.instance = new PluginLoader();
    }
    return PluginLoader.instance;
  }

  /**
   * Load all plugins from a directory
   */
  async loadPluginsFromDirectory(directory: string): Promise<void> {
    try {
      const response = await fetch(`/api/plugins/scan?dir=${encodeURIComponent(directory)}`);
      const plugins = await response.json();

      // Build dependency graph
      this.buildDependencyGraph(plugins);

      // Load plugins in dependency order
      const loadOrder = this.getLoadOrder();
      
      for (const pluginId of loadOrder) {
        const manifest = this.pluginManifests.get(pluginId);
        if (manifest) {
          await this.loadPlugin(manifest);
        }
      }

      this.emit('plugins:loaded', plugins.length);
    } catch (error) {
      console.error('Failed to load plugins from directory:', error);
      this.emit('plugins:error', error);
    }
  }

  /**
   * Load a single plugin
   */
  async loadPlugin(manifest: PluginManifest): Promise<void> {
    const { id, main } = manifest;

    // Check if already loading
    if (this.loadQueue.has(id)) {
      return this.loadQueue.get(id);
    }

    // Create loading promise
    const loadPromise = this.doLoadPlugin(manifest);
    this.loadQueue.set(id, loadPromise);

    try {
      await loadPromise;
      this.emit('plugin:loaded', id);
    } catch (error) {
      console.error(`Failed to load plugin ${id}:`, error);
      this.emit('plugin:error', { id, error });
      throw error;
    } finally {
      this.loadQueue.delete(id);
    }
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    // Stop watching for changes
    const watcher = this.pluginWatchers.get(pluginId);
    if (watcher) {
      watcher.close();
      this.pluginWatchers.delete(pluginId);
    }

    // Unload from registry
    this.registry.unloadPlugin(pluginId);

    // Remove from manifests
    this.pluginManifests.delete(pluginId);

    this.emit('plugin:unloaded', pluginId);
  }

  /**
   * Reload a plugin (for hot-reload)
   */
  async reloadPlugin(pluginId: string): Promise<void> {
    const manifest = this.pluginManifests.get(pluginId);
    if (!manifest) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    await this.unloadPlugin(pluginId);
    await this.loadPlugin(manifest);
    
    this.emit('plugin:reloaded', pluginId);
  }

  /**
   * Get all loaded plugin manifests
   */
  getLoadedPlugins(): PluginManifest[] {
    return Array.from(this.pluginManifests.values());
  }

  /**
   * Check if a plugin is loaded
   */
  isPluginLoaded(pluginId: string): boolean {
    return this.pluginManifests.has(pluginId);
  }

  /**
   * Internal plugin loading logic
   */
  private async doLoadPlugin(manifest: PluginManifest): Promise<void> {
    const { id, type, main, dependencies } = manifest;

    // Check dependencies
    if (dependencies) {
      for (const [depId, depVersion] of Object.entries(dependencies)) {
        if (!this.isPluginLoaded(depId)) {
          throw new Error(`Missing dependency: ${depId}@${depVersion} required by ${id}`);
        }
      }
    }

    // Store manifest
    this.pluginManifests.set(id, manifest);

    // Determine plugin path
    const pluginPath = this.resolvePluginPath(main, id);

    // Load the plugin module
    await this.registry.loadPluginModule(pluginPath, id);

    // Setup hot-reload watcher if in development
    if (process.env.NODE_ENV === 'development') {
      this.watchPlugin(id, pluginPath);
    }
  }

  /**
   * Resolve plugin module path
   */
  private resolvePluginPath(main: string, pluginId: string): string {
    // Handle different plugin locations
    if (main.startsWith('/')) {
      return main;
    }

    // Built-in plugins
    if (main.startsWith('@grafana/')) {
      return `/plugins/built-in/${pluginId}/${main}`;
    }

    // External plugins
    return `/plugins/external/${pluginId}/${main}`;
  }

  /**
   * Build dependency graph for loading order
   */
  private buildDependencyGraph(plugins: PluginManifest[]): void {
    this.dependencyGraph.clear();

    for (const plugin of plugins) {
      const deps = new Set<string>();
      
      if (plugin.dependencies) {
        for (const depId of Object.keys(plugin.dependencies)) {
          deps.add(depId);
        }
      }

      this.dependencyGraph.set(plugin.id, deps);
      this.pluginManifests.set(plugin.id, plugin);
    }
  }

  /**
   * Get plugin load order based on dependencies
   */
  private getLoadOrder(): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const deps = this.dependencyGraph.get(id);
      if (deps) {
        for (const dep of deps) {
          visit(dep);
        }
      }

      order.push(id);
    };

    for (const id of this.dependencyGraph.keys()) {
      visit(id);
    }

    return order;
  }

  /**
   * Setup hot-reload functionality
   */
  private setupHotReload(): void {
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Listen for HMR events
    if (typeof window !== 'undefined' && (window as any).module?.hot) {
      (window as any).module.hot.accept((err: any) => {
        if (err) {
          console.error('HMR error:', err);
        }
      });
    }
  }

  /**
   * Watch plugin for changes
   */
  private watchPlugin(pluginId: string, pluginPath: string): void {
    if (typeof window !== 'undefined') {
      // Browser environment - use WebSocket for file watching
      const ws = new WebSocket(`ws://localhost:3001/plugin-watch/${pluginId}`);
      
      ws.onmessage = (event) => {
        if (event.data === 'reload') {
          console.log(`Plugin ${pluginId} changed, reloading...`);
          this.reloadPlugin(pluginId);
        }
      };

      this.pluginWatchers.set(pluginId, ws);
    }
  }

  /**
   * Load built-in plugins
   */
  async loadBuiltInPlugins(): Promise<void> {
    const builtInPlugins = await this.fetchBuiltInPluginList();
    
    for (const manifest of builtInPlugins) {
      try {
        await this.loadPlugin(manifest);
      } catch (error) {
        console.error(`Failed to load built-in plugin ${manifest.id}:`, error);
      }
    }
  }

  /**
   * Fetch list of built-in plugins
   */
  private async fetchBuiltInPluginList(): Promise<PluginManifest[]> {
    try {
      const response = await fetch('/api/plugins/built-in');
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch built-in plugins:', error);
      return [];
    }
  }

  /**
   * Install plugin from marketplace
   */
  async installPlugin(pluginId: string, version?: string): Promise<void> {
    try {
      const response = await fetch('/api/plugins/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pluginId, version })
      });

      if (!response.ok) {
        throw new Error(`Failed to install plugin: ${response.statusText}`);
      }

      const manifest = await response.json();
      await this.loadPlugin(manifest);
      
      this.emit('plugin:installed', pluginId);
    } catch (error) {
      console.error(`Failed to install plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Uninstall plugin
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    try {
      await this.unloadPlugin(pluginId);

      const response = await fetch(`/api/plugins/uninstall/${pluginId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to uninstall plugin: ${response.statusText}`);
      }

      this.emit('plugin:uninstalled', pluginId);
    } catch (error) {
      console.error(`Failed to uninstall plugin ${pluginId}:`, error);
      throw error;
    }
  }
}

export const getPluginLoader = () => PluginLoader.getInstance();