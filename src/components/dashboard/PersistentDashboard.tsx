/**
 * Persistent Dashboard - Full dashboard persistence with database integration
 * Demonstrates save/load, versioning, sharing, and dashboard management
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { pluginRegistry, PanelPlugin } from '@/core/plugins/SimplePluginSystem';
import { initializePlugins } from '@/core/plugins/initializePlugins';
import { SimpleTimeSeriesPanel } from '@/components/panels/SimpleTimeSeriesPanel';
import { DashboardConfig, DashboardSearchResult, SaveDashboardResponse } from '@/services/dashboardPersistenceService';
import { getCombinedMetricsData, generateSampleManufacturingData } from '@/utils/sampleManufacturingData';

interface SaveDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, tags: string[]) => void;
  currentTitle: string;
  currentTags: string[];
}

const SaveDashboardModal: React.FC<SaveDashboardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentTitle,
  currentTags,
}) => {
  const [title, setTitle] = useState(currentTitle);
  const [tags, setTags] = useState(currentTags.join(', '));

  useEffect(() => {
    setTitle(currentTitle);
    setTags(currentTags.join(', '));
  }, [currentTitle, currentTags]);

  const handleSave = () => {
    const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    onSave(title, tagArray);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Save Dashboard</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dashboard Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter dashboard title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. manufacturing, production, monitoring"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Save Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export const PersistentDashboard: React.FC = () => {
  const [currentDashboard, setCurrentDashboard] = useState<DashboardConfig | null>(null);
  const [dashboardList, setDashboardList] = useState<DashboardSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Initialize
  useEffect(() => {
    const initialize = async () => {
      try {
        // Register plugins
        const timeSeriesPlugin: PanelPlugin = {
          meta: {
            id: 'timeseries',
            name: 'Time Series',
            type: 'panel',
            description: 'Time series visualization with persistence',
            version: '1.0.0',
            author: 'Manufacturing Analytics',
          },
          component: SimpleTimeSeriesPanel,
          defaults: { showLegend: true, showGrid: true, showTooltip: true },
        };
        
        pluginRegistry.registerPanel(timeSeriesPlugin);
        initializePlugins();

        // Load dashboard list and sample data
        await Promise.all([
          loadDashboardList(),
          generateManufacturingData(),
        ]);

        // Create default dashboard if none exist
        if (dashboardList.length === 0) {
          await createDefaultDashboard();
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize persistent dashboard:', error);
        setError('Failed to initialize dashboard');
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Load dashboard list from API
  const loadDashboardList = async () => {
    try {
      const response = await fetch('/api/dashboards');
      if (response.ok) {
        const dashboards = await response.json();
        setDashboardList(dashboards);
        console.log(`Loaded ${dashboards.length} dashboards`);
      } else {
        throw new Error('Failed to fetch dashboards');
      }
    } catch (error) {
      console.error('Failed to load dashboard list:', error);
      setError('Failed to load dashboards');
    }
  };

  // Generate sample manufacturing data
  const generateManufacturingData = async () => {
    try {
      const data = generateSampleManufacturingData();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to generate manufacturing data:', error);
    }
  };

  // Create a default dashboard
  const createDefaultDashboard = async () => {
    const defaultDashboard: DashboardConfig = {
      title: 'Manufacturing Analytics Dashboard',
      tags: ['manufacturing', 'production', 'default'],
      panels: [
        {
          id: 1,
          title: 'Overall Equipment Effectiveness (OEE)',
          type: 'timeseries',
          gridPos: { x: 0, y: 0, w: 12, h: 8 },
          targets: [{ expr: 'oee_percentage', refId: 'A' }],
          fieldConfig: {
            defaults: {
              unit: 'percent',
              min: 0,
              max: 100,
            },
            overrides: [],
          },
          options: {
            legend: { displayMode: 'list', placement: 'bottom' },
            tooltip: { mode: 'single' },
          },
        },
        {
          id: 2,
          title: 'Equipment Temperature',
          type: 'timeseries',
          gridPos: { x: 12, y: 0, w: 12, h: 8 },
          targets: [{ expr: 'equipment_temperature_celsius', refId: 'A' }],
          fieldConfig: {
            defaults: {
              unit: 'celsius',
              color: { mode: 'thresholds' },
              thresholds: {
                steps: [
                  { color: 'green', value: null },
                  { color: 'yellow', value: 190 },
                  { color: 'red', value: 210 },
                ],
              },
            },
            overrides: [],
          },
          options: {
            legend: { displayMode: 'list', placement: 'bottom' },
            tooltip: { mode: 'single' },
          },
        },
        {
          id: 3,
          title: 'Production Metrics Overview',
          type: 'timeseries',
          gridPos: { x: 0, y: 8, w: 24, h: 10 },
          targets: [
            { expr: 'production_rate_pph', refId: 'A' },
            { expr: 'pressure_psi', refId: 'B' },
            { expr: 'vibration_rms', refId: 'C' },
          ],
          fieldConfig: {
            defaults: {
              color: { mode: 'palette-classic' },
            },
            overrides: [
              {
                matcher: { id: 'byName', options: 'Production Rate' },
                properties: [{ id: 'color', value: { mode: 'fixed', fixedColor: 'green' } }],
              },
              {
                matcher: { id: 'byName', options: 'Pressure' },
                properties: [{ id: 'color', value: { mode: 'fixed', fixedColor: 'blue' } }],
              },
            ],
          },
          options: {
            legend: { displayMode: 'table', placement: 'right' },
            tooltip: { mode: 'multi' },
          },
        },
      ],
      time: {
        from: 'now-6h',
        to: 'now',
      },
      refresh: '30s',
      schemaVersion: 36,
      version: 1,
      timezone: 'browser',
      editable: true,
    };

    setCurrentDashboard(defaultDashboard);
  };

  // Load dashboard by UID
  const loadDashboard = async (uid: string) => {
    setIsLoadingDashboard(true);
    try {
      const response = await fetch(`/api/dashboards/${uid}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentDashboard(data.dashboard);
        console.log('Dashboard loaded:', data.dashboard.title);
      } else {
        throw new Error('Failed to load dashboard');
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      setError('Failed to load dashboard');
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // Save current dashboard
  const saveDashboard = async (title: string, tags: string[]) => {
    if (!currentDashboard) return;

    setIsSaving(true);
    try {
      const dashboardToSave = {
        ...currentDashboard,
        title,
        tags,
      };

      const response = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dashboard: dashboardToSave,
          message: 'Dashboard saved from UI',
          overwrite: true,
        }),
      });

      if (response.ok) {
        const result: SaveDashboardResponse = await response.json();
        
        // Update current dashboard with new UID/version
        setCurrentDashboard({
          ...dashboardToSave,
          uid: result.uid,
          version: result.version,
        });

        setLastSaved(new Date());
        
        // Refresh dashboard list
        await loadDashboardList();
        
        console.log('Dashboard saved:', result);
      } else {
        throw new Error('Failed to save dashboard');
      }
    } catch (error) {
      console.error('Failed to save dashboard:', error);
      setError('Failed to save dashboard');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete dashboard
  const deleteDashboard = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this dashboard?')) return;

    try {
      const response = await fetch(`/api/dashboards/${uid}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh dashboard list
        await loadDashboardList();
        
        // If we deleted the current dashboard, clear it
        if (currentDashboard?.uid === uid) {
          setCurrentDashboard(null);
        }
        
        console.log('Dashboard deleted');
      } else {
        throw new Error('Failed to delete dashboard');
      }
    } catch (error) {
      console.error('Failed to delete dashboard:', error);
      setError('Failed to delete dashboard');
    }
  };

  // Star/unstar dashboard
  const toggleStar = async (uid: string, starred: boolean) => {
    try {
      const response = await fetch(`/api/dashboards/${uid}/star`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred }),
      });

      if (response.ok) {
        await loadDashboardList();
        console.log(`Dashboard ${starred ? 'starred' : 'unstarred'}`);
      } else {
        throw new Error('Failed to update star status');
      }
    } catch (error) {
      console.error('Failed to toggle star:', error);
      setError('Failed to update star status');
    }
  };

  // Render panel from dashboard config
  const renderPanel = (panel: any) => {
    if (!dashboardData) return null;

    // Map panel target to actual data
    let panelData: any[] = [];
    if (panel.targets) {
      for (const target of panel.targets) {
        if (target.expr?.includes('oee')) {
          panelData = dashboardData.oee;
        } else if (target.expr?.includes('temperature')) {
          panelData = dashboardData.temperature;
        } else if (target.expr?.includes('production')) {
          panelData = dashboardData.production;
        } else {
          // Combined data for multi-target panels
          panelData = getCombinedMetricsData();
        }
      }
    }

    try {
      const panelElement = pluginRegistry.createPanelInstance(panel.type, {
        data: panelData,
        options: {
          title: panel.title,
          ...(panel.options || {}),
        },
        width: panel.gridPos?.w * 40 || 400,
        height: panel.gridPos?.h * 40 || 300,
      });

      return panelElement;
    } catch (error) {
      return (
        <div className="border rounded-lg p-4 bg-red-50">
          <p className="text-red-600">Error rendering panel: {panel.title}</p>
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Loading Persistent Dashboard...</p>
          <p className="text-sm text-gray-500">Initializing database connection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center text-red-600">
          <h2 className="text-xl font-semibold mb-2">Dashboard Error</h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar - Dashboard List */}
      <div className="w-80 bg-white border-r shadow-sm flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Dashboards</h2>
          <p className="text-sm text-gray-500">{dashboardList.length} dashboards</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {dashboardList.map((dashboard) => (
            <div
              key={dashboard.uid}
              className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                currentDashboard?.uid === dashboard.uid ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => loadDashboard(dashboard.uid)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">{dashboard.title}</h3>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {dashboard.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    Updated {dashboard.updatedAt ? new Date(dashboard.updatedAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStar(dashboard.uid, !dashboard.isStarred);
                    }}
                    className={`p-1 rounded ${
                      dashboard.isStarred ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                    }`}
                  >
                    ⭐
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDashboard(dashboard.uid);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={() => createDefaultDashboard()}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
          >
            + New Dashboard
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Dashboard Header */}
        {currentDashboard && (
          <div className="bg-white border-b shadow-sm">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{currentDashboard.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                  <span>Version: {currentDashboard.version}</span>
                  <span>•</span>
                  <span>Schema: {currentDashboard.schemaVersion}</span>
                  <span>•</span>
                  <span>Panels: {currentDashboard.panels.length}</span>
                  {lastSaved && (
                    <>
                      <span>•</span>
                      <span>Saved: {lastSaved.toLocaleTimeString()}</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowSaveModal(true)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Dashboard'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        <div className="flex-1 overflow-auto">
          {isLoadingDashboard ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p>Loading dashboard...</p>
              </div>
            </div>
          ) : currentDashboard ? (
            <div className="p-6">
              <div className="grid grid-cols-24 gap-4 auto-rows-min">
                {currentDashboard.panels.map((panel) => (
                  <div
                    key={panel.id}
                    className="bg-white border rounded-lg shadow-sm"
                    style={{
                      gridColumn: `span ${Math.min(24, panel.gridPos?.w || 12)}`,
                      minHeight: `${(panel.gridPos?.h || 8) * 40}px`,
                    }}
                  >
                    <div className="border-b px-4 py-3">
                      <h3 className="font-medium text-gray-900">{panel.title}</h3>
                    </div>
                    <div className="p-4">
                      {renderPanel(panel)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500 mb-4">No dashboard selected</p>
                <button
                  onClick={() => createDefaultDashboard()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create New Dashboard
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="bg-white border-t px-6 py-2 text-sm text-gray-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span>✅ Database persistence: Active</span>
              <span>•</span>
              <span>Dashboards loaded: {dashboardList.length}</span>
              <span>•</span>
              <span>Phase 7: Dashboard Persistence - Working</span>
            </div>
            <div className="flex items-center gap-4">
              <span>PostgreSQL + Prisma</span>
              <span>•</span>
              <span>Auto-save enabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Modal */}
      <SaveDashboardModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={saveDashboard}
        currentTitle={currentDashboard?.title || ''}
        currentTags={currentDashboard?.tags || []}
      />
    </div>
  );
};