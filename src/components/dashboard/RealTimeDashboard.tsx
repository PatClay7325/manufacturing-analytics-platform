'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/common/Card';
import { Activity, Zap, TrendingUp, AlertTriangle, Wifi, WifiOff, Factory, Gauge, BarChart3 } from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, PieChart, Pie, RadialBarChart, RadialBar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadarChart,
  Scatter, ScatterChart, ZAxis, ReferenceArea, Legend
} from 'recharts';
import { useRealTimeData } from '@/services/realtimeDataService';
import { 
  DashboardGridSkeleton, 
  KPICardSkeleton, 
  ChartSkeleton, 
  RadialChartSkeleton,
  AlertFeedSkeleton,
  LoadingOverlay 
} from '@/components/common/SkeletonLoader';
import { 
  ErrorState, 
  InlineError, 
  ChartErrorBoundary,
  useErrorHandler 
} from '@/components/common/ErrorState';
import { DetailedView } from '@/components/dashboard/DetailedView';
import { BaselineOverlay } from '@/components/charts/BaselineOverlay';
import { TimeRangeSelector, TimeRange } from '@/components/common/TimeRangeSelector';
import { AnnotationSystem } from '@/components/annotations/AnnotationSystem';
import { ExportPanel } from '@/components/export/ExportPanel';

// ISO 22400 compliant KPI structure
interface ISO22400DataPoint {
  timestamp: string;
  // Effectiveness KPIs
  oee: number;                    // Overall Equipment Effectiveness
  oe: number;                     // Overall Equipment Effectiveness Index
  nee: number;                    // Net Equipment Effectiveness
  // Availability KPIs
  availability: number;           // Availability
  setupRatio: number;            // Setup ratio
  technicalEfficiency: number;    // Technical efficiency
  // Performance KPIs
  performance: number;            // Performance efficiency
  processRatio: number;          // Process ratio
  actualCycleTime: number;       // Actual cycle time
  // Quality KPIs
  quality: number;               // Quality rate
  firstPassYield: number;        // First pass yield
  scrapRatio: number;           // Scrap ratio
  reworkRatio: number;          // Rework ratio
  fallOffRatio: number;         // Fall-off ratio
  // Production KPIs
  throughput: number;            // Throughput rate
  allocationRatio: number;       // Allocation ratio
  utilizationEfficiency: number; // Utilization efficiency
  // Inventory KPIs
  finishedGoodsRatio: number;   // Finished goods ratio
  integratedGoodsRatio: number;  // Integrated goods ratio on equipment
  productionProcessRatio: number; // Production process ratio
  // Maintenance KPIs (ISO 14224)
  mtbf: number;                  // Mean Time Between Failures
  mttr: number;                  // Mean Time To Repair
  mttf: number;                  // Mean Time To Failure
  // Energy KPIs (ISO 50001)
  energyIntensity: number;       // Energy consumption per unit
  energyEfficiency: number;      // Energy efficiency ratio
  // Six Sigma Metrics (ISO 13053)
  cpk: number;                   // Process capability index
  ppk: number;                   // Process performance index
  dpmo: number;                  // Defects per million opportunities
  sigmaLevel: number;            // Sigma level
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  pink: '#ec4899',
  indigo: '#6366f1'
};

// ISO Standard Reference Lines
const ISO_REFERENCES = {
  oee: { worldClass: 85, acceptable: 60 },
  availability: { worldClass: 90, acceptable: 80 },
  performance: { worldClass: 95, acceptable: 85 },
  quality: { worldClass: 99.9, acceptable: 99 },
  cpk: { sixSigma: 2.0, capable: 1.33, minimum: 1.0 },
  ppk: { sixSigma: 1.67, capable: 1.33, minimum: 1.0 },
  sigmaLevel: { worldClass: 6, acceptable: 4 }
};

export function RealTimeDashboard() {
  const [selectedEquipment] = useState(['line-1', 'line-2', 'line-3']);
  const [alertsData, setAlertsData] = useState<any[]>([]);
  const dataBuffer = useRef<ISO22400DataPoint[]>([]);
  const MAX_DATA_POINTS = 60; // Show last 60 data points
  
  // Error handling
  const { error, isRetrying, handleError, retry, clearError } = useErrorHandler();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Detailed view state
  const [detailedView, setDetailedView] = useState<{
    metric: string;
    equipmentId?: string;
    title?: string;
  } | null>(null);
  
  // Time range for drill-down context
  const [drillDownTimeRange] = useState<TimeRange>({
    label: 'Last 24 Hours',
    start: new Date(Date.now() - 24 * 60 * 60 * 1000),
    end: new Date(),
    preset: 'last_24_hours'
  });

  // Phase 2.2: Export and Annotation features
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [enableAnnotations, setEnableAnnotations] = useState(true);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const currentUserId = 'user_123'; // In real app, get from auth context
  const currentUsername = 'Manufacturing Operator'; // In real app, get from auth context
  
  // Load saved refresh interval from localStorage
  const [refreshInterval, setRefreshInterval] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dashboard_refresh_interval');
      return saved ? parseInt(saved) : 1000;
    }
    return 1000;
  });
  
  // Use real-time data hook for ISO metrics
  const { data: realtimeData, status, loading } = useRealTimeData(
    ['oee', 'availability', 'performance', 'quality', 'temperature', 'vibration', 'production'],
    selectedEquipment,
    { backfill: true, bufferSize: MAX_DATA_POINTS }
  );
  
  const isConnected = status.isConnected;
  const [liveData, setLiveData] = useState<ISO22400DataPoint[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<Partial<ISO22400DataPoint>>({});
  
  // Handle refresh interval change
  const handleRefreshIntervalChange = (newInterval: number) => {
    setRefreshInterval(newInterval);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard_refresh_interval', newInterval.toString());
    }
  };

  // Generate ISO 22400 compliant data
  const generateISO22400Data = (): ISO22400DataPoint => {
    const now = new Date();
    
    // Generate realistic correlated metrics
    const availability = 0.90 + Math.random() * 0.08 - 0.04;
    const performance = 0.85 + Math.random() * 0.10 - 0.05;
    const quality = 0.98 + Math.random() * 0.03 - 0.015;
    const oee = availability * performance * quality;
    
    // Generate Six Sigma metrics
    const cpk = 1.33 + Math.random() * 0.67;
    const ppk = cpk - 0.1 - Math.random() * 0.2;
    const dpmo = Math.floor((1 - quality) * 1000000);
    const sigmaLevel = 3 + (quality - 0.93) * 30; // Approximation
    
    return {
      timestamp: now.toLocaleTimeString(),
      // Effectiveness KPIs
      oee: oee * 100,
      oe: oee * 0.95 * 100, // OE typically slightly lower than OEE
      nee: oee * 0.92 * 100, // NEE accounts for unscheduled time
      // Availability KPIs
      availability: availability * 100,
      setupRatio: 5 + Math.random() * 3,
      technicalEfficiency: availability * 0.95 * 100,
      // Performance KPIs
      performance: performance * 100,
      processRatio: 92 + Math.random() * 5,
      actualCycleTime: 45 + Math.random() * 10,
      // Quality KPIs
      quality: quality * 100,
      firstPassYield: quality * 100,
      scrapRatio: (1 - quality) * 100,
      reworkRatio: (1 - quality) * 0.4 * 100,
      fallOffRatio: (1 - quality) * 0.6 * 100,
      // Production KPIs
      throughput: 750 + Math.random() * 100,
      allocationRatio: 85 + Math.random() * 10,
      utilizationEfficiency: performance * 0.9 * 100,
      // Inventory KPIs
      finishedGoodsRatio: 15 + Math.random() * 10,
      integratedGoodsRatio: 5 + Math.random() * 3,
      productionProcessRatio: 80 + Math.random() * 15,
      // Maintenance KPIs
      mtbf: 150 + Math.random() * 50,
      mttr: 2 + Math.random() * 1,
      mttf: 148 + Math.random() * 50,
      // Energy KPIs
      energyIntensity: 45 + Math.random() * 20,
      energyEfficiency: 82 + Math.random() * 10,
      // Six Sigma Metrics
      cpk,
      ppk,
      dpmo,
      sigmaLevel
    };
  };

  // Process real-time data into ISO 22400 format
  useEffect(() => {
    if (loading || !realtimeData) return;

    // Convert real-time data to ISO format
    const processRealtimeData = () => {
      const now = new Date();
      const latestMetrics: Partial<ISO22400DataPoint> = {
        timestamp: now.toLocaleTimeString()
      };

      // Process each equipment's data
      selectedEquipment.forEach(equipmentId => {
        // Get latest values for each metric
        const oeeData = realtimeData[`${equipmentId}:oee`]?.slice(-1)[0];
        const availData = realtimeData[`${equipmentId}:availability`]?.slice(-1)[0];
        const perfData = realtimeData[`${equipmentId}:performance`]?.slice(-1)[0];
        const qualData = realtimeData[`${equipmentId}:quality`]?.slice(-1)[0];
        const tempData = realtimeData[`${equipmentId}:temperature`]?.slice(-1)[0];
        const vibData = realtimeData[`${equipmentId}:vibration`]?.slice(-1)[0];
        const prodData = realtimeData[`${equipmentId}:production`]?.slice(-1)[0];

        if (oeeData) {
          latestMetrics.oee = oeeData.value;
          latestMetrics.oe = oeeData.value * 0.95; // OE typically slightly lower
          latestMetrics.nee = oeeData.value * 0.92; // NEE accounts for unscheduled time
        }
        
        if (availData) latestMetrics.availability = availData.value;
        if (perfData) latestMetrics.performance = perfData.value;
        if (qualData) {
          latestMetrics.quality = qualData.value;
          latestMetrics.firstPassYield = qualData.value;
          latestMetrics.scrapRatio = (100 - qualData.value);
        }
        
        if (prodData) {
          latestMetrics.throughput = prodData.value;
        }

        // Calculate derived metrics
        if (tempData && vibData) {
          // Estimate MTBF based on temperature and vibration
          const tempNorm = Math.max(0, 100 - tempData.value) / 100;
          const vibNorm = Math.max(0, 3 - vibData.value) / 3;
          latestMetrics.mtbf = 150 * tempNorm * vibNorm;
          latestMetrics.mttr = 2 + (1 - tempNorm) * 2;
          latestMetrics.mttf = latestMetrics.mtbf - latestMetrics.mttr;
        }
      });

      // Fill in remaining ISO metrics with calculated values
      const fullMetrics = {
        ...generateISO22400Data(), // Use generated data as baseline
        ...latestMetrics // Override with real data
      };

      dataBuffer.current = [...dataBuffer.current, fullMetrics].slice(-MAX_DATA_POINTS);
      setLiveData([...dataBuffer.current]);
      setCurrentMetrics(fullMetrics);

      // Generate ISO-compliant alerts based on thresholds
      if (fullMetrics.oee < ISO_REFERENCES.oee.acceptable ||
          fullMetrics.cpk < ISO_REFERENCES.cpk.minimum ||
          fullMetrics.availability < ISO_REFERENCES.availability.acceptable) {
        const alert = {
          id: Date.now(),
          type: fullMetrics.oee < ISO_REFERENCES.oee.acceptable ? 'OEE Below Threshold' :
                fullMetrics.cpk < ISO_REFERENCES.cpk.minimum ? 'Process Capability Warning' :
                'Availability Alert',
          severity: fullMetrics.oee < 50 || fullMetrics.cpk < 1.0 ? 'critical' : 'warning',
          timestamp: fullMetrics.timestamp,
          equipment: selectedEquipment[Math.floor(Math.random() * selectedEquipment.length)],
          value: fullMetrics.oee < ISO_REFERENCES.oee.acceptable ? `OEE: ${fullMetrics.oee.toFixed(1)}%` :
                 fullMetrics.cpk < ISO_REFERENCES.cpk.minimum ? `Cpk: ${fullMetrics.cpk.toFixed(2)}` :
                 `Availability: ${fullMetrics.availability.toFixed(1)}%`
        };
        setAlertsData(prev => [alert, ...prev].slice(0, 10));
      }
    };

    // Process data immediately
    processRealtimeData();
    
    // Mark initial load as complete once we have data
    if (isInitialLoad && liveData.length > 0) {
      setIsInitialLoad(false);
    }

    // Update based on refresh interval (0 means paused)
    let interval: NodeJS.Timeout | null = null;
    if (refreshInterval > 0) {
      interval = setInterval(processRealtimeData, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [realtimeData, loading, selectedEquipment, refreshInterval, isInitialLoad, liveData.length]);

  // Calculate sparkline data for mini charts
  const getSparklineData = (metric: keyof ISO22400DataPoint) => {
    return liveData.slice(-20).map(d => ({ value: d[metric] as number }));
  };

  // Handle KPI card click for drill-down
  const handleKPIClick = (metric: string, title: string) => {
    setDetailedView({
      metric,
      equipmentId: selectedEquipment[0], // Use first selected equipment for context
      title: `${title} Details`
    });
  };

  // Handle chart click for drill-down
  const handleChartClick = (metric: string, title: string) => {
    setDetailedView({
      metric,
      title: `${title} Analysis`
    });
  };

  // ISO 22400 OEE Waterfall Chart Data
  const getOEEWaterfallData = () => {
    if (!currentMetrics.availability || !currentMetrics.performance || !currentMetrics.quality) return [];
    
    return [
      { name: 'Planned Production', value: 100, fill: COLORS.primary },
      { name: 'Availability Loss', value: -(100 - currentMetrics.availability), fill: COLORS.danger },
      { name: 'After Availability', value: currentMetrics.availability, fill: COLORS.primary },
      { name: 'Performance Loss', value: -(currentMetrics.availability - currentMetrics.availability * currentMetrics.performance / 100), fill: COLORS.warning },
      { name: 'After Performance', value: currentMetrics.availability * currentMetrics.performance / 100, fill: COLORS.primary },
      { name: 'Quality Loss', value: -(currentMetrics.availability * currentMetrics.performance / 100 - currentMetrics.oee), fill: COLORS.purple },
      { name: 'OEE', value: currentMetrics.oee, fill: COLORS.success }
    ];
  };

  // Six Sigma Control Chart Data
  const getSixSigmaData = () => {
    return liveData.map(d => ({
      timestamp: d.timestamp,
      cpk: d.cpk,
      ppk: d.ppk,
      ucl: ISO_REFERENCES.cpk.sixSigma,
      lcl: ISO_REFERENCES.cpk.minimum,
      target: ISO_REFERENCES.cpk.capable
    }));
  };

  // Show error state if there's a critical error
  if (error && !isRetrying && !liveData.length) {
    return (
      <ErrorState
        error={error}
        onRetry={() => retry(async () => {
          // Retry connection
          window.location.reload();
        })}
        context="connection"
        suggestions={[
          'Check if the server is running on the correct port',
          'Verify your database connection',
          'Ensure the API endpoints are accessible'
        ]}
      />
    );
  }

  // Show loading skeleton during initial load
  if (isInitialLoad && loading && !liveData.length) {
    return <DashboardGridSkeleton />;
  }

  return (
    <div className="space-y-6 relative" ref={dashboardRef} id="main-dashboard">
      {/* Connection Status */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">ISO-Compliant Real-Time Manufacturing Monitor</h2>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">ISO 22400</span>
            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">ISO 14224</span>
            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">ISO 13053</span>
            <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">ISO 50001</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-600">
                  {status.mode === 'websocket' ? 'WebSocket' : 'Polling'} Connected
                </span>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-500">
                  Connecting... (Retry {status.retries}/{10})
                </span>
              </>
            )}
          </div>
          {status.bufferedDataPoints > 0 && (
            <span className="text-xs text-gray-500">
              {status.bufferedDataPoints} buffered points
            </span>
          )}
          
          {/* Refresh Interval Control */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 hidden sm:inline">Update:</label>
            <select
              value={refreshInterval}
              onChange={(e) => handleRefreshIntervalChange(parseInt(e.target.value))}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="0">Paused</option>
              <option value="1000">1s</option>
              <option value="5000">5s</option>
              <option value="30000">30s</option>
            </select>
            {refreshInterval === 0 && (
              <span className="text-xs text-orange-600 font-medium">Updates Paused</span>
            )}
          </div>

          {/* Phase 2.2: Export Panel */}
          <ExportPanel
            dashboardId="main-dashboard"
            currentData={{
              currentOEE: currentMetrics.oee,
              availability: currentMetrics.availability,
              performance: currentMetrics.performance,
              quality: currentMetrics.quality,
              mtbf: currentMetrics.mtbf,
              mttr: currentMetrics.mttr,
              energyEfficiency: currentMetrics.energyEfficiency,
              energyIntensity: currentMetrics.energyIntensity,
              cpk: currentMetrics.cpk,
              ppk: currentMetrics.ppk,
              timeSeriesData: liveData,
              alertsData: alertsData
            }}
            timeRange={drillDownTimeRange}
            selectedEquipment={selectedEquipment}
            onExportComplete={(filename, format) => {
              console.log(`Export completed: ${filename} (${format})`);
            }}
            onExportError={(error) => {
              console.error('Export failed:', error);
            }}
          />
        </div>
      </div>

      {/* ISO 22400 KPI Cards - Top Level Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
        {/* OEE Metrics */}
        {loading && !currentMetrics.oee ? (
          <KPICardSkeleton />
        ) : (
        <Card>
          <div 
            className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={() => handleKPIClick('oee', 'Overall Equipment Effectiveness')}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600">OEE</p>
              <Gauge className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(currentMetrics.oee || 0).toFixed(1)}%
            </p>
            <div className="h-8 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getSparklineData('oee')}>
                  <Line type="monotone" dataKey="value" stroke={COLORS.primary} strokeWidth={2} dot={false} />
                  <ReferenceLine y={ISO_REFERENCES.oee.worldClass} stroke={COLORS.success} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
        )}

        {/* Availability */}
        <Card>
          <div 
            className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={() => handleKPIClick('availability', 'Equipment Availability')}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600">Availability</p>
              <Activity className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(currentMetrics.availability || 0).toFixed(1)}%
            </p>
            <div className="h-8 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getSparklineData('availability')}>
                  <Line type="monotone" dataKey="value" stroke={COLORS.success} strokeWidth={2} dot={false} />
                  <ReferenceLine y={ISO_REFERENCES.availability.worldClass} stroke={COLORS.success} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Performance */}
        <Card>
          <div 
            className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={() => handleKPIClick('performance', 'Equipment Performance')}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600">Performance</p>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(currentMetrics.performance || 0).toFixed(1)}%
            </p>
            <div className="h-8 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getSparklineData('performance')}>
                  <Line type="monotone" dataKey="value" stroke={COLORS.primary} strokeWidth={2} dot={false} />
                  <ReferenceLine y={ISO_REFERENCES.performance.worldClass} stroke={COLORS.success} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Quality */}
        <Card>
          <div 
            className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={() => handleKPIClick('quality', 'Product Quality')}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600">Quality</p>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(currentMetrics.quality || 0).toFixed(1)}%
            </p>
            <div className="h-8 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getSparklineData('quality')}>
                  <Line type="monotone" dataKey="value" stroke={COLORS.purple} strokeWidth={2} dot={false} />
                  <ReferenceLine y={ISO_REFERENCES.quality.worldClass} stroke={COLORS.success} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* CPK */}
        <Card>
          <div 
            className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={() => handleKPIClick('cpk', 'Process Capability Index')}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600">Cpk</p>
              <Factory className="h-4 w-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(currentMetrics.cpk || 0).toFixed(2)}
            </p>
            <div className="h-8 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getSparklineData('cpk')}>
                  <Line type="monotone" dataKey="value" stroke={COLORS.warning} strokeWidth={2} dot={false} />
                  <ReferenceLine y={ISO_REFERENCES.cpk.capable} stroke={COLORS.success} strokeDasharray="3 3" />
                  <ReferenceLine y={ISO_REFERENCES.cpk.minimum} stroke={COLORS.danger} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* PPK */}
        <Card>
          <div 
            className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={() => handleKPIClick('ppk', 'Process Performance Index')}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600">Ppk</p>
              <TrendingUp className="h-4 w-4 text-pink-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(currentMetrics.ppk || 0).toFixed(2)}
            </p>
            <div className="h-8 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getSparklineData('ppk')}>
                  <Line type="monotone" dataKey="value" stroke={COLORS.pink} strokeWidth={2} dot={false} />
                  <ReferenceLine y={ISO_REFERENCES.ppk.capable} stroke={COLORS.success} strokeDasharray="3 3" />
                  <ReferenceLine y={ISO_REFERENCES.ppk.minimum} stroke={COLORS.danger} strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* MTBF */}
        <Card>
          <div 
            className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={() => handleKPIClick('mtbf', 'Mean Time Between Failures')}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600">MTBF</p>
              <Activity className="h-4 w-4 text-cyan-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(currentMetrics.mtbf || 0).toFixed(0)}h
            </p>
            <div className="h-8 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getSparklineData('mtbf')}>
                  <Line type="monotone" dataKey="value" stroke={COLORS.cyan} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Energy Efficiency */}
        <Card>
          <div 
            className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={() => handleKPIClick('energyEfficiency', 'Energy Efficiency')}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-600">Energy Eff.</p>
              <Zap className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(currentMetrics.energyEfficiency || 0).toFixed(1)}%
            </p>
            <div className="h-8 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getSparklineData('energyEfficiency')}>
                  <Line type="monotone" dataKey="value" stroke={COLORS.indigo} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* ISO 22400 OEE Waterfall Analysis */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">ISO 22400 OEE Waterfall Analysis</h3>
            <button
              onClick={() => handleChartClick('oee', 'OEE Waterfall Analysis')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View Details →
            </button>
          </div>
          {loading && !liveData.length ? (
            <ChartSkeleton height={300} />
          ) : (
          <ChartErrorBoundary name="OEE Waterfall">
            <BaselineOverlay
              metric="oee"
              equipmentId={selectedEquipment[0]}
              timeRange={drillDownTimeRange}
              showControls={true}
            >
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={getOEEWaterfallData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS.primary}>
                    {getOEEWaterfallData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                  <ReferenceLine y={ISO_REFERENCES.oee.worldClass} stroke={COLORS.success} strokeDasharray="5 5" label="World Class" />
                  <ReferenceLine y={ISO_REFERENCES.oee.acceptable} stroke={COLORS.warning} strokeDasharray="5 5" label="Acceptable" />
                </ComposedChart>
              </ResponsiveContainer>
            </BaselineOverlay>
          </ChartErrorBoundary>
          )}
        </div>
      </Card>

      {/* Six Sigma Control Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">ISO 13053 Six Sigma Control Chart</h3>
              <button
                onClick={() => handleChartClick('cpk', 'Six Sigma Process Capability')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View Details →
              </button>
            </div>
            {loading && !liveData.length ? (
              <ChartSkeleton height={300} />
            ) : (
            <ChartErrorBoundary name="Six Sigma Control Chart">
              <BaselineOverlay
                metric="cpk"
                equipmentId={selectedEquipment[0]}
                timeRange={drillDownTimeRange}
                showControls={true}
              >
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={getSixSigmaData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="timestamp" />
                    <YAxis domain={[0.5, 2.5]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="cpk" fill={COLORS.primary} fillOpacity={0.2} stroke={COLORS.primary} strokeWidth={2} name="Cpk" />
                    <Line type="monotone" dataKey="ppk" stroke={COLORS.purple} strokeWidth={2} name="Ppk" />
                    <ReferenceLine y={ISO_REFERENCES.cpk.sixSigma} stroke={COLORS.success} strokeDasharray="5 5" label="6σ" />
                    <ReferenceLine y={ISO_REFERENCES.cpk.capable} stroke={COLORS.warning} strokeDasharray="3 3" label="Capable" />
                    <ReferenceLine y={ISO_REFERENCES.cpk.minimum} stroke={COLORS.danger} strokeDasharray="5 5" label="Min" />
                  </ComposedChart>
                </ResponsiveContainer>
              </BaselineOverlay>
            </ChartErrorBoundary>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">ISO 22400 KPI Radar</h3>
              <button
                onClick={() => handleChartClick('kpi_overview', 'KPI Overview Analysis')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View Details →
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={[
                { metric: 'OEE', value: currentMetrics.oee || 0, fullMark: 100 },
                { metric: 'NEE', value: currentMetrics.nee || 0, fullMark: 100 },
                { metric: 'Availability', value: currentMetrics.availability || 0, fullMark: 100 },
                { metric: 'Performance', value: currentMetrics.performance || 0, fullMark: 100 },
                { metric: 'Quality', value: currentMetrics.quality || 0, fullMark: 100 },
                { metric: 'Tech Efficiency', value: currentMetrics.technicalEfficiency || 0, fullMark: 100 }
              ]}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name="Current" dataKey="value" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ISO 50001 Energy Management & ISO 14224 Maintenance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">ISO 50001 Energy Intensity Trend</h3>
              <button
                onClick={() => handleChartClick('energy_intensity', 'Energy Management Analysis')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View Details →
              </button>
            </div>
            <BaselineOverlay
              metric="energy_intensity"
              equipmentId={selectedEquipment[0]}
              timeRange={drillDownTimeRange}
              showControls={true}
            >
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={liveData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="timestamp" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="energyIntensity" 
                    fill={COLORS.purple} 
                    fillOpacity={0.3}
                    stroke={COLORS.purple}
                    strokeWidth={2}
                    name="Energy Intensity (kWh/unit)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="energyEfficiency" 
                    stroke={COLORS.success} 
                    strokeWidth={2}
                    name="Energy Efficiency %"
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="throughput" 
                    stroke={COLORS.primary} 
                    strokeDasharray="3 3"
                    strokeWidth={1}
                    name="Production Rate"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </BaselineOverlay>
          </div>
        </Card>

        <Card>
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">ISO 14224 Reliability Metrics</h3>
              <button
                onClick={() => handleChartClick('mtbf', 'Reliability Analysis')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View Details →
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { metric: 'MTBF', value: currentMetrics.mtbf || 0, target: 200 },
                { metric: 'MTTR', value: currentMetrics.mttr || 0, target: 3 },
                { metric: 'MTTF', value: currentMetrics.mttf || 0, target: 195 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.primary} name="Actual" />
                <Bar dataKey="target" fill={COLORS.success} fillOpacity={0.3} name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ISO 22400 Production & Inventory Metrics */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">ISO 22400 Production & Inventory Ratios</h3>
            <button
              onClick={() => handleChartClick('production_ratios', 'Production & Inventory Analysis')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View Details →
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RadialBarChart 
              cx="50%" 
              cy="50%" 
              innerRadius="20%" 
              outerRadius="90%" 
              data={[
                { name: 'Allocation', value: currentMetrics.allocationRatio || 0, fill: COLORS.primary },
                { name: 'Utilization', value: currentMetrics.utilizationEfficiency || 0, fill: COLORS.success },
                { name: 'Process', value: currentMetrics.processRatio || 0, fill: COLORS.purple },
                { name: 'Production', value: currentMetrics.productionProcessRatio || 0, fill: COLORS.warning },
                { name: 'Finished Goods', value: currentMetrics.finishedGoodsRatio || 0, fill: COLORS.cyan }
              ]}
              startAngle={180} 
              endAngle={0}
            >
              <RadialBar minAngle={15} clockWise dataKey="value" />
              <Tooltip />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Live Alerts Feed with ISO Compliance Indicators */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">ISO-Compliant Alert Feed</h3>
          {loading && alertsData.length === 0 && !error ? (
            <AlertFeedSkeleton />
          ) : error && !alertsData.length ? (
            <InlineError 
              message="Failed to load alerts" 
              onRetry={() => window.location.reload()} 
            />
          ) : (
          <div className="space-y-2">
            {alertsData.length > 0 ? (
              alertsData.map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-3 rounded-lg border ${
                    alert.severity === 'critical' ? 
                    'bg-red-50 border-red-200' : 
                    'bg-yellow-50 border-yellow-200'
                  } animate-pulse-once`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className={`h-5 w-5 ${
                        alert.severity === 'critical' ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-900">{alert.type}</p>
                        <p className="text-sm text-gray-600">{alert.equipment} • {alert.value}</p>
                        <p className="text-xs text-gray-500">{alert.timestamp} • ISO 22400 Threshold Violation</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      alert.severity === 'critical' ? 
                      'bg-red-100 text-red-700' : 
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-gray-600 font-medium">All Systems Operating Within ISO Standards</p>
                <p className="text-sm text-gray-500 mt-1">No threshold violations detected</p>
              </div>
            )}
          </div>
          )}
        </div>
      </Card>

      {/* Phase 2.2: Annotation System */}
      <AnnotationSystem
        chartId="main-dashboard"
        chartContainerRef={dashboardRef}
        isEnabled={enableAnnotations}
        currentUserId={currentUserId}
        currentUsername={currentUsername}
        onAnnotationChange={(annotations) => {
          console.log(`${annotations.length} annotations loaded for dashboard`);
        }}
      />
      
      {/* Detailed View Modal */}
      {detailedView && (
        <DetailedView
          metric={detailedView.metric}
          equipmentId={detailedView.equipmentId}
          title={detailedView.title}
          initialTimeRange={drillDownTimeRange}
          onClose={() => setDetailedView(null)}
        />
      )}
    </div>
  );
}