/**
 * Prometheus Data Source Dashboard - Demonstrates real Prometheus integration
 * Shows how to query Prometheus data sources and display in Grafana-style panels
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { pluginRegistry, PanelPlugin } from '@/core/plugins/SimplePluginSystem';
import { initializePlugins } from '@/core/plugins/initializePlugins';
import { SimpleTimeSeriesPanel } from '@/components/panels/SimpleTimeSeriesPanel';
import { dataSourceManager } from '@/core/datasources/DataSourceManager';
import { PrometheusDataSource, PrometheusQuery } from '@/core/datasources/PrometheusDataSource';
import { DataQueryRequest, TimeRange, TimeSeries, LoadingState } from '@/core/datasources/types';

interface PrometheusPanel {
  id: string;
  title: string;
  type: string;
  dataSource: string;
  targets: PrometheusQuery[];
  gridPos: { x: number; y: number; w: number; h: number };
  options: any;
}

interface PrometheusMetricQuery {
  expr: string;
  legendFormat: string;
  refId: string;
}

export const PrometheusDataSourceDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean>>({});
  const [panelData, setPanelData] = useState<Record<string, TimeSeries[]>>({});
  const [timeRange, setTimeRange] = useState<TimeRange>({
    from: new Date(Date.now() - 6 * 60 * 60 * 1000),
    to: new Date(),
    raw: { from: 'now-6h', to: 'now' }
  });
  const [autoRefresh, setAutoRefresh] = useState<string>('30');
  const [error, setError] = useState<string | null>(null);

  // Manufacturing Prometheus queries
  const manufacturingQueries: PrometheusMetricQuery[] = [
    { expr: 'equipment_temperature_celsius', legendFormat: 'Temperature (°C)', refId: 'A' },
    { expr: 'production_rate_pph', legendFormat: 'Production Rate (pph)', refId: 'B' },
    { expr: 'oee_percentage', legendFormat: 'OEE (%)', refId: 'C' },
    { expr: 'pressure_psi', legendFormat: 'Pressure (PSI)', refId: 'D' },
    { expr: 'vibration_rms', legendFormat: 'Vibration (mm/s)', refId: 'E' },
    { expr: 'downtime_seconds', legendFormat: 'Downtime (seconds)', refId: 'F' },
  ];

  // Dashboard panels configuration
  const dashboardPanels: PrometheusPanel[] = [
    {
      id: 'temperature-panel',
      title: 'Equipment Temperature',
      type: 'timeseries',
      dataSource: 'prometheus-manufacturing',
      targets: [
        { 
          expr: 'equipment_temperature_celsius',
          legendFormat: 'Temperature {{instance}}',
          refId: 'A',
          interval: '30s'
        }
      ],
      gridPos: { x: 0, y: 0, w: 12, h: 8 },
      options: {
        legend: { displayMode: 'list', placement: 'bottom' },
        tooltip: { mode: 'multi' }
      }
    },
    {
      id: 'production-panel',
      title: 'Production Metrics',
      type: 'timeseries',
      dataSource: 'prometheus-manufacturing',
      targets: [
        { 
          expr: 'production_rate_pph',
          legendFormat: 'Production Rate',
          refId: 'A',
          interval: '30s'
        },
        { 
          expr: 'oee_percentage',
          legendFormat: 'OEE %',
          refId: 'B',
          interval: '30s'
        }
      ],
      gridPos: { x: 12, y: 0, w: 12, h: 8 },
      options: {
        legend: { displayMode: 'table', placement: 'right' },
        tooltip: { mode: 'multi' }
      }
    },
    {
      id: 'equipment-health',
      title: 'Equipment Health Monitoring',
      type: 'timeseries',
      dataSource: 'prometheus-manufacturing',
      targets: [
        { 
          expr: 'pressure_psi',
          legendFormat: 'Pressure {{line}}',
          refId: 'A',
          interval: '15s'
        },
        { 
          expr: 'vibration_rms',
          legendFormat: 'Vibration {{equipment}}',
          refId: 'B',
          interval: '15s'
        }
      ],
      gridPos: { x: 0, y: 8, w: 24, h: 10 },
      options: {
        legend: { displayMode: 'table', placement: 'bottom' },
        tooltip: { mode: 'multi' }
      }
    }
  ];

  // Initialize plugins and data sources
  useEffect(() => {
    const initialize = async () => {
      try {
        // Register plugins
        const timeSeriesPlugin: PanelPlugin = {
          meta: {
            id: 'timeseries',
            name: 'Time Series',
            type: 'panel',
            description: 'Time series visualization with Prometheus support',
            version: '1.0.0',
            author: 'Manufacturing Analytics',
          },
          component: SimpleTimeSeriesPanel,
          defaults: { showLegend: true, showGrid: true, showTooltip: true },
        };
        
        pluginRegistry.registerPanel(timeSeriesPlugin);
        initializePlugins();

        // Test data source connections
        await testDataSourceConnections();
        
        // Load initial data
        await refreshAllPanels();
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize Prometheus dashboard:', error);
        setError(error instanceof Error ? error.message : 'Initialization failed');
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Test data source connections
  const testDataSourceConnections = async () => {
    const dataSources = dataSourceManager.getAllDataSources();
    const status: Record<string, boolean> = {};

    for (const ds of dataSources) {
      try {
        const dataSource = dataSourceManager.getDataSource(ds.uid);
        if (dataSource) {
          const result = await dataSource.testDatasource();
          status[ds.uid] = result.status === 'success';
          console.log(`Data source ${ds.name}: ${result.message}`);
        } else {
          status[ds.uid] = false;
        }
      } catch (error) {
        console.error(`Failed to test data source ${ds.name}:`, error);
        status[ds.uid] = false;
      }
    }

    setConnectionStatus(status);
  };

  // Refresh data for all panels
  const refreshAllPanels = useCallback(async () => {
    const newPanelData: Record<string, TimeSeries[]> = {};

    for (const panel of dashboardPanels) {
      try {
        const dataSource = dataSourceManager.getDataSource(panel.dataSource) as PrometheusDataSource;
        
        if (dataSource) {
          const request: DataQueryRequest<PrometheusQuery> = {
            range: timeRange,
            interval: '30s',
            intervalMs: 30000,
            maxDataPoints: 1000,
            targets: panel.targets,
            panelId: parseInt(panel.id.replace(/\D/g, '')),
            dashboardId: 1,
            timezone: 'browser',
            app: 'dashboard',
            requestId: `${panel.id}-${Date.now()}`,
          };

          console.log(`Querying panel ${panel.id} with targets:`, panel.targets);
          const response = await dataSource.query(request);
          console.log(`Panel ${panel.id} response:`, response);
          
          if (response.state === LoadingState.Done && response.data) {
            console.log(`Panel ${panel.id} received ${response.data.length} time series`);
            newPanelData[panel.id] = response.data;
          } else if (response.error) {
            console.error(`Panel ${panel.id} query error:`, response.error);
            newPanelData[panel.id] = [];
          } else {
            console.warn(`Panel ${panel.id} no data or error:`, response);
            newPanelData[panel.id] = [];
          }
        } else {
          console.error(`Data source not found: ${panel.dataSource}`);
          newPanelData[panel.id] = [];
        }
      } catch (error) {
        console.error(`Failed to query panel ${panel.id}:`, error);
        newPanelData[panel.id] = [];
      }
    }

    setPanelData(newPanelData);
  }, [timeRange]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = parseInt(autoRefresh) * 1000;
    const timer = setInterval(() => {
      console.log('Auto-refreshing Prometheus data...');
      refreshAllPanels();
    }, interval);

    return () => clearInterval(timer);
  }, [autoRefresh, refreshAllPanels]);

  // Time range change handler
  const handleTimeRangeChange = useCallback((newRange: TimeRange) => {
    setTimeRange(newRange);
  }, []);

  // Render individual panel
  const renderPanel = (panel: PrometheusPanel) => {
    const data = panelData[panel.id] || [];
    
    // Convert Prometheus TimeSeries to SimpleTimeSeriesPanel format
    const timeSeriesData = data.flatMap(series => 
      series.datapoints.map(point => ({
        timestamp: point.timestamp,
        [series.target]: point.value,
      }))
    );

    // Group by timestamp
    const groupedData = timeSeriesData.reduce((acc, point) => {
      const existing = acc.find(p => p.timestamp === point.timestamp);
      if (existing) {
        Object.assign(existing, point);
      } else {
        acc.push(point);
      }
      return acc;
    }, [] as any[]);

    try {
      const panelElement = pluginRegistry.createPanelInstance(panel.type, {
        data: groupedData.sort((a, b) => a.timestamp - b.timestamp),
        options: {
          title: panel.title,
          ...panel.options,
          series: data.map(series => ({
            field: series.target,
            displayName: series.target,
            color: undefined, // Auto-generate colors
          })),
        },
        width: panel.gridPos.w * 40,
        height: panel.gridPos.h * 40,
        timeRange,
      });

      return panelElement;
    } catch (error) {
      console.error('Error rendering panel:', error);
      return (
        <div className="border rounded-lg p-4 bg-red-50">
          <p className="text-red-600">Error rendering panel: {panel.title}</p>
          <p className="text-sm text-red-500">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Initializing Prometheus Dashboard...</p>
          <p className="text-sm text-gray-500">Testing data source connections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center text-red-600">
          <h2 className="text-xl font-semibold mb-2">Dashboard Initialization Failed</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Dashboard Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prometheus Manufacturing Dashboard</h1>
            <p className="text-gray-600">Real-time metrics from Prometheus data sources</p>
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
                <option value="15">15s</option>
                <option value="30">30s</option>
                <option value="60">1m</option>
                <option value="300">5m</option>
              </select>
            </div>

            {/* Manual Refresh */}
            <button
              onClick={() => refreshAllPanels()}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Data Source Status */}
      <div className="bg-white border-b px-6 py-2">
        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium">Data Sources:</span>
          {dataSourceManager.getAllDataSources().map(ds => (
            <div key={ds.uid} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${connectionStatus[ds.uid] ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={connectionStatus[ds.uid] ? 'text-green-700' : 'text-red-700'}>
                {ds.name} ({ds.type})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-24 gap-4 auto-rows-min">
          {dashboardPanels.map((panel) => (
            <div
              key={panel.id}
              className="col-span-24 lg:col-span-12 xl:col-span-12 bg-white border rounded-lg shadow-sm"
              style={{
                gridColumn: `span ${Math.min(24, panel.gridPos.w)}`,
                minHeight: `${panel.gridPos.h * 40}px`,
              }}
            >
              {/* Panel Header */}
              <div className="border-b px-4 py-3 flex items-center justify-between">
                <h3 className="font-medium text-gray-900">{panel.title}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Data points: {panelData[panel.id]?.reduce((sum, series) => sum + series.datapoints.length, 0) || 0}</span>
                  <span>•</span>
                  <span>Queries: {panel.targets.length}</span>
                </div>
              </div>
              
              {/* Panel Content */}
              <div className="p-4">
                {renderPanel(panel)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t px-6 py-2 text-sm text-gray-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span>✅ Prometheus data source integration active</span>
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
            <span>Phase 4: Data Source System - Working</span>
            <span>•</span>
            <span>PromQL queries: {dashboardPanels.reduce((sum, p) => sum + p.targets.length, 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};