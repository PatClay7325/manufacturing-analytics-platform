/**
 * Plugin List Panel - Grafana-compatible plugin list display
 * Shows installed plugins, available updates, and plugin catalog
 */

import React, { useState, useEffect, useMemo } from 'react';
import { PanelProps } from '@/core/plugins/types';
import { 
  Package, Download, CheckCircle, AlertCircle, 
  ExternalLink, Star, Clock, Shield, 
  Zap, Database, BarChart3, Filter
} from 'lucide-react';
import { getPluginRegistry } from '@/core/plugins/PluginRegistry';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface PluginListPanelOptions {
  showType: 'all' | 'installed' | 'panel' | 'datasource' | 'app';
  sortBy: 'name' | 'updated' | 'downloads' | 'installed';
  showDetails: boolean;
}

interface Plugin {
  id: string;
  type: 'panel' | 'datasource' | 'app';
  name: string;
  description: string;
  version: string;
  author: string;
  downloads?: number;
  stars?: number;
  lastUpdated: string;
  installed: boolean;
  hasUpdate?: boolean;
  signatureStatus?: 'valid' | 'invalid' | 'unsigned';
  dependencies?: string[];
}

const PluginListPanel: React.FC<PanelProps<PluginListPanelOptions>> = ({
  options,
  width,
  height,
}) => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(options.showType || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    setLoading(true);
    try {
      const registry = getPluginRegistry();
      
      // Get installed plugins
      const installedPanels = Array.from(registry['panels'].entries());
      const installedDataSources = Array.from(registry['datasources'].entries());
      const installedApps = Array.from(registry['apps'].entries());

      const allPlugins: Plugin[] = [];

      // Add installed plugins
      installedPanels.forEach(([id, plugin]) => {
        allPlugins.push({
          id,
          type: 'panel',
          name: plugin.name || id,
          description: plugin.description || 'Custom panel plugin',
          version: plugin.version || '1.0.0',
          author: plugin.author || 'Unknown',
          lastUpdated: new Date().toISOString(),
          installed: true,
          signatureStatus: 'valid',
        });
      });

      installedDataSources.forEach(([id, plugin]) => {
        allPlugins.push({
          id,
          type: 'datasource',
          name: plugin.name || id,
          description: plugin.description || 'Custom data source plugin',
          version: plugin.version || '1.0.0',
          author: plugin.author || 'Unknown',
          lastUpdated: new Date().toISOString(),
          installed: true,
          signatureStatus: 'valid',
        });
      });

      // Add some mock available plugins
      const availablePlugins: Plugin[] = [
        {
          id: 'piechart-panel',
          type: 'panel',
          name: 'Pie Chart Panel',
          description: 'Beautiful pie charts with drill-down capabilities',
          version: '2.1.0',
          author: 'Grafana Labs',
          downloads: 125000,
          stars: 89,
          lastUpdated: new Date(Date.now() - 86400000 * 7).toISOString(),
          installed: false,
        },
        {
          id: 'influxdb-datasource',
          type: 'datasource',
          name: 'InfluxDB',
          description: 'InfluxDB time series database data source',
          version: '5.0.0',
          author: 'Grafana Labs',
          downloads: 890000,
          stars: 456,
          lastUpdated: new Date(Date.now() - 86400000 * 3).toISOString(),
          installed: false,
          signatureStatus: 'valid',
        },
        {
          id: 'k6-cloud-app',
          type: 'app',
          name: 'k6 Cloud',
          description: 'Load testing and performance monitoring',
          version: '3.2.1',
          author: 'k6',
          downloads: 45000,
          stars: 123,
          lastUpdated: new Date(Date.now() - 86400000 * 14).toISOString(),
          installed: false,
        },
      ];

      setPlugins([...allPlugins, ...availablePlugins]);
    } catch (error) {
      console.error('Failed to load plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlugins = useMemo(() => {
    let filtered = [...plugins];

    // Filter by type
    if (selectedType !== 'all') {
      if (selectedType === 'installed') {
        filtered = filtered.filter(p => p.installed);
      } else {
        filtered = filtered.filter(p => p.type === selectedType);
      }
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (options.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'updated':
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        case 'downloads':
          return (b.downloads || 0) - (a.downloads || 0);
        case 'installed':
          return (b.installed ? 1 : 0) - (a.installed ? 1 : 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [plugins, selectedType, searchQuery, options.sortBy]);

  const getTypeIcon = (type: Plugin['type']) => {
    switch (type) {
      case 'panel':
        return <BarChart3 className="h-4 w-4" />;
      case 'datasource':
        return <Database className="h-4 w-4" />;
      case 'app':
        return <Package className="h-4 w-4" />;
    }
  };

  const getSignatureIcon = (status?: Plugin['signatureStatus']) => {
    switch (status) {
      case 'valid':
        return <Shield className="h-3 w-3 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case 'unsigned':
      default:
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      {/* Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-1.5 border rounded-md"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(['all', 'installed', 'panel', 'datasource', 'app'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={cn(
                "px-3 py-1 text-sm rounded-md transition-colors",
                selectedType === type
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent"
              )}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Plugin count */}
      <div className="text-sm text-muted-foreground mb-4">
        Showing {filteredPlugins.length} plugin{filteredPlugins.length !== 1 ? 's' : ''}
      </div>

      {/* Plugin list */}
      <div className="space-y-3">
        {filteredPlugins.map((plugin) => (
          <div
            key={plugin.id}
            className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {/* Type icon */}
                <div className="p-2 rounded-md bg-muted">
                  {getTypeIcon(plugin.type)}
                </div>

                {/* Plugin info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{plugin.name}</h4>
                    <span className="text-xs px-1.5 py-0.5 bg-muted rounded">
                      {plugin.type}
                    </span>
                    {plugin.installed && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {plugin.hasUpdate && (
                      <span className="text-xs text-yellow-600">Update available</span>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-2">
                    {plugin.description}
                  </p>

                  {options.showDetails && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>v{plugin.version}</span>
                      <span className="flex items-center gap-1">
                        by {plugin.author}
                        {plugin.signatureStatus && getSignatureIcon(plugin.signatureStatus)}
                      </span>
                      {plugin.downloads && (
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {plugin.downloads.toLocaleString()}
                        </span>
                      )}
                      {plugin.stars && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {plugin.stars}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Updated {new Date(plugin.lastUpdated).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {plugin.installed ? (
                  <>
                    {plugin.hasUpdate && (
                      <button className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">
                        Update
                      </button>
                    )}
                    <Link
                      href={`/plugins/${plugin.id}`}
                      className="px-3 py-1 text-sm border rounded hover:bg-accent"
                    >
                      Configure
                    </Link>
                  </>
                ) : (
                  <button className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">
                    Install
                  </button>
                )}
                <a
                  href={`https://grafana.com/plugins/${plugin.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:bg-accent rounded"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredPlugins.length === 0 && (
        <div className="text-center py-8">
          <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No plugins found</p>
        </div>
      )}
    </div>
  );
};

export default PluginListPanel;