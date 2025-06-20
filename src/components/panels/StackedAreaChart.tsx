/**
 * Stacked Area Chart Panel
 * Perfect for showing composition and trends over time in manufacturing data
 */

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export interface StackedAreaDataPoint {
  timestamp: string;
  [key: string]: string | number;
}

export interface StackedAreaSeries {
  dataKey: string;
  stackId: string;
  fill: string;
  name: string;
}

export interface StackedAreaChartOptions {
  title?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  series: StackedAreaSeries[];
  valueUnit?: string;
  formatValue?: (value: number) => string;
  strokeWidth?: number;
}

export interface StackedAreaChartProps {
  data: StackedAreaDataPoint[];
  options: StackedAreaChartOptions;
  width?: number;
  height?: number;
  loading?: boolean;
}

export const StackedAreaChart: React.FC<StackedAreaChartProps> = ({
  data = [],
  options,
  width,
  height = 400,
  loading = false
}) => {
  const {
    title = 'Stacked Area Chart',
    backgroundColor = 'transparent',
    showGrid = true,
    showLegend = true,
    series,
    valueUnit = '',
    formatValue = (value: number) => value.toFixed(1),
    strokeWidth = 1
  } = options;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{`Time: ${label}`}</p>
          <p className="font-medium text-gray-700 mb-1">
            {`Total: ${formatValue(total)}${valueUnit}`}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${formatValue(entry.value)}${valueUnit}`}
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
        <div className="text-gray-500">Loading stacked area chart...</div>
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
        <AreaChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          )}
          
          <XAxis dataKey="timestamp" />
          <YAxis tickFormatter={formatValue} />
          
          <Tooltip content={<CustomTooltip />} />
          
          {showLegend && <Legend />}
          
          {series.map((seriesItem, index) => (
            <Area
              key={seriesItem.dataKey}
              type="monotone"
              dataKey={seriesItem.dataKey}
              stackId={seriesItem.stackId}
              stroke={seriesItem.fill}
              fill={seriesItem.fill}
              name={seriesItem.name}
              strokeWidth={strokeWidth}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Manufacturing production breakdown preset
export const productionBreakdownSeries: StackedAreaSeries[] = [
  { dataKey: 'goodParts', stackId: '1', fill: '#4caf50', name: 'Good Parts' },
  { dataKey: 'reworkParts', stackId: '1', fill: '#ff9800', name: 'Rework' },
  { dataKey: 'scrapParts', stackId: '1', fill: '#f44336', name: 'Scrap' }
];

export const energyConsumptionSeries: StackedAreaSeries[] = [
  { dataKey: 'production', stackId: '1', fill: '#2196f3', name: 'Production' },
  { dataKey: 'hvac', stackId: '1', fill: '#9c27b0', name: 'HVAC' },
  { dataKey: 'lighting', stackId: '1', fill: '#ff9800', name: 'Lighting' },
  { dataKey: 'auxiliary', stackId: '1', fill: '#607d8b', name: 'Auxiliary' }
];

export default StackedAreaChart;