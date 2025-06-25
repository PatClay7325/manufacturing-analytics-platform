'use client';

import React, { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { 
  Book, Video, MessageCircle, FileQuestion, 
  Search, ExternalLink, ChevronRight, PlayCircle,
  Keyboard, Download, Mail, AlertCircle
} from 'lucide-react';
import { useHelp } from '@/contexts/HelpContext';
import { TutorialLauncher } from '@/components/help/TutorialSystem';

export default function HelpPage() {
  const { showHelp, showKeyboardShortcuts, startTutorial } = useHelp();
  const [searchQuery, setSearchQuery] = useState('');

  const helpCategories = [
    {
      icon: Book,
      title: 'Documentation',
      description: 'Comprehensive guides and API references',
      action: () => showHelp(),
      color: 'blue'
    },
    {
      icon: Video,
      title: 'Video Tutorials',
      description: 'Step-by-step video walkthroughs',
      action: () => window.open('https://youtube.com/playlist', '_blank'),
      color: 'red'
    },
    {
      icon: PlayCircle,
      title: 'Interactive Tutorials',
      description: 'Learn by doing with guided tutorials',
      action: () => startTutorial({
        id: 'platform-overview',
        title: 'Platform Overview',
        description: 'Get familiar with the platform',
        category: 'getting-started',
        difficulty: 'beginner',
        estimatedTime: 10,
        steps: []
      }),
      color: 'green'
    },
    {
      icon: Keyboard,
      title: 'Keyboard Shortcuts',
      description: 'Master the keyboard shortcuts',
      action: () => showKeyboardShortcuts(),
      color: 'purple'
    },
    {
      icon: MessageCircle,
      title: 'Community Support',
      description: 'Get help from the community',
      action: () => window.open('https://community.example.com', '_blank'),
      color: 'orange'
    },
    {
      icon: Mail,
      title: 'Contact Support',
      description: 'Reach out to our support team',
      action: () => window.location.href = 'mailto:support@example.com',
      color: 'gray'
    }
  ];

  const quickLinks = [
    { title: 'Getting Started Guide', href: '#', category: 'Basics' },
    { title: 'Creating Your First Dashboard', href: '#', category: 'Dashboards' },
    { title: 'Setting Up Alerts', href: '#', category: 'Monitoring' },
    { title: 'Data Source Configuration', href: '#', category: 'Data' },
    { title: 'User Management', href: '#', category: 'Admin' },
    { title: 'API Documentation', href: '#', category: 'Development' }
  ];

  const resources = [
    {
      title: 'Release Notes',
      description: 'Latest updates and changes',
      icon: FileQuestion,
      href: '#'
    },
    {
      title: 'Best Practices',
      description: 'Recommended patterns and guidelines',
      icon: AlertCircle,
      href: '#'
    },
    {
      title: 'Downloads',
      description: 'Plugins, themes, and tools',
      icon: Download,
      href: '#'
    }
  ];

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400'
  };

  return (
    <PageLayout
      title="Help & Support"
      description="Find answers, learn new skills, and get support"
    >
      {/* Search Section */}
      <div className="mb-8">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for help..."
              className="w-full pl-12 pr-4 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && searchQuery) {
                  showHelp(searchQuery);
                }
              }}
            />
            <button
              onClick={() => searchQuery && showHelp(searchQuery)}
              className="absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Help Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {helpCategories.map((category, index) => (
          <button
            key={index}
            onClick={category.action}
            className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200 dark:border-gray-700 text-left group"
          >
            <div className={`inline-flex p-3 rounded-lg ${colorClasses[category.color]} mb-4`}>
              <category.icon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {category.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {category.description}
            </p>
          </button>
        ))}
      </div>

      {/* Quick Links and Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Links */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Popular Topics
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
            {quickLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  showHelp(link.title);
                }}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
              >
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {link.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {link.category}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              </a>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Resources
          </h2>
          <div className="space-y-4">
            {resources.map((resource, index) => (
              <a
                key={index}
                href={resource.href}
                className="flex items-start p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all group"
              >
                <resource.icon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {resource.title}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {resource.description}
                  </p>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400 ml-2" />
              </a>
            ))}
          </div>

          {/* Tutorial Launcher */}
          <div className="mt-6">
            <TutorialLauncher
              tutorialId="quick-start"
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <PlayCircle className="h-5 w-5 mr-2" />
              Start Interactive Tutorial
            </TutorialLauncher>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Can't find what you're looking for?{' '}
            <button
              onClick={() => showHelp()}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Browse all documentation
            </button>{' '}
            or{' '}
            <a
              href="mailto:support@example.com"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              contact support
            </a>
          </p>
          <p className="mt-2">
            Press <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">?</kbd> anytime for quick help
          </p>
        </div>
      </div>
    </PageLayout>
  );
}