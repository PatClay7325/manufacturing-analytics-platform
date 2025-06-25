/**
 * Dashboard List Component
 * Displays a grid of dashboards with proper key management
 * Based on manufacturingPlatform's dashboard browsing patterns
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LayoutGrid, 
  Clock, 
  Star, 
  MoreVertical, 
  Copy, 
  Download, 
  Trash2,
  Edit,
  FolderOpen
} from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ErrorAlert } from '@/components/common/ErrorAlert';

interface DashboardItem {
  id: string;
  uid: string;
  title: string;
  tags: string[];
  starred?: boolean;
  folderId?: string;
  folderTitle?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
}

interface DashboardListProps {
  folderId?: string;
  query?: string;
  tags?: string[];
  starred?: boolean;
  limit?: number;
  onDashboardSelect?: (dashboard: DashboardItem) => void;
}

export function DashboardList({
  folderId,
  query,
  tags,
  starred,
  limit = 50,
  onDashboardSelect
}: DashboardListProps) {
  const router = useRouter();
  const [dashboards, setDashboards] = useState<DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDashboard, setSelectedDashboard] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Fetch dashboards
  useEffect(() => {
    fetchDashboards();
  }, [folderId, query, tags, starred]);

  const fetchDashboards = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (folderId) params.append('folderId', folderId);
      if (query) params.append('query', query);
      if (tags && tags.length > 0) params.append('tags', tags.join(','));
      if (starred) params.append('starred', 'true');
      params.append('limit', limit.toString());

      const response = await fetch(`/api/dashboards?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboards');
      }

      const data = await response.json();
      setDashboards(data.dashboards || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboards');
    } finally {
      setLoading(false);
    }
  };

  // Generate unique row ID for each dashboard (following manufacturingPlatform pattern)
  const makeRowID = (dashboard: DashboardItem): string => {
    return `dashboard-${dashboard.uid}`;
  };

  // Memoize dashboard items with unique keys
  const dashboardItems = useMemo(() => {
    return dashboards.map((dashboard) => ({
      ...dashboard,
      _key: makeRowID(dashboard),
      _displayTitle: dashboard.title.substring(0, 5000) // Truncate long titles
    }));
  }, [dashboards]);

  const handleDashboardClick = (dashboard: DashboardItem) => {
    if (onDashboardSelect) {
      onDashboardSelect(dashboard);
    } else {
      router.push(`/dashboards/${dashboard.uid}`);
    }
  };

  const handleDuplicate = async (dashboard: DashboardItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/dashboards/${dashboard.uid}/duplicate`, {
        method: 'POST'
      });
      if (response.ok) {
        fetchDashboards(); // Refresh list
      }
    } catch (error) {
      console.error('Failed to duplicate dashboard:', error);
    }
    setMenuOpen(null);
  };

  const handleExport = async (dashboard: DashboardItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/dashboards/${dashboard.uid}/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${dashboard.title}-export.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export dashboard:', error);
    }
    setMenuOpen(null);
  };

  const handleDelete = async (dashboard: DashboardItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${dashboard.title}"?`)) {
      try {
        const response = await fetch(`/api/dashboards/${dashboard.uid}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          fetchDashboards(); // Refresh list
        }
      } catch (error) {
        console.error('Failed to delete dashboard:', error);
      }
    }
    setMenuOpen(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorAlert 
        title="Failed to load dashboards" 
        message={error}
        onRetry={fetchDashboards}
      />
    );
  }

  if (dashboardItems.length === 0) {
    return (
      <div className="text-center py-12">
        <LayoutGrid className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No dashboards</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating a new dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {dashboardItems.map((dashboard) => (
        <Card
          key={dashboard._key}
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleDashboardClick(dashboard)}
        >
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {dashboard._displayTitle}
                </h3>
                {dashboard.folderTitle && (
                  <div className="flex items-center mt-1">
                    <FolderOpen className="h-3 w-3 text-gray-400 mr-1" />
                    <span className="text-xs text-gray-500">{dashboard.folderTitle}</span>
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(menuOpen === dashboard._key ? null : dashboard._key);
                  }}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <MoreVertical className="h-4 w-4 text-gray-400" />
                </button>
                
                {menuOpen === dashboard._key && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border">
                    <button
                      onClick={(e) => handleDashboardClick(dashboard)}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={(e) => handleDuplicate(dashboard, e)}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </button>
                    <button
                      onClick={(e) => handleExport(dashboard, e)}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={(e) => handleDelete(dashboard, e)}
                      className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            {dashboard.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {dashboard.tags.map((tag, index) => (
                  <span
                    key={`${dashboard._key}-tag-${index}`}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                <span>{format(new Date(dashboard.updatedAt), 'MMM d, h:mm a')}</span>
              </div>
              {dashboard.starred && (
                <Star className="h-3 w-3 text-yellow-400 fill-current" />
              )}
            </div>

            <div className="mt-1 text-xs text-gray-400">
              v{dashboard.version} • {dashboard.createdBy}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}