'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import GrafanaEmbed from '@/components/grafana/GrafanaEmbed';
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon, ArrowsPointingOutIcon } from '@heroicons/react/24/outline';

// Dashboard metadata
const DASHBOARD_METADATA: Record<string, { title: string; description: string }> = {
  'manufacturing-overview': {
    title: 'Manufacturing Overview',
    description: 'Comprehensive overview of manufacturing operations, OEE, and KPIs'
  },
  'equipment-monitoring': {
    title: 'Equipment Monitoring',
    description: 'Real-time equipment status, performance, and maintenance tracking'
  },
  'production-metrics': {
    title: 'Production Metrics',
    description: 'Production rates, efficiency, and throughput analysis'
  },
  'quality-dashboard': {
    title: 'Quality Dashboard',
    description: 'Quality metrics, defect tracking, and process control'
  },
  'prisma-metrics': {
    title: 'Prisma Metrics',
    description: 'Data sourced from Prisma ORM via Next.js API'
  },
  'system-health-monitoring': {
    title: 'System Monitoring',
    description: 'Infrastructure health, performance, and resource utilization'
  }
};

export default function GrafanaDashboardPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const dashboardName = params.dashboard as string;
  const dashboard = DASHBOARD_METADATA[dashboardName];
  const grafanaUrl = 'http://localhost:3001';

  // Extract query parameters
  const from = searchParams.get('from') || 'now-6h';
  const to = searchParams.get('to') || 'now';
  const refresh = searchParams.get('refresh') || '10s';
  const theme = searchParams.get('theme') || 'dark';
  const fullscreen = searchParams.get('fullscreen') === 'true';

  if (!dashboard) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Dashboard Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The dashboard "{dashboardName}" could not be found.
          </p>
          <Link
            href="/grafana"
            className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Back to Dashboard List</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={fullscreen ? '' : 'container mx-auto px-4 py-8'}>
      {!fullscreen && (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <Link
                  href="/grafana"
                  className="inline-flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  <span>Back to Dashboards</span>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboard.title}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {dashboard.description}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  href={`/grafana/${dashboardName}?fullscreen=true&from=${from}&to=${to}&refresh=${refresh}&theme=${theme}`}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowsPointingOutIcon className="h-5 w-5" />
                  <span>Fullscreen</span>
                </Link>
                <a
                  href={`${grafanaUrl}/d/${dashboardName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <span>Open in Grafana</span>
                  <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <GrafanaEmbed
              dashboardName={dashboardName}
              from={from}
              to={to}
              refresh={refresh}
              theme={theme as 'light' | 'dark'}
              height="800px"
              kiosk={false}
            />
          </div>
        </>
      )}

      {fullscreen && (
        <GrafanaEmbed
          dashboardName={dashboardName}
          from={from}
          to={to}
          refresh={refresh}
          theme={theme as 'light' | 'dark'}
          fullscreen={true}
          kiosk="tv"
        />
      )}
    </div>
  );
}