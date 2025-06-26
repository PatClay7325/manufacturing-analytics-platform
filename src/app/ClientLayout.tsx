'use client';

import React from 'react';

import { AuthProvider } from '@/contexts/AuthContext';
import { HelpProvider } from '@/contexts/HelpContext';
import { KeyboardProvider } from '@/providers/KeyboardProvider';
import { DashboardLayout } from '@/components/layout/DashboardLayout';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <HelpProvider>
        <KeyboardProvider>
          <DashboardLayout>
            {children}
          </DashboardLayout>
        </KeyboardProvider>
      </HelpProvider>
    </AuthProvider>
  );
}