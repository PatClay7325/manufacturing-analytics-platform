/**
 * Dashboard Import Page - Grafana-compatible dashboard import
 * /dashboard/import route
 */

'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Link, FileJson, AlertCircle, Check } from 'lucide-react';
import PageLayout from '@/components/layout/PageLayout';
import { cn } from '@/lib/utils';

interface ImportMethod {
  id: 'upload' | 'paste' | 'grafana' | 'url';
  label: string;
  description: string;
  icon: any;
}

const importMethods: ImportMethod[] = [
  {
    id: 'upload',
    label: 'Upload JSON file',
    description: 'Drag and drop or click to upload a dashboard JSON file',
    icon: Upload,
  },
  {
    id: 'paste',
    label: 'Paste JSON',
    description: 'Paste dashboard JSON directly into the editor',
    icon: FileJson,
  },
  {
    id: 'grafana',
    label: 'Import from Grafana.com',
    description: 'Import dashboard using Grafana.com dashboard ID',
    icon: Link,
  },
  {
    id: 'url',
    label: 'Import from URL',
    description: 'Load dashboard JSON from a URL',
    icon: Link,
  },
];

export default function DashboardImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedMethod, setSelectedMethod] = useState<ImportMethod['id']>('upload');
  const [jsonContent, setJsonContent] = useState('');
  const [dashboardId, setDashboardId] = useState('');
  const [dashboardUrl, setDashboardUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [parsedDashboard, setParsedDashboard] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);

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

  const handleFile = async (file: File) => {
    if (file.type !== 'application/json') {
      setValidationError('Please upload a JSON file');
      return;
    }

    try {
      const text = await file.text();
      setJsonContent(text);
      validateDashboard(text);
    } catch (error) {
      setValidationError('Failed to read file');
    }
  };

  const validateDashboard = (json: string) => {
    setIsValidating(true);
    setValidationError(null);
    setParsedDashboard(null);

    try {
      const dashboard = JSON.parse(json);

      // Basic validation
      if (!dashboard.panels || !Array.isArray(dashboard.panels)) {
        throw new Error('Invalid dashboard format: missing panels array');
      }

      if (!dashboard.title) {
        dashboard.title = 'Imported Dashboard';
      }

      // Generate UID if missing
      if (!dashboard.uid) {
        dashboard.uid = generateUid();
      }

      // Set schema version if missing
      if (!dashboard.schemaVersion) {
        dashboard.schemaVersion = 39; // Latest Grafana schema
      }

      setParsedDashboard(dashboard);
      setValidationError(null);
    } catch (error: any) {
      setValidationError(error.message || 'Invalid JSON format');
      setParsedDashboard(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleImportFromGrafana = async () => {
    if (!dashboardId) {
      setValidationError('Please enter a dashboard ID');
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      // In production, this would call Grafana.com API
      // For now, simulate with error
      throw new Error('Grafana.com import not yet implemented');
    } catch (error: any) {
      setValidationError(error.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleImportFromUrl = async () => {
    if (!dashboardUrl) {
      setValidationError('Please enter a URL');
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await fetch(dashboardUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard from URL');
      }

      const json = await response.text();
      setJsonContent(json);
      validateDashboard(json);
    } catch (error: any) {
      setValidationError(error.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleImport = async () => {
    if (!parsedDashboard) return;

    try {
      const response = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dashboard: parsedDashboard,
          overwrite: false,
          folderUid: 'general',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import dashboard');
      }

      const result = await response.json();
      
      // Redirect to the imported dashboard
      router.push(`/d/${result.uid}/${result.slug}`);
    } catch (error: any) {
      setValidationError(error.message);
    }
  };

  const renderImportMethod = () => {
    switch (selectedMethod) {
      case 'upload':
        return (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              Drop dashboard JSON file here
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse
            </p>
          </div>
        );

      case 'paste':
        return (
          <div>
            <textarea
              value={jsonContent}
              onChange={(e) => {
                setJsonContent(e.target.value);
                if (e.target.value) {
                  validateDashboard(e.target.value);
                }
              }}
              placeholder="Paste dashboard JSON here..."
              className="w-full h-64 p-4 font-mono text-sm border rounded-md resize-none"
            />
          </div>
        );

      case 'grafana':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Dashboard ID
              </label>
              <input
                type="text"
                value={dashboardId}
                onChange={(e) => setDashboardId(e.target.value)}
                placeholder="Enter Grafana.com dashboard ID"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <button
              onClick={handleImportFromGrafana}
              disabled={!dashboardId || isValidating}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              Load from Grafana.com
            </button>
          </div>
        );

      case 'url':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Dashboard URL
              </label>
              <input
                type="url"
                value={dashboardUrl}
                onChange={(e) => setDashboardUrl(e.target.value)}
                placeholder="https://example.com/dashboard.json"
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <button
              onClick={handleImportFromUrl}
              disabled={!dashboardUrl || isValidating}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              Load from URL
            </button>
          </div>
        );
    }
  };

  return (
    <PageLayout
      title="Import dashboard"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Import methods */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {importMethods.map((method) => {
            const Icon = method.icon;
            return (
              <button
                key={method.id}
                onClick={() => {
                  setSelectedMethod(method.id);
                  setValidationError(null);
                  setParsedDashboard(null);
                }}
                className={cn(
                  'p-4 border rounded-lg text-left transition-colors',
                  selectedMethod === method.id
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                )}
              >
                <Icon className="h-6 w-6 mb-2" />
                <div className="font-medium">{method.label}</div>
              </button>
            );
          })}
        </div>

        {/* Selected method content */}
        <div className="border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">
            {importMethods.find(m => m.id === selectedMethod)?.label}
          </h2>
          <p className="text-muted-foreground mb-6">
            {importMethods.find(m => m.id === selectedMethod)?.description}
          </p>
          
          {renderImportMethod()}
        </div>

        {/* Validation result */}
        {(validationError || parsedDashboard) && (
          <div className={cn(
            'border rounded-lg p-4',
            validationError ? 'border-destructive bg-destructive/5' : 'border-green-500 bg-green-500/5'
          )}>
            {validationError ? (
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <div className="font-medium text-destructive">Validation failed</div>
                  <div className="text-sm text-muted-foreground mt-1">{validationError}</div>
                </div>
              </div>
            ) : parsedDashboard ? (
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium text-green-600">Valid dashboard</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Ready to import: {parsedDashboard.title}
                    </div>
                  </div>
                </div>
                
                {/* Dashboard preview */}
                <div className="border rounded p-4 bg-background">
                  <h3 className="font-medium mb-2">{parsedDashboard.title}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Panels:</span> {parsedDashboard.panels?.length || 0}
                    </div>
                    <div>
                      <span className="font-medium">Variables:</span> {parsedDashboard.templating?.list?.length || 0}
                    </div>
                    <div>
                      <span className="font-medium">UID:</span> {parsedDashboard.uid}
                    </div>
                    <div>
                      <span className="font-medium">Version:</span> {parsedDashboard.version || 1}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleImport}
                  className="mt-4 w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Import dashboard
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

// Generate unique ID
function generateUid(): string {
  return Math.random().toString(36).substr(2, 9);
}