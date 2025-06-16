import { 
  ProductionMetrics,
  DowntimeReason,
  QualityMetrics,
  DashboardMetrics
} from '@/services/api/metricsApi';

// Mock production metrics for different lines
const productionMetrics: ProductionMetrics[] = [
  {
    lineId: 'line-1',
    lineName: 'Production Line A',
    target: 1200,
    actual: 1140,
    oee: 85.5,
    availability: 92.0,
    performance: 88.5,
    quality: 96.2,
    period: 'daily'
  },
  {
    lineId: 'line-2',
    lineName: 'Production Line B',
    target: 800,
    actual: 788,
    oee: 87.2,
    availability: 94.5,
    performance: 89.8,
    quality: 97.3,
    period: 'daily'
  },
  {
    lineId: 'line-3',
    lineName: 'Production Line C',
    target: 1500,
    actual: 1350,
    oee: 82.1,
    availability: 88.3,
    performance: 86.5,
    quality: 95.8,
    period: 'daily'
  },
  {
    lineId: 'line-4',
    lineName: 'Assembly Line 1',
    target: 600,
    actual: 588,
    oee: 89.5,
    availability: 95.2,
    performance: 91.8,
    quality: 98.2,
    period: 'daily'
  },
  {
    lineId: 'line-5',
    lineName: 'Assembly Line 2',
    target: 550,
    actual: 495,
    oee: 81.0,
    availability: 87.5,
    performance: 84.3,
    quality: 94.6,
    period: 'daily'
  }
];

// Mock downtime reasons
const downtimeReasons: DowntimeReason[] = [
  {
    reason: 'Changeover',
    hours: 4.2,
    percentage: 45,
    change: 5 // 5% increase from previous period
  },
  {
    reason: 'Equipment Failure',
    hours: 2.3,
    percentage: 25,
    change: -3 // 3% decrease from previous period
  },
  {
    reason: 'Material Shortage',
    hours: 1.4,
    percentage: 15,
    change: 2 // 2% increase from previous period
  },
  {
    reason: 'Quality Adjustments',
    hours: 0.9,
    percentage: 10,
    change: -1 // 1% decrease from previous period
  },
  {
    reason: 'Other',
    hours: 0.5,
    percentage: 5,
    change: -3 // 3% decrease from previous period
  }
];

// Mock quality metrics
const qualityMetrics: QualityMetrics = {
  period: 'daily',
  rejectRate: 2.8,
  previousRate: 3.2,
  changePercentage: -12.5, // 12.5% improvement
  defectCategories: [
    {
      name: 'Surface Scratches',
      percentage: 42,
      change: -5
    },
    {
      name: 'Dimensional Errors',
      percentage: 28,
      change: 3
    },
    {
      name: 'Material Defects',
      percentage: 15,
      change: -2
    },
    {
      name: 'Assembly Issues',
      percentage: 10,
      change: 1
    },
    {
      name: 'Other',
      percentage: 5,
      change: 3
    }
  ]
};

// Mock dashboard metrics
const dashboardMetrics: DashboardMetrics = {
  totalEquipment: 25,
  operationalEquipment: 21,
  equipmentInMaintenance: 3,
  offlineEquipment: 1,
  averageOee: 85.2,
  productionTarget: 4650,
  productionActual: 4361,
  productionProgress: 93.8,
  qualityRejectRate: 2.8,
  alertsCritical: 2,
  alertsHigh: 3,
  alertsMedium: 5,
  alertsLow: 2
};

// Mock OEE trend data (30 days)
const generateOeeTrend = (days = 30) => {
  const result = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (days - 1 - i));
    
    // Base OEE with some random variation
    const baseOee = 85;
    const variation = Math.sin(i / 5) * 3; // Sinusoidal variation
    const randomFactor = (Math.random() - 0.5) * 2; // Random factor between -1 and 1
    
    let oee = baseOee + variation + randomFactor;
    
    // Ensure OEE is within reasonable bounds
    oee = Math.max(75, Math.min(95, oee));
    oee = parseFloat(oee.toFixed(1));
    
    result.push({
      date: date.toISOString().split('T')[0],
      oee
    });
  }
  
  return result;
};

// Mock production trend data (30 days)
const generateProductionTrend = (days = 30) => {
  const result = [];
  const today = new Date();
  const baseTarget = 1200;
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (days - 1 - i));
    
    // Weekend days have lower targets
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const target = isWeekend ? baseTarget * 0.7 : baseTarget;
    
    // Actual production with some variation
    const efficiency = 0.9 + (Math.random() * 0.15); // 90% to 105% efficiency
    const actual = Math.round(target * efficiency);
    
    result.push({
      date: date.toISOString().split('T')[0],
      target,
      actual
    });
  }
  
  return result;
};

// Mock quality trend data (30 days)
const generateQualityTrend = (days = 30) => {
  const result = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (days - 1 - i));
    
    // Base reject rate with improvement trend and some random variation
    const baseRate = 3.5 - (i / days) * 1; // Improving trend from ~3.5% to ~2.5%
    const randomFactor = (Math.random() - 0.5) * 0.6; // Random factor between -0.3 and 0.3
    
    let rejectRate = baseRate + randomFactor;
    
    // Ensure reject rate is within reasonable bounds
    rejectRate = Math.max(1.5, Math.min(4.5, rejectRate));
    rejectRate = parseFloat(rejectRate.toFixed(1));
    
    result.push({
      date: date.toISOString().split('T')[0],
      rejectRate
    });
  }
  
  return result;
};

// Mock equipment performance data
const equipmentPerformance = {
  'equip-1': {
    oee: 87.5,
    availability: 94.2,
    performance: 90.8,
    quality: 97.5,
    uptime: 22.6, // hours in last 24h
    downtime: 1.4  // hours in last 24h
  },
  'equip-2': {
    oee: 0, // Currently in maintenance
    availability: 0,
    performance: 0,
    quality: 0,
    uptime: 0,
    downtime: 24
  },
  'equip-3': {
    oee: 0, // Currently offline
    availability: 0,
    performance: 0,
    quality: 0,
    uptime: 0,
    downtime: 24
  },
  'equip-4': {
    oee: 91.2,
    availability: 96.7,
    performance: 93.4,
    quality: 98.2,
    uptime: 23.2,
    downtime: 0.8
  },
  'equip-5': {
    oee: 88.6,
    availability: 95.1,
    performance: 91.3,
    quality: 97.8,
    uptime: 22.8,
    downtime: 1.2
  }
};

// Export all mock metrics data
export const mockMetricsData = {
  productionMetrics,
  downtimeReasons,
  qualityMetrics,
  dashboardMetrics,
  oeeTrend: generateOeeTrend(),
  productionTrend: generateProductionTrend(),
  qualityTrend: generateQualityTrend(),
  equipmentPerformance
};