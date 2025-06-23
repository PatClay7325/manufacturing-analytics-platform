import React from 'react';

/**
 * Variable Dashboard Page - Template variable system demonstration
 * URL: /variable-dashboard
 */

import { VariableDashboard } from '@/components/dashboard/VariableDashboard';

export default function VariableDashboardPage() {
  return <VariableDashboard />;
}

export const metadata = {
  title: 'Variable Dashboard - Manufacturing Analytics',
  description: 'Analytics-style template variable system with dynamic dashboards and variable interpolation',
};