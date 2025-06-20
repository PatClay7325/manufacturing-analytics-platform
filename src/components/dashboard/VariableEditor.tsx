'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { TemplateVariable } from '@/types/dashboard';

interface VariableEditorProps {
  variable?: TemplateVariable;
  existingVariables?: TemplateVariable[];
  isNew?: boolean;
  onSave?: (variable?: TemplateVariable) => void;
  onClose?: () => void;
}

export default function VariableEditor({
  variable,
  existingVariables,
  isNew,
  onSave,
  onClose
}: VariableEditorProps) {
  const [editedVariable, setEditedVariable] = useState<TemplateVariable>({ ...variable });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateVariable = (updates: Partial<TemplateVariable>) => {
    setEditedVariable(prev => ({ ...prev, ...updates }));
    // Clear related errors
    setErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(updates).forEach(key => {
        delete newErrors[key];
      });
      return newErrors;
    });
  };

  const validateVariable = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!editedVariable?.name?.trim()) {
      newErrors.name = 'Variable name is required';
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(editedVariable?.name)) {
      newErrors.name = 'Variable name must be alphanumeric and start with letter or underscore';
    } else if (existingVariables?.some(v => v?.name === editedVariable?.name && v !== variable)) {
      newErrors.name = 'Variable name already exists';
    }

    if (editedVariable?.type === 'query' && !editedVariable?.query?.trim()) {
      newErrors.query = 'Query is required for query variables';
    }

    if (editedVariable?.type === 'custom' && (!editedVariable?.options || editedVariable?.options.length === 0)) {
      newErrors.options = 'At least one option is required for custom variables';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateVariable()) {
      onSave(editedVariable);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">
              {isNew ? 'Add Variable' : 'Edit Variable'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-700 text-gray-400"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* General Settings */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">General</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Variable type
                </label>
                <select
                  value={editedVariable?.type}
                  onChange={(e) => updateVariable({ type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="query">Query</option>
                  <option value="custom">Custom</option>
                  <option value="textbox">Text box</option>
                  <option value="constant">Constant</option>
                  <option value="datasource">Data source</option>
                  <option value="interval">Interval</option>
                  <option value="adhoc">Ad hoc filters</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editedVariable?.name}
                  onChange={(e) => updateVariable({ name: e.target.value })}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded text-white placeholder-gray-500 focus:outline-none ${
                    errors?.name ? 'border-red-500 focus:border-red-500' : 'border-gray-600 focus:border-blue-500'
                  }`}
                  placeholder="variable_name"
                />
                {errors?.name && (
                  <p className="text-red-400 text-sm mt-1">{errors?.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Label
                </label>
                <input
                  type="text"
                  value={editedVariable?.label || ''}
                  onChange={(e) => updateVariable({ label: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="Display name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={editedVariable?.description || ''}
                  onChange={(e) => updateVariable({ description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="Variable description"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Type-specific Settings */}
          {editedVariable?.type === 'query' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Query Options</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Data source
                  </label>
                  <select
                    value={editedVariable?.datasource?.uid || 'postgres'}
                    onChange={(e) => updateVariable({ 
                      datasource: { uid: e.target.value } 
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="postgres">PostgreSQL - Manufacturing DB</option>
                    <option value="influxdb">InfluxDB - Time Series</option>
                    <option value="prometheus">Prometheus - Metrics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Query
                  </label>
                  <textarea
                    value={editedVariable?.query || ''}
                    onChange={(e) => updateVariable({ query: e.target.value })}
                    className={`w-full px-3 py-2 bg-gray-700 border rounded text-white font-mono text-sm placeholder-gray-500 focus:outline-none ${
                      errors?.query ? 'border-red-500 focus:border-red-500' : 'border-gray-600 focus:border-blue-500'
                    }`}
                    placeholder="SELECT DISTINCT facility FROM equipment"
                    rows={3}
                  />
                  {errors?.query && (
                    <p className="text-red-400 text-sm mt-1">{errors?.query}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Regex
                  </label>
                  <input
                    type="text"
                    value={editedVariable?.regex || ''}
                    onChange={(e) => updateVariable({ regex: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    placeholder="/(.*)/"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Refresh
                  </label>
                  <select
                    value={editedVariable?.refresh || 1}
                    onChange={(e) => updateVariable({ refresh: Number(e.target.value) as any })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value={0}>Never</option>
                    <option value={1}>On Dashboard Load</option>
                    <option value={2}>On Time Range Change</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {editedVariable?.type === 'custom' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Custom Options</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Values separated by comma
                </label>
                <textarea
                  value={editedVariable?.options?.map(opt => 
                    typeof opt.text === 'string' ? `${opt.text} : ${opt.value}` : opt.value
                  ).join(',\n') || ''}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n');
                    const options = lines.map(line => {
                      const [text, value] = line.includes(':') 
                        ? line.split(':').map(s => s.trim())
                        : [line.trim(), line.trim()];
                      return { text: text || value, value: value || text };
                    }).filter(opt => opt.value);
                    updateVariable({ options });
                  }}
                  className={`w-full px-3 py-2 bg-gray-700 border rounded text-white placeholder-gray-500 focus:outline-none ${
                    errors?.options ? 'border-red-500 focus:border-red-500' : 'border-gray-600 focus:border-blue-500'
                  }`}
                  placeholder="Option 1 : value1,\nOption 2 : value2"
                  rows={4}
                />
                {errors?.options && (
                  <p className="text-red-400 text-sm mt-1">{errors?.options}</p>
                )}
              </div>
            </div>
          )}

          {editedVariable?.type === 'interval' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Interval Options</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Interval values
                </label>
                <input
                  type="text"
                  value={editedVariable?.query || '1m,5m,10m,30m,1h,6h,12h,1d,7d,14d,30d'}
                  onChange={(e) => updateVariable({ query: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="1m,5m,10m,30m,1h"
                />
              </div>
            </div>
          )}

          {editedVariable?.type === 'textbox' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Text Box Options</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Default value
                </label>
                <input
                  type="text"
                  value={editedVariable?.query || ''}
                  onChange={(e) => updateVariable({ query: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="default_value"
                />
              </div>
            </div>
          )}

          {editedVariable?.type === 'constant' && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Constant Options</h3>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Value
                </label>
                <input
                  type="text"
                  value={editedVariable?.query || ''}
                  onChange={(e) => updateVariable({ query: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="constant_value"
                />
              </div>
            </div>
          )}

          {/* Selection Options */}
          {['query', 'custom'].includes(editedVariable?.type) && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Selection Options</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={editedVariable?.multi || false}
                    onChange={(e) => updateVariable({ multi: e.target.checked })}
                    className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Multi-value</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={editedVariable?.includeAll || false}
                    onChange={(e) => updateVariable({ includeAll: e.target.checked })}
                    className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Include All option</span>
                </label>

                {editedVariable?.includeAll && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Custom all value
                    </label>
                    <input
                      type="text"
                      value={editedVariable?.allValue || ''}
                      onChange={(e) => updateVariable({ allValue: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      placeholder=".*"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Hide Settings */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Hide</h3>
            <select
              value={editedVariable?.hide || 0}
              onChange={(e) => updateVariable({ hide: Number(e.target.value) as any })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value={0}>Visible</option>
              <option value={1}>Hide label</option>
              <option value={2}>Hide variable</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            {isNew ? 'Add Variable' : 'Update Variable'}
          </button>
        </div>
      </div>
    </div>
  );
}