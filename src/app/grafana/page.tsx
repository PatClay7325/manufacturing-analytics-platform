import { Metadata } from 'next';
import Link from 'next/link';
import { 
  ChartBarIcon, 
  CogIcon, 
  ChartPieIcon, 
  ShieldCheckIcon,
  CircleStackIcon,
  HeartIcon,
  ArrowTopRightOnSquareIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

export const metadata: Metadata = {
  title: 'Grafana Dashboards | Manufacturing Analytics',
  description: 'Access all Grafana dashboards embedded in the Manufacturing Analytics Platform'
};

const dashboards = [
  {
    id: 'manufacturing-overview',
    name: 'Manufacturing Overview',
    description: 'Comprehensive overview of manufacturing operations, OEE, and KPIs',
    icon: ChartBarIcon,
    color: 'blue'
  },
  {
    id: 'equipment-monitoring',
    name: 'Equipment Monitoring',
    description: 'Real-time equipment status, performance, and maintenance tracking',
    icon: CogIcon,
    color: 'green'
  },
  {
    id: 'production-metrics',
    name: 'Production Metrics',
    description: 'Production rates, efficiency, and throughput analysis',
    icon: ChartPieIcon,
    color: 'purple'
  },
  {
    id: 'quality-dashboard',
    name: 'Quality Dashboard',
    description: 'Quality metrics, defect tracking, and process control',
    icon: ShieldCheckIcon,
    color: 'yellow'
  },
  {
    id: 'prisma-metrics',
    name: 'Prisma Metrics',
    description: 'Data sourced from Prisma ORM via Next.js API',
    icon: CircleStackIcon,
    color: 'indigo'
  },
  {
    id: 'system-health-monitoring',
    name: 'System Monitoring',
    description: 'Infrastructure health, performance, and resource utilization',
    icon: HeartIcon,
    color: 'red'
  }
];

const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';

export default function GrafanaPage() {

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Grafana Dashboards
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Access embedded Grafana dashboards directly within the Manufacturing Analytics Platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {dashboards.map((dashboard) => {
            const Icon = dashboard.icon;
            return (
              <Link
                key={dashboard.id}
                href={`/grafana/${dashboard.id}`}
                className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg bg-${dashboard.color}-100 dark:bg-${dashboard.color}-900`}>
                    <Icon className={`h-6 w-6 text-${dashboard.color}-600 dark:text-${dashboard.color}-400`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {dashboard.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {dashboard.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* Custom Dashboard Link */}
          <a
            href={`${grafanaUrl}/dashboard/new`}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6 border-2 border-dashed border-gray-300 dark:border-gray-600"
          >
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                <PlusIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Create Custom Dashboard
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Open Grafana to create a new dashboard
                </p>
              </div>
            </div>
          </a>
        </div>

        {/* External Link */}
        <div className="text-center">
          <a
            href={grafanaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <span>Open Grafana in new tab</span>
            <ArrowTopRightOnSquareIcon className="h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  );
}