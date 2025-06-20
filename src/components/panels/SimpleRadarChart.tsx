/**
 * Simple Radar Chart Panel
 * Perfect for multi-dimensional performance analysis and equipment health monitoring
 */

import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';

export interface RadarDataPoint {
  subject: string;
  value: number;
  fullMark?: number;
  category?: string;
}

export interface RadarSeries {
  dataKey: string;
  stroke: string;
  fill: string;
  fillOpacity?: number;
  name: string;
}

export interface SimpleRadarChartOptions {
  title?: string;
  backgroundColor?: string;
  showLegend?: boolean;
  series: RadarSeries[];
  gridType?: 'polygon' | 'circle';
  tickCount?: number;
  angleAxisTick?: boolean;
  radiusAxisTick?: boolean;
  formatValue?: (value: number) => string;
}

export interface SimpleRadarChartProps {
  data: RadarDataPoint[];
  options: SimpleRadarChartOptions;
  width?: number;
  height?: number;
  loading?: boolean;
}

export const SimpleRadarChart: React.FC<SimpleRadarChartProps> = ({
  data = [],
  options,
  width,
  height = 400,
  loading = false
}) => {
  const {
    title = 'Radar Chart',
    backgroundColor = 'transparent',
    showLegend = true,
    series,
    gridType = 'polygon',
    tickCount = 5,
    angleAxisTick = true,
    radiusAxisTick = false,
    formatValue = (value: number) => value.toFixed(1)
  } = options;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${formatValue(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ width, height, backgroundColor }}
      >
        <div className="text-gray-500">Loading radar chart...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ width, height, backgroundColor }}
      >
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  return (
    <div style={{ width, height, backgroundColor }}>
      {title && (
        <h3 className="text-lg font-semibold mb-2 text-center">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height="90%">
        <RadarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
          <PolarGrid gridType={gridType} />
          
          <PolarAngleAxis 
            dataKey="subject" 
            tick={angleAxisTick}
            className="text-sm"
          />
          
          <PolarRadiusAxis
            angle={90}
            domain={[0, 'dataMax']}
            tick={radiusAxisTick}
            tickCount={tickCount}
            tickFormatter={formatValue}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {showLegend && <Legend />}
          
          {series.map((seriesItem, index) => (
            <Radar
              key={seriesItem.dataKey}
              name={seriesItem.name}
              dataKey={seriesItem.dataKey}
              stroke={seriesItem.stroke}
              fill={seriesItem.fill}
              fillOpacity={seriesItem.fillOpacity || 0.3}
              strokeWidth={2}
              dot={{ r: 4, fill: seriesItem.stroke }}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Equipment health monitoring preset
export const equipmentHealthSeries: RadarSeries[] = [
  {
    dataKey: 'current',
    stroke: '#8884d8',
    fill: '#8884d8',
    fillOpacity: 0.3,
    name: 'Current Performance'
  },
  {
    dataKey: 'target',
    stroke: '#82ca9d',
    fill: '#82ca9d',
    fillOpacity: 0.1,
    name: 'Target Performance'
  }
];

export const equipmentHealthData = [
  { subject: 'Availability', current: 85, target: 90, fullMark: 100 },
  { subject: 'Performance', current: 78, target: 85, fullMark: 100 },
  { subject: 'Quality', current: 92, target: 95, fullMark: 100 },
  { subject: 'Efficiency', current: 75, target: 80, fullMark: 100 },
  { subject: 'Reliability', current: 88, target: 90, fullMark: 100 },
  { subject: 'Maintainability', current: 70, target: 85, fullMark: 100 }
];

// Quality metrics preset
export const qualityMetricsSeries: RadarSeries[] = [
  {
    dataKey: 'actual',
    stroke: '#ff7c7c',
    fill: '#ff7c7c',
    fillOpacity: 0.4,
    name: 'Actual Performance'
  }
];

export const qualityMetricsData = [
  { subject: 'Defect Rate', actual: 15, fullMark: 100 }, // Lower is better, inverted scale
  { subject: 'First Pass Yield', actual: 94, fullMark: 100 },
  { subject: 'Customer Satisfaction', actual: 87, fullMark: 100 },
  { subject: 'On-Time Delivery', actual: 92, fullMark: 100 },
  { subject: 'Process Capability', actual: 89, fullMark: 100 },
  { subject: 'Supplier Quality', actual: 85, fullMark: 100 }
];

export default SimpleRadarChart;