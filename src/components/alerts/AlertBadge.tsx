import React from 'react';
import { AlertSeverity, AlertStatus } from '@/models/alert';

interface AlertBadgeProps {
  type?: 'severity' | 'status';
  value?: AlertSeverity | AlertStatus;
  showLabel?: boolean;
  className?: string;
  'data-testid'?: string;
}

export default function AlertBadge({ 
  type,
  value, 
  showLabel = true, 
  className = '',
  'data-testid': testId
}: AlertBadgeProps) {
  const getBadgeColor = () => {
    if (type === 'severity') {
      // Handle severity colors
      switch (value as AlertSeverity) {
        case 'critical':
          return 'bg-red-100 text-red-800';
        case 'high':
          return 'bg-orange-100 text-orange-800';
        case 'medium':
          return 'bg-yellow-100 text-yellow-800';
        case 'low':
          return 'bg-blue-100 text-blue-800';
        case 'info':
          return 'bg-gray-100 text-gray-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    } else {
      // Handle status colors
      switch (value as AlertStatus) {
        case 'active':
          return 'bg-red-100 text-red-800';
        case 'acknowledged':
          return 'bg-yellow-100 text-yellow-800';
        case 'resolved':
          return 'bg-green-100 text-green-800';
        case 'muted':
          return 'bg-gray-100 text-gray-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }
  };

  const getDotColor = () => {
    if (type === 'severity') {
      // Handle severity colors
      switch (value as AlertSeverity) {
        case 'critical':
          return 'bg-red-500';
        case 'high':
          return 'bg-orange-500';
        case 'medium':
          return 'bg-yellow-500';
        case 'low':
          return 'bg-blue-500';
        case 'info':
          return 'bg-gray-500';
        default:
          return 'bg-gray-500';
      }
    } else {
      // Handle status colors
      switch (value as AlertStatus) {
        case 'active':
          return 'bg-red-500';
        case 'acknowledged':
          return 'bg-yellow-500';
        case 'resolved':
          return 'bg-green-500';
        case 'muted':
          return 'bg-gray-500';
        default:
          return 'bg-gray-500';
      }
    }
  };

  const getLabel = () => {
    // Ensure consistent rendering between server and client
    // Use a stable transformation that doesn't depend on runtime state
    const labelMap: Record<string, string> = {
      // Status values
      'active': 'Active',
      'acknowledged': 'Acknowledged', 
      'resolved': 'Resolved',
      'muted': 'Muted',
      // Severity values
      'critical': 'Critical',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low',
      'info': 'Info'
    };
    
    return labelMap[value] || value;
  };

  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor()} ${className}`}
      data-testid={testId || `alert-${type}-badge`}
    >
      <span className={`h-2 w-2 rounded-full ${getDotColor()} mr-1.5`} aria-hidden="true"></span>
      {showLabel && getLabel()}
    </span>
  );
}