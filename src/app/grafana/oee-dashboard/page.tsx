'use client';

import GrafanaEmbed from '@/components/grafana/GrafanaEmbed';

export default function GrafanaOEEDashboardPage() {
  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">ISO 22400 OEE Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Real-time Overall Equipment Effectiveness metrics from Grafana
              </p>
            </div>
            <a 
              href="http://localhost:3001/d/iso22400-oee-metrics/iso-22400-oee-metrics-dashboard" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
            >
              Open in Grafana →
            </a>
          </div>
        </div>
      </div>

      {/* Grafana Dashboard */}
      <div className="flex-1 overflow-hidden">
        <GrafanaEmbed
          dashboardUid="iso22400-oee-metrics"
          height="100%"
          refresh="30s"
          theme="light"
          from="now-7d"
          to="now"
          vars={{
            'DS_MANUFACTURING_POSTGRESQL': 'Manufacturing PostgreSQL'
          }}
        />
      </div>
    </div>
  );
}
