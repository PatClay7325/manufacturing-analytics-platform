/**
 * Analytics Dashboards List Page - Dashboard management and navigation
 * Route: /dashboards - Matches Analytics's dashboards URL pattern
 */

'use client';

import React from 'react';

import Link from 'next/link';
import { useState } from 'react';
import { defaultAnalyticsConfig } from '@/core/analytics';

interface Dashboard {
  uid: string;
  title: string;
  description?: string;
  tags: string[];
  isStarred?: boolean;
  meta: {
    updated: string;
    created: string;
    canEdit: boolean;
    canSave: boolean;
    canDelete: boolean;
  };
}

export default function DashboardsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Mock dashboards - in a real app, these would come from an API
  const dashboards: Dashboard[] = [
    {
      uid: 'manufacturing-overview',
      title: 'Manufacturing Overview',
      description: 'Complete manufacturing operations overview with OEE, production metrics, and equipment status',
      tags: ['manufacturing', 'overview', 'oee'],
      isStarred: true,
      meta: {
        updated: new Date().toISOString(),
        created: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        canEdit: true,
        canSave: true,
        canDelete: true,
      }
    },
    {
      uid: 'equipment-monitoring',
      title: 'Equipment Monitoring',
      description: 'Real-time equipment health, performance, and maintenance tracking',
      tags: ['equipment', 'monitoring', 'maintenance'],
      isStarred: false,
      meta: {
        updated: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        canEdit: true,
        canSave: true,
        canDelete: true,
      }
    },
    {
      uid: 'quality-metrics',
      title: 'Quality Metrics',
      description: 'Quality control metrics, defect rates, and compliance tracking',
      tags: ['quality', 'metrics', 'compliance'],
      isStarred: true,
      meta: {
        updated: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        created: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        canEdit: true,
        canSave: true,
        canDelete: false,
      }
    },
    {
      uid: 'production-analytics',
      title: 'Production Analytics',
      description: 'Production line performance, throughput, and efficiency analysis',
      tags: ['production', 'analytics', 'efficiency'],
      isStarred: false,
      meta: {
        updated: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        created: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        canEdit: true,
        canSave: true,
        canDelete: true,
      }
    }
  ];

  // Filter dashboards based on search and tags
  const filteredDashboards = dashboards.filter(dashboard => {
    const matchesSearch = !searchQuery || 
      dashboard.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dashboard.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 ||
      selectedTags.every(tag => dashboard.tags.includes(tag));

    return matchesSearch && matchesTags;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(dashboards.flatMap(d => d.tags))).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboards</h1>
              <p className="text-gray-600 mt-1">
                Create and manage your manufacturing analytics dashboards
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Link
                href="/analytics-demo"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                New Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search dashboards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Tags:</span>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => {
                  if (selectedTags.includes(tag)) {
                    setSelectedTags(selectedTags.filter(t => t !== tag));
                  } else {
                    setSelectedTags([...selectedTags, tag]);
                  }
                }}
                className={`px-3 py-1 text-sm rounded-full border ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-1 border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'grid' ? 'bg-blue-100 text-blue-800' : 'text-gray-600'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'list' ? 'bg-blue-100 text-blue-800' : 'text-gray-600'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard List */}
      <div className="p-6">
        {filteredDashboards.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              {searchQuery || selectedTags.length > 0 ? 'No dashboards match your criteria' : 'No dashboards found'}
            </div>
            <Link
              href="/analytics-demo"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Create Your First Dashboard
            </Link>
          </div>
        ) : (
          <div className={
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }>
            {filteredDashboards.map((dashboard) => (
              <div
                key={dashboard.uid}
                className={`bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow ${
                  viewMode === 'list' ? 'p-4' : 'p-6'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link
                      href={`/d/${dashboard.uid}`}
                      className="text-lg font-medium text-gray-900 hover:text-blue-600"
                    >
                      {dashboard.title}
                    </Link>
                    {dashboard.description && (
                      <p className="text-gray-600 text-sm mt-1">{dashboard.description}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-3">
                      {dashboard.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Updated {new Date(dashboard.meta.updated).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {dashboard.isStarred && (
                      <span className="text-yellow-500">⭐</span>
                    )}
                    <button className="text-gray-400 hover:text-gray-600">
                      •••
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}