'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Settings,
  ToggleLeft,
  ToggleRight,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  Shield,
  Clock,
  Download,
  Upload,
  ChevronRight,
  ExternalLink,
  Play,
  Pause,
  BarChart3,
  Database,
  Zap,
  Heart,
  Star
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface InstalledPlugin {
  id: string;
  pluginId: string;
  name: string;
  description: string;
  type: string;
  version: string;
  latestVersion?: string;
  author: string;
  enabled: boolean;
  status: string;
  errorMessage?: string;
  installPath: string;
  installedAt: Date;
  lastUsedAt?: Date;
  usageCount: number;
  updateAvailable: boolean;
  autoUpdate: boolean;
  signature: string;
  configuration?: any;
  health?: {
    status: 'healthy' | 'unhealthy' | 'unknown';
    cpuUsage?: number;
    memoryUsage?: number;
    lastCheck?: Date;
  };
}

interface PluginManagerProps {
  userId?: string;
  organizationId?: string;
}

export default function PluginManager({ userId, organizationId }: PluginManagerProps) {
  const router = useRouter();
  const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled' | 'updates' | 'errors'>('all');

  useEffect(() => {
    fetchInstalledPlugins();
    // Set up polling for plugin health
    const interval = setInterval(fetchPluginHealth, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchInstalledPlugins = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/plugins/installed');
      const data = await response.json();
      setPlugins(data);
    } catch (error) {
      console.error('Failed to fetch installed plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPluginHealth = async () => {
    try {
      const response = await fetch('/api/plugins/health');
      const healthData = await response.json();
      
      setPlugins(prev => prev.map(plugin => {
        const health = healthData[plugin.pluginId];
        return health ? { ...plugin, health } : plugin;
      }));
    } catch (error) {
      console.error('Failed to fetch plugin health:', error);
    }
  };

  const handleTogglePlugin = async (pluginId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/plugins/${pluginId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, userId, organizationId }),
      });

      if (response.ok) {
        await fetchInstalledPlugins();
      } else {
        const error = await response.json();
        alert(`Failed to ${enabled ? 'enable' : 'disable'} plugin: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to toggle plugin:', error);
    }
  };

  const handleUpdatePlugin = async (pluginId: string) => {
    setUpdating(pluginId);
    try {
      const response = await fetch(`/api/plugins/${pluginId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, organizationId }),
      });

      if (response.ok) {
        await fetchInstalledPlugins();
      } else {
        const error = await response.json();
        alert(`Failed to update plugin: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to update plugin:', error);
    } finally {
      setUpdating(null);
    }
  };

  const handleUninstallPlugin = async (pluginId: string) => {
    if (!confirm('Are you sure you want to uninstall this plugin? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/plugins/${pluginId}/uninstall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, organizationId }),
      });

      if (response.ok) {
        await fetchInstalledPlugins();
      } else {
        const error = await response.json();
        alert(`Failed to uninstall plugin: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
    }
  };

  const handleToggleAutoUpdate = async (pluginId: string, autoUpdate: boolean) => {
    try {
      const response = await fetch(`/api/plugins/${pluginId}/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoUpdate, userId, organizationId }),
      });

      if (response.ok) {
        setPlugins(prev => prev.map(p => 
          p.pluginId === pluginId ? { ...p, autoUpdate } : p
        ));
      }
    } catch (error) {
      console.error('Failed to update auto-update setting:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'panel':
        return <BarChart3 className="h-5 w-5" />;
      case 'datasource':
        return <Database className="h-5 w-5" />;
      case 'app':
        return <Package className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (plugin: InstalledPlugin) => {
    if (plugin.status === 'error') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </span>
      );
    }
    
    if (plugin.updateAvailable) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          <Download className="h-3 w-3 mr-1" />
          Update available
        </span>
      );
    }
    
    if (plugin.enabled) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle className="h-3 w-3 mr-1" />
          Active
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
        <Pause className="h-3 w-3 mr-1" />
        Disabled
      </span>
    );
  };

  const getHealthIndicator = (health?: InstalledPlugin['health']) => {
    if (!health) return null;
    
    const color = health.status === 'healthy' ? 'green' : 
                  health.status === 'unhealthy' ? 'red' : 'gray';
    
    return (
      <div className="flex items-center space-x-2 text-xs">
        <div className={`h-2 w-2 rounded-full bg-${color}-500`} />
        {health.cpuUsage !== undefined && (
          <span className="text-gray-500 dark:text-gray-400">
            CPU: {health.cpuUsage.toFixed(1)}%
          </span>
        )}
        {health.memoryUsage !== undefined && (
          <span className="text-gray-500 dark:text-gray-400">
            Mem: {health.memoryUsage}MB
          </span>
        )}
      </div>
    );
  };

  const filteredPlugins = plugins.filter(plugin => {
    switch (filter) {
      case 'enabled':
        return plugin.enabled;
      case 'disabled':
        return !plugin.enabled;
      case 'updates':
        return plugin.updateAvailable;
      case 'errors':
        return plugin.status === 'error';
      default:
        return true;
    }
  });

  const stats = {
    total: plugins.length,
    enabled: plugins.filter(p => p.enabled).length,
    updates: plugins.filter(p => p.updateAvailable).length,
    errors: plugins.filter(p => p.status === 'error').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Installed</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Package className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{stats.enabled}</p>
            </div>
            <Play className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Updates</p>
              <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{stats.updates}</p>
            </div>
            <Download className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Errors</p>
              <p className="text-2xl font-semibold text-red-600 dark:text-red-400">{stats.errors}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {[
              { id: 'all', label: 'All Plugins' },
              { id: 'enabled', label: 'Active' },
              { id: 'disabled', label: 'Disabled' },
              { id: 'updates', label: 'Updates Available' },
              { id: 'errors', label: 'Errors' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
                  filter === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
                {tab.id !== 'all' && (
                  <span className="ml-2 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs">
                    {stats[tab.id as keyof typeof stats]}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Plugin List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500 dark:text-gray-400">Loading plugins...</p>
            </div>
          ) : filteredPlugins.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-400" />
              <p className="mt-2 text-gray-500 dark:text-gray-400">No plugins found</p>
            </div>
          ) : (
            filteredPlugins.map(plugin => (
              <div key={plugin.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      {getTypeIcon(plugin.type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {plugin.name}
                        </h3>
                        {getStatusBadge(plugin)}
                        {plugin.signature === 'core' && (
                          <Shield className="h-4 w-4 text-blue-500" title="Core plugin" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {plugin.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>v{plugin.version}</span>
                        {plugin.latestVersion && plugin.version !== plugin.latestVersion && (
                          <span className="text-blue-600 dark:text-blue-400">
                            → v{plugin.latestVersion}
                          </span>
                        )}
                        <span>by {plugin.author}</span>
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {plugin.usageCount} uses
                        </span>
                        {plugin.lastUsedAt && (
                          <span>
                            Last used: {new Date(plugin.lastUsedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                      {plugin.errorMessage && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-400">
                          {plugin.errorMessage}
                        </div>
                      )}
                      
                      {getHealthIndicator(plugin.health)}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {/* Toggle Enable/Disable */}
                    <button
                      onClick={() => handleTogglePlugin(plugin.pluginId, !plugin.enabled)}
                      className={`p-2 rounded-lg transition-colors ${
                        plugin.enabled
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title={plugin.enabled ? 'Disable plugin' : 'Enable plugin'}
                    >
                      {plugin.enabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    
                    {/* Update Button */}
                    {plugin.updateAvailable && (
                      <button
                        onClick={() => handleUpdatePlugin(plugin.pluginId)}
                        disabled={updating === plugin.pluginId}
                        className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 disabled:opacity-50"
                        title="Update plugin"
                      >
                        {updating === plugin.pluginId ? (
                          <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                          <Download className="h-5 w-5" />
                        )}
                      </button>
                    )}
                    
                    {/* Settings */}
                    <button
                      onClick={() => router.push(`/plugins/${plugin.pluginId}/config`)}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                      title="Plugin settings"
                    >
                      <Settings className="h-5 w-5" />
                    </button>
                    
                    {/* Uninstall */}
                    <button
                      onClick={() => handleUninstallPlugin(plugin.pluginId)}
                      className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                      title="Uninstall plugin"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                {/* Auto-update toggle */}
                <div className="mt-4 flex items-center justify-between">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={plugin.autoUpdate}
                      onChange={(e) => handleToggleAutoUpdate(plugin.pluginId, e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Auto-update
                    </span>
                  </label>
                  
                  <button
                    onClick={() => router.push(`/plugins/${plugin.pluginId}`)}
                    className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    View details
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => router.push('/plugins')}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md transition-colors"
        >
          <Package className="h-5 w-5 mr-2" />
          Browse Marketplace
        </button>
        
        <div className="flex space-x-3">
          <button
            onClick={() => fetchInstalledPlugins()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Refresh
          </button>
          
          <button
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md transition-colors"
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload Plugin
          </button>
        </div>
      </div>
    </div>
  );
}