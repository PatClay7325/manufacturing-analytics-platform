/**
 * Adaptive Factory Manufacturing Intelligence Platform
 * OEE Panel - Overall Equipment Effectiveness visualization
 * 
 * Original implementation for manufacturing OEE metrics
 */

'use client';

import React, { useMemo } from 'react';
import { PanelProps } from '@/core/panels/PanelRegistry';
import { OEEDisplayOptions, OEEThresholds } from '@/types/panel';

interface OEEData {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  targets: {
    availability: number;
    performance: number;
    quality: number;
    oee: number;
  };
  trends: {
    availability: number;
    performance: number;
    quality: number;
    oee: number;
  };
}

export default function OEEPanel({ 
  data, 
  options, 
  width, 
  height 
}: PanelProps<OEEDisplayOptions>) {
  
  const oeeData = useMemo((): OEEData => {
    if (!data || !data.length) {
      return {
        availability: 0,
        performance: 0,
        quality: 0,
        oee: 0,
        targets: { availability: 85, performance: 85, quality: 99, oee: 75 },
        trends: { availability: 0, performance: 0, quality: 0, oee: 0 }
      };
    }

    const frame = data[0];
    const availabilityField = frame.fields.find(f => f.name.toLowerCase().includes('availability'));
    const performanceField = frame.fields.find(f => f.name.toLowerCase().includes('performance'));
    const qualityField = frame.fields.find(f => f.name.toLowerCase().includes('quality'));
    
    const availability = getLatestValue(availabilityField) || 0;
    const performance = getLatestValue(performanceField) || 0;
    const quality = getLatestValue(qualityField) || 0;
    const oee = (availability * performance * quality) / 10000;

    // Calculate trends (comparison with previous value)
    const availabilityTrend = calculateTrend(availabilityField);
    const performanceTrend = calculateTrend(performanceField);
    const qualityTrend = calculateTrend(qualityField);
    const oeeTrend = calculateTrend(null, oee, getPreviousOEE());

    return {
      availability,
      performance,
      quality,
      oee,
      targets: {
        availability: options.targets?.find(t => t.metric === 'availability')?.target || 85,
        performance: options.targets?.find(t => t.metric === 'performance')?.target || 85,
        quality: options.targets?.find(t => t.metric === 'quality')?.target || 99,
        oee: options.targets?.find(t => t.metric === 'oee')?.target || 75
      },
      trends: {
        availability: availabilityTrend,
        performance: performanceTrend,
        quality: qualityTrend,
        oee: oeeTrend
      }
    };

    function getLatestValue(field?: any): number {
      if (!field || !field.values.length) return 0;
      return field.values[field.values.length - 1] || 0;
    }

    function calculateTrend(field?: any, currentValue?: number, previousValue?: number): number {
      if (field && field.values.length >= 2) {
        const current = field.values[field.values.length - 1];
        const previous = field.values[field.values.length - 2];
        return current - previous;
      }
      if (currentValue !== undefined && previousValue !== undefined) {
        return currentValue - previousValue;
      }
      return 0;
    }

    function getPreviousOEE(): number {
      if (!availabilityField || !performanceField || !qualityField) return 0;
      if (availabilityField.values.length < 2) return 0;
      
      const prevAvail = availabilityField.values[availabilityField.values.length - 2] || 0;
      const prevPerf = performanceField.values[performanceField.values.length - 2] || 0;
      const prevQual = qualityField.values[qualityField.values.length - 2] || 0;
      
      return (prevAvail * prevPerf * prevQual) / 10000;
    }
  }, [data, options.targets]);

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }): string => {
    if (value >= thresholds.good) return 'text-green-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBgColor = (value: number, thresholds: { good: number; warning: number }): string => {
    if (value >= thresholds.good) return 'bg-green-100';
    if (value >= thresholds.warning) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getTrendIcon = (trend: number): JSX.Element => {
    if (Math.abs(trend) < 0.1) {
      return <span className="text-gray-500">→</span>;
    }
    return trend > 0 ? 
      <span className="text-green-500">↗</span> : 
      <span className="text-red-500">↘</span>;
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const renderGauge = (
    label: string, 
    value: number, 
    target: number, 
    trend: number,
    thresholds: { good: number; warning: number }
  ): JSX.Element => {
    const percentage = Math.min(100, Math.max(0, value));
    const targetPercentage = Math.min(100, Math.max(0, target));
    
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">{label}</h3>
          <div className="flex items-center space-x-1">
            {getTrendIcon(trend)}
            <span className="text-xs text-gray-500">
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
            </span>
          </div>
        </div>
        
        <div className="relative">
          {/* Gauge background */}
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            {/* Value bar */}
            <div 
              className={`h-full transition-all duration-500 ${
                value >= thresholds.good ? 'bg-green-500' :
                value >= thresholds.warning ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
            
            {/* Target indicator */}
            <div 
              className="absolute top-0 w-0.5 h-3 bg-gray-700"
              style={{ left: `${targetPercentage}%` }}
            />
          </div>
          
          {/* Value and target display */}
          <div className="flex items-center justify-between mt-2">
            <span className={`text-lg font-bold ${getStatusColor(value, thresholds)}`}>
              {formatPercentage(value)}
            </span>
            <span className="text-xs text-gray-500">
              Target: {formatPercentage(target)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderCircularGauge = (
    label: string, 
    value: number, 
    target: number,
    thresholds: { good: number; warning: number }
  ): JSX.Element => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const percentage = Math.min(100, Math.max(0, value));
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
    
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 flex flex-col items-center">
        <h3 className="text-sm font-medium text-gray-700 mb-4">{label}</h3>
        
        <div className="relative">
          <svg width="120" height="120" className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="transparent"
            />
            
            {/* Progress circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              stroke={
                value >= thresholds.good ? '#10b981' :
                value >= thresholds.warning ? '#f59e0b' : '#ef4444'
              }
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
            
            {/* Target indicator */}
            <circle
              cx={60 + radius * Math.cos((target / 100) * 2 * Math.PI - Math.PI / 2)}
              cy={60 + radius * Math.sin((target / 100) * 2 * Math.PI - Math.PI / 2)}
              r="3"
              fill="#374151"
            />
          </svg>
          
          {/* Center value */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-xl font-bold ${getStatusColor(value, thresholds)}`}>
              {formatPercentage(value)}
            </span>
            <span className="text-xs text-gray-500">
              of {formatPercentage(target)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderNumberDisplay = (
    label: string, 
    value: number, 
    target: number, 
    trend: number,
    thresholds: { good: number; warning: number }
  ): JSX.Element => {
    return (
      <div className={`rounded-lg p-4 shadow-sm border border-gray-200 ${getStatusBgColor(value, thresholds)}`}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium text-gray-700">{label}</h3>
          {getTrendIcon(trend)}
        </div>
        
        <div className="flex items-baseline space-x-2">
          <span className={`text-2xl font-bold ${getStatusColor(value, thresholds)}`}>
            {formatPercentage(value)}
          </span>
          <span className="text-sm text-gray-500">
            / {formatPercentage(target)}
          </span>
        </div>
        
        {trend !== 0 && (
          <div className="text-xs text-gray-600 mt-1">
            {trend > 0 ? '+' : ''}{trend.toFixed(1)}% vs previous
          </div>
        )}
      </div>
    );
  };

  const renderComponent = () => {
    const thresholds = options.alertThresholds;
    
    switch (options.displayMode) {
      case 'gauge':
        return (
          <div className="grid grid-cols-2 gap-4 h-full">
            {options.showAvailability && renderGauge(
              'Availability', 
              oeeData.availability, 
              oeeData.targets.availability, 
              oeeData.trends.availability,
              thresholds.availability
            )}
            {options.showPerformance && renderGauge(
              'Performance', 
              oeeData.performance, 
              oeeData.targets.performance, 
              oeeData.trends.performance,
              thresholds.performance
            )}
            {options.showQuality && renderGauge(
              'Quality', 
              oeeData.quality, 
              oeeData.targets.quality, 
              oeeData.trends.quality,
              thresholds.quality
            )}
            {options.showOverallOEE && renderCircularGauge(
              'Overall OEE', 
              oeeData.oee, 
              oeeData.targets.oee,
              thresholds.oee
            )}
          </div>
        );
      
      case 'number':
        return (
          <div className="grid grid-cols-2 gap-4 h-full">
            {options.showAvailability && renderNumberDisplay(
              'Availability', 
              oeeData.availability, 
              oeeData.targets.availability, 
              oeeData.trends.availability,
              thresholds.availability
            )}
            {options.showPerformance && renderNumberDisplay(
              'Performance', 
              oeeData.performance, 
              oeeData.targets.performance, 
              oeeData.trends.performance,
              thresholds.performance
            )}
            {options.showQuality && renderNumberDisplay(
              'Quality', 
              oeeData.quality, 
              oeeData.targets.quality, 
              oeeData.trends.quality,
              thresholds.quality
            )}
            {options.showOverallOEE && renderNumberDisplay(
              'Overall OEE', 
              oeeData.oee, 
              oeeData.targets.oee, 
              oeeData.trends.oee,
              thresholds.oee
            )}
          </div>
        );
      
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-500">
            Invalid display mode
          </div>
        );
    }
  };

  return (
    <div className="h-full w-full p-4 bg-gray-50 rounded-lg">
      <div className="h-full">
        {renderComponent()}
      </div>
    </div>
  );
}

// Default options for OEEPanel
export const oeePanelDefaults: OEEDisplayOptions = {
  showOverallOEE: true,
  showAvailability: true,
  showPerformance: true,
  showQuality: true,
  timeRange: {
    period: 'shift',
    rolling: false
  },
  targets: [
    { metric: 'availability', target: 85, tolerance: 5 },
    { metric: 'performance', target: 85, tolerance: 5 },
    { metric: 'quality', target: 99, tolerance: 1 },
    { metric: 'oee', target: 75, tolerance: 5 }
  ],
  alertThresholds: {
    availability: { good: 85, warning: 75 },
    performance: { good: 85, warning: 75 },
    quality: { good: 99, warning: 95 },
    oee: { good: 75, warning: 65 }
  },
  displayMode: 'gauge'
};