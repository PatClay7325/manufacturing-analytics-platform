'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { GrafanaEmbed } from '@/components/grafana/GrafanaEmbed';
import { Calendar, RefreshCw, Maximize2, ExternalLink, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ViewDashboard() {
  const params = useParams();
  const dashboardUid = params.uid as string;
  
  const [timeRange, setTimeRange] = useState({
    from: 'now-6h',
    to: 'now'
  });
  const [refresh, setRefresh] = useState('30s');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const quickRanges = [
    { label: 'Last 5 minutes', from: 'now-5m' },
    { label: 'Last 15 minutes', from: 'now-15m' },
    { label: 'Last 30 minutes', from: 'now-30m' },
    { label: 'Last 1 hour', from: 'now-1h' },
    { label: 'Last 3 hours', from: 'now-3h' },
    { label: 'Last 6 hours', from: 'now-6h' },
    { label: 'Last 12 hours', from: 'now-12h' },
    { label: 'Last 24 hours', from: 'now-24h' },
    { label: 'Last 2 days', from: 'now-2d' },
    { label: 'Last 7 days', from: 'now-7d' },
    { label: 'Last 30 days', from: 'now-30d' },
  ];

  const openInGrafana = () => {
    const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || '/grafana';
    window.open(`${grafanaUrl}/d/${dashboardUid}`, '_blank');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboards/browse"
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Dashboard View</h1>
              <p className="text-sm text-gray-500">ID: {dashboardUid}</p>
            </div>
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
                <option value="off">Off</option>
                <option value="5s">5 seconds</option>
                <option value="10s">10 seconds</option>
                <option value="30s">30 seconds</option>
                <option value="1m">1 minute</option>
                <option value="5m">5 minutes</option>
                <option value="10m">10 minutes</option>
                <option value="30m">30 minutes</option>
                <option value="1h">1 hour</option>
              </select>
              <RefreshCw className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 border-l border-gray-200 pl-4">
              <button
                onClick={toggleFullscreen}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                title="Toggle fullscreen"
              >
                <Maximize2 className="h-5 w-5" />
              </button>
              <button
                onClick={openInGrafana}
                className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Edit in Grafana
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grafana Dashboard Embed */}
      <div className="flex-1 bg-gray-50">
        <GrafanaEmbed
          dashboardUid={dashboardUid}
          timeRange={timeRange}
          refresh={refresh}
          height="100%"
          className="h-full"
        />
      </div>
    </div>
  );
}