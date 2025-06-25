'use client';

import React, { useState } from 'react';
import { ManufacturingDashboard, ANALYTICS_DASHBOARDS } from '@/components/analytics/ManufacturingDashboard';
import { BarChart3, Activity, Factory, Settings, ChevronRight } from 'lucide-react';

const dashboardCategories = [
  {
    id: 'oee',
    name: 'OEE Analysis',
    icon: BarChart3,
    dashboard: ANALYTICS_DASHBOARDS.MANUFACTURING_OEE,
    variables: {
      site: 'all',
      equipment_type: 'all'
    }
  },
  {
    id: 'equipment',
    name: 'Equipment Health',
    icon: Activity,
    dashboard: ANALYTICS_DASHBOARDS.EQUIPMENT_HEALTH,
    variables: {
      equipment_id: 'all',
      severity: 'all'
    }
  },
  {
    id: 'production',
    name: 'Production Metrics',
    icon: Factory,
    dashboard: ANALYTICS_DASHBOARDS.PRODUCTION_METRICS,
    variables: {
      line: 'all',
      shift: 'current'
    }
  }
];

export default function ManufacturingDashboardsPage() {
  const [selectedDashboard, setSelectedDashboard] = useState(dashboardCategories[0]);
  const [timeRange, setTimeRange] = useState('now-6h');
  const [refreshInterval, setRefreshInterval] = useState('10s');

  const timeRanges = [
    { label: 'Last 15 minutes', value: 'now-15m' },
    { label: 'Last 1 hour', value: 'now-1h' },
    { label: 'Last 6 hours', value: 'now-6h' },
    { label: 'Last 24 hours', value: 'now-24h' },
    { label: 'Last 7 days', value: 'now-7d' },
    { label: 'Last 30 days', value: 'now-30d' }
  ];

  const refreshIntervals = [
    { label: 'Off', value: '' },
    { label: '5s', value: '5s' },
    { label: '10s', value: '10s' },
    { label: '30s', value: '30s' },
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' }
  ];

  return (
    <div>
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Advanced Analytics Dashboards
              </h1>
            </div>
            
            {/* Time Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Time Range:</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e?.target.value)}
                  className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {timeRanges?.map(range => (
                    <option key={range?.value} value={range?.value}>
                      {range?.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Refresh:</label>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(e?.target.value)}
                  className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {refreshIntervals?.map(interval => (
                    <option key={interval?.value} value={interval?.value}>
                      {interval?.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm border-r">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
              Dashboard Categories
            </h2>
            
            <nav className="space-y-1">
              {dashboardCategories?.map((category) => {
                const Icon = category?.icon;
                const isSelected = selectedDashboard?.id === category?.id;
                
                return (
                  <button
                    key={category?.id}
                    onClick={() => setSelectedDashboard(category)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-lg
                      transition-colors duration-150
                      ${isSelected 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                      <span className="font-medium">{category?.name}</span>
                    </div>
                    {isSelected && <ChevronRight className="h-4 w-4" />}
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* Dashboard Info */}
          <div className="p-4 border-t">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              {selectedDashboard?.dashboard.title}
            </h3>
            <p className="text-sm text-gray-600">
              {selectedDashboard?.dashboard.description}
            </p>
          </div>
          
          {/* Integration Settings */}
          <div className="p-4 border-t">
            <button
              onClick={() => window.open('http://localhost:3003', '_blank')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">Analytics Settings</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-auto">
          <ManufacturingDashboard
            key={`${selectedDashboard?.id}-${timeRange}-${refreshInterval}`}
            dashboardId={selectedDashboard?.dashboard.id}
            title={selectedDashboard?.dashboard.title}
            height="calc(100vh - 10rem)"
            timeRange={timeRange}
            refresh={refreshInterval}
            variables={selectedDashboard?.variables}
            theme="light"
            kiosk={true}
          />
        </div>
      </div>
    </div>
  );
}