/**
 * Stacked Bar Chart Panel
 * Perfect for comparing composition across different categories in manufacturing
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export interface StackedBarDataPoint {
  category: string;
  [key: string]: string | number;
}

export interface StackedBarSeries {
  dataKey: string;
  fill: string;
  name: string;
  stackId?: string;
}

export interface StackedBarChartOptions {
  title?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  series: StackedBarSeries[];
  valueUnit?: string;
  formatValue?: (value: number) => string;
  layout?: 'horizontal' | 'vertical';
  barCategoryGap?: string | number;
}

export interface StackedBarChartProps {
  data: StackedBarDataPoint[];
  options: StackedBarChartOptions;
  width?: number;
  height?: number;
  loading?: boolean;
}

export const StackedBarChart: React.FC<StackedBarChartProps> = ({
  data = [],
  options,
  width,
  height = 400,
  loading = false
}) => {
  const {
    title = 'Stacked Bar Chart',
    backgroundColor = 'transparent',
    showGrid = true,
    showLegend = true,
    series,
    valueUnit = '',
    formatValue = (value: number) => value.toFixed(0),
    layout = 'vertical',
    barCategoryGap = '20%'
  } = options;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{`${label}`}</p>
          <p className="font-medium text-gray-700 mb-1">
            {`Total: ${formatValue(total)}${valueUnit}`}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${formatValue(entry.value)}${valueUnit} (${((entry.value / total) * 100).toFixed(1)}%)`}
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
        <div className="text-gray-500">Loading stacked bar chart...</div>
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
        <BarChart
          layout={layout}
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          barCategoryGap={barCategoryGap}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          )}
          
          {layout === 'vertical' ? (
            <>
              <XAxis type="number" tickFormatter={formatValue} />
              <YAxis dataKey="category" type="category" width={100} />
            </>
          ) : (
            <>
              <XAxis dataKey="category" />
              <YAxis tickFormatter={formatValue} />
            </>
          )}
          
          <Tooltip content={<CustomTooltip />} />
          
          {showLegend && <Legend />}
          
          {series.map((seriesItem, index) => (
            <Bar
              key={seriesItem.dataKey}
              dataKey={seriesItem.dataKey}
              stackId={seriesItem.stackId || "1"}
              fill={seriesItem.fill}
              name={seriesItem.name}
              radius={index === series.length - 1 ? [0, 4, 4, 0] : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Manufacturing shift performance preset
export const shiftPerformanceSeries: StackedBarSeries[] = [
  { dataKey: 'goodParts', fill: '#4caf50', name: 'Good Parts', stackId: '1' },
  { dataKey: 'reworkParts', fill: '#ff9800', name: 'Rework', stackId: '1' },
  { dataKey: 'scrapParts', fill: '#f44336', name: 'Scrap', stackId: '1' }
];

// Equipment utilization preset
export const equipmentUtilizationSeries: StackedBarSeries[] = [
  { dataKey: 'productiveTime', fill: '#4caf50', name: 'Productive', stackId: '1' },
  { dataKey: 'setupTime', fill: '#2196f3', name: 'Setup', stackId: '1' },
  { dataKey: 'maintenanceTime', fill: '#ff9800', name: 'Maintenance', stackId: '1' },
  { dataKey: 'idleTime', fill: '#9e9e9e', name: 'Idle', stackId: '1' },
  { dataKey: 'downTime', fill: '#f44336', name: 'Down', stackId: '1' }
];

// Cost breakdown preset
export const costBreakdownSeries: StackedBarSeries[] = [
  { dataKey: 'materialCost', fill: '#3f51b5', name: 'Materials', stackId: '1' },
  { dataKey: 'laborCost', fill: '#009688', name: 'Labor', stackId: '1' },
  { dataKey: 'overheadCost', fill: '#ff5722', name: 'Overhead', stackId: '1' },
  { dataKey: 'qualityCost', fill: '#795548', name: 'Quality', stackId: '1' }
];

export default StackedBarChart;