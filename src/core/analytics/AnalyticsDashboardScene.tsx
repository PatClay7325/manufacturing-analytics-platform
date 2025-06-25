/**
 * Analytics Dashboard Scene - Core Dashboard Engine
 * Adapted for Next.js manufacturing analyticsPlatform
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';

// Core Types
export interface DashboardMeta {
  uid?: string;
  id?: number;
  title: string;
  description?: string;
  tags?: string[];
  isStarred?: boolean;
  isSnapshot?: boolean;
  canEdit?: boolean;
  canMakeEditable?: boolean;
  canSave?: boolean;
  canDelete?: boolean;
  url?: string;
  slug?: string;
  folderUid?: string;
  version?: number;
  isEmbedded?: boolean;
  isNew?: boolean;
  provisioned?: boolean;
}

export interface DashboardLink {
  id?: number;
  title: string;
  type: 'dashboards' | 'link';
  url?: string;
  tags?: string[];
  icon?: string;
  tooltip?: string;
  asDropdown?: boolean;
  targetBlank?: boolean;
  includeVars?: boolean;
}

export interface VizPanel {
  id: string;
  title: string;
  type: string;
  gridPos: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  targets: Array<{
    expr?: string;
    refId: string;
    datasource?: {
      type: string;
      uid: string;
    };
  }>;
  fieldConfig: {
    defaults: Record<string, any>;
    overrides: Array<Record<string, any>>;
  };
  options: Record<string, any>;
  pluginVersion?: string;
  transformations?: Array<Record<string, any>>;
  alert?: Record<string, any>;
  thresholds?: Array<Record<string, any>>;
  links?: DashboardLink[];
  repeat?: string;
  repeatDirection?: 'h' | 'v';
  maxDataPoints?: number;
  interval?: string;
  timeFrom?: string;
  timeShift?: string;
  hideTimeOverride?: boolean;
  datasource?: {
    type: string;
    uid: string;
  };
}

export interface DashboardSceneState {
  title: string;
  description?: string;
  tags?: string[];
  links: DashboardLink[];
  editable?: boolean;
  uid?: string;
  id?: number | null;
  panels: VizPanel[];
  meta: DashboardMeta;
  version?: number;
  isEditing?: boolean;
  isDirty?: boolean;
  isLoading?: boolean;
  error?: string;
  timeRange?: {
    from: string;
    to: string;
  };
  refresh?: string;
  variables?: Array<{
    name: string;
    type: string;
    label?: string;
    query?: string;
    current?: {
      value: any;
      text: string;
    };
    options?: Array<{
      value: any;
      text: string;
    }>;
  }>;
  annotations?: Array<{
    name: string;
    datasource: {
      type: string;
      uid: string;
    };
    enable: boolean;
    query?: string;
  }>;
  templating?: {
    list: any[];
  };
  time?: {
    from: string;
    to: string;
  };
  timepicker?: {
    refresh_intervals: string[];
    time_options: string[];
  };
  timezone?: string;
  fiscalYearStartMonth?: number;
  graphTooltip?: number;
  style?: string;
  schemaVersion?: number;
}

interface DashboardSceneProps {
  initialState?: Partial<DashboardSceneState>;
  className?: string;
  onStateChange?: (state: DashboardSceneState) => void;
  onSave?: (dashboard: DashboardSceneState) => Promise<void>;
  onDelete?: (uid: string) => Promise<void>;
  onStar?: (uid: string, isStarred: boolean) => Promise<boolean>;
}

export function AnalyticsDashboardScene({
  initialState,
  className,
  onStateChange,
  onSave,
  onDelete,
  onStar
}: DashboardSceneProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [prevScrollPos, setPrevScrollPos] = useState<number>(0);

  // Initialize dashboard state
  const [state, setState] = useState<DashboardSceneState>({
    title: 'Manufacturing Dashboard',
    meta: {
      title: 'Manufacturing Dashboard',
      canEdit: true,
      canSave: true,
      canDelete: true,
      isNew: false
    },
    editable: true,
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
    variables: [],
    annotations: [],
    ...initialState
  });

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Dashboard actions
  const onEnterEditMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEditing: true,
      isDirty: false
    }));
  }, []);

  const exitEditMode = useCallback(({ skipConfirm = false, restoreInitialState = false } = {}) => {
    if (state.isDirty && !skipConfirm) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirmed) return;
    }

    setState(prev => ({
      ...prev,
      isEditing: false,
      isDirty: restoreInitialState ? false : prev.isDirty
    }));
  }, [state.isDirty]);

  const saveCompleted = useCallback((result: { version: number; uid: string; id: number; url: string; slug: string }) => {
    setState(prev => ({
      ...prev,
      version: result.version,
      isDirty: false,
      uid: result.uid,
      id: result.id,
      meta: {
        ...prev.meta,
        uid: result.uid,
        url: result.url,
        slug: result.slug,
        version: result.version
      }
    }));
  }, []);

  const openSaveDrawer = useCallback(async ({ saveAsCopy = false } = {}) => {
    if (!state.isEditing || !onSave) return;

    try {
      await onSave(state);
      if (!saveAsCopy) {
        setState(prev => ({ ...prev, isDirty: false }));
      }
    } catch (error) {
      console.error('Failed to save dashboard:', error);
      setState(prev => ({ ...prev, error: 'Failed to save dashboard' }));
    }
  }, [state, onSave]);

  const addPanel = useCallback((panel: VizPanel) => {
    if (!state.isEditing) {
      onEnterEditMode();
    }

    setState(prev => ({
      ...prev,
      panels: [...prev.panels, panel],
      isDirty: true
    }));
  }, [state.isEditing, onEnterEditMode]);

  const removePanel = useCallback((panelId: string) => {
    setState(prev => ({
      ...prev,
      panels: prev.panels.filter(p => p.id !== panelId),
      isDirty: true
    }));
  }, []);

  const updatePanel = useCallback((panelId: string, updates: Partial<VizPanel>) => {
    setState(prev => ({
      ...prev,
      panels: prev.panels.map(p => p.id === panelId ? { ...p, ...updates } : p),
      isDirty: true
    }));
  }, []);

  const duplicatePanel = useCallback((panel: VizPanel) => {
    const duplicate = {
      ...panel,
      id: `${panel.id}-copy`,
      title: `${panel.title} (Copy)`,
      gridPos: {
        ...panel.gridPos,
        y: panel.gridPos.y + panel.gridPos.h
      }
    };
    addPanel(duplicate);
  }, [addPanel]);

  const onStarDashboard = useCallback(async () => {
    if (!state.uid || !onStar) return;

    try {
      const result = await onStar(state.uid, Boolean(state.meta.isStarred));
      setState(prev => ({
        ...prev,
        meta: {
          ...prev.meta,
          isStarred: result
        }
      }));
    } catch (error) {
      console.error('Failed to star dashboard:', error);
    }
  }, [state.uid, state.meta.isStarred, onStar]);

  const onDeleteDashboard = useCallback(async () => {
    if (!state.uid || !onDelete) return;

    const confirmed = window.confirm('Are you sure you want to delete this dashboard?');
    if (!confirmed) return;

    try {
      await onDelete(state.uid);
      setState(prev => ({ ...prev, isDirty: false }));
      router.push('/');
    } catch (error) {
      console.error('Failed to delete dashboard:', error);
    }
  }, [state.uid, onDelete, router]);

  const rememberScrollPos = useCallback(() => {
    if (scrollRef.current) {
      setPrevScrollPos(scrollRef.current.scrollTop);
    }
  }, []);

  const restoreScrollPos = useCallback(() => {
    if (scrollRef.current && prevScrollPos !== undefined) {
      scrollRef.current.scrollTo(0, prevScrollPos);
    }
  }, [prevScrollPos]);

  const updateTimeRange = useCallback((timeRange: { from: string; to: string }) => {
    setState(prev => ({
      ...prev,
      timeRange,
      isDirty: true
    }));
  }, []);

  const updateRefresh = useCallback((refresh: string) => {
    setState(prev => ({
      ...prev,
      refresh,
      isDirty: true
    }));
  }, []);

  // Expose methods for external use
  const dashboardAPI = {
    state,
    onEnterEditMode,
    exitEditMode,
    saveCompleted,
    openSaveDrawer,
    addPanel,
    removePanel,
    updatePanel,
    duplicatePanel,
    onStarDashboard,
    onDeleteDashboard,
    rememberScrollPos,
    restoreScrollPos,
    updateTimeRange,
    updateRefresh
  };

  return (
    <div className={clsx('analyticsPlatform-dashboard-scene', className)}>
      <div 
        ref={scrollRef}
        className="dashboard-content h-full overflow-auto"
      >
        {state.isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <span className="ml-2">Loading dashboard...</span>
          </div>
        )}

        {state.error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 m-4">
            <div className="text-red-800">
              <strong>Error:</strong> {state.error}
            </div>
          </div>
        )}

        {!state.isLoading && !state.error && (
          <DashboardRenderer
            state={state}
            dashboardAPI={dashboardAPI}
          />
        )}
      </div>
    </div>
  );
}

interface DashboardRendererProps {
  state: DashboardSceneState;
  dashboardAPI: any;
}

function DashboardRenderer({ state, dashboardAPI }: DashboardRendererProps) {
  return (
    <div className="dashboard-body">
      {/* Dashboard Header */}
      <div className="dashboard-header bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{state.title}</h1>
            {state.description && (
              <p className="text-gray-600 mt-1">{state.description}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {state.meta.canEdit && (
              <button
                onClick={state.isEditing ? () => dashboardAPI.exitEditMode() : dashboardAPI.onEnterEditMode}
                className={clsx(
                  'px-4 py-2 rounded-md text-sm font-medium',
                  state.isEditing
                    ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                )}
              >
                {state.isEditing ? 'Exit Edit' : 'Edit'}
              </button>
            )}
            
            {state.isEditing && state.isDirty && (
              <button
                onClick={() => dashboardAPI.openSaveDrawer()}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
              >
                Save
              </button>
            )}
            
            {state.meta.canSave && (
              <button
                onClick={dashboardAPI.onStarDashboard}
                className={clsx(
                  'p-2 rounded-md text-sm',
                  state.meta.isStarred
                    ? 'text-yellow-500 hover:text-yellow-600'
                    : 'text-gray-400 hover:text-gray-600'
                )}
              >
                ★
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Time Range Controls */}
      <div className="dashboard-controls bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Time range:</label>
            <select
              value={`${state.timeRange?.from} to ${state.timeRange?.to}`}
              onChange={(e) => {
                const [from, , to] = e.target.value.split(' ');
                dashboardAPI.updateTimeRange({ from, to });
              }}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="now-5m to now">Last 5 minutes</option>
              <option value="now-15m to now">Last 15 minutes</option>
              <option value="now-1h to now">Last 1 hour</option>
              <option value="now-6h to now">Last 6 hours</option>
              <option value="now-24h to now">Last 24 hours</option>
              <option value="now-7d to now">Last 7 days</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Refresh:</label>
            <select
              value={state.refresh}
              onChange={(e) => dashboardAPI.updateRefresh(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="">Off</option>
              <option value="5s">5s</option>
              <option value="10s">10s</option>
              <option value="30s">30s</option>
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="30m">30m</option>
              <option value="1h">1h</option>
            </select>
          </div>
        </div>
      </div>

      {/* Panel Grid */}
      <div className="dashboard-panels p-4">
        {state.panels.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              {state.isEditing 
                ? 'Add panels to get started with your dashboard'
                : 'This dashboard is empty'
              }
            </div>
            {state.isEditing && (
              <button
                onClick={() => dashboardAPI.addPanel({
                  id: `panel-${Date.now()}`,
                  title: 'New Panel',
                  type: 'timeseries',
                  gridPos: { x: 0, y: 0, w: 12, h: 8 },
                  targets: [{ refId: 'A' }],
                  fieldConfig: { defaults: {}, overrides: [] },
                  options: {}
                })}
                className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm font-medium hover:bg-primary-700"
              >
                Add Panel
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-24 gap-2 auto-rows-[40px]">
            {state.panels.map((panel) => (
              <DashboardPanel
                key={panel.id}
                panel={panel}
                isEditing={state.isEditing}
                onUpdate={(updates) => dashboardAPI.updatePanel(panel.id, updates)}
                onRemove={() => dashboardAPI.removePanel(panel.id)}
                onDuplicate={() => dashboardAPI.duplicatePanel(panel)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface DashboardPanelProps {
  panel: VizPanel;
  isEditing: boolean;
  onUpdate: (updates: Partial<VizPanel>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}

function DashboardPanel({ panel, isEditing, onUpdate, onRemove, onDuplicate }: DashboardPanelProps) {
  const gridStyle = {
    gridColumn: `${panel.gridPos.x + 1} / span ${panel.gridPos.w}`,
    gridRow: `${panel.gridPos.y + 1} / span ${panel.gridPos.h}`
  };

  return (
    <div
      style={gridStyle}
      className={clsx(
        'bg-white border border-gray-200 rounded-md p-4 relative',
        isEditing && 'hover:border-primary-300'
      )}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-900 truncate">{panel.title}</h3>
        
        {isEditing && (
          <div className="flex items-center space-x-1">
            <button
              onClick={onDuplicate}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
              title="Duplicate panel"
            >
              📋
            </button>
            <button
              onClick={onRemove}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
              title="Remove panel"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {/* Panel Content */}
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-sm font-medium">{panel.type}</div>
          <div className="text-xs text-gray-400">Panel visualization will render here</div>
        </div>
      </div>
    </div>
  );
}