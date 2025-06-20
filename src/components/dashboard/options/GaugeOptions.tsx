'use client';

import React from 'react';

interface GaugeOptionsProps {
  options?: any;
  fieldConfig?: any;
  onChange?: (options?: any) => void;
  onFieldConfigChange?: (fieldConfig?: any) => void;
}

export default function GaugeOptions({
  options,
  fieldConfig,
  onChange,
  onFieldConfigChange
}: GaugeOptionsProps) {
  return (
    <div className="p-4 space-y-6">
      {/* Display */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Display</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Orientation
            </label>
            <select
              value={options?.orientation || 'auto'}
              onChange={(e) => onChange({ orientation: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="auto">Auto</option>
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
            </select>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={options?.showThresholdLabels !== false}
              onChange={(e) => onChange({ showThresholdLabels: e.target.checked })}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Show threshold labels</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={options?.showThresholdMarkers !== false}
              onChange={(e) => onChange({ showThresholdMarkers: e.target.checked })}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Show threshold markers</span>
          </label>
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
              placeholder="0"
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
              placeholder="100"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Unit
            </label>
            <select
              value={fieldConfig?.unit || 'short'}
              onChange={(e) => onFieldConfigChange({ unit: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="short">Short</option>
              <option value="percent">Percent</option>
              <option value="celsius">Celsius</option>
              <option value="fahrenheit">Fahrenheit</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}