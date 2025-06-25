'use client';

import React, { useState, useEffect, createContext, useContext } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import GrafanaIntegratedSidebar from './GrafanaIntegratedSidebar';
import { QuickActions } from './QuickActions';
import { Menu, X } from 'lucide-react';

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

export default function DashboardLayoutRefactored({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  // Load sidebar state from localStorage
  useEffect(() => {
    const storedValue = localStorage.getItem('manufacturingSidebarCollapsed');
    if (storedValue) {
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
    localStorage.setItem('manufacturingSidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const setSidebarCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
  };

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setSidebarCollapsed }}>
      <div className="flex h-screen bg-gray-50">
        {/* Mobile Menu Button */}
        <button
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5 text-gray-600" />
          ) : (
            <Menu className="h-5 w-5 text-gray-600" />
          )}
        </button>

        {/* Sidebar - Desktop */}
        <div className="hidden lg:block">
          <GrafanaIntegratedSidebar />
        </div>

        {/* Sidebar - Mobile */}
        {isMobileMenuOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="lg:hidden fixed left-0 top-0 h-full z-40">
              <GrafanaIntegratedSidebar />
            </div>
          </>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900">
                Manufacturing Analytics Platform
              </h1>
              
              {/* Quick Actions */}
              <div className="flex items-center space-x-4">
                <QuickActions />
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}