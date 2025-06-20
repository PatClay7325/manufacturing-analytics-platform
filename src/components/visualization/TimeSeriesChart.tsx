'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface TimeSeriesData {
  timestamp: string;
  [key: string]: any;
}

interface TimeSeriesChartProps {
  data: TimeSeriesData[];
  series: {
    key: string;
    name: string;
    color: string;
    unit?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  }[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showBrush?: boolean;
  referenceLines?: {
    y?: number;
    x?: string;
    label: string;
    color: string;
  }[];
  timeFormat?: string;
  className?: string;
}

export default function TimeSeriesChart({
  data,
  series,
  height = 400,
  showGrid = true,
  showLegend = true,
  showBrush = false,
  referenceLines = [],
  timeFormat = 'MMM dd HH:mm',
  className = ''
}: TimeSeriesChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Process data for time formatting
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      formattedTime: format(parseISO(item.timestamp), timeFormat)
    }));
  }, [data, timeFormat]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-sm font-semibold text-gray-700 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => {
            const seriesConfig = series.find(s => s.key === entry.dataKey);
            return (
              <div key={index} className="flex items-center justify-between gap-4">
                <span 
                  className="text-sm"
                  style={{ color: entry.color }}
                >
                  {entry.name}:
                </span>
                <span className="text-sm font-medium">
                  {entry.value.toFixed(2)} {seriesConfig?.unit || ''}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Calculate Y-axis domain with padding
  const yDomain = useMemo(() => {
    const allValues = data.flatMap(item => 
      series.map(s => item[s.key]).filter(v => v !== null && v !== undefined)
    );
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  }, [data, series]);

  return (
    <div ref={chartRef} className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={processedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#e0e0e0"
              verticalPoints={[0]}
            />
          )}
          
          <XAxis 
            dataKey="formattedTime"
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          
          <YAxis 
            domain={yDomain}
            tick={{ fontSize: 12 }}
            stroke="#666"
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {showLegend && (
            <Legend 
              wrapperStyle={{ fontSize: '14px' }}
              iconType="line"
              verticalAlign="bottom"
              height={36}
            />
          )}
          
          {/* Reference lines */}
          {referenceLines.map((line, index) => (
            <ReferenceLine
              key={index}
              y={line.y}
              x={line.x}
              stroke={line.color}
              strokeDasharray="5 5"
              label={{
                value: line.label,
                position: 'right',
                style: { fontSize: 12, fill: line.color }
              }}
            />
          ))}
          
          {/* Data series */}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={s.strokeWidth || 2}
              strokeDasharray={s.strokeDasharray}
              dot={false}
              activeDot={{ r: 6 }}
            />
          ))}
          
          {/* Brush for zooming */}
          {showBrush && (
            <Brush 
              dataKey="formattedTime"
              height={30}
              stroke="#8884d8"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}