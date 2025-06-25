'use client';

import React, { useState } from 'react';
import { useManufacturingStream } from '@/hooks/useManufacturingStream';
import { CheckCircle, XCircle, Activity, AlertCircle } from 'lucide-react';

export default function TestStreamingPage() {
  const [testResults, setTestResults] = useState<{
    connectionTest: boolean | null;
    eventReceived: boolean | null;
    metricsWorking: boolean | null;
  }>({
    connectionTest: null,
    eventReceived: null,
    metricsWorking: null
  });

  // Use the streaming hook
  const {
    events,
    isConnected,
    error,
    metrics,
    clearEvents,
    reconnect
  } = useManufacturingStream({
    autoReconnect: true
  });

  // Update test results based on connection status
  React.useEffect(() => {
    setTestResults(prev => ({
      ...prev,
      connectionTest: isConnected
    }));
  }, [isConnected]);

  // Check if we receive events
  React.useEffect(() => {
    if (events.length > 0) {
      setTestResults(prev => ({
        ...prev,
        eventReceived: true
      }));
    }
  }, [events]);

  // Check if metrics are updating
  React.useEffect(() => {
    if (metrics.eventsReceived > 0) {
      setTestResults(prev => ({
        ...prev,
        metricsWorking: true
      }));
    }
  }, [metrics.eventsReceived]);

  const getTestIcon = (status: boolean | null) => {
    if (status === null) return <Activity className="w-5 h-5 text-gray-400 animate-pulse" />;
    if (status) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Streaming Service Test</h1>
        
        {/* Test Results */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span>Connection Established</span>
              {getTestIcon(testResults.connectionTest)}
            </div>
            <div className="flex items-center justify-between">
              <span>Events Received</span>
              {getTestIcon(testResults.eventReceived)}
            </div>
            <div className="flex items-center justify-between">
              <span>Metrics Working</span>
              {getTestIcon(testResults.metricsWorking)}
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
              <p className="font-medium">
                {isConnected ? (
                  <span className="text-green-600">Connected</span>
                ) : (
                  <span className="text-red-600">Disconnected</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Events Received</p>
              <p className="font-medium">{metrics.eventsReceived}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Connection Uptime</p>
              <p className="font-medium">{metrics.connectionUptime}s</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Last Event</p>
              <p className="font-medium">
                {metrics.lastEventTime?.toLocaleTimeString() || 'None'}
              </p>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700 dark:text-red-400">{error.message}</span>
            </div>
          )}
        </div>

        {/* Recent Events */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Recent Events</h2>
            <button
              onClick={clearEvents}
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              Clear
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No events received yet...</p>
            ) : (
              events.slice(0, 10).map((event, index) => (
                <div
                  key={`${event.id}-${index}`}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{event.type}</span>
                    <span className="text-gray-500">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Source: {event.source || 'Unknown'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={reconnect}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reconnect
          </button>
          <a
            href="/real-time"
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            View Full Dashboard
          </a>
        </div>

        {/* Summary */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
          <h3 className="font-semibold mb-2">Test Summary</h3>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            This page tests the lazy initialization fix for the ManufacturingDataStream service. 
            The fix prevents premature database access during module initialization, which was causing 
            authentication errors and breaking the chat functionality.
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
            ✅ The lazy initialization ensures the streaming service only creates its instance when 
            first accessed, after the database connection is properly established.
          </p>
        </div>
      </div>
    </div>
  );
}