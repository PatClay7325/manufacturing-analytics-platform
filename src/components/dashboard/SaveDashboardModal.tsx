'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Dashboard } from '@/types/dashboard';

interface SaveDashboardModalProps {
  dashboard?: Dashboard;
  onSave?: (title?: string, description?: string, tags?: string[]) => void;
  onClose?: () => void;
  isNew?: boolean;
}

export default function SaveDashboardModal({
  dashboard,
  onSave,
  onClose,
  isNew = false
}: SaveDashboardModalProps) {
  const [title, setTitle] = useState(dashboard?.title);
  const [description, setDescription] = useState(dashboard?.description || '');
  const [tags, setTags] = useState(dashboard?.tags.join(', '));
  const [saveAs, setSaveAs] = useState(false);

  const handleSave = () => {
    const tagArray = tags?.split(',').map(tag => tag?.trim()).filter(Boolean);
    onSave(title, description, tagArray);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {isNew ? 'Save Dashboard' : 'Save Changes'}
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {!isNew && (
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="saveAs"
                checked={saveAs}
                onChange={(e) => setSaveAs(e?.target.checked)}
                className="w-4 h-4 bg-gray-100 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="saveAs" className="text-sm text-gray-700">
                Save as new dashboard
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dashboard Name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e?.target.value)}
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="Enter dashboard name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e?.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="Enter dashboard description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e?.target.value)}
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
              placeholder="production, quality, oee"
            />
            <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!title?.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-gray-900 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}