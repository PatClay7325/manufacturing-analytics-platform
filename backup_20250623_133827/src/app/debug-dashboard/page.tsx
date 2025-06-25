'use client';

import React, { useEffect, useState } from 'react';

export default function DebugDashboard() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Try to load the AnalyticsPlatform component
    try {
      const analyticsModule = require('@/core/analytics');
      setDebugInfo({
        hasAnalyticsPlatform: !!analyticsModule.AnalyticsPlatform,
        hasCreateManufacturingDashboard: !!analyticsModule.createManufacturingDashboard,
        hasDefaultAnalyticsConfig: !!analyticsModule.defaultAnalyticsConfig,
        exports: Object.keys(analyticsModule || {}),
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load Analytics module');
    }
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Dashboard Debug Page</h1>
      
      {/* Status */}
      <div className={`mb-6 p-4 rounded-lg ${error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
        <h2 className="font-semibold mb-2">Status</h2>
        {error ? (
          <p className="text-red-700">❌ Error: {error}</p>
        ) : (
          <p className="text-green-700">✅ Page loaded successfully</p>
        )}
      </div>

      {/* Debug Info */}
      <div className="bg-gray-50 border rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-3">Analytics Module Debug Info</h2>
        <pre className="text-sm bg-white p-3 rounded overflow-auto">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>

      {/* Test Components */}
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Component Tests</h3>
          <ul className="space-y-2 text-sm">
            <li>• Basic React rendering: ✅ Working</li>
            <li>• Tailwind CSS: {document.querySelector('[class*="text-3xl"]') ? '✅ Working' : '❌ Not loaded'}</li>
            <li>• Client-side JavaScript: ✅ Working</li>
          </ul>
        </div>

        {/* Try to render a simple chart */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Simple Chart Test</h3>
          <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
            <svg width="200" height="100" viewBox="0 0 200 100">
              <rect x="10" y="60" width="30" height="40" fill="#3B82F6" />
              <rect x="50" y="40" width="30" height="60" fill="#10B981" />
              <rect x="90" y="20" width="30" height="80" fill="#F59E0B" />
              <rect x="130" y="50" width="30" height="50" fill="#EF4444" />
              <rect x="170" y="30" width="30" height="70" fill="#8B5CF6" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 mt-2">If you see bars above, SVG rendering is working</p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Troubleshooting Steps:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Open browser DevTools (F12) and check Console for errors</li>
          <li>Check Network tab for failed requests</li>
          <li>Try visiting: <a href="/test-simple-dashboard" className="underline">Simple Test Dashboard</a></li>
          <li>Clear browser cache and cookies</li>
          <li>Restart the development server</li>
        </ol>
      </div>

      {/* Direct Dashboard Links */}
      <div className="mt-6 border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Test These Dashboard URLs:</h3>
        <ul className="space-y-2">
          <li><a href="/dashboard" className="text-blue-600 hover:underline">/dashboard</a> - Main dashboard</li>
          <li><a href="/dashboards" className="text-blue-600 hover:underline">/dashboards</a> - Dashboard list</li>
          <li><a href="/d/test-123" className="text-blue-600 hover:underline">/d/test-123</a> - Analytics-style route</li>
          <li><a href="/Analytics-dashboard" className="text-blue-600 hover:underline">/Analytics-dashboard</a> - Analytics</li>
        </ul>
      </div>
    </div>
  );
}