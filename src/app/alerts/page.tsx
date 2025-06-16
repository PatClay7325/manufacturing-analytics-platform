'use client';

import { useState } from 'react';
import Link from 'next/link';

// Mock data for alerts
const mockAlerts = [
  { 
    id: 1, 
    severity: 'high', 
    message: 'Line 3 throughput below threshold', 
    time: '2025-06-16T09:30:00Z',
    source: 'Assembly Line 3',
    status: 'active',
    details: 'Production rate dropped to 72 units/hour, below the threshold of 80 units/hour.'
  },
  { 
    id: 2, 
    severity: 'medium', 
    message: 'Preventive maintenance due for Machine A-15', 
    time: '2025-06-16T08:55:00Z',
    source: 'Machine A-15',
    status: 'active',
    details: 'Scheduled maintenance is due in 24 hours. Plan for downtime of approximately 4 hours.'
  },
  { 
    id: 3, 
    severity: 'low', 
    message: 'Minor quality deviation on Product XYZ', 
    time: '2025-06-16T07:30:00Z',
    source: 'Quality Station 2',
    status: 'active',
    details: 'Dimensional variation detected. Current: 10.2mm, Specification: 10.0±0.1mm.'
  },
  { 
    id: 4, 
    severity: 'high', 
    message: 'Temperature exceeding limits on Furnace 2', 
    time: '2025-06-16T06:15:00Z',
    source: 'Furnace 2',
    status: 'resolved',
    details: 'Temperature reached 1250°C, exceeding the upper limit of 1200°C. Automatic cooling initiated.'
  },
  { 
    id: 5, 
    severity: 'medium', 
    message: 'Material inventory low for Component B-42', 
    time: '2025-06-16T04:45:00Z',
    source: 'Inventory System',
    status: 'active',
    details: 'Current inventory: 157 units. Reorder point: 200 units. Suggested action: Place order.'
  },
  { 
    id: 6, 
    severity: 'low', 
    message: 'Network latency increased on factory floor', 
    time: '2025-06-15T22:30:00Z',
    source: 'Network Monitoring',
    status: 'resolved',
    details: 'Average latency increased to 120ms. Investigate potential causes during next maintenance window.'
  },
  { 
    id: 7, 
    severity: 'high', 
    message: 'Emergency stop activated on Robot Cell 4', 
    time: '2025-06-15T20:10:00Z',
    source: 'Robot Cell 4',
    status: 'resolved',
    details: 'Emergency stop button activated by operator. Inspection required before restart.'
  },
];

export default function AlertsPage() {
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // Filter alerts based on severity, status, and search query
  const filteredAlerts = mockAlerts.filter(alert => {
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    const matchesStatus = filterStatus === 'all' || alert.status === filterStatus;
    const matchesSearch = alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         alert.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         alert.details.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesStatus && matchesSearch;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Manufacturing Alerts</h1>
        <Link href="/dashboard" className="text-blue-600 hover:text-blue-800">
          Back to Dashboard
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label htmlFor="severity-filter" className="text-gray-700 font-medium mb-2">Severity</label>
            <select
              id="severity-filter"
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
            >
              <option value="all">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div className="flex flex-col">
            <label htmlFor="status-filter" className="text-gray-700 font-medium mb-2">Status</label>
            <select
              id="status-filter"
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
          
          <div className="flex flex-col">
            <label htmlFor="search-input" className="text-gray-700 font-medium mb-2">Search</label>
            <div className="relative">
              <input
                id="search-input"
                type="text"
                placeholder="Search alerts..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10"
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
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alert
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAlerts.map((alert) => (
                <tr key={alert.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`h-3 w-3 rounded-full mr-2 ${
                        alert.severity === 'high' ? 'bg-red-500' : 
                        alert.severity === 'medium' ? 'bg-yellow-500' : 
                        'bg-blue-500'
                      }`}></div>
                      <span className="text-sm font-medium capitalize">{alert.severity}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{alert.message}</div>
                    <div className="text-xs text-gray-500">{alert.details}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {alert.source}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(alert.time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      alert.status === 'active' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {alert.status === 'active' ? (
                      <button className="text-blue-600 hover:text-blue-900">Acknowledge</button>
                    ) : (
                      <button className="text-gray-600 hover:text-gray-900">View Details</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredAlerts.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500">No alerts match your current filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}