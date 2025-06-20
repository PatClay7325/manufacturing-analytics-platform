/**
 * Positive and Negative Bar Chart Panel
 * Perfect for variance analysis, profit/loss tracking, and above/below target comparisons
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
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts';

export interface PosNegBarDataPoint {
  category: string;
  value: number;
  target?: number;
  variance?: number;
  description?: string;
}

export interface PositiveAndNegativeBarChartOptions {
  title?: string;
  positiveColor?: string;
  negativeColor?: string;
  neutralColor?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  showZeroLine?: boolean;
  showTargetLine?: boolean;
  valueUnit?: string;
  formatValue?: (value: number) => string;
  layout?: 'horizontal' | 'vertical';
  barSize?: number;
}

export interface PositiveAndNegativeBarChartProps {
  data: PosNegBarDataPoint[];
  options?: PositiveAndNegativeBarChartOptions;
  width?: number;
  height?: number;
  loading?: boolean;
}

export const PositiveAndNegativeBarChart: React.FC<PositiveAndNegativeBarChartProps> = ({
  data = [],
  options = {},
  width,
  height = 400,
  loading = false
}) => {
  const {
    title = 'Variance Analysis',
    positiveColor = '#4caf50',
    negativeColor = '#f44336',
    neutralColor = '#9e9e9e',
    backgroundColor = 'transparent',
    showGrid = true,
    showLegend = true,
    showZeroLine = true,
    showTargetLine = false,
    valueUnit = '',
    formatValue = (value: number) => value.toFixed(1),
    layout = 'vertical',
    barSize = 40
  } = options;

  // Process data to calculate variance if target is provided
  const processedData = React.useMemo(() => {
    return data.map(item => ({
      ...item,
      variance: item.target !== undefined ? item.value - item.target : item.value,
      displayValue: item.variance !== undefined ? item.variance : item.value
    }));
  }, [data]);

  // Get bar color based on value
  const getBarColor = (value: number): string => {
    if (value > 0) return positiveColor;
    if (value < 0) return negativeColor;
    return neutralColor;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-800 mb-2">{label}</p>
          <p style={{ color: getBarColor(data.displayValue) }}>
            {`Value: ${formatValue(data.value)}${valueUnit}`}
          </p>
          {data.target !== undefined && (
            <>
              <p className="text-gray-600">
                {`Target: ${formatValue(data.target)}${valueUnit}`}
              </p>
              <p style={{ color: getBarColor(data.variance) }}>
                {`Variance: ${data.variance >= 0 ? '+' : ''}${formatValue(data.variance)}${valueUnit}`}
              </p>
            </>
          )}
          {data.description && (
            <p className="text-gray-500 text-sm mt-1">{data.description}</p>
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
        <div className="text-gray-500">Loading bar chart...</div>
      </div>
    );
  }

  if (!processedData || processedData.length === 0) {
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
          data={processedData}
          margin={{ top: 20, right: 30, left: 60, bottom: 20 }}
          barSize={barSize}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          )}
          
          {layout === 'vertical' ? (
            <>
              <XAxis 
                type="number" 
                tickFormatter={formatValue}
                domain={['dataMin', 'dataMax']}
              />
              <YAxis 
                dataKey="category" 
                type="category" 
                width={120}
              />
            </>
          ) : (
            <>
              <XAxis 
                dataKey="category"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tickFormatter={formatValue}
                domain={['dataMin', 'dataMax']}
              />
            </>
          )}
          
          <Tooltip content={<CustomTooltip />} />
          
          {showLegend && (
            <Legend 
              payload={[
                { value: 'Above Target/Positive', type: 'rect', color: positiveColor },
                { value: 'Below Target/Negative', type: 'rect', color: negativeColor },
                { value: 'At Target/Neutral', type: 'rect', color: neutralColor }
              ]}
            />
          )}
          
          {showZeroLine && (
            <ReferenceLine 
              {...(layout === 'vertical' ? { x: 0 } : { y: 0 })}
              stroke="#666" 
              strokeDasharray="2 2" 
            />
          )}
          
          <Bar
            dataKey="displayValue"
            name={`Value${valueUnit ? ` (${valueUnit})` : ''}`}
            radius={layout === 'vertical' ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          >
            {processedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getBarColor(entry.displayValue)} 
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Manufacturing variance analysis presets
export const generateVarianceData = (
  type: 'production' | 'quality' | 'cost' | 'efficiency'
): PosNegBarDataPoint[] => {
  switch (type) {
    case 'production':
      return [
        { category: 'Line A', value: 1050, target: 1000, description: 'Assembly Line A' },
        { category: 'Line B', value: 980, target: 1000, description: 'Assembly Line B' },
        { category: 'Line C', value: 1020, target: 1000, description: 'Assembly Line C' },
        { category: 'Line D', value: 960, target: 1000, description: 'Assembly Line D' },
        { category: 'Line E', value: 1080, target: 1000, description: 'Assembly Line E' }
      ];
    
    case 'quality':
      return [
        { category: 'Defect Rate', value: 2.1, target: 2.5, description: 'Lower is better' },
        { category: 'First Pass Yield', value: 96.5, target: 95.0, description: 'Higher is better' },
        { category: 'Rework Rate', value: 1.8, target: 2.0, description: 'Lower is better' },
        { category: 'Customer Returns', value: 0.8, target: 1.0, description: 'Lower is better' }
      ];
    
    case 'cost':
      return [
        { category: 'Material Cost', value: 15000, target: 16000, description: 'Cost savings' },
        { category: 'Labor Cost', value: 18500, target: 18000, description: 'Cost overrun' },
        { category: 'Energy Cost', value: 5200, target: 5500, description: 'Cost savings' },
        { category: 'Maintenance', value: 3800, target: 3500, description: 'Cost overrun' }
      ];
    
    case 'efficiency':
    default:
      return [
        { category: 'OEE', value: 78.5, target: 75.0, description: 'Overall Equipment Effectiveness' },
        { category: 'Throughput', value: 920, target: 950, description: 'Parts per hour' },
        { category: 'Cycle Time', value: 3.8, target: 4.0, description: 'Minutes per part' },
        { category: 'Setup Time', value: 25, target: 30, description: 'Minutes per changeover' }
      ];
  }
};

export default PositiveAndNegativeBarChart;