'use client';

import React, { useState } from 'react';
import { RealTimeDashboard } from '@/components/dashboard/RealTimeDashboard';
import { LiveManufacturingDashboard } from '@/components/dashboard/LiveManufacturingDashboard';
import { Monitor, Zap, Settings } from 'lucide-react';

export default function RealTimeDashboardPage() {
  const [view, setView] = useState<'streaming' | 'comprehensive'>('streaming');
  const [refreshRate, setRefreshRate] = useState(1); // seconds

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Real-Time Manufacturing Monitor</h1>
              
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setView('streaming')}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    view === 'streaming'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Streaming View
                </button>
                <button
                  onClick={() => setView('comprehensive')}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    view === 'comprehensive'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Comprehensive View
                </button>
              </div>
            </div>
            
            {/* Settings */}
            {view === 'streaming' && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Settings className="h-4 w-4 text-gray-500" />
                  <label className="text-sm font-medium text-gray-700">Update Rate:</label>
                  <select
                    value={refreshRate}
                    onChange={(e) => setRefreshRate(Number(e.target.value))}
                    className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value={0.5}>500ms</option>
                    <option value={1}>1 second</option>
                    <option value={2}>2 seconds</option>
                    <option value={5}>5 seconds</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Dashboard Content */}
      <div className="p-6">
        {view === 'streaming' ? (
          <RealTimeDashboard />
        ) : (
          <LiveManufacturingDashboard 
            defaultTimeRange="1h"
            refreshInterval={5} // 5 second refresh for comprehensive view
          />
        )}
      </div>
    </div>
  );
}