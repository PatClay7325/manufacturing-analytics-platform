'use client';

import React, { useState } from 'react';
import { Panel, FieldConfig, Threshold } from '@/types/dashboard';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface FieldConfigEditorProps {
  panel?: Panel;
  onChange?: (fieldConfig?: FieldConfig) => void;
}

export default function FieldConfigEditor({
  panel,
  onChange
}: FieldConfigEditorProps) {
  const fieldConfig = panel?.fieldConfig || { defaults: {}, overrides: [] };
  const defaults = fieldConfig?.defaults || {};

  const updateDefaults = (updates: any) => {
    onChange({
      ...fieldConfig,
      defaults: { ...defaults, ...updates }
    });
  };

  const updateThreshold = (index: number, threshold: Partial<Threshold>) => {
    const thresholds = defaults?.thresholds || { mode: 'absolute', steps: [] };
    const newSteps = [...thresholds?.steps];
    newSteps[index] = { ...newSteps[index], ...threshold };
    
    updateDefaults({
      thresholds: {
        ...thresholds,
        steps: newSteps
      }
    });
  };

  const addThreshold = () => {
    const thresholds = defaults?.thresholds || { mode: 'absolute', steps: [] };
    const newSteps = [...thresholds?.steps, { value: 0, color: '#ff0000' }];
    
    updateDefaults({
      thresholds: {
        ...thresholds,
        steps: newSteps
      }
    });
  };

  const removeThreshold = (index: number) => {
    const thresholds = defaults?.thresholds || { mode: 'absolute', steps: [] };
    const newSteps = thresholds?.steps.filter((_, i) => i !== index);
    
    updateDefaults({
      thresholds: {
        ...thresholds,
        steps: newSteps
      }
    });
  };

  return (
    <div className="p-4 space-y-6">
      {/* Standard Options */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Standard Options</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Unit
            </label>
            <select
              value={defaults?.unit || 'short'}
              onChange={(e) => updateDefaults({ unit: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <optgroup label="Data">
                <option value="short">Short</option>
                <option value="number">Number</option>
                <option value="percent">Percent (0-100)</option>
                <option value="percentunit">Percent (0.0-1.0)</option>
              </optgroup>
              <optgroup label="Data rate">
                <option value="pps">Packets/sec</option>
                <option value="bps">Bits/sec</option>
                <option value="Bps">Bytes/sec</option>
              </optgroup>
              <optgroup label="Time">
                <option value="ns">Nanoseconds</option>
                <option value="µs">Microseconds</option>
                <option value="ms">Milliseconds</option>
                <option value="s">Seconds</option>
                <option value="m">Minutes</option>
                <option value="h">Hours</option>
                <option value="d">Days</option>
              </optgroup>
              <optgroup label="Temperature">
                <option value="celsius">Celsius (°C)</option>
                <option value="fahrenheit">Fahrenheit (°F)</option>
                <option value="kelvin">Kelvin (K)</option>
              </optgroup>
              <optgroup label="Data">
                <option value="bytes">Bytes</option>
                <option value="kbytes">Kilobytes</option>
                <option value="mbytes">Megabytes</option>
                <option value="gbytes">Gigabytes</option>
              </optgroup>
              <optgroup label="Currency">
                <option value="currencyUSD">USD ($)</option>
                <option value="currencyEUR">EUR (€)</option>
                <option value="currencyGBP">GBP (£)</option>
              </optgroup>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Min
              </label>
              <input
                type="number"
                value={defaults?.min || ''}
                onChange={(e) => updateDefaults({ min: e.target.value ? Number(e?.target.value) : undefined })}
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
                value={defaults?.max || ''}
                onChange={(e) => updateDefaults({ max: e.target.value ? Number(e?.target.value) : undefined })}
                placeholder="Auto"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Decimals
            </label>
            <input
              type="number"
              value={defaults?.decimals || ''}
              onChange={(e) => updateDefaults({ decimals: e.target.value ? Number(e?.target.value) : undefined })}
              placeholder="Auto"
              min="0"
              max="10"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Display name
            </label>
            <input
              type="text"
              value={defaults?.displayName || ''}
              onChange={(e) => updateDefaults({ displayName: e.target.value })}
              placeholder="Auto"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              No value
            </label>
            <input
              type="text"
              value={defaults?.noValue || ''}
              onChange={(e) => updateDefaults({ noValue: e.target.value })}
              placeholder="N/A"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Thresholds */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Thresholds</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Mode
            </label>
            <select
              value={defaults?.thresholds?.mode || 'absolute'}
              onChange={(e) => updateDefaults({ 
                thresholds: { 
                  ...defaults?.thresholds, 
                  mode: e.target.value as 'absolute' | 'percentage' 
                } 
              })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="absolute">Absolute</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>

          <div className="space-y-2">
            {defaults?.thresholds?.steps?.map((threshold, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="color"
                  value={threshold?.color || '#ff0000'}
                  onChange={(e) => updateThreshold(index, { color: e.target.value })}
                  className="w-8 h-8 rounded border border-gray-600"
                />
                <input
                  type="number"
                  value={threshold?.value || 0}
                  onChange={(e) => updateThreshold(index, { value: Number(e?.target.value) })}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                />
                {index > 0 && (
                  <button
                    onClick={() => removeThreshold(index)}
                    className="p-2 hover:bg-gray-600 rounded text-red-400"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addThreshold}
              className="w-full py-2 border border-dashed border-gray-600 rounded hover:border-gray-500 hover:bg-gray-800 text-gray-400 flex items-center justify-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Add threshold
            </button>
          </div>
        </div>
      </div>

      {/* Color */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Color</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Color mode
            </label>
            <select
              value={defaults?.color?.mode || 'palette-classic'}
              onChange={(e) => updateDefaults({ 
                color: { 
                  ...defaults?.color, 
                  mode: e.target.value 
                } 
              })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="palette-classic">Classic palette</option>
              <option value="palette-modern">Modern palette</option>
              <option value="auto">Auto</option>
              <option value="fixed">Single color</option>
              <option value="shades">Shades of a color</option>
              <option value="continuous-GrYlRd">Continuous (Green-Yellow-Red)</option>
            </select>
          </div>

          {defaults?.color?.mode === 'fixed' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Fixed color
              </label>
              <input
                type="color"
                value={defaults?.color?.fixedColor || '#3b82f6'}
                onChange={(e) => updateDefaults({ 
                  color: { 
                    ...defaults?.color, 
                    fixedColor: e.target.value 
                  } 
                })}
                className="w-full h-10 rounded border border-gray-600"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}