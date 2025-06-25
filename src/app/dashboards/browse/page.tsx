'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { grafanaClient } from '@/lib/grafana/GrafanaClient';
import { Search, FolderOpen, Clock, Star, LayoutDashboard, Plus, ExternalLink } from 'lucide-react';

interface Dashboard {
  id: number;
  uid: string;
  title: string;
  uri: string;
  url: string;
  slug: string;
  type: string;
  tags: string[];
  isStarred: boolean;
  folderId?: number;
  folderUid?: string;
  folderTitle?: string;
  folderUrl?: string;
}

export default function BrowseDashboards() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [filteredDashboards, setFilteredDashboards] = useState<Dashboard[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboards from Grafana
  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        setLoading(true);
        const results = await grafanaClient.search('', 'dash-db');
        setDashboards(results);
        setFilteredDashboards(results);
      } catch (err) {
        setError('Failed to fetch dashboards from Grafana');
        console.error('Error fetching dashboards:', err);
        // Fallback to sample data for demo
        const sampleDashboards: Dashboard[] = [
          {
            id: 1,
            uid: 'manufacturing-overview',
            title: 'Manufacturing Overview',
            uri: 'db/manufacturing-overview',
            url: '/d/manufacturing-overview',
            slug: 'manufacturing-overview',
            type: 'dash-db',
            tags: ['manufacturing', 'oee', 'production'],
            isStarred: true,
            folderTitle: 'Manufacturing',
          },
          {
            id: 2,
            uid: 'oee-analysis',
            title: 'OEE Analysis',
            uri: 'db/oee-analysis',
            url: '/d/oee-analysis',
            slug: 'oee-analysis',
            type: 'dash-db',
            tags: ['oee', 'performance', 'quality'],
            isStarred: true,
            folderTitle: 'Manufacturing',
          },
          {
            id: 3,
            uid: 'equipment-monitoring',
            title: 'Equipment Monitoring',
            uri: 'db/equipment-monitoring',
            url: '/d/equipment-monitoring',
            slug: 'equipment-monitoring',
            type: 'dash-db',
            tags: ['equipment', 'maintenance', 'health'],
            isStarred: false,
            folderTitle: 'Equipment',
          },
        ];
        setDashboards(sampleDashboards);
        setFilteredDashboards(sampleDashboards);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboards();
  }, []);

  // Filter dashboards based on search and tag
  useEffect(() => {
    let filtered = dashboards;

    if (searchQuery) {
      filtered = filtered.filter(dashboard =>
        dashboard.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dashboard.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (selectedTag) {
      filtered = filtered.filter(dashboard =>
        dashboard.tags.includes(selectedTag)
      );
    }

    setFilteredDashboards(filtered);
  }, [searchQuery, selectedTag, dashboards]);

  // Get all unique tags
  const allTags = Array.from(new Set(dashboards.flatMap(d => d.tags)));

  const openInGrafana = (uid: string) => {
    const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || '/grafana';
    window.open(`${grafanaUrl}/d/${uid}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Browse Dashboards</h1>
            <p className="mt-1 text-sm text-gray-500">
              Explore and manage all your Grafana dashboards
            </p>
          </div>
          <button
            onClick={() => openInGrafana('new')}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create in Grafana
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search dashboards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Tag Filter */}
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        {/* Results Count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredDashboards.length} of {dashboards.length} dashboards
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDashboards.map((dashboard) => (
            <div
              key={dashboard.uid}
              className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                {/* Dashboard Title */}
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <LayoutDashboard className="h-5 w-5 mr-2 text-gray-400" />
                    {dashboard.title}
                  </h3>
                  {dashboard.isStarred && (
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                  )}
                </div>

                {/* Folder */}
                {dashboard.folderTitle && (
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <FolderOpen className="h-4 w-4 mr-1" />
                    {dashboard.folderTitle}
                  </div>
                )}

                {/* Tags */}
                {dashboard.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {dashboard.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex items-center justify-between">
                  <Link
                    href={`/dashboards/view/${dashboard.uid}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View Embedded →
                  </Link>
                  <button
                    onClick={() => openInGrafana(dashboard.uid)}
                    className="flex items-center text-gray-600 hover:text-gray-700 text-sm"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Open in Grafana
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredDashboards.length === 0 && (
          <div className="text-center py-12">
            <LayoutDashboard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No dashboards found</p>
            {searchQuery || selectedTag ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTag('');
                }}
                className="text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            ) : (
              <button
                onClick={() => openInGrafana('new')}
                className="text-blue-600 hover:text-blue-700"
              >
                Create your first dashboard in Grafana
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}