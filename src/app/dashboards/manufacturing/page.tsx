'use client';

import GrafanaEmbed from '@/components/grafana/GrafanaEmbed';
import Link from 'next/link';

export default function ManufacturingDashboard() {
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Manufacturing Overview</h1>
        <p className="text-gray-600">Real-time manufacturing metrics and KPIs</p>
      </div>

      {/* Grafana Access Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-800 font-medium">Full Analytics Access</p>
            <p className="text-blue-600 text-sm">
              For complete dashboard editing and more visualization options, access Grafana directly
            </p>
          </div>
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

      <div className="grid gap-6">
        {/* Manufacturing Overview - OEE & KPIs */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Manufacturing Overview - OEE & KPIs</h2>
          <div className="mb-2 text-sm text-gray-500">
            Complete manufacturing metrics with OEE, performance, and quality indicators
          </div>
          <GrafanaEmbed
            dashboardUid="manufacturing-overview"
            height="600px"
            refresh="10s"
          />
        </div>

        {/* Equipment Monitoring */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Equipment Monitoring</h2>
          <div className="mb-2 text-sm text-gray-500">
            Real-time equipment status and performance metrics
          </div>
          <GrafanaEmbed
            dashboardUid="eccf7a2c-5fbe-4965-bd12-d9cbf4df6ba3"
            height="500px"
            refresh="30s"
          />
        </div>

        {/* Production Overview */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Production Overview</h2>
          <div className="mb-2 text-sm text-gray-500">
            Production metrics with shift analysis and line performance
          </div>
          <GrafanaEmbed
            dashboardUid="df5db14d-c600-4785-bff9-67ab9d0ab1eb"
            height="500px"
            refresh="30s"
          />
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/equipment"
            className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
          >
            <h3 className="font-semibold">Equipment Status</h3>
            <p className="text-sm text-gray-600">View detailed equipment information</p>
          </Link>
          <Link
            href="/alerts"
            className="p-4 bg-red-50 rounded-lg hover:bg-red-100 transition"
          >
            <h3 className="font-semibold">Active Alerts</h3>
            <p className="text-sm text-gray-600">Monitor system alerts</p>
          </Link>
          <Link
            href="/manufacturing-chat"
            className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition"
          >
            <h3 className="font-semibold">AI Assistant</h3>
            <p className="text-sm text-gray-600">Get insights from AI</p>
          </Link>
        </div>
      </div>
    </div>
  );
}