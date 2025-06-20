'use client';

import React, { useEffect, useRef, useState } from 'react';

interface AnalogGaugeProps {
  value?: number;
  min?: number;
  max?: number;
  unit?: string;
  label?: string;
  color?: string;
  size?: number;
  smoothing?: number; // Smoothing factor (0-1, higher = smoother)
}

export default function AnalogGauge({
  value,
  min = 0,
  max = 100,
  unit = '',
  label = '',
  color = '#3b82f6',
  size = 200,
  smoothing = 0.95 // High smoothing for analog-like movement
}: AnalogGaugeProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const animationRef = useRef<number>();
  const targetRef = useRef(value);

  useEffect(() => {
    targetRef.current = value;

    const animate = () => {
      setDisplayValue(current => {
        const target = targetRef?.current;
        const diff = target - current;
        
        // Smooth exponential approach to target
        const newValue = current + diff * (1 - smoothing);
        
        // Continue animation if we're not close enough
        if (Math.abs(diff) > 0.01) {
          animationRef.current = requestAnimationFrame(animate);
        }
        
        return newValue;
      });
    };

    animate();

    return () => {
      if (animationRef?.current) {
        cancelAnimationFrame(animationRef?.current);
      }
    };
  }, [value, smoothing]);

  const radius = size / 2 - 20;
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Calculate angle for the needle (180 degrees arc)
  const percentage = Math.max(0, Math.min(1, (displayValue - min) / (max - min)));
  const angle = -90 + (percentage * 180); // -90 to 90 degrees
  
  // Calculate needle position
  const needleLength = radius * 0.8;
  const needleX = centerX + needleLength * Math.cos((angle * Math.PI) / 180);
  const needleY = centerY + needleLength * Math.sin((angle * Math.PI) / 180);

  // Create tick marks
  const ticks = [];
  for (let i = 0; i <= 10; i++) {
    const tickAngle = -90 + (i * 18); // 18 degrees per tick
    const tickValue = min + (i / 10) * (max - min);
    const tickLength = i % 5 === 0 ? 15 : 8; // Major/minor ticks
    
    const x1 = centerX + (radius - tickLength) * Math.cos((tickAngle * Math.PI) / 180);
    const y1 = centerY + (radius - tickLength) * Math.sin((tickAngle * Math.PI) / 180);
    const x2 = centerX + radius * Math.cos((tickAngle * Math.PI) / 180);
    const y2 = centerY + radius * Math.sin((tickAngle * Math.PI) / 180);
    
    ticks?.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#6b7280"
        strokeWidth={i % 5 === 0 ? 2 : 1}
      />
    );

    // Add labels for major ticks
    if (i % 5 === 0) {
      const labelX = centerX + (radius - 25) * Math.cos((tickAngle * Math.PI) / 180);
      const labelY = centerY + (radius - 25) * Math.sin((tickAngle * Math.PI) / 180);
      
      ticks?.push(
        <text
          key={`label-${i}`}
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="10"
          fill="#6b7280"
        >
          {tickValue?.toFixed(0)}
        </text>
      );
    }
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="drop-shadow-sm">
        {/* Outer circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="2"
        />
        
        {/* Arc background */}
        <path
          d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth="8"
          strokeLinecap="round"
        />
        
        {/* Value arc */}
        <path
          d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius * Math.cos((angle * Math.PI) / 180)} ${centerY + radius * Math.sin((angle * Math.PI) / 180)}`}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          style={{ transition: 'all 0.1s ease-out' }}
        />
        
        {/* Tick marks and labels */}
        {ticks}
        
        {/* Center dot */}
        <circle
          cx={centerX}
          cy={centerY}
          r="4"
          fill={color}
        />
        
        {/* Needle */}
        <line
          x1={centerX}
          y1={centerY}
          x2={needleX}
          y2={needleY}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          style={{ transition: 'all 0.1s ease-out' }}
        />
        
        {/* Current value text */}
        <text
          x={centerX}
          y={centerY + 40}
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
          fill={color}
        >
          {displayValue?.toFixed(1)}{unit}
        </text>
        
        {/* Label */}
        {label && (
          <text
            x={centerX}
            y={centerY + 60}
            textAnchor="middle"
            fontSize="12"
            fill="#6b7280"
          >
            {label}
          </text>
        )}
      </svg>
    </div>
  );
}