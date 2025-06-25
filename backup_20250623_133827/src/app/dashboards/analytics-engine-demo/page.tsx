/**
 * Analytics Engine Demo - Demonstrates proper server-side dashboard rendering
 * This page shows how Analytics's containerized engine pattern works in Next.js
 */

import { AnalyticsPlatform } from '@/core/analytics';
import { dashboardPersistenceService } from '@/services/dashboardPersistenceService';
import type { Variable, AlertRule, DashboardSceneState, DataSource } from '@/core/analytics';

// Force dynamic rendering as this page generates dashboard config server-side
export const dynamic = 'force-dynamic';

// Server-side datasource configuration
const serverDataSources: DataSource[] = [
  {
    uid: 'prometheus-default',
    name: 'Prometheus',
    type: 'prometheus',
    url: 'http://localhost:9090',
    access: 'proxy',
    isDefault: true
  },
  {
    uid: 'postgres-default',
    name: 'PostgreSQL',
    type: 'postgres',
    url: 'localhost:5432',
    access: 'proxy',
    isDefault: false
  }
];

// Server-side dashboard configuration
async function getServerSideDashboardConfig(): Promise<DashboardSceneState> {
  // Create dashboard configuration directly server-side
  const dashboardConfig: DashboardSceneState = {
    title: 'Server-Side Manufacturing Dashboard',
    meta: {
      title: 'Server-Side Manufacturing Dashboard',
      canEdit: true,
      canSave: true,
      canDelete: true,
      isNew: false
    },
    editable: true,
    panels: [],
    links: [],
    isLoading: false,
    isEditing: false,
    isDirty: false,
    timeRange: { from: 'now-6h', to: 'now' },
    refresh: '5s',
    annotations: [],
    variables: [
      {
        name: 'equipment',
        type: 'query' as any,
        label: 'Equipment',
        query: 'SELECT DISTINCT equipment_id FROM production_metrics',
        multi: true,
        includeAll: true,
        current: { text: 'All', value: '$__all' },
        options: [
          { text: 'All', value: '$__all', selected: true },
          { text: 'Line 1', value: 'line-1', selected: false },
          { text: 'Line 2', value: 'line-2', selected: false },
          { text: 'Line 3', value: 'line-3', selected: false }
        ],
        datasource: {
          type: 'postgres',
          uid: 'postgres-default'
        }
      },
      {
        name: 'interval',
        type: 'interval' as any,
        label: 'Interval',
        query: '1m,5m,10m,30m,1h,6h,12h,1d',
        current: { text: '5m', value: '5m' },
        options: [
          { text: '1m', value: '1m', selected: false },
          { text: '5m', value: '5m', selected: true },
          { text: '10m', value: '10m', selected: false },
          { text: '30m', value: '30m', selected: false }
        ],
        auto: true,
        auto_min: '10s',
        auto_count: 30
      }
    ] as Variable[]
  };

  // Add panels directly to the configuration
  dashboardConfig.panels = [
    {
      id: 1,
      type: 'row',
      title: 'Production Overview',
      gridPos: { h: 1, w: 24, x: 0, y: 0 },
      collapsed: false
    },
    {
      id: 2,
      type: 'stat',
      title: 'Current OEE',
      gridPos: { h: 8, w: 6, x: 0, y: 1 },
      datasource: { type: 'prometheus', uid: 'prometheus-default' },
      targets: [
        {
          refId: 'A',
          expr: 'avg(oee_score{equipment_id=~"$equipment"})',
          format: 'time_series'
        }
      ],
      options: {
        reduceOptions: {
          values: false,
          calcs: ['lastNotNull'],
          fields: ''
        },
        orientation: 'auto',
        textMode: 'auto',
        colorMode: 'value',
        graphMode: 'area',
        justifyMode: 'auto'
      },
      fieldConfig: {
        defaults: {
          unit: 'percent',
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
      }
    },
    {
      id: 3,
      type: 'timeseries',
      title: 'Production Rate Trend',
      gridPos: { h: 8, w: 18, x: 6, y: 1 },
      datasource: { type: 'prometheus', uid: 'prometheus-default' },
      targets: [
        {
          refId: 'A',
          expr: 'rate(production_count{equipment_id=~"$equipment"}[$interval])',
          legendFormat: '{{equipment_id}}',
          format: 'time_series'
        }
      ],
      options: {
        tooltip: {
          mode: 'multi',
          sort: 'none'
        },
        legend: {
          showLegend: true,
          displayMode: 'list',
          placement: 'bottom',
          calcs: []
        }
      },
      fieldConfig: {
        defaults: {
          unit: 'short',
          custom: {
            drawStyle: 'line',
            lineInterpolation: 'smooth',
            lineWidth: 2,
            fillOpacity: 10,
            gradientMode: 'opacity',
            spanNulls: false,
            showPoints: 'never',
            pointSize: 5,
            stacking: {
              mode: 'none',
              group: 'A'
            },
            axisPlacement: 'auto',
            axisLabel: '',
            axisColorMode: 'text',
            scaleDistribution: {
              type: 'linear'
            },
            axisCenteredZero: false,
            hideFrom: {
              tooltip: false,
              viz: false,
              legend: false
            },
            thresholdsStyle: {
              mode: 'off'
            }
          }
        },
        overrides: []
      }
    }
  ];

  return dashboardConfig;
}

// Mock alert rules for demo
const mockAlertRules: AlertRule[] = [
  {
    uid: 'alert-1',
    title: 'Low OEE Alert',
    condition: 'WHEN avg() OF query(A, 5m, now) IS BELOW 0.6',
    data: [
      {
        refId: 'A',
        queryType: '',
        relativeTimeRange: {
          from: 600,
          to: 0
        },
        datasourceUid: 'prometheus-default',
        model: {
          expr: 'avg(oee_score)',
          refId: 'A'
        }
      }
    ],
    noDataState: 'NoData',
    execErrState: 'Alerting',
    for: '5m',
    annotations: {
      description: 'OEE has fallen below 60% threshold',
      runbook_url: '',
      summary: 'Low OEE detected on equipment'
    },
    labels: {
      severity: 'warning',
      team: 'manufacturing'
    },
    folderUID: 'production',
    ruleGroup: 'production-alerts'
  }
];

export default async function AnalyticsEngineDemoPage() {
  // Load dashboard configuration server-side
  const dashboardConfig = await getServerSideDashboardConfig();
  
  // In production, you might also load:
  // - User permissions
  // - Alert rules
  // - Contact points
  // - Data source configurations
  
  return (
    <div className="h-screen">
      <AnalyticsPlatform
        // Server-side loaded configuration
        initialDashboard={dashboardConfig}
        dataSources={serverDataSources}
        alertRules={mockAlertRules}
        variables={dashboardConfig.variables}
        
        // Permissions (would come from server)
        canEdit={true}
        canSave={true}
        canDelete={false}
        canAdmin={false}
        
        // Event handlers will be handled internally by the client component
        
        theme="light"
        className="analytics-engine-container"
      />
    </div>
  );
}