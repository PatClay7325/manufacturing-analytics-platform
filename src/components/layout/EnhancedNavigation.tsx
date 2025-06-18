/**
 * Adaptive Factory Manufacturing Intelligence Platform
 * Enhanced Navigation Component
 * 
 * Comprehensive navigation with full platform features
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLink {
  name: string;
  href: string;
  icon?: string;
  submenu?: NavLink[];
  badge?: string;
  manufacturing?: boolean;
}

interface NavigationProps {
  simplified?: boolean;
}

export default function EnhancedNavigation({ simplified = false }: NavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const pathname = usePathname();
  
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);
  
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navLinks: NavLink[] = simplified ? [
    { name: 'Home', href: '/' },
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Equipment', href: '/equipment', icon: '⚙️' },
    { name: 'Alerts', href: '/alerts', icon: '🔔' },
    { name: 'AI Chat', href: '/manufacturing-chat', icon: '🤖' },
    { name: 'Documentation', href: '/documentation', icon: '📚' },
  ] : [
    // Core Platform
    { name: 'Home', href: '/', icon: '🏠' },
    
    // Dashboards Section
    {
      name: 'Dashboards',
      href: '/dashboards',
      icon: '📊',
      submenu: [
        { name: 'Browse Dashboards', href: '/dashboards' },
        { name: 'Create Dashboard', href: '/dashboards/new' },
        { name: 'Templates', href: '/dashboards/templates' },
        { name: 'Folders', href: '/dashboards/folders' }
      ]
    },
    
    // Data Exploration
    {
      name: 'Explore',
      href: '/explore',
      icon: '🔍',
      manufacturing: true,
      submenu: [
        { name: 'Query Builder', href: '/explore' },
        { name: 'Metrics Explorer', href: '/explore/metrics' },
        { name: 'Logs Explorer', href: '/explore/logs' },
        { name: 'Traces Explorer', href: '/explore/traces' }
      ]
    },
    
    // Manufacturing Intelligence
    {
      name: 'Manufacturing',
      href: '/manufacturing',
      icon: '🏭',
      manufacturing: true,
      submenu: [
        { name: 'OEE Overview', href: '/manufacturing/oee' },
        { name: 'Production Lines', href: '/manufacturing/lines' },
        { name: 'Equipment Status', href: '/equipment', icon: '⚙️' },
        { name: 'Quality Control', href: '/manufacturing/quality' },
        { name: 'Maintenance', href: '/manufacturing/maintenance' },
        { name: 'Energy Monitoring', href: '/manufacturing/energy' }
      ]
    },
    
    // Alerting System
    {
      name: 'Alerting',
      href: '/alerting',
      icon: '🔔',
      badge: '3',
      submenu: [
        { name: 'Alert Rules', href: '/alerting/rules' },
        { name: 'Contact Points', href: '/alerting/contacts' },
        { name: 'Notification Policies', href: '/alerting/policies' },
        { name: 'Silences', href: '/alerting/silences' },
        { name: 'Alert History', href: '/alerts' }
      ]
    },
    
    // AI & Analytics
    {
      name: 'AI & Analytics',
      href: '/ai',
      icon: '🤖',
      manufacturing: true,
      submenu: [
        { name: 'Manufacturing Chat', href: '/manufacturing-chat' },
        { name: 'Predictive Analytics', href: '/ai/predictive' },
        { name: 'Root Cause Analysis', href: '/ai/root-cause' },
        { name: 'Process Optimization', href: '/ai/optimization' }
      ]
    },
    
    // Administration
    {
      name: 'Administration',
      href: '/admin',
      icon: '⚙️',
      submenu: [
        { name: 'Data Sources', href: '/admin/datasources' },
        { name: 'Users & Teams', href: '/admin/users' },
        { name: 'Plugins', href: '/admin/plugins' },
        { name: 'Configuration', href: '/admin/config' },
        { name: 'System Health', href: '/admin/health' },
        { name: 'Audit Logs', href: '/admin/logs' }
      ]
    },
    
    // Help & Documentation
    {
      name: 'Help',
      href: '/help',
      icon: '❓',
      submenu: [
        { name: 'Documentation', href: '/documentation' },
        { name: 'API Reference', href: '/help/api' },
        { name: 'Getting Started', href: '/help/getting-started' },
        { name: 'Troubleshooting', href: '/help/troubleshooting' },
        { name: 'Support', href: '/support' }
      ]
    }
  ];

  const isActivePath = (path: string): boolean => {
    if (path === '/' && pathname !== '/') {
      return false;
    }
    return pathname?.startsWith(path) ?? false;
  };

  const hasActiveSubmenu = (submenu?: NavLink[]): boolean => {
    if (!submenu) return false;
    return submenu.some(item => isActivePath(item.href));
  };

  const toggleSubmenu = (linkName: string) => {
    setExpandedMenus(prev => 
      prev.includes(linkName) 
        ? prev.filter(name => name !== linkName)
        : [...prev, linkName]
    );
  };

  const renderNavLink = (link: NavLink, isMobile = false) => {
    const hasSubmenu = link.submenu && link.submenu.length > 0;
    const isExpanded = expandedMenus.includes(link.name);
    const isActive = isActivePath(link.href);
    const hasActiveChild = hasActiveSubmenu(link.submenu);

    if (hasSubmenu) {
      return (
        <div key={link.name} className="relative group">
          <button
            onClick={() => isMobile && toggleSubmenu(link.name)}
            className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive || hasActiveChild
                ? 'bg-blue-100 text-blue-900'
                : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            } ${link.manufacturing ? 'border-l-2 border-blue-500' : ''}`}
          >
            <div className="flex items-center space-x-2">
              {link.icon && <span className="text-lg">{link.icon}</span>}
              <span>{link.name}</span>
              {link.badge && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {link.badge}
                </span>
              )}
            </div>
            {isMobile && (
              <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            )}
          </button>

          {/* Desktop Dropdown */}
          {!isMobile && (
            <div className="absolute left-0 mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="py-2">
                {link.submenu!.map((subLink) => (
                  <Link
                    key={subLink.href}
                    href={subLink.href}
                    className={`block px-4 py-2 text-sm transition-colors ${
                      isActivePath(subLink.href)
                        ? 'bg-blue-50 text-blue-900 border-r-2 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {subLink.icon && <span>{subLink.icon}</span>}
                      <span>{subLink.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Mobile Submenu */}
          {isMobile && isExpanded && (
            <div className="ml-4 mt-2 space-y-1">
              {link.submenu!.map((subLink) => (
                <Link
                  key={subLink.href}
                  href={subLink.href}
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActivePath(subLink.href)
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center space-x-2">
                    {subLink.icon && <span>{subLink.icon}</span>}
                    <span>{subLink.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={link.href}
        href={link.href}
        className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive
            ? 'bg-blue-100 text-blue-900'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
        } ${link.manufacturing ? 'border-l-2 border-blue-500' : ''}`}
        onClick={() => isMobile && setIsMenuOpen(false)}
      >
        {link.icon && <span className="text-lg">{link.icon}</span>}
        <span>{link.name}</span>
        {link.badge && (
          <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            {link.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AF</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold text-gray-900">Adaptive Factory</span>
                <span className="block text-xs text-gray-600">Manufacturing Intelligence</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.slice(0, 6).map(link => renderNavLink(link))}
            
            {/* More Menu for Additional Items */}
            {navLinks.length > 6 && (
              <div className="relative group">
                <button className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md">
                  <span>More</span>
                  <span>▼</span>
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-2">
                    {navLinks.slice(6).map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`block px-4 py-2 text-sm transition-colors ${
                          isActivePath(link.href)
                            ? 'bg-blue-50 text-blue-900'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          {link.icon && <span>{link.icon}</span>}
                          <span>{link.name}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <span className="block h-6 w-6 text-xl">✕</span>
              ) : (
                <span className="block h-6 w-6 text-xl">☰</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
            {navLinks.map(link => renderNavLink(link, true))}
          </div>
        </div>
      )}
    </nav>
  );
}