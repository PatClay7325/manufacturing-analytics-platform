/**
 * Analytics Dashboard Page - Server-side dashboard configuration
 * This page ensures the manufacturing analytics dashboard exists and redirects
 * to the standard Analytics-style dashboard viewer
 */

import { redirect } from 'next/navigation';
import { dashboardPersistenceService } from '@/services/dashboardPersistenceService';
import { getTemplateById } from '@/templates/dashboards';

// Force dynamic rendering since we interact with the database
export const dynamic = 'force-dynamic';

// Default dashboard configuration
const ANALYTICS_DASHBOARD_UID = 'manufacturing-analytics';
const DEFAULT_TEMPLATE_ID = 'production-overview';

interface AnalyticsDashboardPageProps {
  searchParams?: {
    [key: string]: string | string[] | undefined;
  };
}

async function ensureAnalyticsDashboardExists() {
  try {
    // Try to load existing dashboard
    const existingDashboard = await dashboardPersistenceService.getDashboard(ANALYTICS_DASHBOARD_UID);
    if (existingDashboard) {
      return true;
    }
  } catch (error) {
    console.log('Dashboard not found, creating from template');
  }

  // Create dashboard from template
  const template = getTemplateById(DEFAULT_TEMPLATE_ID);
  if (!template) {
    throw new Error('Dashboard template not found');
  }

  // Create new dashboard from template
  const newDashboard = {
    uid: ANALYTICS_DASHBOARD_UID,
    title: 'Manufacturing Analytics Dashboard',
    description: 'Comprehensive manufacturing analytics with real-time production metrics, OEE, quality indicators, and equipment monitoring',
    tags: ['manufacturing', 'analytics', 'production', 'oee'],
    ...template.config,
    editable: true,
    hideControls: false,
  };

  // Save the dashboard
  await dashboardPersistenceService.saveDashboard({
    dashboard: newDashboard,
    message: 'Initial dashboard creation from template',
    userId: 'system',
    overwrite: false,
  });

  return true;
}

export default async function AnalyticsDashboardPage({ searchParams }: AnalyticsDashboardPageProps) {
  // Ensure the analytics dashboard exists
  await ensureAnalyticsDashboardExists();

  // Build redirect URL with all search params
  const params = new URLSearchParams();
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v));
      } else if (value) {
        params.set(key, value);
      }
    });
  }

  // Redirect to the standard dashboard viewer
  const redirectUrl = `/d/${ANALYTICS_DASHBOARD_UID}/manufacturing-analytics${
    params.toString() ? `?${params.toString()}` : ''
  }`;
  
  redirect(redirectUrl);
}