/**
 * Adaptive Factory Manufacturing Intelligence Platform
 * Stat Panel - Display single value statistics with trends
 * 
 * Original implementation for manufacturing KPI visualization
 */

'use client';

import React, { useMemo } from 'react';
import { PanelProps } from '@/core/panels/PanelRegistry';
import { StatPanelOptions, BigValueTextMode, BigValueColorMode } from '@/types/panel';

interface StatPanelData {
  value: number;
  previousValue?: number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendPercentage?: number;
}

export default function StatPanel({ 
  data, 
  options, 
  width, 
  height, 
  fieldConfig 
}: PanelProps<StatPanelOptions>) {
  
  const statData = useMemo((): StatPanelData => {
    if (!data || !data.length || !data[0].fields.length) {
      return { value: 0 };
    }

    const frame = data[0];
    const valueField = frame.fields.find(field => field.type === 'number');
    
    if (!valueField || !valueField.values.length) {
      return { value: 0 };
    }

    const values = valueField.values;
    const currentValue = values[values.length - 1] || 0;
    const previousValue = values.length > 1 ? values[values.length - 2] : undefined;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    let trendPercentage = 0;
    
    if (previousValue !== undefined && previousValue !== 0) {
      const change = ((currentValue - previousValue) / previousValue) * 100;
      trendPercentage = Math.abs(change);
      
      if (change > 0.1) trend = 'up';
      else if (change < -0.1) trend = 'down';
      else trend = 'stable';
    }

    return {
      value: currentValue,
      previousValue,
      unit: fieldConfig.defaults.unit,
      trend,
      trendPercentage
    };
  }, [data, fieldConfig]);

  const getValueColor = (): string => {
    if (!fieldConfig.defaults.thresholds?.steps) return 'text-gray-900';
    
    const thresholds = fieldConfig.defaults.thresholds.steps;
    const value = statData.value;
    
    for (let i = thresholds.length - 1; i >= 0; i--) {
      const threshold = thresholds[i];
      if (threshold.value === null || value >= threshold.value) {
        switch (threshold.color) {
          case 'red': return 'text-red-600';
          case 'yellow': return 'text-yellow-600';
          case 'green': return 'text-green-600';
          case 'blue': return 'text-blue-600';
          default: return 'text-gray-900';
        }
      }
    }
    
    return 'text-gray-900';
  };

  const getBackgroundColor = (): string => {
    if (options.colorMode !== 'background' && options.colorMode !== 'background_solid') {
      return 'bg-white';
    }
    
    if (!fieldConfig.defaults.thresholds?.steps) return 'bg-white';
    
    const thresholds = fieldConfig.defaults.thresholds.steps;
    const value = statData.value;
    
    for (let i = thresholds.length - 1; i >= 0; i--) {
      const threshold = thresholds[i];
      if (threshold.value === null || value >= threshold.value) {
        switch (threshold.color) {
          case 'red': return options.colorMode === 'background_solid' ? 'bg-red-100' : 'bg-red-50';
          case 'yellow': return options.colorMode === 'background_solid' ? 'bg-yellow-100' : 'bg-yellow-50';
          case 'green': return options.colorMode === 'background_solid' ? 'bg-green-100' : 'bg-green-50';
          case 'blue': return options.colorMode === 'background_solid' ? 'bg-blue-100' : 'bg-blue-50';
          default: return 'bg-white';
        }
      }
    }
    
    return 'bg-white';
  };

  const formatValue = (value: number): string => {
    if (statData.unit) {
      return `${value.toLocaleString()}${statData.unit}`;
    }
    return value.toLocaleString();
  };

  const getTrendIcon = () => {
    if (!statData.trend || statData.trend === 'stable') return null;
    
    const iconClass = statData.trend === 'up' ? 'text-green-500' : 'text-red-500';
    const arrow = statData.trend === 'up' ? '↗' : '↘';
    
    return (
      <span className={`inline-flex items-center text-sm font-medium ${iconClass}`}>
        {arrow} {statData.trendPercentage?.toFixed(1)}%
      </span>
    );
  };

  const getValueSize = (): string => {
    if (options.text?.valueSize) {
      return `text-${options.text.valueSize}xl`;
    }
    
    // Auto-size based on panel dimensions
    if (width < 200) return 'text-2xl';
    if (width < 300) return 'text-3xl';
    if (width < 400) return 'text-4xl';
    return 'text-5xl';
  };

  const getTitleSize = (): string => {
    if (options.text?.titleSize) {
      return `text-${options.text.titleSize}xl`;
    }
    
    if (width < 200) return 'text-sm';
    if (width < 300) return 'text-base';
    return 'text-lg';
  };

  const shouldShowTitle = (): boolean => {
    return options.textMode !== 'value' && options.textMode !== 'none';
  };

  const shouldShowValue = (): boolean => {
    return options.textMode !== 'name' && options.textMode !== 'none';
  };

  const getJustifyClass = (): string => {
    switch (options.justifyMode) {
      case 'center': return 'justify-center text-center';
      default: return 'justify-start text-left';
    }
  };

  const getOrientationClass = (): string => {
    if (options.orientation === 'horizontal') {
      return 'flex-row items-center space-x-4';
    }
    return 'flex-col items-start space-y-2';
  };

  return (
    <div 
      className={`h-full w-full rounded-lg border border-gray-200 ${getBackgroundColor()} ${
        options.transparent ? 'bg-transparent border-transparent' : ''
      }`}
      style={{ width, height }}
    >
      <div className={`h-full flex ${getOrientationClass()} ${getJustifyClass()} p-4`}>
        {shouldShowTitle() && (
          <div className={`${getTitleSize()} font-medium text-gray-600 truncate`}>
            {fieldConfig.defaults.displayName || 'Stat'}
          </div>
        )}
        
        {shouldShowValue() && (
          <div className="flex flex-col items-start space-y-1">
            <div className={`${getValueSize()} font-bold ${getValueColor()} leading-none`}>
              {formatValue(statData.value)}
            </div>
            
            {statData.trend && statData.trend !== 'stable' && (
              <div className="flex items-center space-x-2">
                {getTrendIcon()}
                {statData.previousValue !== undefined && (
                  <span className="text-xs text-gray-500">
                    from {formatValue(statData.previousValue)}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mini graph for graphMode */}
        {options.graphMode === 'area' && data[0]?.fields[0]?.values.length > 1 && (
          <div className="flex-1 min-h-0">
            <MiniSparkline 
              values={data[0].fields[0].values.slice(-20)} 
              color={getValueColor()}
              mode="area"
            />
          </div>
        )}
        
        {options.graphMode === 'line' && data[0]?.fields[0]?.values.length > 1 && (
          <div className="flex-1 min-h-0">
            <MiniSparkline 
              values={data[0].fields[0].values.slice(-20)} 
              color={getValueColor()}
              mode="line"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Mini sparkline component for graph modes
function MiniSparkline({ 
  values, 
  color, 
  mode 
}: { 
  values: number[]; 
  color: string; 
  mode: 'line' | 'area'; 
}) {
  const svgPath = useMemo(() => {
    if (values.length < 2) return '';
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    if (range === 0) return '';
    
    const width = 100;
    const height = 20;
    
    const points = values.map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    });
    
    const pathData = `M ${points.join(' L ')}`;
    
    if (mode === 'area') {
      return `${pathData} L ${width},${height} L 0,${height} Z`;
    }
    
    return pathData;
  }, [values, mode]);

  if (!svgPath) return null;

  return (
    <svg 
      width="100%" 
      height="20" 
      viewBox="0 0 100 20" 
      className="opacity-60"
    >
      <path
        d={svgPath}
        fill={mode === 'area' ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={mode === 'line' ? 1.5 : 0}
        className={color}
        fillOpacity={mode === 'area' ? 0.3 : 0}
      />
    </svg>
  );
}

// Default options for StatPanel
export const statPanelDefaults: StatPanelOptions = {
  reduceOptions: {
    calcs: ['lastNotNull'],
    fields: '',
    values: false
  },
  orientation: 'auto',
  textMode: 'auto',
  colorMode: 'value',
  graphMode: 'none',
  justifyMode: 'auto'
};