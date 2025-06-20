'use client';

import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface ParetoDataItem {
  category: string;
  count: number;
  description?: string;
}

interface ParetoChartProps {
  data: ParetoDataItem[];
  title?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  barColor?: string;
  lineColor?: string;
  className?: string;
}

export default function ParetoChart({
  data,
  title = 'Pareto Analysis',
  height = 400,
  showGrid = true,
  showLegend = true,
  barColor = '#3b82f6',
  lineColor = '#ef4444',
  className = ''
}: ParetoChartProps) {
  // Process data for Pareto analysis
  const processedData = useMemo(() => {
    // Sort by count descending
    const sorted = [...data].sort((a, b) => b.count - a.count);
    
    // Calculate cumulative percentage
    const total = sorted.reduce((sum, item) => sum + item.count, 0);
    let cumulative = 0;
    
    return sorted.map((item, index) => {
      cumulative += item.count;
      const percentage = (item.count / total) * 100;
      const cumulativePercentage = (cumulative / total) * 100;
      
      return {
        ...item,
        percentage,
        cumulativePercentage,
        index: index + 1
      };
    });
  }, [data]);

  // Find 80% line position
  const eightyPercentIndex = useMemo(() => {
    const index = processedData.findIndex(item => item.cumulativePercentage >= 80);
    return index >= 0 ? index + 0.5 : processedData.length;
  }, [processedData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-sm font-semibold text-gray-700">{data.category}</p>
          {data.description && (
            <p className="text-xs text-gray-600 mb-2">{data.description}</p>
          )}
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-sm">Count:</span>
              <span className="text-sm font-medium">{data.count}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm">Percentage:</span>
              <span className="text-sm font-medium">{data.percentage.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-sm">Cumulative:</span>
              <span className="text-sm font-medium">{data.cumulativePercentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`w-full ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={processedData}
          margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
        >
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          )}
          
          <XAxis
            dataKey="category"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fontSize: 12 }}
          />
          
          <YAxis
            yAxisId="left"
            orientation="left"
            tick={{ fontSize: 12 }}
            label={{
              value: 'Count',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 14 }
            }}
          />
          
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            label={{
              value: 'Cumulative %',
              angle: 90,
              position: 'insideRight',
              style: { fontSize: 14 }
            }}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {showLegend && (
            <Legend
              verticalAlign="top"
              height={36}
              iconType="rect"
            />
          )}
          
          {/* 80% reference line */}
          <ReferenceLine
            yAxisId="right"
            y={80}
            stroke="#666"
            strokeDasharray="5 5"
            label={{
              value: '80%',
              position: 'right',
              style: { fontSize: 12 }
            }}
          />
          
          {/* Vertical line at 80% cumulative */}
          <ReferenceLine
            x={eightyPercentIndex}
            stroke="#666"
            strokeDasharray="5 5"
            label={{
              value: 'Vital Few',
              position: 'top',
              style: { fontSize: 12 }
            }}
          />
          
          <Bar
            yAxisId="left"
            dataKey="count"
            name="Frequency"
            fill={barColor}
            radius={[4, 4, 0, 0]}
          />
          
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="cumulativePercentage"
            name="Cumulative %"
            stroke={lineColor}
            strokeWidth={3}
            dot={{ fill: lineColor, r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      
      {/* Summary statistics */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Total Issues</div>
          <div className="text-xl font-semibold">{data.reduce((sum, item) => sum + item.count, 0)}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Categories</div>
          <div className="text-xl font-semibold">{data.length}</div>
        </div>
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-gray-600">Vital Few (80%)</div>
          <div className="text-xl font-semibold">
            {processedData.filter(item => item.cumulativePercentage <= 80).length}
          </div>
        </div>
      </div>
    </div>
  );
}