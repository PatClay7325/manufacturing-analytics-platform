'use client';

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
  ReferenceLine,
  Cell
} from 'recharts';

interface HistogramData {
  values: number[];
  bins?: number;
}

interface HistogramChartProps {
  data: HistogramData;
  title?: string;
  height?: number;
  bins?: number;
  showGrid?: boolean;
  showNormalDistribution?: boolean;
  color?: string;
  thresholds?: Array<{ value: number; color: string; label: string }>;
  xAxisLabel?: string;
  yAxisLabel?: string;
  unit?: string;
  className?: string;
}

export default function HistogramChart({
  data,
  title,
  height = 400,
  bins = 20,
  showGrid = true,
  showNormalDistribution = false,
  color = '#3b82f6',
  thresholds = [],
  xAxisLabel = 'Value',
  yAxisLabel = 'Frequency',
  unit = '',
  className = ''
}: HistogramChartProps) {
  // Calculate histogram bins
  const histogramData = useMemo(() => {
    const values = data.values;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;
    
    // Initialize bins
    const histogram = Array(bins).fill(0).map((_, i) => ({
      binStart: min + i * binWidth,
      binEnd: min + (i + 1) * binWidth,
      binCenter: min + (i + 0.5) * binWidth,
      count: 0,
      percentage: 0
    }));
    
    // Count values in each bin
    values.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
      histogram[binIndex].count++;
    });
    
    // Calculate percentages
    const total = values.length;
    histogram.forEach(bin => {
      bin.percentage = (bin.count / total) * 100;
    });
    
    return histogram;
  }, [data.values, bins]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const values = data.values;
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const median = [...values].sort((a, b) => a - b)[Math.floor(n / 2)];
    
    return { mean, stdDev, median, min: Math.min(...values), max: Math.max(...values) };
  }, [data.values]);

  // Normal distribution overlay data
  const normalDistributionData = useMemo(() => {
    if (!showNormalDistribution) return [];
    
    const { mean, stdDev } = statistics;
    const min = Math.min(...data.values);
    const max = Math.max(...data.values);
    const points = 100;
    
    return Array(points).fill(0).map((_, i) => {
      const x = min + (i / (points - 1)) * (max - min);
      const z = (x - mean) / stdDev;
      const y = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
      return { x, y: y * data.values.length * ((max - min) / bins) };
    });
  }, [data.values, statistics, showNormalDistribution, bins]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-sm font-semibold text-gray-700">
            {data.binStart.toFixed(2)} - {data.binEnd.toFixed(2)} {unit}
          </p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-600">Count:</span>
              <span className="text-sm font-medium">{data.count}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm text-gray-600">Percentage:</span>
              <span className="text-sm font-medium">{data.percentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Color function for bars based on thresholds
  const getBarColor = (value: number) => {
    for (const threshold of thresholds) {
      if (value >= threshold.value) {
        return threshold.color;
      }
    }
    return color;
  };

  return (
    <div className={`w-full ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={histogramData}
          margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          )}
          
          <XAxis
            dataKey="binCenter"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => value.toFixed(1)}
            label={{
              value: `${xAxisLabel} ${unit ? `(${unit})` : ''}`,
              position: 'insideBottom',
              offset: -10,
              style: { fontSize: 14 }
            }}
          />
          
          <YAxis
            tick={{ fontSize: 12 }}
            label={{
              value: yAxisLabel,
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 14 }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Bar dataKey="count" fill={color}>
            {histogramData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.binCenter)} />
            ))}
          </Bar>
          
          {/* Reference lines for mean, median, thresholds */}
          <ReferenceLine
            x={statistics.mean}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{
              value: `Mean: ${statistics.mean.toFixed(2)}`,
              position: 'top',
              style: { fontSize: 12 }
            }}
          />
          
          <ReferenceLine
            x={statistics.median}
            stroke="#10b981"
            strokeDasharray="5 5"
            label={{
              value: `Median: ${statistics.median.toFixed(2)}`,
              position: 'top',
              offset: 20,
              style: { fontSize: 12 }
            }}
          />
          
          {thresholds.map((threshold, index) => (
            <ReferenceLine
              key={index}
              x={threshold.value}
              stroke={threshold.color}
              strokeDasharray="3 3"
              label={{
                value: threshold.label,
                position: 'top',
                offset: 40 + index * 20,
                style: { fontSize: 12 }
              }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      
      {/* Statistics Summary */}
      <div className="mt-4 grid grid-cols-5 gap-4 text-sm">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Mean</div>
          <div className="text-lg font-semibold">
            {statistics.mean.toFixed(2)} {unit}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Std Dev</div>
          <div className="text-lg font-semibold">
            {statistics.stdDev.toFixed(2)} {unit}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Median</div>
          <div className="text-lg font-semibold">
            {statistics.median.toFixed(2)} {unit}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Min</div>
          <div className="text-lg font-semibold">
            {statistics.min.toFixed(2)} {unit}
          </div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Max</div>
          <div className="text-lg font-semibold">
            {statistics.max.toFixed(2)} {unit}
          </div>
        </div>
      </div>
    </div>
  );
}