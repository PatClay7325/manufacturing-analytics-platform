'use client';

import React, { useMemo } from 'react';

interface OEEGaugeProps {
  availability: number;
  performance: number;
  quality: number;
  title?: string;
  showComponents?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function OEEGauge({
  availability,
  performance,
  quality,
  title = 'Overall Equipment Effectiveness',
  showComponents = true,
  size = 'medium',
  className = ''
}: OEEGaugeProps) {
  // Calculate OEE
  const oee = useMemo(() => {
    return (availability / 100) * (performance / 100) * (quality / 100) * 100;
  }, [availability, performance, quality]);

  // Size configurations
  const sizeConfig = {
    small: { radius: 60, strokeWidth: 8, fontSize: 24 },
    medium: { radius: 80, strokeWidth: 10, fontSize: 32 },
    large: { radius: 100, strokeWidth: 12, fontSize: 40 }
  };

  const config = sizeConfig[size];
  const circumference = 2 * Math.PI * config.radius;
  const strokeDasharray = `${(oee / 100) * circumference} ${circumference}`;
  const strokeDashoffset = circumference * 0.25; // Start from top

  // Color based on OEE value
  const getColor = (value: number) => {
    if (value >= 85) return '#10b981'; // Green
    if (value >= 65) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  const gaugeColor = getColor(oee);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
      
      {/* Main OEE Gauge */}
      <div className="relative">
        <svg
          width={config.radius * 2 + 20}
          height={config.radius * 2 + 20}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={config.radius + 10}
            cy={config.radius + 10}
            r={config.radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={config.strokeWidth}
          />
          
          {/* OEE value circle */}
          <circle
            cx={config.radius + 10}
            cy={config.radius + 10}
            r={config.radius}
            fill="none"
            stroke={gaugeColor}
            strokeWidth={config.strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center transform rotate-90">
          <div className="text-center">
            <div 
              className="font-bold"
              style={{ fontSize: config.fontSize, color: gaugeColor }}
            >
              {oee.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">OEE</div>
          </div>
        </div>
      </div>

      {/* Component breakdown */}
      {showComponents && (
        <div className="mt-6 w-full space-y-3">
          <ComponentBar
            label="Availability"
            value={availability}
            color="#3b82f6"
            icon="🏭"
          />
          <ComponentBar
            label="Performance"
            value={performance}
            color="#8b5cf6"
            icon="⚡"
          />
          <ComponentBar
            label="Quality"
            value={quality}
            color="#10b981"
            icon="✓"
          />
        </div>
      )}
    </div>
  );
}

interface ComponentBarProps {
  label: string;
  value: number;
  color: string;
  icon: string;
}

function ComponentBar({ label, value, color, icon }: ComponentBarProps) {
  return (
    <div className="flex items-center space-x-3">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm font-semibold">{value.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${value}%`,
              backgroundColor: color
            }}
          />
        </div>
      </div>
    </div>
  );
}