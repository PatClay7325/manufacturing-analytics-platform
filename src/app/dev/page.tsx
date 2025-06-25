'use client';

import React from 'react';

import Link from 'next/link';
import PageLayout from '@/components/layout/PageLayout';

export default function DevelopmentPage() {
  const devPages = [
    {
      title: 'Prometheus Test',
      description: 'Test real-time data integration with Prometheus metrics',
      href: '/test-prometheus',
      icon: '📊',
      status: 'active'
    },
    {
      title: 'Data Integration Tests',
      description: 'Test data connections and transformations',
      href: '/dev/data-integration',
      icon: '🔌',
      status: 'active'
    },
    {
      title: 'UI Component Tests',
      description: 'Visual component testing and validation',
      href: '/dev/ui-components',
      icon: '🎨',
      status: 'active'
    },
    {
      title: 'API Testing',
      description: 'Test API endpoints and response times',
      href: '/dev/api-testing',
      icon: '⚡',
      status: 'active'
    },
    {
      title: 'Performance Tests',
      description: 'Monitor and test application performance',
      href: '/dev/performance',
      icon: '🚀',
      status: 'active'
    },
    {
      title: 'Debug Tools',
      description: 'Advanced debugging and diagnostics',
      href: '/dev/debugging',
      icon: '🐛',
      status: 'active'
    }
  ];

  return (
    <PageLayout 
      title="Development Tools" 
      breadcrumbs={[
        { title: 'Home', url: '/' },
        { title: 'Development' }
      ]}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Development Environment</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>These pages are for development and testing purposes only. They should not be accessed in production.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Development Pages Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {devPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className="group relative bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-lg transition-shadow duration-200 border border-gray-200 dark:border-gray-700"
            >
              <div>
                <span className="text-3xl mb-4 block">{page.icon}</span>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {page.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {page.description}
                </p>
                {page.status === 'active' && (
                  <span className="absolute top-4 right-4 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-12 bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Development Guidelines</h2>
          <div className="prose prose-sm text-gray-600 dark:text-gray-400">
            <ul>
              <li>All development pages should be created under the <code>/dev</code> directory</li>
              <li>Use <code>PageLayout</code> component for consistent styling</li>
              <li>Include clear test instructions and expected results</li>
              <li>Add status indicators for test results when applicable</li>
              <li>Document any required environment variables or setup</li>
              <li>Remove or disable these pages before deploying to production</li>
            </ul>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}