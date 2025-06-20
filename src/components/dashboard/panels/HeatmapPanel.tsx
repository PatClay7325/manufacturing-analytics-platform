'use client';

import React from 'react';
import { Panel } from '@/types/dashboard';

interface HeatmapPanelProps {
  panel?: Panel;
  data?: any[];
  height?: string | number;
  width?: string | number;
}

export default function HeatmapPanel({ panel, data = [], height, width }: HeatmapPanelProps) {
  const options = panel?.options || {};
  const colorScheme = options.color?.scheme || 'Greens';
  
  // Simple heatmap implementation using CSS grid
  // In a real implementation, you would use a library like D3.js or Plotly
  
  // Ensure data is an array
  const safeData = Array.isArray(data) ? data : [];
  
  // Generate sample heatmap data if none provided
  const heatmapData = safeData.length > 0 ? safeData : generateSampleData();
  
  // Calculate color based on value
  const getColor = (value: number, min: number, max: number) => {
    const normalized = (value - min) / (max - min);
    const intensity = Math.floor(normalized * 255);
    
    switch (colorScheme) {
      case 'Blues':
        return `rgb(${255 - intensity}, ${255 - intensity}, 255)`;
      case 'Reds':
        return `rgb(255, ${255 - intensity}, ${255 - intensity})`;
      case 'Greens':
      default:
        return `rgb(${255 - intensity}, 255, ${255 - intensity})`;
    }
  };
  
  // Find min and max values
  const values = heatmapData.flatMap(row => row.values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  return (
    <div style={{ height, width }} className="heatmap-panel p-4 overflow-auto">
      <div className="heatmap-container">
        {/* Y-axis labels */}
        <div className="flex">
          <div className="flex flex-col justify-around pr-2">
            {heatmapData.map((row, i) => (
              <div key={i} className="text-xs text-gray-400 h-6 flex items-center">
                {row.label}
              </div>
            ))}
          </div>
          
          {/* Heatmap grid */}
          <div className="flex-1">
            {/* X-axis labels */}
            <div className="flex mb-1">
              {heatmapData[0]?.values.map((_, i) => (
                <div key={i} className="flex-1 text-xs text-gray-400 text-center">
                  {`T${i}`}
                </div>
              ))}
            </div>
            
            {/* Heatmap cells */}
            {heatmapData.map((row, rowIndex) => (
              <div key={rowIndex} className="flex">
                {row.values.map((value: number, colIndex: number) => (
                  <div
                    key={colIndex}
                    className="flex-1 h-6 border border-gray-700 flex items-center justify-center text-xs"
                    style={{ 
                      backgroundColor: getColor(value, min, max),
                      color: value > (max - min) / 2 + min ? '#000' : '#fff'
                    }}
                    title={`${row.label} - T${colIndex}: ${value}`}
                  >
                    {options.showValues !== false && value.toFixed(0)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        
        {/* Color scale legend */}
        <div className="mt-4 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{min.toFixed(0)}</span>
            <div className="w-32 h-4 flex">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{ backgroundColor: getColor(min + (max - min) * (i / 9), min, max) }}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400">{max.toFixed(0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateSampleData() {
  const rows = ['Line 1', 'Line 2', 'Line 3', 'Line 4', 'Line 5'];
  const cols = 10;
  
  return rows.map(label => ({
    label,
    values: Array.from({ length: cols }, () => Math.floor(Math.random() * 100))
  }));
}