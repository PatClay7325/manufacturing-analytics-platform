'use client';

import React, { useState, useEffect } from 'react';
import { LiveManufacturingDashboard } from '@/components/dashboard/LiveManufacturingDashboard';
import { Activity, RefreshCw, Circle } from 'lucide-react';

export default function LiveDashboardPage() {
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isLive, setIsLive] = useState(true);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000); // Update timestamp every second
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Live Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Live Manufacturing Dashboard</h1>
              
              {/* Live Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Circle className={`h-3 w-3 ${isLive ? 'text-green-500' : 'text-gray-400'} fill-current`} />
                  {isLive && (
                    <Circle className="absolute top-0 left-0 h-3 w-3 text-green-500 fill-current animate-ping" />
                  )}
                </div>
                <span className={`text-sm font-medium ${isLive ? 'text-green-600' : 'text-gray-500'}`}>
                  {isLive ? 'LIVE' : 'PAUSED'}
                </span>
              </div>
              
              {/* Refresh Rate */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <RefreshCw className="h-4 w-4" />
                <span>Auto-refresh: 30s</span>
              </div>
            </div>
            
            {/* Last Update */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Activity className="h-4 w-4" />
              <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dashboard Content */}
      <div className="p-6">
        <LiveManufacturingDashboard 
          defaultTimeRange="1h"
          refreshInterval={30}
        />
      </div>
    </div>
  );
}