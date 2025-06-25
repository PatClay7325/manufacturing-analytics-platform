'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Grid3X3,
  List,
  Filter,
  ChevronDown,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  Gauge,
  Table2,
  FileText,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  Eye,
  Clock,
  Users,
  Tag,
  Folder,
  History,
  Share2,
  Download,
  Upload,
  RefreshCw,
  X,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import Link from 'next/link';
import type { 
  LibraryPanel, 
  LibraryPanelSearchRequest,
  LibraryPanelSearchResponse,
  LibraryPanelManagerState,
  CreateLibraryPanelRequest,
  UpdateLibraryPanelRequest,
  LibraryPanelWithConnections
} from '@/types/dashboard';

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

// Notification component
interface NotificationProps {
  type: 'success' | 'error' | 'info';
  message: string;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ type, message, onClose }) => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  };
  
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };
  
  const Icon = icons[type];
  
  return (
    <div className={`fixed top-4 right-4 p-4 rounded-lg border z-50 ${colors[type]} shadow-lg`}>
      <div className="flex items-center">
        <Icon className="h-5 w-5 mr-2" />
        <span className="mr-4">{message}</span>
        <button onClick={onClose} className="hover:opacity-70">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Create/Edit Panel Modal
interface PanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreateLibraryPanelRequest | UpdateLibraryPanelRequest) => Promise<void>;
  panel?: LibraryPanel;
  mode: 'create' | 'edit';
}

const PanelModal: React.FC<PanelModalProps> = ({ isOpen, onClose, onSave, panel, mode }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'timeseries',
    description: '',
    tags: [] as string[],
    category: '',
    folderId: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (panel && mode === 'edit') {
      setFormData({
        name: panel.name,
        type: panel.type,
        description: panel.description || '',
        tags: panel.tags,
        category: panel.category || '',
        folderId: panel.folderId || '',
      });
    } else {
      setFormData({
        name: '',
        type: 'timeseries',
        description: '',
        tags: [],
        category: '',
        folderId: '',
      });
    }
  }, [panel, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const data = {
        ...formData,
        // For create mode, add a basic model structure
        ...(mode === 'create' && {
          model: {
            id: Math.floor(Math.random() * 1000000),
            title: formData.name,
            type: formData.type,
            gridPos: { x: 0, y: 0, w: 12, h: 8 },
            targets: [],
            fieldConfig: { defaults: {}, overrides: [] },
            options: {},
            transformations: [],
            transparent: false,
            datasource: null,
            links: [],
          }
        })
      };
      
      await onSave(data);
      onClose();
    } catch (error) {
      console.error('Failed to save panel:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {mode === 'create' ? 'Create Library Panel' : 'Edit Library Panel'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              {panelTypes.slice(1).map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Manufacturing, Quality, Performance"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Add tag and press Enter"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {formData.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : (mode === 'create' ? 'Create' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main LibraryPanelManager Component
export default function LibraryPanelManager() {
  const [state, setState] = useState<LibraryPanelManagerState>({
    panels: [],
    isLoading: true,
    error: undefined,
    searchQuery: '',
    filters: {
      type: undefined,
      folder: undefined,
      tags: [],
      category: undefined,
      showOnlyMine: false,
    },
    pagination: {
      page: 1,
      perPage: 25,
      totalCount: 0,
      totalPages: 0,
    },
    viewMode: 'grid',
    sortBy: 'updated',
    sortDirection: 'desc',
  });

  const [showFilters, setShowFilters] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    panel?: LibraryPanel;
  }>({
    isOpen: false,
    mode: 'create',
  });
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Fetch library panels
  const fetchPanels = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      const params = new URLSearchParams({
        page: state.pagination.page.toString(),
        perPage: state.pagination.perPage.toString(),
        sort: state.sortBy,
        sortDirection: state.sortDirection,
      });

      if (state.searchQuery) params.append('query', state.searchQuery);
      if (state.filters.type) params.append('typeFilter', state.filters.type);
      if (state.filters.folder) params.append('folderFilter', state.filters.folder);
      if (state.filters.tags.length > 0) params.append('tagFilter', state.filters.tags.join(','));

      const response = await fetch(`/api/library-panels?${params}`);
      if (!response.ok) throw new Error('Failed to fetch panels');

      const data: LibraryPanelSearchResponse = await response.json();
      
      setState(prev => ({
        ...prev,
        panels: data.result,
        pagination: {
          ...prev.pagination,
          totalCount: data.totalCount,
          totalPages: Math.ceil(data.totalCount / data.perPage),
        },
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch panels',
      }));
    }
  }, [state.searchQuery, state.filters, state.pagination.page, state.sortBy, state.sortDirection]);

  // Load panels on mount and when dependencies change
  useEffect(() => {
    fetchPanels();
  }, [state.searchQuery, state.filters, state.pagination.page, state.sortBy, state.sortDirection]);

  // Create panel
  const handleCreatePanel = async (data: CreateLibraryPanelRequest) => {
    try {
      const response = await fetch('/api/library-panels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create panel');

      setNotification({ type: 'success', message: 'Library panel created successfully' });
      fetchPanels();
    } catch (error) {
      setNotification({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to create panel' 
      });
      throw error;
    }
  };

  // Update panel
  const handleUpdatePanel = async (data: UpdateLibraryPanelRequest) => {
    if (!modalState.panel) return;

    try {
      const response = await fetch(`/api/library-panels/${modalState.panel.uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to update panel');

      setNotification({ type: 'success', message: 'Library panel updated successfully' });
      fetchPanels();
    } catch (error) {
      setNotification({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to update panel' 
      });
      throw error;
    }
  };

  // Delete panel
  const handleDeletePanel = async (panel: LibraryPanel) => {
    if (!confirm(`Are you sure you want to delete "${panel.name}"?`)) return;

    try {
      const response = await fetch(`/api/library-panels/${panel.uid}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete panel');
      }

      setNotification({ type: 'success', message: 'Library panel deleted successfully' });
      fetchPanels();
    } catch (error) {
      setNotification({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to delete panel' 
      });
    }
  };

  // Copy panel (duplicate)
  const handleCopyPanel = async (panel: LibraryPanel) => {
    try {
      const data: CreateLibraryPanelRequest = {
        name: `${panel.name} (Copy)`,
        type: panel.type,
        description: panel.description,
        model: panel.model,
        tags: panel.tags,
        category: panel.category,
        folderId: panel.folderId,
      };

      await handleCreatePanel(data);
      setNotification({ type: 'success', message: 'Library panel copied successfully' });
    } catch (error) {
      setNotification({ 
        type: 'error', 
        message: 'Failed to copy panel' 
      });
    }
  };

  // Filter handlers
  const handleSearchChange = (query: string) => {
    setState(prev => ({
      ...prev,
      searchQuery: query,
      pagination: { ...prev.pagination, page: 1 },
    }));
  };

  const handleFilterChange = (filterKey: keyof typeof state.filters, value: any) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, [filterKey]: value },
      pagination: { ...prev.pagination, page: 1 },
    }));
  };

  const handleSortChange = (sortBy: typeof state.sortBy) => {
    setState(prev => ({
      ...prev,
      sortBy,
      sortDirection: prev.sortBy === sortBy && prev.sortDirection === 'desc' ? 'asc' : 'desc',
      pagination: { ...prev.pagination, page: 1 },
    }));
  };

  const handlePageChange = (page: number) => {
    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page },
    }));
  };

  // Get panel type icon
  const getPanelIcon = (type: string) => {
    const panelType = panelTypes.find(pt => pt.id === type);
    return panelType ? panelType.icon : FileText;
  };

  if (state.isLoading && state.panels.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <Notification
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search library panels..."
            value={state.searchQuery}
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
            <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          
          <div className="flex border border-gray-300 dark:border-gray-600 rounded-md">
            <button
              onClick={() => setState(prev => ({ ...prev, viewMode: 'grid' }))}
              className={`p-2 ${state.viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'} hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-md transition-colors`}
            >
              <Grid3X3 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={() => setState(prev => ({ ...prev, viewMode: 'list' }))}
              className={`p-2 ${state.viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white dark:bg-gray-800'} hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-md transition-colors`}
            >
              <List className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
          
          <button
            onClick={() => setModalState({ isOpen: true, mode: 'create' })}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create library panel
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Panel type</h4>
              <div className="flex flex-wrap gap-2">
                {panelTypes.map(type => {
                  const Icon = type.icon;
                  const isSelected = state.filters.type === type.id || (type.id === 'all' && !state.filters.type);
                  return (
                    <button
                      key={type.id}
                      onClick={() => handleFilterChange('type', type.id === 'all' ? undefined : type.id)}
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
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sort by
                </label>
                <select
                  value={state.sortBy}
                  onChange={(e) => handleSortChange(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="updated">Recently updated</option>
                  <option value="created">Recently created</option>
                  <option value="name">Name</option>
                  <option value="usage">Most used</option>
                  <option value="type">Type</option>
                </select>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={state.filters.category || ''}
                  onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                  placeholder="Filter by category"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{state.error}</p>
              <button
                onClick={fetchPanels}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Library Panels Grid/List */}
      {state.viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.panels.map(panel => {
            const Icon = getPanelIcon(panel.type);
            return (
              <div
                key={panel.uid}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                      <Icon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {panel.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {panelTypes.find(pt => pt.id === panel.type)?.name || panel.type}
                      </p>
                    </div>
                  </div>
                </div>
                
                {panel.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {panel.description}
                  </p>
                )}
                
                {panel.category && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Category: {panel.category}
                  </div>
                )}
                
                <div className="flex flex-wrap gap-1 mb-4">
                  {panel.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="flex items-center justify-between text-sm mb-4">
                  <span className="text-gray-500 dark:text-gray-400">
                    Used in {panel.connectedDashboards} dashboards
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    v{panel.version}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span>Updated {new Date(panel.updatedAt).toLocaleDateString()}</span>
                  <span>by {panel.meta.updatedBy?.name || panel.meta.createdBy.name}</span>
                </div>
                
                <div className="flex items-center justify-end space-x-1">
                  <button 
                    onClick={() => setModalState({ isOpen: true, mode: 'edit', panel })}
                    className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    title="Edit panel"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleCopyPanel(panel)}
                    className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    title="Copy panel"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <Link
                    href={`/dashboards/library-panels/${panel.uid}`}
                    className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    title="View details"
                  >
                    <Eye className="h-4 w-4" />
                  </Link>
                  <button 
                    onClick={() => handleDeletePanel(panel)}
                    className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Delete panel"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSortChange('name')}
                >
                  Name
                  {state.sortBy === 'name' && (
                    <span className="ml-1">{state.sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSortChange('type')}
                >
                  Type
                  {state.sortBy === 'type' && (
                    <span className="ml-1">{state.sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSortChange('usage')}
                >
                  Used in
                  {state.sortBy === 'usage' && (
                    <span className="ml-1">{state.sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSortChange('updated')}
                >
                  Updated
                  {state.sortBy === 'updated' && (
                    <span className="ml-1">{state.sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {state.panels.map((panel) => {
                const Icon = getPanelIcon(panel.type);
                return (
                  <tr key={panel.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Icon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {panel.name}
                          </div>
                          {panel.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {panel.description}
                            </div>
                          )}
                          {panel.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {panel.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {panel.tags.length > 3 && (
                                <span className="text-xs text-gray-400">+{panel.tags.length - 3}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {panelTypes.find(pt => pt.id === panel.type)?.name || panel.type}
                      </div>
                      {panel.category && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {panel.category}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {panel.connectedDashboards} dashboards
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        v{panel.version}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div>{new Date(panel.updatedAt).toLocaleDateString()}</div>
                      <div className="text-xs">by {panel.meta.updatedBy?.name || panel.meta.createdBy.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => setModalState({ isOpen: true, mode: 'edit', panel })}
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                          title="Edit panel"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleCopyPanel(panel)}
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                          title="Copy panel"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <Link
                          href={`/dashboards/library-panels/${panel.uid}`}
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button 
                          onClick={() => handleDeletePanel(panel)}
                          className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete panel"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {state.panels.length === 0 && !state.isLoading && (
        <div className="text-center py-12">
          <Grid3X3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No library panels found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {state.searchQuery || state.filters.type || state.filters.category
              ? 'Try adjusting your search or filters'
              : 'Get started by creating a new library panel'}
          </p>
          {!state.searchQuery && !state.filters.type && !state.filters.category && (
            <div className="mt-6">
              <button
                onClick={() => setModalState({ isOpen: true, mode: 'create' })}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create library panel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {state.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {((state.pagination.page - 1) * state.pagination.perPage) + 1} to{' '}
            {Math.min(state.pagination.page * state.pagination.perPage, state.pagination.totalCount)} of{' '}
            {state.pagination.totalCount} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(state.pagination.page - 1)}
              disabled={state.pagination.page === 1}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, state.pagination.totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md ${
                    page === state.pagination.page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => handlePageChange(state.pagination.page + 1)}
              disabled={state.pagination.page === state.pagination.totalPages}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <PanelModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        panel={modalState.panel}
        onClose={() => setModalState({ isOpen: false, mode: 'create' })}
        onSave={modalState.mode === 'create' ? handleCreatePanel : handleUpdatePanel}
      />
    </div>
  );
}