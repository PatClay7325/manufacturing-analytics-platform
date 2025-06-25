'use client';

import React from 'react';

interface TableOptionsProps {
  options?: any;
  fieldConfig?: any;
  onChange?: (options?: any) => void;
  onFieldConfigChange?: (fieldConfig?: any) => void;
}

export default function TableOptions({
  options,
  fieldConfig,
  onChange,
  onFieldConfigChange
}: TableOptionsProps) {
  return (
    <div className="p-4 space-y-6">
      {/* Table */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Table</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={options?.showHeader !== false}
              onChange={(e) => onChange({ showHeader: e.target.checked })}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Show header</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={options?.showRowNumbers || false}
              onChange={(e) => onChange({ showRowNumbers: e.target.checked })}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Show row numbers</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Rows per page
            </label>
            <select
              value={options?.pageSize || 50}
              onChange={(e) => onChange({ pageSize: Number(e?.target.value) })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Table display mode
            </label>
            <select
              value={options?.displayMode || 'table'}
              onChange={(e) => onChange({ displayMode: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="table">Table</option>
              <option value="list">List</option>
              <option value="json">JSON</option>
            </select>
          </div>
        </div>
      </div>

      {/* Column Settings */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Column Settings</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={options?.sortable !== false}
              onChange={(e) => onChange({ sortable: e.target.checked })}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Enable column sorting</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={options?.filterable || false}
              onChange={(e) => onChange({ filterable: e.target.checked })}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Enable column filtering</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={options?.resizable !== false}
              onChange={(e) => onChange({ resizable: e.target.checked })}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Enable column resizing</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Column width mode
            </label>
            <select
              value={options?.columnWidthMode || 'auto'}
              onChange={(e) => onChange({ columnWidthMode: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="auto">Auto</option>
              <option value="fixed">Fixed</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cell Display */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Cell Display</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Cell display mode
            </label>
            <select
              value={options?.cellDisplayMode || 'auto'}
              onChange={(e) => onChange({ cellDisplayMode: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="auto">Auto</option>
              <option value="color-background">Color background</option>
              <option value="color-text">Color text</option>
              <option value="gradient-gauge">Gradient gauge</option>
              <option value="lcd-gauge">LCD gauge</option>
            </select>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={options?.inspect || false}
              onChange={(e) => onChange({ inspect: e.target.checked })}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Enable cell inspection</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Cell link target
            </label>
            <select
              value={options?.cellLinkTarget || '_self'}
              onChange={(e) => onChange({ cellLinkTarget: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="_self">Same tab</option>
              <option value="_blank">New tab</option>
            </select>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div>
        <h3 className="text-sm font-medium text-white mb-4">Footer</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={options?.showFooter || false}
              onChange={(e) => onChange({ showFooter: e.target.checked })}
              className="w-4 h-4 bg-gray-700 border-gray-600 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Show footer</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Footer calculations
            </label>
            <select
              value={options?.footerCalculation || 'none'}
              onChange={(e) => onChange({ footerCalculation: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="none">None</option>
              <option value="sum">Sum</option>
              <option value="avg">Average</option>
              <option value="min">Minimum</option>
              <option value="max">Maximum</option>
              <option value="count">Count</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}