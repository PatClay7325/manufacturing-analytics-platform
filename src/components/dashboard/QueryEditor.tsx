'use client';

import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  ChevronDownIcon, 
  ChevronRightIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { Panel, Dashboard, DataQuery } from '@/types/dashboard';

interface QueryEditorProps {
  panel?: Panel;
  dashboard?: Dashboard;
  onChange?: (targets?: DataQuery[]) => void;
  onDataReceived?: (data?: any) => void;
}

export default function QueryEditor({
  panel,
  dashboard,
  onChange,
  onDataReceived
}: QueryEditorProps) {
  const [queries, setQueries] = useState<DataQuery[]>(panel?.targets || []);
  const [expandedQueries, setExpandedQueries] = useState<Set<string>>(new Set());
  const [selectedDataSource, setSelectedDataSource] = useState('postgres');

  // Add a new query
  const addQuery = () => {
    const newQuery: DataQuery = {
      refId: String.fromCharCode(65 + queries?.length), // A, B, C, etc.
      datasource: { uid: selectedDataSource },
      query: '',
      hide: false
    };
    const updated = [...queries, newQuery];
    setQueries(updated);
    onChange(updated);
    setExpandedQueries(new Set([...expandedQueries, newQuery?.refId]));
  };

  // Remove a query
  const removeQuery = (refId: string) => {
    const updated = queries?.filter(q => q?.refId !== refId);
    setQueries(updated);
    onChange(updated);
    expandedQueries?.delete(refId);
    setExpandedQueries(new Set(expandedQueries));
  };

  // Update a query
  const updateQuery = (refId: string, updates: Partial<DataQuery>) => {
    const updated = queries?.map(q => 
      q?.refId === refId ? { ...q, ...updates } : q
    );
    setQueries(updated);
    onChange(updated);
  };

  // Toggle query visibility
  const toggleQueryVisibility = (refId: string) => {
    const query = queries?.find(q => q?.refId === refId);
    if (query) {
      updateQuery(refId, { hide: !query?.hide });
    }
  };

  // Toggle query expansion
  const toggleQueryExpansion = (refId: string) => {
    const newExpanded = new Set(expandedQueries);
    if (newExpanded?.has(refId)) {
      newExpanded?.delete(refId);
    } else {
      newExpanded?.add(refId);
    }
    setExpandedQueries(newExpanded);
  };

  // Run queries (mock for now)
  const runQueries = async () => {
    // Mock data for demonstration
    const mockData = Array.from({ length: 50 }, (_, i) => ({
      time: Date.now() - (49 - i) * 60000,
      value: Math.random() * 100,
      value2: Math.random() * 80 + 20
    }));
    onDataReceived?.(mockData);
  };

  useEffect(() => {
    // Auto-run queries when they change
    const timer = setTimeout(() => {
      runQueries();
    }, 500);
    return () => clearTimeout(timer);
  }, [queries]);

  return (
    <div className="p-4 space-y-4">
      {/* Data Source Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Data Source
        </label>
        <select
          value={selectedDataSource}
          onChange={(e) => setSelectedDataSource(e?.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
        >
          <option value="postgres">PostgreSQL - Manufacturing DB</option>
          <option value="influxdb">InfluxDB - Time Series</option>
          <option value="prometheus">Prometheus - Metrics</option>
          <option value="rest">REST API</option>
        </select>
      </div>

      {/* Queries */}
      <div className="space-y-3">
        {queries?.map((query) => (
          <div
            key={query?.refId}
            className={`bg-gray-700 rounded-lg ${
              query?.hide ? 'opacity-60' : ''
            }`}
          >
            {/* Query Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-600">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleQueryExpansion(query?.refId)}
                  className="p-1 hover:bg-gray-600 rounded"
                >
                  {expandedQueries?.has(query?.refId) ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <span className="font-medium text-white">
                  Query {query?.refId}
                </span>
                {query?.hide && (
                  <span className="text-xs text-gray-500">(Disabled)</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleQueryVisibility(query?.refId)}
                  className="p-1 hover:bg-gray-600 rounded text-gray-400"
                  title={query?.hide ? 'Enable query' : 'Disable query'}
                >
                  {query?.hide ? (
                    <EyeSlashIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => removeQuery(query?.refId)}
                  className="p-1 hover:bg-gray-600 rounded text-red-400"
                  title="Remove query"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Query Editor */}
            {expandedQueries?.has(query?.refId) && (
              <div className="p-4 space-y-4">
                {selectedDataSource === 'postgres' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      SQL Query
                    </label>
                    <textarea
                      value={query?.query || ''}
                      onChange={(e) => updateQuery(query?.refId, { query: e.target.value })}
                      placeholder="SELECT time, value FROM metrics WHERE $__timeFilter(time)"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      rows={4}
                    />
                  </div>
                ) : selectedDataSource === 'prometheus' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      PromQL Query
                    </label>
                    <input
                      type="text"
                      value={query?.query || ''}
                      onChange={(e) => updateQuery(query?.refId, { query: e.target.value })}
                      placeholder="rate(http_requests_total[5m])"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white font-mono text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Query
                    </label>
                    <input
                      type="text"
                      value={query?.query || ''}
                      onChange={(e) => updateQuery(query?.refId, { query: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Query Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Format
                    </label>
                    <select
                      value={query?.format || 'time_series'}
                      onChange={(e) => updateQuery(query?.refId, { format: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="time_series">Time series</option>
                      <option value="table">Table</option>
                      <option value="logs">Logs</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Legend
                    </label>
                    <input
                      type="text"
                      value={query?.legendFormat || ''}
                      onChange={(e) => updateQuery(query?.refId, { legendFormat: e.target.value })}
                      placeholder="{{label_name}}"
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Query Button */}
      <button
        onClick={addQuery}
        className="w-full py-2 border border-dashed border-gray-600 rounded hover:border-gray-500 hover:bg-gray-800 text-gray-400 flex items-center justify-center gap-2"
      >
        <PlusIcon className="w-5 h-5" />
        Add Query
      </button>

      {/* Query Inspector */}
      <div className="mt-6 p-4 bg-gray-800 rounded">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Query Inspector</h4>
        <p className="text-xs text-gray-500">
          {queries?.filter(q => !q?.hide).length} active queries
        </p>
      </div>
    </div>
  );
}