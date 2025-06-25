'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function TestContextHierarchy() {
  // This will throw an error if AuthProvider is missing
  let authStatus = 'checking...';
  let authError = null;
  
  try {
    const { user, loading } = useAuth();
    authStatus = loading ? 'loading' : (user ? `logged in as ${user.email}` : 'not logged in');
  } catch (err) {
    authError = err instanceof Error ? err.message : 'Unknown error';
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Context Hierarchy Test</h1>
      
      <div className="space-y-4">
        <div className="bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Auth Context Status:</h2>
          {authError ? (
            <div className="text-red-600">
              <p className="font-semibold">❌ Error:</p>
              <p>{authError}</p>
            </div>
          ) : (
            <div className="text-green-600">
              <p>✅ Auth context is available!</p>
              <p>Status: {authStatus}</p>
            </div>
          )}
        </div>

        <div className="bg-gray-50 border rounded-lg p-4">
          <h3 className="font-semibold mb-2">Expected Component Hierarchy:</h3>
          <pre className="text-sm">
{`RootLayout (src/app/layout.tsx)
  └── ErrorBoundary
      └── ClientLayout (with AuthProvider)
          └── AnalyticsPlatformLayout
              └── TestContextHierarchy (this page)`}
          </pre>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">If you see an error:</h3>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
            <li>Make sure the dev server has restarted</li>
            <li>Clear browser cache (Ctrl+Shift+Delete)</li>
            <li>Hard refresh (Ctrl+F5)</li>
            <li>Check the console for any other errors</li>
          </ol>
        </div>
      </div>
    </div>
  );
}