/**
 * Seed Default Dashboards
 * Creates manufacturing-specific dashboards in the database
 */

import { PrismaClient } from '@prisma/client';
import { DashboardService } from '../src/services/dashboardService';

const prisma = new PrismaClient();
const dashboardService = DashboardService.getInstance();

async function seedDashboards() {
  console.log('🏭 Seeding default manufacturing dashboards...');

  try {
    // Check if dashboards already exist
    const existingCount = await prisma.dashboard.count();
    if (existingCount > 0) {
      console.log(`ℹ️ Found ${existingCount} existing dashboards. Skipping seed.`);
      return;
    }

    // Manufacturing Overview Dashboard
    await dashboardService.createDashboard({
      uid: 'manufacturing-overview',
      title: 'Manufacturing Overview',
      tags: ['manufacturing', 'overview', 'production'],
      panels: [
        {
          id: 1,
          key: '',
          title: 'Overall OEE',
          type: 'stat',
          gridPos: { x: 0, y: 0, w: 6, h: 4 },
          targets: [{ refId: 'A', metric: 'oee' }],
          options: { 
            reduceOptions: { 
              values: false,
              fields: '',
              calcs: ['lastNotNull'] 
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
              min: 0,
              max: 100,
              thresholds: {
                mode: 'absolute',
                steps: [
                  { value: 0, color: 'red' },
                  { value: 65, color: 'yellow' },
                  { value: 85, color: 'green' }
                ]
              }
            }
          }
        },
        {
          id: 2,
          key: '',
          title: 'Production Rate',
          type: 'timeseries',
          gridPos: { x: 6, y: 0, w: 18, h: 8 },
          targets: [{ refId: 'A', metric: 'production_rate' }],
          options: {
            legend: {
              displayMode: 'list',
              placement: 'bottom',
              calcs: []
            },
            tooltip: {
              mode: 'single',
              sort: 'none'
            }
          },
          fieldConfig: {
            defaults: {
              unit: 'short',
              custom: {
                lineWidth: 2,
                fillOpacity: 10,
                spanNulls: true,
                showPoints: 'never'
              }
            }
          }
        },
        {
          id: 3,
          key: '',
          title: 'Equipment Status',
          type: 'table',
          gridPos: { x: 0, y: 8, w: 12, h: 8 },
          targets: [{ refId: 'A', metric: 'equipment_status' }],
          options: {
            showHeader: true,
            cellHeight: 'sm',
            footer: {
              show: false,
              reducer: ['sum'],
              fields: []
            }
          }
        },
        {
          id: 4,
          key: '',
          title: 'Quality Metrics',
          type: 'gauge',
          gridPos: { x: 12, y: 8, w: 12, h: 8 },
          targets: [{ refId: 'A', metric: 'quality_rate' }],
          options: {
            orientation: 'horizontal',
            showThresholdLabels: true,
            showThresholdMarkers: true
          },
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
                  { value: 99, color: 'green' }
                ]
              }
            }
          }
        }
      ],
      time: {
        from: 'now-6h',
        to: 'now'
      },
      refresh: '30s'
    });

    // OEE Analysis Dashboard
    await dashboardService.createDashboard({
      uid: 'oee-analysis',
      title: 'OEE Analysis',
      tags: ['oee', 'analysis', 'performance'],
      panels: [
        {
          id: 1,
          key: '',
          title: 'OEE Components',
          type: 'bargauge',
          gridPos: { x: 0, y: 0, w: 24, h: 6 },
          targets: [
            { refId: 'A', metric: 'availability' },
            { refId: 'B', metric: 'performance' },
            { refId: 'C', metric: 'quality' }
          ],
          options: {
            orientation: 'horizontal',
            displayMode: 'gradient',
            showUnfilled: true
          },
          fieldConfig: {
            defaults: {
              unit: 'percent',
              min: 0,
              max: 100,
              thresholds: {
                mode: 'absolute',
                steps: [
                  { value: 0, color: 'red' },
                  { value: 80, color: 'yellow' },
                  { value: 90, color: 'green' }
                ]
              }
            }
          }
        },
        {
          id: 2,
          key: '',
          title: 'OEE by Equipment',
          type: 'barchart',
          gridPos: { x: 0, y: 6, w: 12, h: 10 },
          targets: [{ refId: 'A', metric: 'oee_by_equipment' }],
          options: {
            orientation: 'horizontal',
            legend: {
              displayMode: 'list',
              placement: 'bottom'
            },
            barWidth: 0.7,
            groupWidth: 0.8
          }
        },
        {
          id: 3,
          key: '',
          title: 'OEE Trend',
          type: 'timeseries',
          gridPos: { x: 12, y: 6, w: 12, h: 10 },
          targets: [{ refId: 'A', metric: 'oee_trend' }],
          options: {
            legend: {
              displayMode: 'list',
              placement: 'bottom'
            }
          },
          fieldConfig: {
            defaults: {
              unit: 'percent',
              min: 0,
              max: 100,
              custom: {
                lineWidth: 2,
                fillOpacity: 10
              }
            }
          }
        }
      ],
      time: {
        from: 'now-24h',
        to: 'now'
      },
      refresh: '1m'
    });

    // Equipment Monitoring Dashboard
    await dashboardService.createDashboard({
      uid: 'equipment-monitoring',
      title: 'Equipment Monitoring',
      tags: ['equipment', 'monitoring', 'maintenance'],
      panels: [
        {
          id: 1,
          key: '',
          title: 'Equipment Health Score',
          type: 'stat',
          gridPos: { x: 0, y: 0, w: 8, h: 4 },
          targets: [{ refId: 'A', metric: 'equipment_health' }],
          options: {
            reduceOptions: {
              values: false,
              fields: '',
              calcs: ['mean']
            }
          },
          fieldConfig: {
            defaults: {
              unit: 'percent',
              min: 0,
              max: 100,
              thresholds: {
                mode: 'absolute',
                steps: [
                  { value: 0, color: 'red' },
                  { value: 70, color: 'yellow' },
                  { value: 90, color: 'green' }
                ]
              }
            }
          }
        },
        {
          id: 2,
          key: '',
          title: 'Active Alerts',
          type: 'stat',
          gridPos: { x: 8, y: 0, w: 8, h: 4 },
          targets: [{ refId: 'A', metric: 'active_alerts' }],
          options: {
            reduceOptions: {
              values: false,
              fields: '',
              calcs: ['lastNotNull']
            },
            colorMode: 'background'
          },
          fieldConfig: {
            defaults: {
              unit: 'short',
              thresholds: {
                mode: 'absolute',
                steps: [
                  { value: 0, color: 'green' },
                  { value: 1, color: 'yellow' },
                  { value: 5, color: 'red' }
                ]
              }
            }
          }
        },
        {
          id: 3,
          key: '',
          title: 'MTBF',
          type: 'stat',
          gridPos: { x: 16, y: 0, w: 8, h: 4 },
          targets: [{ refId: 'A', metric: 'mtbf' }],
          options: {
            reduceOptions: {
              values: false,
              fields: '',
              calcs: ['lastNotNull']
            }
          },
          fieldConfig: {
            defaults: {
              unit: 'h',
              decimals: 1
            }
          }
        },
        {
          id: 4,
          key: '',
          title: 'Equipment Timeline',
          type: 'state-timeline',
          gridPos: { x: 0, y: 4, w: 24, h: 12 },
          targets: [{ refId: 'A', metric: 'equipment_states' }],
          options: {
            showValue: 'auto',
            alignValue: 'center',
            legend: {
              displayMode: 'list',
              placement: 'bottom'
            }
          }
        }
      ],
      time: {
        from: 'now-7d',
        to: 'now'
      },
      refresh: '5m'
    });

    console.log('✅ Successfully created default dashboards');

  } catch (error) {
    console.error('❌ Error seeding dashboards:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedDashboards()
  .catch(console.error)
  .finally(() => process.exit());