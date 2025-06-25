'use client';

import React, { useEffect, useState } from 'react';
import { Dashboard } from '@/types/dashboard';
import DashboardViewerV2 from '@/components/dashboard/DashboardViewerV2';
import { getDataSourceManager } from '@/core/datasources/DataSourceManager';

export default function RealDataDemoPage() {
  const [dataSourceStatus, setDataSourceStatus] = useState<Record<string, any>>({});

  useEffect(() => {
    // Test data sources on mount
    testDataSources();
  }, []);

  const testDataSources = async () => {
    const dsManager = getDataSourceManager();
    const dataSources = dsManager.getAllDataSources();
    
    const status: Record<string, any> = {};
    
    for (const ds of dataSources) {
      const plugin = dsManager.getDataSource(ds.uid);
      if (plugin) {
        try {
          const result = await plugin.testDatasource();
          status[ds.name] = result;
        } catch (error) {
          status[ds.name] = { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' };
        }
      }
    }
    
    setDataSourceStatus(status);
  };

  // Real dashboard configuration with actual queries
  const realDashboard: Dashboard = {
    id: 'real-data-demo',
    uid: 'real-data-demo',
    title: 'Real Data Integration Demo',
    description: 'Demonstrates actual data source queries and variable interpolation',
    tags: ['demo', 'real-data'],
    panels: [
      {
        id: 1,
        title: 'Prometheus Metrics - $metric',
        type: 'timeseries',
        gridPos: { x: 0, y: 0, w: 12, h: 8 },
        datasource: { uid: 'prometheus-manufacturing', type: 'prometheus' },
        targets: [
          {
            refId: 'A',
            expr: '$metric{instance=~"$instance"}',
            legendFormat: '{{instance}}'
          }
        ],
        fieldConfig: {
          defaults: {
            custom: {
              lineWidth: 2,
              fillOpacity: 10
            }
          },
          overrides: []
        },
        options: {
          legend: {
            displayMode: 'list',
            placement: 'bottom'
          }
        },
        transparent: false,
        links: [],
        transformations: []
      },
      {
        id: 2,
        title: 'TimescaleDB Metrics',
        type: 'timeseries',
        gridPos: { x: 12, y: 0, w: 12, h: 8 },
        datasource: { uid: 'postgresql-manufacturing', type: 'postgresql' },
        targets: [
          {
            refId: 'A',
            rawSql: `
              SELECT 
                time_bucket('$__interval', time) as time,
                equipment as metric,
                avg(value) as value
              FROM metrics
              WHERE $__timeFilter(time)
                AND equipment IN ($equipment)
              GROUP BY time, equipment
              ORDER BY time
            `,
            format: 'time_series'
          }
        ],
        fieldConfig: {
          defaults: {
            unit: 'percent'
          },
          overrides: []
        },
        options: {},
        transparent: false,
        links: [],
        transformations: []
      },
      {
        id: 3,
        title: 'Variable Values',
        type: 'table',
        gridPos: { x: 0, y: 8, w: 12, h: 6 },
        targets: [],
        fieldConfig: {
          defaults: {},
          overrides: []
        },
        options: {
          showHeader: true,
          content: `
## Current Variable Values:
- **Metric**: $metric
- **Instance**: $instance
- **Equipment**: \${equipment:csv}
- **Interval**: $interval

## Built-in Variables:
- **From**: $__from
- **To**: $__to
- **Interval**: $__interval
- **Dashboard**: $__dashboard
          `
        },
        transparent: false,
        links: [],
        transformations: []
      },
      {
        id: 4,
        title: 'Data Source Status',
        type: 'text',
        gridPos: { x: 12, y: 8, w: 12, h: 6 },
        targets: [],
        fieldConfig: {
          defaults: {},
          overrides: []
        },
        options: {
          content: Object.entries(dataSourceStatus).map(([name, status]) => 
            `**${name}**: ${status.status} - ${status.message}`
          ).join('\n\n')
        },
        transparent: false,
        links: [],
        transformations: []
      }
    ],
    templating: {
      list: [
        // Prometheus metric query variable
        {
          name: 'metric',
          type: 'query',
          label: 'Metric',
          query: 'metrics(.*)',
          datasource: { uid: 'prometheus-manufacturing', type: 'prometheus' },
          current: {
            text: 'up',
            value: 'up',
            selected: true
          },
          options: [],
          refresh: 1, // On dashboard load
          regex: '',
          sort: 1,
          multi: false,
          includeAll: false,
          hide: 0
        },
        // Prometheus label values variable
        {
          name: 'instance',
          type: 'query',
          label: 'Instance',
          query: 'label_values($metric, instance)',
          datasource: { uid: 'prometheus-manufacturing', type: 'prometheus' },
          current: {
            text: 'All',
            value: '$__all',
            selected: true
          },
          options: [],
          refresh: 2, // On time range change
          regex: '',
          sort: 1,
          multi: true,
          includeAll: true,
          allValue: '.*',
          hide: 0
        },
        // PostgreSQL query variable
        {
          name: 'equipment',
          type: 'query',
          label: 'Equipment',
          query: 'SELECT DISTINCT equipment FROM metrics ORDER BY equipment',
          datasource: { uid: 'postgresql-manufacturing', type: 'postgresql' },
          current: {
            text: 'All',
            value: '$__all',
            selected: true
          },
          options: [],
          refresh: 1,
          multi: true,
          includeAll: true,
          allValue: '*',
          hide: 0
        },
        // Interval variable
        {
          name: 'interval',
          type: 'interval',
          label: 'Interval',
          query: '1m,5m,10m,30m,1h',
          current: {
            text: 'auto',
            value: '$__auto_interval_interval',
            selected: true
          },
          options: [],
          hide: 0,
          auto: true,
          auto_min: '10s',
          auto_count: 30
        }
      ]
    },
    annotations: [],
    links: [],
    time: {
      from: 'now-1h',
      to: 'now',
      raw: {
        from: 'now-1h',
        to: 'now'
      }
    },
    timepicker: {
      refresh_intervals: ['5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h'],
      time_options: ['5m', '15m', '1h', '6h', '12h', '24h', '2d', '7d', '30d']
    },
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

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="p-4 bg-yellow-900 text-yellow-100 mb-4">
        <h2 className="text-lg font-semibold mb-2">⚠️ Real Data Integration Demo</h2>
        <p>This page demonstrates actual data source queries. Configure your data sources in environment variables:</p>
        <ul className="list-disc ml-6 mt-2">
          <li><code>NEXT_PUBLIC_PROMETHEUS_URL</code> - Prometheus server URL</li>
          <li><code>DATABASE_URL</code> - PostgreSQL/TimescaleDB connection string</li>
        </ul>
        <p className="mt-2">Current Status:</p>
        <pre className="mt-2 p-2 bg-black/20 rounded text-sm">
{JSON.stringify(dataSourceStatus, null, 2)}
        </pre>
      </div>
      
      <DashboardViewerV2
        dashboard={realDashboard}
        onEdit={() => console.log('Edit clicked')}
      />
    </div>
  );
}