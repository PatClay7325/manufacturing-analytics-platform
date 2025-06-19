/**
 * Adaptive Factory Manufacturing Intelligence Platform
 * Time Series Panel - Advanced time-based data visualization using Recharts
 */

'use client';

import React, { useMemo, useEffect, useState } from 'react';
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
  ReferenceLine,
  ReferenceArea
} from 'recharts';
import { PanelProps } from '@/core/panels/PanelRegistry';
import { TimeSeriesPanelOptions } from '@/types/panel';
import { rechartsService } from '@/services/rechartsService';

// Manufacturing-specific theme colors
const MANUFACTURING_COLORS = [
  '#2563eb', // Blue
  '#dc2626', // Red
  '#16a34a', // Green
  '#ca8a04', // Yellow
  '#9333ea', // Purple
  '#c2410c', // Orange
  '#0891b2', // Cyan
  '#be123c'  // Pink
];

export default function RechartsTimeSeriesPanel({ 
  data, 
  options, 
  width, 
  height, 
  timeRange,
  fieldConfig 
}: PanelProps<TimeSeriesPanelOptions>) {
  
  const [chartData, setChartData] = useState<any[]>([]);
  const [seriesConfig, setSeriesConfig] = useState<any[]>([]);

  // Process data when it changes
  useEffect(() => {
    if (!data || !data.length) {
      setChartData([]);
      setSeriesConfig([]);
      return;
    }

    // Convert panel data to Recharts format
    const processedData: any[] = [];
    const series: any[] = [];
    const dataMap = new Map<number, any>();

    data.forEach((frame) => {
      const timeField = frame.fields.find(field => field.type === 'time');
      const valueFields = frame.fields.filter(field => field.type === 'number');
      
      if (!timeField || !valueFields.length) return;
      
      valueFields.forEach((valueField, index) => {
        // Add series configuration
        series.push({
          dataKey: valueField.name,
          name: valueField.config?.displayName || valueField.name,
          color: valueField.config?.color?.fixedColor || MANUFACTURING_COLORS[index % MANUFACTURING_COLORS.length],
          strokeWidth: valueField.config?.custom?.lineWidth || 2,
          dot: false,
          activeDot: { r: 4 },
          unit: valueField.config?.unit || ''
        });

        // Process data points
        for (let i = 0; i < Math.min(timeField.values.length, valueField.values.length); i++) {
          const timestamp = new Date(timeField.values[i]).getTime();
          const value = valueField.values[i];
          
          if (!isNaN(timestamp) && value !== null && value !== undefined) {
            if (!dataMap.has(timestamp)) {
              dataMap.set(timestamp, { timestamp });
            }
            dataMap.get(timestamp)[valueField.name] = value;
          }
        }
      });
    });

    // Convert map to sorted array
    const sortedData = Array.from(dataMap.values()).sort((a, b) => a.timestamp - b.timestamp);
    setChartData(sortedData);
    setSeriesConfig(series);
  }, [data]);

  // Determine which chart component to use
  const ChartComponent = useMemo(() => {
    const chartType = options.tooltip?.mode || 'line';
    switch (chartType) {
      case 'area': return AreaChart;
      case 'bar': return BarChart;
      case 'scatter': return ScatterChart;
      default: return LineChart;
    }
  }, [options.tooltip?.mode]);

  // Render appropriate series component
  const renderSeries = () => {
    const chartType = options.tooltip?.mode || 'line';
    
    return seriesConfig.map((series) => {
      switch (chartType) {
        case 'area':
          return (
            <Area
              key={series.dataKey}
              type="monotone"
              dataKey={series.dataKey}
              name={series.name}
              stroke={series.color}
              fill={series.color}
              fillOpacity={0.3}
              strokeWidth={series.strokeWidth}
              dot={false}
              activeDot={{ r: 4 }}
            />
          );
        case 'bar':
          return (
            <Bar
              key={series.dataKey}
              dataKey={series.dataKey}
              name={series.name}
              fill={series.color}
            />
          );
        case 'scatter':
          return (
            <Scatter
              key={series.dataKey}
              dataKey={series.dataKey}
              name={series.name}
              fill={series.color}
            />
          );
        default:
          return (
            <Line
              key={series.dataKey}
              type="monotone"
              dataKey={series.dataKey}
              name={series.name}
              stroke={series.color}
              strokeWidth={series.strokeWidth}
              dot={series.dot}
              activeDot={series.activeDot}
              connectNulls={false}
            />
          );
      }
    });
  };

  // Custom tooltip formatter
  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const sortedPayload = options.tooltip?.sort === 'asc' 
      ? [...payload].sort((a: any, b: any) => a.value - b.value)
      : options.tooltip?.sort === 'desc'
      ? [...payload].sort((a: any, b: any) => b.value - a.value)
      : payload;

    return (
      <div className="bg-white p-2 border border-gray-200 rounded shadow-lg">
        <p className="text-sm font-semibold mb-1">
          {new Date(label).toLocaleString()}
        </p>
        {sortedPayload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toFixed(2)} {seriesConfig.find(s => s.dataKey === entry.dataKey)?.unit || ''}
          </p>
        ))}
      </div>
    );
  };

  // Render empty state
  if (!chartData.length) {
    return (
      <div className="h-full w-full flex items-center justify-center text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          {options.legend?.showLegend !== false && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          )}
          <XAxis 
            dataKey="timestamp"
            type="number"
            domain={[
              timeRange ? new Date(timeRange.from).getTime() : 'dataMin',
              timeRange ? new Date(timeRange.to).getTime() : 'dataMax'
            ]}
            tickFormatter={(value) => new Date(value).toLocaleTimeString()}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            domain={['auto', 'auto']}
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            content={customTooltip}
            wrapperStyle={{ outline: 'none' }}
          />
          {options.legend?.showLegend && (
            <Legend 
              verticalAlign={options.legend?.placement === 'bottom' ? 'bottom' : 'top'}
              height={36}
              iconType="line"
              wrapperStyle={{ fontSize: '12px' }}
            />
          )}
          {renderSeries()}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

// Default options for TimeSeriesPanel
export const rechartsTimeSeriesPanelDefaults: TimeSeriesPanelOptions = {
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