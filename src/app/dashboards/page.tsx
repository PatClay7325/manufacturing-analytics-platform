import Link from 'next/link';
import DashboardList from '@/components/grafana/DashboardList';

export default function DashboardsPage() {
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Manufacturing Dashboards</h1>
        <p className="text-gray-600 mb-4">
          Access real-time manufacturing analytics and monitoring dashboards.
        </p>
        
        <div className="flex gap-4 mb-8">
          <a
            href={grafanaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Open Grafana Dashboard
          </a>
          <Link
            href="/dashboards/manufacturing"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Manufacturing Overview
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Production Monitoring</h2>
          <p className="text-gray-600 mb-4">
            Real-time production metrics, OEE tracking, and equipment status.
          </p>
          <Link href="/dashboards/production" className="text-blue-600 hover:underline">
            View Production Dashboard →
          </Link>
        </div>

        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Quality Analytics</h2>
          <p className="text-gray-600 mb-4">
            Quality metrics, defect analysis, and statistical process control.
          </p>
          <Link href="/dashboards/quality" className="text-blue-600 hover:underline">
            View Quality Dashboard →
          </Link>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Available Grafana Dashboards</h2>
        <DashboardList />
      </div>
    </div>
  );
}
