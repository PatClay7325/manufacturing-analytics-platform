'use client';

import { memo } from 'react';

interface AlertItemProps {
  id: number | string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  time: string;
}

// Memoized Alert Item component to prevent unnecessary re-renders
const AlertItem = memo(function AlertItem({
  id,
  severity,
  message,
  time
}: AlertItemProps) {
  return (
    <div key={id} className="px-6 py-4">
      <div className="flex items-center">
        <div className={`h-3 w-3 rounded-full mr-3 severity-badge ${
          severity === 'high' ? 'bg-red-500' : 
          severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
        }`}></div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{message}</p>
          <p className="text-xs text-gray-500">{time}</p>
        </div>
      </div>
    </div>
  );
});

export default AlertItem;