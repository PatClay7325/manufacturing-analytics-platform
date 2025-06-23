'use client';

import GrafanaEmbed from '@/components/grafana/GrafanaEmbed';

export default function QualityDashboard() {
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Quality Analytics</h1>
        <p className="text-gray-600">Quality metrics and statistical process control</p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <p className="text-sm text-blue-800 mb-2">
          Access comprehensive quality analytics in Grafana:
        </p>
        <a
          href={`${grafanaUrl}/dashboards`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Open Quality Dashboards in Grafana →
        </a>
      </div>

      {/* Embed a specific quality panel if available */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-xl font-semibold mb-4">Quality Metrics Overview</h2>
        <p className="text-gray-600 mb-4">
          Quality dashboards are available in Grafana with detailed SPC charts, defect analysis, and trend monitoring.
        </p>
      </div>
    </div>
  );
}
