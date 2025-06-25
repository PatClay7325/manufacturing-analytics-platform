'use client';

import React from 'react';
import { Panel } from '@/types/dashboard';
import TimeSeriesOptions from './options/TimeSeriesOptions';
import StatOptions from './options/StatOptions';
import GaugeOptions from './options/GaugeOptions';
import TableOptions from './options/TableOptions';
import TextOptions from './options/TextOptions';

interface PanelOptionsEditorProps {
  panel?: Panel;
  onChange?: (updates?: Partial<Panel>) => void;
}

export default function PanelOptionsEditor({
  panel,
  onChange
}: PanelOptionsEditorProps) {
  const updateOptions = (options: any) => {
    onChange({ options: { ...panel?.options, ...options } });
  };

  const updateFieldConfig = (fieldConfig: any) => {
    onChange({ 
      fieldConfig: { 
        ...panel?.fieldConfig,
        defaults: { ...panel?.fieldConfig.defaults, ...fieldConfig }
      } 
    });
  };

  // Select the appropriate options editor based on panel type
  const renderOptionsEditor = () => {
    switch (panel?.type) {
      case 'timeseries':
      case 'graph':
        return (
          <TimeSeriesOptions
            options={panel?.options}
            fieldConfig={panel?.fieldConfig?.defaults}
            onChange={updateOptions}
            onFieldConfigChange={updateFieldConfig}
          />
        );
      case 'stat':
      case 'singlestat':
        return (
          <StatOptions
            options={panel?.options}
            fieldConfig={panel?.fieldConfig?.defaults}
            onChange={updateOptions}
            onFieldConfigChange={updateFieldConfig}
          />
        );
      case 'gauge':
        return (
          <GaugeOptions
            options={panel?.options}
            fieldConfig={panel?.fieldConfig?.defaults}
            onChange={updateOptions}
            onFieldConfigChange={updateFieldConfig}
          />
        );
      case 'table':
        return (
          <TableOptions
            options={panel?.options}
            onChange={updateOptions}
          />
        );
      case 'text':
      case 'markdown':
        return (
          <TextOptions
            options={panel?.options}
            onChange={updateOptions}
          />
        );
      default:
        return (
          <div className="p-4">
            <p className="text-gray-400 text-sm">
              No options available for panel type: {panel?.type}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="h-full overflow-auto">
      {/* Panel Type Selector */}
      <div className="p-4 border-b border-gray-700">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Visualization Type
        </label>
        <select
          value={panel?.type}
          onChange={(e) => onChange({ type: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
        >
          <optgroup label="Visualizations">
            <option value="timeseries">Time Series</option>
            <option value="stat">Stat</option>
            <option value="gauge">Gauge</option>
            <option value="barchart">Bar Chart</option>
            <option value="piechart">Pie Chart</option>
            <option value="table">Table</option>
            <option value="heatmap">Heatmap</option>
            <option value="histogram">Histogram</option>
            <option value="state-timeline">State Timeline</option>
          </optgroup>
          <optgroup label="Manufacturing">
            <option value="oee-panel">OEE Panel</option>
            <option value="andon-board">Andon Board</option>
            <option value="spc-chart">SPC Chart</option>
            <option value="pareto-chart">Pareto Chart</option>
          </optgroup>
          <optgroup label="Others">
            <option value="text">Text</option>
            <option value="alertlist">Alert List</option>
            <option value="dashlist">Dashboard List</option>
            <option value="news">News</option>
            <option value="logs">Logs</option>
          </optgroup>
        </select>
      </div>

      {/* Panel-specific options */}
      {renderOptionsEditor()}

      {/* Common Panel Options */}
      <div className="p-4 border-t border-gray-700 space-y-4">
        <h3 className="text-sm font-medium text-white">Panel Options</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={panel?.description || ''}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Panel description..."
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            rows={2}
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="transparent"
            checked={panel?.transparent || false}
            onChange={(e) => onChange({ transparent: e.target.checked })}
            className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="transparent" className="text-sm text-gray-300">
            Transparent background
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Repeat for
            </label>
            <select
              value={panel?.repeat || ''}
              onChange={(e) => onChange({ repeat: e.target.value || undefined })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">No repeat</option>
              <option value="facility">$facility</option>
              <option value="line">$line</option>
              <option value="equipment">$equipment</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Direction
            </label>
            <select
              value={panel?.repeatDirection || 'h'}
              onChange={(e) => onChange({ repeatDirection: e.target.value as 'h' | 'v' })}
              disabled={!panel?.repeat}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >
              <option value="h">Horizontal</option>
              <option value="v">Vertical</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}