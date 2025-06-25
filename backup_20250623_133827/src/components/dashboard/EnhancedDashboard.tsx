/**
 * Enhanced Dashboard - AnalyticsPlatform-like dashboard with grid layout and time controls
 * Phase 3: Advanced dashboard viewer with positioning, time range, and editing
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { pluginRegistry, PanelPlugin } from '@/core/plugins/SimplePluginSystem';
import { initializePlugins } from '@/core/plugins/initializePlugins';
import { getCombinedMetricsData, generateSampleManufacturingData } from '@/utils/sampleManufacturingData';
import { TimeSeriesData, SimpleTimeSeriesPanel } from '@/components/panels/SimpleTimeSeriesPanel';

// Dashboard types matching AnalyticsPlatform structure
interface DashboardPanel {
  id: string;
  title: string;
  type: string;
  gridPos: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  targets: any[];
  fieldConfig: {
    defaults: any;
    overrides: any[];
  };
  options: any;
  pluginVersion: string;
}

interface DashboardConfig {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  timezone: string;
  refresh: string;
  time: {
    from: string;
    to: string;
  };
  timepicker: {
    refresh_intervals: string[];
    time_options: string[];
  };
  panels: DashboardPanel[];
  version: number;
  schemaVersion: number;
}

interface TimeRange {
  from: Date;
  to: Date;
  raw: {
    from: string;
    to: string;
  };
}

export const EnhancedDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<DashboardConfig | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>({
    from: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    to: new Date(),
    raw: { from: 'now-6h', to: 'now' }
  });
  const [isEditing, setIsEditing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [manufacturingData, setManufacturingData] = useState<any>(null);

  // Initialize plugins and dashboard
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Register plugins
        const timeSeriesPlugin: PanelPlugin = {
          meta: {
            id: 'timeseries',
            name: 'Time Series',
            type: 'panel',
            description: 'Time series visualization',
            version: '1.0.0',
            author: 'Manufacturing Analytics',
          },
          component: SimpleTimeSeriesPanel,
          defaults: { showLegend: true, showGrid: true, showTooltip: true },
        };
        
        pluginRegistry.registerPanel(timeSeriesPlugin);
        initializePlugins();

        // Generate manufacturing data
        const data = generateSampleManufacturingData();
        setManufacturingData(data);

        // Create default dashboard configuration
        const defaultDashboard: DashboardConfig = {
          id: 'manufacturing-overview',
          title: 'Manufacturing Overview Dashboard',
          description: 'Real-time manufacturing metrics and KPIs',
          tags: ['manufacturing', 'production', 'oee'],
          timezone: 'browser',
          refresh: '30s',
          time: {
            from: 'now-6h',
            to: 'now'
          },
          timepicker: {
            refresh_intervals: ['5s', '10s', '30s', '1m', '5m', '15m'],
            time_options: ['5m', '15m', '1h', '6h', '12h', '24h', '2d', '7d', '30d']
          },
          panels: [
            {
              id: 'oee-panel',
              title: 'Overall Equipment Effectiveness',
              type: 'timeseries',
              gridPos: { x: 0, y: 0, w: 12, h: 8 },
              targets: [{ expr: 'oee_percentage', legendFormat: 'OEE (%)' }],
              fieldConfig: {
                defaults: {
                  color: { mode: 'palette-classic' },
                  custom: {
                    axisLabel: 'Percentage',
                    axisPlacement: 'auto',
                    barAlignment: 0,
                    drawStyle: 'line',
                    fillOpacity: 10,
                    gradientMode: 'none',
                    hideFrom: { legend: false, tooltip: false, vis: false },
                    lineInterpolation: 'linear',
                    lineWidth: 2,
                    pointSize: 4,
                    scaleDistribution: { type: 'linear' },
                    showPoints: 'never',
                    spanNulls: false,
                    stacking: { group: 'A', mode: 'none' },
                    thresholdsStyle: { mode: 'off' }
                  },
                  mappings: [],
                  thresholds: {
                    mode: 'absolute',
                    steps: [
                      { color: 'red', value: null },
                      { color: 'yellow', value: 70 },
                      { color: 'green', value: 85 }
                    ]
                  },
                  unit: 'percent'
                },
                overrides: []
              },
              options: {
                legend: { calcs: [], displayMode: 'list', placement: 'bottom' },
                tooltip: { mode: 'single', sort: 'none' }
              },
              pluginVersion: '1.0.0'
            },
            {
              id: 'temperature-panel',
              title: 'Equipment Temperature',
              type: 'timeseries',
              gridPos: { x: 12, y: 0, w: 12, h: 8 },
              targets: [{ expr: 'equipment_temperature_celsius', legendFormat: 'Temperature (°C)' }],
              fieldConfig: {
                defaults: {
                  color: { mode: 'continuous-GrYlRd' },
                  custom: {
                    axisLabel: 'Temperature (°C)',
                    drawStyle: 'line',
                    lineWidth: 2,
                    fillOpacity: 15,
                  },
                  thresholds: {
                    mode: 'absolute',
                    steps: [
                      { color: 'green', value: null },
                      { color: 'yellow', value: 190 },
                      { color: 'red', value: 210 }
                    ]
                  },
                  unit: 'celsius'
                },
                overrides: []
              },
              options: {
                legend: { calcs: ['lastNotNull'], displayMode: 'list', placement: 'bottom' },
                tooltip: { mode: 'multi', sort: 'none' }
              },
              pluginVersion: '1.0.0'
            },
            {
              id: 'production-metrics',
              title: 'Production Metrics',
              type: 'timeseries',
              gridPos: { x: 0, y: 8, w: 24, h: 10 },
              targets: [
                { expr: 'production_rate', legendFormat: 'Production Rate (pph)' },
                { expr: 'pressure_psi', legendFormat: 'Pressure (PSI)' },
                { expr: 'vibration_rms', legendFormat: 'Vibration (mm/s)' }
              ],
              fieldConfig: {
                defaults: {
                  color: { mode: 'palette-classic' },
                  custom: {
                    axisLabel: 'Multiple Units',
                    drawStyle: 'line',
                    lineWidth: 1.5,
                  }
                },
                overrides: [
                  {
                    matcher: { id: 'byName', options: 'Production Rate (pph)' },
                    properties: [{ id: 'color', value: { mode: 'fixed', fixedColor: 'green' } }]
                  },
                  {
                    matcher: { id: 'byName', options: 'Pressure (PSI)' },
                    properties: [{ id: 'color', value: { mode: 'fixed', fixedColor: 'blue' } }]
                  }
                ]
              },
              options: {
                legend: { calcs: ['last', 'max'], displayMode: 'table', placement: 'right' },
                tooltip: { mode: 'multi', sort: 'desc' }
              },
              pluginVersion: '1.0.0'
            }
          ],
          version: 1,
          schemaVersion: 36
        };

        setDashboard(defaultDashboard);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize enhanced dashboard:', error);
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  // Time range picker handlers
  const handleTimeRangeChange = useCallback((newRange: TimeRange) => {
    setTimeRange(newRange);
    // Refresh all panels with new time range
    if (manufacturingData) {
      // In a real implementation, this would query the data source
      console.log('Refreshing data for time range:', newRange);
    }
  }, [manufacturingData]);

  // Auto-refresh handler
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = parseFloat(autoRefresh) * 1000;
    const timer = setInterval(() => {
      console.log('Auto-refreshing dashboard...');
      // Refresh data
      const newData = generateSampleManufacturingData();
      setManufacturingData(newData);
    }, interval);

    return () => clearInterval(timer);
  }, [autoRefresh]);

  // Render individual panel
  const renderPanel = (panel: DashboardPanel) => {
    if (!manufacturingData) return null;

    let panelData: TimeSeriesData[] = [];
    
    // Map panel type to data
    switch (panel.id) {
      case 'oee-panel':
        panelData = manufacturingData.oee;
        break;
      case 'temperature-panel':
        panelData = manufacturingData.temperature;
        break;
      case 'production-metrics':
        panelData = getCombinedMetricsData();
        break;
      default:
        panelData = [];
    }

    // Filter data by time range
    const filteredData = panelData.filter(d => {
      const timestamp = new Date(d.timestamp);
      return timestamp >= timeRange.from && timestamp <= timeRange.to;
    });

    try {
      const panelElement = pluginRegistry.createPanelInstance(panel.type, {
        data: filteredData,
        options: {
          title: panel.title,
          ...panel.options,
          yAxis: panel.fieldConfig.defaults.custom?.axisLabel ? {
            label: panel.fieldConfig.defaults.custom.axisLabel
          } : undefined,
          thresholds: panel.fieldConfig.defaults.thresholds?.steps?.map(step => ({
            value: step.value || 0,
            color: step.color,
            label: step.color.charAt(0).toUpperCase() + step.color.slice(1)
          })) || []
        },
        width: panel.gridPos.w * 50, // Approximate width
        height: panel.gridPos.h * 40, // Approximate height
        timeRange
      });

      return panelElement;
    } catch (error) {
      console.error('Error rendering panel:', error);
      return (
        <div className="border rounded-lg p-4 bg-red-50">
          <p className="text-red-600">Error rendering panel: {panel.title}</p>
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Loading Enhanced Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-8">
        <div className="text-center text-red-600">
          <p>Failed to load dashboard configuration</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Dashboard Header & Toolbar */}
      <div className="bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{dashboard.title}</h1>
            <p className="text-gray-600">{dashboard.description}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>Tags: {dashboard.tags.join(', ')}</span>
              <span>•</span>
              <span>Version: {dashboard.version}</span>
              <span>•</span>
              <span>Panels: {dashboard.panels.length}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Time Range Picker */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Time Range:</label>
              <select 
                value={timeRange.raw.from + '/' + timeRange.raw.to}
                onChange={(e) => {
                  const [from, to] = e.target.value.split('/');
                  const now = new Date();
                  const fromDate = from === 'now-6h' ? new Date(now.getTime() - 6 * 60 * 60 * 1000) :
                                  from === 'now-1h' ? new Date(now.getTime() - 60 * 60 * 1000) :
                                  from === 'now-24h' ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : now;
                  handleTimeRangeChange({
                    from: fromDate,
                    to: new Date(),
                    raw: { from, to }
                  });
                }}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="now-1h/now">Last 1 hour</option>
                <option value="now-6h/now">Last 6 hours</option>
                <option value="now-24h/now">Last 24 hours</option>
                <option value="now-7d/now">Last 7 days</option>
              </select>
            </div>

            {/* Auto-refresh */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Refresh:</label>
              <select 
                value={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.value)}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="">Off</option>
                <option value="5">5s</option>
                <option value="30">30s</option>
                <option value="60">1m</option>
                <option value="300">5m</option>
              </select>
            </div>

            {/* Dashboard Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  isEditing 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isEditing ? 'Exit Edit' : 'Edit'}
              </button>
              
              <button
                onClick={() => {
                  const newData = generateSampleManufacturingData();
                  setManufacturingData(newData);
                }}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-24 gap-4 auto-rows-min">
          {dashboard.panels.map((panel) => (
            <div
              key={panel.id}
              className={`
                col-span-${panel.gridPos.w} 
                bg-white border rounded-lg shadow-sm
                ${isEditing ? 'border-blue-300 shadow-md' : ''}
              `}
              style={{
                minHeight: `${panel.gridPos.h * 40}px`,
                gridColumn: `span ${panel.gridPos.w}`,
              }}
            >
              {/* Panel Header */}
              <div className="border-b px-4 py-3 flex items-center justify-between">
                <h3 className="font-medium text-gray-900">{panel.title}</h3>
                {isEditing && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>Type: {panel.type}</span>
                    <button className="text-blue-600 hover:text-blue-800">⚙️</button>
                  </div>
                )}
              </div>
              
              {/* Panel Content */}
              <div className="p-4">
                {renderPanel(panel)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard Status Bar */}
      <div className="bg-white border-t px-6 py-2 text-sm text-gray-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>✅ Dashboard loaded successfully</span>
            <span>•</span>
            <span>Last refresh: {new Date().toLocaleTimeString()}</span>
            {autoRefresh && (
              <>
                <span>•</span>
                <span>Auto-refresh: {autoRefresh}s</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span>Time range: {timeRange.raw.from} to {timeRange.raw.to}</span>
            <span>•</span>
            <span>Timezone: {dashboard.timezone}</span>
          </div>
        </div>
      </div>
    </div>
  );
};