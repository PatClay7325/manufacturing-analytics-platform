/**
 * Explore Page - Grafana-compatible data exploration interface
 * /explore route
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Search, Play, Clock, Download, Split, Eye, EyeOff, 
  Plus, X, ChevronDown, ChevronUp, Database 
} from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { TimeRangePicker } from '@/components/dashboard/TimeRangePicker';
import { RefreshPicker } from '@/components/dashboard/RefreshPicker';
import { QueryEditor } from '@/components/explore/QueryEditor';
import { ExploreVisualization } from '@/components/explore/ExploreVisualization';
import { QueryHistory } from '@/components/explore/QueryHistory';
import { cn } from '@/lib/utils';
import { DataFrame, LoadingState } from '@/core/plugins/types';
import { getPluginRegistry } from '@/core/plugins/PluginRegistry';

interface Query {
  refId: string;
  datasource: {
    type: string;
    uid: string;
  };
  expr?: string;
  hide?: boolean;
  instant?: boolean;
  range?: boolean;
  format?: string;
  intervalFactor?: number;
}

interface ExplorePane {
  id: string;
  datasource: {
    type: string;
    uid: string;
    name: string;
  } | null;
  queries: Query[];
  range: {
    from: string;
    to: string;
  };
  mode: 'metrics' | 'logs' | 'traces';
  showGraph: boolean;
  showTable: boolean;
  showLogs: boolean;
  loading: boolean;
  data: DataFrame[];
}

export default function ExplorePage() {
  const [panes, setPanes] = useState<ExplorePane[]>([
    {
      id: '1',
      datasource: null,
      queries: [{
        refId: 'A',
        datasource: { type: '', uid: '' },
        expr: '',
      }],
      range: {
        from: 'now-1h',
        to: 'now',
      },
      mode: 'metrics',
      showGraph: true,
      showTable: false,
      showLogs: false,
      loading: false,
      data: [],
    },
  ]);
  const [splitView, setSplitView] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [datasources, setDatasources] = useState<any[]>([]);
  const queryHistoryRef = useRef<Array<{
    timestamp: number;
    datasource: string;
    queries: Query[];
    duration: number;
  }>>([]);

  useEffect(() => {
    fetchDatasources();
  }, []);

  const fetchDatasources = async () => {
    try {
      const response = await fetch('/api/datasources');
      if (response.ok) {
        const data = await response.json();
        setDatasources(data);
        
        // Set default datasource if available
        const defaultDs = data.find((ds: any) => ds.isDefault);
        if (defaultDs && panes[0].datasource === null) {
          updatePane(panes[0].id, {
            datasource: {
              type: defaultDs.type,
              uid: defaultDs.uid,
              name: defaultDs.name,
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch datasources:', error);
    }
  };

  const updatePane = (paneId: string, updates: Partial<ExplorePane>) => {
    setPanes(panes.map(pane => 
      pane.id === paneId ? { ...pane, ...updates } : pane
    ));
  };

  const addQuery = (paneId: string) => {
    const pane = panes.find(p => p.id === paneId);
    if (!pane) return;

    const newQuery: Query = {
      refId: getNextRefId(pane.queries),
      datasource: pane.datasource ? {
        type: pane.datasource.type,
        uid: pane.datasource.uid,
      } : { type: '', uid: '' },
      expr: '',
    };

    updatePane(paneId, {
      queries: [...pane.queries, newQuery],
    });
  };

  const updateQuery = (paneId: string, refId: string, updates: Partial<Query>) => {
    const pane = panes.find(p => p.id === paneId);
    if (!pane) return;

    updatePane(paneId, {
      queries: pane.queries.map(q => 
        q.refId === refId ? { ...q, ...updates } : q
      ),
    });
  };

  const removeQuery = (paneId: string, refId: string) => {
    const pane = panes.find(p => p.id === paneId);
    if (!pane || pane.queries.length <= 1) return;

    updatePane(paneId, {
      queries: pane.queries.filter(q => q.refId !== refId),
    });
  };

  const runQueries = async (paneId: string) => {
    const pane = panes.find(p => p.id === paneId);
    if (!pane || !pane.datasource) return;

    updatePane(paneId, { loading: true });

    const startTime = Date.now();

    try {
      // Create data source instance
      const registry = getPluginRegistry();
      const dsInstance = registry.createDataSourceInstance({
        type: pane.datasource.type,
        uid: pane.datasource.uid,
        name: pane.datasource.name,
        jsonData: {},
      });

      // Execute queries
      const request = {
        app: 'explore',
        requestId: `explore-${paneId}`,
        timezone: 'browser',
        range: {
          from: pane.range.from,
          to: pane.range.to,
          raw: pane.range,
        },
        interval: '30s',
        intervalMs: 30000,
        targets: pane.queries.filter(q => !q.hide && q.expr),
        scopedVars: {},
        startTime,
      };

      const response = await dsInstance.query(request as any);
      
      updatePane(paneId, {
        data: response.data,
        loading: false,
      });

      // Add to history
      const duration = Date.now() - startTime;
      queryHistoryRef.current.unshift({
        timestamp: Date.now(),
        datasource: pane.datasource.name,
        queries: pane.queries.filter(q => !q.hide && q.expr),
        duration,
      });

      // Keep only last 50 queries
      if (queryHistoryRef.current.length > 50) {
        queryHistoryRef.current = queryHistoryRef.current.slice(0, 50);
      }

    } catch (error) {
      console.error('Query failed:', error);
      updatePane(paneId, {
        loading: false,
        data: [],
      });
    }
  };

  const toggleSplitView = () => {
    if (!splitView) {
      // Add second pane
      setPanes([
        ...panes,
        {
          id: '2',
          datasource: panes[0].datasource,
          queries: [{
            refId: 'A',
            datasource: panes[0].datasource ? {
              type: panes[0].datasource.type,
              uid: panes[0].datasource.uid,
            } : { type: '', uid: '' },
            expr: '',
          }],
          range: panes[0].range,
          mode: 'metrics',
          showGraph: true,
          showTable: false,
          showLogs: false,
          loading: false,
          data: [],
        },
      ]);
    } else {
      // Remove second pane
      setPanes([panes[0]]);
    }
    setSplitView(!splitView);
  };

  const getNextRefId = (queries: Query[]): string => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const letter of letters) {
      if (!queries.find(q => q.refId === letter)) {
        return letter;
      }
    }
    return 'A';
  };

  const renderPane = (pane: ExplorePane) => {
    return (
      <div key={pane.id} className="flex-1 flex flex-col h-full">
        {/* Datasource selector */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <select
              value={pane.datasource?.uid || ''}
              onChange={(e) => {
                const ds = datasources.find(d => d.uid === e.target.value);
                if (ds) {
                  updatePane(pane.id, {
                    datasource: {
                      type: ds.type,
                      uid: ds.uid,
                      name: ds.name,
                    },
                  });
                }
              }}
              className="flex-1 px-3 py-1.5 border rounded-md"
            >
              <option value="">Select data source</option>
              {datasources.map(ds => (
                <option key={ds.uid} value={ds.uid}>
                  {ds.name} ({ds.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Queries */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 space-y-4">
            {pane.queries.map((query, index) => (
              <div key={query.refId} className="border rounded-lg">
                <div className="p-3 flex items-center justify-between bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">
                      {query.refId}
                    </span>
                    <button
                      onClick={() => updateQuery(pane.id, query.refId, { hide: !query.hide })}
                      className="p-1 hover:bg-accent rounded"
                    >
                      {query.hide ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {pane.queries.length > 1 && (
                    <button
                      onClick={() => removeQuery(pane.id, query.refId)}
                      className="p-1 hover:bg-accent rounded text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <div className="p-3">
                  {pane.datasource && (
                    <QueryEditor
                      query={query}
                      datasource={pane.datasource}
                      onChange={(updates) => updateQuery(pane.id, query.refId, updates)}
                      onRunQuery={() => runQueries(pane.id)}
                    />
                  )}
                </div>
              </div>
            ))}
            
            <button
              onClick={() => addQuery(pane.id)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              Add query
            </button>
          </div>

          {/* Results */}
          {pane.data.length > 0 && (
            <div className="border-t">
              <div className="p-2 flex items-center gap-2 bg-muted/50">
                <button
                  onClick={() => updatePane(pane.id, { showGraph: !pane.showGraph })}
                  className={cn(
                    'px-3 py-1 text-sm rounded',
                    pane.showGraph ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  )}
                >
                  Graph
                </button>
                <button
                  onClick={() => updatePane(pane.id, { showTable: !pane.showTable })}
                  className={cn(
                    'px-3 py-1 text-sm rounded',
                    pane.showTable ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  )}
                >
                  Table
                </button>
                <button
                  onClick={() => updatePane(pane.id, { showLogs: !pane.showLogs })}
                  className={cn(
                    'px-3 py-1 text-sm rounded',
                    pane.showLogs ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  )}
                >
                  Logs
                </button>
              </div>
              
              <ExploreVisualization
                data={pane.data}
                showGraph={pane.showGraph}
                showTable={pane.showTable}
                showLogs={pane.showLogs}
                timeRange={pane.range}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <PageLayout
      title="Explore"
      description="Explore your data"
      fullWidth
    >
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSplitView}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-accent',
                splitView && 'bg-accent'
              )}
            >
              <Split className="h-4 w-4" />
              Split
            </button>
            
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-accent',
                showHistory && 'bg-accent'
              )}
            >
              <Clock className="h-4 w-4" />
              History
            </button>
          </div>

          <div className="flex items-center gap-2">
            <TimeRangePicker
              value={{
                from: panes[0].range.from,
                to: panes[0].range.to,
              }}
              onChange={(range) => {
                panes.forEach(pane => {
                  updatePane(pane.id, { range });
                });
              }}
            />
            
            <button
              onClick={() => panes.forEach(pane => runQueries(pane.id))}
              disabled={panes.some(p => p.loading)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Run query
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex">
          {/* Panes */}
          <div className={cn(
            'flex-1 flex',
            splitView ? 'divide-x' : ''
          )}>
            {panes.map(renderPane)}
          </div>

          {/* History sidebar */}
          {showHistory && (
            <div className="w-80 border-l">
              <QueryHistory
                history={queryHistoryRef.current}
                onSelect={(item) => {
                  // Apply selected query to active pane
                  const pane = panes[0];
                  updatePane(pane.id, {
                    queries: item.queries,
                  });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}