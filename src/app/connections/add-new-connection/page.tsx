'use client';

import React from 'react';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/PageLayout';
import { 
  Search, 
  Database, 
  Cloud, 
  Activity, 
  Globe, 
  Zap,
  Star,
  TrendingUp,
  ArrowLeft,
  ExternalLink,
  Check
} from 'lucide-react';
import Link from 'next/link';

interface DataSourceType {
  id: string;
  name: string;
  description: string;
  category: string;
  logo?: string;
  recommended?: boolean;
  enterprise?: boolean;
  beta?: boolean;
  installed?: boolean;
}

const dataSourceTypes: DataSourceType[] = [
  // Time Series Databases
  {
    id: 'prometheus',
    name: 'Prometheus',
    description: 'Open source monitoring system and time series database',
    category: 'tsdb',
    recommended: true,
    installed: true
  },
  {
    id: 'influxdb',
    name: 'InfluxDB',
    description: 'Open source time series database',
    category: 'tsdb',
    installed: true
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Monitoring tool and time series database',
    category: 'tsdb'
  },
  // SQL Databases
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'Open source relational database',
    category: 'sql',
    recommended: true,
    installed: true
  },
  {
    id: 'mysql',
    name: 'MySQL',
    description: 'Open source relational database',
    category: 'sql',
    installed: true
  },
  {
    id: 'mssql',
    name: 'Microsoft SQL Server',
    description: 'Enterprise relational database',
    category: 'sql',
    enterprise: true
  },
  // Logging
  {
    id: 'elasticsearch',
    name: 'Elasticsearch',
    description: 'Search and analytics engine',
    category: 'logging',
    recommended: true
  },
  {
    id: 'loki',
    name: 'Loki',
    description: 'Horizontally scalable log aggregation system',
    category: 'logging'
  },
  // Cloud
  {
    id: 'cloudwatch',
    name: 'AWS CloudWatch',
    description: 'Amazon Web Services monitoring',
    category: 'cloud'
  },
  {
    id: 'azuremonitor',
    name: 'Azure Monitor',
    description: 'Microsoft Azure monitoring',
    category: 'cloud'
  },
  {
    id: 'googlecloud',
    name: 'Google Cloud Monitoring',
    description: 'Google Cloud Platform monitoring',
    category: 'cloud'
  },
  // Other
  {
    id: 'jaeger',
    name: 'Jaeger',
    description: 'Distributed tracing platform',
    category: 'tracing'
  },
  {
    id: 'zipkin',
    name: 'Zipkin',
    description: 'Distributed tracing system',
    category: 'tracing'
  },
  {
    id: 'testdata',
    name: 'TestData',
    description: 'Generate test data for development',
    category: 'other',
    installed: true
  }
];

const categories = [
  { id: 'all', name: 'All', icon: Database },
  { id: 'tsdb', name: 'Time series', icon: Activity },
  { id: 'sql', name: 'SQL', icon: Database },
  { id: 'logging', name: 'Logging', icon: Globe },
  { id: 'cloud', name: 'Cloud', icon: Cloud },
  { id: 'tracing', name: 'Tracing', icon: TrendingUp },
  { id: 'enterprise', name: 'Enterprise', icon: Zap },
  { id: 'other', name: 'Other', icon: Star }
];

export default function AddNewConnectionPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showOnlyInstalled, setShowOnlyInstalled] = useState(false);

  // Filter data sources
  const filteredDataSources = dataSourceTypes.filter(ds => {
    const matchesSearch = 
      ds.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ds.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'all' || 
      ds.category === selectedCategory ||
      (selectedCategory === 'enterprise' && ds.enterprise);
    
    const matchesInstalled = !showOnlyInstalled || ds.installed;
    
    return matchesSearch && matchesCategory && matchesInstalled;
  });

  // Group by category
  const groupedDataSources = filteredDataSources.reduce((acc, ds) => {
    const category = ds.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(ds);
    return acc;
  }, {} as Record<string, DataSourceType[]>);

  return (
    <PageLayout
      title="Add new connection"
      description="Choose a data source type to add"
    >
      <div className="space-y-6">
        {/* Back Button */}
        <Link
          href="/connections"
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to connections
        </Link>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search data sources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Category Buttons */}
            <div className="flex flex-wrap gap-2">
              {categories.map(category => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-1.5" />
                    {category.name}
                  </button>
                );
              })}
            </div>

            {/* Installed Filter */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showOnlyInstalled}
                onChange={(e) => setShowOnlyInstalled(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Show only installed plugins
              </span>
            </label>
          </div>
        </div>

        {/* Data Sources List */}
        {Object.keys(groupedDataSources).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedDataSources).map(([category, dataSources]) => (
              <div key={category} className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white capitalize">
                  {categories.find(c => c.id === category)?.name || category}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dataSources.map(ds => (
                    <div
                      key={ds.id}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => router.push(`/connections/datasources/new?type=${ds.id}`)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <Database className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {ds.name}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              {ds.installed && (
                                <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                                  <Check className="h-3 w-3 mr-1" />
                                  Installed
                                </span>
                              )}
                              {ds.recommended && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                                  Recommended
                                </span>
                              )}
                              {ds.enterprise && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                                  Enterprise
                                </span>
                              )}
                              {ds.beta && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                                  Beta
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {ds.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <button
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Open documentation
                          }}
                        >
                          Learn more
                          <ExternalLink className="inline h-3 w-3 ml-1" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Database className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No data sources found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  );
}