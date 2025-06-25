/**
 * Analytics Complete System Integration
 * Complete analyticsPlatform for Next.js manufacturing system
 */

'use client';

import React from 'react';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';

// Import enums for internal use
import { VariableType } from './VariableSystem';
import { AlertState } from './AlertingSystem';

// Import components for internal use
import { VariableSystem } from './VariableSystem';
import { AnalyticsDashboardScene, type DashboardSceneState, type DashboardMeta } from './AnalyticsDashboardScene';

// Import all Analytics components
export { AnalyticsDashboardScene } from './AnalyticsDashboardScene';
export { PanelChrome } from './PanelChrome';
export { QueryBuilder } from './QueryBuilder';
export { AlertingSystem } from './AlertingSystem';
export { VariableSystem } from './VariableSystem';
export { AnnotationManager } from './AnnotationManager';
export { ExploreManager } from './ExploreManager';

// Import panel types
export * from './panels';

// Re-export all types for external use
export type {
  DashboardSceneState,
  DashboardMeta,
  DashboardLink,
  VizPanel
} from './AnalyticsDashboardScene';

export type {
  PanelChromeProps,
  PanelPadding,
  LoadingState
} from './PanelChrome';

export type {
  QueryTarget,
  QueryFunction,
  DataSource,
  QueryBuilderProps
} from './QueryBuilder';

export type {
  AlertRule,
  AlertInstance,
  AlertGroup,
  ContactPoint,
  NotificationPolicy,
  Silence,
  AlertingSystemProps
} from './AlertingSystem';

// Export enums as values
export { AlertState } from './AlertingSystem';

export type {
  Variable,
  VariableOption,
  BaseVariable,
  QueryVariable,
  CustomVariable,
  ConstantVariable,
  DataSourceVariable,
  IntervalVariable,
  TextBoxVariable,
  AdhocVariable,
  VariableSystemProps
} from './VariableSystem';

// Export enums as values
export { VariableType } from './VariableSystem';

export type {
  Annotation,
  AnnotationFilter,
  AnnotationManagerProps
} from './AnnotationManager';

export type {
  ExploreQuery,
  ExploreResult,
  ExploreHistory,
  ExploreState,
  ExploreManagerProps
} from './ExploreManager';

export type {
  PanelData,
  DataFrame,
  Field,
  FieldType,
  FieldConfig,
  PanelProps,
  TimeSeriesOptions,
  StatOptions,
  TableOptions,
  BarChartOptions,
  PieChartOptions,
  GaugeOptions,
  PanelType
} from './panels';

// Complete AnalyticsPlatform Integration
export interface AnalyticsPlatformProps {
  // Initial dashboard state
  initialDashboard?: Partial<DashboardSceneState>;
  
  // Data sources configuration
  dataSources?: DataSource[];
  
  // Alert configuration
  alertRules?: AlertRule[];
  alertInstances?: AlertInstance[];
  contactPoints?: ContactPoint[];
  
  // Variables configuration
  variables?: Variable[];
  
  // Permissions and capabilities
  canEdit?: boolean;
  canSave?: boolean;
  canDelete?: boolean;
  canAdmin?: boolean;
  
  // Event handlers
  onDashboardSave?: (dashboard: DashboardSceneState) => Promise<void>;
  onDashboardDelete?: (uid: string) => Promise<void>;
  onVariableChange?: (name: string, value: any) => void;
  onAlertRuleCreate?: (rule: Partial<AlertRule>) => void;
  onAlertRuleUpdate?: (uid: string, rule: Partial<AlertRule>) => void;
  onDataQuery?: (targets: QueryTarget[]) => Promise<PanelData>;
  
  // Styling
  className?: string;
  theme?: 'light' | 'dark';
}

export function AnalyticsPlatform({
  initialDashboard,
  dataSources = [],
  alertRules = [],
  alertInstances = [],
  contactPoints = [],
  variables = [],
  canEdit = true,
  canSave = true,
  canDelete = false,
  canAdmin = false,
  onDashboardSave,
  onDashboardDelete,
  onVariableChange,
  onAlertRuleCreate,
  onAlertRuleUpdate,
  onDataQuery,
  className,
  theme = 'light'
}: AnalyticsPlatformProps) {
  const [activeView, setActiveView] = useState<'dashboard' | 'alerting' | 'admin'>('dashboard');
  const [dashboardState, setDashboardState] = useState<DashboardSceneState | null>(null);
  const [currentVariables, setCurrentVariables] = useState<Variable[]>(variables);

  // Initialize dashboard
  useEffect(() => {
    if (initialDashboard && !dashboardState) {
      setDashboardState({
        title: 'Manufacturing Dashboard',
        meta: {
          title: 'Manufacturing Dashboard',
          canEdit,
          canSave,
          canDelete,
          isNew: false
        },
        editable: canEdit,
        panels: [],
        links: [],
        isLoading: false,
        isEditing: false,
        isDirty: false,
        timeRange: {
          from: 'now-1h',
          to: 'now'
        },
        refresh: '5s',
        variables: currentVariables,
        annotations: [],
        ...initialDashboard
      });
    }
  }, [initialDashboard, dashboardState, canEdit, canSave, canDelete, currentVariables]);

  // Handle variable changes
  const handleVariableChange = useCallback((name: string, value: any) => {
    setCurrentVariables(prev => 
      prev.map(variable => 
        variable.name === name 
          ? { ...variable, current: value }
          : variable
      )
    );
    onVariableChange?.(name, value);
  }, [onVariableChange]);

  // Handle variables update
  const handleVariablesUpdate = useCallback((newVariables: Variable[]) => {
    setCurrentVariables(newVariables);
    if (dashboardState) {
      setDashboardState({
        ...dashboardState,
        variables: newVariables,
        isDirty: true
      });
    }
  }, [dashboardState]);

  // Handle dashboard state changes
  const handleDashboardStateChange = useCallback((newState: DashboardSceneState) => {
    setDashboardState(newState);
  }, []);

  // Handle dashboard save
  const handleDashboardSave = useCallback(async (dashboard: DashboardSceneState) => {
    if (onDashboardSave) {
      await onDashboardSave(dashboard);
    }
  }, [onDashboardSave]);

  // Handle dashboard delete
  const handleDashboardDelete = useCallback(async (uid: string) => {
    if (onDashboardDelete) {
      await onDashboardDelete(uid);
    }
  }, [onDashboardDelete]);

  // Navigation items
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'alerting', label: 'Alerting', icon: '🔔' },
    ...(canAdmin ? [{ id: 'admin', label: 'Admin', icon: '⚙️' }] : [])
  ];

  return (
    <div className={clsx(
      'analytics-platform h-screen flex flex-col',
      theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900',
      className
    )}>
      {/* Top Navigation */}
      <header className={clsx(
        'border-b flex items-center justify-between px-6 py-3',
        theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      )}>
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-bold">Manufacturing Analytics</h1>
          
          <nav className="flex items-center space-x-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as any)}
                className={clsx(
                  'flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  activeView === item.id
                    ? theme === 'dark' 
                      ? 'bg-gray-700 text-white' 
                      : 'bg-primary-100 text-primary-700'
                    : theme === 'dark'
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          {/* Global actions */}
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </header>

      {/* Variables Bar */}
      {activeView === 'dashboard' && currentVariables.length > 0 && (
        <VariableSystem
          variables={currentVariables}
          onVariableChange={handleVariableChange}
          onVariablesUpdate={handleVariablesUpdate}
          isEditing={dashboardState?.isEditing}
          className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : ''}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {activeView === 'dashboard' && (
          <div className="h-full">
            {dashboardState ? (
              <AnalyticsDashboardScene
                initialState={dashboardState}
                onStateChange={handleDashboardStateChange}
                onSave={handleDashboardSave}
                onDelete={handleDashboardDelete}
                className="h-full"
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl mb-4">📊</div>
                  <h3 className="text-lg font-medium mb-2">No Dashboard Loaded</h3>
                  <p className="text-gray-500 mb-4">
                    Create a new dashboard or load an existing one to get started.
                  </p>
                  <button
                    onClick={() => {
                      const newDashboard: DashboardSceneState = {
                        title: 'New Dashboard',
                        meta: {
                          title: 'New Dashboard',
                          canEdit,
                          canSave,
                          canDelete,
                          isNew: true
                        },
                        editable: canEdit,
                        panels: [],
                        links: [],
                        isLoading: false,
                        isEditing: canEdit,
                        isDirty: false,
                        timeRange: { from: 'now-1h', to: 'now' },
                        refresh: '5s',
                        variables: currentVariables,
                        annotations: []
                      };
                      setDashboardState(newDashboard);
                    }}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    Create New Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'alerting' && (
          <div className="h-full overflow-auto p-6">
            <AlertingSystem
              rules={alertRules}
              instances={alertInstances}
              groups={[]}
              contactPoints={contactPoints}
              policies={[]}
              silences={[]}
              onRuleCreate={onAlertRuleCreate}
              onRuleUpdate={onAlertRuleUpdate}
              className={theme === 'dark' ? 'text-white' : ''}
            />
          </div>
        )}

        {activeView === 'admin' && canAdmin && (
          <div className="h-full overflow-auto p-6">
            <AdminPanel
              dataSources={dataSources}
              variables={currentVariables}
              onVariablesUpdate={handleVariablesUpdate}
              theme={theme}
            />
          </div>
        )}
      </main>
    </div>
  );
}

// Admin Panel Component
interface AdminPanelProps {
  dataSources: DataSource[];
  variables: Variable[];
  onVariablesUpdate: (variables: Variable[]) => void;
  theme: 'light' | 'dark';
}

function AdminPanel({ dataSources, variables, onVariablesUpdate, theme }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'datasources' | 'variables' | 'users'>('datasources');

  const tabs = [
    { id: 'datasources', label: 'Data Sources', count: dataSources.length },
    { id: 'variables', label: 'Global Variables', count: variables.length },
    { id: 'users', label: 'Users & Teams', count: 0 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Administration</h2>
        <p className="text-gray-500 mt-1">
          Manage data sources, variables, users, and system settings.
        </p>
      </div>

      {/* Tabs */}
      <div className={clsx(
        'border-b',
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      )}>
        <nav className="flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={clsx(
                'py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : theme === 'dark'
                    ? 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={clsx(
                  'ml-2 py-0.5 px-2 rounded-full text-xs',
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-600'
                    : theme === 'dark'
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-gray-100 text-gray-500'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'datasources' && (
          <DataSourcesAdmin dataSources={dataSources} theme={theme} />
        )}

        {activeTab === 'variables' && (
          <VariableSystem
            variables={variables}
            onVariablesUpdate={onVariablesUpdate}
            isEditing={true}
            className={theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
          />
        )}

        {activeTab === 'users' && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              User management functionality coming soon...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Data Sources Admin Component
interface DataSourcesAdminProps {
  dataSources: DataSource[];
  theme: 'light' | 'dark';
}

function DataSourcesAdmin({ dataSources, theme }: DataSourcesAdminProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Data Sources</h3>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
          Add Data Source
        </button>
      </div>

      {dataSources.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No data sources configured</div>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
            Add Your First Data Source
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {dataSources.map((ds) => (
            <div
              key={ds.uid}
              className={clsx(
                'p-4 rounded-lg border',
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-white border-gray-200'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{ds.name}</h4>
                  <p className="text-sm text-gray-500">{ds.type} • {ds.url}</p>
                  {ds.isDefault && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded focus:outline-none">
                    Edit
                  </button>
                  <button className="p-2 text-gray-400 hover:text-red-600 rounded focus:outline-none">
                    Delete
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

// Utility function to create a complete analytics dashboard
export function createManufacturingDashboard(options: {
  title?: string;
  dataSources?: DataSource[];
  variables?: Variable[];
  timeRange?: { from: string; to: string };
}): DashboardSceneState {
  return {
    title: options.title || 'Manufacturing Dashboard',
    meta: {
      title: options.title || 'Manufacturing Dashboard',
      canEdit: true,
      canSave: true,
      canDelete: true,
      isNew: true
    },
    editable: true,
    panels: [],
    links: [],
    isLoading: false,
    isEditing: false,
    isDirty: false,
    timeRange: options.timeRange || { from: 'now-1h', to: 'now' },
    refresh: '5s',
    variables: options.variables || [],
    annotations: []
  };
}

// Export default configuration for quick setup
export const defaultAnalyticsConfig = {
  dataSources: [
    {
      uid: 'prometheus-default',
      name: 'Prometheus',
      type: 'prometheus' as const,
      url: 'http://localhost:9090',
      access: 'proxy' as const,
      isDefault: true
    }
  ],
  variables: [
    {
      name: 'instance',
      type: VariableType.Query,
      label: 'Instance',
      query: 'label_values(up, instance)',
      multi: true,
      includeAll: true,
      current: { text: 'All', value: '$__all' },
      options: [
        { text: 'All', value: '$__all', selected: true }
      ],
      datasource: {
        type: 'prometheus',
        uid: 'prometheus-default'
      }
    }
  ] as Variable[]
};