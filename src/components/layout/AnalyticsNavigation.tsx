'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  HomeIcon,
  PlusIcon,
  ChartBarIcon,
  MapIcon,
  BellIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  Squares2X2Icon,
  FolderIcon,
  ArrowUpTrayIcon,
  SpeakerWaveIcon,
  ChatBubbleLeftEllipsisIcon,
  NoSymbolIcon,
  RectangleGroupIcon,
  CircleStackIcon,
  UserIcon,
  UsersIcon,
  PuzzlePieceIcon,
  AdjustmentsHorizontalIcon,
  KeyIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
  ChartBarSquareIcon,
  BugAntIcon,
  CodeBracketIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
  GlobeAltIcon,
  CameraIcon,
  EyeIcon,
  BuildingOfficeIcon,
  ChatBubbleLeftIcon,
  SignalIcon,
  ArrowsUpDownIcon,
  BuildingOffice2Icon,
  ArrowDownIcon,
  ArrowUpIcon,
  InformationCircleIcon,
  CommandLineIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { NavTreeNode, bootstrapManager } from '@/lib/analytics-bootstrap';

interface AnalyticsNavigationProps {
  className?: string;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  'home-alt': HomeIcon,
  'plus': PlusIcon,
  'apps': Squares2X2Icon,
  'folder': FolderIcon,
  'import': ArrowUpTrayIcon,
  'bell': BellIcon,
  'compass': MapIcon,
  'sitemap': MapIcon,
  'presentation-play': SpeakerWaveIcon,
  'comment-alt-share': ChatBubbleLeftEllipsisIcon,
  'bell-slash': NoSymbolIcon,
  'layer-group': RectangleGroupIcon,
  'cog': CogIcon,
  'database': CircleStackIcon,
  'user': UserIcon,
  'users-alt': UsersIcon,
  'plug': PuzzlePieceIcon,
  'sliders-v-alt': AdjustmentsHorizontalIcon,
  'key-skeleton-alt': KeyIcon,
  'question-circle': QuestionMarkCircleIcon,
  'document-info': DocumentTextIcon,
  'chart-bar': ChartBarIcon,
  'code-branch': CodeBracketIcon,
  'external-link-alt': ArrowTopRightOnSquareIcon,
  'chart-line': ChartBarSquareIcon,
  'bug': BugAntIcon,
  'shield': ShieldCheckIcon,
  'shield-check': ShieldCheckIcon,
  'wrench': WrenchScrewdriverIcon,
  'globe-alt': GlobeAltIcon,
  'camera': CameraIcon,
  'eye': EyeIcon,
  'office-building': BuildingOffice2Icon,
  'chat': ChatBubbleLeftIcon,
  'signal': SignalIcon,
  'arrow-up-down': ArrowsUpDownIcon,
  'arrow-down': ArrowDownIcon,
  'arrow-up': ArrowUpIcon,
  'information-circle': InformationCircleIcon,
  'command-line': CommandLineIcon,
  'factory': BuildingOffice2Icon,
  'cloud-upload': ArrowUpIcon,
  'list-ul': ArrowsUpDownIcon,
  'link': CommandLineIcon,
  'search': MagnifyingGlassIcon,
  'life-ring': QuestionMarkCircleIcon
};

const getIcon = (iconName?: string) => {
  if (!iconName) return HomeIcon;
  return iconMap[iconName] || HomeIcon;
};

interface NavItemProps {
  item: NavTreeNode;
  level: number;
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
}

function NavItem({ item, level, collapsed, pathname, onNavigate }: NavItemProps) {
  const [isExpanded, setIsExpanded] = useState(item.id === 'dashboards' || item.id === 'manufacturing');
  const hasChildren = item.children && item.children.length > 0;
  const isActive = pathname === item.url || (item.children?.some(child => pathname === child.url));
  const IconComponent = getIcon(item.icon);

  useEffect(() => {
    if (isActive && hasChildren) {
      setIsExpanded(true);
    }
  }, [isActive, hasChildren]);

  // Handle divider items
  if (item.divider) {
    return <div className="my-2 mx-3 border-t border-gray-200 dark:border-gray-700" />;
  }

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    onNavigate?.();
  };

  const itemContent = (
    <div
      className={`
        flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors duration-200
        ${isActive 
          ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100' 
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
        }
        ${level > 0 ? `ml-${level * 4}` : ''}
        ${collapsed && level === 0 ? 'justify-center' : ''}
      `}
      onClick={hasChildren ? handleClick : undefined}
    >
      <IconComponent className={`h-5 w-5 ${collapsed && level === 0 ? '' : 'mr-3'} flex-shrink-0`} />
      
      {(!collapsed || level > 0) && (
        <>
          <span className="flex-1 text-left">{item.text}</span>
          {hasChildren && (
            <div className="ml-auto">
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4" />
              ) : (
                <ChevronRightIcon className="h-4 w-4" />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="w-full">
      {item.url && !hasChildren ? (
        item.target === '_blank' ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
            {itemContent}
          </a>
        ) : (
          <Link href={item.url} className="block">
            {itemContent}
          </Link>
        )
      ) : (
        <button className="w-full text-left" onClick={handleClick}>
          {itemContent}
        </button>
      )}

      {hasChildren && isExpanded && (!collapsed || level > 0) && (
        <div className="mt-1 space-y-1">
          {item.children?.map((child) => (
            <NavItem
              key={child.id}
              item={child}
              level={level + 1}
              collapsed={false}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SearchBarProps {
  collapsed: boolean;
}

function SearchBar({ collapsed }: SearchBarProps) {
  if (collapsed) return null;

  return (
    <div className="px-3 py-2">
      <div className="relative">
        <input
          type="text"
          placeholder="Search dashboards..."
          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

interface UserProfileProps {
  collapsed: boolean;
}

function UserProfile({ collapsed }: UserProfileProps) {
  const config = bootstrapManager.getConfig();
  const user = config?.user;

  if (!user) return null;

  return (
    <div className={`px-3 py-4 border-t border-gray-200 dark:border-gray-700 ${collapsed ? 'text-center' : ''}`}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
        {!collapsed && (
          <div className="ml-3 min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {user.name || user.email}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.orgName}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsNavigation({ 
  className = '',
  collapsed = false,
  onCollapse
}: AnalyticsNavigationProps) {
  const pathname = usePathname();
  const [navItems, setNavItems] = useState<NavTreeNode[]>([]);

  useEffect(() => {
    const config = bootstrapManager.getConfig();
    if (config) {
      setNavItems(config.settings.navTree);
    }
  }, []);

  const toggleCollapse = () => {
    onCollapse?.(!collapsed);
  };

  return (
    <nav
      className={`
        ${className}
        ${collapsed ? 'w-16' : 'w-64'}
        bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
        flex flex-col h-full transition-all duration-300 ease-in-out
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <div className="flex items-center">
            <Squares2X2Icon className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Manufacturing Analytics
            </span>
          </div>
        )}
        <button
          onClick={toggleCollapse}
          className="p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <SearchBar collapsed={collapsed} />

      {/* Navigation Items */}
      <div className="flex-1 overflow-y-auto py-4">
        <div className="space-y-1 px-3">
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              level={0}
              collapsed={collapsed}
              pathname={pathname}
            />
          ))}
        </div>
      </div>

      {/* User Profile */}
      <UserProfile collapsed={collapsed} />

      {/* Footer Info */}
      {!collapsed && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <div>Manufacturing Intelligence Platform</div>
            <div>v1.0.0 (development)</div>
          </div>
        </div>
      )}
    </nav>
  );
}