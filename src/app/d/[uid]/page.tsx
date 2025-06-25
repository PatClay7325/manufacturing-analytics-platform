/**
 * Analytics dashboard View - Main dashboard viewer route
 * Route: /d/[uid] - Matches Analytics' dashboard URL pattern
 * 
 * This is a server component that loads dashboard configuration server-side
 * and passes it to the client-side viewer for interactivity
 */

import { notFound } from 'next/navigation';
import { DashboardViewer } from '@/components/dashboard/DashboardViewer';
import { dashboardPersistenceService } from '@/services/dashboardPersistenceService';
import { getTemplateById } from '@/templates/dashboards';
import type { Dashboard } from '@/types/dashboard';


// Force dynamic rendering because: Uses dashboardPersistenceService which accesses database
export const dynamic = 'force-dynamic';
interface DashboardPageProps {
  params: Promise<{ uid: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Load dashboard from persistence layer or create from template
 */
async function loadDashboard(uid: string): Promise<Dashboard | null> {
  try {
    // First try to load from persistence
    const dashboard = await dashboardPersistenceService.getDashboard(uid);
    if (dashboard) {
      return dashboard as Dashboard;
    }
  } catch (error) {
    console.log(`Dashboard ${uid} not found in persistence, checking templates`);
  }

  // Handle server-side demo dashboard
  if (uid === 'server-side-demo') {
    return {
      uid: 'server-side-demo',
      id: 'server-side-demo',
      title: 'Server-Side Manufacturing Demo',
      description: 'A dashboard created and managed entirely server-side',
      tags: ['server-side', 'manufacturing', 'demo'],
      panels: [
        {
          id: 1,
          title: 'Equipment Status',
          type: 'stat',
          gridPos: { x: 0, y: 0, w: 6, h: 8 },
          targets: [{ refId: 'A', metric: 'equipment_status' }],
          fieldConfig: {
            defaults: {
              unit: 'short',
              color: { mode: 'value' },
              thresholds: {
                mode: 'absolute',
                steps: [
                  { value: 0, color: 'red' },
                  { value: 80, color: 'yellow' },
                  { value: 90, color: 'green' }
                ]
              }
            },
            overrides: []
          },
          options: {
            reduceOptions: {
              values: false,
              calcs: ['lastNotNull'],
              fields: ''
            },
            textMode: 'auto',
            colorMode: 'background'
          },
          transparent: false,
          links: [],
          transformations: []
        },
        {
          id: 2,
          title: 'Production Rate Trend',
          type: 'timeseries',
          gridPos: { x: 6, y: 0, w: 18, h: 8 },
          targets: [{ refId: 'A', metric: 'production_rate' }],
          fieldConfig: {
            defaults: {
              unit: 'ops',
              custom: {
                drawStyle: 'line',
                lineInterpolation: 'smooth',
                lineWidth: 2,
                fillOpacity: 10,
                showPoints: 'never'
              }
            },
            overrides: []
          },
          options: {
            tooltip: { mode: 'multi', sort: 'none' },
            legend: { showLegend: true, displayMode: 'list', placement: 'bottom' }
          },
          transparent: false,
          links: [],
          transformations: []
        }
      ],
      templating: { list: [] },
      annotations: [],
      links: [],
      time: { from: 'now-6h', to: 'now' },
      timepicker: {},
      refresh: '30s',
      schemaVersion: 30,
      version: 1,
      timezone: 'browser',
      fiscalYearStartMonth: 0,
      liveNow: false,
      weekStart: 'monday',
      style: 'dark',
      editable: true,
      hideControls: false,
      graphTooltip: 1,
      preload: false,
      meta: {
        canEdit: true,
        canSave: true,
        canStar: true
      }
    };
  }

  // Check if this matches a template ID
  const template = getTemplateById(uid);
  if (template) {
    // Create dashboard from template
    const dashboard: Dashboard = {
      uid: uid,
      id: uid,
      title: template.name,
      description: template.description,
      tags: template.tags || [],
      ...template.config,
      version: 1,
      schemaVersion: 30,
      editable: true,
      hideControls: false,
      meta: {
        canEdit: true,
        canSave: true,
        canStar: true
      }
    };
    
    // Save to persistence for future use
    try {
      await dashboardPersistenceService.saveDashboard({
        dashboard,
        message: 'Created from template',
        userId: 'system',
        overwrite: false
      });
    } catch (error) {
      console.error('Failed to persist dashboard:', error);
    }
    
    return dashboard;
  }

  // For development: Create a default dashboard for any UID
  if (process.env.NODE_ENV === 'development') {
    return {
      uid: uid,
      id: uid,
      title: `Dashboard ${uid}`,
      description: 'Development dashboard',
      tags: ['development'],
      panels: [
        {
          id: 1,
          title: 'Sample Panel',
          type: 'timeseries',
          gridPos: { x: 0, y: 0, w: 24, h: 8 },
          targets: [{
            refId: 'A',
            metric: 'sample_metric'
          }],
          fieldConfig: {
            defaults: {},
            overrides: []
          },
          options: {},
          transparent: false,
          links: [],
          transformations: []
        }
      ],
      templating: { list: [] },
      annotations: [],
      links: [],
      time: {
        from: 'now-1h',
        to: 'now'
      },
      timepicker: {},
      refresh: '30s',
      schemaVersion: 30,
      version: 1,
      timezone: 'browser',
      fiscalYearStartMonth: 0,
      liveNow: false,
      weekStart: 'monday',
      style: 'dark',
      editable: true,
      hideControls: false,
      graphTooltip: 0,
      preload: false,
      meta: {
        canEdit: true,
        canSave: true,
        canStar: true
      }
    };
  }

  return null;
}

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  // Resolve the async params
  const { uid } = await params;
  const resolvedSearchParams = await searchParams;
  
  // Load dashboard server-side
  const dashboard = await loadDashboard(uid);
  
  if (!dashboard) {
    notFound();
  }

  // Extract query parameters
  const timeRange = {
    from: resolvedSearchParams?.from as string || dashboard.time?.from || 'now-1h',
    to: resolvedSearchParams?.to as string || dashboard.time?.to || 'now'
  };
  
  const refresh = resolvedSearchParams?.refresh as string || dashboard.refresh || '30s';
  const kiosk = resolvedSearchParams?.kiosk as string;
  const editMode = resolvedSearchParams?.edit === 'true' || resolvedSearchParams?.edit === '1';
  const viewPanel = resolvedSearchParams?.viewPanel as string;
  const editPanel = resolvedSearchParams?.editPanel as string;

  // Pass server-loaded dashboard to client viewer
  return (
    <div className="h-screen">
      <DashboardViewer
        dashboard={dashboard}
        timeRange={timeRange}
        refresh={refresh}
        variables={dashboard.templating?.list || []}
        editMode={editMode}
        viewPanel={viewPanel ? parseInt(viewPanel, 10) : undefined}
        editPanel={editPanel ? parseInt(editPanel, 10) : undefined}
        kiosk={kiosk}
      />
    </div>
  );
}