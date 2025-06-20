'use client';

import React, { useMemo } from 'react';
import { TrendingUpIcon, TrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline';

interface StatPanelProps {
  title?: string;
  value: number | string;
  unit?: string;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  sparklineData?: Array<{ time: string; value: number }>;
  thresholds?: Array<{ value: number; color: string }>;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  graphMode?: 'none' | 'area' | 'line';
  colorMode?: 'value' | 'background';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export default function StatPanel({
  title,
  value,
  unit = '',
  decimals = 0,
  prefix = '',
  suffix = '',
  sparklineData = [],
  thresholds = [],
  trend,
  graphMode = 'none',
  colorMode = 'value',
  orientation = 'horizontal',
  className = ''
}: StatPanelProps) {
  // Format the display value
  const formattedValue = useMemo(() => {
    if (typeof value === 'string') return value;
    
    let formatted = value.toFixed(decimals);
    
    // Add thousand separators
    formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    return `${prefix}${formatted}${suffix} ${unit}`.trim();
  }, [value, decimals, prefix, suffix, unit]);

  // Determine color based on thresholds
  const getColor = useMemo(() => {
    if (!thresholds.length) return '#10b981'; // Default green
    
    const numValue = typeof value === 'number' ? value : parseFloat(value);
    
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (numValue >= thresholds[i].value) {
        return thresholds[i].color;
      }
    }
    
    return thresholds[0].color;
  }, [value, thresholds]);

  // Calculate sparkline path
  const sparklinePath = useMemo(() => {
    if (!sparklineData.length || graphMode === 'none') return '';
    
    const width = 100;
    const height = 40;
    const padding = 2;
    
    const values = sparklineData.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    
    const points = sparklineData.map((d, i) => {
      const x = (i / (sparklineData.length - 1)) * (width - 2 * padding) + padding;
      const y = height - ((d.value - min) / range) * (height - 2 * padding) - padding;
      return `${x},${y}`;
    });
    
    if (graphMode === 'area') {
      return `M${points.join(' L')} L${width - padding},${height} L${padding},${height} Z`;
    }
    
    return `M${points.join(' L')}`;
  }, [sparklineData, graphMode]);

  // Trend icon
  const TrendIcon = trend?.direction === 'up' ? TrendingUpIcon : 
                   trend?.direction === 'down' ? TrendingDownIcon : 
                   MinusIcon;

  const isVertical = orientation === 'vertical';
  const statColor = colorMode === 'value' ? getColor : undefined;
  const bgColor = colorMode === 'background' ? getColor : undefined;

  return (
    <div 
      className={`p-4 rounded-lg ${className}`}
      style={{ 
        backgroundColor: bgColor ? `${bgColor}20` : undefined,
        borderColor: bgColor,
        borderWidth: bgColor ? 1 : 0
      }}
    >
      {title && (
        <h3 className="text-sm font-medium text-gray-600 mb-2">{title}</h3>
      )}
      
      <div className={`flex ${isVertical ? 'flex-col' : 'flex-row'} items-center justify-between gap-4`}>
        <div className={`flex ${isVertical ? 'flex-col items-center' : 'flex-row items-baseline'} gap-2`}>
          <div 
            className="text-3xl font-bold"
            style={{ color: statColor }}
          >
            {formattedValue}
          </div>
          
          {trend && (
            <div className={`flex items-center gap-1 text-sm ${
              trend.direction === 'up' ? 'text-green-600' : 
              trend.direction === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              <TrendIcon className="w-4 h-4" />
              <span>{Math.abs(trend.value).toFixed(1)}%</span>
            </div>
          )}
        </div>
        
        {graphMode !== 'none' && sparklineData.length > 0 && (
          <div className="flex-shrink-0">
            <svg width="100" height="40" className="opacity-50">
              {graphMode === 'area' ? (
                <path
                  d={sparklinePath}
                  fill={getColor}
                  fillOpacity={0.3}
                  stroke={getColor}
                  strokeWidth={2}
                />
              ) : (
                <path
                  d={sparklinePath}
                  fill="none"
                  stroke={getColor}
                  strokeWidth={2}
                />
              )}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}