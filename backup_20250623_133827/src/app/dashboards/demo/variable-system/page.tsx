'use client';

import React from 'react';
import { Dashboard } from '@/types/dashboard';
import DashboardViewerV2 from '@/components/dashboard/DashboardViewerV2';

export default function VariableSystemDemoPage() {
  // Create a comprehensive demo dashboard showcasing all variable features
  const demoDashboard: Dashboard = {
    id: 'variable-demo',
    uid: 'variable-demo',
    title: 'Variable System Demo - AnalyticsPlatform Parity',
    description: 'Demonstrates all AnalyticsPlatform variable types and features',
    tags: ['demo', 'variables', 'analyticsPlatform-parity'],
    panels: [
      {
        id: 1,
        title: 'Server Metrics - $server ($datacenter)',
        type: 'timeseries',
        gridPos: { x: 0, y: 0, w: 12, h: 8 },
        targets: [
          {
            refId: 'A',
            query: 'SELECT mean(cpu) FROM metrics WHERE server =~ /^$server$/ AND datacenter = "$datacenter" AND $__timeFilter GROUP BY time($__interval)'
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
        title: 'Multi-Select Demo - ${servers:csv}',
        type: 'table',
        gridPos: { x: 12, y: 0, w: 12, h: 8 },
        targets: [
          {
            refId: 'A',
            query: 'SELECT server, status, cpu, memory FROM metrics WHERE server IN (${servers:csv}) AND time = $__to'
          }
        ],
        fieldConfig: {
          defaults: {},
          overrides: []
        },
        options: {
          showHeader: true
        },
        transparent: false,
        links: [],
        transformations: []
      },
      {
        id: 3,
        title: 'Custom Interval - $custom_interval',
        type: 'stat',
        gridPos: { x: 0, y: 8, w: 6, h: 4 },
        targets: [
          {
            refId: 'A',
            query: 'SELECT last(value) FROM metrics WHERE time > now() - $custom_interval'
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
        id: 4,
        title: 'Built-in Variables Demo',
        type: 'text',
        gridPos: { x: 6, y: 8, w: 18, h: 4 },
        targets: [],
        fieldConfig: {
          defaults: {},
          overrides: []
        },
        options: {
          content: `
## Built-in Variables:
- **From**: $__from (${new Date().toISOString()})
- **To**: $__to (${new Date().toISOString()})
- **Interval**: $__interval
- **Interval Ms**: $__interval_ms
- **Range**: $__range
- **Rate Interval**: $__rate_interval
- **Dashboard**: $__dashboard
- **User**: $__user
- **Org**: $__org
          `
        },
        transparent: false,
        links: [],
        transformations: []
      },
      {
        id: 5,
        title: 'Ad Hoc Filters',
        type: 'table',
        gridPos: { x: 0, y: 12, w: 12, h: 6 },
        targets: [
          {
            refId: 'A',
            query: 'SELECT * FROM metrics WHERE $adhoc_filters'
          }
        ],
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
        id: 6,
        title: 'Regex Variable Demo - $environment',
        type: 'gauge',
        gridPos: { x: 12, y: 12, w: 12, h: 6 },
        targets: [
          {
            refId: 'A',
            query: 'SELECT avg(health_score) FROM metrics WHERE env = "$environment"'
          }
        ],
        fieldConfig: {
          defaults: {
            min: 0,
            max: 100,
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 0, color: 'red' },
                { value: 50, color: 'yellow' },
                { value: 80, color: 'green' }
              ]
            }
          },
          overrides: []
        },
        options: {},
        transparent: false,
        links: [],
        transformations: []
      }
    ],
    templating: {
      list: [
        // Custom variable with key:value pairs
        {
          name: 'datacenter',
          type: 'custom',
          label: 'Data Center',
          query: 'US East : us-east-1, US West : us-west-2, EU Central : eu-central-1, Asia Pacific : ap-southeast-1',
          current: {
            text: 'US East',
            value: 'us-east-1',
            selected: true
          },
          options: [],
          multi: false,
          includeAll: false,
          hide: 0,
          sort: 0
        },
        // Query variable (simulated)
        {
          name: 'server',
          type: 'query',
          label: 'Server',
          query: 'SHOW TAG VALUES FROM metrics WITH KEY = "server"',
          datasource: { uid: 'prometheus', type: 'prometheus' },
          current: {
            text: 'web-server-01',
            value: 'web-server-01',
            selected: true
          },
          options: [],
          multi: false,
          includeAll: true,
          allValue: '.*',
          hide: 0,
          refresh: 1, // On dashboard load
          regex: '',
          sort: 1 // Alphabetical asc
        },
        // Multi-value variable
        {
          name: 'servers',
          type: 'custom',
          label: 'Servers (Multi)',
          query: 'web-server-01,web-server-02,db-server-01,db-server-02,cache-server-01',
          current: {
            text: ['web-server-01', 'web-server-02'],
            value: ['web-server-01', 'web-server-02'],
            selected: true
          },
          options: [],
          multi: true,
          includeAll: true,
          allValue: '*',
          hide: 0
        },
        // Interval variable
        {
          name: 'custom_interval',
          type: 'interval',
          label: 'Time Range',
          query: '1m,5m,10m,30m,1h,6h,12h,1d',
          current: {
            text: '5m',
            value: '5m',
            selected: true
          },
          options: [],
          hide: 0,
          auto: true,
          auto_min: '10s',
          auto_count: 30
        },
        // Constant variable
        {
          name: 'constant_var',
          type: 'constant',
          label: 'API Key',
          query: 'sk-1234567890',
          current: {
            text: 'sk-1234567890',
            value: 'sk-1234567890',
            selected: true
          },
          options: [],
          hide: 2 // Hidden variable
        },
        // Text box variable
        {
          name: 'custom_filter',
          type: 'textbox',
          label: 'Custom Filter',
          query: '',
          current: {
            text: '',
            value: '',
            selected: true
          },
          options: [],
          hide: 0
        },
        // Variable with regex filter
        {
          name: 'environment',
          type: 'custom',
          label: 'Environment',
          query: 'development,staging,production,prod-eu,prod-us,prod-asia',
          current: {
            text: 'production',
            value: 'production',
            selected: true
          },
          options: [],
          regex: '/prod.*/',
          hide: 0
        },
        // Ad hoc filters
        {
          name: 'adhoc_filters',
          type: 'adhoc',
          label: 'Ad hoc filters',
          datasource: { uid: 'prometheus', type: 'prometheus' },
          hide: 0
        }
      ]
    },
    annotations: [],
    links: [],
    time: {
      from: 'now-6h',
      to: 'now',
      raw: {
        from: 'now-6h',
        to: 'now'
      }
    },
    timepicker: {
      refresh_intervals: ['5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h', '2h', '1d'],
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
      <DashboardViewerV2
        dashboard={demoDashboard}
        onEdit={() => console.log('Edit clicked')}
      />
    </div>
  );
}