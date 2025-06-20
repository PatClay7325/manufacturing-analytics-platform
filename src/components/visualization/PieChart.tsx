'use client';

import React, { useMemo } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  Label
} from 'recharts';

interface PieChartDataItem {
  name: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  data: PieChartDataItem[];
  title?: string;
  height?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  showTooltip?: boolean;
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  donut?: boolean;
  innerRadius?: number;
  className?: string;
  unit?: string;
  displayValue?: 'percentage' | 'absolute' | 'both';
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

export default function PieChart({
  data,
  title,
  height = 400,
  showLegend = true,
  showLabels = true,
  showTooltip = true,
  legendPosition = 'right',
  donut = false,
  innerRadius = 60,
  className = '',
  unit = '',
  displayValue = 'percentage'
}: PieChartProps) {
  // Calculate total and percentages
  const processedData = useMemo(() => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    return data.map((item, index) => ({
      ...item,
      color: item.color || COLORS[index % COLORS.length],
      percentage: ((item.value / total) * 100).toFixed(1)
    }));
  }, [data]);

  const total = useMemo(() => {
    return data.reduce((sum, item) => sum + item.value, 0);
  }, [data]);

  // Custom label
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    index
  }: any) => {
    if (!showLabels) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length && showTooltip) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded shadow-lg">
          <p className="text-sm font-semibold text-gray-700">{data.name}</p>
          <div className="mt-2 space-y-1">
            {displayValue !== 'percentage' && (
              <div className="flex justify-between gap-4">
                <span className="text-sm text-gray-600">Value:</span>
                <span className="text-sm font-medium">
                  {data.value.toLocaleString()} {unit}
                </span>
              </div>
            )}
            {displayValue !== 'absolute' && (
              <div className="flex justify-between gap-4">
                <span className="text-sm text-gray-600">Percentage:</span>
                <span className="text-sm font-medium">{data.payload.percentage}%</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    
    return (
      <ul className="space-y-2">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">{entry.value}</span>
            <span className="text-sm text-gray-500">
              ({processedData[index].percentage}%)
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className={`w-full ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
      )}
      
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={processedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={height / 3}
            innerRadius={donut ? innerRadius : 0}
            fill="#8884d8"
            dataKey="value"
          >
            {processedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
            {donut && (
              <Label
                value={`${total.toLocaleString()} ${unit}`}
                position="center"
                className="text-2xl font-bold"
                fill="#374151"
              />
            )}
          </Pie>
          
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          
          {showLegend && (
            <Legend
              verticalAlign={legendPosition === 'top' || legendPosition === 'bottom' ? legendPosition : 'middle'}
              align={legendPosition === 'left' || legendPosition === 'right' ? legendPosition : 'center'}
              layout={legendPosition === 'left' || legendPosition === 'right' ? 'vertical' : 'horizontal'}
              content={renderCustomLegend}
              wrapperStyle={{
                paddingLeft: legendPosition === 'right' ? '20px' : '0',
                paddingRight: legendPosition === 'left' ? '20px' : '0',
                paddingTop: legendPosition === 'bottom' ? '20px' : '0',
                paddingBottom: legendPosition === 'top' ? '20px' : '0'
              }}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
      
      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="text-gray-600">Total</div>
          <div className="font-semibold">{total.toLocaleString()} {unit}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-600">Categories</div>
          <div className="font-semibold">{data.length}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-600">Largest</div>
          <div className="font-semibold">
            {processedData[0]?.name} ({processedData[0]?.percentage}%)
          </div>
        </div>
      </div>
    </div>
  );
}