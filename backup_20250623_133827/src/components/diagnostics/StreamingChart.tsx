'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
  time: string;
  [key: string]: number | string;
}

interface StreamingChartProps {
  metrics?: string[];
  colors?: string[];
  height?: number;
  maxDataPoints?: number;
  updateInterval?: number;
  fetchData?: () => Promise<any[]>;
}

export default function StreamingChart({
  metrics,
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'],
  height = 300,
  maxDataPoints = 50,
  updateInterval = 1000,
  fetchData
}: StreamingChartProps) {
  const [data, setData] = useState<DataPoint[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const intervalRef = useRef<NodeJSTimeout>();
  const dataBufferRef = useRef<DataPoint[]>([]);

  // Smooth data interpolation
  const interpolateData = useCallback((newPoints: any[]) => {
    const now = Date.now();
    const timeString = new Date(now).toLocaleTimeString();
    
    // Create a new data point
    const newDataPoint: DataPoint = { time: timeString };
    
    // Add metric values
    newPoints?.forEach((point, index) => {
      if (metrics[index] && typeof point.value === 'number') {
        newDataPoint[metrics[index]] = point?.value;
      }
    });

    // Update buffer
    dataBufferRef.current = [...dataBufferRef?.current, newDataPoint];
    
    // Keep only recent data
    if (dataBufferRef?.current.length > maxDataPoints) {
      dataBufferRef.current = dataBufferRef?.current.slice(-maxDataPoints);
    }

    return [...dataBufferRef?.current];
  }, [metrics, maxDataPoints]);

  // Streaming data update
  const updateData = useCallback(async () => {
    if (!isStreaming) return;

    try {
      const newData = await fetchData();
      if (newData && newData?.length > 0) {
        setData(current => interpolateData(newData));
      }
    } catch (error) {
      console.error('Error fetching streaming data:', error);
    }
  }, [isStreaming, fetchData, interpolateData]);

  // Start/stop streaming
  useEffect(() => {
    if (isStreaming) {
      // Initial fetch
      updateData();
      
      // Set up interval for continuous updates
      intervalRef.current = setInterval(updateData, updateInterval);
    } else {
      if (intervalRef?.current) {
        clearInterval(intervalRef?.current);
      }
    }

    return () => {
      if (intervalRef?.current) {
        clearInterval(intervalRef?.current);
      }
    };
  }, [isStreaming, updateData, updateInterval]);

  const toggleStreaming = () => {
    setIsStreaming(!isStreaming);
  };

  return (
    <div className="w-full">
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Live Metrics Stream</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleStreaming}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              isStreaming 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isStreaming ? (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Streaming
              </span>
            ) : (
              'Paused'
            )}
          </button>
          <span className="text-sm text-gray-500">
            {data?.length} / {maxDataPoints} points
          </span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <LineChart 
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            />
            {metrics?.map((metric, index) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={colors[index % colors?.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false} // Disable animation for smooth streaming
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-2">
        {metrics?.map((metric, index) => (
          <div key={metric} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[index % colors?.length] }}
            />
            <span className="text-sm text-gray-600 capitalize">
              {metric?.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}