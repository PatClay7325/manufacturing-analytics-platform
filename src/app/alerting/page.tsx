'use client';

import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Zap,
  Shield,
  Volume2,
  Users,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';

interface AlertingStat {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  link: string;
}

const alertingStats: AlertingStat[] = [
  {
    label: 'Alert rules',
    value: 45,
    icon: Bell,
    color: 'text-blue-600',
    link: '/alerting/list'
  },
  {
    label: 'Firing alerts',
    value: 3,
    icon: AlertTriangle,
    color: 'text-red-600',
    link: '/alerting/list?state=firing'
  },
  {
    label: 'Silences',
    value: 2,
    icon: Volume2,
    color: 'text-purple-600',
    link: '/alerting/silences'
  },
  {
    label: 'Contact points',
    value: 8,
    icon: Users,
    color: 'text-green-600',
    link: '/alerting/notifications'
  }
];

interface QuickAction {
  title: string;
  description: string;
  icon: React.ElementType;
  link: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    title: 'Create alert rule',
    description: 'Define conditions that trigger alerts',
    icon: Bell,
    link: '/alerting/new',
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
  },
  {
    title: 'Add contact point',
    description: 'Configure where alerts are sent',
    icon: Users,
    link: '/alerting/notifications/new',
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
  },
  {
    title: 'Create silence',
    description: 'Temporarily mute alerts',
    icon: Volume2,
    link: '/alerting/silences/new',
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
  },
  {
    title: 'Notification policies',
    description: 'Route alerts to contact points',
    icon: Shield,
    link: '/alerting/routes',
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
  }
];

export default function AlertingPage() {
  const [recentActivity] = useState([
    {
      id: '1',
      type: 'alert',
      message: 'High CPU usage on production server',
      time: '5 minutes ago',
      severity: 'warning'
    },
    {
      id: '2',
      type: 'silence',
      message: 'Maintenance silence created for database upgrades',
      time: '1 hour ago',
      severity: 'info'
    },
    {
      id: '3',
      type: 'alert',
      message: 'Database connection pool exhausted',
      time: '2 hours ago',
      severity: 'critical'
    }
  ]);

  return (
    <PageLayout
      title="Alerting"
      description="Manage alert rules, contact points, and notification policies"
    >
      <div className="space-y-6">
        {/* Alert Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {alertingStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.link}
                className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                    <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <Icon className={`h-10 w-10 ${stat.color} opacity-20`} />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Quick actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.title}
                  href={action.link}
                  className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-lg ${action.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {action.description}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Recent activity
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="px-6 py-4">
                <div className="flex items-start space-x-3">
                  {activity.type === 'alert' ? (
                    <div className={`p-2 rounded-lg ${
                      activity.severity === 'critical' 
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : activity.severity === 'warning'
                        ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      <Volume2 className="h-4 w-4" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {activity.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/alerting/state-history"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              View all activity →
            </Link>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                Get started with alerting
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                Learn how to create alert rules, configure contact points, and set up notification routing 
                to ensure your team stays informed about critical issues.
              </p>
              <div className="mt-3 space-x-4">
                <Link
                  href="/documentation#alerting"
                  className="text-sm text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
                >
                  Read documentation →
                </Link>
                <Link
                  href="/alerting/admin"
                  className="text-sm text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 font-medium"
                >
                  Admin settings →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}