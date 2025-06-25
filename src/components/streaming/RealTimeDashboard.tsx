/**
 * Real-Time Manufacturing Dashboard
 * Demonstrates live streaming capabilities with multiple data visualizations
 */

import React, { useState, useMemo } from 'react';
import { useManufacturingStream } from '@/hooks/useManufacturingStream';
import { StreamEvent } from '@/lib/streaming/ManufacturingDataStream';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { AlertCircle, Activity, TrendingUp, Settings, AlertTriangle, CheckCircle } from 'lucide-react';

interface RealTimeDashboardProps {
  equipment?: string[];
  className?: string;
}

export const RealTimeDashboard: React.FC<RealTimeDashboardProps> = ({
  equipment,
  className = ''
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showWebSocket, setShowWebSocket] = useState(false);

  // Use real-time streaming hook
  const {
    events,
    isConnected,
    error,
    metrics,
    clearEvents,
    reconnect
  } = useManufacturingStream({
    types: selectedType === 'all' ? undefined : [selectedType],
    equipment,
    useWebSocket: showWebSocket,
    autoReconnect: true
  });

  // Process events for visualizations
  const processedData = useMemo(() => {
    const oeeData: any[] = [];
    const alertCounts = { info: 0, warning: 0, error: 0, critical: 0 };
    const equipmentStatus = new Map<string, string>();
    const qualityMetrics: any[] = [];

    // Process last 50 events for trends
    events.slice(0, 50).forEach(event => {
      if (event.type === 'metric' && event.data.oee !== undefined) {
        oeeData.push({
          time: new Date(event.timestamp).toLocaleTimeString(),
          oee: event.data.oee * 100,
          availability: event.data.availability * 100,
          performance: event.data.performance * 100,
          quality: event.data.quality * 100,
          equipment: event.source
        });
      }

      if (event.type === 'alert' && event.severity) {
        alertCounts[event.severity]++;
      }

      if (event.type === 'equipment') {
        equipmentStatus.set(event.data.equipmentId, event.data.status);
      }

      if (event.type === 'quality') {
        qualityMetrics.push({
          time: new Date(event.timestamp).toLocaleTimeString(),
          value: event.data.value,
          isWithinSpec: event.data.isWithinSpec,
          equipment: event.source,
          type: event.data.metricType
        });
      }
    });

    return {
      oeeData: oeeData.slice(0, 20).reverse(),
      alertCounts,
      equipmentStatus: Array.from(equipmentStatus.entries()).map(([id, status]) => ({
        id,
        status
      })),
      qualityMetrics: qualityMetrics.slice(0, 10),
      recentEvents: events.slice(0, 5)
    };
  }, [events]);

  // Status indicator color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return '#10B981';
      case 'maintenance': return '#F59E0B';
      case 'idle': return '#6B7280';
      case 'fault': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  // Severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#DC2626';
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'info': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Real-Time Manufacturing Dashboard
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Live data streaming from production floor
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          {/* Stream Type Toggle */}
          <button
            onClick={() => setShowWebSocket(!showWebSocket)}
            className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            {showWebSocket ? 'WebSocket' : 'SSE'}
          </button>
          
          {/* Reconnect Button */}
          {!isConnected && (
            <button
              onClick={reconnect}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
          <div className="flex items-center justify-between">
            <Activity className="w-8 h-8 text-blue-500" />
            <span className="text-2xl font-bold">{metrics.eventsReceived}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Events Received</p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
          <div className="flex items-center justify-between">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <span className="text-2xl font-bold">
              {processedData.oeeData.length > 0 
                ? `${processedData.oeeData[processedData.oeeData.length - 1].oee.toFixed(1)}%`
                : 'N/A'}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Current OEE</p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
          <div className="flex items-center justify-between">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-bold">
              {processedData.alertCounts.warning + processedData.alertCounts.error + processedData.alertCounts.critical}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Active Alerts</p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
          <div className="flex items-center justify-between">
            <Settings className="w-8 h-8 text-purple-500" />
            <span className="text-2xl font-bold">{processedData.equipmentStatus.length}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Equipment Tracked</p>
        </div>
      </div>

      {/* Data Type Filter */}
      <div className="flex gap-2 mb-6">
        {['all', 'metric', 'alert', 'equipment', 'quality'].map(type => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              selectedType === type
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* OEE Trend Chart */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
          <h3 className="text-lg font-semibold mb-4">OEE Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={processedData.oeeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="oee" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={false}
              />
              <Line 
                type="monotone" 
                dataKey="availability" 
                stroke="#10B981" 
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Alert Distribution */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
          <h3 className="text-lg font-semibold mb-4">Alert Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart 
              data={Object.entries(processedData.alertCounts).map(([severity, count]) => ({
                severity,
                count
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="severity" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count">
                {Object.keys(processedData.alertCounts).map((severity, index) => (
                  <Cell key={`cell-${index}`} fill={getSeverityColor(severity)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Equipment Status */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
          <h3 className="text-lg font-semibold mb-4">Equipment Status</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {processedData.equipmentStatus.map(({ id, status }) => (
              <div key={id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                <span className="text-sm font-medium">{id}</span>
                <span 
                  className="px-2 py-1 text-xs rounded"
                  style={{ 
                    backgroundColor: getStatusColor(status) + '20',
                    color: getStatusColor(status)
                  }}
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded p-4">
          <h3 className="text-lg font-semibold mb-4">Recent Events</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {processedData.recentEvents.map((event, index) => (
              <div key={`${event.id}-${index}`} className="flex items-start gap-2 p-2 bg-white dark:bg-gray-800 rounded">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  event.type === 'alert' ? 'bg-red-500' :
                  event.type === 'metric' ? 'bg-blue-500' :
                  event.type === 'quality' ? 'bg-green-500' :
                  'bg-gray-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{event.type}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {event.source} • {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Connection Metrics */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Connection Uptime: {metrics.connectionUptime}s</span>
          <span>Last Event: {metrics.lastEventTime?.toLocaleTimeString() || 'N/A'}</span>
          <button
            onClick={clearEvents}
            className="text-blue-500 hover:text-blue-600"
          >
            Clear Events
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-400">{error.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};