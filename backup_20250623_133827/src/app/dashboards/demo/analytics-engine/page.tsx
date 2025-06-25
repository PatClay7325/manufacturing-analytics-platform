/**
 * Analytics Engine Demo - Server-side rendered dashboard using the Analytics Scene
 * This demonstrates how to properly implement server-side rendered dashboards
 * with the full Analytics dashboard engine
 */

import { Metadata } from 'next';
import { AnalyticsPlatform, createManufacturingDashboard, defaultAnalyticsConfig } from '@/core/analytics';

export const metadata: Metadata = {
  title: 'Analytics Engine Demo - Manufacturing Analytics',
  description: 'Demonstration of server-side rendered Analytics dashboard with manufacturing data',
};

// Force dynamic rendering as this page generates dashboard config server-side
export const dynamic = 'force-dynamic';

// Server-side dashboard configuration
async function getDashboardConfig() {
  // In production, this would fetch from database or API
  const dashboard = createManufacturingDashboard({
    title: 'Server-Side Manufacturing Dashboard',
    timeRange: { from: 'now-6h', to: 'now' },
    variables: [
      {
        name: 'facility',
        type: 'query' as any,
        label: 'Facility',
        query: 'SELECT DISTINCT facility_name FROM facilities',
        multi: false,
        includeAll: true,
        current: { text: 'All', value: '$__all' },
        options: [
          { text: 'All', value: '$__all', selected: true },
          { text: 'Facility A', value: 'facility-a', selected: false },
          { text: 'Facility B', value: 'facility-b', selected: false },
        ],
      },
      {
        name: 'equipment',
        type: 'query' as any,
        label: 'Equipment',
        query: 'SELECT DISTINCT equipment_name FROM equipment WHERE facility = $facility',
        multi: true,
        includeAll: true,
        current: { text: 'All', value: '$__all' },
        options: [
          { text: 'All', value: '$__all', selected: true },
        ],
      },
    ],
  });

  // Add some pre-configured panels
  dashboard.panels = [
    {
      id: 'oee-overview',
      title: 'Overall Equipment Effectiveness (OEE)',
      type: 'stat',
      gridPos: { x: 0, y: 0, w: 6, h: 4 },
      targets: [
        {
          refId: 'A',
          expr: 'avg(oee_score{facility="$facility",equipment=~"$equipment"})',
        },
      ],
      fieldConfig: {
        defaults: {
          unit: 'percent',
          thresholds: {
            mode: 'absolute',
            steps: [
              { value: 0, color: 'red' },
              { value: 70, color: 'yellow' },
              { value: 85, color: 'green' },
            ],
          },
        },
        overrides: [],
      },
      options: {
        orientation: 'auto',
        textMode: 'auto',
        colorMode: 'background',
        graphMode: 'area',
        justifyMode: 'auto',
      },
    },
    {
      id: 'production-rate',
      title: 'Production Rate',
      type: 'timeseries',
      gridPos: { x: 6, y: 0, w: 18, h: 8 },
      targets: [
        {
          refId: 'A',
          expr: 'production_rate{facility="$facility",equipment=~"$equipment"}',
          datasource: {
            type: 'prometheus',
            uid: 'prometheus-default',
          },
        },
      ],
      fieldConfig: {
        defaults: {
          unit: 'pcs/hr',
          custom: {
            lineWidth: 2,
            fillOpacity: 10,
            gradientMode: 'opacity',
          },
        },
        overrides: [],
      },
      options: {
        legend: {
          displayMode: 'list',
          placement: 'bottom',
        },
        tooltip: {
          mode: 'multi',
          sort: 'none',
        },
      },
    },
    {
      id: 'quality-metrics',
      title: 'Quality Metrics',
      type: 'gauge',
      gridPos: { x: 0, y: 4, w: 6, h: 4 },
      targets: [
        {
          refId: 'A',
          expr: 'quality_rate{facility="$facility",equipment=~"$equipment"}',
        },
      ],
      fieldConfig: {
        defaults: {
          unit: 'percent',
          min: 0,
          max: 100,
          thresholds: {
            mode: 'absolute',
            steps: [
              { value: 0, color: 'red' },
              { value: 95, color: 'yellow' },
              { value: 99, color: 'green' },
            ],
          },
        },
        overrides: [],
      },
      options: {
        orientation: 'auto',
        showThresholdLabels: true,
        showThresholdMarkers: true,
      },
    },
  ];

  return dashboard;
}

export default async function AnalyticsEngineDemoPage() {
  const dashboard = await getDashboardConfig();

  return (
    <div className="h-screen">
      <AnalyticsPlatform
        initialDashboard={dashboard}
        dataSources={defaultAnalyticsConfig.dataSources}
        variables={dashboard.variables}
        canEdit={true}
        canSave={true}
        canDelete={false}
        canAdmin={true}
        onDashboardSave={async (dashboard) => {
          console.log('Dashboard saved:', dashboard);
          // In production, save to database
        }}
        onVariableChange={(name, value) => {
          console.log('Variable changed:', name, value);
        }}
        theme="light"
      />
    </div>
  );
}