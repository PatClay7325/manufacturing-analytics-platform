/**
 * Server-Side Dashboard Demo - Proper AnalyticsPlatform Pattern
 * This demonstrates the correct server-side approach:
 * 1. Create/ensure dashboard exists server-side
 * 2. Redirect to standard dashboard viewer
 */

import { redirect } from 'next/navigation';
import type { Dashboard } from '@/types/dashboard';

// Force dynamic rendering as this page maintains in-memory state that should not be cached
export const dynamic = 'force-dynamic';

const DEMO_DASHBOARD_UID = 'server-side-demo';

// In-memory storage for demo purposes (avoids database constraints)
let demoDashboard: Dashboard | null = null;

async function ensureDemoDashboardExists(): Promise<void> {
  // Check if we already have the demo dashboard in memory
  if (demoDashboard) {
    return;
  }

  // Create the demo dashboard server-side (in memory for demo)
  demoDashboard = {
    uid: DEMO_DASHBOARD_UID,
    id: DEMO_DASHBOARD_UID,
    title: 'Server-Side Manufacturing Demo',
    description: 'A dashboard created and managed entirely server-side',
    tags: ['server-side', 'manufacturing', 'demo'],
    panels: [
      {
        id: 1,
        title: 'Equipment Status',
        type: 'stat',
        gridPos: { x: 0, y: 0, w: 6, h: 8 },
        targets: [{
          refId: 'A',
          metric: 'equipment_status'
        }],
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
        targets: [{
          refId: 'A',
          metric: 'production_rate'
        }],
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
      },
      {
        id: 3,
        title: 'Quality Metrics',
        type: 'stat',
        gridPos: { x: 0, y: 8, w: 12, h: 6 },
        targets: [{
          refId: 'A',
          metric: 'quality_score'
        }],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            decimals: 1
          },
          overrides: []
        },
        options: {
          reduceOptions: {
            values: false,
            calcs: ['lastNotNull'],
            fields: ''
          },
          textMode: 'value_and_name',
          colorMode: 'value'
        },
        transparent: false,
        links: [],
        transformations: []
      },
      {
        id: 4,
        title: 'OEE Dashboard',
        type: 'gauge',
        gridPos: { x: 12, y: 8, w: 12, h: 6 },
        targets: [{
          refId: 'A',
          metric: 'oee_score'
        }],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            min: 0,
            max: 100,
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 0, color: 'red' },
                { value: 60, color: 'yellow' },
                { value: 85, color: 'green' }
              ]
            }
          },
          overrides: []
        },
        options: {
          showThresholdLabels: false,
          showThresholdMarkers: true
        },
        transparent: false,
        links: [],
        transformations: []
      }
    ],
    templating: {
      list: [
        {
          name: 'equipment',
          type: 'query',
          label: 'Equipment',
          query: 'SELECT DISTINCT equipment_id FROM production_metrics',
          multi: true,
          includeAll: true,
          current: { text: 'All', value: '$__all' },
          options: [
            { text: 'All', value: '$__all', selected: true },
            { text: 'Production Line 1', value: 'line-1', selected: false },
            { text: 'Production Line 2', value: 'line-2', selected: false },
            { text: 'Assembly Station A', value: 'assembly-a', selected: false }
          ]
        }
      ]
    },
    annotations: [],
    links: [],
    time: {
      from: 'now-6h',
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
    graphTooltip: 1,
    preload: false,
    meta: {
      canEdit: true,
      canSave: true,
      canStar: true
    }
  };

  // Dashboard is now created in memory (avoiding database constraints for demo)
  console.log('Demo dashboard created server-side:', demoDashboard.title);
}

export default async function ServerDemoPage() {
  // Ensure the demo dashboard exists (server-side operation)
  await ensureDemoDashboardExists();

  // Redirect to the standard dashboard viewer without slug
  // The /d/[uid] route works perfectly for server-side dashboards
  redirect(`/d/${DEMO_DASHBOARD_UID}`);
}