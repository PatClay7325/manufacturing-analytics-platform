/**
 * Dashboard Configuration for Manufacturing AnalyticsPlatform
 * This configuration integrates with the existing Prisma database
 */

export const DASHBOARD_CONFIG = {
  // Dashboard metadata
  dashboards: {
    manufacturing: {
      id: 'manufacturing-main',
      name: 'Manufacturing Intelligence Dashboard',
      description: 'Real-time manufacturing metrics and Analytics',
      category: 'operations'
    },
    oee: {
      id: 'oee-Analytics',
      name: 'OEE Analytics',
      description: 'Overall Equipment Effectiveness monitoring',
      category: 'performance'
    },
    equipment: {
      id: 'equipment-health',
      name: 'Equipment Health',
      description: 'Equipment status and health monitoring',
      category: 'maintenance'
    },
    production: {
      id: 'production-lines',
      name: 'Production Lines',
      description: 'Production line performance and throughput',
      category: 'operations'
    },
    quality: {
      id: 'quality-control',
      name: 'Quality Control',
      description: 'Quality metrics and defect analysis',
      category: 'quality'
    },
    maintenance: {
      id: 'maintenance-schedule',
      name: 'Maintenance',
      description: 'Maintenance planning and history',
      category: 'maintenance'
    }
  },

  // Panel configurations
  panels: {
    // OEE Panels
    oeeOverview: {
      id: 'oee-overview',
      title: 'OEE Overview',
      type: 'gauge',
      dataSource: 'prisma',
      query: {
        metric: 'oee',
        aggregation: 'avg',
        period: 'last-1h'
      }
    },
    oeeTrend: {
      id: 'oee-trend',
      title: 'OEE Trend',
      type: 'timeseries',
      dataSource: 'prisma',
      query: {
        metric: 'oee',
        aggregation: 'avg',
        period: 'last-24h',
        interval: '1h'
      }
    },
    availability: {
      id: 'availability',
      title: 'Availability',
      type: 'stat',
      dataSource: 'prisma',
      query: {
        metric: 'availability',
        aggregation: 'avg',
        period: 'last-1h'
      }
    },
    performance: {
      id: 'performance',
      title: 'Performance',
      type: 'stat',
      dataSource: 'prisma',
      query: {
        metric: 'performance',
        aggregation: 'avg',
        period: 'last-1h'
      }
    },
    quality: {
      id: 'quality',
      title: 'Quality',
      type: 'stat',
      dataSource: 'prisma',
      query: {
        metric: 'quality',
        aggregation: 'avg',
        period: 'last-1h'
      }
    },

    // Production Panels
    productionRate: {
      id: 'production-rate',
      title: 'Production Rate',
      type: 'timeseries',
      dataSource: 'prisma',
      query: {
        metric: 'production_rate',
        aggregation: 'sum',
        period: 'last-24h',
        interval: '1h'
      }
    },
    cycleTime: {
      id: 'cycle-time',
      title: 'Cycle Time',
      type: 'timeseries',
      dataSource: 'prisma',
      query: {
        metric: 'cycle_time',
        aggregation: 'avg',
        period: 'last-24h',
        interval: '1h'
      }
    },

    // Equipment Panels
    equipmentStatus: {
      id: 'equipment-status',
      title: 'Equipment Status',
      type: 'table',
      dataSource: 'prisma',
      query: {
        entity: 'equipment',
        fields: ['name', 'status', 'lastUpdate'],
        sort: 'lastUpdate:desc'
      }
    },
    equipmentHealth: {
      id: 'equipment-health',
      title: 'Equipment Health Score',
      type: 'heatmap',
      dataSource: 'prisma',
      query: {
        metric: 'health_score',
        groupBy: 'equipment',
        period: 'last-7d'
      }
    },

    // Quality Panels
    defectRate: {
      id: 'defect-rate',
      title: 'Defect Rate',
      type: 'timeseries',
      dataSource: 'prisma',
      query: {
        metric: 'defect_rate',
        aggregation: 'avg',
        period: 'last-24h',
        interval: '1h'
      }
    },
    defectTypes: {
      id: 'defect-types',
      title: 'Defect Types',
      type: 'piechart',
      dataSource: 'prisma',
      query: {
        metric: 'defect_count',
        groupBy: 'defect_type',
        period: 'last-7d'
      }
    },

    // Maintenance Panels
    mtbf: {
      id: 'mtbf',
      title: 'Mean Time Between Failures',
      type: 'stat',
      dataSource: 'prisma',
      query: {
        metric: 'mtbf',
        aggregation: 'avg',
        period: 'last-30d'
      }
    },
    mttr: {
      id: 'mttr',
      title: 'Mean Time To Repair',
      type: 'stat',
      dataSource: 'prisma',
      query: {
        metric: 'mttr',
        aggregation: 'avg',
        period: 'last-30d'
      }
    },
    maintenanceSchedule: {
      id: 'maintenance-schedule',
      title: 'Upcoming Maintenance',
      type: 'table',
      dataSource: 'prisma',
      query: {
        entity: 'maintenanceSchedule',
        fields: ['equipment', 'type', 'scheduledDate', 'priority'],
        filter: 'scheduledDate:future',
        sort: 'scheduledDate:asc'
      }
    }
  },

  // Time range configurations
  timeRanges: {
    'last-5m': { from: 'now-5m', to: 'now', display: 'Last 5 minutes' },
    'last-15m': { from: 'now-15m', to: 'now', display: 'Last 15 minutes' },
    'last-30m': { from: 'now-30m', to: 'now', display: 'Last 30 minutes' },
    'last-1h': { from: 'now-1h', to: 'now', display: 'Last 1 hour' },
    'last-3h': { from: 'now-3h', to: 'now', display: 'Last 3 hours' },
    'last-6h': { from: 'now-6h', to: 'now', display: 'Last 6 hours' },
    'last-12h': { from: 'now-12h', to: 'now', display: 'Last 12 hours' },
    'last-24h': { from: 'now-24h', to: 'now', display: 'Last 24 hours' },
    'last-7d': { from: 'now-7d', to: 'now', display: 'Last 7 days' },
    'last-30d': { from: 'now-30d', to: 'now', display: 'Last 30 days' },
    'last-90d': { from: 'now-90d', to: 'now', display: 'Last 90 days' }
  },

  // Refresh intervals
  refreshIntervals: {
    off: null,
    '5s': 5000,
    '10s': 10000,
    '30s': 30000,
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '30m': 1800000,
    '1h': 3600000,
    '2h': 7200000,
    '1d': 86400000
  },

  // Default settings
  defaults: {
    timeRange: 'last-6h',
    refreshInterval: '30s',
    theme: 'light'
  },

  // Layout configurations
  layouts: {
    manufacturing: {
      rows: [
        {
          panels: ['oeeOverview', 'availability', 'performance', 'quality'],
          height: 250
        },
        {
          panels: ['oeeTrend'],
          height: 300
        },
        {
          panels: ['productionRate', 'cycleTime'],
          height: 300
        }
      ]
    },
    equipment: {
      rows: [
        {
          panels: ['equipmentStatus'],
          height: 400
        },
        {
          panels: ['equipmentHealth'],
          height: 300
        }
      ]
    },
    quality: {
      rows: [
        {
          panels: ['defectRate'],
          height: 300
        },
        {
          panels: ['defectTypes'],
          height: 300
        }
      ]
    },
    maintenance: {
      rows: [
        {
          panels: ['mtbf', 'mttr'],
          height: 200
        },
        {
          panels: ['maintenanceSchedule'],
          height: 400
        }
      ]
    }
  }
};

// Helper function to get panel configuration
export function getPanelConfig(panelId: string) {
  return DASHBOARD_CONFIG.panels[panelId as keyof typeof DASHBOARD_CONFIG.panels];
}

// Helper function to get dashboard layout
export function getDashboardLayout(dashboardId: string) {
  return DASHBOARD_CONFIG.layouts[dashboardId as keyof typeof DASHBOARD_CONFIG.layouts];
}

// Helper function to get time range configuration
export function getTimeRangeConfig(rangeKey: string) {
  return DASHBOARD_CONFIG.timeRanges[rangeKey as keyof typeof DASHBOARD_CONFIG.timeRanges];
}