'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Panel } from '@/types/dashboard';

interface BarChartPanelProps {
  panel?: Panel;
  data?: any[];
  height?: string | number;
  width?: string | number;
}

export default function BarChartPanel({ panel, data = [], height, width }: BarChartPanelProps) {
  const options = panel?.options || {};
  const fieldConfig = panel?.fieldConfig?.defaults || {};
  
  // Extract color settings
  const color = fieldConfig.color?.fixedColor || '#3B82F6';
  const showLegend = options.legend?.show !== false;
  const orientation = options.orientation || 'vertical';
  
  return (
    <div style={{ height, width }} className="bar-chart-panel p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={orientation === 'horizontal' ? 'horizontal' : 'vertical'}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          {orientation === 'horizontal' ? (
            <>
              <XAxis type="number" stroke="#9CA3AF" />
              <YAxis dataKey="name" type="category" stroke="#9CA3AF" />
            </>
          ) : (
            <>
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
            </>
          )}
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1F2937', 
              border: '1px solid #374151',
              borderRadius: '4px'
            }}
            labelStyle={{ color: '#F3F4F6' }}
          />
          {showLegend && <Legend wrapperStyle={{ color: '#9CA3AF' }} />}
          <Bar 
            dataKey="value" 
            fill={color}
            radius={[4, 4, 0, 0]}
          />
          {data && data.length > 0 && data[0]?.target !== undefined && (
            <Bar 
              dataKey="target" 
              fill="#DC2626"
              fillOpacity={0.5}
              radius={[4, 4, 0, 0]}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}