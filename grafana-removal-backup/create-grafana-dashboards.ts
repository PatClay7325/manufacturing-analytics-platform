import axios from 'axios';

const GRAFANA_URL = 'http://localhost:3001';
const GRAFANA_USER = 'admin';
const GRAFANA_PASS = 'admin';

// Create basic auth header
const auth = Buffer.from(`${GRAFANA_USER}:${GRAFANA_PASS}`).toString('base64');

const dashboards = [
  {
    uid: 'manufacturing-overview',
    title: 'Manufacturing Overview',
    tags: ['manufacturing', 'oee', 'overview'],
    panels: [
      {
        title: 'Overall Equipment Effectiveness (OEE)',
        type: 'timeseries',
        gridPos: { x: 0, y: 0, w: 12, h: 8 },
        targets: [
          {
            refId: 'A',
            target: 'performance_metrics',
            datasource: { uid: 'bcaaaf5c-d0cc-42dc-a937-00af2597895e' }
          }
        ]
      },
      {
        title: 'OEE by Equipment',
        type: 'table',
        gridPos: { x: 12, y: 0, w: 12, h: 8 },
        targets: [
          {
            refId: 'B',
            target: 'oee_by_equipment',
            datasource: { uid: 'bcaaaf5c-d0cc-42dc-a937-00af2597895e' }
          }
        ]
      },
      {
        title: 'Production Summary',
        type: 'stat',
        gridPos: { x: 0, y: 8, w: 8, h: 4 },
        targets: [
          {
            refId: 'C',
            target: 'production_summary',
            datasource: { uid: 'bcaaaf5c-d0cc-42dc-a937-00af2597895e' }
          }
        ]
      },
      {
        title: 'Quality Metrics',
        type: 'gauge',
        gridPos: { x: 8, y: 8, w: 8, h: 4 },
        targets: [
          {
            refId: 'E',
            target: 'quality_metrics',
            datasource: { uid: 'bcaaaf5c-d0cc-42dc-a937-00af2597895e' }
          }
        ]
      },
      {
        title: 'Downtime Analysis',
        type: 'piechart',
        gridPos: { x: 16, y: 8, w: 8, h: 4 },
        targets: [
          {
            refId: 'D',
            target: 'downtime_analysis',
            datasource: { uid: 'bcaaaf5c-d0cc-42dc-a937-00af2597895e' }
          }
        ]
      }
    ]
  },
  {
    uid: 'production-metrics',
    title: 'Production Metrics',
    tags: ['production', 'metrics', 'efficiency'],
    panels: [
      {
        title: 'Production Rate Over Time',
        type: 'timeseries',
        gridPos: { x: 0, y: 0, w: 24, h: 8 },
        targets: [
          {
            refId: 'A',
            target: 'performance_metrics',
            datasource: { uid: 'bcaaaf5c-d0cc-42dc-a937-00af2597895e' }
          }
        ]
      },
      {
        title: 'Shift Performance',
        type: 'table',
        gridPos: { x: 0, y: 8, w: 12, h: 8 },
        targets: [
          {
            refId: 'G',
            target: 'shift_performance',
            datasource: { uid: 'bcaaaf5c-d0cc-42dc-a937-00af2597895e' }
          }
        ]
      },
      {
        title: 'Equipment Status',
        type: 'table',
        gridPos: { x: 12, y: 8, w: 12, h: 8 },
        targets: [
          {
            refId: 'F',
            target: 'equipment_list',
            datasource: { uid: 'bcaaaf5c-d0cc-42dc-a937-00af2597895e' }
          }
        ]
      }
    ]
  },
  {
    uid: 'quality-dashboard',
    title: 'Quality Dashboard',
    tags: ['quality', 'defects', 'metrics'],
    panels: [
      {
        title: 'Quality Trend',
        type: 'timeseries',
        gridPos: { x: 0, y: 0, w: 12, h: 8 },
        targets: [
          {
            refId: 'E',
            target: 'quality_metrics',
            datasource: { uid: 'bcaaaf5c-d0cc-42dc-a937-00af2597895e' }
          }
        ]
      },
      {
        title: 'Defect Analysis',
        type: 'table',
        gridPos: { x: 12, y: 0, w: 12, h: 8 },
        targets: [
          {
            refId: 'D',
            target: 'downtime_analysis',
            datasource: { uid: 'bcaaaf5c-d0cc-42dc-a937-00af2597895e' }
          }
        ]
      }
    ]
  },
  {
    uid: 'system-health-monitoring',
    title: 'System Health Monitoring',
    tags: ['system', 'health', 'monitoring'],
    panels: [
      {
        title: 'Equipment Availability',
        type: 'gauge',
        gridPos: { x: 0, y: 0, w: 8, h: 8 },
        targets: [
          {
            refId: 'A',
            target: 'oee_by_equipment',
            datasource: { uid: 'bcaaaf5c-d0cc-42dc-a937-00af2597895e' }
          }
        ]
      },
      {
        title: 'Equipment List',
        type: 'table',
        gridPos: { x: 8, y: 0, w: 16, h: 8 },
        targets: [
          {
            refId: 'F',
            target: 'equipment_list',
            datasource: { uid: 'bcaaaf5c-d0cc-42dc-a937-00af2597895e' }
          }
        ]
      }
    ]
  }
];

async function createDashboard(dashboard: any) {
  const dashboardData = {
    dashboard: {
      uid: dashboard.uid,
      title: dashboard.title,
      tags: dashboard.tags,
      timezone: 'browser',
      panels: dashboard.panels.map((panel: any, index: number) => ({
        ...panel,
        id: index + 1,
        datasource: panel.targets[0].datasource,
        fieldConfig: {
          defaults: {
            custom: {}
          },
          overrides: []
        },
        options: {},
        pluginVersion: '10.2.0'
      })),
      schemaVersion: 39,
      version: 0,
      refresh: '10s'
    },
    overwrite: true
  };

  try {
    const response = await axios.post(
      `${GRAFANA_URL}/api/dashboards/db`,
      dashboardData,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`✅ Created dashboard: ${dashboard.title} (${dashboard.uid})`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Failed to create dashboard ${dashboard.title}:`, error.response?.data || error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Creating Grafana dashboards...\n');

  for (const dashboard of dashboards) {
    try {
      await createDashboard(dashboard);
    } catch (error) {
      // Continue with next dashboard
    }
  }

  console.log('\n✨ Dashboard creation complete!');
  console.log('\nYou can access the dashboards at:');
  dashboards.forEach(d => {
    console.log(`- http://localhost:3001/d/${d.uid}/${d.title.toLowerCase().replace(/\s+/g, '-')}`);
  });
}

main().catch(console.error);