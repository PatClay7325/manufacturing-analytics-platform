'use client';

import React, { useState, useEffect } from 'react';
import { Dashboard, Panel } from '@/types/dashboard';
import { Save, Plus, Settings, Grid3x3 } from 'lucide-react';

interface DashboardEditorProps {
  dashboard?: Dashboard;
  onSave?: (dashboard: Dashboard) => void;
  onCancel?: () => void;
}

export default function DashboardEditor({ 
  dashboard: initialDashboard, 
  onSave, 
  onCancel 
}: DashboardEditorProps) {
  const [dashboard, setDashboard] = useState<Dashboard>(
    initialDashboard || {
      uid: '',
      title: 'New Dashboard',
      description: '',
      tags: [],
      panels: [],
      editable: true,
      version: 0,
      schemaVersion: 1,
      timezone: 'browser',
      refresh: '',
      time: {
        from: 'now-6h',
        to: 'now'
      },
      fiscalYearStartMonth: 0,
      liveNow: false,
      weekStart: '',
      slug: '',
      templating: {
        list: []
      },
      annotations: {
        list: []
      }
    }
  );

  const [selectedPanel, setSelectedPanel] = useState<string | null>(null);

  const handleAddPanel = () => {
    const newPanel: Panel = {
      id: Date.now(),
      type: 'graph',
      title: 'New Panel',
      gridPos: {
        x: 0,
        y: 0,
        w: 12,
        h: 8
      },
      datasource: {
        type: 'prometheus',
        uid: ''
      },
      targets: [],
      options: {},
      fieldConfig: {
        defaults: {},
        overrides: []
      }
    };

    setDashboard(prev => ({
      ...prev,
      panels: [...prev.panels, newPanel]
    }));
  };

  const handlePanelUpdate = (panelId: number, updates: Partial<Panel>) => {
    setDashboard(prev => ({
      ...prev,
      panels: prev.panels.map(panel => 
        panel.id === panelId ? { ...panel, ...updates } : panel
      )
    }));
  };

  const handleDeletePanel = (panelId: number) => {
    setDashboard(prev => ({
      ...prev,
      panels: prev.panels.filter(panel => panel.id !== panelId)
    }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(dashboard);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={dashboard.title}
                onChange={(e) => setDashboard(prev => ({ ...prev, title: e.target.value }))}
                className="text-xl font-semibold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1"
                placeholder="Dashboard Title"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddPanel}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>Add Panel</span>
              </button>
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                <Save className="h-4 w-4" />
                <span>Save</span>
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 gap-4">
          {dashboard.panels.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-12">
              <div className="text-center">
                <Grid3x3 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No panels</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by adding a new panel to your dashboard.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleAddPanel}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    Add Panel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-24 gap-4">
              {dashboard.panels.map((panel) => (
                <div
                  key={panel.id}
                  className={`col-span-${panel.gridPos.w} bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 ${
                    selectedPanel === String(panel.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                  style={{
                    gridColumn: `span ${panel.gridPos.w} / span ${panel.gridPos.w}`,
                    minHeight: `${panel.gridPos.h * 30}px`
                  }}
                  onClick={() => setSelectedPanel(String(panel.id))}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {panel.title}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePanel(panel.id);
                      }}
                      className="text-gray-400 hover:text-red-600"
                    >
                      ×
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Type: {panel.type}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel Editor (placeholder) */}
      {selectedPanel && (
        <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl border-l border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-lg font-semibold mb-4">Panel Editor</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Panel editing functionality would go here
          </p>
        </div>
      )}
    </div>
  );
}