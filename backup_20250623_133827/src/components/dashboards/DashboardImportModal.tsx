'use client';

import React, { useState } from 'react';
import { XMarkIcon, DocumentArrowUpIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import ImportWizard from '../import-export/ImportWizard';
import { ImportResult } from '@/types/import-export';

interface DashboardImportModalProps {
  onClose?: () => void;
  onImport?: (dashboardJson?: string) => void;
}

export default function DashboardImportModal({
  onClose,
  onImport
}: DashboardImportModalProps) {
  const [importMethod, setImportMethod] = useState<'upload' | 'paste' | 'advanced'>('upload');
  const [jsonContent, setJsonContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAdvancedWizard, setShowAdvancedWizard] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if it's a supported format
    const supportedFormats = ['.json', '.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!supportedFormats.includes(fileExtension)) {
      setError('Please select a supported file format (JSON, CSV, Excel)');
      return;
    }

    // For non-JSON files, use the advanced wizard
    if (!file.name.endsWith('.json')) {
      setShowAdvancedWizard(true);
      return;
    }

    setLoading(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        setJsonContent(content);
        setLoading(false);
      } catch (err) {
        setError('Failed to read file');
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setLoading(false);
    };
    reader.readAsText(file);
  };

  const handleAdvancedImportComplete = (result: ImportResult) => {
    setShowAdvancedWizard(false);
    if (result.success) {
      // Convert result to JSON format for backward compatibility
      const dashboardJson = JSON.stringify({
        imported: true,
        result,
        dashboards: result.createdIds.concat(result.updatedIds)
      });
      onImport?.(dashboardJson);
    }
  };

  const validateJson = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      
      // Basic validation for dashboard structure
      if (!parsed.uid || !parsed.title || !parsed.panels) {
        setError('Invalid dashboard format: missing required fields (uid, title, panels)');
        return false;
      }

      if (!Array.isArray(parsed.panels)) {
        setError('Invalid dashboard format: panels must be an array');
        return false;
      }

      return true;
    } catch (err) {
      setError('Invalid JSON format');
      return false;
    }
  };

  const handleImport = () => {
    if (!jsonContent.trim()) {
      setError('Please provide dashboard JSON content');
      return;
    }

    if (!validateJson(jsonContent)) {
      return;
    }

    setError(null);
    onImport(jsonContent);
  };

  const handlePasteExample = () => {
    const exampleDashboard = {
      uid: `dashboard_${Date.now()}`,
      title: 'Imported Production Dashboard',
      description: 'An example manufacturing dashboard',
      tags: ['production', 'imported'],
      panels: [
        {
          id: 'panel_1',
          type: 'stat',
          title: 'Production Rate',
          gridPos: { x: 0, y: 0, w: 6, h: 4 },
          targets: [
            {
              expr: 'production_rate',
              legendFormat: 'Units/Hour'
            }
          ],
          options: {
            textMode: 'value',
            colorMode: 'background'
          },
          fieldConfig: {
            unit: 'short',
            min: 0,
            max: 1000
          }
        },
        {
          id: 'panel_2',
          type: 'timeseries',
          title: 'OEE Trend',
          gridPos: { x: 6, y: 0, w: 12, h: 8 },
          targets: [
            {
              expr: 'oee_percentage',
              legendFormat: 'OEE %'
            }
          ],
          options: {
            graphStyle: 'line',
            lineWidth: 2
          },
          fieldConfig: {
            unit: 'percent',
            min: 0,
            max: 100
          }
        }
      ],
      time: {
        from: 'now-6h',
        to: 'now'
      },
      refresh: '30s',
      meta: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        version: 1
      }
    };

    setJsonContent(JSON.stringify(exampleDashboard, null, 2));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Import Dashboard</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 text-gray-400"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Import Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Import Method
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="upload"
                    checked={importMethod === 'upload'}
                    onChange={(e) => setImportMethod(e.target.value as 'upload')}
                    className="w-4 h-4 text-blue-600 border-gray-300"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Upload File</div>
                    <div className="text-xs text-gray-500">JSON, CSV, or Excel</div>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="paste"
                    checked={importMethod === 'paste'}
                    onChange={(e) => setImportMethod(e.target.value as 'paste')}
                    className="w-4 h-4 text-blue-600 border-gray-300"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Paste JSON</div>
                    <div className="text-xs text-gray-500">Direct JSON input</div>
                  </div>
                </label>
                <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="advanced"
                    checked={importMethod === 'advanced'}
                    onChange={(e) => setImportMethod(e.target.value as 'advanced')}
                    className="w-4 h-4 text-blue-600 border-gray-300"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Advanced Import</div>
                    <div className="text-xs text-gray-500">Step-by-step wizard</div>
                  </div>
                </label>
              </div>
            </div>

            {/* File Upload */}
            {importMethod === 'upload' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Dashboard File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      Supported: JSON, CSV, Excel (.xlsx, .xls)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".json,.csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Advanced Import */}
            {importMethod === 'advanced' && (
              <div className="text-center py-8">
                <Cog6ToothIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Import Wizard</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Use our step-by-step wizard for importing CSV, Excel, or complex JSON files with field mapping and validation.
                </p>
                <button
                  onClick={() => setShowAdvancedWizard(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Launch Import Wizard
                </button>
              </div>
            )}

            {/* Paste Content */}
            {importMethod === 'paste' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Dashboard JSON Content
                  </label>
                  <button
                    type="button"
                    onClick={handlePasteExample}
                    className="text-xs text-blue-600 hover:text-blue-700 underline"
                  >
                    Paste Example
                  </button>
                </div>
                <textarea
                  value={jsonContent}
                  onChange={(e) => setJsonContent(e.target.value)}
                  className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Paste your dashboard JSON here..."
                />
              </div>
            )}

            {/* JSON Preview */}
            {jsonContent && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-40 overflow-auto">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                    {jsonContent.length > 500 
                      ? `${jsonContent.substring(0, 500)}...` 
                      : jsonContent}
                  </pre>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Import Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      {error}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Import Guidelines */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Import Guidelines</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>JSON:</strong> Dashboard JSON must include uid, title, and panels fields</li>
                <li>• <strong>CSV/Excel:</strong> Use Advanced Import for field mapping and validation</li>
                <li>• Existing dashboards with the same uid will be overwritten</li>
                <li>• Data sources referenced in panels must exist in your system</li>
                <li>• Variables and templating will be preserved if valid</li>
                <li>• Large files are processed in batches for better performance</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!jsonContent.trim() || loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Import Dashboard'}
          </button>
        </div>
      </div>

      {/* Advanced Import Wizard */}
      {showAdvancedWizard && (
        <ImportWizard
          isOpen={showAdvancedWizard}
          onClose={() => setShowAdvancedWizard(false)}
          onComplete={handleAdvancedImportComplete}
          importType="dashboard-config"
        />
      )}
    </div>
  );
}