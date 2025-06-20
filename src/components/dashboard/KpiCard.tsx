'use client';

import { memo } from 'react';

interface KpiCardProps {
  id?: number | string;
  name?: string;
  value?: string;
  trend?: 'up' | 'down' | 'stable';
  change?: string;
}

// Memoized KPI card component to prevent unnecessary re-renders
const KpiCard = memo(function KpiCard({
  id,
  name,
  value,
  trend = 'stable',
  change = '0%'
}: KpiCardProps) {
  return (
    <div key={id} className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center">
        <h3 className="text-gray-500 text-sm font-medium">{name}</h3>
        {trend !== 'stable' && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {trend === 'up' ? '↑' : '↓'} {change}
          </span>
        )}
      </div>
      <div className="mt-2 text-3xl font-semibold text-gray-900">{value}</div>
    </div>
  );
});

export default KpiCard;