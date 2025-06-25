'use client';

import React from 'react';
import { EquipmentMetric } from '@/models/equipment';

interface EquipmentMetricsProps {
  metrics?: EquipmentMetric[];
  className?: string;
}

export default function EquipmentMetrics({ metrics, className = '' }: EquipmentMetricsProps) {
  // Helper function to determine status color based on values
  const getStatusColor = (metric: EquipmentMetric) => {
    const { value, critical, warning  } = metric || {};
    
    // Check critical thresholds
    if (critical) {
      if (critical?.high !== undefined && value >= critical?.high) return 'bg-red-500';
      if (critical?.low !== undefined && value <= critical?.low) return 'bg-red-500';
    }
    
    // Check warning thresholds
    if (warning) {
      if (warning?.high !== undefined && value >= warning?.high) return 'bg-yellow-500';
      if (warning?.low !== undefined && value <= warning?.low) return 'bg-yellow-500';
    }
    
    // Default (normal) status
    return 'bg-green-500';
  };
  
  // Function to format value
  const formatValue = (value: number) => {
    // If value is an integer, don't show decimal places
    return Number.isInteger(value) ? value?.toString() : value.toFixed(1);
  };
  
  // Calculate percentage for the progress bar
  const calculatePercentage = (metric: EquipmentMetric) => {
    const { value, min, max  } = metric || {};
    
    // If min and max are defined, calculate percentage between them
    if (min !== undefined && max !== undefined) {
      const range = max - min;
      const normalizedValue = value - min;
      return Math.min(100, Math.max(0, (normalizedValue / range) * 100));
    }
    
    // If only max is defined, calculate percentage from 0 to max
    if (max !== undefined) {
      return Math.min(100, Math.max(0, (value / max) * 100));
    }
    
    // If target is defined, show percentage relative to target
    if (metric?.target !== undefined) {
      return Math.min(100, Math.max(0, (value / metric?.target) * 100));
    }
    
    // Default fallback
    return 50;
  };
  
  // Determine if a warning should be shown
  const showWarning = (metric: EquipmentMetric) => {
    const { value, critical, warning  } = metric || {};
    
    if (critical) {
      if (critical?.high !== undefined && value >= critical?.high) return true;
      if (critical?.low !== undefined && value <= critical?.low) return true;
    }
    
    if (warning) {
      if (warning?.high !== undefined && value >= warning?.high) return true;
      if (warning?.low !== undefined && value <= warning?.low) return true;
    }
    
    return false;
  };
  
  // Get warning message
  const getWarningMessage = (metric: EquipmentMetric) => {
    const { value, critical, warning  } = metric || {};
    
    if (critical) {
      if (critical?.high !== undefined && value >= critical?.high) {
        return `Critical: Value exceeds maximum threshold (${critical?.high} ${metric?.unit})`;
      }
      if (critical?.low !== undefined && value <= critical?.low) {
        return `Critical: Value below minimum threshold (${critical?.low} ${metric?.unit})`;
      }
    }
    
    if (warning) {
      if (warning?.high !== undefined && value >= warning?.high) {
        return `Warning: Value approaching maximum threshold (${warning?.high} ${metric?.unit})`;
      }
      if (warning?.low !== undefined && value <= warning?.low) {
        return `Warning: Value approaching minimum threshold (${warning?.low} ${metric?.unit})`;
      }
    }
    
    return '';
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`} data-testid="equipment-metrics">
      <div className="border-b border-gray-200 px-6 py-5">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Current Metrics</h3>
      </div>
      
      <div className="divide-y divide-gray-200">
        {metrics.length === 0 ? (
          <div className="px-6 py-5 text-center text-gray-500">
            No metrics available for this equipment
          </div>
        ) : (
          metrics?.map((metric) => (
            <div key={metric?.id} className="px-6 py-5">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900">{metric?.name}</span>
                  {showWarning(metric) && (
                    <span
                      className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
                      title={getWarningMessage(metric)}
                    >
                      <svg
                        className="mr-1 h-3 w-3 text-yellow-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      Alert
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold text-gray-900">
                    {formatValue(metric?.value)}
                  </span>
                  <span className="ml-1 text-sm text-gray-500">{metric?.unit}</span>
                </div>
              </div>
              
              <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full ${getStatusColor(metric)}`}
                  style={{ width: `${calculatePercentage(metric)}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                {metric?.min !== undefined && <span>{metric?.min}</span>}
                {metric?.target !== undefined && (
                  <span className="text-center">Target: {metric?.target}</span>
                )}
                {metric?.max !== undefined && <span>{metric?.max}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}