'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { navigationConfig, NavigationItem, getFlattenedNav } from '@/lib/navigation/grafana-integrated-navigation';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
}

export default function GrafanaIntegratedSidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState));
    }

    // Auto-expand active sections
    const activeItem = findActiveItem(navigationConfig, pathname);
    if (activeItem) {
      expandParents(activeItem.id);
    }
  }, [pathname]);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const expandParents = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    
    function findAndExpand(items: NavigationItem[], targetId: string, parents: string[] = []): boolean {
      for (const item of items) {
        if (item.id === targetId) {
          parents.forEach(parentId => newExpanded.add(parentId));
          return true;
        }
        if (item.children) {
          if (findAndExpand(item.children, targetId, [...parents, item.id])) {
            return true;
          }
        }
      }
      return false;
    }
    
    findAndExpand(navigationConfig, itemId);
    setExpandedItems(newExpanded);
  };

  const findActiveItem = (items: NavigationItem[], path: string): NavigationItem | null => {
    for (const item of items) {
      if (item.url === path) {
        return item;
      }
      if (item.children) {
        const found = findActiveItem(item.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const isItemActive = (item: NavigationItem): boolean => {
    if (item.url === pathname) return true;
    if (item.children) {
      return item.children.some(child => isItemActive(child));
    }
    return false;
  };

  const filteredItems = searchQuery
    ? getFlattenedNav().filter(item =>
        item.text.toLowerCase().includes(searchQuery.toLowerCase()) &&
        item.url &&
        !item.divider
      )
    : null;

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    if (item.divider) {
      return <div key={item.id} className="my-2 border-t border-gray-700" />;
    }

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isActive = isItemActive(item);
    const IconComponent = item.iconComponent;

    const itemContent = (
      <div
        className={cn(
          'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
          'hover:bg-gray-800 hover:text-white',
          isActive ? 'bg-gray-800 text-white' : 'text-gray-300',
          level > 0 && 'ml-6'
        )}
      >
        {IconComponent && (
          <IconComponent className={cn('flex-shrink-0 h-5 w-5', isCollapsed ? 'mx-auto' : 'mr-3')} />
        )}
        {!isCollapsed && (
          <>
            <span className="flex-1">{item.text}</span>
            {hasChildren && (
              <ChevronRight
                className={cn(
                  'ml-auto h-4 w-4 transition-transform',
                  isExpanded && 'transform rotate-90'
                )}
              />
            )}
          </>
        )}
      </div>
    );

    if (item.url && !hasChildren) {
      return (
        <Link
          key={item.id}
          href={item.url}
          target={item.target}
          className="block"
        >
          {itemContent}
        </Link>
      );
    }

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => toggleExpanded(item.id)}
            className="w-full text-left"
          >
            {itemContent}
          </button>
          {!isCollapsed && isExpanded && (
            <div className="mt-1 space-y-1">
              {item.children.map(child => renderNavigationItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div key={item.id}>
        {itemContent}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-gray-900 border-r border-gray-700 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        {!isCollapsed && (
          <h2 className="text-lg font-semibold text-white">Manufacturing Analytics</h2>
        )}
        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-700 rounded"
              >
                <X className="h-3 w-3 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {searchQuery && filteredItems ? (
          <div className="space-y-1">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
              Search Results ({filteredItems.length})
            </p>
            {filteredItems.map(item => (
              <Link
                key={item.id}
                href={item.url!}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-300 rounded-md hover:bg-gray-800 hover:text-white"
              >
                {item.iconComponent && (
                  <item.iconComponent className="mr-3 h-5 w-5" />
                )}
                <span>{item.text}</span>
              </Link>
            ))}
          </div>
        ) : (
          navigationConfig.map(item => renderNavigationItem(item))
        )}
      </nav>

      {/* User section */}
      {!isCollapsed && user && (
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{user.name || user.email}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}

      {/* Version info */}
      {!isCollapsed && (
        <div className="px-4 py-2 text-xs text-gray-500 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span>v1.0.0</span>
            <span>Grafana Integrated</span>
          </div>
        </div>
      )}
    </div>
  );
}