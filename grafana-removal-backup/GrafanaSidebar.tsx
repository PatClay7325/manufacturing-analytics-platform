'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createGrafanaStyleNavigation, GrafanaNavItem } from '@/lib/grafana-navigation';
import {
  HomeIcon,
  PlusIcon,
  Squares2X2Icon,
  MagnifyingGlassIcon,
  BellIcon,
  CogIcon,
  ShieldCheckIcon,
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  ArrowUpTrayIcon,
  PlayIcon,
  CameraIcon,
  RectangleStackIcon,
  MapIcon as CompassIcon,
  ChartBarIcon as ChartLineIcon,
  DocumentTextIcon,
  LinkIcon,
  ListBulletIcon,
  ChatBubbleLeftRightIcon,
  MapIcon,
  BellSlashIcon,
  UserGroupIcon,
  CircleStackIcon,
  UserIcon,
  UsersIcon,
  KeyIcon,
  PuzzlePieceIcon,
  AdjustmentsHorizontalIcon,
  BuildingOfficeIcon,
  CloudArrowUpIcon,
  BuildingStorefrontIcon,
  WrenchScrewdriverIcon,
  DocumentChartBarIcon,
  InformationCircleIcon,
  LifebuoyIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline';

// Icon mapping
const iconComponents: Record<string, React.ComponentType<any>> = {
  'home-alt': HomeIcon,
  'plus': PlusIcon,
  'apps': Squares2X2Icon,
  'folder': FolderIcon,
  'import': ArrowUpTrayIcon,
  'search': MagnifyingGlassIcon,
  'presentation-play': PlayIcon,
  'camera': CameraIcon,
  'layer-group': RectangleStackIcon,
  'compass': CompassIcon,
  'chart-line': ChartLineIcon,
  'document-info': DocumentTextIcon,
  'sitemap': MapIcon,
  'link': LinkIcon,
  'bell': BellIcon,
  'list-ul': ListBulletIcon,
  'comment-alt-share': ChatBubbleLeftRightIcon,
  'bell-slash': BellSlashIcon,
  'shield': ShieldCheckIcon,
  'plug': PuzzlePieceIcon,
  'database': CircleStackIcon,
  'sliders-v-alt': AdjustmentsHorizontalIcon,
  'user': UserIcon,
  'users-alt': UsersIcon,
  'key-skeleton-alt': KeyIcon,
  'office-building': BuildingOfficeIcon,
  'cog': CogIcon,
  'cloud-upload': CloudArrowUpIcon,
  'factory': BuildingStorefrontIcon,
  'chart-bar': ChartLineIcon,
  'shield-check': ShieldCheckIcon,
  'wrench': WrenchScrewdriverIcon,
  'chat': ChatBubbleBottomCenterTextIcon,
  'question-circle': QuestionMarkCircleIcon,
  'life-ring': LifebuoyIcon,
  'comments': ChatBubbleLeftRightIcon,
};

interface NavItemProps {
  item: GrafanaNavItem;
  level?: number;
  onNavigate?: () => void;
}

function NavItem({ item, level = 0, onNavigate }: NavItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const hasChildren = item.children && item.children.length > 0;
  const isActive = pathname === item.url || 
    (hasChildren && item.children.some(child => pathname === child.url));
  
  const Icon = item.icon ? iconComponents[item.icon] || HomeIcon : null;

  if (item.divider) {
    return <div className="my-2 border-t border-gray-700" />;
  }

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    } else if (item.url && !item.target) {
      onNavigate?.();
    }
  };

  const content = (
    <div
      className={`
        flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer
        transition-all duration-150 ease-in-out
        ${isActive 
          ? 'bg-blue-600 text-white' 
          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }
        ${level > 0 ? 'ml-4' : ''}
      `}
      onClick={handleClick}
    >
      <div className="flex items-center flex-1 min-w-0">
        {Icon && <Icon className="w-5 h-5 mr-3 flex-shrink-0" />}
        <span className="truncate">{item.text}</span>
        {item.badge && (
          <span className={`ml-2 px-2 py-0.5 text-xs rounded-full bg-${item.badge.color}-600`}>
            {item.badge.text}
          </span>
        )}
      </div>
      {hasChildren && (
        <div className="ml-2 flex-shrink-0">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
        </div>
      )}
    </div>
  );

  if (item.url && !hasChildren) {
    if (item.target === '_blank') {
      return (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {content}
        </a>
      );
    }
    return (
      <Link href={item.url} className="block">
        {content}
      </Link>
    );
  }

  return (
    <div>
      {content}
      {hasChildren && isExpanded && (
        <div className="mt-1">
          {item.children!.map((child) => (
            <NavItem
              key={child.id}
              item={child}
              level={level + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface GrafanaSidebarProps {
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  className?: string;
}

export default function GrafanaSidebar({ 
  collapsed = false, 
  onCollapse,
  className = '' 
}: GrafanaSidebarProps) {
  const navItems = createGrafanaStyleNavigation();
  const pathname = usePathname();
  
  return (
    <aside
      className={`
        ${className}
        bg-gray-900 text-gray-300 flex flex-col
        ${collapsed ? 'w-16' : 'w-64'}
        transition-all duration-300 ease-in-out
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="ml-3 text-lg font-semibold text-white">
              Manufacturing
            </span>
          </div>
        )}
        <button
          onClick={() => onCollapse?.(!collapsed)}
          className="p-1.5 rounded hover:bg-gray-800 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="px-3 py-3 border-b border-gray-800">
          <div className="relative">
            <input
              type="text"
              placeholder="Search dashboards..."
              className="w-full px-3 py-2 pl-9 text-sm bg-gray-800 border border-gray-700 rounded-md 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder-gray-500"
            />
            <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-gray-800 p-4">
        <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-medium">A</span>
          </div>
          {!collapsed && (
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-white truncate">Admin User</p>
              <p className="text-xs text-gray-400 truncate">admin@manufacturing.com</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-gray-800">
          <p className="text-xs text-gray-500">Manufacturing Analytics v1.0.0</p>
          <p className="text-xs text-gray-600">© 2024 Manufacturing Corp</p>
        </div>
      )}
    </aside>
  );
}