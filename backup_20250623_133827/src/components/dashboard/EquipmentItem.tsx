'use client';

import React from 'react';

import { memo } from 'react';

interface EquipmentItemProps {
  id?: number | string;
  name?: string;
  status?: 'running' | 'maintenance' | 'idle' | 'error';
  uptime?: string;
}

// Memoized Equipment Item component to prevent unnecessary re-renders
const EquipmentItem = memo(function EquipmentItem({
  id,
  name,
  status,
  uptime
}: EquipmentItemProps) {
  return (
    <div key={id} className="px-6 py-4 flex items-center justify-between">
      <div className="flex items-center">
        <div className={`h-3 w-3 rounded-full mr-3 status-indicator ${
          status === 'running' ? 'bg-green-500' : 
          status === 'maintenance' ? 'bg-orange-500' : 
          status === 'error' ? 'bg-red-500' : 'bg-gray-500'
        }`}></div>
        <span className="text-sm font-medium text-gray-900">{name}</span>
      </div>
      <div className="flex items-center">
        <span className="text-sm text-gray-500 mr-4">
          Uptime: {uptime}
        </span>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 capitalize">
          {status}
        </span>
      </div>
    </div>
  );
});

export default EquipmentItem;