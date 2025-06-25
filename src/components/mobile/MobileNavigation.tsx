'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home,
  BarChart3,
  AlertCircle,
  Settings,
  Menu,
  X,
  ChevronRight,
  Bell,
  Search,
  User,
  LogOut,
  HelpCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { usePWA } from '@/lib/pwa/PWAProvider';
import { MobileNavigationItem } from '@/types/pwa';

const navigationItems: MobileNavigationItem[] = [
  { id: 'home', label: 'Home', icon: Home, href: '/' },
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, href: '/dashboard' },
  { id: 'alerts', label: 'Alerts', icon: AlertCircle, href: '/alerts' },
  { id: 'equipment', label: 'Equipment', icon: Settings, href: '/equipment' },
];

export function MobileNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(3);
  const pathname = usePathname();
  const router = useRouter();
  const { isOffline, deviceCapabilities } = usePWA();

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Top Navigation Bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 pt-safe-top">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6 text-gray-700" />
          </button>

          <h1 className="text-lg font-semibold text-gray-900">Factory AI</h1>

          <div className="flex items-center space-x-2">
            {isOffline && (
              <div className="p-2 text-orange-600">
                <WifiOff className="h-5 w-5" />
              </div>
            )}
            <button
              onClick={() => router.push('/notifications')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="h-6 w-6 text-gray-700" />
              {alertCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Bottom Tab Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-safe-bottom">
        <div className="grid grid-cols-4 h-16">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center justify-center space-y-1 relative transition-colors ${
                  active
                    ? 'text-primary-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
                {item.id === 'alerts' && alertCount > 0 && (
                  <span className="absolute top-1 right-1/4 h-2 w-2 bg-red-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Slide-out Menu */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transform transition-transform duration-300 ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black transition-opacity duration-300 ${
            isMenuOpen ? 'opacity-50' : 'opacity-0'
          }`}
          onClick={() => setIsMenuOpen(false)}
        />

        {/* Menu Content */}
        <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-xl flex flex-col">
          {/* Menu Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 pt-safe-top">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 -mr-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-6 w-6 text-gray-700" />
            </button>
          </div>

          {/* User Section */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                <User className="h-5 w-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">John Doe</p>
                <p className="text-xs text-gray-500">john.doe@factory.ai</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <button
                    key={item.id}
                    onClick={() => router.push(item.href)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      active
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 space-y-1">
              <button
                onClick={() => router.push('/search')}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Search className="h-5 w-5" />
                <span className="font-medium">Search</span>
              </button>
              <button
                onClick={() => router.push('/help')}
                className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <HelpCircle className="h-5 w-5" />
                <span className="font-medium">Help & Support</span>
              </button>
            </div>
          </nav>

          {/* Connection Status */}
          {isOffline && (
            <div className="p-4 bg-orange-50 border-t border-orange-200">
              <div className="flex items-center space-x-2 text-orange-700">
                <WifiOff className="h-5 w-5" />
                <span className="text-sm font-medium">You're offline</span>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <div className="p-4 border-t border-gray-200 pb-safe-bottom">
            <button
              onClick={() => {
                // Handle logout
                router.push('/logout');
              }}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}