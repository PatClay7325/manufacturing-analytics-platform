'use client';

import React from 'react';

interface StatOptionsProps {
  options?: any;
  fieldConfig?: any;
  onChange?: (options?: any) => void;
  onFieldConfigChange?: (fieldConfig?: any) => void;
}

export default function StatOptions({
  options,
  fieldConfig,
  onChange,
  onFieldConfigChange
}: StatOptionsProps) {
  return (
    <div className="p-4 space-y-6">
      {/* Value */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Value</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Show
            </label>
            <select
              value={options?.textMode || 'value'}
              onChange={(e) => onChange({ textMode: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="value">Value</option>
              <option value="value_and_name">Value and name</option>
              <option value="name">Name</option>
              <option value="none">None</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Color mode
            </label>
            <select
              value={options?.colorMode || 'none'}
              onChange={(e) => onChange({ colorMode: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="none">None</option>
              <option value="value">Value</option>
              <option value="background">Background</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Graph mode
            </label>
            <select
              value={options?.graphMode || 'none'}
              onChange={(e) => onChange({ graphMode: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="none">None</option>
              <option value="area">Area</option>
              <option value="line">Line</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Text size
            </label>
            <input
              type="range"
              min="1"
              max="5"
              step="0.1"
              value={parseFloat(options?.textSize?.replace('rem', '')) || 2}
              onChange={(e) => onChange({ textSize: `${e.target.value}rem` })}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">
              {options?.textSize || '2rem'}
            </div>
          </div>
        </div>
      </div>

      {/* Options */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Options</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={options?.showTrend !== false}
              onChange={(e) => onChange({ showTrend: e.target.checked })}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Show trend</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={options?.reduceOptions?.values !== false}
              onChange={(e) => onChange({ 
                reduceOptions: { ...options?.reduceOptions, values: e.target.checked } 
              })}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">All values</span>
          </label>
        </div>
      </div>

      {/* Text */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Text</h3>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Title
          </label>
          <input
            type="text"
            value={options?.text || ''}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Additional text"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Standard options */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Standard Options</h3>
        <div className="space-y-4">
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
              <option value="bytes">Bytes</option>
              <option value="seconds">Seconds</option>
              <option value="currency">Currency</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Decimals
            </label>
            <input
              type="number"
              value={fieldConfig?.decimals || ''}
              onChange={(e) => onFieldConfigChange({ decimals: e.target.value ? Number(e?.target.value) : undefined })}
              placeholder="Auto"
              min="0"
              max="10"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}