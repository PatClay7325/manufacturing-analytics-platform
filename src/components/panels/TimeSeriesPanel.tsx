/**
 * Manufacturing Analytics Platform
 * Copyright (c) 2025 Adaptive Factory AI Solutions, Inc.
 * Licensed under the MIT License
 * 
 * Time Series Panel - Advanced time-based data visualization using Recharts
 */

'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Brush
} from 'recharts';
import { format } from 'date-fns';
import { PanelProps } from '@/core/panels/PanelRegistry';
import { TimeSeriesPanelOptions } from '@/types/panel';

// Manufacturing-specific chart configurations
const MANUFACTURING_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#ca8a04', 
  '#9333ea', '#c2410c', '#0891b2', '#be123c'
];

function TimeSeriesPanel({ 
  data, 
  options, 
  width, 
  height, 
  timeRange,
  fieldConfig 
}: PanelProps<TimeSeriesPanelOptions>) {
  
  const chartData = useMemo(() => {
    if (!data || !data?.length) return [];

    // Transform data for Recharts
    const timeField = data[0]?.fields.find(field => field?.type === 'time');
    const valueFields = data[0]?.fields.filter(field => field?.type === 'number');
    
    if (!timeField || !valueFields?.length) return [];

    // Create data points
    const points: any[] = [];
    for (let i = 0; i < timeField.values.length; i++) {
      const point: any = {
        time: new Date(timeField.values[i]).getTime(),
        formattedTime: format(new Date(timeField.values[i]), 'yyyy-MM-dd HH:mm:ss')
      };
      
      valueFields.forEach(field => {
        const key = field.config?.displayName || field.name;
        point[key] = field.values[i];
      });
      
      points.push(point);
    }
    
    return points;
  }, [data]);

  const chartFields = useMemo(() => {
    if (!data || !data?.length) return [];
    
    return data[0]?.fields
      .filter(field => field?.type === 'number')
      .map((field, index) => ({
        key: field.config?.displayName || field.name,
        name: field.config?.displayName || field.name,
        color: field.config?.color?.fixedColor || MANUFACTURING_COLORS[index % MANUFACTURING_COLORS.length],
        unit: field.config?.unit || '',
        drawStyle: field.config?.custom?.drawStyle || 'line',
        lineWidth: field.config?.custom?.lineWidth || 2,
        fillOpacity: field.config?.custom?.fillOpacity || 0.3,
        pointSize: field.config?.custom?.pointSize || 0,
        axisPlacement: field.config?.custom?.axisPlacement || 'left'
      }));
  }, [data]);

  const formatXAxisTick = (tickItem: number) => {
    return format(new Date(tickItem), 'HH:mm');
  };

  const formatTooltipValue = (value: any, name: string) => {
    const field = chartFields.find(f => f.key === name);
    return `${value}${field?.unit ? ` ${field.unit}` : ''}`;
  };

  const renderChart = () => {
    if (!chartData.length) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">No data available</p>
        </div>
      );
    }

    // Determine chart type based on draw styles
    const hasArea = chartFields.some(f => f.drawStyle === 'area');
    const hasBars = chartFields.some(f => f.drawStyle === 'bars');
    const hasPoints = chartFields.some(f => f.drawStyle === 'points');
    
    if (hasBars && !hasArea && !hasPoints) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="time"
              domain={[new Date(timeRange?.from).getTime(), new Date(timeRange?.to).getTime()]}
              type="number"
              tickFormatter={formatXAxisTick}
              stroke="#6b7280"
            />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              labelFormatter={(value) => format(new Date(value), 'yyyy-MM-dd HH:mm:ss')}
              formatter={formatTooltipValue}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #d1d5db',
                borderRadius: '4px'
              }}
            />
            {options.legend.showLegend && (
              <Legend 
                verticalAlign={options.legend.placement === 'top' ? 'top' : 'bottom'}
                height={36}
              />
            )}
            {chartFields.map(field => (
              <Bar
                key={field.key}
                dataKey={field.key}
                fill={field.color}
                name={field.name}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (hasPoints && !hasArea && !hasBars) {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="time"
              domain={[new Date(timeRange?.from).getTime(), new Date(timeRange?.to).getTime()]}
              type="number"
              tickFormatter={formatXAxisTick}
              stroke="#6b7280"
            />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              labelFormatter={(value) => format(new Date(value), 'yyyy-MM-dd HH:mm:ss')}
              formatter={formatTooltipValue}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #d1d5db',
                borderRadius: '4px'
              }}
            />
            {options.legend.showLegend && (
              <Legend 
                verticalAlign={options.legend.placement === 'top' ? 'top' : 'bottom'}
                height={36}
              />
            )}
            {chartFields.map(field => (
              <Scatter
                key={field.key}
                dataKey={field.key}
                fill={field.color}
                name={field.name}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    // Default to line/area chart
    const ChartComponent = hasArea ? AreaChart : LineChart;
    const SeriesComponent = hasArea ? Area : Line;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="time"
            domain={[new Date(timeRange?.from).getTime(), new Date(timeRange?.to).getTime()]}
            type="number"
            tickFormatter={formatXAxisTick}
            stroke="#6b7280"
          />
          <YAxis 
            yAxisId="left"
            stroke="#6b7280"
          />
          {chartFields.some(f => f.axisPlacement === 'right') && (
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#6b7280"
            />
          )}
          <Tooltip 
            labelFormatter={(value) => format(new Date(value), 'yyyy-MM-dd HH:mm:ss')}
            formatter={formatTooltipValue}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #d1d5db',
              borderRadius: '4px'
            }}
          />
          {options.legend.showLegend && (
            <Legend 
              verticalAlign={options.legend.placement === 'top' ? 'top' : 'bottom'}
              height={36}
            />
          )}
          {chartFields.map(field => (
            <SeriesComponent
              key={field.key}
              yAxisId={field.axisPlacement === 'right' ? 'right' : 'left'}
              type="monotone"
              dataKey={field.key}
              stroke={field.color}
              fill={field.color}
              strokeWidth={field.lineWidth}
              fillOpacity={hasArea ? field.fillOpacity : 0}
              name={field.name}
              dot={field.pointSize > 0}
              connectNulls={false}
            />
          ))}
          <Brush 
            dataKey="time"
            height={30}
            stroke="#2563eb"
            tickFormatter={formatXAxisTick}
          />
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="h-full w-full p-2">
      {renderChart()}
    </div>
  );
}

// Default options for TimeSeriesPanel
export const timeSeriesPanelDefaults: TimeSeriesPanelOptions = {
  tooltip: {
    mode: 'multi',
    sort: 'none'
  },
  legend: {
    displayMode: 'list',
    placement: 'bottom',
    showLegend: true,
    asTable: false,
    isVisible: true,
    calcs: []
  }
};

export default TimeSeriesPanel;
export { TimeSeriesPanel };