/**
 * AnalyticsPlatform Query Builder - Visual Query Construction
 * Adapted from @analyticsPlatform/prometheus query builder for Next.js manufacturing analyticsPlatform
 */

import { useState, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { PlusIcon, TrashIcon, PlayIcon } from '@heroicons/react/24/outline';

// Core Query Types
export interface QueryTarget {
  refId: string;
  expr?: string;
  datasource?: {
    type: string;
    uid: string;
  };
  format?: 'time_series' | 'table' | 'logs';
  intervalFactor?: number;
  interval?: string;
  step?: number;
  metric?: string;
  labels?: Record<string, string>;
  functions?: QueryFunction[];
  hide?: boolean;
}

export interface QueryFunction {
  id: string;
  name: string;
  params: any[];
  description?: string;
}

export interface DataSource {
  uid: string;
  name: string;
  type: 'prometheus' | 'postgresql' | 'influxdb' | 'elasticsearch' | 'loki';
  url: string;
  access: 'proxy' | 'direct';
  isDefault?: boolean;
  readOnly?: boolean;
  jsonData?: any;
}

export interface QueryBuilderProps {
  targets: QueryTarget[];
  datasources: DataSource[];
  onTargetsChange: (targets: QueryTarget[]) => void;
  onRunQuery: () => void;
  maxDataPoints?: number;
  interval?: string;
  showBrowser?: boolean;
  className?: string;
}

export function QueryBuilder({ 
  targets, 
  datasources, 
  onTargetsChange, 
  onRunQuery,
  maxDataPoints,
  interval,
  showBrowser = true,
  className 
}: QueryBuilderProps) {
  const [selectedDatasource, setSelectedDatasource] = useState<string>(
    datasources.find(ds => ds.isDefault)?.uid || datasources[0]?.uid || ''
  );

  const currentDatasource = useMemo(() => 
    datasources.find(ds => ds.uid === selectedDatasource),
    [datasources, selectedDatasource]
  );

  const addTarget = useCallback(() => {
    const newTarget: QueryTarget = {
      refId: String.fromCharCode(65 + targets.length), // A, B, C, etc.
      expr: '',
      datasource: currentDatasource ? {
        type: currentDatasource.type,
        uid: currentDatasource.uid
      } : undefined,
      format: 'time_series'
    };
    
    onTargetsChange([...targets, newTarget]);
  }, [targets, currentDatasource, onTargetsChange]);

  const removeTarget = useCallback((index: number) => {
    const newTargets = targets.filter((_, i) => i !== index);
    onTargetsChange(newTargets);
  }, [targets, onTargetsChange]);

  const updateTarget = useCallback((index: number, updates: Partial<QueryTarget>) => {
    const newTargets = targets.map((target, i) => 
      i === index ? { ...target, ...updates } : target
    );
    onTargetsChange(newTargets);
  }, [targets, onTargetsChange]);

  return (
    <div className={clsx("space-y-4", className)}>
      {/* Data Source Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Data source:</label>
          <select
            value={selectedDatasource}
            onChange={(e) => setSelectedDatasource(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {datasources.map((ds) => (
              <option key={ds.uid} value={ds.uid}>
                {ds.name} ({ds.type})
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onRunQuery}
            className="flex items-center px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <PlayIcon className="w-4 h-4 mr-1" />
            Run Query
          </button>
        </div>
      </div>

      {/* Query Targets */}
      <div className="space-y-3">
        {targets.map((target, index) => (
          <QueryTargetEditor
            key={`${target.refId}-${index}`}
            target={target}
            datasource={currentDatasource}
            onUpdate={(updates) => updateTarget(index, updates)}
            onRemove={() => removeTarget(index)}
            canRemove={targets.length > 1}
            showBrowser={showBrowser}
          />
        ))}
      </div>

      {/* Add Query Button */}
      <button
        onClick={addTarget}
        className="flex items-center px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <PlusIcon className="w-4 h-4 mr-1" />
        Add Query
      </button>

      {/* Query Options */}
      <div className="border-t border-gray-200 pt-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 mb-1">Max data points:</label>
            <input
              type="number"
              value={maxDataPoints || ''}
              onChange={(e) => {/* Handle max data points change */}}
              className="w-full border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Auto"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-1">Min interval:</label>
            <input
              type="text"
              value={interval || ''}
              onChange={(e) => {/* Handle interval change */}}
              className="w-full border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface QueryTargetEditorProps {
  target: QueryTarget;
  datasource?: DataSource;
  onUpdate: (updates: Partial<QueryTarget>) => void;
  onRemove: () => void;
  canRemove: boolean;
  showBrowser: boolean;
}

function QueryTargetEditor({ 
  target, 
  datasource, 
  onUpdate, 
  onRemove, 
  canRemove,
  showBrowser 
}: QueryTargetEditorProps) {
  const [isBuilderMode, setIsBuilderMode] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      {/* Target Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-primary-100 text-primary-800 text-xs font-medium rounded-full">
            {target.refId}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsBuilderMode(false)}
              className={clsx(
                "px-2 py-1 text-xs rounded",
                !isBuilderMode 
                  ? "bg-primary-100 text-primary-800" 
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              Code
            </button>
            <button
              onClick={() => setIsBuilderMode(true)}
              className={clsx(
                "px-2 py-1 text-xs rounded",
                isBuilderMode 
                  ? "bg-primary-100 text-primary-800" 
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              Builder
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={!target.hide}
              onChange={(e) => onUpdate({ hide: !e.target.checked })}
              className="mr-1"
            />
            Enabled
          </label>
          {canRemove && (
            <button
              onClick={onRemove}
              className="p-1 text-gray-400 hover:text-red-600 rounded focus:outline-none"
              title="Remove query"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Query Editor */}
      {isBuilderMode ? (
        <VisualQueryBuilder
          target={target}
          datasource={datasource}
          onUpdate={onUpdate}
          showBrowser={showBrowser}
        />
      ) : (
        <CodeQueryEditor
          target={target}
          datasource={datasource}
          onUpdate={onUpdate}
        />
      )}

      {/* Query Options */}
      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <label className="block text-gray-700 mb-1">Format:</label>
          <select
            value={target.format || 'time_series'}
            onChange={(e) => onUpdate({ format: e.target.value as any })}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="time_series">Time series</option>
            <option value="table">Table</option>
            <option value="logs">Logs</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Step:</label>
          <input
            type="text"
            value={target.step || ''}
            onChange={(e) => onUpdate({ step: parseInt(e.target.value) || undefined })}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Auto"
          />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Interval:</label>
          <input
            type="text"
            value={target.interval || ''}
            onChange={(e) => onUpdate({ interval: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Auto"
          />
        </div>
      </div>
    </div>
  );
}

interface CodeQueryEditorProps {
  target: QueryTarget;
  datasource?: DataSource;
  onUpdate: (updates: Partial<QueryTarget>) => void;
}

function CodeQueryEditor({ target, datasource, onUpdate }: CodeQueryEditorProps) {
  return (
    <div>
      <textarea
        value={target.expr || ''}
        onChange={(e) => onUpdate({ expr: e.target.value })}
        className="w-full h-24 border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
        placeholder={getQueryPlaceholder(datasource?.type)}
      />
    </div>
  );
}

interface VisualQueryBuilderProps {
  target: QueryTarget;
  datasource?: DataSource;
  onUpdate: (updates: Partial<QueryTarget>) => void;
  showBrowser: boolean;
}

function VisualQueryBuilder({ target, datasource, onUpdate, showBrowser }: VisualQueryBuilderProps) {
  return (
    <div className="space-y-3">
      {/* Metric Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Metric:</label>
        <input
          type="text"
          value={target.metric || ''}
          onChange={(e) => onUpdate({ metric: e.target.value })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Enter metric name"
        />
      </div>

      {/* Label Filters */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Label filters:</label>
        <LabelFilters
          labels={target.labels || {}}
          onChange={(labels) => onUpdate({ labels })}
        />
      </div>

      {/* Functions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Functions:</label>
        <FunctionsList
          functions={target.functions || []}
          onChange={(functions) => onUpdate({ functions })}
        />
      </div>
    </div>
  );
}

interface LabelFiltersProps {
  labels: Record<string, string>;
  onChange: (labels: Record<string, string>) => void;
}

function LabelFilters({ labels, onChange }: LabelFiltersProps) {
  const addLabel = useCallback(() => {
    onChange({ ...labels, '': '' });
  }, [labels, onChange]);

  const updateLabel = useCallback((oldKey: string, newKey: string, value: string) => {
    const newLabels = { ...labels };
    if (oldKey !== newKey) {
      delete newLabels[oldKey];
    }
    if (newKey) {
      newLabels[newKey] = value;
    }
    onChange(newLabels);
  }, [labels, onChange]);

  const removeLabel = useCallback((key: string) => {
    const newLabels = { ...labels };
    delete newLabels[key];
    onChange(newLabels);
  }, [labels, onChange]);

  return (
    <div className="space-y-2">
      {Object.entries(labels).map(([key, value], index) => (
        <div key={index} className="flex items-center space-x-2">
          <input
            type="text"
            value={key}
            onChange={(e) => updateLabel(key, e.target.value, value)}
            className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Label name"
          />
          <span className="text-gray-500">=</span>
          <input
            type="text"
            value={value}
            onChange={(e) => updateLabel(key, key, e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Label value"
          />
          <button
            onClick={() => removeLabel(key)}
            className="p-1 text-gray-400 hover:text-red-600 rounded focus:outline-none"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button
        onClick={addLabel}
        className="text-sm text-primary-600 hover:text-primary-700 focus:outline-none"
      >
        + Add label filter
      </button>
    </div>
  );
}

interface FunctionsListProps {
  functions: QueryFunction[];
  onChange: (functions: QueryFunction[]) => void;
}

function FunctionsList({ functions, onChange }: FunctionsListProps) {
  const availableFunctions = [
    { name: 'rate', description: 'Calculate per-second rate', params: ['range'] },
    { name: 'increase', description: 'Calculate increase over time range', params: ['range'] },
    { name: 'sum', description: 'Sum values', params: [] },
    { name: 'avg', description: 'Average values', params: [] },
    { name: 'max', description: 'Maximum value', params: [] },
    { name: 'min', description: 'Minimum value', params: [] },
    { name: 'count', description: 'Count values', params: [] }
  ];

  const addFunction = useCallback((funcName: string) => {
    const funcDef = availableFunctions.find(f => f.name === funcName);
    if (funcDef) {
      const newFunc: QueryFunction = {
        id: `${funcName}_${Date.now()}`,
        name: funcName,
        params: funcDef.params.map(() => ''),
        description: funcDef.description
      };
      onChange([...functions, newFunc]);
    }
  }, [functions, onChange]);

  const removeFunction = useCallback((id: string) => {
    onChange(functions.filter(f => f.id !== id));
  }, [functions, onChange]);

  const updateFunction = useCallback((id: string, updates: Partial<QueryFunction>) => {
    onChange(functions.map(f => f.id === id ? { ...f, ...updates } : f));
  }, [functions, onChange]);

  return (
    <div className="space-y-2">
      {functions.map((func) => (
        <div key={func.id} className="flex items-center space-x-2 bg-gray-50 rounded-md p-2">
          <span className="text-sm font-medium text-gray-700">{func.name}(</span>
          {func.params.map((param, index) => (
            <span key={index}>
              <input
                type="text"
                value={param}
                onChange={(e) => {
                  const newParams = [...func.params];
                  newParams[index] = e.target.value;
                  updateFunction(func.id, { params: newParams });
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="value"
              />
              {index < func.params.length - 1 && <span className="text-gray-500">, </span>}
            </span>
          ))}
          <span className="text-sm font-medium text-gray-700">)</span>
          <button
            onClick={() => removeFunction(func.id)}
            className="p-1 text-gray-400 hover:text-red-600 rounded focus:outline-none ml-auto"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
      
      <select
        onChange={(e) => {
          if (e.target.value) {
            addFunction(e.target.value);
            e.target.value = '';
          }
        }}
        className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">+ Add function</option>
        {availableFunctions.map((func) => (
          <option key={func.name} value={func.name}>
            {func.name} - {func.description}
          </option>
        ))}
      </select>
    </div>
  );
}

function getQueryPlaceholder(datasourceType?: string): string {
  switch (datasourceType) {
    case 'prometheus':
      return 'up{instance="localhost:9090"}';
    case 'postgresql':
      return 'SELECT time, value FROM metrics WHERE $__timeFilter(time)';
    case 'influxdb':
      return 'SELECT mean("value") FROM "measurement" WHERE $timeFilter GROUP BY time($__interval)';
    default:
      return 'Enter your query here';
  }
}