'use client';

import React from 'react';

import { AuthProvider } from '@/contexts/AuthContext';
import { DashboardLayout } from './DashboardLayout';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <AuthProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthProvider>
  );
}