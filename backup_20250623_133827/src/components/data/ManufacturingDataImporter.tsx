/**
 * Manufacturing Data Importer Component
 * Handles importing comprehensive manufacturing datasets with your specific headers
 */

'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, Database, BarChart3 } from 'lucide-react';

interface ImportStats {
  totalRecords: number;
  dateRange: { from: string; to: string } | null;
  machineCount: number;
  processCount: number;
  anomalyCount: number;
  avgOEE: number | null;
}

interface ImportValidation {
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}

interface ImportResult {
  success: boolean;
  imported: number;
  errors: string[];
  stats: ImportStats;
  validation: ImportValidation;
  message: string;
}

interface ManufacturingDataImporterProps {
  workUnitId: string;
  onImportComplete?: (result: ImportResult) => void;
}

const ManufacturingDataImporter: React.FC<ManufacturingDataImporterProps> = ({
  workUnitId,
  onImportComplete
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const expectedHeaders = [
    'MachineName', 'ProcessName', 'TotalPartsProduced', 'GoodParts', 'RejectParts',
    'PlannedProductionTime', 'DowntimeMinutes', 'DowntimeTimestamp', 'DowntimeCategory',
    'DowntimeReason', 'Availability', 'Performance', 'Quality', 'OEE', 'NormalizedOEE',
    'SimulatedOEE', 'PreviousMonthOEE', 'PreviousWeekDowntime', 'OEETrend', 'DowntimeTrend',
    'SimulatedRevenueGrowth', 'MTBF', 'MTTR', 'FailureRate', 'RemainingUsefulLife',
    'ConfidenceInterval', 'MachineUtilizationPercentage', 'OperatorUtilizationPercentage',
    'ErrorCode', 'ErrorDescription', 'Rolling7DayOEE', 'Rolling30DayDowntime',
    'IndustryBenchmarkOEE', 'DeviationFromBenchmark', 'EventTrigger', 'EventResolutionTime',
    'CustomerSatisfactionScore', 'OnTimeDeliveryPercentage', 'EnergyConsumed_kWh',
    'EnergyCost_USD', 'Emissions_kg', 'WaterUsage_liters', 'WasteGenerated_kg',
    'RecycledMaterial_kg', 'OnTimeDelivery', 'DefectiveItems', 'IncidentType',
    'IncidentSeverity', 'IncidentTimestamp', 'IncidentCategory', 'ResolutionTimeMinutes',
    'OperatorName', 'Shift', 'BatchNumber', 'ProductType', 'CycleTimeSeconds',
    'ChangeoverTimeMinutes', 'EfficiencyLossPercentage', 'DowntimePercentage',
    'BenchmarkOEE', 'BenchmarkDowntime', 'BenchmarkEnergyConsumed_kWh', 'RealTimeDataFlag',
    'LastUpdatedTimestamp', 'DatasetVersion', 'SupplierName', 'DeliveryLeadTime',
    'SupplierRating', 'PredictedFailureScore', 'DeviationFromNormal', 'ProductDimensions',
    'ProductWeight', 'CostPerUnitProduced', 'YieldPercentage', 'ShiftOverlap', 'SiteName',
    'DataValidationStatus', 'AnomalyDetected', 'AnomalyScore', 'AnomalyReason',
    'WeekNumber', 'Month', 'Quarter', 'Year', 'RevenueGenerated',
    'SimulatedDowntimeReduction', 'UserDefinedOEEThreshold', 'UserDefinedDowntimeThreshold',
    'Region', 'VisualizationFlag', 'StakeholderFeedbackRequired'
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['text/csv', 'application/json', '.csv', '.json'];
    const isValidType = validTypes.some(type => 
      file.type === type || file.name.toLowerCase().endsWith(type.replace('.', ''))
    );

    if (!isValidType) {
      alert('Please upload a CSV or JSON file');
      return;
    }

    setIsUploading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workUnitId', workUnitId);
      formData.append('importType', file.name.endsWith('.json') ? 'json' : 'csv');

      const response = await fetch('/api/import/manufacturing-data', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      setImportResult(result);
      onImportComplete?.(result);

    } catch (error) {
      console.error('Import error:', error);
      alert(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.json"
          onChange={handleFileInput}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 text-gray-400">
            {isUploading ? (
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
            ) : (
              <Upload className="w-full h-full" />
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {isUploading ? 'Importing Data...' : 'Upload Manufacturing Dataset'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Drag and drop your CSV or JSON file here, or click to browse
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Supports files with {expectedHeaders.length} manufacturing metrics columns
            </p>
          </div>
          
          <button
            type="button"
            disabled={isUploading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4 mr-2" />
            {isUploading ? 'Processing...' : 'Choose File'}
          </button>
        </div>
      </div>

      {/* Expected Headers Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Expected Dataset Headers:</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 text-xs text-gray-600">
          {expectedHeaders.slice(0, 20).map((header, index) => (
            <div key={index} className="truncate" title={header}>
              {header}
            </div>
          ))}
          <div className="text-gray-400 italic">
            ... and {expectedHeaders.length - 20} more
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Don't worry if your file doesn't have all headers - missing columns will be handled gracefully.
        </p>
      </div>

      {/* Import Results */}
      {importResult && (
        <div className="space-y-4">
          {/* Success/Error Summary */}
          <div className={`rounded-lg p-4 ${
            importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              {importResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              )}
              <div className="flex-1">
                <h3 className={`font-medium ${
                  importResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {importResult.message}
                </h3>
                {importResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-gray-600">
                      View {importResult.errors.length} errors
                    </summary>
                    <div className="mt-1 text-xs text-gray-500 max-h-32 overflow-y-auto">
                      {importResult.errors.map((error, index) => (
                        <div key={index} className="py-1">{error}</div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center">
                <Database className="w-8 h-8 text-blue-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {importResult.stats.totalRecords.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">Total Records</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-green-500 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {importResult.stats.avgOEE ? (importResult.stats.avgOEE * 100).toFixed(1) + '%' : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-500">Avg OEE</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <div className="text-lg font-bold text-gray-900">
                {importResult.stats.machineCount}
              </div>
              <div className="text-sm text-gray-500">Machines</div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <div className="text-lg font-bold text-gray-900">
                {importResult.stats.anomalyCount}
              </div>
              <div className="text-sm text-gray-500">Anomalies</div>
            </div>
          </div>

          {/* Data Validation */}
          {!importResult.validation.isValid && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Data Quality Issues Found:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                {importResult.validation.issues.map((issue, index) => (
                  <li key={index}>• {issue}</li>
                ))}
              </ul>
              {importResult.validation.suggestions.length > 0 && (
                <div className="mt-3">
                  <h5 className="font-medium text-yellow-800">Suggestions:</h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {importResult.validation.suggestions.map((suggestion, index) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Date Range */}
          {importResult.stats.dateRange && (
            <div className="text-sm text-gray-600">
              <strong>Data Range:</strong> {new Date(importResult.stats.dateRange.from).toLocaleDateString()} 
              {' to '} {new Date(importResult.stats.dateRange.to).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManufacturingDataImporter;