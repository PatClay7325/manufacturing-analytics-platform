'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  PlusIcon, 
  FolderIcon, 
  ArrowUpTrayIcon,
  ClockIcon,
  StarIcon,
  ChartBarIcon,
  CogIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface DashboardCard {
  id: string;
  title: string;
  description?: string;
  url: string;
  tags: string[];
  isStarred: boolean;
  folderId?: string;
  folderTitle?: string;
  type: 'dashboard' | 'folder';
  created: Date;
  updated: Date;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  url: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'grafana-demo',
    title: 'Grafana Demo',
    description: 'Try the complete Grafana system',
    icon: ChartBarIcon,
    url: '/grafana-demo',
    color: 'bg-blue-500'
  },
  {
    id: 'dashboards',
    title: 'Dashboards',
    description: 'Browse all dashboards',
    icon: FolderIcon,
    url: '/dashboards',
    color: 'bg-green-500'
  },
  {
    id: 'explore',
    title: 'Explore',
    description: 'Query and explore your data',
    icon: MagnifyingGlassIcon,
    url: '/explore',
    color: 'bg-purple-500'
  },
  {
    id: 'alerting',
    title: 'Alerting',
    description: 'Manage alerts and notifications',
    icon: CogIcon,
    url: '/alerting',
    color: 'bg-red-500'
  }
];

const recentDashboards: DashboardCard[] = [
  {
    id: '1',
    title: 'Manufacturing Overview',
    description: 'Real-time production metrics and KPIs',
    url: '/dashboards/manufacturing-overview',
    tags: ['production', 'kpi', 'overview'],
    isStarred: true,
    type: 'dashboard',
    created: new Date('2024-01-15'),
    updated: new Date('2024-01-20')
  },
  {
    id: '2',
    title: 'OEE Analysis',
    description: 'Overall Equipment Effectiveness monitoring',
    url: '/dashboards/oee-analysis',
    tags: ['oee', 'equipment', 'efficiency'],
    isStarred: true,
    type: 'dashboard',
    created: new Date('2024-01-14'),
    updated: new Date('2024-01-19')
  },
  {
    id: '3',
    title: 'Quality Metrics',
    description: 'Product quality tracking and analysis',
    url: '/dashboards/quality-metrics',
    tags: ['quality', 'defects', 'analysis'],
    isStarred: false,
    type: 'dashboard',
    created: new Date('2024-01-13'),
    updated: new Date('2024-01-18')
  },
  {
    id: '4',
    title: 'Equipment Health',
    description: 'Machine health and maintenance insights',
    url: '/dashboards/equipment-health',
    tags: ['maintenance', 'health', 'predictive'],
    isStarred: false,
    type: 'dashboard',
    created: new Date('2024-01-12'),
    updated: new Date('2024-01-17')
  }
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDashboards, setFilteredDashboards] = useState(recentDashboards);

  useEffect(() => {
    if (searchQuery) {
      const filtered = recentDashboards.filter(dashboard =>
        dashboard.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dashboard.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dashboard.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredDashboards(filtered);
    } else {
      setFilteredDashboards(recentDashboards);
    }
  }, [searchQuery]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Welcome to Manufacturing Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor, analyze, and optimize your manufacturing operations with real-time insights
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickActions.map((action) => {
          const IconComponent = action.icon;
          return (
            <Link
              key={action.id}
              href={action.url}
              className="group block p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center mb-3">
                <div className={`${action.color} p-3 rounded-lg`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {action.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {action.description}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Search Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Recent Dashboards
          </h2>
          <Link
            href="/dashboards"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
          >
            View all →
          </Link>
        </div>
        
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search dashboards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:text-gray-100"
          />
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        {filteredDashboards.map((dashboard) => (
          <Link
            key={dashboard.id}
            href={dashboard.url}
            className="group block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center">
                <ChartBarIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {dashboard.title}
                </h3>
              </div>
              {dashboard.isStarred && (
                <StarIcon className="h-4 w-4 text-yellow-500 fill-current" />
              )}
            </div>
            
            {dashboard.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                {dashboard.description}
              </p>
            )}
            
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <ClockIcon className="h-3 w-3 mr-1" />
                {dashboard.updated.toLocaleDateString()}
              </div>
              <div className="flex flex-wrap gap-1">
                {dashboard.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
                {dashboard.tags.length > 2 && (
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    +{dashboard.tags.length - 2}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {filteredDashboards.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No dashboards found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Try adjusting your search terms or create a new dashboard
          </p>
          <Link
            href="/dashboards/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Dashboard
          </Link>
        </div>
      )}

      {/* Getting Started Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              New to Manufacturing Analytics?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Get started with our comprehensive documentation and tutorials to make the most of your analytics platform.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/documentation"
                className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                📚 Documentation
              </Link>
              <Link
                href="/documentation/api-reference"
                className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                🔌 API Reference
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                💬 Support
              </Link>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="text-6xl opacity-50">📊</div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div className="text-3xl font-bold text-blue-600 mb-2">12</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Active Dashboards</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div className="text-3xl font-bold text-green-600 mb-2">98.5%</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Average OEE</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
          <div className="text-3xl font-bold text-purple-600 mb-2">24/7</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Real-time Monitoring</div>
        </div>
      </div>
    </div>
  );
}
