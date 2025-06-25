import React from 'react';

/**
 * Enhanced Dashboard Page - Advanced AnalyticsPlatform-like dashboard
 * URL: /enhanced-dashboard
 */

import { EnhancedDashboard } from '@/components/dashboard/EnhancedDashboard';

export default function EnhancedDashboardPage() {
  return <EnhancedDashboard />;
}

export const metadata = {
  title: 'Enhanced Dashboard - Manufacturing Analytics',
  description: 'Advanced dashboard with AnalyticsPlatform-like features: time controls, grid layout, and panel management',
};