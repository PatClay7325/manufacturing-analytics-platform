'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts';
import AnimatedNumber from '@/components/common/AnimatedNumber';
import AnalogDashboard from './AnalogDashboard';

interface MetricData {
  target: string;
  datapoints: [number, number][];
}

export default function MetricsTestPanel() {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aggregation, setAggregation] = useState('none');
  const [interval, setInterval] = useState('5m');
  const [selectedMetrics, setSelectedMetrics] = useState(['temperature', 'pressure']);
  const [timeRange, setTimeRange] = useState('1h');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>('');
  const [availableEquipment, setAvailableEquipment] = useState<Array<{id: string, name: string}>>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds
  const refreshTimeoutRef = useRef<NodeJSTimeout>();
  const [viewMode, setViewMode] = useState<'charts' | 'analog'>('charts');

  const availableMetrics = [
    { id: 'temperature', name: 'Temperature', unit: '°C', icon: '🌡️' },
    { id: 'pressure', name: 'Pressure', unit: 'bar', icon: '🔵' },
    { id: 'vibration', name: 'Vibration', unit: 'Hz', icon: '📊' },
    { id: 'production_count', name: 'Production Count', unit: 'units', icon: '📦' }
  ];

  const aggregationTypes = [
    { value: 'none', label: 'Raw Data' },
    { value: 'avg', label: 'Average' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' },
    { value: 'sum', label: 'Sum' },
    { value: 'count', label: 'Count' }
  ];

  const intervals = ['1m', '5m', '10m', '30m', '1h'];
  const timeRanges = [
    { value: '1h', label: 'Last Hour' },
    { value: '6h', label: 'Last 6 Hours' },
    { value: '12h', label: 'Last 12 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '48h', label: 'Last 48 Hours' }
  ];

  // Fetch available equipment on mount
  useEffect(() => {
    const fetchEquipment = async () => {
      try {
        const response = await fetch('/api/equipment');
        if (response?.ok) {
          const data = await response?.json();
          setAvailableEquipment(data?.equipment || []);
          // Select first equipment by default
          if (data?.equipment && data?.equipment.length > 0) {
            setSelectedEquipmentId(data?.equipment[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch equipment:', err);
      }
    };
    fetchEquipment();
  }, []);

  const fetchMetrics = async () => {
    if (!selectedEquipmentId) {
      setError('Please select equipment to monitor');
      return;
    }

    setLoading(true);
    setError(null);

    const now = new Date();
    const hours = parseInt(timeRange);
    const from = new Date(now?.getTime() - hours * 60 * 60 * 1000);

    try {
      const response = await fetch('/api/metrics/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: selectedEquipmentId,
          metrics: selectedMetrics,
          timeRange: {
            from: from.toISOString(),
            to: now.toISOString()
          },
          aggregation,
          interval: aggregation !== 'none' ? interval : undefined,
          useLiveData: true // Force live data
        })
      });

      const result = await response?.json();
      
      if (response?.ok) {
        setMetrics(result?.data || []);
      } else {
        setError(result?.error || 'Failed to fetch metrics');
      }
    } catch (err) {
      setError('Network error: ' + (err instanceof Error ? err?.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMetrics?.length > 0 && selectedEquipmentId) {
      fetchMetrics();
    }
  }, [aggregation, interval, selectedMetrics?.join(','), timeRange, selectedEquipmentId]);

  // Auto-refresh logic
  useEffect(() => {
    if (autoRefresh && selectedMetrics?.length > 0 && selectedEquipmentId && !loading) {
      refreshTimeoutRef.current = setTimeout(() => {
        fetchMetrics();
      }, refreshInterval);
    }

    return () => {
      if (refreshTimeoutRef?.current) {
        clearTimeout(refreshTimeoutRef?.current);
      }
    };
  }, [metrics, autoRefresh, refreshInterval, selectedMetrics, selectedEquipmentId, loading]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getLatestValue = (datapoints: [number, number][]) => {
    if (!datapoints || datapoints.length === 0) return 'N/A';
    return datapoints[datapoints?.length - 1][0].toFixed(2);
  };

  const getMetricStats = (datapoints: [number, number][]) => {
    if (!datapoints || datapoints.length === 0) return { min: 0, max: 0, avg: 0 };
    
    const values = datapoints?.map(dp => dp[0]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values?.reduce((a, b) => a + b, 0) / values?.length;
    
    return { min, max, avg };
  };

  // Transform data for Recharts
  const transformDataForChart = (metricData: MetricData[]) => {
    if (!metricData || metricData.length === 0) return [];
    
    // Get all unique timestamps
    const allTimestamps = new Set<number>();
    metricData?.forEach(metric => {
      metric?.datapoints.forEach(dp => allTimestamps?.add(dp[1]));
    });
    
    // Create data points with all metrics
    return Array.from(allTimestamps).sort().map(timestamp => {
      const point: any = { time: formatTimestamp(timestamp), timestamp };
      metricData?.forEach(metric => {
        const dp = metric?.datapoints.find(d => d[1] === timestamp);
        point[metric?.target] = dp ? dp[0] : null;
      });
      return point;
    });
  };

  const chartData = transformDataForChart(metrics);

  // Create gauge data for radial charts
  const createGaugeData = (value: number, max: number) => {
    const percentage = (value / max) * 100;
    return [
      { name: 'value', value: percentage, fill: percentage > 80 ? '#ef4444' : percentage > 60 ? '#f59e0b' : '#10b981' }
    ];
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Metrics Query Configuration</h3>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e?.target.checked)}
                className="rounded text-blue-600"
              />
              <span>Auto-refresh</span>
            </label>
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e?.target.value))}
                className="text-sm px-2 py-1 border border-gray-300 rounded-md"
              >
                <option value="3000">3s</option>
                <option value="5000">5s</option>
                <option value="10000">10s</option>
                <option value="30000">30s</option>
              </select>
            )}
            {autoRefresh && (
              <div className="flex items-center text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                Live
              </div>
            )}
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-gray-600">View:</span>
              <button
                onClick={() => setViewMode('charts')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'charts'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📊 Charts
              </button>
              <button
                onClick={() => setViewMode('analog')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'analog'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🎛️ Analog
              </button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Equipment Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Equipment
            </label>
            <select
              value={selectedEquipmentId}
              onChange={(e) => setSelectedEquipmentId(e?.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableEquipment.length === 0 ? (
                <option value="">Loading equipment...</option>
              ) : (
                availableEquipment?.map(equipment => (
                  <option key={equipment?.id} value={equipment?.id}>{equipment?.name}</option>
                ))
              )}
            </select>
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Range
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e?.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timeRanges?.map(range => (
                <option key={range?.value} value={range?.value}>{range?.label}</option>
              ))}
            </select>
          </div>

          {/* Aggregation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aggregation
            </label>
            <select
              value={aggregation}
              onChange={(e) => setAggregation(e?.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {aggregationTypes?.map(type => (
                <option key={type?.value} value={type?.value}>{type?.label}</option>
              ))}
            </select>
          </div>

          {/* Interval */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interval {aggregation === 'none' && '(disabled)'}
            </label>
            <select
              value={interval}
              onChange={(e) => setInterval(e?.target.value)}
              disabled={aggregation === 'none'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              {intervals?.map(int => (
                <option key={int} value={int}>{int}</option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <div className="flex items-end">
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Metric Selection */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Metrics to Monitor
          </label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {availableMetrics?.map(metric => (
              <label
                key={metric?.id}
                className={`
                  flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all
                  ${selectedMetrics?.includes(metric?.id) 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={selectedMetrics?.includes(metric?.id)}
                  onChange={(e) => {
                    if (e?.target.checked) {
                      setSelectedMetrics([...selectedMetrics, metric?.id]);
                    } else {
                      setSelectedMetrics(selectedMetrics?.filter(m => m !== metric?.id));
                    }
                  }}
                  className="sr-only"
                />
                <span className="text-2xl mr-2">{metric?.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-sm">{metric?.name}</div>
                  <div className="text-xs text-gray-500">{metric?.unit}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error fetching metrics</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Conditional Rendering based on view mode */}
      {viewMode === 'analog' ? (
        <AnalogDashboard
          selectedEquipmentId={selectedEquipmentId}
          selectedMetrics={selectedMetrics}
        />
      ) : (
        <>
          {/* Main Chart */}
          {chartData?.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">
                Metrics Timeline
                <span className="text-sm font-normal text-gray-500 ml-2">
                  {aggregation === 'none' ? 'Raw data' : `${aggregation?.toUpperCase()} aggregation (${interval} intervals)`}
                </span>
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                  {metrics?.map((metric, index) => {
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                    return (
                      <Line
                        key={metric?.target}
                        type="monotone"
                        dataKey={metric?.target}
                        stroke={colors[index % colors?.length]}
                        strokeWidth={2}
                        dot={false}
                        animationDuration={300}
                        animationEasing="ease-out"
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Individual Metric Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {metrics?.map((metric) => {
              const stats = getMetricStats(metric?.datapoints);
              const metricInfo = availableMetrics?.find(m => m?.id === metric?.target);
              const latestValue = parseFloat(getLatestValue(metric?.datapoints));
              
              return (
                <div key={metric?.target} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <span className="text-2xl mr-2">{metricInfo?.icon}</span>
                      {metricInfo?.name || metric?.target}
                    </h3>
                    <div className="text-2xl font-bold text-blue-600 flex items-baseline gap-1">
                      <AnimatedNumber value={latestValue} decimals={2} />
                      <span className="text-lg font-normal">{metricInfo?.unit}</span>
                    </div>
                  </div>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 bg-gray-50 rounded transition-all hover:bg-gray-100">
                      <div className="text-sm text-gray-500">Minimum</div>
                      <div className="text-lg font-semibold">
                        <AnimatedNumber value={stats?.min} decimals={2} />
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded transition-all hover:bg-gray-100">
                      <div className="text-sm text-gray-500">Average</div>
                      <div className="text-lg font-semibold">
                        <AnimatedNumber value={stats?.avg} decimals={2} />
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded transition-all hover:bg-gray-100">
                      <div className="text-sm text-gray-500">Maximum</div>
                      <div className="text-lg font-semibold">
                        <AnimatedNumber value={stats?.max} decimals={2} />
                      </div>
                    </div>
                  </div>

                  {/* Mini Chart */}
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart 
                      data={(metric?.datapoints || []).map(dp => ({ 
                        time: formatTimestamp(dp[1]), 
                        value: dp[0] 
                      }))}
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id={`gradient-${metric?.target}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" opacity={0.5} />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill={`url(#gradient-${metric?.target})`} 
                        animationDuration={300}
                        animationEasing="ease-out"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
