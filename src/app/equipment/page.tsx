'use client';

import { useState } from 'react';
import Link from 'next/link';

// Mock data for equipment monitoring
const mockEquipment = [
  { 
    id: 1, 
    name: 'Assembly Line 1', 
    status: 'running', 
    uptime: '18.5h',
    efficiency: 86,
    lastMaintenance: '2025-05-28',
    nextMaintenance: '2025-06-28',
    location: 'Building A, Floor 2'
  },
  { 
    id: 2, 
    name: 'Packaging Machine B', 
    status: 'maintenance', 
    uptime: '0h',
    efficiency: 0,
    lastMaintenance: 'In progress',
    nextMaintenance: '2025-07-15',
    location: 'Building A, Floor 1' 
  },
  { 
    id: 3, 
    name: 'CNC Router 12', 
    status: 'running', 
    uptime: '72.3h',
    efficiency: 93,
    lastMaintenance: '2025-05-15',
    nextMaintenance: '2025-06-15',
    location: 'Building B, Floor 1'
  },
  { 
    id: 4, 
    name: 'Robot Arm 3', 
    status: 'idle', 
    uptime: '4.2h',
    efficiency: 0,
    lastMaintenance: '2025-06-01',
    nextMaintenance: '2025-07-01',
    location: 'Building A, Floor 3'
  },
  { 
    id: 5, 
    name: 'Conveyor Belt System', 
    status: 'running', 
    uptime: '120.7h',
    efficiency: 89,
    lastMaintenance: '2025-05-10',
    nextMaintenance: '2025-06-10',
    location: 'Building A, Floor 1'
  },
  { 
    id: 6, 
    name: 'Inspection Station 2', 
    status: 'running', 
    uptime: '45.2h',
    efficiency: 95,
    lastMaintenance: '2025-05-20',
    nextMaintenance: '2025-06-20',
    location: 'Building B, Floor 2'
  },
];

export default function EquipmentMonitoring() {
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter equipment based on status and search query
  const filteredEquipment = mockEquipment.filter(item => {
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Equipment Monitoring</h1>
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
          Back to Dashboard
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <label htmlFor="status-filter" className="text-gray-700 font-medium">Filter by status:</label>
            <select
              id="status-filter"
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="running">Running</option>
              <option value="idle">Idle</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search equipment or location..."
              className="w-full md:w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredEquipment.map((equipment) => (
          <div key={equipment.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{equipment.name}</h2>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  equipment.status === 'running' ? 'bg-green-100 text-green-800' : 
                  equipment.status === 'maintenance' ? 'bg-orange-100 text-orange-800' : 
                  'bg-gray-100 text-gray-800'
                }`}>
                  {equipment.status.charAt(0).toUpperCase() + equipment.status.slice(1)}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">{equipment.location}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Current Uptime</p>
                  <p className="font-medium">{equipment.uptime}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Last Maintenance</p>
                  <p className="font-medium">{equipment.lastMaintenance}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Next Maintenance</p>
                  <p className="font-medium">{equipment.nextMaintenance}</p>
                </div>
              </div>
              
              {/* Efficiency Bar */}
              {equipment.status !== 'maintenance' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-gray-500">Efficiency</p>
                    <p className="text-sm font-medium">{equipment.efficiency}%</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        equipment.efficiency > 90 ? 'bg-green-600' : 
                        equipment.efficiency > 75 ? 'bg-yellow-500' : 
                        'bg-red-500'
                      }`}
                      style={{ width: `${equipment.efficiency}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 px-6 py-3 flex justify-end">
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {filteredEquipment.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No equipment matches your current filters.</p>
        </div>
      )}
    </div>
  );
}