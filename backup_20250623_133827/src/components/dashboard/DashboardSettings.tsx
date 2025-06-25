'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Dashboard } from '@/types/dashboard';

interface DashboardSettingsProps {
  dashboard?: Dashboard;
  onSave?: (updates?: Partial<Dashboard>) => void;
  onClose?: () => void;
}

export default function DashboardSettings({
  dashboard,
  onSave,
  onClose
}: DashboardSettingsProps) {
  const [settings, setSettings] = useState({
    title: dashboard.title,
    description: dashboard.description || '',
    tags: dashboard.tags.join(', '),
    timezone: dashboard.timezone,
    refresh: dashboard.refresh,
    editable: dashboard.editable,
    hideControls: dashboard.hideControls,
    style: dashboard.style
  });

  const handleSave = () => {
    onSave({
      title: settings.title,
      description: settings.description,
      tags: settings.tags.split(',').map(tag => tag?.trim()).filter(Boolean),
      timezone: settings.timezone,
      refresh: settings.refresh,
      editable: settings.editable,
      hideControls: settings.hideControls,
      style: settings.style
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Dashboard Settings</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-700 text-gray-400"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* General Settings */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">General</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={settings?.title}
                  onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={settings?.description}
                  onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  value={settings?.tags}
                  onChange={(e) => setSettings({ ...settings, tags: e.target.value })}
                  placeholder="production, quality, oee"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
              </div>
            </div>
          </div>

          {/* Time Settings */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Time Options</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Timezone
                </label>
                <select
                  value={settings?.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="browser">Browser Time</option>
                  <option value="utc">UTC</option>
                  <option value="America/New_York">America/New York</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Auto-refresh
                </label>
                <select
                  value={settings?.refresh as string}
                  onChange={(e) => setSettings({ ...settings, refresh: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Off</option>
                  <option value="5s">5 seconds</option>
                  <option value="10s">10 seconds</option>
                  <option value="30s">30 seconds</option>
                  <option value="1m">1 minute</option>
                  <option value="5m">5 minutes</option>
                  <option value="15m">15 minutes</option>
                  <option value="30m">30 minutes</option>
                  <option value="1h">1 hour</option>
                </select>
              </div>
            </div>
          </div>

          {/* Panel Options */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Panel Options</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings?.editable}
                  onChange={(e) => setSettings({ ...settings, editable: e.target.checked })}
                  className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">Make dashboard editable</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings?.hideControls}
                  onChange={(e) => setSettings({ ...settings, hideControls: e.target.checked })}
                  className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">Hide dashboard controls</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}