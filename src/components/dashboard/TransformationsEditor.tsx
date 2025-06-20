'use client';

import React, { useState } from 'react';
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Panel, DataTransformerConfig } from '@/types/dashboard';

interface TransformationsEditorProps {
  panel?: Panel;
  onChange?: (transformations?: DataTransformerConfig[]) => void;
}

const transformationTypes = [
  {
    id: 'reduce',
    name: 'Reduce',
    description: 'Reduce all rows or data points to a single value'
  },
  {
    id: 'filter',
    name: 'Filter data by values',
    description: 'Filter data points by field values'
  },
  {
    id: 'organize',
    name: 'Organize fields',
    description: 'Rename, reorder, or hide fields'
  },
  {
    id: 'calculateField',
    name: 'Add field from calculation',
    description: 'Add a field based on the result of a calculation'
  },
  {
    id: 'groupBy',
    name: 'Group by',
    description: 'Group data by field values'
  },
  {
    id: 'merge',
    name: 'Merge',
    description: 'Merge multiple series/tables'
  },
  {
    id: 'sortBy',
    name: 'Sort by',
    description: 'Sort data by field values'
  },
  {
    id: 'rename',
    name: 'Rename fields',
    description: 'Rename fields by regex or explicit naming'
  },
  {
    id: 'extractFields',
    name: 'Extract fields',
    description: 'Extract fields from string values'
  },
  {
    id: 'histogram',
    name: 'Histogram',
    description: 'Convert data to histogram'
  }
];

export default function TransformationsEditor({
  panel,
  onChange
}: TransformationsEditorProps) {
  const [transformations, setTransformations] = useState<DataTransformerConfig[]>(
    panel?.transformations || []
  );
  const [expandedTransformations, setExpandedTransformations] = useState<Set<number>>(new Set());

  const addTransformation = (transformId: string) => {
    const newTransformation: DataTransformerConfig = {
      id: transformId,
      options: {},
      disabled: false
    };
    
    const updated = [...transformations, newTransformation];
    setTransformations(updated);
    onChange(updated);
    setExpandedTransformations(new Set([...expandedTransformations, updated?.length - 1]));
  };

  const removeTransformation = (index: number) => {
    const updated = transformations?.filter((_, i) => i !== index);
    setTransformations(updated);
    onChange(updated);
    expandedTransformations?.delete(index);
    setExpandedTransformations(new Set(expandedTransformations));
  };

  const updateTransformation = (index: number, updates: Partial<DataTransformerConfig>) => {
    const updated = transformations?.map((t, i) => 
      i === index ? { ...t, ...updates } : t
    );
    setTransformations(updated);
    onChange(updated);
  };

  const toggleExpansion = (index: number) => {
    const newExpanded = new Set(expandedTransformations);
    if (newExpanded?.has(index)) {
      newExpanded?.delete(index);
    } else {
      newExpanded?.add(index);
    }
    setExpandedTransformations(newExpanded);
  };

  const moveTransformation = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < transformations?.length) {
      const updated = [...transformations];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      setTransformations(updated);
      onChange(updated);
    }
  };

  const renderTransformationOptions = (transformation: DataTransformerConfig, index: number) => {
    switch (transformation?.id) {
      case 'reduce':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Calculation
              </label>
              <select
                value={transformation?.options?.reducers?.[0] || 'last'}
                onChange={(e) => updateTransformation(index, {
                  options: { ...transformation?.options, reducers: [e?.target.value] }
                })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="last">Last</option>
                <option value="first">First</option>
                <option value="mean">Mean</option>
                <option value="sum">Sum</option>
                <option value="max">Max</option>
                <option value="min">Min</option>
                <option value="count">Count</option>
                <option value="diff">Difference</option>
                <option value="range">Range</option>
              </select>
            </div>
          </div>
        );

      case 'filter':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Filter type
              </label>
              <select
                value={transformation?.options?.filterType || 'include'}
                onChange={(e) => updateTransformation(index, {
                  options: { ...transformation?.options, filterType: e.target.value }
                })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="include">Include</option>
                <option value="exclude">Exclude</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Conditions
              </label>
              <textarea
                value={transformation?.options?.conditions || ''}
                onChange={(e) => updateTransformation(index, {
                  options: { ...transformation?.options, conditions: e.target.value }
                })}
                placeholder="field > 100"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                rows={2}
              />
            </div>
          </div>
        );

      case 'calculateField':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Field name
              </label>
              <input
                type="text"
                value={transformation?.options?.alias || ''}
                onChange={(e) => updateTransformation(index, {
                  options: { ...transformation?.options, alias: e.target.value }
                })}
                placeholder="calculated_field"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Expression
              </label>
              <input
                type="text"
                value={transformation?.options?.expression || ''}
                onChange={(e) => updateTransformation(index, {
                  options: { ...transformation?.options, expression: e.target.value }
                })}
                placeholder="$A * 2 + $B"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        );

      case 'groupBy':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Group by field
              </label>
              <input
                type="text"
                value={transformation?.options?.fields?.[0] || ''}
                onChange={(e) => updateTransformation(index, {
                  options: { ...transformation?.options, fields: [e?.target.value] }
                })}
                placeholder="field_name"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        );

      case 'sortBy':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Sort by field
              </label>
              <input
                type="text"
                value={transformation?.options?.field || ''}
                onChange={(e) => updateTransformation(index, {
                  options: { ...transformation?.options, field: e.target.value }
                })}
                placeholder="field_name"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Sort order
              </label>
              <select
                value={transformation?.options?.sort || 'asc'}
                onChange={(e) => updateTransformation(index, {
                  options: { ...transformation?.options, sort: e.target.value }
                })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500">
            No options available for this transformation.
          </div>
        );
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Transformations List */}
      <div className="space-y-2">
        {transformations?.map((transformation, index) => {
          const transformationType = transformationTypes?.find(t => t?.id === transformation?.id);
          
          return (
            <div
              key={index}
              className={`bg-gray-700 rounded-lg ${
                transformation?.disabled ? 'opacity-60' : ''
              }`}
            >
              {/* Transformation Header */}
              <div className="flex items-center justify-between p-3 border-b border-gray-600">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleExpansion(index)}
                    className="p-1 hover:bg-gray-600 rounded"
                  >
                    {expandedTransformations?.has(index) ? (
                      <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <span className="font-medium text-white">
                    {transformationType?.name || transformation?.id}
                  </span>
                  {transformation?.disabled && (
                    <span className="text-xs text-gray-500">(Disabled)</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveTransformation(index, 'up')}
                    disabled={index === 0}
                    className="p-1 hover:bg-gray-600 rounded text-gray-400 disabled:opacity-50"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveTransformation(index, 'down')}
                    disabled={index === transformations?.length - 1}
                    className="p-1 hover:bg-gray-600 rounded text-gray-400 disabled:opacity-50"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => updateTransformation(index, { disabled: !transformation?.disabled })}
                    className="p-1 hover:bg-gray-600 rounded text-gray-400"
                    title={transformation?.disabled ? 'Enable' : 'Disable'}
                  >
                    {transformation?.disabled ? '👁️' : '🚫'}
                  </button>
                  <button
                    onClick={() => removeTransformation(index)}
                    className="p-1 hover:bg-gray-600 rounded text-red-400"
                    title="Remove"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Transformation Options */}
              {expandedTransformations?.has(index) && (
                <div className="p-4">
                  {renderTransformationOptions(transformation, index)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Transformation */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">Add transformation</h4>
        <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
          {transformationTypes?.map((type) => (
            <button
              key={type?.id}
              onClick={() => addTransformation(type?.id)}
              className="text-left p-3 bg-gray-700 hover:bg-gray-600 rounded border border-gray-600 hover:border-gray-500"
            >
              <div className="font-medium text-white text-sm">{type?.name}</div>
              <div className="text-xs text-gray-400 mt-1">{type?.description}</div>
            </button>
          ))}
        </div>
      </div>

      {transformations.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">No transformations applied</p>
          <p className="text-sm">Transformations process data before it reaches the visualization</p>
        </div>
      )}
    </div>
  );
}