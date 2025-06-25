'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Grid3X3,
  List,
  Filter,
  Plus,
  Check,
  X,
  RefreshCw,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Gauge,
  Table2,
  FileText,
  Clock,
  Users,
  Tag,
  ArrowRight
} from 'lucide-react';
import type { 
  LibraryPanel, 
  LibraryPanelSearchRequest,
  LibraryPanelSearchResponse,
  Panel
} from '@/types/dashboard';
import { libraryPanelService } from '@/services/libraryPanelService';

// Panel type configurations
const panelTypes = [
  { id: 'all', name: 'All types', icon: Grid3X3 },
  { id: 'timeseries', name: 'Time series', icon: LineChart },
  { id: 'barchart', name: 'Bar chart', icon: BarChart3 },
  { id: 'piechart', name: 'Pie chart', icon: PieChart },
  { id: 'gauge', name: 'Gauge', icon: Gauge },
  { id: 'table', name: 'Table', icon: Table2 },
  { id: 'stat', name: 'Stat', icon: Activity },
  { id: 'text', name: 'Text', icon: FileText }
];

interface LibraryPanelPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (libraryPanel: LibraryPanel, newPanel: Panel) => void;
  excludeUids?: string[];
  typeFilter?: string;
  title?: string;
  description?: string;
  nextPanelId: number;
}

export default function LibraryPanelPicker({
  isOpen,
  onClose,
  onSelect,
  excludeUids = [],
  typeFilter,
  title = 'Add Library Panel',
  description = 'Select a library panel to add to your dashboard',
  nextPanelId
}: LibraryPanelPickerProps) {
  const [panels, setPanels] = useState<LibraryPanel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState(typeFilter || 'all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'usage'>('updated');
  
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 12,
    totalCount: 0,
    totalPages: 0,
  });

  // Fetch library panels
  const fetchPanels = useCallback(async () => {
    if (!isOpen) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const request: LibraryPanelSearchRequest = {
        query: searchQuery || undefined,
        page: pagination.page,
        perPage: pagination.perPage,
        sort: sortBy,
        sortDirection: 'desc',
        typeFilter: selectedType === 'all' ? undefined : selectedType,
        excludeUids: excludeUids.length > 0 ? excludeUids : undefined,
      };

      const response = await libraryPanelService.searchLibraryPanels(request);
      
      setPanels(response.result);
      setPagination(prev => ({
        ...prev,
        totalCount: response.totalCount,
        totalPages: Math.ceil(response.totalCount / response.perPage),
      }));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch panels');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, searchQuery, selectedType, sortBy, pagination.page, pagination.perPage, excludeUids]);

  // Load panels when modal opens or search criteria change
  useEffect(() => {
    fetchPanels();
  }, [fetchPanels]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedType(typeFilter || 'all');
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [isOpen, typeFilter]);

  // Handle panel selection
  const handleSelectPanel = (libraryPanel: LibraryPanel) => {
    const newPanel = libraryPanelService.createPanelFromLibrary(libraryPanel, nextPanelId);
    onSelect(libraryPanel, newPanel);
    onClose();
  };

  // Handle search
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle type filter
  const handleTypeFilter = (type: string) => {
    setSelectedType(type);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle sort
  const handleSortChange = (sort: typeof sortBy) => {
    setSortBy(sort);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // Get panel type icon
  const getPanelIcon = (type: string) => {
    const panelType = panelTypes.find(pt => pt.id === type);
    return panelType ? panelType.icon : FileText;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search library panels..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
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
              </button>
              
              <div className="flex border border-gray-300 dark:border-gray-600 rounded-md">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'} hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-md transition-colors`}
                >
                  <Grid3X3 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'} hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-md transition-colors`}
                >
                  <List className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Panel type</h4>
                <div className="flex flex-wrap gap-2">
                  {panelTypes.map(type => {
                    const Icon = type.icon;
                    const isSelected = selectedType === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => handleTypeFilter(type.id)}
                        className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-1.5" />
                        {type.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sort by
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="updated">Recently updated</option>
                  <option value="name">Name</option>
                  <option value="usage">Most used</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12">
              <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
              <button
                onClick={fetchPanels}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Library Panels Grid/List */}
          {!isLoading && !error && (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {panels.map(panel => {
                    const Icon = getPanelIcon(panel.type);
                    const panelType = panelTypes.find(pt => pt.id === panel.type);
                    return (
                      <div
                        key={panel.uid}
                        className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => handleSelectPanel(panel)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg">
                              <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                {panel.name}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {panelType?.name || panel.type}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded-full">
                            <Plus className="h-4 w-4" />
                          </div>
                        </div>
                        
                        {panel.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                            {panel.description}
                          </p>
                        )}
                        
                        {panel.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {panel.tags.slice(0, 3).map(tag => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {panel.tags.length > 3 && (
                              <span className="text-xs text-gray-400">+{panel.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                          <span>Used in {panel.connectedDashboards} dashboards</span>
                          <span>v{panel.version}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {panels.map(panel => {
                    const Icon = getPanelIcon(panel.type);
                    const panelType = panelTypes.find(pt => pt.id === panel.type);
                    return (
                      <div
                        key={panel.uid}
                        className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => handleSelectPanel(panel)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <Icon className="h-5 w-5 text-gray-400" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h3 className="font-medium text-gray-900 dark:text-white truncate">
                                  {panel.name}
                                </h3>
                                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                  <span>{panelType?.name || panel.type}</span>
                                  <span>Used in {panel.connectedDashboards}</span>
                                  <span>v{panel.version}</span>
                                </div>
                              </div>
                              {panel.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                                  {panel.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full">
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty State */}
              {panels.length === 0 && (
                <div className="text-center py-12">
                  <Grid3X3 className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    No library panels found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {searchQuery || selectedType !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'No library panels are available'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {((pagination.page - 1) * pagination.perPage) + 1} to{' '}
              {Math.min(pagination.page * pagination.perPage, pagination.totalCount)} of{' '}
              {pagination.totalCount} results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md ${
                      page === pagination.page
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}