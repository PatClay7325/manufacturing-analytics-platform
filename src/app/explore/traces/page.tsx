'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function TracesPage() {
  const [traceId, setTraceId] = useState('');
  const [timeRange, setTimeRange] = useState('15m');

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Traces</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Explore and analyze distributed traces across your manufacturing systems
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex gap-4">
          {/* Trace ID Search */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={traceId}
                onChange={(e) => setTraceId(e.target.value)}
                placeholder="Search by trace ID..."
                className="w-full px-4 py-2 pl-10 pr-4 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>

          {/* Time Range */}
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-gray-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="5m">Last 5 minutes</option>
              <option value="15m">Last 15 minutes</option>
              <option value="1h">Last 1 hour</option>
              <option value="6h">Last 6 hours</option>
              <option value="1d">Last 1 day</option>
            </select>
          </div>

          {/* Filter Button */}
          <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 
                           border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600
                           focus:outline-none focus:ring-2 focus:ring-blue-500">
            <FunnelIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Trace List */}
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Recent Traces</h3>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          equipment.monitor.check
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Trace ID: {`a1b2c3d4-e5f6-${i}234-5678-90abcdef1234`}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">2m ago</span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs">
                      <span className="text-green-600 dark:text-green-400">Duration: 125ms</span>
                      <span className="text-gray-600 dark:text-gray-400">Spans: 8</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trace Details */}
          <div className="flex-1 bg-gray-50 dark:bg-gray-900">
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select a trace to view details
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Choose a trace from the list to see its spans and timing information
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}