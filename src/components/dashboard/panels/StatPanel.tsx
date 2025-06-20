'use client';

import React, { useMemo } from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Panel } from '@/types/dashboard';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface StatPanelProps {
  panel?: Panel;
  data?: any;
  height?: string | number;
  width?: string | number;
}

export default function StatPanel({
  panel,
  data,
  height = '100%',
  width = '100%'
}: StatPanelProps) {
  const options = panel?.options || {};
  const fieldConfig = panel?.fieldConfig?.defaults || {};

  // Calculate stat value
  const { value, trend, sparklineData } = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      // Sample data for demo
      const sampleData = Array.from({ length: 20 }, (_, i) => ({
        time: Date.now() - (19 - i) * 60000,
        value: Math.random() * 100 + 50
      }));
      
      const lastValue = sampleData[sampleData?.length - 1].value;
      const previousValue = sampleData[sampleData?.length - 2].value;
      const trendValue = ((lastValue - previousValue) / previousValue) * 100;

      return {
        value: lastValue,
        trend: trendValue,
        sparklineData: sampleData
      };
    }

    // Process real data
    const lastPoint = data[data?.length - 1];
    const value = lastPoint?.value || 0;
    const previousPoint = data[data?.length - 2];
    const trend = previousPoint ? ((value - previousPoint?.value) / previousPoint?.value) * 100 : 0;

    return { value, trend, sparklineData: data };
  }, [data]);

  // Format value based on unit
  const formatValue = (val: number) => {
    const decimals = fieldConfig?.decimals ?? 1;
    
    switch (fieldConfig?.unit) {
      case 'percent':
        return `${val?.toFixed(decimals)}%`;
      case 'bytes':
        if (val >= 1e9) return `${(val / 1e9).toFixed(decimals)} GB`;
        if (val >= 1e6) return `${(val / 1e6).toFixed(decimals)} MB`;
        if (val >= 1e3) return `${(val / 1e3).toFixed(decimals)} KB`;
        return `${val?.toFixed(decimals)} B`;
      case 'seconds':
        if (val >= 3600) return `${(val / 3600).toFixed(decimals)} h`;
        if (val >= 60) return `${(val / 60).toFixed(decimals)} m`;
        return `${val?.toFixed(decimals)} s`;
      case 'currency':
        return `$${val?.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
      default:
        if (val >= 1e6) return `${(val / 1e6).toFixed(decimals)}M`;
        if (val >= 1e3) return `${(val / 1e3).toFixed(decimals)}K`;
        return val?.toFixed(decimals);
    }
  };

  // Get color based on thresholds
  const getValueColor = () => {
    if (!fieldConfig?.thresholds?.steps) {
      return options?.colorMode === 'value' ? '#10b981' : undefined;
    }

    const thresholds = [...fieldConfig?.thresholds.steps].sort((a, b) => a?.value - b?.value);
    
    for (let i = thresholds?.length - 1; i >= 0; i--) {
      if (value >= thresholds[i].value) {
        return thresholds[i].color;
      }
    }
    
    return thresholds[0]?.color || '#10b981';
  };

  const valueColor = getValueColor();

  return (
    <div 
      style={{ width, height }} 
      className="flex flex-col justify-center items-center p-4"
    >
      <div className="w-full max-w-md">
        {/* Title */}
        {options?.displayName !== false && panel?.title && (
          <h3 className="text-sm font-medium text-gray-400 text-center mb-2">
            {panel?.title}
          </h3>
        )}

        {/* Main Value */}
        <div 
          className="text-center"
          style={{
            color: options.colorMode === 'value' ? valueColor : undefined,
            backgroundColor: options.colorMode === 'background' ? valueColor : undefined,
            padding: options.colorMode === 'background' ? '1rem' : undefined,
            borderRadius: options.colorMode === 'background' ? '0.5rem' : undefined
          }}
        >
          <div 
            className="font-bold leading-none"
            style={{
              fontSize: options.textSize || '3rem'
            }}
          >
            {formatValue(value)}
          </div>

          {/* Trend */}
          {options?.showTrend && (
            <div className="flex items-center justify-center gap-1 mt-2">
              {trend > 0 ? (
                <ArrowUpIcon className="w-4 h-4 text-green-500" />
              ) : trend < 0 ? (
                <ArrowDownIcon className="w-4 h-4 text-red-500" />
              ) : null}
              <span 
                className={`text-sm ${
                  trend > 0 ? 'text-green-500' : trend < 0 ? 'text-red-500' : 'text-gray-500'
                }`}
              >
                {Math.abs(trend).toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Sparkline */}
        {options?.graphMode === 'area' && sparklineData && (
          <div className="h-16 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={valueColor || '#3b82f6'}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Subtitle */}
        {options?.text && (
          <p className="text-xs text-gray-500 text-center mt-2">
            {options?.text}
          </p>
        )}
      </div>
    </div>
  );
}