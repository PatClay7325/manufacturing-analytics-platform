'use client';

import { useState, useEffect, useMemo, memo, lazy, Suspense } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import PageLayout from '@/components/layout/PageLayout';

// Dynamically import components with code-splitting
const KpiCard = dynamic(() => import('@/components/dashboard/KpiCard'), {
  loading: () => <div className="h-32 bg-gray-100 rounded-lg animate-pulse"></div>,
  ssr: false
});

const AlertItem = dynamic(() => import('@/components/dashboard/AlertItem'), {
  loading: () => <div className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>,
  ssr: false
});

const EquipmentItem = dynamic(() => import('@/components/dashboard/EquipmentItem'), {
  loading: () => <div className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>,
  ssr: false
});

// Mock data for dashboard - moved outside of component for better performance
const mockKpis = [
  { id: 1, name: 'OEE', value: '78.3%', trend: 'up', change: '2.1%' },
  { id: 2, name: 'Availability', value: '92.7%', trend: 'up', change: '1.3%' },
  { id: 3, name: 'Performance', value: '85.6%', trend: 'down', change: '0.8%' },
  { id: 4, name: 'Quality', value: '99.1%', trend: 'up', change: '0.2%' },
];

const mockAlerts = [
  { id: 1, severity: 'high', message: 'Line 3 throughput below threshold', time: '12 min ago' },
  { id: 2, severity: 'medium', message: 'Preventive maintenance due for Machine A-15', time: '43 min ago' },
  { id: 3, severity: 'low', message: 'Minor quality deviation on Product XYZ', time: '2 hours ago' },
];

const mockEquipment = [
  { id: 1, name: 'Assembly Line 1', status: 'running', uptime: '18.5h' },
  { id: 2, name: 'Packaging Machine B', status: 'maintenance', uptime: '0h' },
  { id: 3, name: 'CNC Router 12', status: 'running', uptime: '72.3h' },
  { id: 4, name: 'Robot Arm 3', status: 'idle', uptime: '4.2h' },
];

// Memoized action button component to prevent unnecessary re-renders
const ActionButton = memo(() => (
  <div className="flex space-x-4">
    <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      Refresh Data
    </button>
    <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
      Add Widget
    </button>
  </div>
));

export default function Dashboard() {
  // Static time for initial render to improve performance
  const [currentTime, setCurrentTime] = useState(() => new Date().toLocaleString());

  // Use useMemo to compute the update interval to reduce unnecessary renders
  const timeUpdateInterval = useMemo(() => 60000, []); // 1 minute in milliseconds

  useEffect(() => {
    // Update the current time only on client side
    if (typeof window !== 'undefined') {
      const updateTime = () => {
        // Use functional update to ensure we always have the latest state
        setCurrentTime(new Date().toLocaleString());
      };
      
      // Update every minute using memoized interval
      const interval = setInterval(updateTime, timeUpdateInterval);
      
      // Clean up interval on component unmount
      return () => clearInterval(interval);
    }
  }, [timeUpdateInterval]); // Only re-run if the interval changes

  // Use the memoized action button
  const actionButton = useMemo(() => <ActionButton />, []);

  return (
    <PageLayout 
      title="Manufacturing Dashboard" 
      actionButton={actionButton}
    >
      <div className="text-sm text-gray-500 mb-8" id="metrics-dashboard">Last updated: {currentTime}</div>

      {/* KPI Cards - Memoized to prevent unnecessary re-renders */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {useMemo(() => mockKpis.map((kpi) => (
          <KpiCard 
            key={kpi.id}
            id={kpi.id}
            name={kpi.name}
            value={kpi.value}
            trend={kpi.trend as 'up' | 'down'}
            change={kpi.change}
          />
        )), [/* mockKpis is static, no dependencies needed */])}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Alerts Panel */}
        <div className="bg-white rounded-lg shadow col-span-1">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Active Alerts</h3>
          </div>
          <div className="divide-y divide-gray-200 alert-list">
            {useMemo(() => mockAlerts.map((alert) => (
              <AlertItem
                key={alert.id}
                id={alert.id}
                severity={alert.severity as 'high' | 'medium' | 'low'}
                message={alert.message}
                time={alert.time}
              />
            )), [/* mockAlerts is static, no dependencies needed */])}
          </div>
          <div className="px-6 py-3 bg-gray-50 text-right rounded-b-lg">
            <Link href="/alerts" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              View all alerts
            </Link>
          </div>
        </div>

        {/* Equipment Status */}
        <div className="bg-white rounded-lg shadow col-span-1 lg:col-span-2">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Equipment Status</h3>
          </div>
          <div className="divide-y divide-gray-200 equipment-list">
            {useMemo(() => mockEquipment.map((equipment) => (
              <EquipmentItem
                key={equipment.id}
                id={equipment.id}
                name={equipment.name}
                status={equipment.status as 'running' | 'maintenance' | 'idle' | 'error'}
                uptime={equipment.uptime}
              />
            )), [/* mockEquipment is static, no dependencies needed */])}
          </div>
          <div className="px-6 py-3 bg-gray-50 text-right rounded-b-lg">
            <Link href="/equipment" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              View all equipment
            </Link>
          </div>
        </div>
      </div>

      {/* Data Visualization Placeholder */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Production Overview</h3>
        <div className="bg-gray-100 h-80 rounded flex items-center justify-center" id="charts">
          <p className="text-gray-500 filters">
            Production charts will appear here. Integrate with Highcharts library.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}