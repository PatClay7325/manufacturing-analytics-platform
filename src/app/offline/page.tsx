'use client';

import React from 'react';
import { WifiOff, RefreshCw, Database, Clock } from 'lucide-react';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <WifiOff className="mx-auto h-24 w-24 text-gray-400" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          You're Offline
        </h1>
        
        <p className="text-lg text-gray-600 mb-8">
          It looks like you've lost your internet connection. Don't worry, your data is safe.
        </p>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Available Offline Features
          </h2>
          
          <div className="space-y-3 text-left">
            <div className="flex items-start">
              <Database className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Cached Data</p>
                <p className="text-sm text-gray-600">
                  View previously loaded dashboards and metrics
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <Clock className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Recent Activity</p>
                <p className="text-sm text-gray-600">
                  Access your recent alerts and equipment status
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleRetry}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <RefreshCw className="h-5 w-5 mr-2" />
          Try Again
        </button>

        <p className="mt-6 text-sm text-gray-500">
          Your pending actions will be synced automatically when you're back online
        </p>
      </div>
    </div>
  );
}