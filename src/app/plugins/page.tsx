'use client';

import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { 
  Package, 
  Search, 
  Filter, 
  ChevronDown,
  Download,
  Star,
  Clock,
  CheckCircle,
  Info,
  ExternalLink,
  Zap,
  Database,
  BarChart3,
  Cloud
} from 'lucide-react';
import Link from 'next/link';

interface Plugin {
  id: string;
  name: string;
  description: string;
  type: 'panel' | 'datasource' | 'app';
  version: string;
  author: string;
  downloads: number;
  rating: number;
  installed: boolean;
  enabled: boolean;
  signed: boolean;
  category: string;
  updatedAt: Date;
  logo?: string;
}

const mockPlugins: Plugin[] = [
  // Panel plugins
  {
    id: 'piechart-panel',
    name: 'Pie Chart',
    description: 'Pie chart panel for data visualization',
    type: 'panel',
    version: '2.1.0',
    author: 'Grafana Labs',
    downloads: 150000,
    rating: 4.5,
    installed: true,
    enabled: true,
    signed: true,
    category: 'Visualization',
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 'worldmap-panel',
    name: 'Worldmap Panel',
    description: 'Display time series data on a world map',
    type: 'panel',
    version: '1.0.2',
    author: 'Grafana Labs',
    downloads: 85000,
    rating: 4.3,
    installed: false,
    enabled: false,
    signed: true,
    category: 'Visualization',
    updatedAt: new Date('2024-01-10')
  },
  // Data source plugins
  {
    id: 'mongodb-datasource',
    name: 'MongoDB',
    description: 'MongoDB data source for Grafana',
    type: 'datasource',
    version: '1.2.0',
    author: 'Community',
    downloads: 45000,
    rating: 4.0,
    installed: false,
    enabled: false,
    signed: false,
    category: 'Database',
    updatedAt: new Date('2024-01-08')
  },
  {
    id: 'redis-datasource',
    name: 'Redis',
    description: 'Redis data source plugin',
    type: 'datasource',
    version: '2.0.1',
    author: 'Redis Labs',
    downloads: 32000,
    rating: 4.6,
    installed: true,
    enabled: false,
    signed: true,
    category: 'Database',
    updatedAt: new Date('2024-01-20')
  },
  // App plugins
  {
    id: 'k6-cloud-app',
    name: 'k6 Cloud',
    description: 'k6 Cloud integration for performance testing',
    type: 'app',
    version: '1.0.0',
    author: 'k6',
    downloads: 12000,
    rating: 4.8,
    installed: false,
    enabled: false,
    signed: true,
    category: 'Testing',
    updatedAt: new Date('2024-01-12')
  },
  {
    id: 'manufacturing-suite',
    name: 'Manufacturing Analytics Suite',
    description: 'Complete manufacturing analytics solution with OEE, MTBF, and quality metrics',
    type: 'app',
    version: '3.0.0',
    author: 'Manufacturing Analytics Inc',
    downloads: 8500,
    rating: 4.9,
    installed: true,
    enabled: true,
    signed: true,
    category: 'Industry',
    updatedAt: new Date('2024-01-18')
  }
];

const categories = [
  { id: 'all', name: 'All', icon: Package },
  { id: 'Visualization', name: 'Visualization', icon: BarChart3 },
  { id: 'Database', name: 'Database', icon: Database },
  { id: 'Cloud', name: 'Cloud', icon: Cloud },
  { id: 'Industry', name: 'Industry', icon: Zap },
  { id: 'Testing', name: 'Testing', icon: CheckCircle }
];

const pluginTypes = [
  { id: 'all', name: 'All types' },
  { id: 'panel', name: 'Panel' },
  { id: 'datasource', name: 'Data source' },
  { id: 'app', name: 'App' }
];

export default function PluginsPage() {
  const [plugins] = useState(mockPlugins);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [showOnlyInstalled, setShowOnlyInstalled] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'downloads' | 'updated'>('downloads');
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort plugins
  const filteredPlugins = plugins
    .filter(plugin => {
      const matchesSearch = 
        plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.author.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || plugin.category === selectedCategory;
      const matchesType = selectedType === 'all' || plugin.type === selectedType;
      const matchesInstalled = !showOnlyInstalled || plugin.installed;
      
      return matchesSearch && matchesCategory && matchesType && matchesInstalled;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'downloads':
          return b.downloads - a.downloads;
        case 'updated':
          return b.updatedAt.getTime() - a.updatedAt.getTime();
        default:
          return 0;
      }
    });

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

  const formatDownloads = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  return (
    <PageLayout
      title="Plugins"
      description="Extend Grafana with plugins for data sources, panels, and apps"
    >
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total plugins</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{plugins.length}</p>
              </div>
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Installed</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {plugins.filter(p => p.installed).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Updates available</p>
                <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">2</p>
              </div>
              <Download className="h-8 w-8 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="space-y-4">
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
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-md transition-colors"
              >
                <Filter className="h-5 w-5 mr-2" />
                Filters
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {/* Categories */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</h4>
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
                </div>

                {/* Type and Sort */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Type
                    </label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {pluginTypes.map(type => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Sort by
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="downloads">Most popular</option>
                      <option value="updated">Recently updated</option>
                      <option value="name">Name</option>
                    </select>
                  </div>
                  
                  <div className="flex items-end">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={showOnlyInstalled}
                        onChange={(e) => setShowOnlyInstalled(e.target.checked)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Show only installed
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Plugins Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPlugins.map(plugin => (
            <div
              key={plugin.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-400">
                    {getTypeIcon(plugin.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {plugin.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      by {plugin.author}
                    </p>
                  </div>
                </div>
                {plugin.signed && (
                  <CheckCircle className="h-5 w-5 text-green-500" title="Signed plugin" />
                )}
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {plugin.description}
              </p>
              
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center">
                    <Download className="h-4 w-4 mr-1" />
                    {formatDownloads(plugin.downloads)}
                  </span>
                  <span className="flex items-center">
                    <Star className="h-4 w-4 mr-1" />
                    {plugin.rating}
                  </span>
                </div>
                <span className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  v{plugin.version}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                {plugin.installed ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-green-600 dark:text-green-400">
                      Installed
                    </span>
                    {!plugin.enabled && (
                      <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                        Enable
                      </button>
                    )}
                  </div>
                ) : (
                  <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                    Install
                  </button>
                )}
                <Link
                  href={`/plugins/${plugin.id}`}
                  className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  Details
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
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
    </PageLayout>
  );
}