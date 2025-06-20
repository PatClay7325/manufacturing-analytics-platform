'use client';

import React, { useState, useRef, useEffect, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Plus, LayoutGrid, FolderPlus, Upload, Bell, 
  Home, Compass, List, MessageSquare, Network, 
  BellOff, Layers, Settings, Database, Users, 
  UsersIcon, Plug, SlidersHorizontal, KeyRound,
  HelpCircle, ChevronDown, ChevronRight, Search,
  Clock, Star, Filter, ChevronLeft,
  Factory, Gauge, Wrench, ClipboardList, LineChart,
  Activity, BarChart3, FileText, Zap, Globe, Shield,
  Menu, X
} from 'lucide-react';

interface NavItem {
  id: string;
  text: string;
  icon?: React.ComponentType<{ className?: string }>;
  url?: string;
  section?: string;
  children?: NavItem[];
  divider?: boolean;
}

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

// Sidebar Context
interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within DashboardLayout');
  }
  return context;
};

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['dashboards']));
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const navTree: NavItem[] = [
    {
      id: 'create',
      text: 'Create',
      section: 'core',
      icon: Plus,
      children: [
        { id: 'create-dashboard', text: 'Dashboard', icon: LayoutGrid, url: '/dashboards/new' },
        { id: 'folder', text: 'Folder', icon: FolderPlus, url: '/dashboards/folder/new' },
        { id: 'import', text: 'Import', icon: Upload, url: '/dashboards/import' },
        { id: 'alert', text: 'Alert rule', icon: Bell, url: '/alerts/new' }
      ]
    },
    {
      id: 'dashboards',
      text: 'Dashboards',
      section: 'core',
      icon: LayoutGrid,
      url: '/dashboards',
      children: [
        { id: 'home', text: 'Home', icon: Home, url: '/' },
        { id: 'divider-1', text: '', divider: true },
        { id: 'browse', text: 'Browse', icon: Network, url: '/dashboards/browse' },
        { id: 'divider-2', text: '', divider: true },
        { id: 'manufacturing-overview', text: 'Manufacturing Overview', icon: Factory, url: '/Analytics-dashboard' },
        { id: 'oee-Analytics', text: 'OEE Analytics', icon: Gauge, url: '/dashboards/oee' },
        { id: 'equipment-health', text: 'Equipment Health', icon: Activity, url: '/equipment' },
        { id: 'production-lines', text: 'Production Lines', icon: LineChart, url: '/dashboards/production' },
        { id: 'quality-control', text: 'Quality Control', icon: ClipboardList, url: '/dashboards/quality' },
        { id: 'maintenance', text: 'Maintenance', icon: Wrench, url: '/dashboards/maintenance' },
        { id: 'root-cause', text: 'Root Cause Analysis', icon: BarChart3, url: '/dashboards/rca' }
      ]
    },
    {
      id: 'explore',
      text: 'Explore',
      section: 'core',
      icon: Compass,
      url: '/explore'
    },
    {
      id: 'alerting',
      text: 'Alerting',
      section: 'core',
      icon: Bell,
      url: '/alerts',
      children: [
        { id: 'alert-list', text: 'Alert rules', icon: List, url: '/alerts' },
        { id: 'receivers', text: 'Contact points', icon: MessageSquare, url: '/alerts/receivers' },
        { id: 'am-routes', text: 'Notification policies', icon: Network, url: '/alerts/routes' },
        { id: 'silences', text: 'Silences', icon: BellOff, url: '/alerts/silences' },
        { id: 'groups', text: 'Alert groups', icon: Layers, url: '/alerts/groups' },
        { id: 'alerting-admin', text: 'Admin', icon: Settings, url: '/alerts/admin' }
      ]
    },
    {
      id: 'apps',
      text: 'Apps',
      section: 'core',
      icon: Zap,
      children: [
        { id: 'manufacturing-ai', text: 'Manufacturing AI', icon: Zap, url: '/manufacturing-chat' },
        { id: 'integrations', text: 'Integrations', icon: Globe, url: '/dashboards/integrations' },
        { id: 'reports', text: 'Reports', icon: FileText, url: '/dashboards/reports' }
      ]
    },
    {
      id: 'cfg',
      text: 'Configuration',
      section: 'core',
      icon: Settings,
      children: [
        { id: 'datasources', text: 'Data sources', icon: Database, url: '/datasources' },
        { id: 'users', text: 'Users', icon: Users, url: '/admin/users' },
        { id: 'teams', text: 'Teams', icon: UsersIcon, url: '/admin/teams' },
        { id: 'plugins', text: 'Plugins', icon: Plug, url: '/admin/plugins' },
        { id: 'org-settings', text: 'Preferences', icon: SlidersHorizontal, url: '/admin/preferences' },
        { id: 'apikeys', text: 'API keys', icon: KeyRound, url: '/admin/apikeys' },
        { id: 'security', text: 'Security', icon: Shield, url: '/dashboards/security' }
      ]
    },
    {
      id: 'help',
      text: 'Help',
      section: 'config',
      icon: HelpCircle,
      url: '/documentation'
    }
  ];

  // Initialize from localStorage
  useEffect(() => {
    const storedValue = localStorage?.getItem('grafanaSidebarCollapsed');
    if (storedValue !== null) {
      setIsCollapsed(JSON.parse(storedValue));
    }

    // Handle responsive behavior
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
        setIsMobileMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage?.setItem('grafanaSidebarCollapsed', JSON.stringify(isCollapsed));

    // Dispatch custom event for other components
    const event = new CustomEvent('grafanaSidebarStateChange', {
      detail: { collapsed: isCollapsed }
    });
    document.dispatchEvent(event);
  }, [isCollapsed]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const setSidebarCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded?.has(sectionId)) {
      newExpanded?.delete(sectionId);
    } else {
      newExpanded?.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const isActiveUrl = (url?: string) => {
    if (!url) return false;
    return pathname === url || pathname?.startsWith(url);
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const Icon = item?.icon;
    const hasChildren = item?.children && item?.children.length > 0;
    const isExpanded = expandedSections?.has(item?.id);
    const isActive = isActiveUrl(item?.url);

    if (item?.divider) {
      return <div key={item?.id} className="border-t border-gray-200 my-2" />;
    }

    return (
      <div key={item?.id}>
        <div
          className={`
            flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer
            transition-all duration-200
            ${isActive 
              ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-500 -ml-[1px]' 
              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            }
            ${depth > 0 ? 'ml-4' : ''}
            ${isCollapsed && depth === 0 ? 'justify-center' : ''}
          `}
          onClick={() => {
            if (hasChildren) {
              toggleSection(item?.id);
            }
          }}
        >
          <Link 
            href={item?.url || '#'} 
            className={`flex items-center ${isCollapsed && depth === 0 ? '' : 'flex-1'}`}
            onClick={(e) => {
              if (hasChildren && !item?.url) {
                e?.preventDefault();
              }
            }}
          >
            {Icon && (
              <Icon className={`h-4 w-4 flex-shrink-0 ${isCollapsed && depth === 0 ? '' : 'mr-3'}`} />
            )}
            {(!isCollapsed || depth > 0) && (
              <span className="flex-1">{item?.text}</span>
            )}
          </Link>
          {hasChildren && (!isCollapsed || depth > 0) && (
            <div className="ml-2">
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </div>
          )}
        </div>
        
        {hasChildren && isExpanded && (!isCollapsed || depth > 0) && (
          <div className="mt-1">
            {item?.children!.map(child => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const sidebarContextValue = {
    isCollapsed,
    toggleSidebar,
    setSidebarCollapsed
  };

  return (
    <SidebarContext.Provider value={sidebarContextValue}>
      <div className="flex h-screen bg-gray-50">
        {/* Mobile Menu Button */}
        <button
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Sidebar */}
        <div
          ref={sidebarRef}
          className={`
            ${isCollapsed ? 'w-16' : 'w-60'}
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            fixed lg:relative h-full bg-white border-r border-gray-200 flex flex-col shadow-sm
            transition-all duration-300 ease-in-out z-40
          `}
        >
          {/* Logo */}
          <div className={`p-4 border-b border-gray-200 ${isCollapsed ? 'px-2' : ''}`}>
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">M</span>
              </div>
              {!isCollapsed && (
                <span className="text-gray-900 font-semibold">Manufacturing</span>
              )}
            </Link>
          </div>

          {/* Search */}
          {!isCollapsed && (
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search dashboards"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e?.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-700 placeholder-gray-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3">
            {navTree?.map(item => renderNavItem(item))}
          </nav>

          {/* Collapse Toggle */}
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={toggleSidebar}
              className="w-full flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* User Menu */}
          {!isCollapsed && (
            <div className="p-3 border-t border-gray-200">
              <div className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md cursor-pointer">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-gray-300 rounded-full mr-3" />
                  <span>Admin</span>
                </div>
                <ChevronDown className="h-3 w-3" />
              </div>
            </div>
          )}
        </div>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Top Bar */}
          <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4">
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-gray-900">
                <Clock className="h-4 w-4" />
              </button>
              <button className="text-gray-600 hover:text-gray-900">
                <Star className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="text-gray-600 hover:text-gray-900">
                <Filter className="h-4 w-4" />
              </button>
              <button className="text-gray-600 hover:text-gray-900">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Page Content */}
          <div className="flex-1 overflow-auto bg-gray-50">
            {children}
          </div>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}