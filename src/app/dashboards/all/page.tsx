'use client';

import Link from 'next/link';

export default function AllDashboards() {
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';

  const dashboards = [
    {
      category: 'Manufacturing',
      items: [
        {
          title: 'Manufacturing Overview - OEE & KPIs',
          uid: 'manufacturing-overview',
          description: 'Complete OEE metrics, performance indicators, and quality analytics'
        },
        {
          title: 'Equipment Monitoring',
          uid: 'eccf7a2c-5fbe-4965-bd12-d9cbf4df6ba3',
          description: 'Real-time equipment status, availability, and performance'
        },
        {
          title: 'Production Overview',
          uid: 'df5db14d-c600-4785-bff9-67ab9d0ab1eb',
          description: 'Production metrics with shift analysis and line performance'
        },
        {
          title: 'Variable System Demo',
          uid: 'variable-demo',
          description: 'Dashboard with dynamic facility and line selection'
        }
      ]
    },
    {
      category: 'System Monitoring',
      items: [
        {
          title: 'System Health & Infrastructure',
          uid: 'system-health-monitoring',
          description: 'CPU, memory, disk usage, and system performance'
        },
        {
          title: 'Real-Time System Monitoring',
          uid: 'prometheus-realtime-001',
          description: 'Live Prometheus metrics and alerts'
        },
        {
          title: 'Docker & Container Monitoring',
          uid: 'a6f51ec5-2f07-474d-bfd7-36c9c57db801',
          description: 'Container health, resource usage, and performance'
        },
        {
          title: 'Observability Overview',
          uid: 'observability-overview',
          description: 'Logs, metrics, and traces in one view'
        }
      ]
    }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">All Available Dashboards</h1>
        <p className="text-gray-600 mb-4">
          Browse and access all manufacturing and system monitoring dashboards
        </p>
        
        <div className="flex gap-4">
          <Link
            href="/dashboards/manufacturing"
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            ← Back to Manufacturing
          </Link>
          <a
            href={grafanaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Open Grafana →
          </a>
        </div>
      </div>

      {dashboards.map((category) => (
        <div key={category.category} className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            {category.category}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {category.items.map((dashboard) => (
              <div
                key={dashboard.uid}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-lg font-semibold mb-2">{dashboard.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{dashboard.description}</p>
                <div className="flex gap-3">
                  <a
                    href={`${grafanaUrl}/d/${dashboard.uid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Open in Grafana
                  </a>
                  <Link
                    href={`/dashboards/view/${dashboard.uid}`}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                  >
                    View Embedded
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">💡 Pro Tips</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• Click "Open in Grafana" to edit and customize dashboards</li>
          <li>• Use "View Embedded" to see dashboards within the Next.js app</li>
          <li>• Some dashboards support variables for filtering by facility, line, or shift</li>
          <li>• You can create copies of dashboards in Grafana and modify them for specific needs</li>
        </ul>
      </div>
    </div>
  );
}