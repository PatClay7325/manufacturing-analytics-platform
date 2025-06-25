/**
 * Complete AnalyticsPlatform Explore Manager
 * Full-featured data exploration system with query execution, visualization, and history
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import { 
  PlayIcon,
  StopIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  EyeIcon,
  ChartBarIcon,
  TableCellsIcon,
  BeakerIcon,
  BookmarkIcon,
  ShareIcon,
  DocumentTextIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

// Core Explore Types
export interface ExploreQuery {
  refId: string;
  expr: string;
  datasource: {
    type: string;
    uid: string;
  };
  format?: 'time_series' | 'table' | 'heatmap';
  legendFormat?: string;
  interval?: string;
  step?: number;
  hide?: boolean;
}

export interface ExploreState {
  queries: ExploreQuery[];
  range: {
    from: string;
    to: string;
  };
  refreshInterval?: string;
  maxDataPoints?: number;
  minInterval?: string;
  datasource: {
    type: string;
    uid: string;
    name: string;
  };
}

export interface ExploreResult {
  refId: string;
  series: Array<{
    name: string;
    fields: Array<{
      name: string;
      type: 'time' | 'number' | 'string' | 'boolean';
      values: any[];
      config?: {
        displayName?: string;
        unit?: string;
        color?: string;
      };
    }>;
  }>;
  error?: string;
  meta?: {
    executedQueryString?: string;
    preferredVisualisationType?: string;
    notices?: Array<{
      severity: 'info' | 'warning' | 'error';
      text: string;
    }>;
  };
}

export interface ExploreHistory {
  id: string;
  timestamp: number;
  queries: ExploreQuery[];
  range: { from: string; to: string };
  datasource: { type: string; uid: string; name: string };
  starred?: boolean;
  comment?: string;
}

export interface ExploreManagerProps {
  datasources: Array<{
    uid: string;
    name: string;
    type: string;
    url?: string;
    isDefault?: boolean;
  }>;
  initialState?: Partial<ExploreState>;
  onQueryExecute?: (queries: ExploreQuery[], range: { from: string; to: string }) => Promise<ExploreResult[]>;
  onSaveToHistory?: (history: Omit<ExploreHistory, 'id' | 'timestamp'>) => Promise<void>;
  className?: string;
  splitPane?: boolean;
  onToggleSplitPane?: () => void;
}

export function ExploreManager({
  datasources,
  initialState,
  onQueryExecute,
  onSaveToHistory,
  className,
  splitPane = false,
  onToggleSplitPane
}: ExploreManagerProps) {
  const [exploreState, setExploreState] = useState<ExploreState>(() => {
    const defaultDatasource = datasources.find(ds => ds.isDefault) || datasources[0];
    return {
      queries: [
        {
          refId: 'A',
          expr: '',
          datasource: {
            type: defaultDatasource?.type || 'prometheus',
            uid: defaultDatasource?.uid || 'default'
          }
        }
      ],
      range: {
        from: 'now-1h',
        to: 'now'
      },
      datasource: {
        type: defaultDatasource?.type || 'prometheus',
        uid: defaultDatasource?.uid || 'default',
        name: defaultDatasource?.name || 'Default'
      },
      ...initialState
    };
  });

  const [results, setResults] = useState<ExploreResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ExploreHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Load history on mount
  useEffect(() => {
    loadExploreHistory();
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && exploreState.refreshInterval) {
      const interval = parseRefreshInterval(exploreState.refreshInterval);
      if (interval > 0) {
        const timer = setInterval(() => {
          executeQueries();
        }, interval);
        setRefreshInterval(timer);
        return () => clearInterval(timer);
      }
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [autoRefresh, exploreState.refreshInterval]);

  const parseRefreshInterval = (interval: string): number => {
    const match = interval.match(/^(\d+)([smh])$/);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      default: return 0;
    }
  };

  const loadExploreHistory = async () => {
    // In a real implementation, this would load from backend
    const savedHistory = localStorage.getItem('analyticsPlatform-explore-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.warn('Failed to load explore history:', error);
      }
    }
  };

  const saveToHistory = useCallback(async (comment?: string) => {
    const historyItem: ExploreHistory = {
      id: `history-${Date.now()}`,
      timestamp: Date.now(),
      queries: exploreState.queries.filter(q => q.expr.trim()),
      range: exploreState.range,
      datasource: exploreState.datasource,
      comment
    };

    const newHistory = [historyItem, ...history.slice(0, 49)]; // Keep last 50 items
    setHistory(newHistory);
    localStorage.setItem('analyticsPlatform-explore-history', JSON.stringify(newHistory));

    if (onSaveToHistory) {
      await onSaveToHistory(historyItem);
    }
  }, [exploreState, history, onSaveToHistory]);

  const executeQueries = useCallback(async () => {
    const validQueries = exploreState.queries.filter(q => q.expr.trim());
    if (validQueries.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      let queryResults: ExploreResult[];
      
      if (onQueryExecute) {
        queryResults = await onQueryExecute(validQueries, exploreState.range);
      } else {
        // Mock query execution for demo
        queryResults = await mockQueryExecution(validQueries, exploreState.range);
      }

      setResults(queryResults);
      
      // Auto-save successful queries to history
      if (queryResults.length > 0 && !queryResults.some(r => r.error)) {
        await saveToHistory();
      }
    } catch (err) {
      console.error('Query execution failed:', err);
      setError(err instanceof Error ? err.message : 'Query execution failed');
    } finally {
      setLoading(false);
    }
  }, [exploreState, onQueryExecute, saveToHistory]);

  const mockQueryExecution = async (queries: ExploreQuery[], range: { from: string; to: string }): Promise<ExploreResult[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    return queries.map((query, index) => {
      const timePoints = 50;
      const now = Date.now();
      const from = now - 60 * 60 * 1000; // 1 hour ago
      const step = (now - from) / timePoints;

      // Generate mock time series data
      const timeValues = Array.from({ length: timePoints }, (_, i) => from + i * step);
      const valueValues = Array.from({ length: timePoints }, (_, i) => {
        const baseValue = query.expr.includes('oee') ? 75 + Math.random() * 20 :
                         query.expr.includes('temperature') ? 80 + Math.random() * 15 :
                         query.expr.includes('production') ? 1000 + Math.random() * 500 :
                         Math.random() * 100;
        return Math.round((baseValue + Math.sin(i * 0.1) * 10) * 100) / 100;
      });

      return {
        refId: query.refId,
        series: [
          {
            name: query.legendFormat || `Series ${query.refId}`,
            fields: [
              {
                name: 'Time',
                type: 'time' as const,
                values: timeValues
              },
              {
                name: 'Value',
                type: 'number' as const,
                values: valueValues,
                config: {
                  displayName: query.legendFormat || `Series ${query.refId}`,
                  unit: query.expr.includes('temperature') ? '°C' : 
                        query.expr.includes('oee') ? '%' : 
                        query.expr.includes('production') ? 'units' : 'value'
                }
              }
            ]
          }
        ],
        meta: {
          executedQueryString: query.expr,
          preferredVisualisationType: 'time_series'
        }
      };
    });
  };

  const updateQuery = useCallback((refId: string, updates: Partial<ExploreQuery>) => {
    setExploreState(prev => ({
      ...prev,
      queries: prev.queries.map(q => 
        q.refId === refId ? { ...q, ...updates } : q
      )
    }));
  }, []);

  const addQuery = useCallback(() => {
    const nextRefId = String.fromCharCode(65 + exploreState.queries.length); // A, B, C, etc.
    setExploreState(prev => ({
      ...prev,
      queries: [
        ...prev.queries,
        {
          refId: nextRefId,
          expr: '',
          datasource: prev.datasource
        }
      ]
    }));
  }, [exploreState.queries.length]);

  const removeQuery = useCallback((refId: string) => {
    setExploreState(prev => ({
      ...prev,
      queries: prev.queries.filter(q => q.refId !== refId)
    }));
  }, []);

  const loadFromHistory = useCallback((historyItem: ExploreHistory) => {
    setExploreState({
      queries: historyItem.queries,
      range: historyItem.range,
      datasource: historyItem.datasource
    });
    setShowHistory(false);
  }, []);

  const starHistoryItem = useCallback((id: string) => {
    const updatedHistory = history.map(item => 
      item.id === id ? { ...item, starred: !item.starred } : item
    );
    setHistory(updatedHistory);
    localStorage.setItem('analyticsPlatform-explore-history', JSON.stringify(updatedHistory));
  }, [history]);

  return (
    <div className={clsx("flex flex-col h-full bg-white", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">Explore</h2>
          
          {/* Datasource Selector */}
          <select
            value={exploreState.datasource.uid}
            onChange={(e) => {
              const datasource = datasources.find(ds => ds.uid === e.target.value);
              if (datasource) {
                setExploreState(prev => ({
                  ...prev,
                  datasource: {
                    type: datasource.type,
                    uid: datasource.uid,
                    name: datasource.name
                  },
                  queries: prev.queries.map(q => ({
                    ...q,
                    datasource: {
                      type: datasource.type,
                      uid: datasource.uid
                    }
                  }))
                }));
              }
            }}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {datasources.map(ds => (
              <option key={ds.uid} value={ds.uid}>
                {ds.name} ({ds.type})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Options */}
          <button
            onClick={() => setShowTable(!showTable)}
            className={clsx(
              'p-2 rounded-md text-sm font-medium transition-colors',
              showTable
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            )}
            title="Toggle table view"
          >
            <TableCellsIcon className="h-4 w-4" />
          </button>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className={clsx(
              'p-2 rounded-md text-sm font-medium transition-colors',
              showHistory
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            )}
            title="Query history"
          >
            <ClockIcon className="h-4 w-4" />
          </button>

          {onToggleSplitPane && (
            <button
              onClick={onToggleSplitPane}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              title={splitPane ? "Exit split view" : "Split view"}
            >
              {splitPane ? 
                <ArrowsPointingInIcon className="h-4 w-4" /> :
                <ArrowsPointingOutIcon className="h-4 w-4" />
              }
            </button>
          )}

          {/* Execute Button */}
          <button
            onClick={executeQueries}
            disabled={loading || exploreState.queries.every(q => !q.expr.trim())}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <StopIcon className="h-4 w-4 mr-2" />
                Stop
              </>
            ) : (
              <>
                <PlayIcon className="h-4 w-4 mr-2" />
                Run Query
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Query Editor */}
          <ExploreQueryEditor
            state={exploreState}
            onUpdateQuery={updateQuery}
            onAddQuery={addQuery}
            onRemoveQuery={removeQuery}
            onRangeChange={(range) => setExploreState(prev => ({ ...prev, range }))}
            onExecute={executeQueries}
            loading={loading}
          />

          {/* Results */}
          <div className="flex-1 overflow-auto p-4">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Executing queries...</span>
              </div>
            )}

            {!loading && results.length > 0 && (
              <ExploreResults
                results={results}
                showTable={showTable}
                onToggleTable={() => setShowTable(!showTable)}
              />
            )}

            {!loading && !error && results.length === 0 && exploreState.queries.some(q => q.expr.trim()) && (
              <div className="text-center py-12">
                <InformationCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No data</h3>
                <p className="text-gray-600">
                  The query returned no data. Try adjusting your query or time range.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* History Sidebar */}
        {showHistory && (
          <ExploreHistorySidebar
            history={history}
            onLoadFromHistory={loadFromHistory}
            onStarItem={starHistoryItem}
            onClose={() => setShowHistory(false)}
          />
        )}
      </div>
    </div>
  );
}

// Query Editor Component
interface ExploreQueryEditorProps {
  state: ExploreState;
  onUpdateQuery: (refId: string, updates: Partial<ExploreQuery>) => void;
  onAddQuery: () => void;
  onRemoveQuery: (refId: string) => void;
  onRangeChange: (range: { from: string; to: string }) => void;
  onExecute: () => void;
  loading: boolean;
}

function ExploreQueryEditor({
  state,
  onUpdateQuery,
  onAddQuery,
  onRemoveQuery,
  onRangeChange,
  onExecute,
  loading
}: ExploreQueryEditorProps) {
  const timeRangePresets = [
    { label: 'Last 5 minutes', value: { from: 'now-5m', to: 'now' } },
    { label: 'Last 15 minutes', value: { from: 'now-15m', to: 'now' } },
    { label: 'Last 30 minutes', value: { from: 'now-30m', to: 'now' } },
    { label: 'Last 1 hour', value: { from: 'now-1h', to: 'now' } },
    { label: 'Last 3 hours', value: { from: 'now-3h', to: 'now' } },
    { label: 'Last 6 hours', value: { from: 'now-6h', to: 'now' } },
    { label: 'Last 12 hours', value: { from: 'now-12h', to: 'now' } },
    { label: 'Last 24 hours', value: { from: 'now-24h', to: 'now' } },
    { label: 'Last 7 days', value: { from: 'now-7d', to: 'now' } }
  ];

  const currentPreset = timeRangePresets.find(
    preset => preset.value.from === state.range.from && preset.value.to === state.range.to
  );

  return (
    <div className="border-b border-gray-200 bg-gray-50">
      {/* Time Range */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Time range:</label>
          <select
            value={currentPreset ? JSON.stringify(currentPreset.value) : 'custom'}
            onChange={(e) => {
              if (e.target.value !== 'custom') {
                const preset = JSON.parse(e.target.value);
                onRangeChange(preset);
              }
            }}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {timeRangePresets.map(preset => (
              <option key={preset.label} value={JSON.stringify(preset.value)}>
                {preset.label}
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
          
          {(!currentPreset) && (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={state.range.from}
                onChange={(e) => onRangeChange({ ...state.range, from: e.target.value })}
                placeholder="From (e.g., now-1h)"
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span>to</span>
              <input
                type="text"
                value={state.range.to}
                onChange={(e) => onRangeChange({ ...state.range, to: e.target.value })}
                placeholder="To (e.g., now)"
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Query Editors */}
      <div className="p-4 space-y-4">
        {state.queries.map((query, index) => (
          <div key={query.refId} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Query {query.refId}</span>
                {query.hide && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                    Hidden
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onUpdateQuery(query.refId, { hide: !query.hide })}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  title={query.hide ? "Show query" : "Hide query"}
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
                {state.queries.length > 1 && (
                  <button
                    onClick={() => onRemoveQuery(query.refId)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                    title="Remove query"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Query Expression
                </label>
                <textarea
                  value={query.expr}
                  onChange={(e) => onUpdateQuery(query.refId, { expr: e.target.value })}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      onExecute();
                    }
                  }}
                  placeholder="Enter your query (e.g., manufacturing_oee, equipment_temperature)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Press Ctrl+Enter to execute query
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Legend Format
                  </label>
                  <input
                    type="text"
                    value={query.legendFormat || ''}
                    onChange={(e) => onUpdateQuery(query.refId, { legendFormat: e.target.value })}
                    placeholder="Series name (e.g., {{instance}})"
                    className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Format
                  </label>
                  <select
                    value={query.format || 'time_series'}
                    onChange={(e) => onUpdateQuery(query.refId, { format: e.target.value as any })}
                    className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="time_series">Time series</option>
                    <option value="table">Table</option>
                    <option value="heatmap">Heatmap</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Step
                  </label>
                  <input
                    type="number"
                    value={query.step || ''}
                    onChange={(e) => onUpdateQuery(query.refId, { step: parseInt(e.target.value) || undefined })}
                    placeholder="Auto"
                    className="w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={onAddQuery}
          className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          + Add Query
        </button>
      </div>
    </div>
  );
}

// Results Component
interface ExploreResultsProps {
  results: ExploreResult[];
  showTable: boolean;
  onToggleTable: () => void;
}

function ExploreResults({ results, showTable, onToggleTable }: ExploreResultsProps) {
  if (results.length === 0) return null;

  return (
    <div className="space-y-6">
      {results.map((result) => (
        <div key={result.refId} className="bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">
              Query {result.refId}
              {result.meta?.executedQueryString && (
                <span className="ml-2 text-xs text-gray-500 font-mono">
                  {result.meta.executedQueryString}
                </span>
              )}
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={onToggleTable}
                className={clsx(
                  'p-2 rounded-md text-sm transition-colors',
                  showTable
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
                title="Toggle table view"
              >
                <TableCellsIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {result.error ? (
            <div className="p-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800 text-sm">{result.error}</p>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {showTable ? (
                <ExploreTableView series={result.series} />
              ) : (
                <ExploreChartView series={result.series} />
              )}
              
              {result.meta?.notices && result.meta.notices.length > 0 && (
                <div className="mt-4 space-y-2">
                  {result.meta.notices.map((notice, index) => (
                    <div
                      key={index}
                      className={clsx(
                        'p-3 rounded-md text-sm',
                        notice.severity === 'error' && 'bg-red-50 border border-red-200 text-red-800',
                        notice.severity === 'warning' && 'bg-yellow-50 border border-yellow-200 text-yellow-800',
                        notice.severity === 'info' && 'bg-blue-50 border border-blue-200 text-blue-800'
                      )}
                    >
                      {notice.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Table View Component
function ExploreTableView({ series }: { series: ExploreResult['series'] }) {
  if (series.length === 0) return <div className="text-gray-500">No data</div>;

  const firstSeries = series[0];
  const timeField = firstSeries.fields.find(f => f.type === 'time');
  const valueFields = firstSeries.fields.filter(f => f.type !== 'time');

  if (!timeField || valueFields.length === 0) {
    return <div className="text-gray-500">No time series data available for table view</div>;
  }

  const rowCount = timeField.values.length;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time
            </th>
            {valueFields.map((field, index) => (
              <th key={index} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {field.config?.displayName || field.name}
                {field.config?.unit && ` (${field.config.unit})`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: Math.min(rowCount, 100) }, (_, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-mono">
                {new Date(timeField.values[i]).toISOString()}
              </td>
              {valueFields.map((field, fieldIndex) => (
                <td key={fieldIndex} className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                  {field.values[i] != null ? Number(field.values[i]).toFixed(2) : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rowCount > 100 && (
        <p className="text-xs text-gray-500 mt-2 px-4">
          Showing first 100 of {rowCount} rows
        </p>
      )}
    </div>
  );
}

// Chart View Component (simplified)
function ExploreChartView({ series }: { series: ExploreResult['series'] }) {
  if (series.length === 0) return <div className="text-gray-500">No data</div>;

  // This is a simplified chart view - in a real implementation,
  // you would use a proper charting library like Recharts or D3
  return (
    <div className="h-64 bg-gray-50 rounded-md flex items-center justify-center">
      <div className="text-center">
        <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">Chart visualization</p>
        <p className="text-sm text-gray-500">
          {series.length} series with {series[0]?.fields.find(f => f.type === 'time')?.values.length || 0} data points
        </p>
      </div>
    </div>
  );
}

// History Sidebar Component
interface ExploreHistorySidebarProps {
  history: ExploreHistory[];
  onLoadFromHistory: (item: ExploreHistory) => void;
  onStarItem: (id: string) => void;
  onClose: () => void;
}

function ExploreHistorySidebar({ history, onLoadFromHistory, onStarItem, onClose }: ExploreHistorySidebarProps) {
  const [filter, setFilter] = useState('');
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  const filteredHistory = history.filter(item => {
    const matchesFilter = !filter || 
      item.queries.some(q => q.expr.toLowerCase().includes(filter.toLowerCase())) ||
      item.comment?.toLowerCase().includes(filter.toLowerCase());
    
    const matchesStarred = !showStarredOnly || item.starred;
    
    return matchesFilter && matchesStarred;
  });

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Query History</h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-2">
          <div className="relative">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showStarredOnly}
              onChange={(e) => setShowStarredOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Starred only</span>
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredHistory.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <ClockIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No history found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredHistory.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {item.datasource.name}
                    </p>
                  </div>
                  <button
                    onClick={() => onStarItem(item.id)}
                    className={clsx(
                      'p-1 rounded',
                      item.starred
                        ? 'text-yellow-500 hover:text-yellow-600'
                        : 'text-gray-400 hover:text-gray-600'
                    )}
                  >
                    <BookmarkIcon className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="space-y-1 mb-3">
                  {item.queries.slice(0, 2).map((query, index) => (
                    <div key={index} className="text-xs font-mono bg-gray-100 rounded px-2 py-1 truncate">
                      {query.refId}: {query.expr}
                    </div>
                  ))}
                  {item.queries.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{item.queries.length - 2} more queries
                    </div>
                  )}
                </div>

                {item.comment && (
                  <p className="text-xs text-gray-600 mb-2 italic">
                    "{item.comment}"
                  </p>
                )}
                
                <button
                  onClick={() => onLoadFromHistory(item)}
                  className="w-full px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Load Query
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}