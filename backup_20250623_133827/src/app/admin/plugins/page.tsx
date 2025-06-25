'use client';

import React from 'react';

import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { 
  Package, 
  Search, 
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
  Settings,
  RefreshCw,
  Info,
  ExternalLink,
  Trash2
} from 'lucide-react';

interface InstalledPlugin {
  id: string;
  name: string;
  type: 'panel' | 'datasource' | 'app';
  version: string;
  installedVersion: string;
  hasUpdate: boolean;
  enabled: boolean;
  signed: boolean;
  signatureStatus: 'valid' | 'invalid' | 'missing' | 'modified';
  author: string;
  description: string;
  dependencies?: { [key: string]: string };
  includes?: string[];
  category: string;
  buildInfo: {
    time: number;
    repo: string;
    branch: string;
    hash: string;
  };
}

const mockPlugins: InstalledPlugin[] = [
  {
    id: 'prometheus',
    name: 'Prometheus',
    type: 'datasource',
    version: '5.0.0',
    installedVersion: '5.0.0',
    hasUpdate: false,
    enabled: true,
    signed: true,
    signatureStatus: 'valid',
    author: 'AnalyticsPlatform Team',
    description: 'Open source monitoring system & time series database',
    category: 'tsdb',
    buildInfo: {
      time: 1704067200000,
      repo: 'https://github.com/manufacturing-analytics/platform',
      branch: 'main',
      hash: 'abc123'
    }
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    type: 'datasource',
    version: '5.0.0',
    installedVersion: '4.2.0',
    hasUpdate: true,
    enabled: true,
    signed: true,
    signatureStatus: 'valid',
    author: 'AnalyticsPlatform Team',
    description: 'PostgreSQL datasource plugin',
    category: 'sql',
    buildInfo: {
      time: 1703462400000,
      repo: 'https://github.com/manufacturing-analytics/platform',
      branch: 'main',
      hash: 'def456'
    }
  },
  {
    id: 'piechart-panel',
    name: 'Pie Chart',
    type: 'panel',
    version: '2.1.0',
    installedVersion: '2.1.0',
    hasUpdate: false,
    enabled: true,
    signed: true,
    signatureStatus: 'valid',
    author: 'AnalyticsPlatform Team',
    description: 'Pie chart panel for data visualization',
    category: 'panel',
    buildInfo: {
      time: 1702857600000,
      repo: 'https://github.com/analytics/piechart-panel',
      branch: 'main',
      hash: 'ghi789'
    }
  },
  {
    id: 'redis-datasource',
    name: 'Redis',
    type: 'datasource',
    version: '2.0.1',
    installedVersion: '2.0.1',
    hasUpdate: false,
    enabled: false,
    signed: true,
    signatureStatus: 'valid',
    author: 'Redis Labs',
    description: 'Redis datasource plugin',
    dependencies: {
      'analyticsVersion': '>=8.0.0'
    },
    category: 'database',
    buildInfo: {
      time: 1702252800000,
      repo: 'https://github.com/analytics/redis-datasource',
      branch: 'main',
      hash: 'jkl012'
    }
  },
  {
    id: 'custom-panel',
    name: 'Custom Panel',
    type: 'panel',
    version: '1.0.0',
    installedVersion: '1.0.0',
    hasUpdate: false,
    enabled: true,
    signed: false,
    signatureStatus: 'missing',
    author: 'Manufacturing Inc',
    description: 'Custom panel for manufacturing metrics',
    category: 'panel',
    buildInfo: {
      time: 1701648000000,
      repo: 'internal',
      branch: 'develop',
      hash: 'mno345'
    }
  }
];

export default function AdminPluginsPage() {
  const [plugins] = useState(mockPlugins);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = 
      plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.author.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || plugin.type === filterType;
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'enabled' && plugin.enabled) ||
      (filterStatus === 'disabled' && !plugin.enabled) ||
      (filterStatus === 'unsigned' && !plugin.signed) ||
      (filterStatus === 'update' && plugin.hasUpdate);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getSignatureIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'invalid':
      case 'modified':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'missing':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-400" />;
    }
  };

  const getSignatureText = (status: string) => {
    switch (status) {
      case 'valid':
        return 'Signed';
      case 'invalid':
        return 'Invalid signature';
      case 'modified':
        return 'Modified';
      case 'missing':
        return 'Unsigned';
      default:
        return 'Unknown';
    }
  };

  const pluginStats = {
    total: plugins.length,
    enabled: plugins.filter(p => p.enabled).length,
    disabled: plugins.filter(p => !p.enabled).length,
    unsigned: plugins.filter(p => !p.signed).length,
    updates: plugins.filter(p => p.hasUpdate).length
  };

  return (
    <PageLayout
      title="Plugin management"
      description="Manage installed plugins and their settings"
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{pluginStats.total}</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Enabled</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{pluginStats.enabled}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Disabled</p>
                <p className="text-2xl font-semibold text-gray-600 dark:text-gray-400">{pluginStats.disabled}</p>
              </div>
              <XCircle className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unsigned</p>
                <p className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">{pluginStats.unsigned}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Updates</p>
                <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{pluginStats.updates}</p>
              </div>
              <Download className="h-8 w-8 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Security Warning */}
        {pluginStats.unsigned > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                  Security warning
                </p>
                <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                  You have {pluginStats.unsigned} unsigned plugin{pluginStats.unsigned !== 1 ? 's' : ''} installed. 
                  Unsigned plugins can pose a security risk.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All types</option>
            <option value="datasource">Data sources</option>
            <option value="panel">Panels</option>
            <option value="app">Apps</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All statuses</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
            <option value="unsigned">Unsigned</option>
            <option value="update">Updates available</option>
          </select>
        </div>

        {/* Plugins List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPlugins.map(plugin => (
              <div key={plugin.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {plugin.name}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        plugin.enabled
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {plugin.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      {plugin.hasUpdate && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                          Update available
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {plugin.description}
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Type:</span>
                        <p className="text-gray-900 dark:text-white capitalize">{plugin.type}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Version:</span>
                        <p className="text-gray-900 dark:text-white">
                          {plugin.installedVersion}
                          {plugin.hasUpdate && (
                            <span className="text-blue-600 dark:text-blue-400 ml-1">
                              → {plugin.version}
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Author:</span>
                        <p className="text-gray-900 dark:text-white">{plugin.author}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-3">
                      <div className="flex items-center space-x-1">
                        {getSignatureIcon(plugin.signatureStatus)}
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {getSignatureText(plugin.signatureStatus)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ID: {plugin.id}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {plugin.hasUpdate && (
                      <button className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                        <Download className="h-5 w-5" />
                      </button>
                    )}
                    <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                      <Settings className="h-5 w-5" />
                    </button>
                    {!plugin.enabled && (
                      <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredPlugins.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No plugins found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}