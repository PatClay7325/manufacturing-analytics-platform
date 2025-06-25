'use client';

import React, { useState, useEffect } from 'react';
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
  Cloud,
  Shield,
  AlertCircle,
  TrendingUp,
  Users,
  GitBranch,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  X,
  Heart,
  MessageSquare,
  Settings
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { PluginWithStats } from '@/services/pluginService';

interface PluginMarketplaceProps {
  userId?: string;
  organizationId?: string;
}

const categories = [
  { id: 'all', name: 'All', icon: Package },
  { id: 'Visualization', name: 'Visualization', icon: BarChart3 },
  { id: 'Database', name: 'Database', icon: Database },
  { id: 'Cloud', name: 'Cloud', icon: Cloud },
  { id: 'Industry', name: 'Industry', icon: Zap },
  { id: 'Testing', name: 'Testing', icon: CheckCircle },
  { id: 'Security', name: 'Security', icon: Shield },
  { id: 'Monitoring', name: 'Monitoring', icon: TrendingUp }
];

const pluginTypes = [
  { id: 'all', name: 'All types' },
  { id: 'panel', name: 'Panel' },
  { id: 'datasource', name: 'Data source' },
  { id: 'app', name: 'App' }
];

const signatures = [
  { id: 'all', name: 'All plugins' },
  { id: 'core', name: 'Core', icon: Shield, color: 'text-blue-600' },
  { id: 'commercial', name: 'Commercial', icon: DollarSign, color: 'text-green-600' },
  { id: 'community', name: 'Community', icon: Users, color: 'text-purple-600' },
  { id: 'unsigned', name: 'Unsigned', icon: AlertCircle, color: 'text-yellow-600' }
];

export default function PluginMarketplace({ userId, organizationId }: PluginMarketplaceProps) {
  const router = useRouter();
  const [plugins, setPlugins] = useState<PluginWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedSignature, setSelectedSignature] = useState('all');
  const [showOnlyInstalled, setShowOnlyInstalled] = useState(false);
  const [sortBy, setSortBy] = useState<'downloads' | 'rating' | 'name' | 'updated'>('downloads');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [installing, setInstalling] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    installed: 0,
    updates: 0
  });

  useEffect(() => {
    fetchPlugins();
  }, [searchQuery, selectedCategory, selectedType, selectedSignature, showOnlyInstalled, sortBy, currentPage]);

  const fetchPlugins = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        query: searchQuery,
        type: selectedType,
        sort: sortBy,
        order: 'desc',
        page: currentPage.toString(),
        limit: '12'
      });

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      if (selectedSignature !== 'all') {
        params.append('signature', selectedSignature);
      }

      if (showOnlyInstalled) {
        params.append('installed', 'true');
      }

      const response = await fetch(`/api/plugins/search?${params}`);
      const data = await response.json();

      setPlugins(data.plugins);
      setTotalPages(Math.ceil(data.total / data.limit));
      
      // Update stats
      setStats({
        total: data.total,
        installed: data.plugins.filter((p: PluginWithStats) => p.installed).length,
        updates: data.plugins.filter((p: PluginWithStats) => p.updateAvailable).length
      });
    } catch (error) {
      console.error('Failed to fetch plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (pluginId: string) => {
    setInstalling(pluginId);
    try {
      const response = await fetch('/api/plugins/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pluginId, 
          userId,
          organizationId 
        }),
      });

      if (response.ok) {
        await fetchPlugins(); // Refresh list
      } else {
        const error = await response.json();
        alert(`Failed to install plugin: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to install plugin:', error);
      alert('Failed to install plugin');
    } finally {
      setInstalling(null);
    }
  };

  const handleUninstall = async (pluginId: string) => {
    if (!confirm('Are you sure you want to uninstall this plugin?')) {
      return;
    }

    try {
      const response = await fetch(`/api/plugins/${pluginId}/uninstall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, organizationId }),
      });

      if (response.ok) {
        await fetchPlugins(); // Refresh list
      } else {
        const error = await response.json();
        alert(`Failed to uninstall plugin: ${error.message}`);
      }
    } catch (error) {
      console.error('Failed to uninstall plugin:', error);
      alert('Failed to uninstall plugin');
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

  const getSignatureIcon = (signature: string) => {
    const sig = signatures.find(s => s.id === signature);
    if (sig && sig.icon) {
      const Icon = sig.icon;
      return <Icon className={`h-5 w-5 ${sig.color || ''}`} />;
    }
    return null;
  };

  const formatDownloads = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total plugins</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Package className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Installed</p>
              <p className="text-2xl font-semibold text-green-600 dark:text-green-400">
                {stats.installed}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Updates available</p>
              <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{stats.updates}</p>
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

              {/* Type, Signature, and Sort */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
                    Signature
                  </label>
                  <select
                    value={selectedSignature}
                    onChange={(e) => setSelectedSignature(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {signatures.map(sig => (
                      <option key={sig.id} value={sig.id}>{sig.name}</option>
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
                    <option value="rating">Highest rated</option>
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
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 animate-pulse">
              <div className="flex items-start space-x-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {plugins.map(plugin => (
              <div
                key={plugin.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-400 overflow-hidden">
                      {plugin.logoUrl ? (
                        <Image
                          src={plugin.logoUrl}
                          alt={plugin.name}
                          width={48}
                          height={48}
                          className="object-cover"
                        />
                      ) : (
                        getTypeIcon(plugin.type)
                      )}
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
                  <div className="flex items-center space-x-2">
                    {getSignatureIcon(plugin.signature)}
                    {plugin.installed && (
                      <CheckCircle className="h-5 w-5 text-green-500" title="Installed" />
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {plugin.description}
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center">
                      <Download className="h-4 w-4 mr-1" />
                      {formatDownloads(plugin.downloads)}
                    </span>
                    <span className="flex items-center">
                      {renderStars(plugin.rating)}
                      <span className="ml-1">({plugin.ratingCount})</span>
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
                      {plugin.updateAvailable ? (
                        <button
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          onClick={() => handleInstall(plugin.pluginId)}
                        >
                          Update
                        </button>
                      ) : (
                        <span className="text-sm text-green-600 dark:text-green-400">
                          Installed
                        </span>
                      )}
                      <button
                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        onClick={() => handleUninstall(plugin.pluginId)}
                      >
                        Uninstall
                      </button>
                      {plugin.enabled ? (
                        <button className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                          Disable
                        </button>
                      ) : (
                        <button className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                          Enable
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50"
                      onClick={() => handleInstall(plugin.pluginId)}
                      disabled={installing === plugin.pluginId}
                    >
                      {installing === plugin.pluginId ? 'Installing...' : 'Install'}
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/plugins/${plugin.pluginId}`)}
                    className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    Details
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {plugins.length === 0 && (
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              
              <div className="flex items-center space-x-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded-md ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                {totalPages > 5 && (
                  <>
                    <span className="px-2">...</span>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className={`px-3 py-1 rounded-md ${
                        currentPage === totalPages
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}