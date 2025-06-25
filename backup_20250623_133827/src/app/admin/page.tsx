/**
 * Adaptive Factory Manufacturing Intelligence Platform
 * Administration Dashboard
 * 
 * Original implementation for system administration and configuration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { dataSourceRegistry } from '@/core/datasources/DataSourceRegistry';
import { panelRegistry } from '@/core/panels/PanelRegistry';
import { DataSourceHealthStatus } from '@/core/datasources/DataSourceRegistry';
import PageLayout from '@/components/layout/PageLayout';
// import SystemHealth from '@/components/admin/SystemHealth';
// import DataSourceManager from '@/components/admin/DataSourceManager';
// import PluginManager from '@/components/admin/PluginManager';
// import ConfigurationManager from '@/components/admin/ConfigurationManager';
// import UserActivityMonitor from '@/components/admin/UserActivityMonitor';
// import SystemLogs from '@/components/admin/SystemLogs';

interface AdminState {
  activeTab: AdminTab;
  systemHealth: SystemHealthData;
  dataSourceHealth: DataSourceHealthStatus[];
  loading: boolean;
  error: string | null;
}

type AdminTab = 
  | 'overview'
  | 'datasources'
  | 'plugins'
  | 'configuration'
  | 'users'
  | 'logs'
  | 'monitoring';

interface SystemHealthData {
  status: 'healthy' | 'warning' | 'error';
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
  };
  storage: {
    used: number;
    total: number;
    percentage: number;
  };
  services: ServiceStatus[];
}

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: number;
  memory: number;
  cpu: number;
}

export default function AdminPage() {
  const [state, setState] = useState<AdminState>({
    activeTab: 'overview',
    systemHealth: {
      status: 'healthy',
      uptime: 0,
      memory: { used: 0, total: 0, percentage: 0 },
      performance: { responseTime: 0, throughput: 0, errorRate: 0 },
      storage: { used: 0, total: 0, percentage: 0 },
      services: []
    },
    dataSourceHealth: [],
    loading: true,
    error: null
  });

  // Load system data on mount
  useEffect(() => {
    loadSystemData();
    
    // Set up periodic health checks
    const interval = setInterval(loadSystemData, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // Load data source health
      const dataSourceHealth = await dataSourceRegistry?.getDataSourceHealth();
      
      // Load system health (simulated - in real app this would come from monitoring APIs)
      const systemHealth = await getSystemHealth();
      
      setState(prev => ({
        ...prev,
        systemHealth,
        dataSourceHealth,
        loading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error?.message : 'Failed to load system data'
      }));
    }
  };

  const getSystemHealth = async (): Promise<SystemHealthData> => {
    // Simulated system health data
    // In a real implementation, this would fetch from monitoring APIs
    return {
      status: 'healthy',
      uptime: Date.now() - (24 * 60 * 60 * 1000), // 24 hours ago
      memory: {
        used: 2.1 * 1024 * 1024 * 1024, // 2.1 GB
        total: 8 * 1024 * 1024 * 1024,  // 8 GB
        percentage: 26.25
      },
      performance: {
        responseTime: 145, // ms
        throughput: 1250,  // requests/min
        errorRate: 0.02    // 2%
      },
      storage: {
        used: 45 * 1024 * 1024 * 1024,  // 45 GB
        total: 500 * 1024 * 1024 * 1024, // 500 GB
        percentage: 9
      },
      services: [
        {
          name: 'Dashboard Engine',
          status: 'running',
          uptime: Date.now() - (20 * 60 * 60 * 1000),
          memory: 512 * 1024 * 1024, // 512 MB
          cpu: 15.5
        },
        {
          name: 'Data Source Registry',
          status: 'running',
          uptime: Date.now() - (24 * 60 * 60 * 1000),
          memory: 256 * 1024 * 1024, // 256 MB
          cpu: 8.2
        },
        {
          name: 'Panel Renderer',
          status: 'running',
          uptime: Date.now() - (18 * 60 * 60 * 1000),
          memory: 128 * 1024 * 1024, // 128 MB
          cpu: 5.1
        },
        {
          name: 'Alert Manager',
          status: 'running',
          uptime: Date.now() - (22 * 60 * 60 * 1000),
          memory: 64 * 1024 * 1024, // 64 MB
          cpu: 2.3
        }
      ]
    };
  };

  const formatUptime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor(diff % (24 * 60 * 60 * 1000) / (60 * 60 * 1000));
    const minutes = Math.floor(diff % (60 * 60 * 1000) / (60 * 1000));
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unitIndex = 0;
    
    while (value >= 1024 && unitIndex < units?.length - 1) {
      value /= 1024;
      unitIndex++;
    }
    
    return `${value?.toFixed(1)} ${units[unitIndex]}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
      case 'running':
        return 'text-green-600 bg-green-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
      case 'stopped':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const renderOverview = () => {
    return (
      <div className="space-y-6">
        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor(state?.systemHealth.status)}`}>
                  <span className="text-lg">🏥</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">System Status</p>
                <p className="text-2xl font-semibold text-gray-900 capitalize">
                  {state?.systemHealth.status}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 text-lg">⏱️</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Uptime</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatUptime(state?.systemHealth.uptime)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 text-lg">🧠</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {state?.systemHealth.memory?.percentage.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">
                  {formatBytes(state?.systemHealth.memory?.used)} / {formatBytes(state?.systemHealth.memory?.total)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 text-lg">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Data Sources</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {state?.dataSourceHealth.filter(ds => ds?.status === 'healthy').length} / {state?.dataSourceHealth.length}
                </p>
                <p className="text-xs text-gray-500">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Services Status */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Services Status</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uptime</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Memory</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPU</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {state?.systemHealth.services?.map((service) => (
                  <tr key={service?.name}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {service?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(service?.status)}`}>
                        {service?.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatUptime(service?.uptime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatBytes(service?.memory)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {service?.cpu.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => setState(prev => ({ ...prev, activeTab: 'datasources' }))}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-lg">🔌</span>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900">Manage Data Sources</h4>
                <p className="text-sm text-gray-600">Configure and monitor data connections</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setState(prev => ({ ...prev, activeTab: 'plugins' }))}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-lg">🧩</span>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900">Plugin Manager</h4>
                <p className="text-sm text-gray-600">Install and manage system plugins</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setState(prev => ({ ...prev, activeTab: 'configuration' }))}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-lg">⚙️</span>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900">System Configuration</h4>
                <p className="text-sm text-gray-600">Manage platform settings</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (state?.activeTab) {
      case 'overview':
        return renderOverview();
      case 'datasources':
        return <div>DataSourceManager component not implemented</div>;
      case 'plugins':
        return <div>PluginManager component not implemented</div>;
      case 'configuration':
        return <div>ConfigurationManager component not implemented</div>;
      case 'users':
        return <div>UserActivityMonitor component not implemented</div>;
      case 'logs':
        return <div>SystemLogs component not implemented</div>;
      case 'monitoring':
        return <div>SystemHealth component not implemented</div>;
      default:
        return renderOverview();
    }
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: '🏠' },
    { id: 'datasources', name: 'Data Sources', icon: '🔌' },
    { id: 'plugins', name: 'Plugins', icon: '🧩' },
    { id: 'configuration', name: 'Configuration', icon: '⚙️' },
    { id: 'users', name: 'Users', icon: '👥' },
    { id: 'logs', name: 'Logs', icon: '📋' },
    { id: 'monitoring', name: 'Monitoring', icon: '📊' }
  ] as const;

  return (
    <PageLayout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
              <p className="text-sm text-gray-600">
                System configuration and monitoring dashboard
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(state?.systemHealth.status)}`}>
                System {state?.systemHealth.status}
              </span>
              
              <button
                onClick={loadSystemData}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-gray-50 border-r border-gray-200">
            <nav className="p-4 space-y-2">
              {tabs?.map((tab) => (
                <button
                  key={tab?.id}
                  onClick={() => setState(prev => ({ ...prev, activeTab: tab.id }))}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left ${
                    state?.activeTab === tab?.id
                      ? 'bg-blue-100 text-blue-900 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-lg">{tab?.icon}</span>
                  <span>{tab?.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              {state?.loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : state.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                  <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Data</h3>
                  <p className="text-red-600 mb-4">{state?.error}</p>
                  <button
                    onClick={loadSystemData}
                    className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                renderTabContent()
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
