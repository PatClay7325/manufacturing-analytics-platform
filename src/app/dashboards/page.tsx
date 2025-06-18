/**
 * Adaptive Factory Manufacturing Intelligence Platform
 * Dashboards Management Page
 * 
 * Original implementation for dashboard creation, management and organization
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Dashboard } from '@/types/dashboard';
import { dashboardEngine } from '@/core/dashboard/DashboardEngine';
import PageLayout from '@/components/layout/PageLayout';
import DashboardCard from '@/components/dashboards/DashboardCard';
import DashboardSearch from '@/components/dashboards/DashboardSearch';
import DashboardFilters from '@/components/dashboards/DashboardFilters';
import CreateDashboardModal from '@/components/dashboards/CreateDashboardModal';
import DashboardImportModal from '@/components/dashboards/DashboardImportModal';

interface DashboardsPageState {
  dashboards: Dashboard[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedTags: string[];
  sortBy: 'name' | 'updated' | 'created';
  sortDirection: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
  showCreateModal: boolean;
  showImportModal: boolean;
}

export default function DashboardsPage() {
  const [state, setState] = useState<DashboardsPageState>({
    dashboards: [],
    loading: true,
    error: null,
    searchQuery: '',
    selectedTags: [],
    sortBy: 'updated',
    sortDirection: 'desc',
    viewMode: 'grid',
    showCreateModal: false,
    showImportModal: false
  });

  // Load dashboards on component mount
  useEffect(() => {
    loadDashboards();
  }, []);

  const loadDashboards = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      // This would typically come from an API
      const dashboards = await dashboardEngine.searchDashboards('', state.selectedTags);
      
      setState(prev => ({ 
        ...prev, 
        dashboards, 
        loading: false 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load dashboards' 
      }));
    }
  };

  // Filter and sort dashboards
  const filteredDashboards = useMemo(() => {
    let filtered = state.dashboards;

    // Apply search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(dashboard => 
        dashboard.title.toLowerCase().includes(query) ||
        dashboard.description?.toLowerCase().includes(query) ||
        dashboard.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply tag filter
    if (state.selectedTags.length > 0) {
      filtered = filtered.filter(dashboard =>
        state.selectedTags.every(tag => dashboard.tags.includes(tag))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (state.sortBy) {
        case 'name':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'updated':
          aValue = new Date(a.meta.updated || 0).getTime();
          bValue = new Date(b.meta.updated || 0).getTime();
          break;
        case 'created':
          aValue = new Date(a.meta.created || 0).getTime();
          bValue = new Date(b.meta.created || 0).getTime();
          break;
        default:
          return 0;
      }

      if (state.sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [state.dashboards, state.searchQuery, state.selectedTags, state.sortBy, state.sortDirection]);

  // Get all unique tags from dashboards
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    state.dashboards.forEach(dashboard => {
      dashboard.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [state.dashboards]);

  const handleSearch = (query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
  };

  const handleTagFilter = (tags: string[]) => {
    setState(prev => ({ ...prev, selectedTags: tags }));
  };

  const handleSort = (sortBy: typeof state.sortBy, direction: typeof state.sortDirection) => {
    setState(prev => ({ ...prev, sortBy, sortDirection: direction }));
  };

  const handleViewModeChange = (viewMode: typeof state.viewMode) => {
    setState(prev => ({ ...prev, viewMode }));
  };

  const handleCreateDashboard = async (dashboardData: any) => {
    try {
      const newDashboard = dashboardEngine.createDashboard(
        dashboardData.title,
        dashboardData.manufacturingConfig
      );
      
      await dashboardEngine.saveDashboard(newDashboard);
      await loadDashboards();
      
      setState(prev => ({ ...prev, showCreateModal: false }));
    } catch (error) {
      console.error('Failed to create dashboard:', error);
    }
  };

  const handleImportDashboard = async (dashboardJson: string) => {
    try {
      const dashboardData = JSON.parse(dashboardJson);
      await dashboardEngine.saveDashboard(dashboardData);
      await loadDashboards();
      
      setState(prev => ({ ...prev, showImportModal: false }));
    } catch (error) {
      console.error('Failed to import dashboard:', error);
    }
  };

  const handleDeleteDashboard = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this dashboard?')) {
      return;
    }

    try {
      await dashboardEngine.deleteDashboard(uid);
      await loadDashboards();
    } catch (error) {
      console.error('Failed to delete dashboard:', error);
    }
  };

  const handleDuplicateDashboard = async (uid: string) => {
    try {
      await dashboardEngine.duplicateDashboard(uid);
      await loadDashboards();
    } catch (error) {
      console.error('Failed to duplicate dashboard:', error);
    }
  };

  if (state.loading) {
    return (
      <PageLayout>
        <div className="container py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (state.error) {
    return (
      <PageLayout>
        <div className="container py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Dashboards</h3>
            <p className="text-red-600 mb-4">{state.error}</p>
            <button
              onClick={loadDashboards}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboards</h1>
            <p className="mt-2 text-gray-600">
              Create and manage manufacturing intelligence dashboards
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setState(prev => ({ ...prev, showImportModal: true }))}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2"
            >
              <span>📥</span>
              <span>Import</span>
            </button>
            
            <button
              onClick={() => setState(prev => ({ ...prev, showCreateModal: true }))}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <span>➕</span>
              <span>Create Dashboard</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <DashboardSearch
            value={state.searchQuery}
            onChange={handleSearch}
            placeholder="Search dashboards by name, description, or tags..."
          />
          
          <DashboardFilters
            availableTags={availableTags}
            selectedTags={state.selectedTags}
            sortBy={state.sortBy}
            sortDirection={state.sortDirection}
            viewMode={state.viewMode}
            onTagFilter={handleTagFilter}
            onSort={handleSort}
            onViewModeChange={handleViewModeChange}
          />
        </div>

        {/* Dashboard Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600">📊</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Dashboards</p>
                <p className="text-2xl font-semibold text-gray-900">{state.dashboards.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600">🏭</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Manufacturing</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {state.dashboards.filter(d => d.tags.includes('manufacturing')).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-yellow-600">⚙️</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Equipment</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {state.dashboards.filter(d => d.tags.includes('equipment')).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600">📈</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Quality</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {state.dashboards.filter(d => d.tags.includes('quality')).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboards Grid/List */}
        {filteredDashboards.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-4xl text-gray-400">📊</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No dashboards found</h3>
            <p className="text-gray-600 mb-6">
              {state.searchQuery || state.selectedTags.length > 0 
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first dashboard'}
            </p>
            {!state.searchQuery && state.selectedTags.length === 0 && (
              <button
                onClick={() => setState(prev => ({ ...prev, showCreateModal: true }))}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Create Your First Dashboard
              </button>
            )}
          </div>
        ) : (
          <div className={
            state.viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }>
            {filteredDashboards.map((dashboard) => (
              <DashboardCard
                key={dashboard.uid}
                dashboard={dashboard}
                viewMode={state.viewMode}
                onDelete={handleDeleteDashboard}
                onDuplicate={handleDuplicateDashboard}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        {state.showCreateModal && (
          <CreateDashboardModal
            onClose={() => setState(prev => ({ ...prev, showCreateModal: false }))}
            onCreate={handleCreateDashboard}
          />
        )}

        {state.showImportModal && (
          <DashboardImportModal
            onClose={() => setState(prev => ({ ...prev, showImportModal: false }))}
            onImport={handleImportDashboard}
          />
        )}
      </div>
    </PageLayout>
  );
}