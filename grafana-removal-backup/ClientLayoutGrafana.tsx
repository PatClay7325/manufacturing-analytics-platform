'use client';

import { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { PreferencesProvider } from '@/contexts/PreferencesContext';
import GrafanaSidebar from '@/components/layout/GrafanaSidebar';
import { usePathname } from 'next/navigation';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  // Define pages that should not show the sidebar
  const noSidebarPages = ['/login', '/register', '/reset-password'];
  const showSidebar = !noSidebarPages.includes(pathname);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {showSidebar && (
        <GrafanaSidebar
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
          className="flex-shrink-0"
        />
      )}
      <main className="flex-1 overflow-y-auto">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function ClientLayoutGrafana({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <LayoutContent>
          {children}
        </LayoutContent>
      </PreferencesProvider>
    </AuthProvider>
  );
}