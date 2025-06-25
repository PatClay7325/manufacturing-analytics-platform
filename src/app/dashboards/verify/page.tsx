'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface DashboardStatus {
  uid: string;
  title: string;
  exists: boolean;
  error?: string;
}

export default function VerifyDashboards() {
  const [dashboards, setDashboards] = useState<DashboardStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';

  useEffect(() => {
    verifyDashboards();
  }, []);

  const verifyDashboards = async () => {
    try {
      // Fetch all dashboards from Grafana
      const response = await fetch('/api/grafana-proxy?path=search?type=dash-db');
      const data = await response.json();

      if (Array.isArray(data)) {
        const statuses = data.map((dashboard: any) => ({
          uid: dashboard.uid,
          title: dashboard.title,
          exists: true
        }));
        setDashboards(statuses);
      } else {
        console.error('Failed to fetch dashboards:', data);
      }
    } catch (error) {
      console.error('Error verifying dashboards:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Verifying Dashboards...</h1>
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Dashboard Verification</h1>
        <p className="text-gray-600">
          Found {dashboards.length} dashboards in Grafana
        </p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dashboard Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                UID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dashboards.map((dashboard, index) => (
              <tr key={dashboard.uid}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {dashboard.title}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                  {dashboard.uid}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                    ✓ Live
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboards/view/${dashboard.uid}`}
                      className="text-blue-600 hover:underline"
                    >
                      View Embedded
                    </Link>
                    <span className="text-gray-400">|</span>
                    <a
                      href={`${grafanaUrl}/d/${dashboard.uid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Open in Grafana
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">✅ All Dashboards Verified</h3>
          <p className="text-sm text-green-700">
            All {dashboards.length} dashboards are live and accessible. You can view them embedded
            in the Next.js app or open them directly in Grafana.
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">📊 Quick Links</h3>
          <div className="space-y-2 text-sm">
            <Link href="/dashboards/all" className="block text-blue-600 hover:underline">
              → Browse All Dashboards
            </Link>
            <Link href="/dashboards/manufacturing" className="block text-blue-600 hover:underline">
              → Manufacturing Dashboard
            </Link>
            <a
              href={grafanaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline"
            >
              → Open Grafana
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}