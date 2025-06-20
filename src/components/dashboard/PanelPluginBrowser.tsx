'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, Grid, List, Filter, Package, Star, Download, 
  TrendingUp, BarChart3, PieChart, Gauge, Table, Type,
  Zap, Cog, Eye, Plus, Check
} from 'lucide-react';
import { panelRegistry, PanelPlugin, PanelCategory } from '@/core/panels/PanelRegistry';
import { PanelType } from '@/types/panel';

interface PanelPluginBrowserProps {
  onSelectPlugin?: (plugin: PanelPlugin) => void;
  onInstallPlugin?: (pluginId: string) => void;
  selectedPlugin?: string;
  availablePlugins?: PanelPlugin[];
  installedPlugins?: string[];
  className?: string;
}

const CATEGORY_ICONS: Record<PanelCategory, React.ComponentType<any>> = {
  visualization: TrendingUp,
  graph: BarChart3,
  chart: PieChart,
  table: Table,
  text: Type,
  manufacturing: Cog,
  quality: Star,
  maintenance: Zap,
  energy: Gauge,
  advanced: Package
};

const CATEGORY_COLORS: Record<PanelCategory, string> = {
  visualization: 'text-blue-600 bg-blue-50',
  graph: 'text-green-600 bg-green-50',
  chart: 'text-purple-600 bg-purple-50',
  table: 'text-gray-600 bg-gray-50',
  text: 'text-indigo-600 bg-indigo-50',
  manufacturing: 'text-orange-600 bg-orange-50',
  quality: 'text-yellow-600 bg-yellow-50',
  maintenance: 'text-red-600 bg-red-50',
  energy: 'text-emerald-600 bg-emerald-50',
  advanced: 'text-pink-600 bg-pink-50'
};

export function PanelPluginBrowser({
  onSelectPlugin,
  onInstallPlugin,
  selectedPlugin,
  availablePlugins = panelRegistry.getAllPlugins(),
  installedPlugins = [],
  className = ''
}: PanelPluginBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PanelCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showInstalled, setShowInstalled] = useState(false);

  const categories = useMemo(() => {
    const cats = panelRegistry.getCategories();
    return ['all', ...cats] as const;
  }, []);

  const filteredPlugins = useMemo(() => {
    let plugins = availablePlugins;

    // Filter by search query
    if (searchQuery) {
      plugins = panelRegistry.searchPlugins(searchQuery);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      plugins = plugins.filter(plugin => plugin.category === selectedCategory);
    }

    // Filter by installation status
    if (showInstalled) {
      plugins = plugins.filter(plugin => installedPlugins.includes(plugin.id));
    }

    return plugins;
  }, [availablePlugins, searchQuery, selectedCategory, showInstalled, installedPlugins]);

  const pluginsByCategory = useMemo(() => {
    const grouped: Record<PanelCategory, PanelPlugin[]> = {} as any;
    
    filteredPlugins.forEach(plugin => {
      if (!grouped[plugin.category]) {
        grouped[plugin.category] = [];
      }
      grouped[plugin.category].push(plugin);
    });

    return grouped;
  }, [filteredPlugins]);

  const isPluginInstalled = (pluginId: string) => {
    return installedPlugins.includes(pluginId) || panelRegistry.hasPlugin(pluginId as PanelType);
  };

  const handlePluginSelect = (plugin: PanelPlugin) => {
    onSelectPlugin?.(plugin);
  };

  const handlePluginInstall = (pluginId: string) => {
    onInstallPlugin?.(pluginId);
  };

  const getCategoryIcon = (category: PanelCategory) => {
    const Icon = CATEGORY_ICONS[category] || Package;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Panel Library</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search panels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as PanelCategory | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.slice(1).map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showInstalled}
              onChange={(e) => setShowInstalled(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Installed only</span>
          </label>
        </div>
      </div>

      {/* Plugin Content */}
      <div className="p-4">
        {viewMode === 'grid' ? (
          /* Grid View */
          selectedCategory === 'all' ? (
            /* Grouped by Category */
            <div className="space-y-6">
              {Object.entries(pluginsByCategory).map(([category, plugins]) => (
                <div key={category}>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className={`p-2 rounded-lg ${CATEGORY_COLORS[category as PanelCategory]}`}>
                      {getCategoryIcon(category as PanelCategory)}
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 capitalize">
                      {category} ({plugins.length})
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {plugins.map(plugin => (
                      <PluginCard
                        key={plugin.id}
                        plugin={plugin}
                        isSelected={selectedPlugin === plugin.id}
                        isInstalled={isPluginInstalled(plugin.id)}
                        onSelect={handlePluginSelect}
                        onInstall={handlePluginInstall}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Single Category */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPlugins.map(plugin => (
                <PluginCard
                  key={plugin.id}
                  plugin={plugin}
                  isSelected={selectedPlugin === plugin.id}
                  isInstalled={isPluginInstalled(plugin.id)}
                  onSelect={handlePluginSelect}
                  onInstall={handlePluginInstall}
                />
              ))}
            </div>
          )
        ) : (
          /* List View */
          <div className="space-y-2">
            {filteredPlugins.map(plugin => (
              <PluginListItem
                key={plugin.id}
                plugin={plugin}
                isSelected={selectedPlugin === plugin.id}
                isInstalled={isPluginInstalled(plugin.id)}
                onSelect={handlePluginSelect}
                onInstall={handlePluginInstall}
              />
            ))}
          </div>
        )}

        {filteredPlugins.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No panels found</h3>
            <p className="text-gray-500">
              {searchQuery 
                ? `No panels match "${searchQuery}"`
                : selectedCategory !== 'all'
                ? `No panels in ${selectedCategory} category`
                : 'No panels available'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface PluginCardProps {
  plugin: PanelPlugin;
  isSelected: boolean;
  isInstalled: boolean;
  onSelect: (plugin: PanelPlugin) => void;
  onInstall: (pluginId: string) => void;
}

function PluginCard({ plugin, isSelected, isInstalled, onSelect, onInstall }: PluginCardProps) {
  const categoryColor = CATEGORY_COLORS[plugin.category];
  const CategoryIcon = CATEGORY_ICONS[plugin.category] || Package;

  return (
    <div
      className={`
        relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
      `}
      onClick={() => onSelect(plugin)}
    >
      {/* Category Badge */}
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${categoryColor} mb-2`}>
        <CategoryIcon className="h-3 w-3 mr-1" />
        {plugin.category}
      </div>

      {/* Plugin Info */}
      <h4 className="font-medium text-gray-900 mb-1">{plugin.name}</h4>
      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{plugin.description}</p>

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>v{plugin.meta.info.version}</span>
        <span>{plugin.meta.info.author}</span>
      </div>

      {/* Install/Selected Status */}
      <div className="absolute top-2 right-2">
        {isInstalled ? (
          <div className="flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full">
            <Check className="h-3 w-3" />
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onInstall(plugin.id);
            }}
            className="flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 rounded-full transition-colors"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

interface PluginListItemProps {
  plugin: PanelPlugin;
  isSelected: boolean;
  isInstalled: boolean;
  onSelect: (plugin: PanelPlugin) => void;
  onInstall: (pluginId: string) => void;
}

function PluginListItem({ plugin, isSelected, isInstalled, onSelect, onInstall }: PluginListItemProps) {
  const categoryColor = CATEGORY_COLORS[plugin.category];
  const CategoryIcon = CATEGORY_ICONS[plugin.category] || Package;

  return (
    <div
      className={`
        flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200
        ${isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }
      `}
      onClick={() => onSelect(plugin)}
    >
      {/* Category Icon */}
      <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${categoryColor} mr-3`}>
        <CategoryIcon className="h-5 w-5" />
      </div>

      {/* Plugin Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 truncate">{plugin.name}</h4>
          <div className="flex items-center space-x-2 ml-2">
            <span className="text-xs text-gray-500">v{plugin.meta.info.version}</span>
            {isInstalled ? (
              <div className="flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full">
                <Check className="h-3 w-3" />
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onInstall(plugin.id);
                }}
                className="flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 rounded-full transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-600 truncate">{plugin.description}</p>
        <div className="flex items-center space-x-2 mt-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor}`}>
            {plugin.category}
          </span>
          <span className="text-xs text-gray-500">{plugin.meta.info.author}</span>
        </div>
      </div>
    </div>
  );
}