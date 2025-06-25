import React from 'react';
import { EquipmentStatus } from '@/models/equipment';

interface EquipmentStatusBadgeProps {
  status?: EquipmentStatus;
  showLabel?: boolean;
  className?: string;
}

export default function EquipmentStatusBadge({ 
  status, 
  showLabel = true, 
  className = ''
}: EquipmentStatusBadgeProps) {
  const getBadgeColor = () => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDotColor = () => {
    switch (status) {
      case 'operational':
        return 'bg-green-500';
      case 'maintenance':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-gray-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'maintenance':
        return 'Maintenance';
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Error';
      default:
        return status;
    }
  };

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor()} ${className}`}
      data-testid="equipment-status-badge"
    >
      <span className={`h-2 w-2 rounded-full ${getDotColor()} mr-1.5`} aria-hidden="true"></span>
      {showLabel && getLabel()}
    </span>
  );
}