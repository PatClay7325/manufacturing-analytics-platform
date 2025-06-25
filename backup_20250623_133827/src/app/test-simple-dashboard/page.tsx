'use client';

import React from 'react';

export default function TestSimpleDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Dashboard</h1>
      
      {/* Simple test to verify page is loading */}
      <div className="bg-white border rounded-lg shadow p-6 mb-4">
        <h2 className="text-lg font-semibold mb-2">✅ Page is loading correctly</h2>
        <p>If you can see this, the routing is working fine.</p>
      </div>

      {/* Test data display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900">Metric 1</h3>
          <p className="text-3xl font-bold text-blue-700">42.5%</p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-900">Metric 2</h3>
          <p className="text-3xl font-bold text-green-700">98.2%</p>
        </div>
      </div>

      {/* Simple chart placeholder */}
      <div className="mt-6 bg-gray-100 border rounded-lg p-8 text-center">
        <p className="text-gray-600">Chart would render here</p>
        <div className="mt-4 h-64 bg-white border rounded flex items-center justify-center">
          <span className="text-gray-400">📊 Chart Placeholder</span>
        </div>
      </div>

      {/* Debug info */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">Debug Info:</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Current time: {new Date().toLocaleString()}</li>
          <li>• Page route: /test-simple-dashboard</li>
          <li>• Next.js is working correctly</li>
          <li>• No param warnings affect this page</li>
        </ul>
      </div>
    </div>
  );
}