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
  Menu, X, User, LogOut, Code, TestTube, Beaker,
  FlaskConical, GitBranch, Terminal, Bug, Brain,
  HeartPulse, Stethoscope, History, ListOrdered,
  ShieldCheck, LifeBuoy, Keyboard, Info, Cog
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { bootstrapManager } from '@/lib/analytics-bootstrap';
import { convertNavTreeForDashboard } from '@/lib/navigation-utils';
import { QuickActions } from './QuickActions';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();

  // Get navigation from bootstrap configuration
  const bootstrapConfig = bootstrapManager.getConfig() || bootstrapManager.initializeBootstrapConfig();
  const bootstrapNavTree = bootstrapConfig.settings.navTree;
  const navTree: NavItem[] = convertNavTreeForDashboard(bootstrapNavTree);

  // Initialize expanded sections based on improved structure
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['operations', 'intelligence']));

  // Initialize from localStorage
  useEffect(() => {
    const storedValue = localStorage?.getItem('manufacturingSidebarCollapsed');
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
    localStorage?.setItem('manufacturingSidebarCollapsed', JSON.stringify(isCollapsed));

    // Dispatch custom event for other components
    const event = new CustomEvent('manufacturingSidebarStateChange', {
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
          {item?.target === '_blank' ? (
            <a 
              href={item?.url || '#'} 
              target="_blank"
              rel="noopener noreferrer"
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
            </a>
          ) : (
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
          )}
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

          {/* Quick Actions - Only show when not collapsed */}
          {!isCollapsed && <QuickActions />}

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
          {!isCollapsed && user && (
            <div className="p-3 border-t border-gray-200 relative">
              <div 
                className="flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md cursor-pointer"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mr-3 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold">
                      {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="block font-medium">{user.name || user.email}</span>
                    <span className="block text-xs text-gray-500 capitalize">{user.role}</span>
                  </div>
                </div>
                <ChevronDown className={`h-3 w-3 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </div>
              
              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute bottom-full left-3 right-3 mb-2 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
                  <Link
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </Link>
                  <Link
                    href="/api-keys"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <KeyRound className="h-4 w-4 mr-3" />
                    API Keys
                  </Link>
                  <Link
                    href="/teams"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <UsersIcon className="h-4 w-4 mr-3" />
                    Teams
                  </Link>
                  <hr className="border-t border-gray-200" />
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Sign Out
                  </button>
                </div>
              )}
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
              {/* User Avatar for Mobile */}
              {user && (
                <div className="lg:hidden">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center"
                  >
                    <span className="text-white text-sm font-semibold">
                      {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                    </span>
                  </button>
                </div>
              )}
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

export default DashboardLayout;
