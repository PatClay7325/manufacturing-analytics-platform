'use client';

import React, { useMemo } from 'react';
import { Panel } from '@/types/dashboard';

interface GaugePanelProps {
  panel?: Panel;
  data?: any;
  height?: string | number;
  width?: string | number;
}

export default function GaugePanel({
  panel,
  data,
  height = '100%',
  width = '100%'
}: GaugePanelProps) {
  const options = panel?.options || {};
  const fieldConfig = panel?.fieldConfig?.defaults || {};

  // Get value from data
  const value = useMemo(() => {
    if (!data) {
      // Demo value
      return 75.5;
    }
    if (Array.isArray(data) && data?.length > 0) {
      const lastPoint = data[data?.length - 1];
      return lastPoint?.value || 0;
    }
    return data?.value || 0;
  }, [data]);

  // Configuration
  const min = fieldConfig?.min ?? 0;
  const max = fieldConfig?.max ?? 100;
  const decimals = fieldConfig?.decimals ?? 1;
  const unit = fieldConfig?.unit || '';

  // Calculate percentage and angle
  const percentage = ((value - min) / (max - min)) * 100;
  const angle = (percentage / 100) * 270 - 135; // 270 degree arc, starting at -135

  // Get color based on thresholds
  const getColor = () => {
    if (!fieldConfig?.thresholds?.steps) return '#10b981';

    const thresholds = [...fieldConfig?.thresholds.steps].sort((a, b) => a?.value - b?.value);
    
    for (let i = thresholds?.length - 1; i >= 0; i--) {
      if (value >= thresholds[i].value) {
        return thresholds[i].color;
      }
    }
    
    return thresholds[0]?.color || '#10b981';
  };

  const gaugeColor = getColor();

  // Format value
  const formatValue = (val: number) => {
    if (unit === 'percent') return `${val?.toFixed(decimals)}%`;
    return `${val?.toFixed(decimals)}${unit ? ` ${unit}` : ''}`;
  };

  // Render threshold markers
  const renderThresholdMarkers = () => {
    if (!options?.showThresholdMarkers || !fieldConfig?.thresholds?.steps) return null;

    return fieldConfig?.thresholds.steps?.map((threshold, index) => {
      if (index === 0) return null; // Skip base threshold
      
      const thresholdPercentage = ((threshold?.value - min) / (max - min)) * 100;
      const thresholdAngle = (thresholdPercentage / 100) * 270 - 135;
      
      return (
        <line
          key={index}
          x1="50"
          y1="50"
          x2="50"
          y2="15"
          stroke={threshold?.color}
          strokeWidth="2"
          transform={`rotate(${thresholdAngle} 50 50)`}
        />
      );
    });
  };

  // Render orientation (radial or horizontal)
  if (options?.orientation === 'horizontal') {
    return (
      <div style={{ width, height }} className="flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Title */}
          {panel?.title && (
            <h3 className="text-sm font-medium text-gray-400 mb-2">{panel?.title}</h3>
          )}
          
          {/* Horizontal Gauge */}
          <div className="relative">
            {/* Background track */}
            <div className="w-full h-8 bg-gray-700 rounded-full overflow-hidden">
              {/* Filled portion */}
              <div
                className="h-full transition-all duration-500 ease-out rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, percentage))}%`,
                  backgroundColor: gaugeColor
                }}
              />
            </div>
            
            {/* Value display */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-lg drop-shadow-md">
                {formatValue(value)}
              </span>
            </div>

            {/* Min/Max labels */}
            {options?.showThresholdLabels && (
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">{min}</span>
                <span className="text-xs text-gray-500">{max}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Radial gauge (default)
  return (
    <div style={{ width, height }} className="flex flex-col items-center justify-center p-4">
      <div className="relative">
        {/* SVG Gauge */}
        <svg
          width="200"
          height="200"
          viewBox="0 0 100 100"
          className="transform -rotate-90"
        >
          {/* Background arc */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#374151"
            strokeWidth="8"
            strokeDasharray="188.5 62.83"
            transform="rotate(135 50 50)"
          />
          
          {/* Value arc */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={gaugeColor}
            strokeWidth="8"
            strokeDasharray={`${(percentage / 100) * 188.5} 251.33`}
            transform="rotate(135 50 50)"
            className="transition-all duration-500 ease-out"
          />

          {/* Threshold markers */}
          <g className="transform rotate-90" transform="rotate(90 50 50)">
            {renderThresholdMarkers()}
          </g>
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-white">
            {formatValue(value)}
          </div>
          {panel?.title && (
            <div className="text-sm text-gray-400 mt-1">
              {panel?.title}
            </div>
          )}
        </div>
      </div>

      {/* Min/Max labels */}
      {options?.showThresholdLabels && (
        <div className="flex justify-between w-full max-w-[200px] mt-2">
          <span className="text-xs text-gray-500">{min}</span>
          <span className="text-xs text-gray-500">{max}</span>
        </div>
      )}
    </div>
  );
}