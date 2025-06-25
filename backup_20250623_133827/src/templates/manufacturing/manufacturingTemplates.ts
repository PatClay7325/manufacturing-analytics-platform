/**
 * Manufacturing Dashboard Templates
 * Comprehensive collection of manufacturing-specific dashboard templates
 */

import { DashboardTemplate, TemplateVariableConfig } from '@/types/template';
import { Dashboard } from '@/types/dashboard';

// Common variables used across manufacturing templates
const commonVariables: TemplateVariableConfig[] = [
  {
    name: 'production_line',
    type: 'select',
    label: 'Production Line',
    description: 'Select the production line to monitor',
    required: true,
    options: [
      { label: 'Line 1 - Assembly', value: 'line_1' },
      { label: 'Line 2 - Packaging', value: 'line_2' },
      { label: 'Line 3 - Quality Control', value: 'line_3' },
      { label: 'Line 4 - Final Assembly', value: 'line_4' }
    ],
    defaultValue: 'line_1'
  },
  {
    name: 'shift',
    type: 'select',
    label: 'Shift',
    description: 'Select the shift to monitor',
    required: false,
    options: [
      { label: 'All Shifts', value: 'all' },
      { label: 'Day Shift (6AM-2PM)', value: 'day' },
      { label: 'Evening Shift (2PM-10PM)', value: 'evening' },
      { label: 'Night Shift (10PM-6AM)', value: 'night' }
    ],
    defaultValue: 'all'
  },
  {
    name: 'department',
    type: 'select',
    label: 'Department',
    description: 'Filter by department',
    required: false,
    options: [
      { label: 'All Departments', value: 'all' },
      { label: 'Production', value: 'production' },
      { label: 'Quality', value: 'quality' },
      { label: 'Maintenance', value: 'maintenance' },
      { label: 'Logistics', value: 'logistics' }
    ],
    defaultValue: 'all'
  },
  {
    name: 'time_range',
    type: 'select',
    label: 'Default Time Range',
    description: 'Default time range for the dashboard',
    required: true,
    options: [
      { label: 'Last 1 hour', value: 'now-1h' },
      { label: 'Last 4 hours', value: 'now-4h' },
      { label: 'Last 12 hours', value: 'now-12h' },
      { label: 'Last 24 hours', value: 'now-24h' },
      { label: 'Last 7 days', value: 'now-7d' }
    ],
    defaultValue: 'now-12h'
  }
];

// OEE Comprehensive Dashboard Template
export const oeeComprehensiveTemplate: DashboardTemplate = {
  id: 'oee-comprehensive',
  uid: 'oee-comprehensive-v1',
  name: 'OEE Comprehensive Dashboard',
  title: 'Overall Equipment Effectiveness - ${production_line}',
  description: 'Complete OEE monitoring dashboard with availability, performance, and quality metrics following ISO 22400 standards. Includes real-time monitoring, trend analysis, and downtime root cause analysis.',
  summary: 'ISO 22400 compliant OEE dashboard with comprehensive metrics and analytics',
  
  config: {
    title: 'Overall Equipment Effectiveness - ${production_line}',
    description: 'Comprehensive OEE monitoring and analysis',
    tags: ['oee', 'production', 'iso22400', 'kpi'],
    schemaVersion: 30,
    version: 1,
    timezone: 'browser',
    fiscalYearStartMonth: 0,
    liveNow: true,
    weekStart: '',
    style: 'dark',
    editable: true,
    hideControls: false,
    graphTooltip: 1,
    preload: false,
    time: {
      from: '${time_range}',
      to: 'now'
    },
    timepicker: {
      refresh_intervals: ['5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h', '2h', '1d'],
      time_options: ['5m', '15m', '1h', '6h', '12h', '24h', '2d', '7d', '30d']
    },
    templating: {
      list: []
    },
    annotations: {
      list: [
        {
          name: 'Downtime Events',
          datasource: 'prometheus',
          enable: true,
          iconColor: 'red',
          query: 'downtime_events{line="${production_line}"}',
          type: 'event'
        }
      ]
    },
    links: [],
    panels: [
      // Main OEE Gauge
      {
        id: 1,
        type: 'gauge',
        title: 'Overall Equipment Effectiveness (OEE)',
        gridPos: { x: 0, y: 0, w: 8, h: 8 },
        targets: [
          {
            refId: 'A',
            expr: 'oee_overall{line="${production_line}",shift="${shift}"}',
            legendFormat: 'OEE %'
          }
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
                { value: 60, color: 'yellow' },
                { value: 85, color: 'green' }
              ]
            }
          },
          overrides: []
        },
        options: {
          showThresholdLabels: true,
          showThresholdMarkers: true
        },
        transformations: [],
        transparent: false,
        datasource: { type: 'prometheus' },
        description: 'Overall Equipment Effectiveness calculation following ISO 22400-2 standard',
        links: [],
        repeat: undefined,
        repeatDirection: undefined,
        maxDataPoints: undefined,
        interval: undefined,
        cacheTimeout: undefined,
        timeFrom: undefined,
        timeShift: undefined,
        hideTimeOverride: undefined,
        libraryPanel: undefined
      },
      
      // Availability Stat
      {
        id: 2,
        type: 'stat',
        title: 'Availability',
        gridPos: { x: 8, y: 0, w: 4, h: 4 },
        targets: [
          {
            refId: 'A',
            expr: 'oee_availability{line="${production_line}",shift="${shift}"}',
            legendFormat: 'Availability %'
          }
        ],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            decimals: 1,
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
          colorMode: 'background',
          graphMode: 'area',
          justifyMode: 'center',
          orientation: 'horizontal'
        },
        transformations: [],
        transparent: false,
        datasource: { type: 'prometheus' },
        description: 'Equipment availability = Operating Time / Planned Production Time',
        links: [],
        repeat: undefined,
        repeatDirection: undefined,
        maxDataPoints: undefined,
        interval: undefined,
        cacheTimeout: undefined,
        timeFrom: undefined,
        timeShift: undefined,
        hideTimeOverride: undefined,
        libraryPanel: undefined
      },

      // Performance Stat
      {
        id: 3,
        type: 'stat',
        title: 'Performance',
        gridPos: { x: 12, y: 0, w: 4, h: 4 },
        targets: [
          {
            refId: 'A',
            expr: 'oee_performance{line="${production_line}",shift="${shift}"}',
            legendFormat: 'Performance %'
          }
        ],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            decimals: 1,
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 0, color: 'red' },
                { value: 85, color: 'yellow' },
                { value: 95, color: 'green' }
              ]
            }
          },
          overrides: []
        },
        options: {
          colorMode: 'background',
          graphMode: 'area',
          justifyMode: 'center',
          orientation: 'horizontal'
        },
        transformations: [],
        transparent: false,
        datasource: { type: 'prometheus' },
        description: 'Performance = (Actual Production Rate / Ideal Production Rate) × 100',
        links: [],
        repeat: undefined,
        repeatDirection: undefined,
        maxDataPoints: undefined,
        interval: undefined,
        cacheTimeout: undefined,
        timeFrom: undefined,
        timeShift: undefined,
        hideTimeOverride: undefined,
        libraryPanel: undefined
      },

      // Quality Stat
      {
        id: 4,
        type: 'stat',
        title: 'Quality',
        gridPos: { x: 16, y: 0, w: 4, h: 4 },
        targets: [
          {
            refId: 'A',
            expr: 'oee_quality{line="${production_line}",shift="${shift}"}',
            legendFormat: 'Quality %'
          }
        ],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            decimals: 1,
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 0, color: 'red' },
                { value: 95, color: 'yellow' },
                { value: 99, color: 'green' }
              ]
            }
          },
          overrides: []
        },
        options: {
          colorMode: 'background',
          graphMode: 'area',
          justifyMode: 'center',
          orientation: 'horizontal'
        },
        transformations: [],
        transparent: false,
        datasource: { type: 'prometheus' },
        description: 'Quality = Good Units / Total Units × 100',
        links: [],
        repeat: undefined,
        repeatDirection: undefined,
        maxDataPoints: undefined,
        interval: undefined,
        cacheTimeout: undefined,
        timeFrom: undefined,
        timeShift: undefined,
        hideTimeOverride: undefined,
        libraryPanel: undefined
      },

      // Production Count
      {
        id: 5,
        type: 'stat',
        title: 'Units Produced',
        gridPos: { x: 20, y: 0, w: 4, h: 4 },
        targets: [
          {
            refId: 'A',
            expr: 'increase(production_count{line="${production_line}",shift="${shift}"}[1h])',
            legendFormat: 'Units/Hour'
          }
        ],
        fieldConfig: {
          defaults: {
            unit: 'short',
            decimals: 0,
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 0, color: 'red' },
                { value: 100, color: 'yellow' },
                { value: 150, color: 'green' }
              ]
            }
          },
          overrides: []
        },
        options: {
          colorMode: 'background',
          graphMode: 'area',
          justifyMode: 'center',
          orientation: 'horizontal'
        },
        transformations: [],
        transparent: false,
        datasource: { type: 'prometheus' },
        description: 'Total units produced in the current hour',
        links: [],
        repeat: undefined,
        repeatDirection: undefined,
        maxDataPoints: undefined,
        interval: undefined,
        cacheTimeout: undefined,
        timeFrom: undefined,
        timeShift: undefined,
        hideTimeOverride: undefined,
        libraryPanel: undefined
      },

      // OEE Trend Chart
      {
        id: 6,
        type: 'timeseries',
        title: 'OEE Components Trend',
        gridPos: { x: 0, y: 8, w: 12, h: 8 },
        targets: [
          {
            refId: 'A',
            expr: 'oee_availability{line="${production_line}",shift="${shift}"}',
            legendFormat: 'Availability'
          },
          {
            refId: 'B',
            expr: 'oee_performance{line="${production_line}",shift="${shift}"}',
            legendFormat: 'Performance'
          },
          {
            refId: 'C',
            expr: 'oee_quality{line="${production_line}",shift="${shift}"}',
            legendFormat: 'Quality'
          },
          {
            refId: 'D',
            expr: 'oee_overall{line="${production_line}",shift="${shift}"}',
            legendFormat: 'OEE'
          }
        ],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            min: 0,
            max: 100,
            custom: {
              drawStyle: 'line',
              lineInterpolation: 'linear',
              lineWidth: 2,
              fillOpacity: 10,
              spanNulls: false,
              showPoints: 'never',
              pointSize: 5
            }
          },
          overrides: [
            {
              matcher: { id: 'byName', options: 'OEE' },
              properties: [
                { id: 'custom.lineWidth', value: 3 },
                { id: 'color', value: { mode: 'fixed', fixedColor: 'blue' } }
              ]
            }
          ]
        },
        options: {
          tooltip: { mode: 'multi', sort: 'none' },
          legend: { 
            displayMode: 'table',
            placement: 'bottom',
            values: ['last', 'min', 'max', 'mean']
          }
        },
        transformations: [],
        transparent: false,
        datasource: { type: 'prometheus' },
        description: 'Trend analysis of OEE components over time',
        links: [],
        repeat: undefined,
        repeatDirection: undefined,
        maxDataPoints: undefined,
        interval: undefined,
        cacheTimeout: undefined,
        timeFrom: undefined,
        timeShift: undefined,
        hideTimeOverride: undefined,
        libraryPanel: undefined
      },

      // Downtime Analysis
      {
        id: 7,
        type: 'barchart',
        title: 'Downtime Analysis by Reason',
        gridPos: { x: 12, y: 8, w: 12, h: 8 },
        targets: [
          {
            refId: 'A',
            expr: 'sum by (reason) (downtime_duration{line="${production_line}",shift="${shift}"})',
            legendFormat: '{{ reason }}'
          }
        ],
        fieldConfig: {
          defaults: {
            unit: 'minutes',
            custom: {
              hideFrom: { legend: false, tooltip: false, vis: false }
            }
          },
          overrides: []
        },
        options: {
          orientation: 'vertical',
          xTickLabelRotation: 45,
          xTickLabelMaxLength: 20
        },
        transformations: [],
        transparent: false,
        datasource: { type: 'prometheus' },
        description: 'Breakdown of downtime by root cause category',
        links: [],
        repeat: undefined,
        repeatDirection: undefined,
        maxDataPoints: undefined,
        interval: undefined,
        cacheTimeout: undefined,
        timeFrom: undefined,
        timeShift: undefined,
        hideTimeOverride: undefined,
        libraryPanel: undefined
      }
    ],
    refresh: '30s',
    meta: {
      canSave: true,
      canEdit: true,
      canAdmin: true,
      canStar: true,
      canDelete: true
    }
  } as Dashboard,

  variables: [
    ...commonVariables,
    {
      name: 'target_oee',
      type: 'number',
      label: 'Target OEE (%)',
      description: 'Target OEE percentage for this production line',
      required: true,
      defaultValue: 85,
      validation: {
        min: 0,
        max: 100
      }
    }
  ],

  categoryId: 'production',
  tags: ['oee', 'production', 'iso22400', 'kpi', 'real-time'],
  industry: ['automotive', 'electronics', 'pharmaceuticals', 'food-beverage'],
  
  version: '1.0.0',
  schemaVersion: 1,
  compatibleWith: ['analyticsPlatform-9.x', 'analyticsPlatform-10.x'],
  dependencies: ['prometheus', 'timescaledb'],
  
  thumbnail: '/templates/thumbnails/oee-comprehensive.png',
  screenshots: [
    '/templates/screenshots/oee-comprehensive-1.png',
    '/templates/screenshots/oee-comprehensive-2.png'
  ],
  
  isPublic: true,
  isFeatured: true,
  isOfficial: true,
  isDeprecated: false,
  
  downloadCount: 0,
  rating: 4.8,
  ratingCount: 25,
  
  manufacturingType: 'oee',
  equipmentTypes: ['assembly-line', 'cnc-machine', 'packaging-line', 'conveyor'],
  isoStandards: ['ISO22400-1', 'ISO22400-2'],
  kpiTypes: ['availability', 'performance', 'quality', 'oee'],
  
  authorId: 'system',
  authorName: 'Manufacturing Analytics Team',
  authorEmail: 'manufacturing@company.com',
  organization: 'Manufacturing AnalyticsPlatform',
  
  documentationUrl: '/docs/templates/oee-comprehensive',
  supportUrl: '/support/templates/oee-comprehensive',
  
  publishedAt: new Date('2024-01-15'),
  lastUpdatedAt: new Date('2024-06-15'),
  createdAt: new Date('2024-01-15'),
  
  usageHistory: [],
  reviews: [],
  versions: [],
  collectionItems: []
};

// Quality Control Dashboard Template
export const qualityControlTemplate: DashboardTemplate = {
  id: 'quality-control',
  uid: 'quality-control-v1',
  name: 'Quality Control Dashboard',
  title: 'Quality Metrics - ${production_line}',
  description: 'Comprehensive quality monitoring dashboard with SPC charts, defect tracking, and compliance metrics following ISO 9001 standards.',
  summary: 'ISO 9001 compliant quality dashboard with SPC charts and defect analysis',
  
  config: {
    title: 'Quality Metrics - ${production_line}',
    description: 'Quality control and statistical process control monitoring',
    tags: ['quality', 'spc', 'iso9001', 'defects'],
    schemaVersion: 30,
    version: 1,
    timezone: 'browser',
    fiscalYearStartMonth: 0,
    liveNow: true,
    weekStart: '',
    style: 'dark',
    editable: true,
    hideControls: false,
    graphTooltip: 1,
    preload: false,
    time: {
      from: '${time_range}',
      to: 'now'
    },
    timepicker: {
      refresh_intervals: ['5s', '10s', '30s', '1m', '5m', '15m', '30m', '1h', '2h', '1d'],
      time_options: ['5m', '15m', '1h', '6h', '12h', '24h', '2d', '7d', '30d']
    },
    templating: {
      list: []
    },
    annotations: {
      list: [
        {
          name: 'Quality Alerts',
          datasource: 'prometheus',
          enable: true,
          iconColor: 'orange',
          query: 'quality_alerts{line="${production_line}"}',
          type: 'event'
        }
      ]
    },
    links: [],
    panels: [
      // First Pass Yield
      {
        id: 1,
        type: 'stat',
        title: 'First Pass Yield',
        gridPos: { x: 0, y: 0, w: 6, h: 4 },
        targets: [
          {
            refId: 'A',
            expr: 'quality_first_pass_yield{line="${production_line}"}',
            legendFormat: 'FPY %'
          }
        ],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            decimals: 2,
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 0, color: 'red' },
                { value: 95, color: 'yellow' },
                { value: 98, color: 'green' }
              ]
            }
          },
          overrides: []
        },
        options: {
          colorMode: 'background',
          graphMode: 'area',
          justifyMode: 'center',
          orientation: 'horizontal'
        },
        transformations: [],
        transparent: false,
        datasource: { type: 'prometheus' },
        description: 'Percentage of products that pass quality inspection on first attempt',
        links: [],
        repeat: undefined,
        repeatDirection: undefined,
        maxDataPoints: undefined,
        interval: undefined,
        cacheTimeout: undefined,
        timeFrom: undefined,
        timeShift: undefined,
        hideTimeOverride: undefined,
        libraryPanel: undefined
      },

      // Defect Rate
      {
        id: 2,
        type: 'stat',
        title: 'Defect Rate',
        gridPos: { x: 6, y: 0, w: 6, h: 4 },
        targets: [
          {
            refId: 'A',
            expr: 'quality_defect_rate{line="${production_line}"}',
            legendFormat: 'Defect Rate %'
          }
        ],
        fieldConfig: {
          defaults: {
            unit: 'percent',
            decimals: 2,
            thresholds: {
              mode: 'absolute',
              steps: [
                { value: 0, color: 'green' },
                { value: 2, color: 'yellow' },
                { value: 5, color: 'red' }
              ]
            }
          },
          overrides: []
        },
        options: {
          colorMode: 'background',
          graphMode: 'area',
          justifyMode: 'center',
          orientation: 'horizontal'
        },
        transformations: [],
        transparent: false,
        datasource: { type: 'prometheus' },
        description: 'Percentage of products with defects',
        links: [],
        repeat: undefined,
        repeatDirection: undefined,
        maxDataPoints: undefined,
        interval: undefined,
        cacheTimeout: undefined,
        timeFrom: undefined,
        timeShift: undefined,
        hideTimeOverride: undefined,
        libraryPanel: undefined
      },

      // SPC Chart for Critical Dimension
      {
        id: 3,
        type: 'timeseries',
        title: 'Critical Dimension Control Chart',
        gridPos: { x: 0, y: 4, w: 24, h: 8 },
        targets: [
          {
            refId: 'A',
            expr: 'quality_critical_dimension{line="${production_line}"}',
            legendFormat: 'Measurement'
          },
          {
            refId: 'B',
            expr: 'quality_upper_control_limit{line="${production_line}"}',
            legendFormat: 'UCL'
          },
          {
            refId: 'C',
            expr: 'quality_lower_control_limit{line="${production_line}"}',
            legendFormat: 'LCL'
          },
          {
            refId: 'D',
            expr: 'quality_target_value{line="${production_line}"}',
            legendFormat: 'Target'
          }
        ],
        fieldConfig: {
          defaults: {
            unit: 'mm',
            decimals: 3,
            custom: {
              drawStyle: 'line',
              lineInterpolation: 'linear',
              lineWidth: 1,
              fillOpacity: 0,
              spanNulls: false,
              showPoints: 'always',
              pointSize: 3
            }
          },
          overrides: [
            {
              matcher: { id: 'byName', options: 'UCL' },
              properties: [
                { id: 'color', value: { mode: 'fixed', fixedColor: 'red' } },
                { id: 'custom.drawStyle', value: 'line' },
                { id: 'custom.lineStyle', value: { dash: [10, 10] } }
              ]
            },
            {
              matcher: { id: 'byName', options: 'LCL' },
              properties: [
                { id: 'color', value: { mode: 'fixed', fixedColor: 'red' } },
                { id: 'custom.drawStyle', value: 'line' },
                { id: 'custom.lineStyle', value: { dash: [10, 10] } }
              ]
            },
            {
              matcher: { id: 'byName', options: 'Target' },
              properties: [
                { id: 'color', value: { mode: 'fixed', fixedColor: 'green' } },
                { id: 'custom.drawStyle', value: 'line' },
                { id: 'custom.lineStyle', value: { dash: [5, 5] } }
              ]
            }
          ]
        },
        options: {
          tooltip: { mode: 'multi', sort: 'none' },
          legend: { 
            displayMode: 'table',
            placement: 'bottom',
            values: ['last', 'min', 'max', 'mean', 'stdDev']
          }
        },
        transformations: [],
        transparent: false,
        datasource: { type: 'prometheus' },
        description: 'Statistical Process Control chart for critical dimension monitoring',
        links: [],
        repeat: undefined,
        repeatDirection: undefined,
        maxDataPoints: undefined,
        interval: undefined,
        cacheTimeout: undefined,
        timeFrom: undefined,
        timeShift: undefined,
        hideTimeOverride: undefined,
        libraryPanel: undefined
      }
    ],
    refresh: '30s',
    meta: {
      canSave: true,
      canEdit: true,
      canAdmin: true,
      canStar: true,
      canDelete: true
    }
  } as Dashboard,

  variables: [
    ...commonVariables.slice(0, 3), // production_line, shift, department
    {
      name: 'quality_metric',
      type: 'select',
      label: 'Quality Metric',
      description: 'Select the quality metric to analyze',
      required: true,
      options: [
        { label: 'Critical Dimension', value: 'critical_dimension' },
        { label: 'Surface Roughness', value: 'surface_roughness' },
        { label: 'Tensile Strength', value: 'tensile_strength' },
        { label: 'Color Consistency', value: 'color_consistency' }
      ],
      defaultValue: 'critical_dimension'
    }
  ],

  categoryId: 'quality',
  tags: ['quality', 'spc', 'iso9001', 'control-charts', 'defects'],
  industry: ['automotive', 'aerospace', 'pharmaceuticals', 'electronics'],
  
  version: '1.0.0',
  schemaVersion: 1,
  compatibleWith: ['analyticsPlatform-9.x', 'analyticsPlatform-10.x'],
  dependencies: ['prometheus', 'timescaledb'],
  
  isPublic: true,
  isFeatured: true,
  isOfficial: true,
  isDeprecated: false,
  
  downloadCount: 0,
  rating: 4.6,
  ratingCount: 18,
  
  manufacturingType: 'quality',
  equipmentTypes: ['inspection-station', 'cmm', 'testing-equipment'],
  isoStandards: ['ISO9001', 'ISO9004'],
  kpiTypes: ['first-pass-yield', 'defect-rate', 'quality-cost'],
  
  authorId: 'system',
  authorName: 'Quality Engineering Team',
  authorEmail: 'quality@company.com',
  organization: 'Manufacturing AnalyticsPlatform',
  
  documentationUrl: '/docs/templates/quality-control',
  supportUrl: '/support/templates/quality-control',
  
  publishedAt: new Date('2024-01-20'),
  lastUpdatedAt: new Date('2024-06-10'),
  createdAt: new Date('2024-01-20'),
  
  usageHistory: [],
  reviews: [],
  versions: [],
  collectionItems: []
};

// Export all manufacturing templates
export const manufacturingTemplates: DashboardTemplate[] = [
  oeeComprehensiveTemplate,
  qualityControlTemplate
  // Additional templates can be added here
];

export default manufacturingTemplates;