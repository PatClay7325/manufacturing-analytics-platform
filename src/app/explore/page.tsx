/**
 * Adaptive Factory Manufacturing Intelligence Platform
 * Explore Page - Data exploration and query interface
 * 
 * Original implementation for manufacturing data exploration
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { dataSourceRegistry } from '@/core/datasources/DataSourceRegistry';
import { DataSourceInstanceSettings, DataFrame, DataQuery } from '@/types/datasource';
import { TimeRange } from '@/types/dashboard';
import PageLayout from '@/components/layout/PageLayout';
import DataSourceSelector from '@/components/explore/DataSourceSelector';
import QueryEditor from '@/components/explore/QueryEditor';
import TimeRangeSelector from '@/components/explore/TimeRangeSelector';
import ExploreVisualization from '@/components/explore/ExploreVisualization';
import QueryHistory from '@/components/explore/QueryHistory';
import ExploreMetrics from '@/components/explore/ExploreMetrics';

interface ExploreState {
  selectedDataSource: string | null;
  query: DataQuery;
  timeRange: TimeRange;
  data: DataFrame[];
  loading: boolean;
  error: string | null;
  queryHistory: HistoryItem[];
  visualizationType: 'table' | 'timeseries' | 'logs' | 'raw';
  autoRefresh: boolean;
  refreshInterval: number;
}

interface HistoryItem {
  id: string;
  query: DataQuery;
  datasource: string;
  timestamp: Date;
  execution_time: number;
  error?: string;
}

export default function ExplorePage() {
  const [state, setState] = useState<ExploreState>({
    selectedDataSource: null,
    query: { refId: 'A' },
    timeRange: {
      from: 'now-1h',
      to: 'now'
    },
    data: [],
    loading: false,
    error: null,
    queryHistory: [],
    visualizationType: 'table',
    autoRefresh: false,
    refreshInterval: 30000
  });

  const [availableDataSources, setAvailableDataSources] = useState<DataSourceInstanceSettings[]>([]);

  // Load available data sources
  useEffect(() => {
    const dataSources = dataSourceRegistry.getAllInstances();
    setAvailableDataSources(dataSources);
    
    // Select first manufacturing data source by default
    const manufacturingSources = dataSources.filter(ds => 
      ds.meta.category === 'manufacturing' || ds.meta.category === 'industrial'
    );
    
    if (manufacturingSources.length > 0) {
      setState(prev => ({ 
        ...prev, 
        selectedDataSource: manufacturingSources[0].uid 
      }));
    } else if (dataSources.length > 0) {
      setState(prev => ({ 
        ...prev, 
        selectedDataSource: dataSources[0].uid 
      }));
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!state.autoRefresh || !state.selectedDataSource) return;

    const interval = setInterval(() => {
      executeQuery();
    }, state.refreshInterval);

    return () => clearInterval(interval);
  }, [state.autoRefresh, state.refreshInterval, state.selectedDataSource, state.query]);

  const selectedDataSourceInstance = useMemo(() => {
    return availableDataSources.find(ds => ds.uid === state.selectedDataSource);
  }, [availableDataSources, state.selectedDataSource]);

  const executeQuery = async () => {
    if (!state.selectedDataSource || !state.query) return;

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    const startTime = Date.now();
    
    try {
      const request = {
        app: 'explore' as const,
        requestId: `explore_${Date.now()}`,
        timezone: 'browser',
        range: state.timeRange,
        targets: [state.query],
        maxDataPoints: 1000,
        intervalMs: 15000,
        startTime: Date.now()
      };

      const response = await dataSourceRegistry.executeQuery(state.selectedDataSource, request);
      const executionTime = Date.now() - startTime;

      // Add to query history
      const historyItem: HistoryItem = {
        id: `history_${Date.now()}`,
        query: state.query,
        datasource: state.selectedDataSource,
        timestamp: new Date(),
        execution_time: executionTime
      };

      setState(prev => ({
        ...prev,
        data: response.data,
        loading: false,
        queryHistory: [historyItem, ...prev.queryHistory.slice(0, 49)] // Keep last 50
      }));

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Query failed';

      // Add error to history
      const historyItem: HistoryItem = {
        id: `history_${Date.now()}`,
        query: state.query,
        datasource: state.selectedDataSource,
        timestamp: new Date(),
        execution_time: executionTime,
        error: errorMessage
      };

      setState(prev => ({
        ...prev,
        data: [],
        loading: false,
        error: errorMessage,
        queryHistory: [historyItem, ...prev.queryHistory.slice(0, 49)]
      }));
    }
  };

  const handleDataSourceChange = (datasourceUid: string) => {
    setState(prev => ({ 
      ...prev, 
      selectedDataSource: datasourceUid,
      data: [],
      error: null
    }));
  };

  const handleQueryChange = (newQuery: DataQuery) => {
    setState(prev => ({ ...prev, query: newQuery }));
  };

  const handleTimeRangeChange = (newTimeRange: TimeRange) => {
    setState(prev => ({ ...prev, timeRange: newTimeRange }));
  };

  const handleVisualizationChange = (type: typeof state.visualizationType) => {
    setState(prev => ({ ...prev, visualizationType: type }));
  };

  const handleHistorySelect = (historyItem: HistoryItem) => {
    setState(prev => ({
      ...prev,
      query: historyItem.query,
      selectedDataSource: historyItem.datasource
    }));
  };

  const toggleAutoRefresh = () => {
    setState(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }));
  };

  const setRefreshInterval = (interval: number) => {
    setState(prev => ({ ...prev, refreshInterval: interval }));
  };

  const addQueryToDashboard = () => {
    // This would open a modal to select/create dashboard
    console.log('Add to dashboard:', state.query);
  };

  const exportData = () => {
    if (state.data.length === 0) return;
    
    // Convert DataFrame to CSV
    const csv = convertDataFrameToCSV(state.data[0]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `explore_data_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const convertDataFrameToCSV = (dataFrame: DataFrame): string => {
    if (!dataFrame.fields.length) return '';
    
    const headers = dataFrame.fields.map(field => field.name).join(',');
    const rows = [];
    
    for (let i = 0; i < dataFrame.length; i++) {
      const row = dataFrame.fields.map(field => {
        const value = field.values[i];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      }).join(',');
      rows.push(row);
    }
    
    return [headers, ...rows].join('\n');
  };

  return (
    <PageLayout>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Explore</h1>
              <p className="text-sm text-gray-600">
                Query and explore manufacturing data from multiple sources
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Auto-refresh toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleAutoRefresh}
                  className={`px-3 py-1 rounded text-sm ${
                    state.autoRefresh 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}
                >
                  Auto-refresh {state.autoRefresh ? 'ON' : 'OFF'}
                </button>
                
                {state.autoRefresh && (
                  <select
                    value={state.refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value={5000}>5s</option>
                    <option value={10000}>10s</option>
                    <option value={30000}>30s</option>
                    <option value={60000}>1m</option>
                    <option value={300000}>5m</option>
                  </select>
                )}
              </div>
              
              {/* Export button */}
              <button
                onClick={exportData}
                disabled={state.data.length === 0}
                className="px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export CSV
              </button>
              
              {/* Add to dashboard button */}
              <button
                onClick={addQueryToDashboard}
                disabled={state.data.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Dashboard
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex">
          {/* Left Sidebar - Query Builder */}
          <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
            {/* Data Source Selection */}
            <div className="p-4 border-b border-gray-200">
              <DataSourceSelector
                dataSources={availableDataSources}
                selectedDataSource={state.selectedDataSource}
                onDataSourceChange={handleDataSourceChange}
              />
            </div>

            {/* Time Range */}
            <div className="p-4 border-b border-gray-200">
              <TimeRangeSelector
                timeRange={state.timeRange}
                onChange={handleTimeRangeChange}
              />
            </div>

            {/* Query Editor */}
            <div className="flex-1 p-4">
              {selectedDataSourceInstance && (
                <QueryEditor
                  datasource={selectedDataSourceInstance}
                  query={state.query}
                  onChange={handleQueryChange}
                  onRunQuery={executeQuery}
                  loading={state.loading}
                />
              )}
            </div>

            {/* Query History */}
            <div className="border-t border-gray-200">
              <QueryHistory
                history={state.queryHistory}
                onSelectHistory={handleHistorySelect}
              />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Visualization Controls */}
            <div className="bg-white border-b border-gray-200 px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">View as:</span>
                  <div className="flex space-x-1">
                    {(['table', 'timeseries', 'logs', 'raw'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => handleVisualizationChange(type)}
                        className={`px-3 py-1 text-sm rounded ${
                          state.visualizationType === type
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Metrics */}
                <ExploreMetrics
                  data={state.data}
                  loading={state.loading}
                  error={state.error}
                  queryHistory={state.queryHistory}
                />
              </div>
            </div>

            {/* Visualization Area */}
            <div className="flex-1 overflow-hidden">
              <ExploreVisualization
                data={state.data}
                loading={state.loading}
                error={state.error}
                visualizationType={state.visualizationType}
                timeRange={state.timeRange}
                onRunQuery={executeQuery}
              />
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}