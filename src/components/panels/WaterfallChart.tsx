/**
 * Waterfall Chart Panel
 * Perfect for manufacturing cost analysis, variance analysis, and cumulative impact visualization
 * Shows how an initial value is affected by a series of positive or negative changes
 */

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';

export interface WaterfallDataPoint {
  category: string;
  value: number;
  type?: 'start' | 'positive' | 'negative' | 'total' | 'end';
  description?: string;
}

export interface WaterfallChartOptions {
  title?: string;
  startColor?: string;
  positiveColor?: string;
  negativeColor?: string;
  totalColor?: string;
  endColor?: string;
  connectorColor?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  showConnectors?: boolean;
  valueUnit?: string;
  formatValue?: (value: number) => string;
  showZeroLine?: boolean;
}

export interface WaterfallChartProps {
  data: WaterfallDataPoint[];
  options?: WaterfallChartOptions;
  width?: number;
  height?: number;
  loading?: boolean;
}

interface ProcessedDataPoint extends WaterfallDataPoint {
  stackBottom: number;
  stackTop: number;
  displayValue: number;
  cumulativeValue: number;
  isFloating: boolean;
}

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
  data = [],
  options = {},
  width,
  height = 400,
  loading = false
}) => {
  const {
    title = 'Waterfall Analysis',
    startColor = '#2196f3',
    positiveColor = '#4caf50',
    negativeColor = '#f44336',
    totalColor = '#ff9800',
    endColor = '#9c27b0',
    connectorColor = '#e0e0e0',
    backgroundColor = 'transparent',
    showGrid = true,
    showLegend = true,
    showConnectors = true,
    valueUnit = '',
    formatValue = (value: number) => value.toLocaleString(),
    showZeroLine = true
  } = options;

  // Process data for waterfall visualization
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const processed: ProcessedDataPoint[] = [];
    let runningTotal = 0;

    data.forEach((item, index) => {
      const type = item.type || (index === 0 ? 'start' : index === data.length - 1 ? 'end' : item.value >= 0 ? 'positive' : 'negative');
      
      let stackBottom = 0;
      let stackTop = 0;
      let displayValue = 0;
      let isFloating = false;

      if (type === 'start' || type === 'end' || type === 'total') {
        // Absolute values - start from zero
        stackBottom = 0;
        stackTop = Math.abs(item.value);
        displayValue = Math.abs(item.value);
        runningTotal = item.value;
      } else {
        // Incremental values - floating bars
        isFloating = true;
        if (item.value >= 0) {
          stackBottom = runningTotal;
          stackTop = runningTotal + item.value;
          displayValue = item.value;
        } else {
          stackBottom = runningTotal + item.value;
          stackTop = runningTotal;
          displayValue = Math.abs(item.value);
        }
        runningTotal += item.value;
      }

      processed.push({
        ...item,
        type,
        stackBottom,
        stackTop,
        displayValue,
        cumulativeValue: runningTotal,
        isFloating
      });
    });

    return processed;
  }, [data]);

  // Get color for each bar based on type
  const getBarColor = (item: ProcessedDataPoint) => {
    switch (item.type) {
      case 'start': return startColor;
      case 'positive': return positiveColor;
      case 'negative': return negativeColor;
      case 'total': return totalColor;
      case 'end': return endColor;
      default: return item.value >= 0 ? positiveColor : negativeColor;
    }
  };

  // Custom bar shape that can start from any Y position
  const CustomBar = (props: any) => {
    const { payload, x, y, width, height } = props;
    if (!payload) return null;

    const item = payload as ProcessedDataPoint;
    const color = getBarColor(item);
    
    // Calculate actual bar position and height
    const chartHeight = 300; // Approximate chart height
    const yScale = chartHeight / (Math.max(...processedData.map(d => Math.max(d.stackTop, Math.abs(d.stackBottom)))) * 1.1);
    
    const barHeight = Math.abs(item.displayValue) * yScale;
    const barY = item.isFloating 
      ? chartHeight - (item.stackTop * yScale)
      : chartHeight - barHeight;

    return (
      <g>
        <rect
          x={x}
          y={barY}
          width={width}
          height={barHeight}
          fill={color}
          stroke={color}
          strokeWidth={1}
          rx={2}
        />
        
        {/* Value label on top of bar */}
        <text
          x={x + width / 2}
          y={barY - 5}
          textAnchor="middle"
          fill="#333"
          fontSize="12"
          fontWeight="bold"
        >
          {item.value >= 0 ? '+' : ''}{formatValue(item.value)}
        </text>
      </g>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ProcessedDataPoint;
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-800">{label}</p>
          <p style={{ color: getBarColor(data) }}>
            {`Value: ${data.value >= 0 ? '+' : ''}${formatValue(data.value)}${valueUnit}`}
          </p>
          <p className="text-gray-600">
            {`Cumulative: ${formatValue(data.cumulativeValue)}${valueUnit}`}
          </p>
          {data.description && (
            <p className="text-gray-500 text-sm mt-1">{data.description}</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Connector lines between bars
  const ConnectorLines = () => {
    if (!showConnectors || processedData.length < 2) return null;

    return (
      <g>
        {processedData.slice(0, -1).map((item, index) => {
          const nextItem = processedData[index + 1];
          if (!nextItem || nextItem.type === 'total') return null;

          const x1 = (index + 0.8) * (800 / processedData.length); // Approximate positioning
          const x2 = (index + 1.2) * (800 / processedData.length);
          const y = 150; // Approximate Y position

          return (
            <line
              key={`connector-${index}`}
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke={connectorColor}
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          );
        })}
      </g>
    );
  };

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ width, height, backgroundColor }}
      >
        <div className="text-gray-500">Loading waterfall chart...</div>
      </div>
    );
  }

  if (!processedData || processedData.length === 0) {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ width, height, backgroundColor }}
      >
        <div className="text-gray-500">No data available for waterfall analysis</div>
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
          data={processedData}
          margin={{ top: 40, right: 30, left: 20, bottom: 60 }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          )}
          
          <XAxis 
            dataKey="category"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
          />
          
          <YAxis 
            tickFormatter={formatValue}
            domain={['dataMin - 100', 'dataMax + 100']}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {showLegend && (
            <Legend 
              payload={[
                { value: 'Starting Value', type: 'rect', color: startColor },
                { value: 'Positive Impact', type: 'rect', color: positiveColor },
                { value: 'Negative Impact', type: 'rect', color: negativeColor },
                { value: 'Total/Subtotal', type: 'rect', color: totalColor },
                { value: 'Ending Value', type: 'rect', color: endColor }
              ]}
            />
          )}
          
          {showZeroLine && (
            <ReferenceLine y={0} stroke="#666" strokeDasharray="2 2" />
          )}
          
          {/* Main bars */}
          <Bar
            dataKey="displayValue"
            fill="#8884d8"
            shape={<CustomBar />}
          >
            {processedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
            ))}
          </Bar>
          
          {/* Connector lines overlay */}
          <ConnectorLines />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Manufacturing cost waterfall presets
export const manufacturingCostWaterfall = (
  baselineCost: number,
  materialVariance: number,
  laborVariance: number,
  overheadVariance: number,
  qualityVariance: number
): WaterfallDataPoint[] => [
  {
    category: 'Baseline Cost',
    value: baselineCost,
    type: 'start',
    description: 'Standard manufacturing cost'
  },
  {
    category: 'Material Variance',
    value: materialVariance,
    type: materialVariance >= 0 ? 'positive' : 'negative',
    description: 'Raw material cost impact'
  },
  {
    category: 'Labor Variance',
    value: laborVariance,
    type: laborVariance >= 0 ? 'positive' : 'negative',
    description: 'Direct labor cost impact'
  },
  {
    category: 'Overhead Variance',
    value: overheadVariance,
    type: overheadVariance >= 0 ? 'positive' : 'negative',
    description: 'Manufacturing overhead impact'
  },
  {
    category: 'Quality Variance',
    value: qualityVariance,
    type: qualityVariance >= 0 ? 'positive' : 'negative',
    description: 'Quality-related cost impact'
  },
  {
    category: 'Actual Cost',
    value: baselineCost + materialVariance + laborVariance + overheadVariance + qualityVariance,
    type: 'end',
    description: 'Final manufacturing cost'
  }
];

// OEE performance waterfall
export const oeePerformanceWaterfall = (
  plannedOEE: number,
  availabilityLoss: number,
  performanceLoss: number,
  qualityLoss: number
): WaterfallDataPoint[] => [
  {
    category: 'Planned OEE',
    value: plannedOEE,
    type: 'start',
    description: 'Target OEE performance'
  },
  {
    category: 'Availability Loss',
    value: -availabilityLoss,
    type: 'negative',
    description: 'Downtime and stoppages'
  },
  {
    category: 'Performance Loss',
    value: -performanceLoss,
    type: 'negative',
    description: 'Speed and efficiency losses'
  },
  {
    category: 'Quality Loss',
    value: -qualityLoss,
    type: 'negative',
    description: 'Defects and rework'
  },
  {
    category: 'Actual OEE',
    value: plannedOEE - availabilityLoss - performanceLoss - qualityLoss,
    type: 'end',
    description: 'Realized OEE performance'
  }
];

// Sample data generators
export const generateSampleWaterfallData = (type: 'cost' | 'oee' | 'production' = 'cost'): WaterfallDataPoint[] => {
  switch (type) {
    case 'oee':
      return oeePerformanceWaterfall(85, 8, 12, 5);
    
    case 'production':
      return [
        { category: 'Planned Production', value: 1000, type: 'start' },
        { category: 'Equipment Issues', value: -50, type: 'negative' },
        { category: 'Material Shortage', value: -30, type: 'negative' },
        { category: 'Overtime Recovery', value: 25, type: 'positive' },
        { category: 'Quality Rejects', value: -15, type: 'negative' },
        { category: 'Actual Production', value: 930, type: 'end' }
      ];
    
    case 'cost':
    default:
      return manufacturingCostWaterfall(100000, 5000, -3000, 2000, -1500);
  }
};

export default WaterfallChart;