/**
 * Simple Time Series Panel - A working time series visualization
 * This is a complete, functional implementation
 */

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
  ReferenceArea,
} from 'recharts';
import { format } from 'date-fns';

export interface TimeSeriesData {
  timestamp: number;
  [key: string]: number | string;
}

export interface TimeSeriesPanelProps {
  data: TimeSeriesData[];
  options?: TimeSeriesPanelOptions;
  width?: number;
  height?: number;
  timeRange?: { from: Date | string; to: Date | string };
}

export interface TimeSeriesPanelOptions {
  title?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  yAxis?: {
    label?: string;
    min?: number;
    max?: number;
    decimals?: number;
  };
  series?: SeriesConfig[];
  thresholds?: ThresholdConfig[];
  annotations?: AnnotationConfig[];
}

interface SeriesConfig {
  field: string;
  displayName?: string;
  color?: string;
  lineWidth?: number;
  showPoints?: boolean;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
}

interface ThresholdConfig {
  value: number;
  color: string;
  label?: string;
  fillAbove?: boolean;
  fillBelow?: boolean;
}

interface AnnotationConfig {
  time: number;
  text: string;
  color?: string;
}

export const SimpleTimeSeriesPanel: React.FC<TimeSeriesPanelProps> = ({
  data,
  options = {},
  width,
  height = 400,
  timeRange,
}) => {
  const {
    title,
    showLegend = true,
    showGrid = true,
    showTooltip = true,
    yAxis = {},
    series = [],
    thresholds = [],
    annotations = [],
  } = options;

  // Process data for recharts
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Filter by time range if provided
    let filteredData = data;
    if (timeRange) {
      const from = new Date(timeRange.from).getTime();
      const to = new Date(timeRange.to).getTime();
      filteredData = data.filter(d => d.timestamp >= from && d.timestamp <= to);
    }

    // Sort by timestamp
    return filteredData.sort((a, b) => a.timestamp - b.timestamp);
  }, [data, timeRange]);

  // Get series fields
  const seriesFields = useMemo(() => {
    if (series.length > 0) {
      return series;
    }

    // Auto-detect numeric fields
    if (processedData.length > 0) {
      const firstRow = processedData[0];
      return Object.keys(firstRow)
        .filter(key => key !== 'timestamp' && typeof firstRow[key] === 'number')
        .map(field => ({
          field,
          displayName: field,
          color: getDefaultColor(field),
        }));
    }

    return [];
  }, [series, processedData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium mb-2">
            {format(new Date(label), 'MMM d, yyyy HH:mm:ss')}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span>{entry.name}:</span>
              <span className="font-medium">
                {formatValue(entry.value, yAxis.decimals)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Format Y-axis values
  const formatYAxis = (value: number) => {
    return formatValue(value, yAxis.decimals);
  };

  // Format X-axis (time)
  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    
    // Show date only at midnight or first/last point
    if (hours === 0) {
      return format(date, 'MMM d');
    }
    return format(date, 'HH:mm');
  };

  return (
    <div className="w-full h-full p-4">
      {title && (
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
      )}
      
      {processedData.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">No data available</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height - (title ? 60 : 20)}>
          <LineChart
            data={processedData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            {showGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
            )}
            
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              stroke="currentColor"
              style={{ fontSize: '12px' }}
              domain={['dataMin', 'dataMax']}
              type="number"
            />
            
            <YAxis
              tickFormatter={formatYAxis}
              stroke="currentColor"
              style={{ fontSize: '12px' }}
              label={yAxis.label ? {
                value: yAxis.label,
                angle: -90,
                position: 'insideLeft',
              } : undefined}
              domain={[
                yAxis.min !== undefined ? yAxis.min : 'auto',
                yAxis.max !== undefined ? yAxis.max : 'auto',
              ]}
            />
            
            {showTooltip && (
              <Tooltip content={<CustomTooltip />} />
            )}
            
            {showLegend && (
              <Legend />
            )}
            
            {/* Threshold areas */}
            {thresholds.map((threshold, idx) => {
              if (threshold.fillAbove || threshold.fillBelow) {
                return (
                  <ReferenceArea
                    key={`area-${idx}`}
                    y1={threshold.fillAbove ? threshold.value : undefined}
                    y2={threshold.fillBelow ? threshold.value : undefined}
                    fill={threshold.color}
                    fillOpacity={0.1}
                  />
                );
              }
              return null;
            })}
            
            {/* Threshold lines */}
            {thresholds.map((threshold, idx) => (
              <ReferenceLine
                key={`line-${idx}`}
                y={threshold.value}
                stroke={threshold.color}
                strokeDasharray="5 5"
                label={threshold.label}
              />
            ))}
            
            {/* Annotations */}
            {annotations.map((annotation, idx) => (
              <ReferenceLine
                key={`annotation-${idx}`}
                x={annotation.time}
                stroke={annotation.color || '#666'}
                strokeDasharray="3 3"
                label={{
                  value: annotation.text,
                  position: 'top',
                  style: { fontSize: '12px' },
                }}
              />
            ))}
            
            {/* Data series */}
            {seriesFields.map((seriesConfig) => (
              <Line
                key={seriesConfig.field}
                type="monotone"
                dataKey={seriesConfig.field}
                name={seriesConfig.displayName || seriesConfig.field}
                stroke={seriesConfig.color || getDefaultColor(seriesConfig.field)}
                strokeWidth={seriesConfig.lineWidth || 2}
                dot={seriesConfig.showPoints !== false ? { r: 2 } : false}
                strokeDasharray={
                  seriesConfig.lineStyle === 'dashed' ? '5 5' :
                  seriesConfig.lineStyle === 'dotted' ? '2 2' :
                  undefined
                }
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

// Helper functions
function getDefaultColor(field: string): string {
  const colors = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#f97316', // orange
    '#84cc16', // lime
  ];
  
  const index = field.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[index % colors.length];
}

function formatValue(value: number, decimals: number = 2): string {
  if (value === null || value === undefined) return 'N/A';
  
  if (Math.abs(value) >= 1e9) {
    return (value / 1e9).toFixed(decimals) + 'B';
  }
  if (Math.abs(value) >= 1e6) {
    return (value / 1e6).toFixed(decimals) + 'M';
  }
  if (Math.abs(value) >= 1e3) {
    return (value / 1e3).toFixed(decimals) + 'K';
  }
  
  return value.toFixed(decimals);
}

export default SimpleTimeSeriesPanel;