import React from 'react';

/**
 * Test Dashboard Page - Route for testing the plugin system
 * URL: /test-dashboard
 */

import { SimpleDashboard } from '@/components/dashboard/SimpleDashboard';

export default function TestDashboardPage() {
  return <SimpleDashboard />;
}

export const metadata = {
  title: 'Test Dashboard - Plugin System Demo',
  description: 'Testing the Grafana parity plugin system implementation',
};