'use client';

import React, { useState } from 'react';
import { GrafanaEmbed } from '@/components/grafana/GrafanaEmbed';
import { Calendar, RefreshCw, Settings, Maximize2 } from 'lucide-react';

export default function ManufacturingDashboard() {
  const [timeRange, setTimeRange] = useState({
    from: 'now-6h',
    to: 'now'
  });
  const [refresh, setRefresh] = useState('10s');
  const [selectedLine, setSelectedLine] = useState('all');

  const quickRanges = [
    { label: 'Last 15 minutes', from: 'now-15m' },
    { label: 'Last 1 hour', from: 'now-1h' },
    { label: 'Last 6 hours', from: 'now-6h' },
    { label: 'Last 24 hours', from: 'now-24h' },
    { label: 'Last 7 days', from: 'now-7d' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Dashboard Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Manufacturing Overview</h1>
            <p className="mt-1 text-sm text-gray-500">
              Real-time monitoring of production lines and equipment
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Time Range Selector */}
            <div className="relative">
              <select
                value={timeRange.from}
                onChange={(e) => setTimeRange({ from: e.target.value, to: 'now' })}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {quickRanges.map(range => (
                  <option key={range.from} value={range.from}>
                    {range.label}
                  </option>
                ))}
              </select>
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {/* Refresh Rate */}
            <div className="relative">
              <select
                value={refresh}
                onChange={(e) => setRefresh(e.target.value)}
                className="pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="5s">5 seconds</option>
                <option value="10s">10 seconds</option>
                <option value="30s">30 seconds</option>
                <option value="1m">1 minute</option>
                <option value="5m">5 minutes</option>
              </select>
              <RefreshCw className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {/* Production Line Filter */}
            <select
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Lines</option>
              <option value="line1">Line 1</option>
              <option value="line2">Line 2</option>
              <option value="line3">Line 3</option>
              <option value="line4">Line 4</option>
            </select>

            {/* Settings */}
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grafana Dashboard Embed */}
      <div className="flex-1 p-6 bg-gray-50">
        <GrafanaEmbed
          dashboardUid="manufacturing-overview"
          timeRange={timeRange}
          refresh={refresh}
          variables={{
            line: selectedLine,
          }}
          height="100%"
          className="shadow-lg rounded-lg"
        />
      </div>
    </div>
  );
}