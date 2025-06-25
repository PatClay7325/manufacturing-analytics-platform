'use client';

import React from 'react';

import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { 
  Database, 
  Cloud, 
  Activity, 
  Globe, 
  Server, 
  HardDrive,
  Zap,
  Search,
  Plus,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface ConnectionCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  connections: Connection[];
}

interface Connection {
  id: string;
  name: string;
  type: string;
  description: string;
  installed?: boolean;
  configured?: boolean;
  logo?: string;
}

const connectionCategories: ConnectionCategory[] = [
  {
    id: 'data-sources',
    name: 'Data sources',
    icon: Database,
    description: 'Connect to databases, APIs, and other data sources',
    connections: [
      {
        id: 'prometheus',
        name: 'Prometheus',
        type: 'tsdb',
        description: 'Open source time series database & alerting',
        installed: true,
        configured: true
      },
      {
        id: 'postgres',
        name: 'PostgreSQL',
        type: 'sql',
        description: 'Open source relational database',
        installed: true,
        configured: true
      },
      {
        id: 'influxdb',
        name: 'InfluxDB',
        type: 'tsdb',
        description: 'Open source time series database',
        installed: true,
        configured: false
      },
      {
        id: 'elasticsearch',
        name: 'Elasticsearch',
        type: 'logging',
        description: 'Open source search and analytics engine',
        installed: false
      }
    ]
  },
  {
    id: 'cloud-integrations',
    name: 'Cloud integrations',
    icon: Cloud,
    description: 'Connect to cloud platforms and services',
    connections: [
      {
        id: 'aws-cloudwatch',
        name: 'AWS CloudWatch',
        type: 'cloud',
        description: 'Amazon Web Services monitoring service',
        installed: false
      },
      {
        id: 'azure-monitor',
        name: 'Azure Monitor',
        type: 'cloud',
        description: 'Microsoft Azure monitoring service',
        installed: false
      },
      {
        id: 'google-cloud',
        name: 'Google Cloud Monitoring',
        type: 'cloud',
        description: 'Google Cloud Platform monitoring',
        installed: false
      }
    ]
  },
  {
    id: 'enterprise-plugins',
    name: 'Enterprise plugins',
    icon: Zap,
    description: 'Premium plugins for enterprise features',
    connections: [
      {
        id: 'oracle',
        name: 'Oracle Database',
        type: 'sql',
        description: 'Enterprise relational database',
        installed: false
      },
      {
        id: 'splunk',
        name: 'Splunk',
        type: 'logging',
        description: 'Enterprise data platform',
        installed: false
      },
      {
        id: 'datadog',
        name: 'Datadog',
        type: 'monitoring',
        description: 'Monitoring and analyticsPlatform',
        installed: false
      }
    ]
  }
];

export default function ConnectionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter connections based on search and category
  const filteredCategories = connectionCategories
    .map(category => ({
      ...category,
      connections: category.connections.filter(conn =>
        conn.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conn.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }))
    .filter(category => 
      !selectedCategory || category.id === selectedCategory
    )
    .filter(category => category.connections.length > 0);

  const totalConnections = connectionCategories.reduce(
    (total, cat) => total + cat.connections.length, 0
  );
  const configuredConnections = connectionCategories.reduce(
    (total, cat) => total + cat.connections.filter(c => c.configured).length, 0
  );

  return (
    <PageLayout
      title="Connections"
      description="Manage your data sources, cloud integrations, and plugins"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total connections</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{totalConnections}</p>
              </div>
              <Database className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Configured</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{configuredConnections}</p>
              </div>
              <Activity className="h-8 w-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Categories</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{connectionCategories.length}</p>
              </div>
              <Server className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search connections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <Link
            href="/connections/add-new-connection"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add new connection
          </Link>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              !selectedCategory
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All
          </button>
          {connectionCategories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                selectedCategory === category.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Connections List */}
        <div className="space-y-6">
          {filteredCategories.map(category => {
            const Icon = category.icon;
            return (
              <div key={category.id} className="bg-white dark:bg-gray-800 shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                      {category.name}
                    </h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({category.connections.length})
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {category.description}
                  </p>
                </div>
                
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {category.connections.map(connection => (
                    <div 
                      key={connection.id}
                      className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                              {connection.name}
                            </h3>
                            {connection.installed && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                Installed
                              </span>
                            )}
                            {connection.configured && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                                Configured
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {connection.description}
                          </p>
                          <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>Type: {connection.type}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {connection.configured ? (
                            <Link
                              href={`/connections/datasources/edit/${connection.id}`}
                              className="inline-flex items-center px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
                            >
                              Configure
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Link>
                          ) : connection.installed ? (
                            <Link
                              href={`/connections/datasources/add/${connection.id}`}
                              className="inline-flex items-center px-3 py-1.5 text-sm text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                            >
                              Add
                              <Plus className="h-4 w-4 ml-1" />
                            </Link>
                          ) : (
                            <button className="inline-flex items-center px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors">
                              Install
                              <ExternalLink className="h-4 w-4 ml-1" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <HardDrive className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No connections found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}