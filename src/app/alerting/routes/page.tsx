'use client';

import { useState } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { 
  GitBranch, 
  Plus, 
  Edit2, 
  Trash2,
  ChevronRight,
  ChevronDown,
  Mail,
  MessageSquare,
  Webhook,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface NotificationPolicy {
  id: string;
  matcher: string[];
  groupBy: string[];
  groupWait: string;
  groupInterval: string;
  repeatInterval: string;
  contactPoint: string;
  children?: NotificationPolicy[];
  muteTimeIntervals?: string[];
}

const mockPolicies: NotificationPolicy = {
  id: 'root',
  matcher: ['...'],
  groupBy: ['alertname'],
  groupWait: '30s',
  groupInterval: '5m',
  repeatInterval: '4h',
  contactPoint: 'default-email',
  children: [
    {
      id: '1',
      matcher: ['team="platform"'],
      groupBy: ['alertname', 'cluster'],
      groupWait: '30s',
      groupInterval: '5m',
      repeatInterval: '12h',
      contactPoint: 'platform-slack',
      muteTimeIntervals: ['weekends']
    },
    {
      id: '2',
      matcher: ['severity="critical"'],
      groupBy: ['alertname'],
      groupWait: '10s',
      groupInterval: '1m',
      repeatInterval: '1h',
      contactPoint: 'oncall-pagerduty'
    },
    {
      id: '3',
      matcher: ['namespace="production"'],
      groupBy: ['alertname', 'namespace'],
      groupWait: '1m',
      groupInterval: '10m',
      repeatInterval: '24h',
      contactPoint: 'production-webhook',
      children: [
        {
          id: '4',
          matcher: ['service="database"'],
          groupBy: ['alertname', 'instance'],
          groupWait: '0s',
          groupInterval: '30s',
          repeatInterval: '30m',
          contactPoint: 'dba-team'
        }
      ]
    }
  ]
};

interface ContactPoint {
  name: string;
  type: string;
  icon: React.ElementType;
}

const contactPoints: ContactPoint[] = [
  { name: 'default-email', type: 'Email', icon: Mail },
  { name: 'platform-slack', type: 'Slack', icon: MessageSquare },
  { name: 'oncall-pagerduty', type: 'PagerDuty', icon: AlertTriangle },
  { name: 'production-webhook', type: 'Webhook', icon: Webhook },
  { name: 'dba-team', type: 'Email', icon: Mail }
];

export default function NotificationPoliciesPage() {
  const [policies] = useState(mockPolicies);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [editingId, setEditingId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const getContactPointIcon = (contactPointName: string) => {
    const cp = contactPoints.find(cp => cp.name === contactPointName);
    return cp?.icon || Mail;
  };

  const renderPolicy = (policy: NotificationPolicy, level: number = 0) => {
    const isExpanded = expandedNodes.has(policy.id);
    const hasChildren = policy.children && policy.children.length > 0;
    const Icon = getContactPointIcon(policy.contactPoint);

    return (
      <div key={policy.id}>
        <div 
          className={`group flex items-start p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
            level > 0 ? 'border-l-2 border-gray-300 dark:border-gray-600' : ''
          }`}
          style={{ marginLeft: `${level * 32}px` }}
        >
          {/* Expand/Collapse Button */}
          <button
            onClick={() => toggleExpanded(policy.id)}
            className={`mr-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
              !hasChildren ? 'invisible' : ''
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          {/* Policy Content */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                {/* Matchers */}
                <div className="flex items-center space-x-2 mb-2">
                  {policy.matcher.map((matcher, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                    >
                      {matcher}
                    </span>
                  ))}
                </div>

                {/* Settings */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Group by:</span>
                    <p className="font-mono text-xs">{policy.groupBy.join(', ')}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Group wait:</span>
                    <p className="font-mono text-xs">{policy.groupWait}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Group interval:</span>
                    <p className="font-mono text-xs">{policy.groupInterval}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Repeat interval:</span>
                    <p className="font-mono text-xs">{policy.repeatInterval}</p>
                  </div>
                </div>

                {/* Contact Point & Mute Intervals */}
                <div className="flex items-center space-x-4 mt-3">
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {policy.contactPoint}
                    </span>
                  </div>
                  {policy.muteTimeIntervals && policy.muteTimeIntervals.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Muted: {policy.muteTimeIntervals.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setEditingId(policy.id)}
                  className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                {policy.id !== 'root' && (
                  <button className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {policy.children!.map(child => renderPolicy(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <PageLayout
      title="Notification policies"
      description="Configure how alerts are routed to contact points"
    >
      <div className="space-y-6">
        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex">
            <GitBranch className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-800 dark:text-blue-200">
                Notification policies determine how alerts are routed to contact points. Policies can be nested to create 
                specific routing rules based on alert labels.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Policy tree
          </h2>
          <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4 mr-2" />
            New nested policy
          </button>
        </div>

        {/* Policy Tree */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-3 bg-gray-50 dark:bg-gray-700/50">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Default policy
            </h3>
          </div>
          {renderPolicy(policies)}
        </div>

        {/* Contact Points Summary */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Contact points in use
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contactPoints.map(cp => {
              const Icon = cp.icon;
              return (
                <div
                  key={cp.name}
                  className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{cp.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{cp.type}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}