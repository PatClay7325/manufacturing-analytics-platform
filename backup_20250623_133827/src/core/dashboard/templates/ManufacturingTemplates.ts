import { Dashboard, Panel } from '@/types/dashboard';

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail?: string;
  dashboard: Partial<Dashboard>;
}

export const manufacturingDashboardTemplates: DashboardTemplate[] = [
  {
    id: 'oee-comprehensive',
    name: 'OEE Comprehensive Dashboard',
    description: 'Complete OEE monitoring with availability, performance, and quality metrics',
    category: 'Production',
    tags: ['oee', 'production', 'kpi', 'iso22400'],
    dashboard: {
      title: 'OEE Comprehensive Dashboard',
      description: 'Real-time OEE monitoring and analysis',
      tags: ['oee', 'production', 'kpi'],
      panels: [
        {
          id: 1,
          type: 'gauge',
          title: 'Overall Equipment Effectiveness',
          gridPos: { x: 0, y: 0, w: 8, h: 8 },
          targets: [{ refId: 'A', measurement: 'oee.current' }],
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
            },
            overrides: []
          },
          options: { showThresholdLabels: true }
        },
        {
          id: 2,
          type: 'stat',
          title: 'Availability',
          gridPos: { x: 8, y: 0, w: 4, h: 4 },
          targets: [{ refId: 'A', measurement: 'oee.availability' }],
          fieldConfig: {
            defaults: { unit: 'percent', decimals: 1 },
            overrides: []
          }
        },
        {
          id: 3,
          type: 'stat',
          title: 'Performance',
          gridPos: { x: 12, y: 0, w: 4, h: 4 },
          targets: [{ refId: 'A', measurement: 'oee.performance' }],
          fieldConfig: {
            defaults: { unit: 'percent', decimals: 1 },
            overrides: []
          }
        },
        {
          id: 4,
          type: 'stat',
          title: 'Quality',
          gridPos: { x: 16, y: 0, w: 4, h: 4 },
          targets: [{ refId: 'A', measurement: 'oee.quality' }],
          fieldConfig: {
            defaults: { unit: 'percent', decimals: 1 },
            overrides: []
          }
        },
        {
          id: 5,
          type: 'stat',
          title: 'Units Produced',
          gridPos: { x: 20, y: 0, w: 4, h: 4 },
          targets: [{ refId: 'A', measurement: 'production.count' }],
          fieldConfig: {
            defaults: { unit: 'short', decimals: 0 },
            overrides: []
          }
        },
        {
          id: 6,
          type: 'timeseries',
          title: 'OEE Trend',
          gridPos: { x: 0, y: 8, w: 12, h: 8 },
          targets: [
            { refId: 'A', measurement: 'oee.availability', alias: 'Availability' },
            { refId: 'B', measurement: 'oee.performance', alias: 'Performance' },
            { refId: 'C', measurement: 'oee.quality', alias: 'Quality' },
            { refId: 'D', measurement: 'oee.overall', alias: 'OEE' }
          ],
          fieldConfig: {
            defaults: { unit: 'percent' },
            overrides: []
          }
        },
        {
          id: 7,
          type: 'barchart',
          title: 'Downtime Reasons',
          gridPos: { x: 12, y: 8, w: 12, h: 8 },
          targets: [{ refId: 'A', measurement: 'downtime.by_reason' }],
          fieldConfig: { defaults: {}, overrides: [] }
        }
      ]
    }
  },
  {
    id: 'quality-control',
    name: 'Quality Control Dashboard',
    description: 'Monitor quality metrics, defect rates, and SPC charts',
    category: 'Quality',
    tags: ['quality', 'spc', 'defects', 'iso9001'],
    dashboard: {
      title: 'Quality Control Dashboard',
      description: 'Quality metrics and statistical process control',
      tags: ['quality', 'spc', 'defects'],
      panels: [
        {
          id: 1,
          type: 'stat',
          title: 'First Pass Yield',
          gridPos: { x: 0, y: 0, w: 6, h: 4 },
          targets: [{ refId: 'A', measurement: 'quality.fpy' }],
          fieldConfig: {
            defaults: { unit: 'percent', decimals: 2 },
            overrides: []
          }
        },
        {
          id: 2,
          type: 'stat',
          title: 'Defect Rate',
          gridPos: { x: 6, y: 0, w: 6, h: 4 },
          targets: [{ refId: 'A', measurement: 'quality.defect_rate' }],
          fieldConfig: {
            defaults: { unit: 'percent', decimals: 2 },
            overrides: []
          }
        },
        {
          id: 3,
          type: 'stat',
          title: 'Rework Rate',
          gridPos: { x: 12, y: 0, w: 6, h: 4 },
          targets: [{ refId: 'A', measurement: 'quality.rework_rate' }],
          fieldConfig: {
            defaults: { unit: 'percent', decimals: 2 },
            overrides: []
          }
        },
        {
          id: 4,
          type: 'stat',
          title: 'Scrap Rate',
          gridPos: { x: 18, y: 0, w: 6, h: 4 },
          targets: [{ refId: 'A', measurement: 'quality.scrap_rate' }],
          fieldConfig: {
            defaults: { unit: 'percent', decimals: 2 },
            overrides: []
          }
        },
        {
          id: 5,
          type: 'pareto',
          title: 'Defect Pareto Analysis',
          gridPos: { x: 0, y: 4, w: 12, h: 8 },
          targets: [{ refId: 'A', measurement: 'defects.by_type' }],
          fieldConfig: { defaults: {}, overrides: [] }
        },
        {
          id: 6,
          type: 'spc',
          title: 'Critical Dimension Control Chart',
          gridPos: { x: 12, y: 4, w: 12, h: 8 },
          targets: [{ refId: 'A', measurement: 'measurements.critical_dimension' }],
          fieldConfig: {
            defaults: { unit: 'mm', decimals: 3 },
            overrides: []
          }
        }
      ]
    }
  },
  {
    id: 'energy-monitoring',
    name: 'Energy Monitoring Dashboard',
    description: 'Track energy consumption, efficiency, and sustainability metrics',
    category: 'Energy',
    tags: ['energy', 'sustainability', 'iso50001', 'consumption'],
    dashboard: {
      title: 'Energy Monitoring Dashboard',
      description: 'Energy consumption and efficiency tracking',
      tags: ['energy', 'sustainability', 'iso50001'],
      panels: [
        {
          id: 1,
          type: 'gauge',
          title: 'Current Power Consumption',
          gridPos: { x: 0, y: 0, w: 6, h: 6 },
          targets: [{ refId: 'A', measurement: 'energy.power.current' }],
          fieldConfig: {
            defaults: {
              unit: 'watt',
              thresholds: {
                mode: 'absolute',
                steps: [
                  { value: 0, color: 'green' },
                  { value: 1000, color: 'yellow' },
                  { value: 2000, color: 'red' }
                ]
              }
            },
            overrides: []
          }
        },
        {
          id: 2,
          type: 'stat',
          title: 'Daily Energy Consumption',
          gridPos: { x: 6, y: 0, w: 6, h: 3 },
          targets: [{ refId: 'A', measurement: 'energy.daily.total' }],
          fieldConfig: {
            defaults: { unit: 'kwatth', decimals: 1 },
            overrides: []
          }
        },
        {
          id: 3,
          type: 'stat',
          title: 'Energy Cost Today',
          gridPos: { x: 6, y: 3, w: 6, h: 3 },
          targets: [{ refId: 'A', measurement: 'energy.daily.cost' }],
          fieldConfig: {
            defaults: { unit: 'currencyUSD', decimals: 2 },
            overrides: []
          }
        },
        {
          id: 4,
          type: 'timeseries',
          title: 'Energy Consumption Trend',
          gridPos: { x: 0, y: 6, w: 24, h: 8 },
          targets: [
            { refId: 'A', measurement: 'energy.consumption', alias: 'Total' },
            { refId: 'B', measurement: 'energy.production', alias: 'Production' },
            { refId: 'C', measurement: 'energy.hvac', alias: 'HVAC' },
            { refId: 'D', measurement: 'energy.lighting', alias: 'Lighting' }
          ],
          fieldConfig: {
            defaults: { unit: 'kwatth' },
            overrides: []
          }
        },
        {
          id: 5,
          type: 'piechart',
          title: 'Energy Distribution by Area',
          gridPos: { x: 12, y: 0, w: 12, h: 6 },
          targets: [{ refId: 'A', measurement: 'energy.by_area' }],
          fieldConfig: { defaults: {}, overrides: [] }
        }
      ]
    }
  },
  {
    id: 'predictive-maintenance',
    name: 'Predictive Maintenance Dashboard',
    description: 'Equipment health monitoring and maintenance predictions',
    category: 'Maintenance',
    tags: ['maintenance', 'predictive', 'equipment', 'health'],
    dashboard: {
      title: 'Predictive Maintenance Dashboard',
      description: 'Equipment health and maintenance predictions',
      tags: ['maintenance', 'predictive', 'equipment'],
      panels: [
        {
          id: 1,
          type: 'table',
          title: 'Equipment Health Status',
          gridPos: { x: 0, y: 0, w: 12, h: 8 },
          targets: [{ refId: 'A', measurement: 'equipment.health' }],
          fieldConfig: { defaults: {}, overrides: [] },
          options: {
            showHeader: true,
            sortBy: [{ displayName: 'Health Score', desc: false }]
          }
        },
        {
          id: 2,
          type: 'heatmap',
          title: 'Vibration Analysis Heatmap',
          gridPos: { x: 12, y: 0, w: 12, h: 8 },
          targets: [{ refId: 'A', measurement: 'vibration.analysis' }],
          fieldConfig: { defaults: {}, overrides: [] }
        },
        {
          id: 3,
          type: 'timeseries',
          title: 'Temperature Trends',
          gridPos: { x: 0, y: 8, w: 12, h: 8 },
          targets: [
            { refId: 'A', measurement: 'temperature.bearing1' },
            { refId: 'B', measurement: 'temperature.bearing2' },
            { refId: 'C', measurement: 'temperature.motor' }
          ],
          fieldConfig: {
            defaults: { unit: 'celsius' },
            overrides: []
          }
        },
        {
          id: 4,
          type: 'stat',
          title: 'Next Maintenance',
          gridPos: { x: 12, y: 8, w: 6, h: 4 },
          targets: [{ refId: 'A', measurement: 'maintenance.next_due' }],
          fieldConfig: {
            defaults: { unit: 'dateTimeFromNow' },
            overrides: []
          }
        },
        {
          id: 5,
          type: 'gauge',
          title: 'Equipment Health Score',
          gridPos: { x: 18, y: 8, w: 6, h: 4 },
          targets: [{ refId: 'A', measurement: 'equipment.health_score' }],
          fieldConfig: {
            defaults: {
              unit: 'percent',
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
          }
        }
      ]
    }
  },
  {
    id: 'production-overview',
    name: 'Production Overview Dashboard',
    description: 'Real-time production monitoring and KPIs',
    category: 'Production',
    tags: ['production', 'kpi', 'real-time', 'overview'],
    dashboard: {
      title: 'Production Overview',
      description: 'Real-time production monitoring',
      tags: ['production', 'overview', 'kpi'],
      panels: [
        {
          id: 1,
          type: 'stat',
          title: 'Production Rate',
          gridPos: { x: 0, y: 0, w: 6, h: 4 },
          targets: [{ refId: 'A', measurement: 'production.rate' }],
          fieldConfig: {
            defaults: { unit: 'short', decimals: 0 },
            overrides: []
          }
        },
        {
          id: 2,
          type: 'stat',
          title: 'Cycle Time',
          gridPos: { x: 6, y: 0, w: 6, h: 4 },
          targets: [{ refId: 'A', measurement: 'production.cycle_time' }],
          fieldConfig: {
            defaults: { unit: 's', decimals: 1 },
            overrides: []
          }
        },
        {
          id: 3,
          type: 'gauge',
          title: 'Line Efficiency',
          gridPos: { x: 12, y: 0, w: 6, h: 4 },
          targets: [{ refId: 'A', measurement: 'production.efficiency' }],
          fieldConfig: {
            defaults: {
              unit: 'percent',
              min: 0,
              max: 100
            },
            overrides: []
          }
        },
        {
          id: 4,
          type: 'stat',
          title: 'Target vs Actual',
          gridPos: { x: 18, y: 0, w: 6, h: 4 },
          targets: [{ refId: 'A', measurement: 'production.target_variance' }],
          fieldConfig: {
            defaults: { unit: 'percent', decimals: 1 },
            overrides: []
          }
        },
        {
          id: 5,
          type: 'timeseries',
          title: 'Production Output',
          gridPos: { x: 0, y: 4, w: 24, h: 8 },
          targets: [
            { refId: 'A', measurement: 'production.actual', alias: 'Actual' },
            { refId: 'B', measurement: 'production.target', alias: 'Target' }
          ],
          fieldConfig: {
            defaults: { unit: 'short' },
            overrides: []
          }
        }
      ]
    }
  }
];

export function getTemplateById(id: string): DashboardTemplate | undefined {
  return manufacturingDashboardTemplates.find(template => template.id === id);
}

export function getTemplatesByCategory(category: string): DashboardTemplate[] {
  return manufacturingDashboardTemplates.filter(template => template.category === category);
}

export function getTemplateCategories(): string[] {
  const categories = new Set(manufacturingDashboardTemplates.map(t => t.category));
  return Array.from(categories).sort();
}