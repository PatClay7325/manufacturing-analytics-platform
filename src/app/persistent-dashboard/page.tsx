import React from 'react';

/**
 * Persistent Dashboard Page - Database-backed dashboard management
 * URL: /persistent-dashboard
 */

import { PersistentDashboard } from '@/components/dashboard/PersistentDashboard';

export default function PersistentDashboardPage() {
  return <PersistentDashboard />;
}

export const metadata = {
  title: 'Persistent Dashboard - Manufacturing Analytics',
  description: 'Database-backed dashboard persistence with save/load, versioning, and sharing capabilities',
};