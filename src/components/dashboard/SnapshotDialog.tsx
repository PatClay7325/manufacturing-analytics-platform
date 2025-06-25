'use client';

import React, { useState } from 'react';
import { Camera, X, Lock, Unlock, Calendar, AlertCircle } from 'lucide-react';

interface SnapshotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: string;
  dashboardTitle: string;
  onSnapshot?: (config: SnapshotConfig) => void;
}

interface SnapshotConfig {
  title: string;
  description: string;
  includeData: boolean;
  isPublic: boolean;
  password?: string;
  expiresAt?: string;
}

export function SnapshotDialog({
  isOpen,
  onClose,
  dashboardId,
  dashboardTitle,
  onSnapshot
}: SnapshotDialogProps) {
  const [config, setConfig] = useState<SnapshotConfig>({
    title: `Snapshot of ${dashboardTitle} - ${new Date().toLocaleString()}`,
    description: '',
    includeData: true,
    isPublic: false
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);

    try {
      const response = await fetch(`/api/dashboards/${dashboardId}/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) {
        throw new Error('Failed to create snapshot');
      }

      const { snapshot } = await response.json();
      onSnapshot?.(config);
      onClose();

      // Show success notification or redirect
      if (config.isPublic && snapshot.shareKey) {
        const shareUrl = `${window.location.origin}/public/dashboard/${snapshot.shareKey}`;
        // Copy to clipboard or show in dialog
        navigator.clipboard.writeText(shareUrl);
      }
    } catch (error) {
      console.error('Failed to create snapshot:', error);
      // Show error notification
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Camera className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Create Snapshot</h3>
                  <p className="text-sm text-gray-500">Save the current state of your dashboard</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Snapshot Title
              </label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={config.description}
                onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add notes about this snapshot..."
              />
            </div>

            {/* Options */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.includeData}
                  onChange={(e) => setConfig(prev => ({ ...prev, includeData: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Include current data in snapshot
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.isPublic}
                  onChange={(e) => setConfig(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Make this snapshot publicly accessible
                </span>
              </label>
            </div>

            {/* Public Options */}
            {config.isPublic && (
              <div className="ml-6 space-y-3 p-3 bg-blue-50 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Public snapshots can be accessed by anyone with the link
                  </p>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password Protection (optional)
                  </label>
                  <input
                    type="password"
                    value={config.password || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Leave empty for no password"
                  />
                </div>

                {/* Expiration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiration
                  </label>
                  <select
                    value={config.expiresAt || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, expiresAt: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Never expires</option>
                    <option value={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()}>
                      1 day
                    </option>
                    <option value={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}>
                      1 week
                    </option>
                    <option value={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()}>
                      1 month
                    </option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500">
              {config.isPublic ? (
                <>
                  <Unlock className="h-4 w-4 mr-1" />
                  Public snapshot
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-1" />
                  Private snapshot
                </>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={isCreating || !config.title}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Snapshot'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}