/**
 * Candlestick Chart Panel - OHLC Data Visualization
 * Perfect for process parameter analysis, quality trends, and performance metrics
 * Uses React and custom SVG rendering for optimal performance
 */

import React, { useMemo } from 'react';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export interface CandlestickDataPoint {
  timestamp: string | Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  category?: string;
}

export interface CandlestickChartOptions {
  title?: string;
  bullishColor?: string;
  bearishColor?: string;
  wickColor?: string;
  gridColor?: string;
  backgroundColor?: string;
  showGrid?: boolean;
  showVolume?: boolean;
  candleWidth?: number;
  valueUnit?: string;
  formatValue?: (value: number) => string;
  formatTimestamp?: (timestamp: string | Date) => string;
}

export interface CandlestickChartPanelProps {
  data: CandlestickDataPoint[];
  options?: CandlestickChartOptions;
  width?: number;
  height?: number;
  loading?: boolean;
}

interface CandlestickProps {
  x: number;
  y: number;
  width: number;
  height: number;
  open: number;
  close: number;
  high: number;
  low: number;
  bullishColor: string;
  bearishColor: string;
  wickColor: string;
}

const Candlestick: React.FC<CandlestickProps> = ({
  x,
  y,
  width,
  height,
  open,
  close,
  high,
  low,
  bullishColor,
  bearishColor,
  wickColor
}) => {
  const isBullish = close >= open;
  const bodyColor = isBullish ? bullishColor : bearishColor;
  
  // Calculate positions
  const bodyTop = Math.max(open, close);
  const bodyBottom = Math.min(open, close);
  const bodyHeight = Math.abs(close - open);
  
  // Scale values to chart coordinates (simplified - in real implementation would use chart scales)
  const scaleY = (value: number) => {
    const range = high - low;
    const normalizedValue = (high - value) / range;
    return y + normalizedValue * height;
  };
  
  const wickX = x + width / 2;
  const bodyX = x + width * 0.2;
  const bodyWidth = width * 0.6;

  return (
    <g>
      {/* Upper wick */}
      <line
        x1={wickX}
        y1={scaleY(high)}
        x2={wickX}
        y2={scaleY(bodyTop)}
        stroke={wickColor}
        strokeWidth={1}
      />
      
      {/* Lower wick */}
      <line
        x1={wickX}
        y1={scaleY(bodyBottom)}
        x2={wickX}
        y2={scaleY(low)}
        stroke={wickColor}
        strokeWidth={1}
      />
      
      {/* Body */}
      <rect
        x={bodyX}
        y={scaleY(bodyTop)}
        width={bodyWidth}
        height={Math.max(scaleY(bodyBottom) - scaleY(bodyTop), 1)}
        fill={bodyHeight === 0 ? wickColor : bodyColor}
        stroke={bodyColor}
        strokeWidth={1}
      />
      
      {/* Doji line (when open equals close) */}
      {bodyHeight === 0 && (
        <line
          x1={bodyX}
          y1={scaleY(open)}
          x2={bodyX + bodyWidth}
          y2={scaleY(close)}
          stroke={wickColor}
          strokeWidth={2}
        />
      )}
    </g>
  );
};

export const CandlestickChartPanel: React.FC<CandlestickChartPanelProps> = ({
  data = [],
  options = {},
  width,
  height = 400,
  loading = false
}) => {
  const {
    title = 'Process Parameter Analysis',
    bullishColor = '#4caf50',
    bearishColor = '#f44336',
    wickColor = '#666666',
    gridColor = '#e0e0e0',
    backgroundColor = 'transparent',
    showGrid = true,
    showVolume = false,
    candleWidth = 8,
    valueUnit = '',
    formatValue = (value: number) => value.toFixed(2),
    formatTimestamp = (timestamp: string | Date) => {
      const date = new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString().slice(0, 5);
    }
  } = options;

  // Process and validate data
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data
      .filter(d => d.open !== undefined && d.high !== undefined && d.low !== undefined && d.close !== undefined)
      .map(d => ({
        ...d,
        timestamp: typeof d.timestamp === 'string' ? new Date(d.timestamp) : d.timestamp
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [data]);

  // Calculate value range for scaling
  const { minValue, maxValue } = useMemo(() => {
    if (processedData.length === 0) return { minValue: 0, maxValue: 100 };
    
    const allValues = processedData.flatMap(d => [d.open, d.high, d.low, d.close]);
    return {
      minValue: Math.min(...allValues),
      maxValue: Math.max(...allValues)
    };
  }, [processedData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 rounded-lg p-3 shadow-lg">
          <p className="font-semibold text-gray-800">
            {`Time: ${formatTimestamp(data.timestamp)}`}
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p className="text-green-600">Open: {formatValue(data.open)}{valueUnit}</p>
            <p className="text-blue-600">High: {formatValue(data.high)}{valueUnit}</p>
            <p className="text-red-600">Low: {formatValue(data.low)}{valueUnit}</p>
            <p className="text-purple-600">Close: {formatValue(data.close)}{valueUnit}</p>
          </div>
          {data.volume && (
            <p className="text-gray-600 text-sm mt-1">
              Volume: {data.volume.toLocaleString()}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom candlestick chart component
  const CandlestickChart = ({ data }: { data: CandlestickDataPoint[] }) => {
    const chartWidth = width || 800;
    const chartHeight = height - 100; // Leave space for title and axes
    const padding = { top: 20, right: 30, bottom: 40, left: 60 };
    
    const plotWidth = chartWidth - padding.left - padding.right;
    const plotHeight = chartHeight - padding.top - padding.bottom;
    
    const candleSpacing = plotWidth / data.length;
    const actualCandleWidth = Math.min(candleWidth, candleSpacing * 0.8);

    return (
      <svg width={chartWidth} height={chartHeight}>
        {showGrid && (
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke={gridColor} strokeWidth="1"/>
            </pattern>
          </defs>
        )}
        
        {showGrid && (
          <rect
            x={padding.left}
            y={padding.top}
            width={plotWidth}
            height={plotHeight}
            fill="url(#grid)"
          />
        )}
        
        {data.map((candle, index) => {
          const x = padding.left + index * candleSpacing + (candleSpacing - actualCandleWidth) / 2;
          
          return (
            <Candlestick
              key={index}
              x={x}
              y={padding.top}
              width={actualCandleWidth}
              height={plotHeight}
              open={candle.open}
              close={candle.close}
              high={candle.high}
              low={candle.low}
              bullishColor={bullishColor}
              bearishColor={bearishColor}
              wickColor={wickColor}
            />
          );
        })}
        
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const value = minValue + (maxValue - minValue) * (1 - ratio);
          const y = padding.top + ratio * plotHeight;
          
          return (
            <g key={ratio}>
              <line
                x1={padding.left - 5}
                y1={y}
                x2={padding.left}
                y2={y}
                stroke="#666"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#666"
              >
                {formatValue(value)}
              </text>
            </g>
          );
        })}
        
        {/* X-axis labels */}
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((candle, index) => {
          const actualIndex = index * Math.ceil(data.length / 6);
          const x = padding.left + actualIndex * candleSpacing + candleSpacing / 2;
          
          return (
            <text
              key={actualIndex}
              x={x}
              y={chartHeight - 10}
              textAnchor="middle"
              fontSize="12"
              fill="#666"
            >
              {formatTimestamp(candle.timestamp).split(' ')[0]}
            </text>
          );
        })}
      </svg>
    );
  };

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ width, height, backgroundColor }}
      >
        <div className="text-gray-500">Loading candlestick chart...</div>
      </div>
    );
  }

  if (!processedData || processedData.length === 0) {
    return (
      <div 
        className="flex items-center justify-center"
        style={{ width, height, backgroundColor }}
      >
        <div className="text-gray-500">No OHLC data available</div>
      </div>
    );
  }

  return (
    <div style={{ width, height, backgroundColor }}>
      {title && (
        <h3 className="text-lg font-semibold mb-2 text-center">{title}</h3>
      )}
      
      <div className="relative">
        <CandlestickChart data={processedData} />
        
        {/* Tooltip overlay */}
        <div className="absolute inset-0 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <div>
              <Tooltip content={<CustomTooltip />} />
            </div>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex justify-center mt-2 space-x-4 text-sm">
        <div className="flex items-center">
          <div 
            className="w-4 h-4 mr-1" 
            style={{ backgroundColor: bullishColor }}
          />
          <span>Increasing</span>
        </div>
        <div className="flex items-center">
          <div 
            className="w-4 h-4 mr-1" 
            style={{ backgroundColor: bearishColor }}
          />
          <span>Decreasing</span>
        </div>
      </div>
    </div>
  );
};

// Manufacturing-specific candlestick configurations
export const manufacturingCandlestickConfigs = {
  temperatureAnalysis: {
    title: 'Temperature Process Control',
    bullishColor: '#ff6b6b',
    bearishColor: '#4ecdc4',
    valueUnit: '°C',
    formatValue: (value: number) => value.toFixed(1)
  },
  
  pressureAnalysis: {
    title: 'Pressure Parameter Tracking',
    bullishColor: '#ffa726',
    bearishColor: '#66bb6a',
    valueUnit: ' bar',
    formatValue: (value: number) => value.toFixed(2)
  },
  
  vibrationAnalysis: {
    title: 'Vibration Monitoring',
    bullishColor: '#ab47bc',
    bearishColor: '#26c6da',
    valueUnit: ' mm/s',
    formatValue: (value: number) => value.toFixed(3)
  },
  
  qualityMetrics: {
    title: 'Quality Parameter Trends',
    bullishColor: '#4caf50',
    bearishColor: '#f44336',
    valueUnit: '',
    formatValue: (value: number) => value.toFixed(2)
  }
};

// Sample data generator
export const generateSampleCandlestickData = (
  hours: number = 24,
  type: 'temperature' | 'pressure' | 'vibration' = 'temperature'
): CandlestickDataPoint[] => {
  const data: CandlestickDataPoint[] = [];
  const now = new Date();
  
  const baseValues = {
    temperature: { base: 85, range: 15 },
    pressure: { base: 2.5, range: 0.8 },
    vibration: { base: 1.2, range: 0.6 }
  };
  
  const { base, range } = baseValues[type];
  
  for (let i = 0; i < hours; i++) {
    const timestamp = new Date(now.getTime() - (hours - i) * 60 * 60 * 1000);
    
    // Generate realistic OHLC data with some trend and noise
    const trend = Math.sin(i / 6) * (range * 0.3);
    const noise = (Math.random() - 0.5) * range * 0.5;
    const baseValue = base + trend + noise;
    
    const open = baseValue + (Math.random() - 0.5) * range * 0.2;
    const close = open + (Math.random() - 0.5) * range * 0.3;
    
    const volatility = Math.random() * range * 0.4;
    const high = Math.max(open, close) + volatility * Math.random();
    const low = Math.min(open, close) - volatility * Math.random();
    
    data.push({
      timestamp,
      open: Math.max(0, open),
      high: Math.max(0, high),
      low: Math.max(0, low),
      close: Math.max(0, close),
      volume: Math.floor(Math.random() * 1000) + 500
    });
  }
  
  return data;
};

export default CandlestickChartPanel;