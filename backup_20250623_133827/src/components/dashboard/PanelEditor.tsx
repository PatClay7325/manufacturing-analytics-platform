'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Panel, Dashboard } from '@/types/dashboard';
import QueryEditor from './QueryEditor';
import PanelOptionsEditor from './PanelOptionsEditor';
import FieldConfigEditor from './FieldConfigEditor';
import TransformationsEditor from './TransformationsEditor';
import AlertRulesEditor from './AlertRulesEditor';
import PanelRenderer from './PanelRenderer';

interface PanelEditorProps {
  panel?: Panel;
  dashboard?: Dashboard;
  onSave?: (updates?: Partial<Panel>) => void;
  onClose?: () => void;
}

type EditorTab = 'query' | 'transform' | 'visualization' | 'field' | 'overrides' | 'alert';

export default function PanelEditor({
  panel,
  dashboard,
  onSave,
  onClose
}: PanelEditorProps) {
  const [editedPanel, setEditedPanel] = useState<Panel>({ ...panel });
  const [activeTab, setActiveTab] = useState<EditorTab>('query');
  const [hasChanges, setHasChanges] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  const handlePanelChange = (updates: Partial<Panel>) => {
    setEditedPanel(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(editedPanel);
    setHasChanges(false);
  };

  const handleDiscard = () => {
    setEditedPanel({ ...panel });
    setHasChanges(false);
  };

  const tabs: { id: EditorTab; label: string; show?: boolean }[] = [
    { id: 'query', label: 'Query' },
    { id: 'transform', label: 'Transform' },
    { id: 'visualization', label: 'Panel' },
    { id: 'field', label: 'Field' },
    { id: 'overrides', label: 'Overrides' },
    { id: 'alert', label: 'Alert', show: editedPanel.type !== 'text' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-gray-900">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-white">Edit Panel</h2>
              <input
                type="text"
                value={editedPanel?.title || ''}
                onChange={(e) => handlePanelChange({ title: e.target.value })}
                placeholder="Panel title"
                className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <button
                  onClick={handleDiscard}
                  className="px-3 py-1 text-sm text-gray-300 hover:text-white"
                >
                  Discard
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className={`
                  px-4 py-1 text-sm rounded font-medium
                  ${hasChanges
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                Apply
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded hover:bg-gray-700 text-gray-400"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Preview Panel */}
          <div className="flex-1 bg-gray-900 p-4">
            <div className="h-full bg-gray-800 rounded-lg border border-gray-700 p-4">
              <PanelRenderer
                panel={editedPanel}
                data={previewData}
                height="100%"
              />
            </div>
          </div>

          {/* Editor Panel */}
          <div className="w-[600px] bg-gray-800 border-l border-gray-700 flex flex-col">
            {/* Editor Tabs */}
            <div className="border-b border-gray-700">
              <nav className="flex">
                {tabs?.map(tab => (
                  tab?.show !== false && (
                    <button
                      key={tab?.id}
                      onClick={() => setActiveTab(tab?.id)}
                      className={`
                        px-4 py-3 text-sm font-medium border-b-2 transition-colors
                        ${activeTab === tab?.id
                          ? 'text-blue-400 border-blue-400'
                          : 'text-gray-400 border-transparent hover:text-white'
                        }
                      `}
                    >
                      {tab?.label}
                    </button>
                  )
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
              {activeTab === 'query' && (
                <QueryEditor
                  panel={editedPanel}
                  dashboard={dashboard}
                  onChange={(targets) => handlePanelChange({ targets })}
                  onDataReceived={setPreviewData}
                />
              )}

              {activeTab === 'transform' && (
                <TransformationsEditor
                  panel={editedPanel}
                  onChange={(transformations) => handlePanelChange({ transformations })}
                />
              )}

              {activeTab === 'visualization' && (
                <PanelOptionsEditor
                  panel={editedPanel}
                  onChange={(updates) => handlePanelChange(updates)}
                />
              )}

              {activeTab === 'field' && (
                <FieldConfigEditor
                  panel={editedPanel}
                  onChange={(fieldConfig) => handlePanelChange({ fieldConfig })}
                />
              )}

              {activeTab === 'overrides' && (
                <div className="p-4">
                  <h3 className="text-sm font-medium text-white mb-4">Field Overrides</h3>
                  <p className="text-sm text-gray-400">
                    Override field configuration for specific fields.
                  </p>
                  {/* TODO: Implement field overrides editor */}
                </div>
              )}

              {activeTab === 'alert' && (
                <AlertRulesEditor
                  panel={editedPanel}
                  onChange={(alertRules) => handlePanelChange({ alertRules })}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}