'use client';

import React, { useState } from 'react';
import {
  XMarkIcon,
  DocumentArrowDownIcon,
  Cog6ToothIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import {
  FileFormat,
  ExportRequest,
  ExportTarget,
  ExportTargetType,
  ExportOptions,
  ExportIncludeOptions,
  ExportProgress,
  ExportResult
} from '@/types/import-export';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTargets?: ExportTarget[];
  onExport: (request: ExportRequest) => Promise<void>;
  className?: string;
}

const FORMAT_OPTIONS: { value: FileFormat; label: string; description: string; icon: string }[] = [
  {
    value: 'csv',
    label: 'CSV',
    description: 'Comma-separated values for spreadsheet applications',
    icon: '📊'
  },
  {
    value: 'excel',
    label: 'Excel',
    description: 'Microsoft Excel format with formatting support',
    icon: '📈'
  },
  {
    value: 'json',
    label: 'JSON',
    description: 'JavaScript Object Notation for programmatic use',
    icon: '🔧'
  }
];

const TARGET_TYPES: { value: ExportTargetType; label: string; description: string }[] = [
  { value: 'dashboard', label: 'Dashboard', description: 'Complete dashboard configuration and data' },
  { value: 'panel', label: 'Panel', description: 'Individual panel configuration and data' },
  { value: 'folder', label: 'Folder', description: 'All dashboards within a folder' },
  { value: 'library-panel', label: 'Library Panel', description: 'Reusable panel templates' },
  { value: 'datasource', label: 'Data Source', description: 'Data source configuration' },
  { value: 'variable', label: 'Variable', description: 'Dashboard variables configuration' }
];

const DATE_RANGES = [
  { value: 'last-1h', label: 'Last Hour' },
  { value: 'last-6h', label: 'Last 6 Hours' },
  { value: 'last-24h', label: 'Last 24 Hours' },
  { value: 'last-7d', label: 'Last 7 Days' },
  { value: 'last-30d', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' }
];

export default function ExportModal({
  isOpen,
  onClose,
  initialTargets = [],
  onExport,
  className = ''
}: ExportModalProps) {
  const [step, setStep] = useState<'targets' | 'options' | 'export' | 'complete'>('targets');
  const [targets, setTargets] = useState<ExportTarget[]>(initialTargets);
  const [format, setFormat] = useState<FileFormat>('csv');
  const [options, setOptions] = useState<ExportOptions>({
    includeData: true,
    includeMetadata: true,
    includeHistory: false,
    dataFormat: 'formatted',
    compression: false,
    fileName: '',
    customFields: [],
    filters: []
  });
  const [dateRange, setDateRange] = useState('last-24h');
  const [customDateRange, setCustomDateRange] = useState({
    from: '',
    to: ''
  });
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddTarget = () => {
    const newTarget: ExportTarget = {
      type: 'dashboard',
      id: '',
      include: {
        configuration: true,
        data: true,
        metadata: true,
        history: false,
        permissions: false,
        linkedPanels: true,
        variables: true,
        annotations: true
      }
    };
    setTargets([...targets, newTarget]);
  };

  const updateTarget = (index: number, updates: Partial<ExportTarget>) => {
    const newTargets = [...targets];
    newTargets[index] = { ...newTargets[index], ...updates };
    setTargets(newTargets);
  };

  const removeTarget = (index: number) => {
    setTargets(targets.filter((_, i) => i !== index));
  };

  const updateIncludeOptions = (index: number, updates: Partial<ExportIncludeOptions>) => {
    const newTargets = [...targets];
    newTargets[index].include = { ...newTargets[index].include, ...updates };
    setTargets(newTargets);
  };

  const handleNext = () => {
    if (step === 'targets' && targets.length > 0) {
      setStep('options');
    } else if (step === 'options') {
      setStep('export');
      handleExport();
    }
  };

  const handleBack = () => {
    if (step === 'options') {
      setStep('targets');
    } else if (step === 'export') {
      setStep('options');
    }
  };

  const handleExport = async () => {
    try {
      setError(null);
      setProgress({
        step: 'options',
        percentage: 0,
        processedItems: 0,
        totalItems: targets.length,
        currentOperation: 'Preparing export...'
      });

      const exportRequest: ExportRequest = {
        targets,
        format,
        options: {
          ...options,
          dateRange: dateRange === 'custom' ? customDateRange : undefined
        }
      };

      await onExport(exportRequest);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const canProceed = () => {
    if (step === 'targets') {
      return targets.length > 0 && targets.every(t => t.id.trim() !== '');
    }
    if (step === 'options') {
      return true;
    }
    return false;
  };

  const renderTargetsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Export Targets</h3>
        <p className="text-sm text-gray-600">
          Choose what you want to export. You can export multiple items at once.
        </p>
      </div>

      <div className="space-y-4">
        {targets.map((target, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-12 gap-4 items-start">
              {/* Target Type */}
              <div className="col-span-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={target.type}
                  onChange={(e) => updateTarget(index, { type: e.target.value as ExportTargetType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  {TARGET_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {TARGET_TYPES.find(t => t.value === target.type)?.description}
                </p>
              </div>

              {/* Target ID */}
              <div className="col-span-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID/Name
                </label>
                <input
                  type="text"
                  value={target.id}
                  onChange={(e) => updateTarget(index, { id: e.target.value })}
                  placeholder={`Enter ${target.type} ID or name...`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Remove Button */}
              <div className="col-span-2 flex justify-end">
                <button
                  onClick={() => removeTarget(index)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Include Options */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Include Options
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(target.include).map(([key, value]) => (
                  <label key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => updateIncludeOptions(index, { [key]: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={handleAddTarget}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
        >
          <DocumentArrowDownIcon className="h-6 w-6 mx-auto mb-2" />
          Add Export Target
        </button>
      </div>
    </div>
  );

  const renderOptionsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Export Options</h3>
        <p className="text-sm text-gray-600">
          Configure how your data should be exported.
        </p>
      </div>

      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Export Format
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {FORMAT_OPTIONS.map((formatOption) => (
            <button
              key={formatOption.value}
              onClick={() => setFormat(formatOption.value)}
              className={`p-4 border rounded-lg text-left transition-colors ${
                format === formatOption.value
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{formatOption.icon}</span>
                <div>
                  <div className="font-medium">{formatOption.label}</div>
                  <div className="text-sm text-gray-600">{formatOption.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          <CalendarIcon className="h-4 w-4 inline mr-1" />
          Date Range (for data export)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
          {DATE_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setDateRange(range.value)}
              className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                dateRange === range.value
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">From</label>
              <input
                type="datetime-local"
                value={customDateRange.from}
                onChange={(e) => setCustomDateRange({ ...customDateRange, from: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">To</label>
              <input
                type="datetime-local"
                value={customDateRange.to}
                onChange={(e) => setCustomDateRange({ ...customDateRange, to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Advanced Options */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <Cog6ToothIcon className="h-4 w-4 mr-1" />
          Advanced Options
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Data Format */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">Data Format</label>
            <select
              value={options.dataFormat}
              onChange={(e) => setOptions({ ...options, dataFormat: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="raw">Raw Data</option>
              <option value="formatted">Formatted Data</option>
              <option value="aggregated">Aggregated Data</option>
            </select>
          </div>

          {/* File Name */}
          <div>
            <label className="block text-sm text-gray-700 mb-1">Custom File Name</label>
            <input
              type="text"
              value={options.fileName || ''}
              onChange={(e) => setOptions({ ...options, fileName: e.target.value })}
              placeholder="Leave empty for auto-generated name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.includeData}
              onChange={(e) => setOptions({ ...options, includeData: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Include data values</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.includeMetadata}
              onChange={(e) => setOptions({ ...options, includeMetadata: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Include metadata</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.includeHistory}
              onChange={(e) => setOptions({ ...options, includeHistory: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Include version history</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.compression}
              onChange={(e) => setOptions({ ...options, compression: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Compress output files</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderExportStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <DocumentArrowDownIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Exporting Data</h3>
        <p className="text-sm text-gray-600">
          Please wait while we prepare your export...
        </p>
      </div>

      {progress && (
        <div className="space-y-4">
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          
          <div className="text-center">
            <div className="text-sm font-medium text-gray-900">
              {progress.currentOperation}
            </div>
            <div className="text-sm text-gray-600">
              {progress.processedItems} of {progress.totalItems} items processed
            </div>
            {progress.estimatedTimeRemaining && (
              <div className="text-xs text-gray-500 flex items-center justify-center mt-1">
                <ClockIcon className="h-3 w-3 mr-1" />
                {Math.ceil(progress.estimatedTimeRemaining / 1000)}s remaining
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm text-red-800">
            <strong>Export Failed:</strong> {error}
          </div>
        </div>
      )}
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6 text-center">
      <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto" />
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Export Complete!</h3>
        <p className="text-sm text-gray-600">
          Your data has been successfully exported.
        </p>
      </div>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-800 space-y-2">
            <div><strong>Files Created:</strong> {result.files.length}</div>
            <div><strong>Total Size:</strong> {(result.statistics.totalSize / (1024 * 1024)).toFixed(2)} MB</div>
            <div><strong>Duration:</strong> {(result.duration / 1000).toFixed(1)}s</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Export Data</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 text-gray-400"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="mt-4 flex items-center space-x-4">
            {['targets', 'options', 'export', 'complete'].map((stepName, index) => (
              <div key={stepName} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === stepName
                      ? 'bg-blue-600 text-white'
                      : index < ['targets', 'options', 'export', 'complete'].indexOf(step)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {index + 1}
                </div>
                <span className="ml-2 text-sm font-medium capitalize">{stepName}</span>
                {index < 3 && <div className="w-8 h-0.5 bg-gray-300 ml-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {step === 'targets' && renderTargetsStep()}
          {step === 'options' && renderOptionsStep()}
          {step === 'export' && renderExportStep()}
          {step === 'complete' && renderCompleteStep()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={step === 'targets' ? onClose : handleBack}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
            disabled={step === 'export'}
          >
            {step === 'targets' ? 'Cancel' : 'Back'}
          </button>

          {step !== 'complete' && step !== 'export' && (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === 'options' ? 'Start Export' : 'Next'}
            </button>
          )}

          {step === 'complete' && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}