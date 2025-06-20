'use client';

import React from 'react';

interface TimeSeriesOptionsProps {
  options?: any;
  fieldConfig?: any;
  onChange?: (options?: any) => void;
  onFieldConfigChange?: (fieldConfig?: any) => void;
}

export default function TimeSeriesOptions({
  options,
  fieldConfig,
  onChange,
  onFieldConfigChange
}: TimeSeriesOptionsProps) {
  return (
    <div className="p-4 space-y-6">
      {/* Graph Styles */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Graph Styles</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Style
            </label>
            <select
              value={options?.graphStyle || 'line'}
              onChange={(e) => onChange({ graphStyle: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="line">Lines</option>
              <option value="area">Area</option>
              <option value="bars">Bars</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Line interpolation
            </label>
            <select
              value={options?.lineInterpolation || 'linear'}
              onChange={(e) => onChange({ lineInterpolation: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="linear">Linear</option>
              <option value="smooth">Smooth</option>
              <option value="stepBefore">Step before</option>
              <option value="stepAfter">Step after</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Line width
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={options?.lineWidth || 2}
              onChange={(e) => onChange({ lineWidth: Number(e?.target.value) })}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">
              {options?.lineWidth || 2}px
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Fill opacity
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={(options?.fillOpacity || 0.1) * 100}
              onChange={(e) => onChange({ fillOpacity: Number(e.target.value) / 100 })}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">
              {Math.round((options?.fillOpacity || 0.1) * 100)}%
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Point size
            </label>
            <select
              value={options?.showPoints || 'auto'}
              onChange={(e) => onChange({ showPoints: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="auto">Auto</option>
              <option value="never">Never</option>
              <option value="always">Always</option>
            </select>
          </div>
        </div>
      </div>

      {/* Axis */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Axis</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={options?.showGridLines !== false}
              onChange={(e) => onChange({ showGridLines: e.target.checked })}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Show grid lines</span>
          </label>
        </div>
      </div>

      {/* Legend */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Legend</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={options?.legend?.show !== false}
              onChange={(e) => onChange({ 
                legend: { ...options?.legend, show: e.target.checked } 
              })}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Show legend</span>
          </label>

          {options?.legend?.show !== false && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Legend placement
              </label>
              <select
                value={options?.legend?.placement || 'bottom'}
                onChange={(e) => onChange({ 
                  legend: { ...options?.legend, placement: e.target.value } 
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              >
                <option value="bottom">Bottom</option>
                <option value="right">Right</option>
                <option value="top">Top</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Standard options */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Standard Options</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Min
            </label>
            <input
              type="number"
              value={fieldConfig?.min || ''}
              onChange={(e) => onFieldConfigChange({ min: e.target.value ? Number(e?.target.value) : undefined })}
              placeholder="Auto"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Max
            </label>
            <input
              type="number"
              value={fieldConfig?.max || ''}
              onChange={(e) => onFieldConfigChange({ max: e.target.value ? Number(e?.target.value) : undefined })}
              placeholder="Auto"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}