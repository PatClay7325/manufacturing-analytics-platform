import React from 'react';
import Link from 'next/link';
import { Plus, Bell, Upload, ExclamationTriangle } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'new-dashboard',
    label: 'New Dashboard',
    href: '/dashboards/new',
    icon: <Plus className="w-4 h-4" />,
    description: 'Create a new dashboard'
  },
  {
    id: 'new-alert',
    label: 'New Alert',
    href: '/alerting/new',
    icon: <Bell className="w-4 h-4" />,
    description: 'Create a new alert rule'
  },
  {
    id: 'upload-data',
    label: 'Upload Data',
    href: '/data-upload',
    icon: <Upload className="w-4 h-4" />,
    description: 'Upload manufacturing data'
  },
  {
    id: 'view-alerts',
    label: 'View Alerts',
    href: '/alerts',
    icon: <ExclamationTriangle className="w-4 h-4" />,
    description: 'View active alerts'
  }
];

export function QuickActions() {
  return (
    <div className="flex items-center space-x-2 p-4 border-t border-gray-200 dark:border-gray-700">
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-2">
        Quick Actions:
      </span>
      <div className="flex space-x-1">
        {quickActions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={action.description}
          >
            {action.icon}
          </Link>
        ))}
      </div>
    </div>
  );
}