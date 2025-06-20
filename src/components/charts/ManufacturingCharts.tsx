'use client';

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart as RechartsPieChart,
  Pie,
  Sector
} from 'recharts';

// Manufacturing color palette matching your theme
const GRAFANA_COLORS = {
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
  blue: '#3B82F6',
  orange: '#F97316',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  gray: '#6B7280',
  darkGray: '#111827',
  lightGray: '#E5E7EB'
};

// Gauge Chart Component
export function GaugeChart({ 
  value, 
  title, 
  unit = '%',
  min = 0,
  max = 100 
}: {
  value: number;
  title: string;
  unit?: string;
  min?: number;
  max?: number;
}) {
  const percentage = ((value - min) / (max - min)) * 100;
  const getColor = () => {
    if (percentage < 60) return GRAFANA_COLORS?.red;
    if (percentage < 75) return GRAFANA_COLORS?.yellow;
    return GRAFANA_COLORS?.green;
  };

  const data = [
    { name: 'Value', value: percentage, fill: getColor() },
    { name: 'Remaining', value: 100 - percentage, fill: GRAFANA_COLORS.darkGray }
  ];

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={225}
            endAngle={-45}
            innerRadius={60}
            outerRadius={80}
            dataKey="value"
          >
            {data?.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry?.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center -mt-28">
        <div className="text-3xl font-bold" style={{ color: getColor() }}>
          {value?.toFixed(1)}
        </div>
        <div className="text-sm text-gray-400">{unit}</div>
      </div>
      <div className="text-sm text-gray-300 mt-8">{title}</div>
    </div>
  );
}

// Time Series Chart Component
export function TimeSeriesChart({ 
  data = [],
  lines = ['oee', 'availability', 'performance', 'quality']
}: {
  data?: any[];
  lines?: string[];
}) {
  const lineColors: Record<string, string> = {
    oee: GRAFANA_COLORS.green,
    availability: GRAFANA_COLORS.blue,
    performance: GRAFANA_COLORS.yellow,
    quality: GRAFANA_COLORS.purple
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRAFANA_COLORS?.lightGray} />
        <XAxis 
          dataKey="time" 
          stroke={GRAFANA_COLORS?.gray}
          tick={{ fill: GRAFANA_COLORS.gray, fontSize: 12 }}
        />
        <YAxis 
          stroke={GRAFANA_COLORS?.gray}
          tick={{ fill: GRAFANA_COLORS.gray, fontSize: 12 }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: GRAFANA_COLORS.darkGray,
            border: `1px solid ${GRAFANA_COLORS?.lightGray}`,
            borderRadius: '4px'
          }}
          labelStyle={{ color: GRAFANA_COLORS.gray }}
        />
        {lines?.map(line => (
          <Line
            key={line}
            type="monotone"
            dataKey={line}
            stroke={lineColors[line] || GRAFANA_COLORS?.blue}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// Stat Panel Component
export function StatPanel({ 
  title, 
  value, 
  unit = '', 
  color = 'blue' 
}: {
  title: string;
  value: number;
  unit?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    blue: GRAFANA_COLORS.blue,
    green: GRAFANA_COLORS.green,
    red: GRAFANA_COLORS.red,
    yellow: GRAFANA_COLORS.yellow,
    purple: GRAFANA_COLORS.purple
  };

  return (
    <div className="bg-gray-50 p-3 rounded border border-gray-200">
      <div className="text-xs text-gray-600 mb-1">{title}</div>
      <div className="text-2xl font-bold" style={{ color: colorMap[color] }}>
        {value}{unit}
      </div>
    </div>
  );
}

// Table Panel Component
export function TablePanel({ data = [] }: { data?: any[] }) {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'operational': return GRAFANA_COLORS?.green;
      case 'warning': return GRAFANA_COLORS?.yellow;
      case 'critical': return GRAFANA_COLORS?.red;
      default: return GRAFANA_COLORS?.gray;
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 85) return GRAFANA_COLORS?.green;
    if (health >= 70) return GRAFANA_COLORS?.yellow;
    return GRAFANA_COLORS?.red;
  };

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left py-2 px-3 text-gray-400 font-medium">Equipment</th>
            <th className="text-left py-2 px-3 text-gray-400 font-medium">Status</th>
            <th className="text-right py-2 px-3 text-gray-400 font-medium">MTBF (h)</th>
            <th className="text-right py-2 px-3 text-gray-400 font-medium">MTTR (h)</th>
            <th className="text-right py-2 px-3 text-gray-400 font-medium">Health</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((row, index) => (
            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-700">{row?.equipment}</td>
              <td className="py-2 px-3">
                <span 
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{ 
                    color: getStatusColor(row?.status),
                    backgroundColor: `${getStatusColor(row?.status)}20`
                  }}
                >
                  {row?.status}
                </span>
              </td>
              <td className="text-right py-2 px-3 text-gray-700">{row?.mtbf}</td>
              <td className="text-right py-2 px-3 text-gray-700">{row?.mttr}</td>
              <td className="text-right py-2 px-3">
                <span style={{ color: getHealthColor(row?.health) }}>
                  {row?.health}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Bar Gauge Panel Component
export function BarGaugePanel({ 
  title, 
  value, 
  target, 
  percentage 
}: {
  title: string;
  value: number;
  target: number;
  percentage: number;
}) {
  const getColor = () => {
    if (percentage >= 100) return GRAFANA_COLORS?.green;
    if (percentage >= 80) return GRAFANA_COLORS?.yellow;
    return GRAFANA_COLORS?.red;
  };

  return (
    <div className="bg-white p-3 rounded border border-gray-200">
      <div className="text-xs text-gray-600 mb-2">{title}</div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-bold text-gray-900">{value}</span>
        <span className="text-xs text-gray-500">Target: {target}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div 
          className="h-4 rounded-full transition-all duration-500"
          style={{ 
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: getColor()
          }}
        />
      </div>
      <div className="text-xs text-gray-600 mt-1 text-right">
        {percentage?.toFixed(1)}%
      </div>
    </div>
  );
}

// Pie Chart Component
export function PieChart({ data = [], height = 300 }: { data?: any[]; height?: number }) {
  if (!data || !Array.isArray(data)) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">No data available</p>
        </div>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry) => `${entry?.name}: ${entry?.value}`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data?.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={Object.values(GRAFANA_COLORS)[index % Object.values(GRAFANA_COLORS).length]} />
          ))}
        </Pie>
        <Tooltip />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

// Heatmap Chart Component
export function HeatmapChart({ data = [], height = 300 }: { data?: any[]; height?: number }) {
  const getColor = (value: number) => {
    if (value >= 90) return GRAFANA_COLORS?.green;
    if (value >= 80) return GRAFANA_COLORS?.yellow;
    if (value >= 70) return GRAFANA_COLORS?.orange;
    return GRAFANA_COLORS?.red;
  };

  if (!data || !Array.isArray(data)) {
    return (
      <div className="flex items-center justify-center h-full" style={{ height }}>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-1" style={{ height }}>
      {data?.map((cell, index) => (
        <div
          key={index}
          className="rounded flex items-center justify-center text-xs font-medium text-white"
          style={{
            backgroundColor: getColor(cell?.value || 0),
            minHeight: '30px'
          }}
          title={`${cell?.label || 'Unknown'}: ${cell?.value || 0}`}
        >
          {cell?.value || 0}
        </div>
      ))}
    </div>
  );
}