'use client';

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Panel } from '@/types/dashboard';

interface PieChartPanelProps {
  panel?: Panel;
  data?: any[];
  height?: string | number;
  width?: string | number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function PieChartPanel({ panel, data = [], height, width }: PieChartPanelProps) {
  const options = panel?.options || {};
  const showLegend = options.legend?.show !== false;
  const showLabels = options.pieType?.show !== false;
  const labelType = options.pieType?.labelType || 'percent';
  
  const renderLabel = (entry: any) => {
    const { value, percent, name } = entry;
    switch (labelType) {
      case 'value':
        return value;
      case 'name':
        return name;
      case 'percent':
        return `${(percent * 100).toFixed(0)}%`;
      case 'name+value':
        return `${name}: ${value}`;
      default:
        return `${(percent * 100).toFixed(0)}%`;
    }
  };
  
  return (
    <div style={{ height, width }} className="pie-chart-panel p-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={showLabels ? renderLabel : false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: '1px solid #374151',
              borderRadius: '4px'
            }}
            labelStyle={{ color: '#F3F4F6' }}
          />
          {showLegend && (
            <Legend 
              wrapperStyle={{ color: '#9CA3AF' }}
              verticalAlign="bottom"
              height={36}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}