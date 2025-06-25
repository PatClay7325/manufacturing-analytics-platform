'use client';

import React, { useState } from 'react';

export default function TestDashboardDisplay() {
  const [showChart, setShowChart] = useState(true);
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard Display Test</h1>
      
      <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-800">✅ If you can see this, the page is loading correctly!</p>
      </div>

      {/* Simple Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* KPI Cards */}
        <div className="bg-white border rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600">Production Rate</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">95.2%</p>
          <p className="text-sm text-gray-500 mt-1">↑ 2.1% from last hour</p>
        </div>
        
        <div className="bg-white border rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600">Equipment Health</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">98.7%</p>
          <p className="text-sm text-gray-500 mt-1">All systems operational</p>
        </div>
      </div>

      {/* Chart Panel */}
      <div className="bg-white border rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Production Trend</h3>
          <button 
            onClick={() => setShowChart(!showChart)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            {showChart ? 'Hide' : 'Show'} Chart
          </button>
        </div>
        
        {showChart && (
          <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
            {/* Simple SVG Chart */}
            <svg width="100%" height="100%" viewBox="0 0 400 200" className="w-full h-full">
              <polyline
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
                points="0,180 50,160 100,140 150,120 200,100 250,90 300,85 350,80 400,75"
              />
              <text x="200" y="190" textAnchor="middle" className="text-sm fill-gray-600">
                Time →
              </text>
              <text x="10" y="100" className="text-sm fill-gray-600" transform="rotate(-90 10 100)">
                Production →
              </text>
            </svg>
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="mt-6 bg-gray-50 border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Dashboard Test Status:</h3>
        <ul className="text-sm space-y-1">
          <li>✅ Page rendering: OK</li>
          <li>✅ Client-side interactivity: {showChart ? 'Working' : 'Toggle the chart to test'}</li>
          <li>✅ No auth errors</li>
          <li>✅ No API errors on this page</li>
        </ul>
      </div>

      {/* Links to actual dashboards */}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Test Other Dashboards:</h3>
        <div className="space-x-4">
          <a href="/d/test-123" className="text-blue-600 hover:underline">Analytics-style Dashboard</a>
          <a href="/dashboards/1" className="text-blue-600 hover:underline">Dashboard by ID</a>
          <a href="/Analytics-dashboard" className="text-blue-600 hover:underline">Analytics Dashboard</a>
        </div>
      </div>
    </div>
  );
}