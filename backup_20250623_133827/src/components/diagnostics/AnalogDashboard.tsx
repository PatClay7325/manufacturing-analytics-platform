'use client';

import React, { useState, useEffect, useRef } from 'react';
import AnalogGauge from './AnalogGauge';
import StreamingChart from './StreamingChart';
import SmoothLineChart from './SmoothLineChart';

interface MetricData {
  target: string;
  datapoints: [number, number][];
}

interface AnalogDashboardProps {
  selectedEquipmentId?: string;
  selectedMetrics?: string[];
}

export default function AnalogDashboard({ selectedEquipmentId, selectedMetrics }: AnalogDashboardProps) {
  const [liveData, setLiveData] = useState<Record<string, number>>({});
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const intervalRef = useRef<NodeJSTimeout>();

  // Show message if no equipment or metrics selected
  if (!selectedEquipmentId || selectedMetrics.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">🎛️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analog Dashboard</h3>
            <p className="text-gray-600">
              {!selectedEquipmentId 
                ? 'Select equipment to view analog displays' 
                : 'Select metrics to monitor'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch live data for gauges
  const fetchLiveData = async () => {
    if (!selectedEquipmentId || !isStreaming || selectedMetrics.length === 0) return;

    try {
      const response = await fetch('/api/metrics/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipmentId: selectedEquipmentId,
          metrics: selectedMetrics,
          timeRange: {
            from: new Date(Date.now() - 60000).toISOString(), // Last minute
            to: new Date().toISOString()
          },
          aggregation: 'none',
          useLiveData: true
        })
      });

      if (response?.ok) {
        const result = await response?.json();
        const newLiveData: Record<string, number> = {};

        result?.data?.forEach((metric: MetricData) => {
          if (metric?.datapoints && metric?.datapoints.length > 0) {
            // Get the latest value
            const latestValue = metric?.datapoints[metric?.datapoints.length - 1][0];
            newLiveData[metric?.target] = latestValue;
          }
        });

        setLiveData(newLiveData);

        // Update historical data
        const timeString = new Date().toLocaleTimeString();
        setHistoricalData(prev => {
          const newPoint = { time: timeString, ...newLiveData };
          const updated = [...prev, newPoint];
          return updated?.slice(-100); // Keep last 100 points
        });
      }
    } catch (error) {
      console.error('Error fetching live data:', error);
    }
  };

  // Streaming data for charts
  const fetchStreamingData = async () => {
    // This would be the same as fetchLiveData but returns array format
    if (!liveData || Object.keys(liveData).length === 0) {
      return [];
    }
    
    const data = Object.entries(liveData).map(([metric, value]) => ({
      metric,
      value,
      timestamp: Date.now()
    }));
    return data;
  };

  useEffect(() => {
    if (isStreaming && selectedEquipmentId && selectedMetrics?.length > 0) {
      // Initial fetch
      fetchLiveData();
      
      // Set up continuous updates (faster for analog feel)
      intervalRef.current = setInterval(fetchLiveData, 500); // 500ms for smooth analog updates
    }

    return () => {
      if (intervalRef?.current) {
        clearInterval(intervalRef?.current);
      }
    };
  }, [isStreaming, selectedEquipmentId, selectedMetrics]);

  const getMetricConfig = (metric: string) => {
    const configs = {
      temperature: { min: 0, max: 100, unit: '°C', color: '#ef4444' },
      pressure: { min: 0, max: 10, unit: ' bar', color: '#3b82f6' },
      vibration: { min: 0, max: 2, unit: ' Hz', color: '#f59e0b' },
      production_count: { min: 0, max: 1000, unit: ' units', color: '#10b981' }
    };
    return configs[metric as keyof typeof configs] || { min: 0, max: 100, unit: '', color: '#6b7280' };
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Analog Manufacturing Dashboard</h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsStreaming(!isStreaming)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isStreaming
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isStreaming ? (
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  Live Stream Active
                </span>
              ) : (
                'Stream Paused'
              )}
            </button>
            <div className="text-sm text-gray-600">
              Updates: 500ms intervals
            </div>
          </div>
        </div>
      </div>

      {/* Analog Gauges */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-6">Real-Time Analog Displays</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {selectedMetrics?.map(metric => {
            const config = getMetricConfig(metric);
            const value = liveData[metric] || 0;
            
            return (
              <div key={metric} className="flex flex-col items-center">
                <AnalogGauge
                  value={value}
                  min={config?.min}
                  max={config?.max}
                  unit={config?.unit}
                  label={metric?.replace('_', ' ').toUpperCase()}
                  color={config?.color}
                  size={180}
                  smoothing={0.92} // High smoothing for analog feel
                />
                <div className="mt-2 text-center">
                  <div className="text-2xl font-bold" style={{ color: config.color }}>
                    {value?.toFixed(1)}{config?.unit}
                  </div>
                  <div className="text-sm text-gray-500">Current Value</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Streaming Charts */}
      <div className="bg-white rounded-lg shadow p-6">
        <StreamingChart
          metrics={selectedMetrics}
          colors={selectedMetrics?.map(m => getMetricConfig(m).color)}
          height={300}
          maxDataPoints={60} // 30 seconds of data at 500ms intervals
          updateInterval={500}
          fetchData={fetchStreamingData}
        />
      </div>

      {/* Historical Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Historical Trend</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {selectedMetrics?.slice(0, 4).map(metric => {
            const config = getMetricConfig(metric);
            const metricData = historicalData?.map(point => ({
              time: point.time,
              value: point[metric] || 0
            }));

            return (
              <div key={metric}>
                <h4 className="text-md font-medium mb-2 capitalize" style={{ color: config.color }}>
                  {metric?.replace('_', ' ')} Trend
                </h4>
                <SmoothLineChart
                  data={metricData}
                  color={config?.color}
                  height={200}
                  maxDataPoints={100}
                  animationDuration={0} // No animation for smooth streaming
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Performance Indicators</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {selectedMetrics?.map(metric => {
            const config = getMetricConfig(metric);
            const value = liveData[metric] || 0;
            const percentage = ((value - config?.min) / (config?.max - config?.min)) * 100;
            
            return (
              <div key={metric} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">
                    {metric?.replace('_', ' ')}
                  </span>
                  <span className="text-lg font-bold" style={{ color: config.color }}>
                    {value?.toFixed(1)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300 ease-out"
                    style={{
                      width: `${Math.max(0, Math.min(100, percentage))}%`,
                      backgroundColor: config.color
                    }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {percentage?.toFixed(1)}% of range
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Information */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>Equipment: {selectedEquipmentId}</div>
          <div>Metrics: {selectedMetrics?.length} active</div>
          <div>Data Points: {historicalData?.length}</div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {isStreaming ? 'Streaming' : 'Paused'}
          </div>
        </div>
      </div>
    </div>
  );
}