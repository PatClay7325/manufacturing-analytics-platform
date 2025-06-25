'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PageLayout from '@/components/layout/PageLayout';
import DashboardViewerV2 from '@/components/dashboard/DashboardViewerV2';
import { TimeRangePicker } from '@/components/dashboard/TimeRangePicker';
import { RefreshPicker } from '@/components/dashboard/RefreshPicker';
import { getTemplateById } from '@/templates/dashboards';

export default function PrometheusTestPage() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'failed'>('checking');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds default
  const [refreshIntervalString, setRefreshIntervalString] = useState('5s'); // Store the string value
  const [timeRange, setTimeRange] = useState({ 
    from: 'now-5m', 
    to: 'now',
    raw: { from: 'now-5m', to: 'now' }
  });
  // Remove dashboardKey - we'll let the dashboard update naturally
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const template = getTemplateById('prometheus-realtime');

  // Test Prometheus connection
  const testConnection = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:9090/api/v1/query?query=up');
      setConnectionStatus(response.ok ? 'connected' : 'failed');
      return response.ok;
    } catch (error) {
      setConnectionStatus('failed');
      return false;
    }
  }, []);

  // Trigger dashboard data refresh without remounting
  const refreshDashboard = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setLastUpdate(new Date());
    testConnection();
  }, [testConnection]);

  // Initial connection test
  useEffect(() => {
    testConnection();
  }, [testConnection]);

  // Auto-refresh timer
  useEffect(() => {
    if (!isAutoRefresh || refreshInterval === 0) return;

    const interval = setInterval(() => {
      refreshDashboard();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshInterval, refreshDashboard]);

  // Handle time range change
  const handleTimeRangeChange = (newTimeRange: any) => {
    setTimeRange(newTimeRange);
    // Trigger a data refresh when time range changes
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle refresh interval change
  const handleRefreshIntervalChange = (interval: string) => {
    const intervalMap: Record<string, number> = {
      '5s': 5000,
      '10s': 10000,
      '30s': 30000,
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '30m': 1800000,
      '1h': 3600000,
      '2h': 7200000,
      'off': 0
    };
    
    const newInterval = intervalMap[interval] || 0;
    setRefreshInterval(newInterval);
    setRefreshIntervalString(interval);
    setIsAutoRefresh(newInterval > 0);
  };

  // Action buttons
  const actionButtons = (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <TimeRangePicker
          value={timeRange}
          onChange={handleTimeRangeChange}
          className="h-9"
        />
        <RefreshPicker
          value={refreshIntervalString}
          onChange={handleRefreshIntervalChange}
          onRefresh={refreshDashboard}
          className="h-9"
        />
      </div>
      
      <button 
        onClick={refreshDashboard}
        className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        title="Manual refresh"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );

  if (!template) {
    return (
      <PageLayout 
        title="Real-Time Prometheus Monitor" 
        actionButton={actionButtons}
      >
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Configuration Error</h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">Dashboard template not found</p>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const dashboard = {
    ...template.config,
    // Override with current time range
    time: timeRange,
    refresh: refreshInterval > 0 ? `${refreshInterval / 1000}s` : '',
    // Pass refresh trigger to force data updates
    refreshTrigger
  };

  return (
    <PageLayout 
      title="Real-Time Prometheus Monitor" 
      actionButton={actionButtons}
    >
      {/* Connection Status Bar */}
      <div className={`mb-6 border rounded-lg p-4 transition-all duration-300 ${
        connectionStatus === 'connected' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 
        connectionStatus === 'checking' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 
        'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`h-3 w-3 rounded-full mr-3 ${
              connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
              connectionStatus === 'checking' ? 'bg-yellow-500 animate-pulse' : 
              'bg-red-500'
            }`}></div>
            <div>
              <h3 className={`text-sm font-medium ${
                connectionStatus === 'connected' ? 'text-green-800 dark:text-green-200' : 
                connectionStatus === 'checking' ? 'text-yellow-800 dark:text-yellow-200' : 
                'text-red-800 dark:text-red-200'
              }`}>
                {connectionStatus === 'connected' ? 'Connected to Prometheus' : 
                 connectionStatus === 'checking' ? 'Checking connection...' : 
                 'Connection Failed'}
              </h3>
              <p className={`text-xs mt-1 ${
                connectionStatus === 'connected' ? 'text-green-700 dark:text-green-300' : 
                connectionStatus === 'checking' ? 'text-yellow-700 dark:text-yellow-300' : 
                'text-red-700 dark:text-red-300'
              }`}>
                {connectionStatus === 'connected' ? `Last update: ${lastUpdate.toLocaleTimeString()}` : 
                 connectionStatus === 'checking' ? 'Establishing connection...' : 
                 'Check if Prometheus is running on http://localhost:9090'}
              </p>
            </div>
          </div>
          
          {/* Auto-refresh indicator */}
          {isAutoRefresh && connectionStatus === 'connected' && (
            <div className="flex items-center text-sm text-green-700 dark:text-green-300">
              <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Auto-refreshing every {refreshInterval / 1000}s
            </div>
          )}
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Real-Time Monitoring Active</h3>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              <p>This dashboard displays live metrics from your Prometheus instance. Updates are optimized for performance:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Charts update smoothly without full re-renders</li>
                <li>Only data is refreshed, preserving chart state</li>
                <li>Zoom and pan states are maintained during updates</li>
                <li>Efficient memory usage for long-running sessions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Live Dashboard - No key prop for smooth updates */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Live Manufacturing Metrics</h3>
            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
              <span>Time Range: {timeRange.from} to {timeRange.to}</span>
              {connectionStatus === 'connected' && (
                <span className="flex items-center">
                  <span className="h-2 w-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                  Live
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="p-4">
          <DashboardViewerV2 
            dashboard={dashboard}
            className="bg-white dark:bg-gray-800"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
        <p>Development monitoring dashboard - Real-time data from Prometheus</p>
        <Link 
          href="/dev" 
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
        >
          ← Back to Development Tools
        </Link>
      </div>
    </PageLayout>
  );
}