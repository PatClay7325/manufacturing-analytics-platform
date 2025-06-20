'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';
import { Panel } from '@/types/dashboard';
import { format } from 'date-fns';

interface TimeSeriesPanelProps {
  panel?: Panel;
  data?: any;
  height?: string | number;
  width?: string | number;
}

export default function TimeSeriesPanel({
  panel,
  data,
  height = '100%',
  width = '100%'
}: TimeSeriesPanelProps) {
  const options = panel?.options || {};
  const fieldConfig = panel?.fieldConfig?.defaults || {};

  // Transform data for Recharts
  const chartData = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      // Generate sample data for demo
      const now = Date.now();
      return Array.from({ length: 50 }, (_, i) => ({
        time: now - (49 - i) * 60000,
        value: Math.sin(i / 10) * 50 + 50 + Math.random() * 20,
        value2: Math.cos(i / 8) * 30 + 60 + Math.random() * 15
      }));
    }
    return data;
  }, [data]);

  // Determine chart type
  const ChartComponent = useMemo(() => {
    switch (options?.graphStyle) {
      case 'bars':
        return BarChart;
      case 'area':
        return AreaChart;
      default:
        return LineChart;
    }
  }, [options?.graphStyle]);

  // Get series colors
  const getColor = (index: number) => {
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // yellow
      '#ef4444', // red
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#14b8a6', // teal
      '#f97316'  // orange
    ];
    return fieldConfig?.color?.fixedColor || colors[index % colors?.length];
  };

  // Format axis tick
  const formatXAxis = (tickItem: number) => {
    return format(new Date(tickItem), 'HH:mm');
  };

  const formatYAxis = (tickItem: number) => {
    if (fieldConfig?.unit === 'percent') {
      return `${tickItem}%`;
    }
    return tickItem?.toLocaleString();
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload?.length) {
      return (
        <div className="bg-gray-800 border border-gray-700 rounded p-2 shadow-lg">
          <p className="text-xs text-gray-400">
            {format(new Date(label), 'MMM dd, HH:mm:ss')}
          </p>
          {payload?.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry?.name}: {formatYAxis(entry?.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render appropriate series elements
  const renderSeries = () => {
    const seriesKeys = Object.keys(chartData[0] || {}).filter(key => key !== 'time');

    if (options?.graphStyle === 'bars') {
      return seriesKeys?.map((key, index) => (
        <Bar
          key={key}
          dataKey={key}
          fill={getColor(index)}
          name={key}
          barSize={options?.barWidth || 40}
        />
      ));
    } else if (options?.graphStyle === 'area') {
      return seriesKeys?.map((key, index) => (
        <Area
          key={key}
          type={options?.lineInterpolation || 'monotone'}
          dataKey={key}
          stroke={getColor(index)}
          fill={getColor(index)}
          fillOpacity={options?.fillOpacity || 0.1}
          strokeWidth={options?.lineWidth || 2}
          name={key}
          dot={options?.showPoints === 'always'}
        />
      ));
    } else {
      return seriesKeys?.map((key, index) => (
        <Line
          key={key}
          type={options?.lineInterpolation || 'monotone'}
          dataKey={key}
          stroke={getColor(index)}
          strokeWidth={options?.lineWidth || 2}
          name={key}
          dot={options?.showPoints === 'always'}
        />
      ));
    }
  };

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer>
        <ChartComponent
          data={chartData}
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#374151"
            opacity={options?.showGridLines !== false ? 1 : 0}
          />
          <XAxis
            dataKey="time"
            tickFormatter={formatXAxis}
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            axisLine={{ stroke: '#4b5563' }}
          />
          <YAxis
            tickFormatter={formatYAxis}
            stroke="#9ca3af"
            tick={{ fill: '#9ca3af', fontSize: 12 }}
            axisLine={{ stroke: '#4b5563' }}
            domain={[
              fieldConfig?.min !== undefined ? fieldConfig?.min : 'dataMin',
              fieldConfig?.max !== undefined ? fieldConfig?.max : 'dataMax'
            ]}
          />
          <Tooltip content={<CustomTooltip />} />
          {options?.legend?.show !== false && (
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '12px'
              }}
              iconType="line"
            />
          )}
          {renderSeries()}
          
          {/* Thresholds */}
          {fieldConfig?.thresholds?.steps?.map((threshold, index) => (
            index > 0 && (
              <ReferenceLine
                key={index}
                y={threshold?.value}
                stroke={threshold?.color}
                strokeDasharray="5 5"
                label={{
                  value: threshold.value,
                  fill: threshold.color,
                  fontSize: 10
                }}
              />
            )
          ))}

          {/* Brush for zooming */}
          {options?.showBrush && (
            <Brush
              dataKey="time"
              height={30}
              stroke="#4b5563"
              fill="#1f2937"
              tickFormatter={formatXAxis}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}