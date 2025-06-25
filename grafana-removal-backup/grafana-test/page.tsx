'use client';

import GrafanaEmbed from '@/components/grafana/GrafanaEmbed';

export default function GrafanaTestPage() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <h1 className="text-2xl font-bold mb-4">Grafana Dashboard Test</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Manufacturing Overview Dashboard</h2>
        <GrafanaEmbed
          dashboardName="manufacturing-overview"
          height="600px"
          theme="dark"
          refresh="10s"
          kiosk={true}
        />
      </div>
      
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <h2 className="text-lg font-semibold mb-2">Direct Grafana URL</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          If the embed doesn't work, try accessing Grafana directly:
        </p>
        <a 
          href="http://localhost:3001/d/manufacturing-overview/manufacturing-overview?orgId=1&kiosk=1&theme=dark"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700"
        >
          Open Manufacturing Overview in Grafana
        </a>
      </div>
    </div>
  );
}