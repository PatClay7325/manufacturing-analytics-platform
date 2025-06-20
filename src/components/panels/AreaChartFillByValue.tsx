/**
 * Area Chart with Fill by Value
 * Dynamically colors the area based on value thresholds - perfect for process monitoring
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
  ResponsiveContainer,
  defs,
  linearGradient,
  stop
} from 'recharts';

export interface AreaFillDataPoint {
  timestamp: string;
  value: number;
  category?: string;
}

export interface FillThreshold {
  min: number;
  max: number;
  color: string;
  label: string;
}

export interface AreaChartFillByValueOptions {
  title?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  thresholds: FillThreshold[];
  valueUnit?: string;
  formatValue?: (value: number) => string;
  strokeWidth?: number;
  strokeColor?: string;
}

export interface AreaChartFillByValueProps {
  data: AreaFillDataPoint[];
  options: AreaChartFillByValueOptions;
  width?: number;
  height?: number;
  loading?: boolean;
}

export const AreaChartFillByValue: React.FC<AreaChartFillByValueProps> = ({
  data = [],
  options,
  width,
  height = 400,
  loading = false
}) => {
  const {
    title = 'Value-Based Fill Chart',
    backgroundColor = 'transparent',
    showGrid = true,
    showLegend = true,
    thresholds,
    valueUnit = '',
    formatValue = (value: number) => value.toFixed(1),
    strokeWidth = 2,
    strokeColor = '#333'
  } = options;

  // Get fill color based on value
  const getFillColor = (value: number): string => {
    for (const threshold of thresholds) {
      if (value >= threshold.min && value <= threshold.max) {
        return threshold.color;
      }
    }
    return thresholds[0]?.color || '#cccccc';
  };

  // Create gradient definitions for smooth color transitions
  const createGradients = () => {
    return thresholds.map((threshold, index) => (
      <linearGradient key={`gradient-${index}`} id={`fill-${index}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={threshold.color} stopOpacity={0.8}/>
        <stop offset="95%" stopColor={threshold.color} stopOpacity={0.1}/>
      </linearGradient>
    ));
  };

  // Process data to include fill information
  const processedData = React.useMemo(() => {
    return data.map(item => ({
      ...item,
      fillColor: getFillColor(item.value),
      fillIndex: thresholds.findIndex(t => item.value >= t.min && item.value <= t.max)
    }));
  }, [data, thresholds]);

  // Custom area component that changes color based on value
  const CustomArea = (props: any) => {
    const { payload } = props;
    if (!payload || !payload.fillIndex !== undefined) return null;
    
    return (
      <Area
        {...props}
        fill={`url(#fill-${payload.fillIndex >= 0 ? payload.fillIndex : 0})`}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const threshold = thresholds.find(t => data.value >= t.min && data.value <= t.max);
      
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-800">{`Time: ${label}`}</p>
          <p style={{ color: data.fillColor }}>
            {`Value: ${formatValue(data.value)}${valueUnit}`}
          </p>
          {threshold && (
            <p className="text-gray-600 text-sm">
              {`Range: ${threshold.label}`}
            </p>
          )}
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
        <div className="text-gray-500">Loading area chart...</div>
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
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <defs>
            {createGradients()}
          </defs>
          
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          )}
          
          <XAxis dataKey="timestamp" />
          <YAxis tickFormatter={formatValue} />
          
          <Tooltip content={<CustomTooltip />} />
          
          {showLegend && (
            <Legend 
              payload={thresholds.map(t => ({
                value: t.label,
                type: 'rect',
                color: t.color
              }))}
            />
          )}
          
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="url(#fill-0)"
            name={`Value${valueUnit ? ` (${valueUnit})` : ''}`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Temperature monitoring thresholds
export const temperatureThresholds: FillThreshold[] = [
  { min: 0, max: 70, color: '#2196f3', label: 'Cold' },
  { min: 70, max: 85, color: '#4caf50', label: 'Normal' },
  { min: 85, max: 95, color: '#ff9800', label: 'Warning' },
  { min: 95, max: 150, color: '#f44336', label: 'Critical' }
];

// Quality score thresholds
export const qualityThresholds: FillThreshold[] = [
  { min: 0, max: 60, color: '#f44336', label: 'Poor' },
  { min: 60, max: 80, color: '#ff9800', label: 'Fair' },
  { min: 80, max: 95, color: '#4caf50', label: 'Good' },
  { min: 95, max: 100, color: '#2196f3', label: 'Excellent' }
];

export default AreaChartFillByValue;