/**
 * Candlestick Panel - Grafana-compatible candlestick/OHLC visualization
 * Displays financial-style data with open, high, low, close values
 * Useful for trend analysis, price movements, and range data
 */

import React, { useMemo } from 'react';
import { PanelProps, LoadingState } from '@/core/plugins/types';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Bar,
  Line,
  Cell,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';

export interface CandlestickPanelOptions {
  mode: 'candles' | 'ohlc' | 'volume';
  fields: {
    time?: string;
    open?: string;
    high?: string;
    low?: string;
    close?: string;
    volume?: string;
  };
  colors: {
    up: string;
    down: string;
    volume: string;
  };
  candleSettings: {
    wickWidth: number;
    bodyWidthRatio: number;
  };
  includeVolume: boolean;
  includeMovingAverage: {
    enabled: boolean;
    period: number;
    color: string;
  };
  thresholds?: Array<{
    value: number;
    color: string;
    label?: string;
  }>;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  ma?: number;
  color: string;
}

const CandlestickPanel: React.FC<PanelProps<CandlestickPanelOptions>> = ({
  data,
  options,
  width,
  height,
  timeRange,
}) => {
  const processedData = useMemo(() => {
    if (!data.series || data.series.length === 0) return [];

    const frame = data.series[0];
    const candles: CandleData[] = [];

    // Find fields
    const timeField = frame.fields.find(f => 
      f.name === options.fields.time || 
      f.type === 'time' ||
      f.name.toLowerCase().includes('time')
    );
    const openField = frame.fields.find(f => 
      f.name === options.fields.open || 
      f.name.toLowerCase().includes('open')
    );
    const highField = frame.fields.find(f => 
      f.name === options.fields.high || 
      f.name.toLowerCase().includes('high')
    );
    const lowField = frame.fields.find(f => 
      f.name === options.fields.low || 
      f.name.toLowerCase().includes('low')
    );
    const closeField = frame.fields.find(f => 
      f.name === options.fields.close || 
      f.name.toLowerCase().includes('close')
    );
    const volumeField = frame.fields.find(f => 
      f.name === options.fields.volume || 
      f.name.toLowerCase().includes('volume')
    );

    if (!timeField || !openField || !highField || !lowField || !closeField) {
      return [];
    }

    // Process data
    for (let i = 0; i < frame.length; i++) {
      const open = openField.values.get(i);
      const high = highField.values.get(i);
      const low = lowField.values.get(i);
      const close = closeField.values.get(i);
      const time = timeField.values.get(i);

      candles.push({
        time,
        open,
        high,
        low,
        close,
        volume: volumeField.values.get(i),
        color: close >= open ? options.colors.up : options.colors.down,
      });
    }

    // Calculate moving average if enabled
    if (options.includeMovingAverage?.enabled && candles.length > 0) {
      const period = options.includeMovingAverage.period || 20;
      for (let i = 0; i < candles.length; i++) {
        if (i >= period - 1) {
          let sum = 0;
          for (let j = 0; j < period; j++) {
            sum += candles[i - j].close;
          }
          candles[i].ma = sum / period;
        }
      }
    }

    return candles;
  }, [data.series, options]);

  // Custom candle shape
  const renderCandle = (props: any) => {
    const { x, y, width, height, payload } = props;
    const { open, high, low, close, color } = payload;
    
    const candleWidth = width * (options.candleSettings?.bodyWidthRatio || 0.7);
    const wickX = x + width / 2;
    const wickWidth = options.candleSettings?.wickWidth || 1;

    // Calculate Y positions
    const yScale = props.yScale || ((value: number) => {
      const yMin = Math.min(...processedData.map(d => d.low));
      const yMax = Math.max(...processedData.map(d => d.high));
      return height - ((value - yMin) / (yMax - yMin)) * height;
    });

    const yHigh = yScale(high);
    const yLow = yScale(low);
    const yOpen = yScale(open);
    const yClose = yScale(close);

    return (
      <g>
        {/* Wick */}
        <line
          x1={wickX}
          y1={yHigh}
          x2={wickX}
          y2={yLow}
          stroke={color}
          strokeWidth={wickWidth}
        />
        {/* Body */}
        <rect
          x={x + (width - candleWidth) / 2}
          y={Math.min(yOpen, yClose)}
          width={candleWidth}
          height={Math.abs(yOpen - yClose) || 1}
          fill={color}
          stroke={color}
          strokeWidth={1}
        />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload[0]) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium mb-2">
            {format(new Date(data.time), 'MMM dd, yyyy HH:mm')}
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span>Open:</span>
              <span className="font-mono">{data.open.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>High:</span>
              <span className="font-mono">{data.high.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Low:</span>
              <span className="font-mono">{data.low.toFixed(2)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Close:</span>
              <span className="font-mono font-medium" style={{ color: data.color }}>
                {data.close.toFixed(2)}
              </span>
            </div>
            {data.volume !== undefined && (
              <div className="flex justify-between gap-4 pt-1 border-t">
                <span>Volume:</span>
                <span className="font-mono">{data.volume.toLocaleString()}</span>
              </div>
            )}
            {data.ma !== undefined && (
              <div className="flex justify-between gap-4">
                <span>MA{options.includeMovingAverage?.period}:</span>
                <span className="font-mono">{data.ma.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  if (data.state === LoadingState.Loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (processedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No OHLC data available</p>
          <p className="text-sm mt-1">Requires open, high, low, close fields</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full p-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="time"
            tickFormatter={(value) => format(new Date(value), 'MMM dd')}
            stroke="currentColor"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            domain={['dataMin', 'dataMax']}
            stroke="currentColor"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Threshold lines */}
          {options.thresholds?.map((threshold, idx) => (
            <ReferenceLine
              key={idx}
              y={threshold.value}
              stroke={threshold.color}
              strokeDasharray="5 5"
              label={threshold.label}
            />
          ))}

          {/* Volume bars (if enabled) */}
          {options.includeVolume && (
            <Bar
              dataKey="volume"
              fill={options.colors.volume || '#8884d8'}
              opacity={0.3}
              yAxisId="volume"
            />
          )}

          {/* Candlesticks */}
          {options.mode === 'candles' && (
            <Bar
              dataKey="close"
              shape={renderCandle}
              isAnimationActive={false}
            />
          )}

          {/* Moving average line */}
          {options.includeMovingAverage?.enabled && (
            <Line
              type="monotone"
              dataKey="ma"
              stroke={options.includeMovingAverage.color || '#fbbf24'}
              strokeWidth={2}
              dot={false}
              name={`MA${options.includeMovingAverage.period}`}
            />
          )}

          {/* Add second Y axis for volume if needed */}
          {options.includeVolume && (
            <YAxis
              yAxisId="volume"
              orientation="right"
              stroke="currentColor"
              style={{ fontSize: '12px' }}
            />
          )}

          <Legend />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CandlestickPanel;