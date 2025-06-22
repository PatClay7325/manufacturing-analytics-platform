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

  // Professional color palette with better contrast
  const getColor = (index: number) => {
    const colors = [
      '#2563eb', // Professional blue
      '#059669', // Professional green  
      '#dc2626', // Professional red
      '#7c3aed', // Professional purple
      '#ea580c', // Professional orange
      '#0891b2', // Professional cyan
      '#be185d', // Professional pink
      '#65a30d'  // Professional lime
    ];
    return fieldConfig?.color?.fixedColor || colors[index % colors.length];
  };

  // Format axis tick
  const formatXAxis = (tickItem: number) => {
    // Handle invalid dates gracefully
    const date = new Date(tickItem);
    if (isNaN(date.getTime())) {
      return 'Invalid';
    }
    return format(date, 'HH:mm');
  };

  const formatYAxis = (tickItem: number) => {
    if (fieldConfig?.unit === 'percent') {
      return `${tickItem}%`;
    }
    // Professional number formatting
    if (Math.abs(tickItem) >= 1000000) {
      return `${(tickItem / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(tickItem) >= 1000) {
      return `${(tickItem / 1000).toFixed(1)}K`;
    }
    return tickItem?.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload?.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[160px]">
          <p className="text-xs font-medium text-gray-500 mb-2 border-b border-gray-100 pb-2">
            {format(new Date(label), 'MMM dd, yyyy HH:mm:ss')}
          </p>
          <div className="space-y-1">
            {payload?.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-gray-700 font-medium">
                    {entry?.name || 'Value'}:
                  </span>
                </div>
                <span className="text-sm font-semibold ml-2" style={{ color: entry.color }}>
                  {formatYAxis(entry?.value)}
                </span>
              </div>
            ))}
          </div>
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
          radius={[2, 2, 0, 0]}
          stroke={getColor(index)}
          strokeWidth={0.5}
          isAnimationActive={false}
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
          fillOpacity={options?.fillOpacity || 0.15}
          strokeWidth={options?.lineWidth || 2.5}
          name={key}
          dot={options?.showPoints === 'always' ? {
            fill: getColor(index),
            strokeWidth: 2,
            stroke: '#ffffff',
            r: 4
          } : false}
          activeDot={{
            r: 5,
            fill: getColor(index),
            stroke: '#ffffff',
            strokeWidth: 2
          }}
          connectNulls={false}
          strokeLinecap="round"
          strokeLinejoin="round"
          isAnimationActive={false}
        />
      ));
    } else {
      return seriesKeys?.map((key, index) => (
        <Line
          key={key}
          type={options?.lineInterpolation || 'monotone'}
          dataKey={key}
          stroke={getColor(index)}
          strokeWidth={options?.lineWidth || 2.5}
          name={key}
          dot={options?.showPoints === 'always' ? {
            fill: getColor(index),
            strokeWidth: 2,
            stroke: '#ffffff',
            r: 4
          } : false}
          activeDot={{
            r: 5,
            fill: getColor(index),
            stroke: '#ffffff',
            strokeWidth: 2,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
          }}
          connectNulls={false}
          strokeLinecap="round"
          strokeLinejoin="round"
          isAnimationActive={false}
        />
      ));
    }
  };

  return (
    <div style={{ width, height }} className="relative">
      <ResponsiveContainer width="100%" height="100%" minHeight={150}>
        <ChartComponent
          data={chartData}
          margin={{ top: 25, right: 35, left: 25, bottom: 65 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            strokeWidth={0.8}
            opacity={options?.showGridLines !== false ? 0.6 : 0}
            horizontal={true}
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tickFormatter={formatXAxis}
            stroke="#6b7280"
            tick={{ 
              fill: '#374151', 
              fontSize: 12,
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: 500
            }}
            axisLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
            tickLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
            tickMargin={12}
            interval="preserveStartEnd"
            minTickGap={60}
          />
          <YAxis
            tickFormatter={formatYAxis}
            stroke="#6b7280"
            tick={{ 
              fill: '#374151', 
              fontSize: 12,
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: 500
            }}
            axisLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
            tickLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
            tickMargin={12}
            width={70}
            domain={[
              fieldConfig?.min !== undefined ? fieldConfig?.min : 'dataMin - 0.1 * (dataMax - dataMin)',
              fieldConfig?.max !== undefined ? fieldConfig?.max : 'dataMax + 0.1 * (dataMax - dataMin)'
            ]}
          />
          <Tooltip 
            content={<CustomTooltip />}
            cursor={{ 
              stroke: '#2563eb', 
              strokeWidth: 1.5, 
              strokeDasharray: '5 5',
              strokeOpacity: 0.8
            }}
            animationDuration={150}
          />
          {options?.legend?.show !== false && (
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '13px',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                color: '#374151',
                fontWeight: 500
              }}
              iconType="line"
              align="center"
              verticalAlign="bottom"
              height={36}
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

