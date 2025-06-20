'use client';

import React from 'react';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageLayout from '@/components/layout/PageLayout';

// Mock data for dashboard
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

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Update the current time
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now?.toLocaleString());
    };
    
    updateTime();
    const interval = setInterval(updateTime, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Custom action button for the dashboard
  const actionButton = (
    <div className="flex space-x-4">
      <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h?.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
  );

  return (
    <PageLayout 
      title="Manufacturing Dashboard" 
      actionButton={actionButton}
    >
      <div className="text-sm text-gray-500 mb-8">Last updated: {currentTime}</div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {mockKpis?.map((kpi) => (
          <div key={kpi?.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center">
              <h3 className="text-gray-500 text-sm font-medium">{kpi?.name}</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                kpi?.trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {kpi?.trend === 'up' ? '↑' : '↓'} {kpi?.change}
              </span>
            </div>
            <div className="mt-2 text-3xl font-semibold text-gray-900">{kpi?.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Alerts Panel */}
        <div className="bg-white rounded-lg shadow col-span-1">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Active Alerts</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {mockAlerts?.map((alert) => (
              <div key={alert?.id} className="px-6 py-4">
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full mr-3 ${
                    alert?.severity === 'high' ? 'bg-red-500' : alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{alert?.message}</p>
                    <p className="text-xs text-gray-500">{alert?.time}</p>
                  </div>
                </div>
              </div>
            ))}
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
          <div className="divide-y divide-gray-200">
            {mockEquipment?.map((equipment) => (
              <div key={equipment?.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full mr-3 ${
                    equipment?.status === 'running' ? 'bg-green-500' : equipment.status === 'maintenance' ? 'bg-orange-500' : 'bg-gray-500'
                  }`}></div>
                  <span className="text-sm font-medium text-gray-900">{equipment?.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-4">
                    Uptime: {equipment?.uptime}
                  </span>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 capitalize">
                    {equipment?.status}
                  </span>
                </div>
              </div>
            ))}
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
        <div className="bg-gray-100 h-80 rounded flex items-center justify-center">
          <p className="text-gray-500">
            Production charts will appear here.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}