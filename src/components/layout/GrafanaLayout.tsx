'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import GrafanaNavigation from './GrafanaNavigation';
import { bootstrapManager, BootstrapConfig } from '@/lib/grafana-bootstrap';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { HelpButton } from '@/components/help';

interface GrafanaLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{ title: string; url?: string }>;
  actions?: React.ReactNode;
  className?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: Array<{ title: string; url?: string }>;
  actions?: React.ReactNode;
}

function PageHeader({ title, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex mb-2" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                {breadcrumbs.map((crumb, index) => (
                  <li key={index} className="flex items-center">
                    {index > 0 && (
                      <svg className="flex-shrink-0 h-4 w-4 text-gray-400 mx-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {crumb.url ? (
                      <a
                        href={crumb.url}
                        className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        {crumb.title}
                      </a>
                    ) : (
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {crumb.title}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
        </div>
        {actions && (
          <div className="ml-4 flex items-center space-x-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
}

function ThemeToggle({ theme, onThemeChange }: ThemeToggleProps) {
  return (
    <button
      onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
      className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
    </button>
  );
}

interface TopBarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  config: BootstrapConfig;
  onThemeChange: (theme: 'light' | 'dark') => void;
}

function TopBar({ collapsed, onToggleCollapse, config, onThemeChange }: TopBarProps) {
  const pathname = usePathname();
  
  // Find current page title from navigation
  const findPageTitle = (items: any[], path: string): string => {
    for (const item of items) {
      if (item.url === path) {
        return item.text;
      }
      if (item.children) {
        const found = findPageTitle(item.children, path);
        if (found) return found;
      }
    }
    return 'Dashboard';
  };

  const pageTitle = findPageTitle(config.settings.navTree, pathname);

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="hidden lg:block">
            <h1 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Help Button */}
          <HelpButton variant="dropdown" />

          {/* Theme Toggle */}
          <ThemeToggle 
            theme={config.user.theme} 
            onThemeChange={onThemeChange}
          />

          {/* Settings */}
          <button className="p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* User Menu */}
          <div className="relative">
            <button className="flex items-center space-x-2 p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {config.user.name?.charAt(0) || config.user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden md:block text-sm font-medium">
                {config.user.name || config.user.email}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GrafanaLayout({ 
  children, 
  title, 
  breadcrumbs, 
  actions, 
  className = '' 
}: GrafanaLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [config, setConfig] = useState<BootstrapConfig | null>(null);

  useEffect(() => {
    // Initialize bootstrap configuration
    const initialConfig = bootstrapManager.initializeBootstrapConfig();
    setConfig(initialConfig);

    // Set theme class on document
    const theme = initialConfig.user.theme;
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, []);

  const handleThemeChange = (theme: 'light' | 'dark') => {
    if (config) {
      bootstrapManager.updateUser({ theme });
      setConfig({ ...config, user: { ...config.user, theme } });
      
      // Update document theme
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(theme);
    }
  };

  const handleToggleCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} transition-all duration-300 ease-in-out`}>
          <GrafanaNavigation
            collapsed={sidebarCollapsed}
            onCollapse={setSidebarCollapsed}
            className="h-full"
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Bar */}
          <TopBar
            collapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleCollapse}
            config={config}
            onThemeChange={handleThemeChange}
          />

          {/* Page Header */}
          {title && (
            <PageHeader
              title={title}
              breadcrumbs={breadcrumbs}
              actions={actions}
            />
          )}

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <ErrorBoundary level="page" context="grafana-layout">
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </div>
  );
}