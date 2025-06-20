'use client';

import React, { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { Search, Star, Clock, Filter, FolderOpen, LayoutGrid, Plus } from 'lucide-react';
import Link from 'next/link';

interface Dashboard {
  id: string;
  uid: string;
  title: string;
  tags: string[];
  starred: boolean;
  type: 'dash-db' | 'dash-folder';
  folderTitle?: string;
  updated: string;
  updatedBy: string;
}

export default function BrowseDashboardsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showStarred, setShowStarred] = useState(false);
  const [showRecent, setShowRecent] = useState(false);

  // Sample dashboards data
  const dashboards: Dashboard[] = [
    {
      id: '1',
      uid: 'manufacturing-oee-v1',
      title: 'Manufacturing OEE Dashboard',
      tags: ['manufacturing', 'oee', 'iso-22400'],
      starred: true,
      type: 'dash-db',
      folderTitle: 'Manufacturing',
      updated: '2 hours ago',
      updatedBy: 'Admin'
    },
    {
      id: '2',
      uid: 'equipment-health-v1',
      title: 'Equipment Health Monitoring',
      tags: ['manufacturing', 'equipment', 'health', 'iso-14224'],
      starred: true,
      type: 'dash-db',
      folderTitle: 'Manufacturing',
      updated: '5 hours ago',
      updatedBy: 'Admin'
    },
    {
      id: '3',
      uid: 'production-metrics-v1',
      title: 'Production Metrics',
      tags: ['manufacturing', 'production', 'metrics'],
      starred: false,
      type: 'dash-db',
      folderTitle: 'Manufacturing',
      updated: '1 day ago',
      updatedBy: 'Admin'
    },
    {
      id: '4',
      uid: 'quality-analysis',
      title: 'Quality Analysis Dashboard',
      tags: ['quality', 'defects', 'analysis'],
      starred: false,
      type: 'dash-db',
      folderTitle: 'Quality',
      updated: '3 days ago',
      updatedBy: 'Quality Manager'
    },
    {
      id: '5',
      uid: 'maintenance-schedule',
      title: 'Maintenance Schedule',
      tags: ['maintenance', 'schedule', 'planning'],
      starred: false,
      type: 'dash-db',
      folderTitle: 'Maintenance',
      updated: '1 week ago',
      updatedBy: 'Maintenance Lead'
    }
  ];

  // Filter dashboards based on search and filters
  const filteredDashboards = dashboards?.filter(dashboard => {
    const matchesSearch = dashboard?.title.toLowerCase().includes(searchQuery?.toLowerCase()) ||
                         dashboard?.tags.some(tag => tag?.toLowerCase().includes(searchQuery?.toLowerCase()));
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags?.every(tag => dashboard?.tags.includes(tag));
    const matchesStarred = !showStarred || dashboard?.starred;
    
    return matchesSearch && matchesTags && matchesStarred;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(dashboards?.flatMap(d => d?.tags)));

  return (
    <PageLayout
      title="Browse Dashboards"
      description="Find and organize your dashboards"
    >
      <div className="h-full">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboards</h1>
            <Link
              href="/dashboards/new"
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search dashboards by name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e?.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Filter Buttons */}
            <button
              onClick={() => setShowStarred(!showStarred)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                showStarred 
                  ? 'bg-primary-100 text-primary-700 border border-primary-300' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Star className="h-4 w-4" />
              <span>Starred</span>
            </button>

            <button
              onClick={() => setShowRecent(!showRecent)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                showRecent 
                  ? 'bg-primary-100 text-primary-700 border border-primary-300' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Recent</span>
            </button>

            <button className="flex items-center space-x-2 px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
          </div>

          {/* Tags */}
          <div className="flex items-center space-x-2 mt-3">
            <span className="text-sm text-gray-600">Tags:</span>
            {allTags?.map(tag => (
              <button
                key={tag}
                onClick={() => {
                  if (selectedTags?.includes(tag)) {
                    setSelectedTags(selectedTags?.filter(t => t !== tag));
                  } else {
                    setSelectedTags([...selectedTags, tag]);
                  }
                }}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${
                  selectedTags?.includes(tag)
                    ? 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDashboards?.map(dashboard => (
              <Link
                key={dashboard?.id}
                href={`/Analytics-dashboard`}
                className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <LayoutGrid className="h-5 w-5 text-gray-400" />
                    <h3 className="font-medium text-gray-900 group-hover:text-primary-600">
                      {dashboard?.title}
                    </h3>
                  </div>
                  <button
                    onClick={(e) => {
                      e?.preventDefault();
                      // Toggle star logic here
                    }}
                    className={`p-1 rounded ${
                      dashboard?.starred 
                        ? 'text-yellow-500 hover:text-yellow-600' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <Star className={`h-4 w-4 ${dashboard?.starred ? 'fill-current' : ''}`} />
                  </button>
                </div>

                {dashboard?.folderTitle && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500 mb-2">
                    <FolderOpen className="h-3 w-3" />
                    <span>{dashboard?.folderTitle}</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-1 mb-3">
                  {(dashboard?.tags || []).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Updated {dashboard?.updated}</span>
                  <span>by {dashboard?.updatedBy}</span>
                </div>
              </Link>
            ))}
          </div>

          {filteredDashboards.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No dashboards found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
