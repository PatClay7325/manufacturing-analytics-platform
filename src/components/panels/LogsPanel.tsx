/**
 * Logs Panel - Grafana-compatible logs visualization
 * Displays manufacturing event logs with filtering, searching, and live tailing
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { Search, Filter, Download, Pause, Play, AlertCircle, Info, AlertTriangle, XCircle } from 'lucide-react';
import { PanelProps, LoadingState } from '@/core/plugins/types';
import { cn } from '@/lib/utils';

export interface LogsPanelOptions {
  showTime?: boolean;
  showLabels?: boolean;
  showMessageOnly?: boolean;
  wrapLogMessage?: boolean;
  prettifyLogMessage?: boolean;
  enableLogDetails?: boolean;
  sortOrder?: 'Descending' | 'Ascending';
  dedupStrategy?: 'none' | 'exact' | 'numbers' | 'signature';
  // Display
  fontSize?: number;
  lineHeight?: number;
}

interface LogRow {
  timestamp: number;
  message: string;
  level?: 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'critical';
  labels?: Record<string, string>;
  fields?: Record<string, any>;
  raw?: string;
}

const LogsPanel: React.FC<PanelProps<LogsPanelOptions>> = ({
  data,
  options,
  width,
  height,
  timeRange,
  onChangeTimeRange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  // Parse logs from data frames
  const logs = useMemo(() => {
    if (!data.series || data.series.length === 0) return [];

    const logRows: LogRow[] = [];

    data.series.forEach(frame => {
      const timeField = frame.fields.find(f => f.type === 'time');
      const messageField = frame.fields.find(f => f.name === 'message' || f.name === 'content');
      const levelField = frame.fields.find(f => f.name === 'level' || f.name === 'severity');
      const labelsField = frame.fields.find(f => f.name === 'labels');

      if (!timeField || !messageField) return;

      for (let i = 0; i < frame.length; i++) {
        logRows.push({
          timestamp: timeField.values.get(i),
          message: messageField.values.get(i),
          level: levelField?.values.get(i)?.toLowerCase() || 'info',
          labels: labelsField?.values.get(i) || {},
          raw: messageField.values.get(i),
        });
      }
    });

    // Sort logs
    return logRows.sort((a, b) => {
      if (options.sortOrder === 'Ascending') {
        return a.timestamp - b.timestamp;
      }
      return b.timestamp - a.timestamp;
    });
  }, [data.series, options.sortOrder]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Level filter
      if (selectedLevel !== 'all' && log.level !== selectedLevel) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          log.message.toLowerCase().includes(searchLower) ||
          Object.entries(log.labels || {}).some(
            ([key, value]) =>
              key.toLowerCase().includes(searchLower) ||
              value.toLowerCase().includes(searchLower)
          )
        );
      }

      return true;
    });
  }, [logs, selectedLevel, searchTerm]);

  // Deduplicate logs
  const displayLogs = useMemo(() => {
    if (options.dedupStrategy === 'none') {
      return filteredLogs;
    }

    const seen = new Map<string, LogRow>();
    
    return filteredLogs.filter(log => {
      let key = '';
      
      switch (options.dedupStrategy) {
        case 'exact':
          key = log.message;
          break;
        case 'numbers':
          key = log.message.replace(/\d+/g, '');
          break;
        case 'signature':
          key = log.message.replace(/\b[a-f0-9]{8,}\b/gi, '');
          break;
      }

      if (seen.has(key)) {
        return false;
      }
      
      seen.set(key, log);
      return true;
    });
  }, [filteredLogs, options.dedupStrategy]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!isPaused && shouldAutoScroll.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayLogs, isPaused]);

  // Handle user scroll
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 50;
    }
  }, []);

  // Toggle row expansion
  const toggleRowExpansion = useCallback((index: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Export logs
  const exportLogs = useCallback(() => {
    const content = displayLogs
      .map(log => {
        const time = format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS');
        const labels = Object.entries(log.labels || {})
          .map(([k, v]) => `${k}="${v}"`)
          .join(' ');
        return `${time} ${log.level?.toUpperCase()} ${labels} ${log.message}`;
      })
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [displayLogs]);

  // Log level styles
  const getLevelStyles = (level?: string) => {
    switch (level) {
      case 'error':
      case 'critical':
        return 'text-red-500 bg-red-50 dark:bg-red-950';
      case 'warn':
        return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950';
      case 'info':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-950';
      case 'debug':
      case 'trace':
        return 'text-gray-500 bg-gray-50 dark:bg-gray-950';
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-950';
    }
  };

  // Log level icon
  const getLevelIcon = (level?: string) => {
    switch (level) {
      case 'error':
      case 'critical':
        return <XCircle className="w-4 h-4" />;
      case 'warn':
        return <AlertTriangle className="w-4 h-4" />;
      case 'info':
        return <Info className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (data.state === LoadingState.Loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-md bg-background"
          />
        </div>

        {/* Level filter */}
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md bg-background"
        >
          <option value="all">All levels</option>
          <option value="critical">Critical</option>
          <option value="error">Error</option>
          <option value="warn">Warning</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
          <option value="trace">Trace</option>
        </select>

        {/* Controls */}
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="p-1.5 hover:bg-accent rounded"
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>

        <button
          onClick={exportLogs}
          className="p-1.5 hover:bg-accent rounded"
          title="Export logs"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Logs container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto p-2 font-mono"
        style={{
          fontSize: options.fontSize || 12,
          lineHeight: options.lineHeight || 1.5,
        }}
      >
        {displayLogs.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No logs found
          </div>
        ) : (
          <div className="space-y-1">
            {displayLogs.map((log, index) => (
              <div
                key={index}
                className={cn(
                  'group relative rounded px-2 py-1 hover:bg-accent/50 cursor-pointer',
                  expandedRows.has(index) && 'bg-accent/30'
                )}
                onClick={() => options.enableLogDetails && toggleRowExpansion(index)}
              >
                <div className="flex items-start gap-2">
                  {/* Level icon */}
                  {!options.showMessageOnly && (
                    <div className={cn('mt-0.5', getLevelStyles(log.level))}>
                      {getLevelIcon(log.level)}
                    </div>
                  )}

                  {/* Timestamp */}
                  {options.showTime !== false && !options.showMessageOnly && (
                    <div className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                    </div>
                  )}

                  {/* Labels */}
                  {options.showLabels !== false && !options.showMessageOnly && log.labels && (
                    <div className="flex gap-1">
                      {Object.entries(log.labels).map(([key, value]) => (
                        <span
                          key={key}
                          className="px-1.5 py-0.5 text-xs bg-accent rounded"
                        >
                          {key}={value}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Message */}
                  <div
                    className={cn(
                      'flex-1',
                      options.wrapLogMessage ? 'whitespace-pre-wrap' : 'truncate'
                    )}
                  >
                    {options.prettifyLogMessage ? (
                      <pre className="text-sm">{JSON.stringify(JSON.parse(log.message), null, 2)}</pre>
                    ) : (
                      log.message
                    )}
                  </div>
                </div>

                {/* Expanded details */}
                {expandedRows.has(index) && options.enableLogDetails && (
                  <div className="mt-2 pt-2 border-t space-y-2">
                    <div className="text-xs space-y-1">
                      <div>
                        <span className="text-muted-foreground">Time:</span>{' '}
                        {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS')}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Level:</span>{' '}
                        {log.level?.toUpperCase()}
                      </div>
                      {log.labels && (
                        <div>
                          <span className="text-muted-foreground">Labels:</span>
                          <div className="ml-4">
                            {Object.entries(log.labels).map(([key, value]) => (
                              <div key={key}>
                                {key}: {value}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {log.fields && (
                        <div>
                          <span className="text-muted-foreground">Fields:</span>
                          <pre className="ml-4 text-xs">
                            {JSON.stringify(log.fields, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-2 py-1 border-t text-xs text-muted-foreground">
        <div>
          Showing {displayLogs.length} of {logs.length} logs
          {options.dedupStrategy !== 'none' && ' (deduped)'}
        </div>
        <div>
          {isPaused ? 'Paused' : 'Live'}
        </div>
      </div>
    </div>
  );
};

export default LogsPanel;