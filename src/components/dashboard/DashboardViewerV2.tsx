'use client';

import React, { useState, useEffect } from 'react';
import { Dashboard, Panel } from '@/types/dashboard';
import { RefreshCw, Maximize2, Download, Share2 } from 'lucide-react';
import TimeRangePicker from './TimeRangePicker';
import RefreshPicker from './RefreshPicker';

interface DashboardViewerV2Props {
  dashboard: Dashboard;
  isEmbedded?: boolean;
  onEdit?: () => void;
}

export default function DashboardViewerV2({ 
  dashboard, 
  isEmbedded = false, 
  onEdit 
}: DashboardViewerV2Props) {
  const [timeRange, setTimeRange] = useState(dashboard.time || { from: 'now-6h', to: 'now' });
  const [refreshInterval, setRefreshInterval] = useState(dashboard.refresh || '');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (refreshInterval && refreshInterval !== '') {
      const interval = parseRefreshInterval(refreshInterval);
      if (interval > 0) {
        const timer = setInterval(() => {
          // Trigger dashboard refresh
          console.log('Refreshing dashboard...');
        }, interval);
        return () => clearInterval(timer);
      }
    }
  }, [refreshInterval]);

  const parseRefreshInterval = (interval: string): number => {
    const match = interval.match(/(\d+)([smh])/);
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

  const renderPanel = (panel: Panel) => {
    // Simplified panel rendering - in a real implementation, this would
    // render the actual visualization based on panel type
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-full">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {panel.title}
          </h3>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-center h-48 text-gray-400">
            <div className="text-center">
              <div className="text-lg font-medium mb-2">{panel.type}</div>
              <div className="text-sm">Panel ID: {panel.id}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50' : ''} bg-gray-50 dark:bg-gray-900 min-h-screen`}>
      {/* Dashboard Header */}
      {!isEmbedded && (
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {dashboard.title}
                </h1>
                {dashboard.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {dashboard.description}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <TimeRangePicker
                  value={timeRange}
                  onChange={setTimeRange}
                />
                <RefreshPicker
                  value={refreshInterval}
                  onChange={setRefreshInterval}
                />
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Toggle fullscreen"
                >
                  <Maximize2 className="h-5 w-5" />
                </button>
                <button
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Share dashboard"
                >
                  <Share2 className="h-5 w-5" />
                </button>
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Panels */}
      <div className="p-4">
        {dashboard.panels.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p>This dashboard doesn't have any panels yet.</p>
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add Panel
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-24 gap-4">
            {dashboard.panels.map((panel) => (
              <div
                key={panel.id}
                style={{
                  gridColumn: `span ${panel.gridPos.w} / span ${panel.gridPos.w}`,
                  minHeight: `${panel.gridPos.h * 30}px`
                }}
              >
                {renderPanel(panel)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exit Fullscreen */}
      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className="fixed top-4 right-4 p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
        >
          Exit Fullscreen
        </button>
      )}
    </div>
  );
}