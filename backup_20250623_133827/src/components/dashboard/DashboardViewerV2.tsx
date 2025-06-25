'use client';

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { Dashboard, Panel } from '@/types/dashboard';
import { useDashboardState } from '@/hooks/useDashboardState';
import { TimeRangePicker } from './TimeRangePicker';
import { RefreshPicker } from './RefreshPicker';
import TimeSeriesPanel from './panels/TimeSeriesPanel';
import StatPanel from './panels/StatPanel';
import GaugePanel from './panels/GaugePanel';
import BarChartPanel from './panels/BarChartPanel';
import TablePanel from './panels/TablePanel';
import HeatmapPanel from './panels/HeatmapPanel';
import TextPanel from './panels/TextPanel';

interface DashboardViewerV2Props {
  dashboard: Dashboard;
  isEditing?: boolean;
  onEdit?: () => void;
  onPanelClick?: (panel: Panel) => void;
  className?: string;
}

export default function DashboardViewerV2({
  dashboard: initialDashboard,
  isEditing = false,
  onEdit,
  onPanelClick,
  className = ''
}: DashboardViewerV2Props) {
  const [isStarred, setIsStarred] = useState(false);
  const [panelData, setPanelData] = useState<Record<number, any>>({});

  // Use the integrated dashboard state
  const {
    state,
    updateTimeRange,
    updateRefreshInterval,
    updateVariable,
    refreshDashboard,
    interpolateQuery
  } = useDashboardState({
    dashboard: initialDashboard,
    onRefresh: handleRefresh
  });

  // Fetch data for panels
  const fetchPanelData = useCallback(async (panel: Panel) => {
    try {
      // Skip panels without datasource or targets
      if (!panel.datasource || !panel.targets || panel.targets.length === 0) {
        console.log(`Panel ${panel.id} has no datasource or targets, using mock data`);
        const mockData = generateMockData(panel.type);
        setPanelData(prev => ({
          ...prev,
          [panel.id]: mockData
        }));
        return;
      }

      // Get data source
      const { getDataSourceManager } = await import('@/core/datasources/DataSourceManager');
      const dsManager = getDataSourceManager();
      const ds = dsManager.getDataSource(panel.datasource.uid || panel.datasource.name || '');
      
      if (!ds) {
        console.error(`Data source not found: ${panel.datasource.uid || panel.datasource.name}`);
        // Fallback to mock data
        const mockData = generateMockData(panel.type);
        setPanelData(prev => ({
          ...prev,
          [panel.id]: mockData
        }));
        return;
      }

      // Interpolate queries with current variable values
      const interpolatedTargets = panel.targets.map(target => {
        const interpolated: any = {};
        for (const key in target) {
          if (typeof target[key] === 'string') {
            interpolated[key] = interpolateQuery(target[key]);
          } else {
            interpolated[key] = target[key];
          }
        }
        return interpolated;
      });

      // Execute real query
      console.log(`Executing query for panel ${panel.id}:`, interpolatedTargets);
      const result = await ds.query({
        targets: interpolatedTargets,
        timeRange: state.timeRange,
        maxDataPoints: 300,
        interval: '30s'
      });
      
      console.log(`Query result for panel ${panel.id}:`, result);

      if (result.state === 'error') {
        console.error(`Query error for panel ${panel.id}:`, result.error);
        // Fallback to mock data on error
        const mockData = generateMockData(panel.type);
        setPanelData(prev => ({
          ...prev,
          [panel.id]: mockData
        }));
      } else {
        // Transform data based on panel type
        let transformedData: any;
        
        switch (panel.type) {
          case 'timeseries':
            // Transform to flat array format expected by TimeSeriesPanel
            if (result.data.length > 0) {
              const series = result.data[0]; // Use first series for now
              transformedData = series.datapoints.map(([value, time]) => ({
                time: time * 1000, // Convert Prometheus timestamp (seconds) to JS timestamp (milliseconds)
                value: parseFloat(value)
              }));
            } else {
              transformedData = [];
            }
            break;
            
          case 'stat':
          case 'gauge':
            // Use the last value from the first series
            const lastPoint = result.data[0]?.datapoints.slice(-1)[0];
            transformedData = {
              value: lastPoint ? lastPoint[0] : 0,
              title: result.data[0]?.target || 'Value'
            };
            break;
            
          case 'table':
            // Convert time series to table format
            transformedData = result.data.flatMap(series => 
              series.datapoints.map(([value, time]) => ({
                metric: series.target,
                time: new Date(time).toISOString(),
                value
              }))
            );
            break;
            
          default:
            transformedData = result.data;
        }
        
        console.log(`Transformed data for panel ${panel.id}:`, transformedData);
        setPanelData(prev => ({
          ...prev,
          [panel.id]: transformedData
        }));
      }
    } catch (error) {
      console.error(`Error fetching data for panel ${panel.id}:`, error);
      // Fallback to mock data on any error
      const mockData = generateMockData(panel.type);
      setPanelData(prev => ({
        ...prev,
        [panel.id]: mockData
      }));
    }
  }, [interpolateQuery, state.timeRange]);

  // Fetch data for all panels on mount and when variables/time range changes
  useEffect(() => {
    state.dashboard.panels.forEach(panel => {
      fetchPanelData(panel);
    });
  }, [state.variables, state.timeRange, fetchPanelData, state.dashboard.panels]);

  // Handle refresh
  async function handleRefresh() {
    // Refresh all panel data
    state.dashboard.panels.forEach(panel => {
      fetchPanelData(panel);
    });
  }

  // Render panel based on type
  const renderPanel = useCallback((panel: Panel) => {
    const commonProps = {
      panel,
      height: '100%',
      width: '100%',
      data: panelData[panel.id] || [],
      timeRange: state.timeRange,
      onInterpolate: interpolateQuery
    };

    switch (panel.type) {
      case 'timeseries':
        return <TimeSeriesPanel {...commonProps} />;
      case 'stat':
        return <StatPanel {...commonProps} />;
      case 'gauge':
        return <GaugePanel {...commonProps} />;
      case 'barchart':
      case 'bar':
        return <BarChartPanel {...commonProps} />;
      case 'table':
        return <TablePanel {...commonProps} />;
      case 'heatmap':
        return <HeatmapPanel {...commonProps} />;
      case 'text':
        return <TextPanel {...commonProps} />;
      default:
        return (
          <div className="bg-gray-800 rounded p-4 h-full flex items-center justify-center">
            <p className="text-gray-400">Panel type "{panel.type}" not supported</p>
          </div>
        );
    }
  }, [panelData, state.timeRange, interpolateQuery]);

  const handleShare = useCallback(() => {
    // TODO: Implement share functionality
    console.log('Share dashboard');
  }, []);

  const handleSettings = useCallback(() => {
    // In view mode, this might open a read-only settings view
    console.log('View dashboard settings');
  }, []);

  const handleToggleStar = useCallback(() => {
    setIsStarred(!isStarred);
    // TODO: Persist starred state
  }, [isStarred]);

  if (!state.dashboard.panels || state.dashboard.panels.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow p-8 text-center">
        <p className="text-gray-400 mb-4">This dashboard has no panels yet.</p>
        {onEdit && (
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Edit Dashboard
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`dashboard-viewer ${className}`}>
      {/* Simple Controls Bar for Test */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">{state.dashboard.title}</h2>
          
          {/* Time Controls */}
          <div className="flex items-center gap-3">
            <TimeRangePicker
              value={state.timeRange}
              onChange={updateTimeRange}
            />
            <RefreshPicker
              value={state.refreshInterval}
              onChange={updateRefreshInterval}
              onRefresh={refreshDashboard}
            />
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="p-4">
        <div 
          className="grid gap-4"
          style={{
            gridTemplateColumns: 'repeat(24, 1fr)',
            gridAutoRows: '30px'
          }}
        >
          {state.dashboard.panels.map((panel) => (
            <div
              key={panel.id}
              className={`bg-white rounded-lg shadow border border-gray-200 ${isEditing ? 'cursor-move hover:shadow-lg' : ''}`}
              style={{
                gridColumn: `${panel.gridPos.x + 1} / span ${panel.gridPos.w}`,
                gridRow: `${panel.gridPos.y + 1} / span ${panel.gridPos.h}`
              }}
              onClick={() => onPanelClick?.(panel)}
            >
              {/* Panel Header */}
              <div className="border-b border-gray-200 px-4 py-2 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-900">
                  {interpolateQuery(panel.title)}
                </h3>
              </div>
              
              {/* Panel Content */}
              <div className="p-3 bg-white" style={{ height: `calc(100% - 40px)` }}>
                {state.isRefreshing ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  renderPanel(panel)
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Mock data generator
function generateMockData(panelType: string): any {
  switch (panelType) {
    case 'timeseries':
      return Array.from({ length: 50 }, (_, i) => ({
        time: new Date(Date.now() - (50 - i) * 60000).toISOString(),
        value: Math.random() * 100
      }));
    
    case 'stat':
    case 'gauge':
      return {
        value: Math.random() * 100,
        title: 'Metric Value'
      };
    
    case 'barchart':
    case 'bar':
      return Array.from({ length: 5 }, (_, i) => ({
        category: `Category ${i + 1}`,
        value: Math.random() * 100
      }));
    
    case 'table':
      return Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        value: Math.random() * 100,
        status: Math.random() > 0.5 ? 'Active' : 'Inactive'
      }));
    
    case 'heatmap':
      return Array.from({ length: 24 }, (_, hour) => 
        Array.from({ length: 7 }, (_, day) => ({
          x: day,
          y: hour,
          value: Math.random() * 100
        }))
      ).flat();
    
    case 'text':
      return {
        content: 'This is a text panel with interpolated content.'
      };
    
    default:
      return [];
  }
}