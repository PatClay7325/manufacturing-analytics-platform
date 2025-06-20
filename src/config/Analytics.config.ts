/**
 * Centralized Analytics Configuration
 * This file contains all Analytics-related settings to ensure consistency
 * across all dashboard components and prepare for live data transition
 */

export const GRAFANA_CONFIG = {
  // Base URL for Analytics instance
  baseUrl: process.env.NEXT_PUBLIC_Analytics_URL || 'http://localhost:3002',
  
  // Organization ID
  orgId: 1,
  
  // Default theme
  theme: 'light' as const,
  
  // Main dashboard configuration
  dashboard: {
    // Use a single standardized dashboard UID for all components
    uid: 'manufacturing-main',
    // Dashboard name/slug
    name: 'manufacturing-dashboard',
    // Dashboard title
    title: 'Manufacturing Intelligence Dashboard'
  },
  
  // Data source configuration
  dataSource: {
    // Current data source (will be 'testdata' for development)
    // This can be changed to 'prometheus', 'influxdb', etc. for production
    type: process.env.GRAFANA_DATASOURCE_TYPE || 'testdata',
    // Data source UID - will be set dynamically or via environment
    uid: process.env.GRAFANA_DATASOURCE_UID || 'testdata',
    // Data source name
    name: process.env.GRAFANA_DATASOURCE_NAME || 'TestData DB'
  },
  
  // Panel IDs - standardized across all dashboards
  panels: {
    // OEE and Performance
    oee: 1,
    oeeGauge: 2,
    oeeTrend: 3,
    oeeComponentsTrend: 4,
    availabilityTrend: 5,
    performanceTrend: 6,
    qualityTrend: 7,
    
    // Production Metrics
    productionByLine: 8,
    productionLineDetail: 9,
    productionRate: 10,
    productionVolume: 11,
    cycleTime: 12,
    
    // Quality Metrics
    qualityRate: 13,
    qualityAnalysis: 14,
    qualityDetail: 15,
    defectRate: 16,
    qualityDistribution: 17,
    defectTypes: 18,
    
    // Maintenance and Reliability
    reliabilityMetrics: 19,
    downtimeByReason: 20,
    downtimePareto: 21,
    mtbf: 22,
    mttr: 23,
    maintenanceSchedule: 24,
    
    // Root Cause Analysis
    rootCauseTable: 25,
    paretoChart: 26,
    fishboneDiagram: 27,
    failureAnalysis: 28,
    
    // Status and Alerts
    equipmentStatus: 29,
    alertsTable: 30,
    statusDistribution: 31,
    
    // Additional Analytics
    energyConsumption: 32,
    costAnalysis: 33,
    shiftPerformance: 34,
    operatorPerformance: 35
  },
  
  // Time range configurations
  timeRanges: {
    default: { from: 'now-6h', to: 'now' },
    last24h: { from: 'now-24h', to: 'now' },
    last7d: { from: 'now-7d', to: 'now' },
    last30d: { from: 'now-30d', to: 'now' },
    last90d: { from: 'now-90d', to: 'now' },
    lastYear: { from: 'now-1y', to: 'now' }
  },
  
  // Refresh intervals
  refreshIntervals: {
    realtime: '5s',
    fast: '10s',
    normal: '30s',
    slow: '1m',
    verySlow: '5m'
  },
  
  // Default settings
  defaults: {
    timeRange: 'default' as keyof typeof GRAFANA_CONFIG.timeRanges,
    refreshInterval: 'normal' as keyof typeof GRAFANA_CONFIG.refreshIntervals,
    kiosk: true, // Hide Analytics UI chrome
    hideControls: true // Hide panel controls
  }
};

// Helper function to build Analytics URLs
export function buildGrafanaUrl(options: {
  panelId?: number;
  timeRange?: keyof typeof GRAFANA_CONFIG.timeRanges;
  refresh?: keyof typeof GRAFANA_CONFIG.refreshIntervals;
  variables?: Record<string, string>;
  fullDashboard?: boolean;
  viewPanel?: number; // Add support for focusing on a specific panel
  dashboardView?: 'oee' | 'equipment' | 'production' | 'quality' | 'maintenance'; // Add view types
}) {
  const {
    panelId,
    timeRange = GRAFANA_CONFIG.defaults.timeRange,
    refresh = GRAFANA_CONFIG.defaults.refreshInterval,
    variables = {},
    fullDashboard = false,
    viewPanel,
    dashboardView
  } = options;
  
  const timeRangeConfig = GRAFANA_CONFIG.timeRanges[timeRange];
  const refreshInterval = GRAFANA_CONFIG.refreshIntervals[refresh];
  
  // Build query parameters
  const params = new URLSearchParams({
    orgId: GRAFANA_CONFIG.orgId.toString(),
    theme: GRAFANA_CONFIG.theme,
    from: timeRangeConfig.from,
    to: timeRangeConfig.to,
    refresh: refreshInterval
  });
  
  // Add kiosk mode
  if (GRAFANA_CONFIG.defaults.kiosk) {
    params.append('kiosk', '');
  }
  
  // Add hide controls for panels
  if (!fullDashboard && GRAFANA_CONFIG.defaults.hideControls) {
    params.append('hideControls', '1');
  }
  
  // Add variables
  Object.entries(variables).forEach(([key, value]) => {
    params.append(`var-${key}`, value);
  });
  
  // Add viewPanel if specified (focuses on a specific panel in full dashboard)
  if (viewPanel) {
    params.append('viewPanel', viewPanel.toString());
  }
  
  // Add dashboard view variable if specified
  if (dashboardView) {
    // Map view types to specific panels to focus on
    const viewPanelMap = {
      'oee': GRAFANA_CONFIG.panels.oee,
      'equipment': GRAFANA_CONFIG.panels.equipmentStatus,
      'production': GRAFANA_CONFIG.panels.productionByLine,
      'quality': GRAFANA_CONFIG.panels.qualityRate,
      'maintenance': GRAFANA_CONFIG.panels.mtbf
    };
    const focusPanel = viewPanelMap[dashboardView];
    if (focusPanel) {
      params.append('viewPanel', focusPanel.toString());
    }
  }
  
  // Build URL
  const baseUrl = GRAFANA_CONFIG.baseUrl;
  const dashboardUid = GRAFANA_CONFIG.dashboard.uid;
  const dashboardName = GRAFANA_CONFIG.dashboard.name;
  
  if (fullDashboard) {
    // Full dashboard URL
    return `${baseUrl}/d/${dashboardUid}/${dashboardName}?${params.toString()}`;
  } else if (panelId) {
    // Single panel URL (d-solo)
    params.append('panelId', panelId.toString());
    return `${baseUrl}/d-solo/${dashboardUid}/${dashboardName}?${params.toString()}`;
  } else {
    // Default to full dashboard
    return `${baseUrl}/d/${dashboardUid}/${dashboardName}?${params.toString()}`;
  }
}

// Export panel groups for easier access
export const PANEL_GROUPS = {
  oee: [
    GRAFANA_CONFIG.panels.oee,
    GRAFANA_CONFIG.panels.oeeGauge,
    GRAFANA_CONFIG.panels.oeeTrend,
    GRAFANA_CONFIG.panels.oeeComponentsTrend,
    GRAFANA_CONFIG.panels.availabilityTrend,
    GRAFANA_CONFIG.panels.performanceTrend,
    GRAFANA_CONFIG.panels.qualityTrend
  ],
  production: [
    GRAFANA_CONFIG.panels.productionByLine,
    GRAFANA_CONFIG.panels.productionLineDetail,
    GRAFANA_CONFIG.panels.productionRate,
    GRAFANA_CONFIG.panels.productionVolume,
    GRAFANA_CONFIG.panels.cycleTime
  ],
  quality: [
    GRAFANA_CONFIG.panels.qualityRate,
    GRAFANA_CONFIG.panels.qualityAnalysis,
    GRAFANA_CONFIG.panels.qualityDetail,
    GRAFANA_CONFIG.panels.defectRate,
    GRAFANA_CONFIG.panels.qualityDistribution,
    GRAFANA_CONFIG.panels.defectTypes
  ],
  maintenance: [
    GRAFANA_CONFIG.panels.reliabilityMetrics,
    GRAFANA_CONFIG.panels.downtimeByReason,
    GRAFANA_CONFIG.panels.downtimePareto,
    GRAFANA_CONFIG.panels.mtbf,
    GRAFANA_CONFIG.panels.mttr,
    GRAFANA_CONFIG.panels.maintenanceSchedule
  ],
  rootCause: [
    GRAFANA_CONFIG.panels.rootCauseTable,
    GRAFANA_CONFIG.panels.paretoChart,
    GRAFANA_CONFIG.panels.fishboneDiagram,
    GRAFANA_CONFIG.panels.failureAnalysis
  ],
  status: [
    GRAFANA_CONFIG.panels.equipmentStatus,
    GRAFANA_CONFIG.panels.alertsTable,
    GRAFANA_CONFIG.panels.statusDistribution
  ]
};