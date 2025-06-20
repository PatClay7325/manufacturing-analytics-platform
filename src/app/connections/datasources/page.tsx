'use client';

import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { 
  Database, 
  Search, 
  Plus, 
  Settings, 
  Trash2, 
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';

interface DataSource {
  id: string;
  uid: string;
  name: string;
  type: string;
  typeName: string;
  url: string;
  access: 'proxy' | 'direct';
  isDefault: boolean;
  lastCheck?: Date;
  status: 'online' | 'offline' | 'unknown';
  jsonData?: any;
}

// Mock data
const mockDataSources: DataSource[] = [
  {
    id: '1',
    uid: 'prometheus-uid',
    name: 'Prometheus',
    type: 'prometheus',
    typeName: 'Prometheus',
    url: 'http://localhost:9090',
    access: 'proxy',
    isDefault: true,
    lastCheck: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    status: 'online'
  },
  {
    id: '2',
    uid: 'postgres-uid',
    name: 'PostgreSQL Manufacturing',
    type: 'postgres',
    typeName: 'PostgreSQL',
    url: 'localhost:5432',
    access: 'proxy',
    isDefault: false,
    lastCheck: new Date(Date.now() - 1000 * 60 * 2), // 2 minutes ago
    status: 'online'
  },
  {
    id: '3',
    uid: 'influx-uid',
    name: 'InfluxDB Metrics',
    type: 'influxdb',
    typeName: 'InfluxDB',
    url: 'http://localhost:8086',
    access: 'proxy',
    isDefault: false,
    lastCheck: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    status: 'offline'
  },
  {
    id: '4',
    uid: 'elastic-uid',
    name: 'Elasticsearch Logs',
    type: 'elasticsearch',
    typeName: 'Elasticsearch',
    url: 'http://localhost:9200',
    access: 'proxy',
    isDefault: false,
    status: 'unknown'
  }
];

export default function DataSourcesPage() {
  const [dataSources, setDataSources] = useState(mockDataSources);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique types
  const dataSourceTypes = Array.from(new Set(dataSources.map(ds => ds.type)));

  // Filter data sources
  const filteredDataSources = dataSources.filter(ds => {
    const matchesSearch = 
      ds.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ds.typeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ds.url.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || ds.type === filterType;
    const matchesStatus = filterStatus === 'all' || ds.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this data source?')) {
      setDataSources(dataSources.filter(ds => ds.id !== id));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'offline':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  return (
    <PageLayout
      title="Data sources"
      description="Manage your data source connections"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search data sources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              <Filter className="h-5 w-5 mr-2" />
              Filters
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            
            <Link
              href="/connections/datasources/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add data source
            </Link>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All types</option>
                  {dataSourceTypes.map(type => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All statuses</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Data Sources Table */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDataSources.map((dataSource) => (
                <tr key={dataSource.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Database className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {dataSource.name}
                          {dataSource.isDefault && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                              default
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Access: {dataSource.access}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {dataSource.typeName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {dataSource.url}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(dataSource.status)}
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getStatusText(dataSource.status)}
                      </span>
                    </div>
                    {dataSource.lastCheck && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Last checked: {new Date(dataSource.lastCheck).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        href={`/connections/datasources/edit/${dataSource.uid}`}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        <Settings className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(dataSource.id)}
                        className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        disabled={dataSource.isDefault}
                      >
                        <Trash2 className={`h-5 w-5 ${dataSource.isDefault ? 'opacity-50 cursor-not-allowed' : ''}`} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredDataSources.length === 0 && (
            <div className="text-center py-12">
              <Database className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No data sources found
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding a new data source'}
              </p>
              {!searchQuery && filterType === 'all' && filterStatus === 'all' && (
                <div className="mt-6">
                  <Link
                    href="/connections/datasources/new"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add data source
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}