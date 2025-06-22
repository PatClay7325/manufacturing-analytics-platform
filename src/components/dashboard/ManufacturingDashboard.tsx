'use client';

import React, { useState } from 'react';
import { 
  RefreshCw, Download, Share2, Settings, Fullscreen,
  Factory, Clock, Filter as FilterIcon, TrendingUp
} from 'lucide-react';
import { AnalyticsPanel } from '@/components/analytics/AnalyticsPanel';
import { GRAFANA_CONFIG, buildGrafanaUrl } from '@/config/Analytics.config';

// Time range type
type TimeRange = 'last24h' | 'last7d' | 'last30d' | 'last90d';

// Time range mapping
const TIME_RANGES = {
  last24h: { from: 'now-24h', to: 'now', label: 'Last 24 Hours' },
  last7d: { from: 'now-7d', to: 'now', label: 'Last 7 Days' },
  last30d: { from: 'now-30d', to: 'now', label: 'Last 30 Days' },
  last90d: { from: 'now-90d', to: 'now', label: 'Last 90 Days' }
};

// Equipment options
const EQUIPMENT_OPTIONS = [
  { id: 'all', name: 'All Equipment' },
  { id: 'line1', name: 'Production Line 1' },
  { id: 'line2', name: 'Production Line 2' },
  { id: 'machine1', name: 'CNC Machine 1' },
  { id: 'machine2', name: 'CNC Machine 2' },
  { id: 'machine3', name: 'Injection Molder 1' }
];

interface ManufacturingDashboardProps {
  title?: string;
  defaultTimeRange?: TimeRange;
  defaultEquipment?: string;
  defaultTabIndex?: number;
  onFullscreenClick?: () => void;
}

/**
 * ManufacturingDashboard - A comprehensive manufacturing dashboard using Analytics
 */
const ManufacturingDashboard: React.FC<ManufacturingDashboardProps> = ({
  title = 'Manufacturing Intelligence Platform',
  defaultTimeRange = 'last7d',
  defaultEquipment = 'all',
  defaultTabIndex = 0,
  onFullscreenClick
}) => {
  // Dashboard state
  const [timeRange, setTimeRange] = useState<TimeRange>(defaultTimeRange);
  const [selectedEquipment, setSelectedEquipment] = useState<string>(defaultEquipment);
  const [tabIndex, setTabIndex] = useState(defaultTabIndex);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGrafanaAvailable, setIsGrafanaAvailable] = useState<boolean | null>(null);
  const [refreshInterval, setRefreshInterval] = useState('30s');

  // Handle time range change
  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(e.target.value as TimeRange);
  };

  // Handle equipment selection change
  const handleEquipmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEquipment(e.target.value);
  };

  // Handle tab change
  const handleTabChange = (newIndex: number) => {
    setTabIndex(newIndex);
  };

  // Handle refresh click
  const handleRefresh = () => {
    setIsRefreshing(true);
    
    // Simulate refresh by checking Analytics availability
    checkGrafanaAvailability().then(() => {
      // Delay to show the refreshing state
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    });
  };

  // Check if Analytics is available
  const checkGrafanaAvailability = async () => {
    try {
      const response = await fetch(`${GRAFANA_CONFIG.baseUrl}/api/health`, { 
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(3000)
      });
      
      if (response?.ok) {
        setIsGrafanaAvailable(true);
        return true;
      } else {
        setIsGrafanaAvailable(false);
        return false;
      }
    } catch (err) {
      console.error('Error checking Analytics availability:', err);
      setIsGrafanaAvailable(false);
      return false;
    }
  };

  // Check Analytics availability on component mount
  React.useEffect(() => {
    checkGrafanaAvailability();
  }, []);

  // Get current time range parameters
  const currentTimeRange = TIME_RANGES[timeRange];

  // Tab configuration
  const tabs = [
    { id: 0, label: 'Overview', icon: TrendingUp },
    { id: 1, label: 'OEE Analytics' },
    { id: 2, label: 'Production' },
    { id: 3, label: 'Quality' },
    { id: 4, label: 'Maintenance' },
    { id: 5, label: 'Root Cause Analysis' }
  ];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Dashboard Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Title Section */}
          <div className="flex items-center">
            <Factory className="h-5 w-5 mr-2 text-primary-600" />
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            {isGrafanaAvailable === true && (
              <span className="ml-3 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                Dashboard Connected
              </span>
            )}
            {isGrafanaAvailable === false && (
              <span className="ml-3 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                Dashboard Disconnected
              </span>
            )}
          </div>
          
          {/* Controls Section */}
          <div className="flex items-center space-x-3">
            {/* Time Range Selector */}
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2 text-gray-500" />
              <select
                value={timeRange}
                onChange={handleTimeRangeChange}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:border-primary-500"
              >
                <option value="last24h">{TIME_RANGES?.last24h.label}</option>
                <option value="last7d">{TIME_RANGES?.last7d.label}</option>
                <option value="last30d">{TIME_RANGES?.last30d.label}</option>
                <option value="last90d">{TIME_RANGES?.last90d.label}</option>
              </select>
            </div>
            
            {/* Equipment Selector */}
            <div className="flex items-center">
              <FilterIcon className="h-4 w-4 mr-2 text-gray-500" />
              <select
                value={selectedEquipment}
                onChange={handleEquipmentChange}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm text-gray-700 focus:outline-none focus:border-primary-500"
              >
                {EQUIPMENT_OPTIONS?.map(option => (
                  <option key={option?.id} value={option?.id}>{option?.name}</option>
                ))}
              </select>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            
            {/* Download Button */}
            <button className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors" title="Download">
              <Download className="h-4 w-4" />
            </button>
            
            {/* Share Button */}
            <button className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors" title="Share">
              <Share2 className="h-4 w-4" />
            </button>
            
            {/* Settings Button */}
            <button className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors" title="Settings">
              <Settings className="h-4 w-4" />
            </button>
            
            {/* Fullscreen Button */}
            {onFullscreenClick && (
              <button 
                onClick={onFullscreenClick}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors" 
                title="Fullscreen"
              >
                <Fullscreen className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Dashboard Tabs */}
        <div className="mt-4 border-b border-gray-200 -mb-px">
          <nav className="-mb-px flex space-x-8">
            {tabs?.map(tab => (
              <button
                key={tab?.id}
                onClick={() => handleTabChange(tab?.id)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm transition-colors
                  ${tabIndex === tab?.id 
                    ? 'border-primary-500 text-primary-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab?.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Dashboard Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Overview Tab */}
        {tabIndex === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1">
              <AnalyticsPanel
                dashboardUid={GRAFANA_CONFIG.dashboard.uid}
                panelId={GRAFANA_CONFIG.panels.oee}
                title="Overall Equipment Effectiveness"
                timeRange={currentTimeRange}
                height="300px"
                gridPos={{ h: 4, w: 6, x: 0, y: 0 }}
              />
            </div>
            <div className="lg:col-span-2">
              <AnalyticsPanel
                dashboardUid={GRAFANA_CONFIG.dashboard.uid}
                panelId={GRAFANA_CONFIG.panels.productionByLine}
                title="Production by Line"
                timeRange={currentTimeRange}
                height="300px"
                gridPos={{ h: 4, w: 12, x: 6, y: 0 }}
              />
            </div>
            <div className="lg:col-span-1">
              <AnalyticsPanel
                dashboardUid={GRAFANA_CONFIG.dashboard.uid}
                panelId={GRAFANA_CONFIG.panels.qualityRate}
                title="Quality Rate"
                timeRange={currentTimeRange}
                height="300px"
                gridPos={{ h: 4, w: 6, x: 18, y: 0 }}
              />
            </div>
            <div className="col-span-full">
              <AnalyticsPanel
                dashboardUid={GRAFANA_CONFIG.dashboard.uid}
                panelId={GRAFANA_CONFIG.panels.downtimeByReason}
                title="Downtime by Reason"
                timeRange={currentTimeRange}
                height="300px"
                gridPos={{ h: 4, w: 24, x: 0, y: 4 }}
              />
            </div>
          </div>
        )}
        
        {/* OEE Analytics Tab */}
        {tabIndex === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <AnalyticsPanel
                dashboardUid={GRAFANA_CONFIG.dashboard.uid}
                panelId={GRAFANA_CONFIG.panels.oee}
                title="Overall OEE"
                timeRange={currentTimeRange}
                height="300px"
                gridPos={{ h: 4, w: 12, x: 0, y: 0 }}
              />
            </div>
            <div>
              <AnalyticsPanel
                dashboardUid={GRAFANA_CONFIG.dashboard.uid}
                panelId={GRAFANA_CONFIG.panels.oeeComponentsTrend}
                title="OEE Components Trend"
                timeRange={currentTimeRange}
                height="300px"
                gridPos={{ h: 4, w: 12, x: 12, y: 0 }}
              />
            </div>
            <div className="col-span-full">
              <AnalyticsPanel
                dashboardUid={GRAFANA_CONFIG.dashboard.uid}
                panelId={GRAFANA_CONFIG.panels.productionLineDetail}
                title="Production Line Performance Detail"
                timeRange={currentTimeRange}
                height="400px"
                gridPos={{ h: 5, w: 24, x: 0, y: 4 }}
              />
            </div>
          </div>
        )}
        
        {/* Production Tab */}
        {tabIndex === 2 && (
          <div className="space-y-4">
            <AnalyticsPanel
              dashboardUid={GRAFANA_CONFIG.dashboard.uid}
              panelId={GRAFANA_CONFIG.panels.productionByLine}
              title="Production by Line"
              timeRange={currentTimeRange}
              height="350px"
              gridPos={{ h: 5, w: 24, x: 0, y: 0 }}
            />
            <AnalyticsPanel
              dashboardUid={GRAFANA_CONFIG.dashboard.uid}
              panelId={GRAFANA_CONFIG.panels.productionLineDetail}
              title="Production Line Detail"
              timeRange={currentTimeRange}
              height="400px"
              gridPos={{ h: 5, w: 24, x: 0, y: 5 }}
            />
          </div>
        )}
        
        {/* Quality Tab */}
        {tabIndex === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <AnalyticsPanel
                dashboardUid={GRAFANA_CONFIG.dashboard.uid}
                panelId={GRAFANA_CONFIG.panels.qualityAnalysis}
                title="Quality Analysis"
                timeRange={currentTimeRange}
                height="400px"
                gridPos={{ h: 5, w: 12, x: 0, y: 0 }}
              />
            </div>
            <div>
              <AnalyticsPanel
                dashboardUid={GRAFANA_CONFIG.dashboard.uid}
                panelId={GRAFANA_CONFIG.panels.qualityDetail}
                title="Quality Details"
                timeRange={currentTimeRange}
                height="400px"
                gridPos={{ h: 5, w: 12, x: 12, y: 0 }}
              />
            </div>
          </div>
        )}
        
        {/* Maintenance Tab */}
        {tabIndex === 4 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <AnalyticsPanel
                  dashboardUid={GRAFANA_CONFIG.dashboard.uid}
                  panelId={GRAFANA_CONFIG.panels.reliabilityMetrics}
                  title="Reliability Metrics"
                  timeRange={currentTimeRange}
                  height="300px"
                  gridPos={{ h: 4, w: 12, x: 0, y: 0 }}
                />
              </div>
              <div>
                <AnalyticsPanel
                  dashboardUid={GRAFANA_CONFIG.dashboard.uid}
                  panelId={GRAFANA_CONFIG.panels.downtimeByReason}
                  title="Downtime by Reason"
                  timeRange={currentTimeRange}
                  height="300px"
                  gridPos={{ h: 4, w: 12, x: 12, y: 0 }}
                />
              </div>
            </div>
            <AnalyticsPanel
              dashboardUid={GRAFANA_CONFIG.dashboard.uid}
              panelId={GRAFANA_CONFIG.panels.rootCauseTable}
              title="Equipment Failures & Maintenance"
              timeRange={currentTimeRange}
              height="400px"
              gridPos={{ h: 5, w: 24, x: 0, y: 4 }}
            />
          </div>
        )}
        
        {/* Root Cause Analysis Tab */}
        {tabIndex === 5 && (
          <div className="space-y-4">
            <AnalyticsPanel
              dashboardUid={GRAFANA_CONFIG.dashboard.uid}
              panelId={GRAFANA_CONFIG.panels.rootCauseTable}
              title="ISO 14224 Root Cause Analysis"
              timeRange={currentTimeRange}
              height="400px"
              gridPos={{ h: 5, w: 24, x: 0, y: 0 }}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <AnalyticsPanel
                  dashboardUid={GRAFANA_CONFIG.dashboard.uid}
                  panelId={GRAFANA_CONFIG.panels.paretoChart}
                  title="Pareto Analysis of Failure Modes"
                  timeRange={currentTimeRange}
                  height="400px"
                  gridPos={{ h: 5, w: 12, x: 0, y: 5 }}
                />
              </div>
              <div>
                <AnalyticsPanel
                  dashboardUid={GRAFANA_CONFIG.dashboard.uid}
                  panelId={GRAFANA_CONFIG.panels.fishboneDiagram}
                  title="Root Cause Analysis Framework"
                  timeRange={currentTimeRange}
                  height="400px"
                  gridPos={{ h: 5, w: 12, x: 12, y: 5 }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManufacturingDashboard;
export { ManufacturingDashboard };