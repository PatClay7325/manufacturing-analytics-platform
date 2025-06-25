'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  PlusIcon,
  CogIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Dashboard, Panel } from '@/types/dashboard';
import { useDashboardState } from '@/hooks/useDashboardState';
import GridLayout from './GridLayout';
import PanelEditor from './PanelEditor';
import DashboardSettings from './DashboardSettings';
import VariableManager from './VariableManager';
import PanelLibrary from './PanelLibrary';
import SaveDashboardModal from './SaveDashboardModal';
import { DashboardHeader } from './DashboardHeader';

interface DashboardEditorV2Props {
  dashboard: Dashboard;
  onSave?: (dashboard: Dashboard) => void;
  onCancel?: () => void;
  isSaving?: boolean;
  isNew?: boolean;
}

export default function DashboardEditorV2({
  dashboard: initialDashboard,
  onSave,
  onCancel,
  isSaving = false,
  isNew = false
}: DashboardEditorV2Props) {
  const [dashboard, setDashboard] = useState<Dashboard>(initialDashboard);
  const [selectedPanel, setSelectedPanel] = useState<Panel | null>(null);
  const [isPanelEditorOpen, setIsPanelEditorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVariablesOpen, setIsVariablesOpen] = useState(false);
  const [isPanelLibraryOpen, setIsPanelLibraryOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isStarred, setIsStarred] = useState(false);

  // Use the integrated dashboard state
  const {
    state,
    updateTimeRange,
    updateRefreshInterval,
    updateVariable,
    refreshDashboard,
    interpolateQuery
  } = useDashboardState({
    dashboard,
    onRefresh: handleRefresh
  });

  // Track changes
  useEffect(() => {
    if (!isNew) {
      setHasUnsavedChanges(JSON.stringify(dashboard) !== JSON.stringify(initialDashboard));
    }
  }, [dashboard, initialDashboard, isNew]);

  // Handle panel operations
  const handleAddPanel = useCallback((panelType: string) => {
    const maxId = Math.max(...(dashboard?.panels || []).map(p => p?.id || 0), 0);
    const newPanel: Panel = {
      id: maxId + 1,
      type: panelType,
      title: `New ${panelType} panel`,
      targets: [],
      fieldConfig: {
        defaults: {},
        overrides: []
      },
      options: {},
      transparent: false,
      gridPos: { x: 0, y: 0, w: 12, h: 9 }
    };

    setDashboard({
      ...dashboard,
      panels: [...(dashboard?.panels || []), newPanel]
    });

    setSelectedPanel(newPanel);
    setIsPanelEditorOpen(true);
    setIsPanelLibraryOpen(false);
  }, [dashboard]);

  const handleUpdatePanel = useCallback((panelId: number, updates: Partial<Panel>) => {
    setDashboard(prev => ({
      ...prev,
      panels: (prev?.panels || []).map(panel =>
        panel?.id === panelId ? { ...panel, ...updates } : panel
      )
    }));
  }, []);

  const handleDeletePanel = useCallback((panelId: number) => {
    setDashboard(prev => ({
      ...prev,
      panels: (prev?.panels || []).filter(panel => panel?.id !== panelId)
    }));
    if (selectedPanel?.id === panelId) {
      setSelectedPanel(null);
      setIsPanelEditorOpen(false);
    }
  }, [selectedPanel]);

  const handleDuplicatePanel = useCallback((panel: Panel) => {
    const maxId = Math.max(...(dashboard?.panels || []).map(p => p?.id || 0), 0);
    const newPanel: Panel = {
      ...panel,
      id: maxId + 1,
      gridPos: {
        ...panel?.gridPos,
        y: panel.gridPos.y + panel?.gridPos.h
      }
    };

    setDashboard(prev => ({
      ...prev,
      panels: [...(prev?.panels || []), newPanel]
    }));
  }, [dashboard?.panels]);

  const handlePanelClick = useCallback((panel: Panel) => {
    setSelectedPanel(panel);
    setIsPanelEditorOpen(true);
  }, []);

  const handleLayoutChange = useCallback((updatedPanels: Panel[]) => {
    setDashboard(prev => ({
      ...prev,
      panels: updatedPanels
    }));
  }, []);

  // Handle refresh
  async function handleRefresh() {
    // Custom refresh logic here
    console.log('Dashboard refreshed');
  }

  // Handle save
  const handleSaveClick = useCallback(() => {
    if (isNew || hasUnsavedChanges) {
      setIsSaveModalOpen(true);
    } else {
      onSave?.(dashboard);
    }
  }, [dashboard, hasUnsavedChanges, isNew, onSave]);

  const handleSaveConfirm = useCallback((title: string, description: string, tags: string[]) => {
    const updatedDashboard = {
      ...dashboard,
      title,
      description,
      tags
    };
    setDashboard(updatedDashboard);
    onSave?.(updatedDashboard);
    setIsSaveModalOpen(false);
  }, [dashboard, onSave]);

  const handleShare = useCallback(() => {
    // TODO: Implement share functionality
    console.log('Share dashboard');
  }, []);

  const handleSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleToggleStar = useCallback(() => {
    setIsStarred(!isStarred);
  }, [isStarred]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-gray-900 text-gray-100">
        {/* Sidebar */}
        <div className={`${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        } bg-gray-800 border-r border-gray-700 transition-all duration-300 flex flex-col`}>
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              {!isSidebarCollapsed && (
                <h2 className="text-lg font-semibold">Dashboard Editor</h2>
              )}
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-1 rounded hover:bg-gray-700 text-gray-400"
              >
                {isSidebarCollapsed ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Sidebar Menu */}
          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => setIsPanelLibraryOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-700 text-gray-300"
            >
              <PlusIcon className="w-5 h-5" />
              {!isSidebarCollapsed && <span>Add Panel</span>}
            </button>
            <button
              onClick={() => setIsVariablesOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-700 text-gray-300"
            >
              <CogIcon className="w-5 h-5" />
              {!isSidebarCollapsed && <span>Variables</span>}
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-700 text-gray-300"
            >
              <CogIcon className="w-5 h-5" />
              {!isSidebarCollapsed && <span>Settings</span>}
            </button>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={onCancel}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded border border-gray-600 hover:bg-gray-700 text-gray-300"
            >
              {!isSidebarCollapsed && <span>Exit</span>}
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Dashboard Header with integrated controls */}
          <DashboardHeader
            title={state.dashboard.title}
            variables={state.variables}
            timeRange={state.timeRange}
            onTimeRangeChange={updateTimeRange}
            refreshInterval={state.refreshInterval}
            onRefreshIntervalChange={updateRefreshInterval}
            onRefresh={refreshDashboard}
            onSave={handleSaveClick}
            onShare={handleShare}
            onSettings={handleSettings}
            isStarred={isStarred}
            onToggleStar={handleToggleStar}
            isEditing={true}
          />

          {/* Dashboard Canvas */}
          <div className="flex-1 overflow-auto bg-gray-900 p-4">
            <GridLayout
              panels={state.dashboard.panels}
              onLayoutChange={handleLayoutChange}
              onPanelClick={handlePanelClick}
              onPanelDelete={handleDeletePanel}
              onPanelDuplicate={handleDuplicatePanel}
              selectedPanelId={selectedPanel?.id}
            />
          </div>
        </div>

        {/* Panel Editor Modal */}
        {isPanelEditorOpen && selectedPanel && (
          <PanelEditor
            panel={selectedPanel}
            dashboard={dashboard}
            onSave={(updates) => {
              handleUpdatePanel(selectedPanel?.id, updates);
              setIsPanelEditorOpen(false);
            }}
            onClose={() => setIsPanelEditorOpen(false)}
          />
        )}

        {/* Settings Modal */}
        {isSettingsOpen && (
          <DashboardSettings
            dashboard={dashboard}
            onSave={(updates) => {
              setDashboard({ ...dashboard, ...updates });
              setIsSettingsOpen(false);
            }}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}

        {/* Variables Modal */}
        {isVariablesOpen && (
          <VariableManager
            dashboard={dashboard}
            onSave={(variables) => {
              setDashboard({
                ...dashboard,
                templating: { list: variables }
              });
              setIsVariablesOpen(false);
            }}
            onClose={() => setIsVariablesOpen(false)}
          />
        )}

        {/* Panel Library Modal */}
        {isPanelLibraryOpen && (
          <PanelLibrary
            onSelect={handleAddPanel}
            onClose={() => setIsPanelLibraryOpen(false)}
          />
        )}

        {/* Save Modal */}
        {isSaveModalOpen && (
          <SaveDashboardModal
            dashboard={dashboard}
            onSave={handleSaveConfirm}
            onClose={() => setIsSaveModalOpen(false)}
            isNew={isNew}
          />
        )}
      </div>
    </DndProvider>
  );
}