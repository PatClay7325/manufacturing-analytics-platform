'use client';

import React, { useState } from 'react';
import { GrafanaEmbed } from '@/components/grafana/GrafanaEmbed';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

export default function OEEDashboard() {
  const [selectedEquipment, setSelectedEquipment] = useState('all');
  const [selectedShift, setSelectedShift] = useState('current');
  const [timeRange, setTimeRange] = useState({ from: 'now-24h', to: 'now' });

  return (
    <div className="h-full flex flex-col">
      {/* Dashboard Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">OEE Analysis</h1>
            <p className="mt-1 text-sm text-gray-500">
              Overall Equipment Effectiveness metrics and analysis
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Equipment Selector */}
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Equipment</option>
              <option value="press1">Press 1</option>
              <option value="press2">Press 2</option>
              <option value="assembly1">Assembly Line 1</option>
              <option value="assembly2">Assembly Line 2</option>
              <option value="packaging">Packaging</option>
            </select>

            {/* Shift Selector */}
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="current">Current Shift</option>
              <option value="morning">Morning (6AM-2PM)</option>
              <option value="afternoon">Afternoon (2PM-10PM)</option>
              <option value="night">Night (10PM-6AM)</option>
              <option value="all">All Shifts</option>
            </select>

            {/* Time Range */}
            <select
              value={timeRange.from}
              onChange={(e) => setTimeRange({ from: e.target.value, to: 'now' })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="now-1h">Last Hour</option>
              <option value="now-6h">Last 6 Hours</option>
              <option value="now-24h">Last 24 Hours</option>
              <option value="now-7d">Last 7 Days</option>
              <option value="now-30d">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grafana Dashboard Embed */}
      <div className="flex-1 p-6 bg-gray-50">
        <GrafanaEmbed
          dashboardUid="oee-analysis"
          timeRange={timeRange}
          variables={{
            equipment: selectedEquipment,
            shift: selectedShift,
          }}
          refresh="30s"
          height="100%"
          className="shadow-lg rounded-lg"
        />
      </div>
    </div>
  );
}