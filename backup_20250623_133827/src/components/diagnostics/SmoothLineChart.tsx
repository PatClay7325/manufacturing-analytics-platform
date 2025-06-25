'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
  time: string;
  value: number;
}

interface SmoothLineChartProps {
  data?: DataPoint[];
  color?: string;
  height?: number;
  maxDataPoints?: number;
  animationDuration?: number;
}

export default function SmoothLineChart({
  data,
  color = '#3b82f6',
  height = 200,
  maxDataPoints = 50,
  animationDuration = 0
}: SmoothLineChartProps) {
  const [displayData, setDisplayData] = useState<DataPoint[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    // Cancel any ongoing animation
    if (animationFrameRef?.current) {
      cancelAnimationFrame(animationFrameRef?.current);
    }

    // Smoothly update the display data
    const updateData = () => {
      setDisplayData(currentData => {
        // If we have new data, append it
        if (data?.length > 0) {
          const newData = [...currentData];
          
          // Add new points that don't exist
          data?.forEach(point => {
            const exists = newData?.find(p => p?.time === point?.time);
            if (!exists) {
              newData?.push(point);
            }
          });

          // Keep only the most recent data points
          if (newData?.length > maxDataPoints) {
            return newData?.slice(-maxDataPoints);
          }

          return newData;
        }
        
        return currentData;
      });
    };

    updateData();
  }, [data, maxDataPoints]);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart 
          data={displayData} 
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
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={animationDuration > 0}
            animationDuration={animationDuration}
            animationEasing="linear"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}