import React from 'react';

/**
 * Prometheus Dashboard Page - Real data source integration demo
 * URL: /prometheus-dashboard
 */

import { PrometheusDataSourceDashboard } from '@/components/dashboard/PrometheusDataSourceDashboard';

export default function PrometheusDashboardPage() {
  return <PrometheusDataSourceDashboard />;
}

export const metadata = {
  title: 'Prometheus Dashboard - Manufacturing Analytics',
  description: 'Real-time manufacturing metrics with Prometheus data source integration and PromQL queries',
};