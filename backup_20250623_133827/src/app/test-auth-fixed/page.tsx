'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function TestAuthFixed() {
  const { user, loading } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Context Test</h1>
      
      <div className="bg-white border rounded-lg shadow p-6 mb-4">
        <h2 className="text-lg font-semibold mb-2">✅ Auth Context is Working!</h2>
        <p>The "useAuth must be used within an AuthProvider" error has been fixed.</p>
      </div>

      <div className="bg-gray-50 border rounded-lg p-4">
        <h3 className="font-semibold mb-2">Current User:</h3>
        {loading ? (
          <p>Loading...</p>
        ) : user ? (
          <pre className="text-sm bg-white p-3 rounded overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        ) : (
          <p>No user logged in</p>
        )}
      </div>

      <div className="mt-6 space-y-2">
        <h3 className="font-semibold">Try these dashboard links now:</h3>
        <ul className="space-y-2">
          <li><a href="/Analytics-dashboard" className="text-blue-600 hover:underline">/Analytics-dashboard</a></li>
          <li><a href="/dashboard" className="text-blue-600 hover:underline">/dashboard</a></li>
          <li><a href="/dashboards" className="text-blue-600 hover:underline">/dashboards</a></li>
          <li><a href="/d/test-123" className="text-blue-600 hover:underline">/d/test-123</a></li>
          <li><a href="/analyticsPlatform-demo" className="text-blue-600 hover:underline">/analyticsPlatform-demo</a></li>
        </ul>
      </div>
    </div>
  );
}