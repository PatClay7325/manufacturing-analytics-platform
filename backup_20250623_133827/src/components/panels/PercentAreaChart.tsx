/**
 * Percent Area Chart Panel
 * Shows percentage composition over time - perfect for OEE breakdown analysis
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

export interface PercentAreaDataPoint {
  timestamp: string;
  [key: string]: string | number;
}

export interface PercentAreaSeries {
  dataKey: string;
  fill: string;
  name: string;
}

export interface PercentAreaChartOptions {
  title?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  series: PercentAreaSeries[];
  formatPercent?: (value: number) => string;
  strokeWidth?: number;
}

export interface PercentAreaChartProps {
  data: PercentAreaDataPoint[];
  options: PercentAreaChartOptions;
  width?: number;
  height?: number;
  loading?: boolean;
}

export const PercentAreaChart: React.FC<PercentAreaChartProps> = ({
  data = [],
  options,
  width,
  height = 400,
  loading = false
}) => {
  const {
    title = 'Percent Area Chart',
    backgroundColor = 'transparent',
    showGrid = true,
    showLegend = true,
    series,
    formatPercent = (value: number) => `${value.toFixed(1)}%`,
    strokeWidth = 1
  } = options;

  // Convert data to percentages
  const processedData = React.useMemo(() => {
    return data.map(item => {
      const total = series.reduce((sum, s) => {
        const value = item[s.dataKey] as number;
        return sum + (value || 0);
      }, 0);

      const percentageItem: any = { timestamp: item.timestamp };
      
      if (total > 0) {
        series.forEach(s => {
          const value = item[s.dataKey] as number;
          percentageItem[s.dataKey] = (value / total) * 100;
        });
      } else {
        series.forEach(s => {
          percentageItem[s.dataKey] = 0;
        });
      }

      return percentageItem;
    });
  }, [data, series]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{`Time: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${formatPercent(entry.value)}`}
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
        <div className="text-gray-500">Loading percent area chart...</div>
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
          data={processedData}
          stackOffset="expand"
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          )}
          
          <XAxis dataKey="timestamp" />
          <YAxis 
            tickFormatter={(value) => `${value}%`}
            domain={[0, 100]}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {showLegend && <Legend />}
          
          {series.map((seriesItem, index) => (
            <Area
              key={seriesItem.dataKey}
              type="monotone"
              dataKey={seriesItem.dataKey}
              stackId="1"
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

// OEE breakdown preset
export const oeeBreakdownSeries: PercentAreaSeries[] = [
  { dataKey: 'productiveTime', fill: '#4caf50', name: 'Productive Time' },
  { dataKey: 'plannedDowntime', fill: '#2196f3', name: 'Planned Downtime' },
  { dataKey: 'unplannedDowntime', fill: '#f44336', name: 'Unplanned Downtime' },
  { dataKey: 'qualityLoss', fill: '#ff9800', name: 'Quality Loss' }
];

export default PercentAreaChart;