'use client';

import React, { useState } from 'react';
import { RealTimeDashboard } from '@/components/streaming/RealTimeDashboard';
import { Wifi, WifiOff, Radio, Activity } from 'lucide-react';

export default function RealTimePage() {
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  
  // Demo equipment list
  const availableEquipment = [
    { id: 'eq_001', name: 'CNC Machine 1' },
    { id: 'eq_002', name: 'Assembly Line A' },
    { id: 'eq_003', name: 'Welding Robot 1' },
    { id: 'eq_004', name: 'Quality Station 2' },
    { id: 'eq_005', name: 'Packaging Line B' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Real-Time Manufacturing Stream
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
            Experience live data streaming from the manufacturing floor. This dashboard demonstrates 
            real-time updates using Server-Sent Events (SSE) and WebSocket connections for 
            bi-directional communication.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center gap-3 mb-3">
              <Radio className="w-6 h-6 text-green-500" />
              <h3 className="text-lg font-semibold">Server-Sent Events</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Unidirectional streaming from server to client. Ideal for dashboards and monitoring.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center gap-3 mb-3">
              <Wifi className="w-6 h-6 text-blue-500" />
              <h3 className="text-lg font-semibold">WebSocket Support</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Bi-directional communication for real-time commands and queries.
            </p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <div className="flex items-center gap-3 mb-3">
              <WifiOff className="w-6 h-6 text-orange-500" />
              <h3 className="text-lg font-semibold">Auto-Reconnection</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automatic reconnection with exponential backoff for resilient connections.
            </p>
          </div>
        </div>

        {/* Equipment Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow mb-8">
          <h3 className="text-lg font-semibold mb-4">Equipment Filter</h3>
          <div className="flex flex-wrap gap-3">
            {availableEquipment.map(equipment => (
              <label
                key={equipment.id}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedEquipment.includes(equipment.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEquipment([...selectedEquipment, equipment.id]);
                    } else {
                      setSelectedEquipment(selectedEquipment.filter(id => id !== equipment.id));
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {equipment.name}
                </span>
              </label>
            ))}
            <button
              onClick={() => setSelectedEquipment([])}
              className="ml-auto text-sm text-blue-500 hover:text-blue-600"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Real-Time Dashboard */}
        <RealTimeDashboard 
          equipment={selectedEquipment.length > 0 ? selectedEquipment : undefined}
        />

        {/* Technical Details */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">Technical Implementation</h3>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium mb-2">Data Sources</h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Performance metrics (OEE, availability, quality)</li>
                <li>• Real-time alerts and notifications</li>
                <li>• Equipment status updates</li>
                <li>• Quality metrics and inspection results</li>
                <li>• Maintenance events and predictions</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Stream Types</h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">metric</code> - Performance data</li>
                <li>• <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">alert</code> - System alerts</li>
                <li>• <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">equipment</code> - Status changes</li>
                <li>• <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">quality</code> - Quality metrics</li>
                <li>• <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">maintenance</code> - Maintenance events</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded">
            <h4 className="font-medium mb-2">API Endpoints</h4>
            <div className="space-y-2 font-mono text-xs">
              <div>
                <span className="text-green-600 dark:text-green-400">GET</span>
                <span className="ml-2">/api/stream/manufacturing</span>
                <span className="ml-2 text-gray-500">- SSE endpoint</span>
              </div>
              <div>
                <span className="text-blue-600 dark:text-blue-400">WS</span>
                <span className="ml-2">/ws</span>
                <span className="ml-2 text-gray-500">- WebSocket endpoint</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}