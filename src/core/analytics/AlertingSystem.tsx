/**
 * AnalyticsPlatform Alerting System - Complete Alert Management
 * Adapted from @analyticsPlatform/alerting for Next.js manufacturing analyticsPlatform
 */

import { useState, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  BellIcon,
  EyeSlashIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

// Core Alert Types
export interface AlertRule {
  uid: string;
  title: string;
  condition: string;
  data: AlertQuery[];
  intervalSeconds: number;
  noDataState: NoDataState;
  execErrState: ExecErrState;
  folderUID?: string;
  ruleGroup: string;
  annotations?: Record<string, string>;
  labels?: Record<string, string>;
  isDraft?: boolean;
  isPaused?: boolean;
}

export interface AlertQuery {
  refId: string;
  queryType?: string;
  model: any;
  datasourceUid: string;
  relativeTimeRange?: {
    from: number;
    to: number;
  };
}

export enum AlertState {
  NoData = 'NoData',
  Pending = 'Pending',
  Alerting = 'Alerting',
  OK = 'OK',
  Paused = 'Paused'
}

export enum NoDataState {
  NoData = 'NoData',
  Alerting = 'Alerting',
  OK = 'OK'
}

export enum ExecErrState {
  OK = 'OK',
  Alerting = 'Alerting'
}

export interface AlertInstance {
  fingerprint: string;
  status: AlertState;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt?: string;
  updatedAt: string;
  generatorURL?: string;
  silenceURL?: string;
  dashboardUID?: string;
  panelID?: number;
}

export interface AlertGroup {
  name: string;
  file: string;
  interval: string;
  rules: AlertRule[];
  orgId: number;
  folderUID: string;
  evaluationTime?: string;
  lastEvaluation?: string;
}

export interface ContactPoint {
  uid: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'victorops' | 'telegram' | 'teams';
  settings: Record<string, any>;
  disableResolveMessage?: boolean;
}

export interface NotificationPolicy {
  uid?: string;
  receiver: string;
  groupBy?: string[];
  groupWait?: string;
  groupInterval?: string;
  repeatInterval?: string;
  matchers?: Array<{
    name: string;
    value: string;
    isRegex?: boolean;
    isEqual?: boolean;
  }>;
  muteTimeIntervals?: string[];
  continue?: boolean;
  routes?: NotificationPolicy[];
}

export interface Silence {
  id: string;
  matchers: Array<{
    name: string;
    value: string;
    isRegex: boolean;
    isEqual: boolean;
  }>;
  startsAt: string;
  endsAt: string;
  updatedAt: string;
  createdBy: string;
  comment: string;
  status: {
    state: 'expired' | 'active' | 'pending';
  };
}

// Alert Management Props
export interface AlertingSystemProps {
  rules: AlertRule[];
  instances: AlertInstance[];
  groups: AlertGroup[];
  contactPoints: ContactPoint[];
  policies: NotificationPolicy[];
  silences: Silence[];
  onRuleCreate?: (rule: Partial<AlertRule>) => void;
  onRuleUpdate?: (uid: string, rule: Partial<AlertRule>) => void;
  onRuleDelete?: (uid: string) => void;
  onRulePause?: (uid: string, isPaused: boolean) => void;
  onSilenceCreate?: (silence: Partial<Silence>) => void;
  onSilenceExpire?: (id: string) => void;
  className?: string;
}

export function AlertingSystem({
  rules,
  instances,
  groups,
  contactPoints,
  policies,
  silences,
  onRuleCreate,
  onRuleUpdate,
  onRuleDelete,
  onRulePause,
  onSilenceCreate,
  onSilenceExpire,
  className
}: AlertingSystemProps) {
  const [activeTab, setActiveTab] = useState<'rules' | 'instances' | 'policies' | 'silences'>('rules');
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [filterState, setFilterState] = useState<AlertState | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter instances by state and search
  const filteredInstances = useMemo(() => {
    return instances.filter(instance => {
      const matchesState = filterState === 'All' || instance.status === filterState;
      const matchesSearch = !searchQuery || 
        Object.values(instance.labels).some(label => 
          label.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        Object.values(instance.annotations).some(annotation => 
          annotation.toLowerCase().includes(searchQuery.toLowerCase())
        );
      return matchesState && matchesSearch;
    });
  }, [instances, filterState, searchQuery]);

  // Get alert counts by state
  const alertCounts = useMemo(() => {
    const counts = {
      total: instances.length,
      alerting: 0,
      pending: 0,
      ok: 0,
      nodata: 0,
      paused: 0
    };
    
    instances.forEach(instance => {
      switch (instance.status) {
        case AlertState.Alerting:
          counts.alerting++;
          break;
        case AlertState.Pending:
          counts.pending++;
          break;
        case AlertState.OK:
          counts.ok++;
          break;
        case AlertState.NoData:
          counts.nodata++;
          break;
        case AlertState.Paused:
          counts.paused++;
          break;
      }
    });
    
    return counts;
  }, [instances]);

  const tabs = [
    { id: 'rules', label: 'Alert Rules', count: rules.length },
    { id: 'instances', label: 'Alert Instances', count: instances.length },
    { id: 'policies', label: 'Notification Policies', count: policies.length },
    { id: 'silences', label: 'Silences', count: silences.filter(s => s.status.state === 'active').length }
  ];

  return (
    <div className={clsx("space-y-6", className)}>
      {/* Header with Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Alerting Overview</h2>
          <button
            onClick={() => setIsCreatingRule(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Create Alert Rule
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <AlertStatCard
            title="Total"
            count={alertCounts.total}
            icon={BellIcon}
            color="gray"
          />
          <AlertStatCard
            title="Alerting"
            count={alertCounts.alerting}
            icon={ExclamationTriangleIcon}
            color="red"
          />
          <AlertStatCard
            title="Pending"
            count={alertCounts.pending}
            icon={ClockIcon}
            color="yellow"
          />
          <AlertStatCard
            title="OK"
            count={alertCounts.ok}
            icon={CheckCircleIcon}
            color="green"
          />
          <AlertStatCard
            title="No Data"
            count={alertCounts.nodata}
            icon={XCircleIcon}
            color="gray"
          />
          <AlertStatCard
            title="Paused"
            count={alertCounts.paused}
            icon={PauseIcon}
            color="blue"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  'py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={clsx(
                    'ml-2 py-0.5 px-2 rounded-full text-xs',
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-100 text-gray-500'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'rules' && (
            <AlertRulesList
              rules={rules}
              onEdit={(rule) => setSelectedRule(rule)}
              onDelete={onRuleDelete}
              onPause={onRulePause}
              onCreate={() => setIsCreatingRule(true)}
            />
          )}

          {activeTab === 'instances' && (
            <AlertInstancesList
              instances={filteredInstances}
              filterState={filterState}
              onFilterChange={setFilterState}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSilence={onSilenceCreate}
            />
          )}

          {activeTab === 'policies' && (
            <NotificationPoliciesList
              policies={policies}
              contactPoints={contactPoints}
            />
          )}

          {activeTab === 'silences' && (
            <SilencesList
              silences={silences}
              onExpire={onSilenceExpire}
              onCreate={() => {/* Handle silence creation */}}
            />
          )}
        </div>
      </div>

      {/* Rule Editor Modal */}
      {(isCreatingRule || selectedRule) && (
        <AlertRuleEditor
          rule={selectedRule}
          onSave={(rule) => {
            if (selectedRule) {
              onRuleUpdate?.(selectedRule.uid, rule);
            } else {
              onRuleCreate?.(rule);
            }
            setSelectedRule(null);
            setIsCreatingRule(false);
          }}
          onCancel={() => {
            setSelectedRule(null);
            setIsCreatingRule(false);
          }}
        />
      )}
    </div>
  );
}

// Alert Stat Card Component
interface AlertStatCardProps {
  title: string;
  count: number;
  icon: React.ElementType;
  color: 'red' | 'yellow' | 'green' | 'blue' | 'gray';
}

function AlertStatCard({ title, count, icon: Icon, color }: AlertStatCardProps) {
  const colorClasses = {
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200'
  };

  return (
    <div className={clsx('rounded-lg border p-4', colorClasses[color])}>
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-2xl font-semibold">{count}</p>
        </div>
      </div>
    </div>
  );
}

// Alert Rules List Component
interface AlertRulesListProps {
  rules: AlertRule[];
  onEdit: (rule: AlertRule) => void;
  onDelete?: (uid: string) => void;
  onPause?: (uid: string, isPaused: boolean) => void;
  onCreate: () => void;
}

function AlertRulesList({ rules, onEdit, onDelete, onPause, onCreate }: AlertRulesListProps) {
  if (rules.length === 0) {
    return (
      <div className="text-center py-12">
        <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No alert rules</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by creating your first alert rule.</p>
        <div className="mt-6">
          <button
            onClick={onCreate}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create Alert Rule
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rules.map((rule) => (
        <div key={rule.uid} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-medium text-gray-900">{rule.title}</h3>
                {rule.isPaused && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <PauseIcon className="w-3 h-3 mr-1" />
                    Paused
                  </span>
                )}
                {rule.isDraft && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Draft
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Folder: {rule.folderUID || 'General'} • Group: {rule.ruleGroup}
              </p>
              <p className="text-sm text-gray-600">
                Evaluation: every {rule.intervalSeconds}s
              </p>
              {rule.condition && (
                <p className="text-sm font-mono text-gray-800 mt-2 bg-gray-50 p-2 rounded">
                  {rule.condition}
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPause?.(rule.uid, !rule.isPaused)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded focus:outline-none"
                title={rule.isPaused ? 'Resume rule' : 'Pause rule'}
              >
                {rule.isPaused ? <PlayIcon className="w-4 h-4" /> : <PauseIcon className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onEdit(rule)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded focus:outline-none"
                title="Edit rule"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete?.(rule.uid)}
                className="p-2 text-gray-400 hover:text-red-600 rounded focus:outline-none"
                title="Delete rule"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Alert Instances List Component
interface AlertInstancesListProps {
  instances: AlertInstance[];
  filterState: AlertState | 'All';
  onFilterChange: (state: AlertState | 'All') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSilence?: (silence: Partial<Silence>) => void;
}

function AlertInstancesList({ 
  instances, 
  filterState, 
  onFilterChange, 
  searchQuery, 
  onSearchChange,
  onSilence 
}: AlertInstancesListProps) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <select
            value={filterState}
            onChange={(e) => onFilterChange(e.target.value as AlertState | 'All')}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="All">All States</option>
            <option value={AlertState.Alerting}>Alerting</option>
            <option value={AlertState.Pending}>Pending</option>
            <option value={AlertState.OK}>OK</option>
            <option value={AlertState.NoData}>No Data</option>
            <option value={AlertState.Paused}>Paused</option>
          </select>
          
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search labels or annotations..."
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Instances List */}
      <div className="space-y-3">
        {instances.map((instance) => (
          <AlertInstanceCard
            key={instance.fingerprint}
            instance={instance}
            onSilence={onSilence}
          />
        ))}
      </div>

      {instances.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No alert instances found matching the current filters.
        </div>
      )}
    </div>
  );
}

// Alert Instance Card Component
interface AlertInstanceCardProps {
  instance: AlertInstance;
  onSilence?: (silence: Partial<Silence>) => void;
}

function AlertInstanceCard({ instance, onSilence }: AlertInstanceCardProps) {
  const stateColor = {
    [AlertState.Alerting]: 'text-red-700 bg-red-50 border-red-200',
    [AlertState.Pending]: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    [AlertState.OK]: 'text-green-700 bg-green-50 border-green-200',
    [AlertState.NoData]: 'text-gray-700 bg-gray-50 border-gray-200',
    [AlertState.Paused]: 'text-blue-700 bg-blue-50 border-blue-200'
  };

  const stateIcon = {
    [AlertState.Alerting]: ExclamationTriangleIcon,
    [AlertState.Pending]: ClockIcon,
    [AlertState.OK]: CheckCircleIcon,
    [AlertState.NoData]: XCircleIcon,
    [AlertState.Paused]: PauseIcon
  };

  const Icon = stateIcon[instance.status];

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <span className={clsx(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
              stateColor[instance.status]
            )}>
              <Icon className="w-3 h-3 mr-1" />
              {instance.status}
            </span>
            <span className="text-sm text-gray-500">
              Started: {new Date(instance.startsAt).toLocaleString()}
            </span>
          </div>
          
          {/* Labels */}
          <div className="mb-2">
            <h4 className="text-sm font-medium text-gray-900 mb-1">Labels:</h4>
            <div className="flex flex-wrap gap-1">
              {Object.entries(instance.labels).map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800"
                >
                  <span className="font-medium">{key}:</span>
                  <span className="ml-1">{value}</span>
                </span>
              ))}
            </div>
          </div>
          
          {/* Annotations */}
          {Object.keys(instance.annotations).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">Annotations:</h4>
              <div className="space-y-1">
                {Object.entries(instance.annotations).map(([key, value]) => (
                  <div key={key} className="text-sm">
                    <span className="font-medium text-gray-700">{key}:</span>
                    <span className="ml-1 text-gray-600">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {instance.status === AlertState.Alerting && (
            <button
              onClick={() => onSilence?.({
                matchers: Object.entries(instance.labels).map(([name, value]) => ({
                  name,
                  value,
                  isRegex: false,
                  isEqual: true
                })),
                comment: 'Silenced from alert instance',
                createdBy: 'user'
              })}
              className="p-2 text-gray-400 hover:text-gray-600 rounded focus:outline-none"
              title="Silence this alert"
            >
              <EyeSlashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Notification Policies List Component
interface NotificationPoliciesListProps {
  policies: NotificationPolicy[];
  contactPoints: ContactPoint[];
}

function NotificationPoliciesList({ policies, contactPoints }: NotificationPoliciesListProps) {
  const [isCreating, setIsCreating] = useState(false);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Notification Policies</h3>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Create Policy
        </button>
      </div>
      
      {policies.length === 0 ? (
        <div className="text-center py-12">
          <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No notification policies</h3>
          <p className="mt-1 text-sm text-gray-500">Create policies to route alerts to the right teams.</p>
          <div className="mt-6">
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Policy
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map((policy) => (
            <div key={policy.uid} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    Route to: {contactPoints.find(cp => cp.uid === policy.receiver)?.name || policy.receiver}
                  </h4>
                  <div className="mt-1 text-sm text-gray-600">
                    <p>Group by: {policy.groupBy?.join(', ') || 'None'}</p>
                    {policy.groupWait && <p>Group wait: {policy.groupWait}</p>}
                    {policy.repeatInterval && <p>Repeat: {policy.repeatInterval}</p>}
                  </div>
                  {policy.matchers && Array.isArray(policy.matchers) && policy.matchers.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">Matchers:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {policy.matchers.map((matcher: any, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800"
                          >
                            {matcher.name} {matcher.isEqual ? '=' : '!='} {matcher.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded focus:outline-none">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600 rounded focus:outline-none">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Silences List Component
interface SilencesListProps {
  silences: Silence[];
  onExpire?: (id: string) => void;
  onCreate: () => void;
}

function SilencesList({ silences, onExpire, onCreate }: SilencesListProps) {
  const [filterState, setFilterState] = useState<'active' | 'pending' | 'expired' | 'all'>('active');
  
  // Filter silences by state
  const filteredSilences = silences.filter(silence => {
    if (filterState === 'all') return true;
    return silence.status.state === filterState;
  });
  
  const getSilenceStateColor = (state: string) => {
    switch (state) {
      case 'active':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'pending':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'expired':
        return 'text-gray-700 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-gray-900">Silences</h3>
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value as any)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="expired">Expired</option>
            <option value="all">All</option>
          </select>
        </div>
        <button
          onClick={onCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Create Silence
        </button>
      </div>
      
      {filteredSilences.length === 0 ? (
        <div className="text-center py-12">
          <EyeSlashIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No {filterState !== 'all' ? filterState : ''} silences
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Create silences to temporarily mute specific alerts.
          </p>
          <div className="mt-6">
            <button
              onClick={onCreate}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Silence
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSilences.map((silence) => (
            <div key={silence.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={clsx(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                      getSilenceStateColor(silence.status.state)
                    )}>
                      {silence.status.state.charAt(0).toUpperCase() + silence.status.state.slice(1)}
                    </span>
                    <span className="text-sm text-gray-500">
                      Created by: {silence.createdBy}
                    </span>
                  </div>
                  
                  {/* Matchers */}
                  <div className="mb-2">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Matchers:</h4>
                    <div className="flex flex-wrap gap-1">
                      {silence.matchers.map((matcher, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800"
                        >
                          <span className="font-medium">{matcher.name}</span>
                          <span className="ml-1">{matcher.isEqual ? '=' : '!='}</span>
                          <span className="ml-1">{matcher.value}</span>
                          {matcher.isRegex && (
                            <span className="ml-1 text-blue-600" title="Regular expression">
                              .*
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Time information */}
                  <div className="text-sm text-gray-600 mb-2">
                    <p>Start: {new Date(silence.startsAt).toLocaleString()}</p>
                    <p>End: {new Date(silence.endsAt).toLocaleString()}</p>
                    <p>Duration: {Math.round((new Date(silence.endsAt).getTime() - new Date(silence.startsAt).getTime()) / (1000 * 60 * 60))}h</p>
                  </div>
                  
                  {/* Comment */}
                  {silence.comment && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">Comment:</span>
                      <span className="ml-1 text-gray-600">{silence.comment}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {silence.status.state === 'active' && (
                    <button
                      onClick={() => onExpire?.(silence.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded focus:outline-none"
                      title="Expire silence"
                    >
                      <XCircleIcon className="w-4 h-4" />
                    </button>
                  )}
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded focus:outline-none">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Alert Rule Editor Component
interface AlertRuleEditorProps {
  rule?: AlertRule | null;
  onSave: (rule: Partial<AlertRule>) => void;
  onCancel: () => void;
}

function AlertRuleEditor({ rule, onSave, onCancel }: AlertRuleEditorProps) {
  const [formData, setFormData] = useState<Partial<AlertRule>>({
    title: rule?.title || '',
    condition: rule?.condition || '',
    intervalSeconds: rule?.intervalSeconds || 60,
    noDataState: rule?.noDataState || NoDataState.NoData,
    execErrState: rule?.execErrState || ExecErrState.Alerting,
    ruleGroup: rule?.ruleGroup || 'default',
    data: rule?.data || [],
    annotations: rule?.annotations || {},
    labels: rule?.labels || {}
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {rule ? 'Edit Alert Rule' : 'Create Alert Rule'}
          </h3>
        </div>
        
        <div className="px-6 py-4 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Alert rule name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Evaluation Interval</label>
              <input
                type="number"
                value={formData.intervalSeconds}
                onChange={(e) => setFormData({ ...formData, intervalSeconds: parseInt(e.target.value) || 60 })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="60"
                min="1"
              />
            </div>
          </div>
          
          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
            <textarea
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              className="w-full h-24 border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="avg(cpu_usage) > 80"
            />
          </div>
          
          {/* States */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">No Data State</label>
              <select
                value={formData.noDataState}
                onChange={(e) => setFormData({ ...formData, noDataState: e.target.value as NoDataState })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={NoDataState.NoData}>No Data</option>
                <option value={NoDataState.Alerting}>Alerting</option>
                <option value={NoDataState.OK}>OK</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Execution Error State</label>
              <select
                value={formData.execErrState}
                onChange={(e) => setFormData({ ...formData, execErrState: e.target.value as ExecErrState })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={ExecErrState.Alerting}>Alerting</option>
                <option value={ExecErrState.OK}>OK</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {rule ? 'Update' : 'Create'} Rule
          </button>
        </div>
      </div>
    </div>
  );
}