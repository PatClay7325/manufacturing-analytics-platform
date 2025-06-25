/**
 * Detailed View Component for Drill-Down
 * Implements Phase 2.1: Click-through to detailed view with raw logs and history
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Filter, Search, Eye, TrendingUp, AlertTriangle } from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea, Legend, Brush
} from 'recharts';
import { TimeRangeSelector, TimeRange } from '@/components/common/TimeRangeSelector';
import { ChartErrorBoundary } from '@/components/common/ErrorState';
import { auditLogService, AuditAction } from '@/services/auditLogService';

export interface DetailedViewProps {
  metric: string;
  equipmentId?: string;
  initialTimeRange?: TimeRange;
  onClose: () => void;
  title?: string;
}

interface DataPoint {
  timestamp: string;
  value: number;
  quality?: 'good' | 'warning' | 'error';
  source?: string;
  rawData?: any;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string;
  data?: any;
}

interface BaselineData {
  label: string;
  value: number;
  type: 'target' | 'average' | 'benchmark';
  period: string;
}

export function DetailedView({
  metric,
  equipmentId,
  initialTimeRange,
  onClose,
  title
}: DetailedViewProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>(
    initialTimeRange || {
      label: 'Last 24 Hours',
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date(),
      preset: 'last_24_hours'
    }
  );
  
  const [data, setData] = useState<DataPoint[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [baselines, setBaselines] = useState<BaselineData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawData, setShowRawData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDataPoint, setSelectedDataPoint] = useState<DataPoint | null>(null);

  // Load detailed data
  useEffect(() => {
    loadDetailedData();
  }, [metric, equipmentId, timeRange]);

  // Log detailed view access
  useEffect(() => {
    auditLogService.logRequest(
      // Mock request for audit logging
      { headers: { get: () => null } } as any,
      AuditAction.METRICS_VIEW,
      {
        resource: 'detailed_view',
        details: {
          metric,
          equipmentId,
          timeRange: {
            start: timeRange.start.toISOString(),
            end: timeRange.end.toISOString(),
            preset: timeRange.preset
          }
        }
      }
    );
  }, [metric, equipmentId, timeRange]);

  const loadDetailedData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch historical data with higher resolution
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [metric],
          equipmentIds: equipmentId ? [equipmentId] : undefined,
          startTime: timeRange.start.toISOString(),
          endTime: timeRange.end.toISOString(),
          interval: '1m', // Higher resolution for detailed view
          aggregation: 'avg'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`);
      }

      const historyData = await response.json();
      
      // Transform data
      const transformedData: DataPoint[] = historyData.map((item: any) => ({
        timestamp: new Date(item.timestamp).toLocaleString(),
        value: item.value,
        quality: item.quality || 'good',
        source: item.equipmentId || 'system',
        rawData: item
      }));
      
      setData(transformedData);
      
      // Load baselines and targets
      await loadBaselines();
      
      // Load related logs
      await loadLogs();
      
    } catch (err) {
      console.error('Failed to load detailed data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadBaselines = async () => {
    try {
      // Calculate historical averages for baselines
      const oneWeekAgo = new Date(timeRange.start.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(timeRange.start.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: [metric],
          equipmentIds: equipmentId ? [equipmentId] : undefined,
          startTime: oneMonthAgo.toISOString(),
          endTime: timeRange.start.toISOString(),
          interval: '1d',
          aggregation: 'avg'
        })
      });

      if (response.ok) {
        const baselineData = await response.json();
        const values = baselineData.map((item: any) => item.value).filter((v: number) => !isNaN(v));
        
        if (values.length > 0) {
          const average = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
          
          setBaselines([
            {
              label: 'Previous Month Average',
              value: average,
              type: 'average',
              period: '30 days'
            },
            {
              label: 'Target',
              value: getTargetValue(metric, average),
              type: 'target',
              period: 'set point'
            }
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to load baselines:', err);
    }
  };

  const loadLogs = async () => {
    try {
      // Load related system logs (mock implementation)
      const mockLogs: LogEntry[] = [
        {
          id: '1',
          timestamp: new Date(timeRange.start.getTime() + 60000).toISOString(),
          level: 'info',
          message: `${metric} monitoring started`,
          source: equipmentId || 'system'
        },
        {
          id: '2',
          timestamp: new Date(timeRange.start.getTime() + 3600000).toISOString(),
          level: 'warning',
          message: `${metric} exceeded warning threshold`,
          source: equipmentId || 'system'
        }
      ];
      
      setLogs(mockLogs);
    } catch (err) {
      console.error('Failed to load logs:', err);
    }
  };

  const getTargetValue = (metric: string, currentAverage: number): number => {
    // Define targets based on metric type
    const targets: Record<string, number> = {
      oee: 85,
      availability: 90,
      performance: 95,
      quality: 99.5,
      temperature: 75,
      vibration: 2.0,
      pressure: 100
    };
    
    return targets[metric.toLowerCase()] || currentAverage * 1.1;
  };

  const handleDataPointClick = (dataPoint: any) => {
    const point = data.find(d => d.timestamp === dataPoint.activeLabel);
    setSelectedDataPoint(point || null);
  };

  const exportData = async () => {
    try {
      const csvContent = [
        ['Timestamp', 'Value', 'Quality', 'Source'],
        ...data.map(d => [d.timestamp, d.value, d.quality, d.source])
      ].map(row => row.join(',')).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${metric}_${equipmentId || 'all'}_${timeRange.start.toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // Log export action
      auditLogService.logRequest(
        { headers: { get: () => null } } as any,
        AuditAction.DATA_EXPORT,
        {
          resource: 'detailed_view',
          details: {
            metric,
            equipmentId,
            recordCount: data.length,
            format: 'csv'
          }
        }
      );
    } catch (err) {
      console.error('Failed to export data:', err);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Error</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={loadDetailedData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {title || `${metric} Details`}
              </h2>
              {equipmentId && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Equipment: {equipmentId}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TimeRangeSelector
              value={timeRange}
              onChange={setTimeRange}
              manufacturingContext={true}
            />
            <button
              onClick={exportData}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chart Panel */}
          <div className="flex-1 p-4">
            <ChartErrorBoundary name="Detailed Chart">
              <div className="h-full">
                <ResponsiveContainer width="100%" height="70%">
                  <ComposedChart data={data} onClick={handleDataPointClick}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="timestamp" 
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload[0]) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-gray-800 p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                              <p className="font-medium">{label}</p>
                              <p className="text-blue-600">
                                {metric}: {payload[0].value}
                              </p>
                              <p className="text-xs text-gray-500">
                                Quality: {data.quality}
                              </p>
                              <p className="text-xs text-gray-500">
                                Source: {data.source}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    
                    {/* Main data line */}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name={metric}
                    />
                    
                    {/* Baselines */}
                    {baselines.map((baseline, index) => (
                      <ReferenceLine
                        key={index}
                        y={baseline.value}
                        stroke={baseline.type === 'target' ? '#10b981' : '#6b7280'}
                        strokeDasharray={baseline.type === 'target' ? '5 5' : '3 3'}
                        label={{
                          value: baseline.label,
                          position: 'topRight'
                        }}
                      />
                    ))}
                    
                    <Brush dataKey="timestamp" height={30} />
                  </ComposedChart>
                </ResponsiveContainer>
                
                {/* Selected Data Point Details */}
                {selectedDataPoint && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Data Point Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Timestamp:</span>
                        <span className="ml-2 font-mono">{selectedDataPoint.timestamp}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Value:</span>
                        <span className="ml-2 font-mono">{selectedDataPoint.value}</span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Quality:</span>
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          selectedDataPoint.quality === 'good' ? 'bg-green-100 text-green-700' :
                          selectedDataPoint.quality === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {selectedDataPoint.quality}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Source:</span>
                        <span className="ml-2">{selectedDataPoint.source}</span>
                      </div>
                    </div>
                    
                    {showRawData && selectedDataPoint.rawData && (
                      <div className="mt-3">
                        <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Raw Data:</h5>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                          {JSON.stringify(selectedDataPoint.rawData, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    <button
                      onClick={() => setShowRawData(!showRawData)}
                      className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Eye className="h-4 w-4" />
                      {showRawData ? 'Hide' : 'Show'} Raw Data
                    </button>
                  </div>
                )}
              </div>
            </ChartErrorBoundary>
          </div>

          {/* Side Panel - Logs */}
          <div className="w-80 border-l border-gray-200 dark:border-gray-700 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Related Logs</h3>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-32"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`px-2 py-1 rounded text-xs ${
                      log.level === 'error' || log.level === 'critical' ? 'bg-red-100 text-red-700' :
                      log.level === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {log.level}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-900 dark:text-gray-100">{log.message}</p>
                  <p className="text-xs text-gray-500 mt-1">Source: {log.source}</p>
                </div>
              ))}
              
              {filteredLogs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No logs found for the selected time range
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}