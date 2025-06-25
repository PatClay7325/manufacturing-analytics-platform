/**
 * Simple Server-Side Dashboard Demo
 * Demonstrates basic server-side dashboard rendering without complex features
 */

import { DashboardViewer } from '@/components/dashboard/DashboardViewer';
import type { Dashboard } from '@/types/dashboard';

// Force dynamic rendering as this page has async operations that simulate data loading
export const dynamic = 'force-dynamic';

// Server-side dashboard creation
async function createServerDashboard(): Promise<Dashboard> {
  // Simulate loading from database or template
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    uid: 'server-demo',
    id: 'server-demo',
    title: 'Server-Side Demo Dashboard',
    description: 'Dashboard created and configured server-side',
    tags: ['server-side', 'demo'],
    panels: [
      {
        id: 1,
        title: 'Server-Generated Panel',
        type: 'stat',
        gridPos: { x: 0, y: 0, w: 12, h: 8 },
        targets: [{
          refId: 'A',
          metric: 'server_metric'
        }],
        fieldConfig: {
          defaults: {},
          overrides: []
        },
        options: {},
        transparent: false,
        links: [],
        transformations: []
      },
      {
        id: 2,
        title: 'Production Metrics',
        type: 'timeseries',
        gridPos: { x: 12, y: 0, w: 12, h: 8 },
        targets: [{
          refId: 'A',
          metric: 'production_rate'
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

export default async function SimpleServerDemoPage() {
  // Load dashboard configuration server-side
  const dashboard = await createServerDashboard();
  
  return (
    <div className="h-screen">
      <div className="p-4 bg-green-50 border-b border-green-200">
        <h1 className="text-lg font-semibold text-green-800">
          ✅ Server-Side Dashboard Demo
        </h1>
        <p className="text-sm text-green-600">
          This dashboard was created and configured server-side, then passed to the client viewer.
        </p>
      </div>
      
      <DashboardViewer
        dashboard={dashboard}
        timeRange={{
          from: 'now-1h',
          to: 'now'
        }}
        refresh="30s"
        variables={[]}
        editMode={false}
        viewPanel={undefined}
        editPanel={undefined}
        kiosk={undefined}
      />
    </div>
  );
}