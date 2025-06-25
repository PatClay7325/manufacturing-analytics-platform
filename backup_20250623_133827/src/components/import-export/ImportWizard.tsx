'use client';

import React, { useState, useCallback } from 'react';
import {
  XMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import FileUploader from './FileUploader';
import DataPreview from './DataPreview';
import FieldMapping from './FieldMapping';
import {
  ImportStep,
  FileUploadResult,
  FileValidationResult,
  FieldMapping as FieldMappingType,
  ImportOptions,
  ImportType,
  ImportResult,
  ImportProgress,
  FileFormat
} from '@/types/import-export';

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: ImportResult) => void;
  initialStep?: ImportStep;
  importType?: ImportType;
  className?: string;
}

const STEPS: { key: ImportStep; title: string; description: string }[] = [
  {
    key: 'upload',
    title: 'Upload File',
    description: 'Select and upload your data file'
  },
  {
    key: 'preview',
    title: 'Preview Data',
    description: 'Review and validate your data'
  },
  {
    key: 'mapping',
    title: 'Field Mapping',
    description: 'Map columns to target fields'
  },
  {
    key: 'validation',
    title: 'Validation',
    description: 'Final validation before import'
  },
  {
    key: 'import',
    title: 'Import',
    description: 'Processing your data'
  },
  {
    key: 'complete',
    title: 'Complete',
    description: 'Import completed successfully'
  }
];

const IMPORT_TYPES: { value: ImportType; label: string; description: string }[] = [
  {
    value: 'dashboard-config',
    label: 'Dashboard Configuration',
    description: 'Import dashboard settings and structure'
  },
  {
    value: 'dashboard-data',
    label: 'Dashboard Data',
    description: 'Import dashboard with historical data'
  },
  {
    value: 'panel-data',
    label: 'Panel Data',
    description: 'Import data for specific panels'
  },
  {
    value: 'template-batch',
    label: 'Template Batch',
    description: 'Create multiple dashboards from templates'
  },
  {
    value: 'metrics-data',
    label: 'Metrics Data',
    description: 'Import time-series metrics data'
  },
  {
    value: 'variables-config',
    label: 'Variables Configuration',
    description: 'Import dashboard variables and settings'
  }
];

export default function ImportWizard({
  isOpen,
  onClose,
  onComplete,
  initialStep = 'upload',
  importType = 'dashboard-config',
  className = ''
}: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState<ImportStep>(initialStep);
  const [uploadResult, setUploadResult] = useState<FileUploadResult | null>(null);
  const [validation, setValidation] = useState<FileValidationResult | null>(null);
  const [mapping, setMapping] = useState<FieldMappingType | null>(null);
  const [selectedImportType, setSelectedImportType] = useState<ImportType>(importType);
  const [options, setOptions] = useState<ImportOptions>({
    overwriteExisting: false,
    createMissing: true,
    skipErrors: false,
    validateData: true,
    batchSize: 100,
    tags: []
  });
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canProceed, setCanProceed] = useState(false);

  if (!isOpen) return null;

  const getCurrentStepIndex = () => STEPS.findIndex(step => step.key === currentStep);
  const currentStepData = STEPS[getCurrentStepIndex()];

  const handleFileUpload = useCallback(async (uploadResult: FileUploadResult) => {
    setUploadResult(uploadResult);
    setError(null);

    // Auto-validate the uploaded file
    try {
      const response = await fetch('/api/import/validate', {
        method: 'POST',
        body: (() => {
          const formData = new FormData();
          formData.append('file', uploadResult.file);
          formData.append('options', JSON.stringify({
            validateSchema: true,
            validateData: true,
            validateReferences: false,
            strictMode: false,
            customRules: []
          }));
          return formData;
        })()
      });

      if (response.ok) {
        const { validation, mapping: suggestedMapping } = await response.json();
        setValidation(validation);
        if (suggestedMapping) {
          setMapping(suggestedMapping);
        }
        setCanProceed(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Validation failed');
      }
    } catch (err) {
      setError('Failed to validate file');
    }
  }, []);

  const handleFileUploadError = useCallback((error: string) => {
    setError(error);
    setCanProceed(false);
  }, []);

  const handlePreviewValidation = useCallback((isValid: boolean) => {
    setCanProceed(isValid);
  }, []);

  const handleMappingChange = useCallback((newMapping: FieldMappingType) => {
    setMapping(newMapping);
  }, []);

  const handleMappingValidation = useCallback((isValid: boolean) => {
    setCanProceed(isValid);
  }, []);

  const handleNext = async () => {
    const currentIndex = getCurrentStepIndex();
    
    if (currentIndex < STEPS.length - 1) {
      const nextStep = STEPS[currentIndex + 1].key;
      
      if (nextStep === 'import') {
        await startImport();
      } else {
        setCurrentStep(nextStep);
        setCanProceed(nextStep !== 'mapping'); // Mapping requires validation
      }
    }
  };

  const handleBack = () => {
    const currentIndex = getCurrentStepIndex();
    
    if (currentIndex > 0) {
      const prevStep = STEPS[currentIndex - 1].key;
      setCurrentStep(prevStep);
      setCanProceed(true);
    }
  };

  const startImport = async () => {
    if (!uploadResult || !mapping) {
      setError('Missing required data for import');
      return;
    }

    setCurrentStep('import');
    setProgress({
      step: 'import',
      percentage: 0,
      processedRows: 0,
      totalRows: uploadResult.rawData.length - 1,
      currentOperation: 'Starting import...',
      errors: [],
      warnings: []
    });

    try {
      const formData = new FormData();
      formData.append('file', uploadResult.file);
      formData.append('options', JSON.stringify({
        ...options,
        importType: selectedImportType
      }));
      formData.append('mapping', JSON.stringify(mapping));

      const response = await fetch('/api/import/dashboard', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const { result: importResult } = await response.json();
        setResult(importResult);
        setCurrentStep('complete');
        onComplete(importResult);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Import failed');
      }
    } catch (err) {
      setError('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Import Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {IMPORT_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedImportType(type.value)}
              className={`p-4 border rounded-lg text-left transition-colors ${
                selectedImportType === type.value
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{type.label}</div>
              <div className="text-sm text-gray-600 mt-1">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      <FileUploader
        onFileUpload={handleFileUpload}
        onError={handleFileUploadError}
        acceptedFormats={['csv', 'excel', 'json']}
        maxFileSize={50}
      />

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Import Options</h4>
        <div className="space-y-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.overwriteExisting}
              onChange={(e) => setOptions({ ...options, overwriteExisting: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Overwrite existing items</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.createMissing}
              onChange={(e) => setOptions({ ...options, createMissing: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Create missing dependencies</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.skipErrors}
              onChange={(e) => setOptions({ ...options, skipErrors: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Skip rows with errors</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.validateData}
              onChange={(e) => setOptions({ ...options, validateData: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Validate data during import</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    uploadResult && (
      <DataPreview
        uploadResult={uploadResult}
        validation={validation || undefined}
        onValidationChange={handlePreviewValidation}
      />
    )
  );

  const renderMappingStep = () => (
    uploadResult && (
      <FieldMapping
        sourceHeaders={uploadResult.headers}
        importType={selectedImportType}
        initialMapping={mapping || undefined}
        onMappingChange={handleMappingChange}
        onValidationChange={handleMappingValidation}
      />
    )
  );

  const renderValidationStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Summary</h3>
        <p className="text-sm text-gray-600">
          Review the import configuration before proceeding.
        </p>
      </div>

      {uploadResult && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">File Information</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">File:</span>
              <div className="font-medium">{uploadResult.file.name}</div>
            </div>
            <div>
              <span className="text-gray-600">Format:</span>
              <div className="font-medium">{uploadResult.format.toUpperCase()}</div>
            </div>
            <div>
              <span className="text-gray-600">Size:</span>
              <div className="font-medium">{(uploadResult.file.size / 1024).toFixed(1)} KB</div>
            </div>
            <div>
              <span className="text-gray-600">Rows:</span>
              <div className="font-medium">{uploadResult.rawData.length - 1}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Import Configuration</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Import Type:</span>
            <div className="font-medium">
              {IMPORT_TYPES.find(t => t.value === selectedImportType)?.label}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Field Mappings:</span>
            <div className="font-medium">{mapping?.mappings.length || 0}</div>
          </div>
          <div>
            <span className="text-gray-600">Overwrite Existing:</span>
            <div className="font-medium">{options.overwriteExisting ? 'Yes' : 'No'}</div>
          </div>
          <div>
            <span className="text-gray-600">Skip Errors:</span>
            <div className="font-medium">{options.skipErrors ? 'Yes' : 'No'}</div>
          </div>
        </div>
      </div>

      {validation && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Validation Status</h4>
          <div className="flex items-center space-x-2">
            {validation.isValid ? (
              <>
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-700 font-medium">
                  Validation passed - Ready to import
                </span>
              </>
            ) : (
              <>
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                <span className="text-sm text-red-700 font-medium">
                  Validation issues detected ({validation.errors.length} errors, {validation.warnings.length} warnings)
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderImportStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Importing Data</h3>
        <p className="text-sm text-gray-600">
          Please wait while we process your import...
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
              {progress.processedRows} of {progress.totalRows} rows processed
            </div>
          </div>

          {progress.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-sm text-red-800">
                {progress.errors.length} error(s) encountered
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6 text-center">
      <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto" />
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Import Complete!</h3>
        <p className="text-sm text-gray-600">
          Your data has been successfully imported.
        </p>
      </div>

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-800 space-y-2">
            <div><strong>Total Processed:</strong> {result.totalProcessed}</div>
            <div><strong>Successful:</strong> {result.successCount}</div>
            <div><strong>Errors:</strong> {result.errorCount}</div>
            <div><strong>Warnings:</strong> {result.warningCount}</div>
            <div><strong>Duration:</strong> {(result.duration / 1000).toFixed(1)}s</div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload': return renderUploadStep();
      case 'preview': return renderPreviewStep();
      case 'mapping': return renderMappingStep();
      case 'validation': return renderValidationStep();
      case 'import': return renderImportStep();
      case 'complete': return renderCompleteStep();
      default: return null;
    }
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4 ${className}`}>
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Import Dashboard Data</h2>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 text-gray-400"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="mt-4 flex items-center space-x-4 overflow-x-auto">
            {STEPS.map((step, index) => (
              <div key={step.key} className="flex items-center flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === step.key
                      ? 'bg-blue-600 text-white'
                      : index < getCurrentStepIndex()
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {index < getCurrentStepIndex() ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="ml-2 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{step.title}</div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
                {index < STEPS.length - 1 && <div className="w-8 h-0.5 bg-gray-300 ml-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                <span className="text-sm text-red-800 font-medium">Error</span>
              </div>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          )}

          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={currentStep === 'upload' ? onClose : handleBack}
            disabled={currentStep === 'import'}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {currentStep !== 'upload' && <ArrowLeftIcon className="w-4 h-4" />}
            <span>{currentStep === 'upload' ? 'Cancel' : 'Back'}</span>
          </button>

          {currentStep !== 'complete' && currentStep !== 'import' && (
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <span>
                {currentStep === 'validation' ? 'Start Import' : 'Next'}
              </span>
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          )}

          {currentStep === 'complete' && (
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