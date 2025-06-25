'use client';

import React, { useState, useEffect } from 'react';
import { 
  CloudArrowUpIcon, 
  DocumentArrowUpIcon, 
  ChartBarIcon,
  CogIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import PageLayout from '@/components/layout/PageLayout';
import ImportWizard from '@/components/import-export/ImportWizard';
import FileUploader from '@/components/import-export/FileUploader';
import ManufacturingDataImporter from '@/components/data/ManufacturingDataImporter';
import { ImportResult, FileFormat, ImportType } from '@/types/import-export';

interface UploadTemplate {
  id: string;
  name: string;
  description: string;
  type: ImportType;
  formats: FileFormat[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  sampleUrl?: string;
}

interface UploadHistory {
  id: string;
  fileName: string;
  type: string;
  status: 'completed' | 'failed' | 'processing' | 'cancelled' | 'completed_with_errors';
  recordsImported: number;
  uploadDate: Date;
  fileSize: string;
  errors?: string[];
  successfulRecords?: number;
  failedRecords?: number;
  processingTime?: number;
}

const UPLOAD_TEMPLATES: UploadTemplate[] = [
  {
    id: 'manufacturing-metrics',
    name: 'Manufacturing Metrics',
    description: 'OEE, production data, quality metrics, and performance indicators',
    type: 'manufacturing-data',
    formats: ['csv', 'excel', 'json'],
    icon: CogIcon,
    color: 'bg-blue-500',
    sampleUrl: '/templates/manufacturing-metrics-sample.csv'
  },
  {
    id: 'dashboard-config',
    name: 'Dashboard Configuration',
    description: 'Import dashboard layouts, widgets, and visualization settings',
    type: 'dashboard-config',
    formats: ['json'],
    icon: ChartBarIcon,
    color: 'bg-green-500',
    sampleUrl: '/templates/dashboard-config-sample.json'
  },
  {
    id: 'equipment-data',
    name: 'Equipment Data',
    description: 'Machine specifications, maintenance records, and sensor data',
    type: 'equipment-data',
    formats: ['csv', 'excel'],
    icon: CogIcon,
    color: 'bg-orange-500',
    sampleUrl: '/templates/equipment-data-sample.csv'
  },
  {
    id: 'alert-rules',
    name: 'Alert Rules',
    description: 'Threshold configurations, notification settings, and alert policies',
    type: 'alert-rules',
    formats: ['json', 'csv'],
    icon: ExclamationTriangleIcon,
    color: 'bg-red-500',
    sampleUrl: '/templates/alert-rules-sample.json'
  }
];

export default function DataUploadPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'history' | 'templates'>('upload');
  const [selectedTemplate, setSelectedTemplate] = useState<UploadTemplate | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch real upload history
  useEffect(() => {
    fetchUploadHistory();
  }, [refreshKey]);

  const fetchUploadHistory = async () => {
    try {
      const response = await fetch('/api/import/manufacturing-data?limit=20');
      if (response.ok) {
        const data = await response.json();
        const history: UploadHistory[] = data.uploads.map((upload: any) => ({
          id: upload.id,
          fileName: upload.fileName,
          type: upload.importType,
          status: upload.status,
          recordsImported: upload.successfulRecords || 0,
          uploadDate: new Date(upload.createdAt),
          fileSize: formatFileSize(upload.fileSize),
          errors: upload.errors ? JSON.parse(upload.errors) : [],
          successfulRecords: upload.successfulRecords,
          failedRecords: upload.failedRecords,
          processingTime: upload.processingTime
        }));
        setUploadHistory(history);
      }
    } catch (error) {
      console.error('Failed to fetch upload history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleImportComplete = (result: ImportResult) => {
    // Refresh the upload history
    setRefreshKey(prev => prev + 1);
    setIsWizardOpen(false);
  };

  const handleFileUpload = async (file: File, workUnitId: string = 'default') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workUnitId', workUnitId);
    formData.append('importType', file.name.endsWith('.json') ? 'json' : 'csv');
    formData.append('deduplicate', 'true');
    formData.append('validateData', 'true');

    try {
      const response = await fetch('/api/import/manufacturing-data', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      console.log('Upload started:', result);
      
      // Refresh to show new upload
      setRefreshKey(prev => prev + 1);
      
      // Poll for status updates
      if (result.uploadId) {
        pollUploadStatus(result.uploadId);
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const pollUploadStatus = async (uploadId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/import/manufacturing-data?uploadId=${uploadId}`);
        if (response.ok) {
          const data = await response.json();
          const upload = data.upload;
          
          if (upload.status === 'completed' || upload.status === 'failed' || upload.status === 'cancelled') {
            clearInterval(interval);
            setRefreshKey(prev => prev + 1);
          }
        }
      } catch (error) {
        console.error('Status poll error:', error);
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleTemplateSelect = (template: UploadTemplate) => {
    setSelectedTemplate(template);
    setIsWizardOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'completed_with_errors':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <ClockIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'cancelled':
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'completed_with_errors':
        return 'Completed with errors';
      case 'failed':
        return 'Failed';
      case 'processing':
        return 'Processing';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <PageLayout
      title="Data Upload Center"
      description="Import and manage your manufacturing data with industry-standard tools"
    >
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header with Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {uploadHistory.filter(h => h.status === 'completed').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Successful Uploads</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {uploadHistory.reduce((sum, h) => sum + (h.recordsImported || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Records Imported</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {UPLOAD_TEMPLATES.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Data Templates</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {uploadHistory.filter(h => h.status === 'failed').length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Failed Uploads</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {[
                { key: 'upload', label: 'Upload Data', icon: CloudArrowUpIcon },
                { key: 'templates', label: 'Data Templates', icon: DocumentArrowUpIcon },
                { key: 'history', label: 'Upload History', icon: ClockIcon }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Upload Tab */}
            {activeTab === 'upload' && (
              <div className="space-y-8">
                <div className="text-center">
                  <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Upload Your Data
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Choose a template below or upload files directly
                  </p>
                </div>

                {/* Quick Upload for Manufacturing Data */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Manufacturing Data Quick Upload
                  </h4>
                  <ManufacturingDataImporter
                    onImportComplete={(result) => {
                      const importResult: ImportResult = {
                        success: result.success,
                        importType: 'manufacturing-data',
                        recordsImported: result.imported,
                        errors: result.errors,
                        fileName: 'Manufacturing Data',
                        fileSize: 'Unknown'
                      };
                      handleImportComplete(importResult);
                    }}
                  />
                </div>

                {/* General File Uploader */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    General File Upload
                  </h4>
                  <FileUploader
                    onFileUpload={async (result) => {
                      if (result.file) {
                        await handleFileUpload(result.file);
                      }
                    }}
                    onError={(error) => {
                      console.error('Upload error:', error);
                    }}
                    acceptedFormats={['csv', 'excel', 'json']}
                    multiple={false}
                    maxFileSize={100}
                  />
                </div>
              </div>
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
              <div className="space-y-6">
                <div className="text-center">
                  <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    Data Templates
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Choose from pre-configured templates for different data types
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {UPLOAD_TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleTemplateSelect(template)}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`flex-shrink-0 p-3 rounded-lg ${template.color}`}>
                          <template.icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                            {template.name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {template.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-3">
                            {template.formats.map((format) => (
                              <span
                                key={format}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                              >
                                {format.toUpperCase()}
                              </span>
                            ))}
                          </div>
                          {template.sampleUrl && (
                            <button className="mt-3 text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 flex items-center space-x-1">
                              <ArrowDownTrayIcon className="h-4 w-4" />
                              <span>Download Sample</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Upload History
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Track and manage all your data uploads
                    </p>
                  </div>
                  <button className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Clear History
                  </button>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : uploadHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                      No upload history
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Your upload history will appear here
                    </p>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            File
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Records
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="relative px-6 py-3">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {uploadHistory.map((upload) => (
                          <tr key={upload.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <DocumentArrowUpIcon className="h-5 w-5 text-gray-400 mr-3" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {upload.fileName}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {upload.fileSize}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                {upload.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {getStatusIcon(upload.status)}
                                <span className={`ml-2 text-sm ${
                                  upload.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                                  upload.status === 'failed' ? 'text-red-600 dark:text-red-400' :
                                  upload.status === 'processing' ? 'text-blue-600 dark:text-blue-400' :
                                  upload.status === 'completed_with_errors' ? 'text-yellow-600 dark:text-yellow-400' :
                                  'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {getStatusText(upload.status)}
                                </span>
                              </div>
                              {upload.errors && upload.errors.length > 0 && (
                                <div className="mt-1 text-xs text-red-500">
                                  {upload.errors.length} error(s)
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm">
                                {upload.successfulRecords !== undefined ? (
                                  <div>
                                    <span className="text-green-600 dark:text-green-400">
                                      {upload.successfulRecords.toLocaleString()} succeeded
                                    </span>
                                    {upload.failedRecords && upload.failedRecords > 0 && (
                                      <span className="text-red-600 dark:text-red-400 ml-2">
                                        {upload.failedRecords.toLocaleString()} failed
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-900 dark:text-white">
                                    {upload.recordsImported.toLocaleString()}
                                  </span>
                                )}
                                {upload.processingTime && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {(upload.processingTime / 1000).toFixed(1)}s
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(upload.uploadDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3">
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import Wizard Modal */}
      {isWizardOpen && selectedTemplate && (
        <ImportWizard
          isOpen={isWizardOpen}
          onClose={() => {
            setIsWizardOpen(false);
            setSelectedTemplate(null);
          }}
          onComplete={handleImportComplete}
          importType={selectedTemplate.type}
        />
      )}
    </PageLayout>
  );
}