import React from 'react';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  uptime: string;
  lastIncident: string;
  description: string;
}

export default function StatusPage() {
  const services: ServiceStatus[] = [
    {
      name: 'API Services',
      status: 'operational',
      uptime: '99.99%',
      lastIncident: '30 days ago',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit'
    },
    {
      name: 'Manufacturing Dashboard',
      status: 'operational',
      uptime: '99.95%',
      lastIncident: '15 days ago',
      description: 'Sed do eiusmod tempor incididunt ut labore et dolore magna'
    },
    {
      name: 'AI Analytics Engine',
      status: 'operational',
      uptime: '99.97%',
      lastIncident: '7 days ago',
      description: 'Ut enim ad minim veniam, quis nostrud exercitation'
    },
    {
      name: 'Equipment Monitoring',
      status: 'operational',
      uptime: '99.98%',
      lastIncident: '45 days ago',
      description: 'Duis aute irure dolor in reprehenderit in voluptate'
    },
    {
      name: 'Alert System',
      status: 'operational',
      uptime: '100%',
      lastIncident: 'Never',
      description: 'Excepteur sint occaecat cupidatat non proident'
    },
    {
      name: 'Data Processing Pipeline',
      status: 'maintenance',
      uptime: '99.92%',
      lastIncident: 'Today',
      description: 'Sunt in culpa qui officia deserunt mollit anim'
    }
  ];

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'outage':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'maintenance':
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'outage':
        return '🔴';
      case 'maintenance':
        return '🔧';
    }
  };

  const overallStatus = services.every(s => s.status === 'operational') ? 'operational' : 'partial';

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">System Status</h1>
        <p className="text-lg text-gray-600">
          Real-time status of Adaptive Factory AI Solutions services
        </p>
      </div>

      {/* Overall Status */}
      <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-2">
              {overallStatus === 'operational' ? 'All Systems Operational' : 'Partial System Outage'}
            </h2>
            <p className="text-gray-600">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Last updated: {new Date().toLocaleString()}
            </p>
          </div>
          <div className={`text-6xl ${overallStatus === 'operational' ? 'text-green-500' : 'text-yellow-500'}`}>
            {overallStatus === 'operational' ? '✅' : '⚠️'}
          </div>
        </div>
      </div>

      {/* Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {services.map((service) => (
          <div key={service.name} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold mb-1">{service.name}</h3>
                <p className="text-gray-600 text-sm">{service.description}</p>
              </div>
              <span className="text-2xl">{getStatusIcon(service.status)}</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(service.status)}`}>
                  {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Uptime (30d)</span>
                <span className="font-medium">{service.uptime}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Last Incident</span>
                <span className="text-sm">{service.lastIncident}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Incidents */}
      <div className="bg-gray-50 rounded-lg p-8 mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Incidents</h2>
        
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold">Scheduled Maintenance - Data Processing Pipeline</h3>
              <span className="text-sm text-gray-500">Today, 2:00 AM - 4:00 AM</span>
            </div>
            <p className="text-gray-600">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-green-500">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold">Resolved - API Response Latency</h3>
              <span className="text-sm text-gray-500">7 days ago</span>
            </div>
            <p className="text-gray-600">
              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-green-500">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold">Resolved - Dashboard Loading Issues</h3>
              <span className="text-sm text-gray-500">15 days ago</span>
            </div>
            <p className="text-gray-600">
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </div>
        </div>
      </div>

      {/* Uptime Statistics */}
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Uptime Statistics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">99.97%</div>
            <div className="text-gray-600">Overall Uptime</div>
            <div className="text-sm text-gray-500 mt-1">Last 30 days</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">2.1s</div>
            <div className="text-gray-600">Avg Response Time</div>
            <div className="text-sm text-gray-500 mt-1">API endpoints</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">3</div>
            <div className="text-gray-600">Total Incidents</div>
            <div className="text-sm text-gray-500 mt-1">Last 30 days</div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">12min</div>
            <div className="text-gray-600">Avg Resolution Time</div>
            <div className="text-sm text-gray-500 mt-1">Critical issues</div>
          </div>
        </div>
      </div>

      {/* Subscribe to Updates */}
      <div className="mt-12 bg-blue-50 rounded-lg p-8 text-center">
        <h3 className="text-xl font-semibold mb-4">Subscribe to Status Updates</h3>
        <p className="text-gray-600 mb-6">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Get notified about scheduled maintenance and incidents.
        </p>
        <div className="flex max-w-md mx-auto">
          <input
            type="email"
            placeholder="lorem@ipsum.com"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button className="bg-blue-600 text-white px-6 py-2 rounded-r-lg hover:bg-blue-700 transition-colors">
            Subscribe
          </button>
        </div>
      </div>
    </div>
  );
}