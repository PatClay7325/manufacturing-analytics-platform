/**
 * Template Importer Component
 * Handles the process of creating a dashboard from a template with variable configuration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Settings, 
  FolderOpen,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowRight,
  Info
} from 'lucide-react';
import { 
  DashboardTemplate,
  TemplateImporterProps,
  TemplateVariableConfig,
  TemplateInstantiationResult
} from '@/types/template';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FormData {
  dashboardTitle: string;
  targetFolderId?: string;
  variables: Record<string, any>;
}

interface ValidationError {
  field: string;
  message: string;
}

export function TemplateImporter({
  template,
  isOpen,
  onClose,
  onImport,
  targetFolderId
}: TemplateImporterProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    dashboardTitle: template.title,
    targetFolderId,
    variables: {}
  });
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<TemplateInstantiationResult | null>(null);
  const [availableFolders, setAvailableFolders] = useState<Array<{id: string, name: string}>>([]);

  const totalSteps = 3;
  const templateVariables = (template.variables as TemplateVariableConfig[]) || [];

  useEffect(() => {
    if (isOpen) {
      loadFolders();
      initializeVariables();
    }
  }, [isOpen, template]);

  const loadFolders = async () => {
    try {
      const response = await fetch('/api/dashboards/folders');
      if (response.ok) {
        const folders = await response.json();
        setAvailableFolders(folders);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const initializeVariables = () => {
    const initialVariables: Record<string, any> = {};
    
    templateVariables.forEach(variable => {
      if (variable.defaultValue !== undefined) {
        initialVariables[variable.name] = variable.defaultValue;
      } else if (variable.type === 'boolean') {
        initialVariables[variable.name] = false;
      } else if (variable.type === 'number') {
        initialVariables[variable.name] = 0;
      } else {
        initialVariables[variable.name] = '';
      }
    });

    setFormData(prev => ({
      ...prev,
      variables: initialVariables
    }));
  };

  const validateStep = (step: number): boolean => {
    const errors: ValidationError[] = [];

    if (step === 1) {
      // Validate dashboard settings
      if (!formData.dashboardTitle.trim()) {
        errors.push({ field: 'dashboardTitle', message: 'Dashboard title is required' });
      }
    } else if (step === 2) {
      // Validate variables
      templateVariables.forEach(variable => {
        if (variable.required) {
          const value = formData.variables[variable.name];
          if (value === undefined || value === null || value === '') {
            errors.push({ 
              field: `variables.${variable.name}`, 
              message: `${variable.label || variable.name} is required` 
            });
          }
        }

        // Type-specific validation
        if (variable.type === 'number') {
          const value = formData.variables[variable.name];
          if (value !== '' && isNaN(Number(value))) {
            errors.push({ 
              field: `variables.${variable.name}`, 
              message: `${variable.label || variable.name} must be a number` 
            });
          }
        }

        // Custom validation
        if (variable.validation) {
          const value = formData.variables[variable.name];
          
          if (variable.validation.minLength && String(value).length < variable.validation.minLength) {
            errors.push({ 
              field: `variables.${variable.name}`, 
              message: `${variable.label || variable.name} must be at least ${variable.validation.minLength} characters` 
            });
          }

          if (variable.validation.maxLength && String(value).length > variable.validation.maxLength) {
            errors.push({ 
              field: `variables.${variable.name}`, 
              message: `${variable.label || variable.name} must be no more than ${variable.validation.maxLength} characters` 
            });
          }

          if (variable.validation.pattern) {
            const regex = new RegExp(variable.validation.pattern);
            if (!regex.test(String(value))) {
              errors.push({ 
                field: `variables.${variable.name}`, 
                message: `${variable.label || variable.name} format is invalid` 
              });
            }
          }
        }
      });
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        handleImport();
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleVariableChange = (variableName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      variables: {
        ...prev.variables,
        [variableName]: value
      }
    }));

    // Clear validation errors for this field
    setValidationErrors(prev => 
      prev.filter(error => error.field !== `variables.${variableName}`)
    );
  };

  const handleImport = async () => {
    if (!validateStep(2)) return;

    setIsImporting(true);
    setCurrentStep(3);

    try {
      const response = await fetch(`/api/templates/${template.id}/instantiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: template.id,
          dashboardTitle: formData.dashboardTitle,
          targetFolderId: formData.targetFolderId,
          variables: formData.variables,
          userId: 'current-user-id', // Should come from auth context
          sessionId: 'session-id'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create dashboard from template');
      }

      const result: TemplateInstantiationResult = await response.json();
      setImportResult(result);

      // Wait a moment to show success
      setTimeout(() => {
        onImport(result);
      }, 2000);

    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        dashboardId: '',
        dashboardUid: '',
        dashboardUrl: '',
        errors: ['Failed to create dashboard from template']
      });
    } finally {
      setIsImporting(false);
    }
  };

  const renderVariableInput = (variable: TemplateVariableConfig) => {
    const value = formData.variables[variable.name];
    const hasError = validationErrors.some(error => error.field === `variables.${variable.name}`);
    const error = validationErrors.find(error => error.field === `variables.${variable.name}`);

    const baseClasses = `w-full ${hasError ? 'border-red-500' : ''}`;

    switch (variable.inputType || variable.type) {
      case 'select':
        return (
          <Select
            value={value || ''}
            onValueChange={(newValue) => handleVariableChange(variable.name, newValue)}
            className={baseClasses}
          >
            <option value="">Select an option...</option>
            {variable.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        );

      case 'multiselect':
        return (
          <div className={baseClasses}>
            {variable.options?.map(option => (
              <label key={option.value} className="flex items-center gap-2 p-2">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(option.value)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    const newValues = e.target.checked
                      ? [...currentValues, option.value]
                      : currentValues.filter(v => v !== option.value);
                    handleVariableChange(variable.name, newValues);
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'boolean':
      case 'checkbox':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleVariableChange(variable.name, e.target.checked)}
            />
            <span>{variable.label || variable.name}</span>
          </label>
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
            placeholder={variable.placeholder}
            className={baseClasses}
            rows={3}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => handleVariableChange(variable.name, Number(e.target.value))}
            placeholder={variable.placeholder}
            className={baseClasses}
            min={variable.validation?.min}
            max={variable.validation?.max}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
            className={baseClasses}
          />
        );

      case 'datetime':
        return (
          <Input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
            className={baseClasses}
          />
        );

      default:
        return (
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
            placeholder={variable.placeholder}
            className={baseClasses}
          />
        );
    }
  };

  if (!isOpen) return null;

  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Create Dashboard from Template</h2>
            <p className="text-gray-600">{template.name}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-gray-600">
              {currentStep === 1 && 'Dashboard Settings'}
              {currentStep === 2 && 'Configure Variables'}
              {currentStep === 3 && 'Creating Dashboard'}
            </span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Dashboard Settings</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="dashboardTitle">Dashboard Title *</Label>
                    <Input
                      id="dashboardTitle"
                      value={formData.dashboardTitle}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        dashboardTitle: e.target.value 
                      }))}
                      className={validationErrors.some(e => e.field === 'dashboardTitle') ? 'border-red-500' : ''}
                    />
                    {validationErrors.find(e => e.field === 'dashboardTitle') && (
                      <p className="text-red-600 text-sm mt-1">
                        {validationErrors.find(e => e.field === 'dashboardTitle')?.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="targetFolder">Target Folder (Optional)</Label>
                    <Select
                      value={formData.targetFolderId || ''}
                      onValueChange={(value) => setFormData(prev => ({ 
                        ...prev, 
                        targetFolderId: value || undefined 
                      }))}
                    >
                      <option value="">Root Folder</option>
                      {availableFolders.map(folder => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>

              {/* Template Info */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">About this template</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      {template.description || template.summary}
                    </p>
                    
                    {templateVariables.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm text-blue-800">
                          This template has <strong>{templateVariables.length}</strong> configurable variable{templateVariables.length !== 1 ? 's' : ''} that you'll configure in the next step.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Configure Variables</h3>
                
                {templateVariables.length === 0 ? (
                  <Card className="p-6 text-center">
                    <Settings className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-600">This template has no configurable variables.</p>
                    <p className="text-sm text-gray-500 mt-1">Click Next to create the dashboard.</p>
                  </Card>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-6">
                      {templateVariables.map(variable => (
                        <div key={variable.name} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={variable.name}>
                              {variable.label || variable.name}
                              {variable.required && <span className="text-red-500">*</span>}
                            </Label>
                            {variable.type && (
                              <Badge variant="outline" className="text-xs">
                                {variable.type}
                              </Badge>
                            )}
                          </div>
                          
                          {variable.description && (
                            <p className="text-sm text-gray-600">{variable.description}</p>
                          )}
                          
                          {variable.helpText && (
                            <p className="text-xs text-gray-500">{variable.helpText}</p>
                          )}

                          {renderVariableInput(variable)}

                          {validationErrors.find(e => e.field === `variables.${variable.name}`) && (
                            <p className="text-red-600 text-sm">
                              {validationErrors.find(e => e.field === `variables.${variable.name}`)?.message}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">
                  {isImporting ? 'Creating Dashboard...' : 'Dashboard Created!'}
                </h3>
                
                {isImporting ? (
                  <div className="space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                    <p className="text-gray-600">
                      Please wait while we create your dashboard from the template.
                    </p>
                  </div>
                ) : importResult ? (
                  <div className="space-y-4">
                    {importResult.errors && importResult.errors.length > 0 ? (
                      <div>
                        <AlertCircle className="w-8 h-8 mx-auto text-red-600 mb-3" />
                        <p className="text-red-600 font-medium">Creation Failed</p>
                        <div className="mt-2 space-y-1">
                          {importResult.errors.map((error, index) => (
                            <p key={index} className="text-sm text-red-600">{error}</p>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-3" />
                        <p className="text-green-600 font-medium">Dashboard created successfully!</p>
                        
                        <Card className="p-4 mt-4 bg-green-50 border-green-200">
                          <div className="text-left space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Dashboard:</span>
                              <span className="font-medium">{formData.dashboardTitle}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">UID:</span>
                              <code className="text-xs bg-white px-1 rounded">
                                {importResult.dashboardUid}
                              </code>
                            </div>
                          </div>
                        </Card>

                        {importResult.warnings && importResult.warnings.length > 0 && (
                          <Card className="p-4 mt-4 bg-yellow-50 border-yellow-200">
                            <h4 className="font-medium text-yellow-800 mb-2">Warnings:</h4>
                            <div className="space-y-1">
                              {importResult.warnings.map((warning, index) => (
                                <p key={index} className="text-sm text-yellow-700">{warning}</p>
                              ))}
                            </div>
                          </Card>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              {currentStep > 1 && !isImporting && (
                <Button variant="outline" onClick={handlePrevious}>
                  Previous
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              {currentStep < 3 && (
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              )}
              
              {currentStep < totalSteps ? (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : currentStep === 3 && importResult && importResult.errors?.length === 0 && (
                <Button onClick={onClose}>
                  Done
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}