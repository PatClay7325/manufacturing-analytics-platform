'use client';

import React, { useMemo } from 'react';
import { Panel } from '@/types/dashboard';

interface GaugePanelProps {
  panel?: Panel;
  data?: any;
  height?: string | number;
  width?: string | number;
}

function GaugePanel({
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

  // Get color based on thresholds - Professional colors
  const getColor = () => {
    if (!fieldConfig?.thresholds?.steps) return '#059669'; // Professional green

    const thresholds = [...fieldConfig?.thresholds.steps].sort((a, b) => a?.value - b?.value);
    
    // Convert color names to professional hex values
    const colorMap = {
      'green': '#059669',
      'yellow': '#ea580c', 
      'red': '#dc2626',
      'blue': '#2563eb',
      'purple': '#7c3aed',
      'cyan': '#0891b2',
      'pink': '#be185d',
      'lime': '#65a30d'
    };
    
    for (let i = thresholds?.length - 1; i >= 0; i--) {
      if (value >= thresholds[i].value) {
        const color = thresholds[i].color;
        return colorMap[color as keyof typeof colorMap] || color || '#059669';
      }
    }
    
    const firstColor = thresholds[0]?.color;
    return colorMap[firstColor as keyof typeof colorMap] || firstColor || '#059669';
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

    const colorMap = {
      'green': '#059669',
      'yellow': '#ea580c', 
      'red': '#dc2626',
      'blue': '#2563eb',
      'purple': '#7c3aed',
      'cyan': '#0891b2',
      'pink': '#be185d',
      'lime': '#65a30d'
    };

    return fieldConfig?.thresholds.steps?.map((threshold, index) => {
      if (index === 0) return null; // Skip base threshold
      
      const thresholdPercentage = ((threshold?.value - min) / (max - min)) * 100;
      const thresholdAngle = (thresholdPercentage / 100) * 270 - 135;
      const color = colorMap[threshold?.color as keyof typeof colorMap] || threshold?.color || '#059669';
      
      return (
        <line
          key={index}
          x1="50"
          y1="50"
          x2="50"
          y2="15"
          stroke={color}
          strokeWidth="1.5"
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
            <h3 className="text-sm font-medium text-gray-700 mb-2">{panel?.title}</h3>
          )}
          
          {/* Horizontal Gauge */}
          <div className="relative">
            {/* Background track */}
            <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
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
              <span className="text-gray-900 font-bold text-lg drop-shadow-sm">
                {formatValue(value)}
              </span>
            </div>

            {/* Min/Max labels */}
            {options?.showThresholdLabels && (
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-600 font-medium">{min}</span>
                <span className="text-xs text-gray-600 font-medium">{max}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Radial gauge (default)
  return (
    <div style={{ width, height }} className="flex flex-col items-center justify-center p-2">
      <div className="relative flex-1 flex items-center justify-center">
        {/* SVG Gauge - Responsive sizing */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          className="transform -rotate-90 max-w-[180px] max-h-[180px]"
          style={{ aspectRatio: '1' }}
        >
          {/* Background arc */}
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="6"
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
            strokeWidth="6"
            strokeDasharray={`${(percentage / 100) * 188.5} 251.33`}
            transform="rotate(135 50 50)"
            className="transition-all duration-700 ease-out"
            strokeLinecap="round"
          />

          {/* Threshold markers */}
          <g className="transform rotate-90" transform="rotate(90 50 50)">
            {renderThresholdMarkers()}
          </g>
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-gray-900 leading-tight">
            {formatValue(value)}
          </div>
          {panel?.title && (
            <div className="text-xs text-gray-600 mt-1 text-center font-medium">
              {panel?.title}
            </div>
          )}
        </div>
      </div>

      {/* Min/Max labels */}
      {options?.showThresholdLabels && (
        <div className="flex justify-between w-full max-w-[180px] mt-3">
          <span className="text-xs text-gray-600 font-medium">{min}</span>
          <span className="text-xs text-gray-600 font-medium">{max}</span>
        </div>
      )}
    </div>
  );
}

export default GaugePanel;
export { GaugePanel };