/**
 * Template Preview Component
 * Shows a preview of the template with sample data and configuration details
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Info, 
  Download, 
  Star, 
  Calendar, 
  User,
  Tag,
  Settings,
  Eye,
  Code,
  BarChart3,
  Layers,
  Clock,
  CheckCircle,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { 
  DashboardTemplate,
  TemplatePreviewProps,
  TemplateVariableConfig
} from '@/types/template';
import { Dashboard, Panel } from '@/types/dashboard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export function TemplatePreview({
  template,
  isOpen,
  onClose,
  onImport,
  previewMode = 'static'
}: TemplatePreviewProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && template) {
      loadPreviewData();
    }
  }, [isOpen, template]);

  const loadPreviewData = async () => {
    if (!template.previewConfig) {
      setPreviewData(generateMockData());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load preview data from template configuration
      const data = template.previewConfig.sampleData || generateMockData();
      setPreviewData(data);
    } catch (error) {
      console.error('Failed to load preview data:', error);
      setError('Failed to load preview data');
      setPreviewData(generateMockData());
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockData = () => {
    // Generate sample data based on template type
    const baseData = {
      timestamp: new Date().toISOString(),
      metrics: {},
      alerts: [],
      status: 'running'
    };

    if (template.manufacturingType === 'oee') {
      baseData.metrics = {
        availability: 87.5,
        performance: 92.3,
        quality: 94.8,
        oee: 76.4,
        unitsProduced: 1245,
        targetProduction: 1400
      };
    } else if (template.manufacturingType === 'quality') {
      baseData.metrics = {
        firstPassYield: 94.2,
        defectRate: 2.1,
        reworkRate: 3.7,
        scrapRate: 0.8,
        qualityScore: 94.2
      };
    } else if (template.manufacturingType === 'energy') {
      baseData.metrics = {
        currentPower: 1850,
        dailyConsumption: 28.5,
        energyCost: 142.50,
        efficiency: 89.3
      };
    } else {
      baseData.metrics = {
        value1: Math.random() * 100,
        value2: Math.random() * 1000,
        status: 'normal'
      };
    }

    return baseData;
  };

  const handleImport = () => {
    if (onImport) {
      onImport(template);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderPanelPreview = (panel: Panel) => {
    return (
      <Card key={panel.id} className="p-4 border border-gray-200">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium">{panel.title}</h4>
            <p className="text-sm text-gray-500 capitalize">{panel.type} panel</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {panel.gridPos.w}×{panel.gridPos.h}
          </Badge>
        </div>
        
        {/* Mock visualization based on panel type */}
        <div className="h-32 bg-gray-50 rounded border-2 border-dashed border-gray-200 flex items-center justify-center">
          {panel.type === 'gauge' && (
            <div className="text-center">
              <BarChart3 className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <span className="text-sm text-gray-600">Gauge Chart</span>
            </div>
          )}
          {panel.type === 'stat' && (
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {previewData?.metrics?.[Object.keys(previewData.metrics)[0]] || '87.5'}
              </div>
              <span className="text-sm text-gray-600">Stat Panel</span>
            </div>
          )}
          {panel.type === 'timeseries' && (
            <div className="text-center">
              <svg className="w-16 h-8 text-blue-500 mb-2" viewBox="0 0 64 32">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  points="0,24 8,20 16,12 24,16 32,8 40,14 48,6 56,10 64,4"
                />
              </svg>
              <span className="text-sm text-gray-600">Time Series</span>
            </div>
          )}
          {!['gauge', 'stat', 'timeseries'].includes(panel.type) && (
            <div className="text-center">
              <Layers className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <span className="text-sm text-gray-600">{panel.type}</span>
            </div>
          )}
        </div>

        {/* Panel details */}
        <div className="mt-3 text-xs text-gray-500">
          <div>Position: ({panel.gridPos.x}, {panel.gridPos.y})</div>
          <div>Size: {panel.gridPos.w}×{panel.gridPos.h}</div>
          <div>Targets: {(panel.targets || []).length}</div>
        </div>
      </Card>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              {template.thumbnail ? (
                <img 
                  src={template.thumbnail} 
                  alt={template.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <BarChart3 className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{template.name}</h2>
              <p className="text-gray-600">Template Preview</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleImport}>
              <Play className="w-4 h-4 mr-2" />
              Use Template
            </Button>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="mx-6 mt-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="panels">Panels</TabsTrigger>
              <TabsTrigger value="variables">Variables</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              {/* Overview Tab */}
              <TabsContent value="overview" className="h-full">
                <ScrollArea className="h-full px-6 pb-6">
                  <div className="space-y-6">
                    {/* Template Info */}
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Template Information</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-2">Details</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Author:</span>
                              <span>{template.authorName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Version:</span>
                              <span>{template.version}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Created:</span>
                              <span>{formatDate(template.createdAt)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Downloads:</span>
                              <span>{template.downloadCount}</span>
                            </div>
                            {template.rating && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Rating:</span>
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                  <span>{template.rating.toFixed(1)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">Classification</h4>
                          <div className="space-y-3">
                            {template.category && (
                              <div>
                                <span className="text-sm text-gray-600">Category:</span>
                                <Badge variant="outline" className="ml-2">
                                  {template.category.displayName}
                                </Badge>
                              </div>
                            )}
                            
                            {template.manufacturingType && (
                              <div>
                                <span className="text-sm text-gray-600">Type:</span>
                                <Badge variant="secondary" className="ml-2 capitalize">
                                  {template.manufacturingType}
                                </Badge>
                              </div>
                            )}

                            {template.tags && template.tags.length > 0 && (
                              <div>
                                <span className="text-sm text-gray-600 block mb-1">Tags:</span>
                                <div className="flex flex-wrap gap-1">
                                  {template.tags.map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {template.description && (
                        <div className="mt-6">
                          <h4 className="font-medium mb-2">Description</h4>
                          <p className="text-gray-700">{template.description}</p>
                        </div>
                      )}

                      {/* Links */}
                      {(template.documentationUrl || template.supportUrl || template.sourceUrl) && (
                        <div className="mt-6">
                          <h4 className="font-medium mb-2">Links</h4>
                          <div className="flex gap-2">
                            {template.documentationUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={template.documentationUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  Documentation
                                </a>
                              </Button>
                            )}
                            {template.supportUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={template.supportUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  Support
                                </a>
                              </Button>
                            )}
                            {template.sourceUrl && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={template.sourceUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  Source
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </Card>

                    {/* Requirements and Compatibility */}
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold mb-4">Requirements & Compatibility</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {template.dependencies && template.dependencies.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-orange-500" />
                              Dependencies
                            </h4>
                            <div className="space-y-1">
                              {template.dependencies.map(dep => (
                                <div key={dep} className="text-sm text-gray-600">
                                  • {dep}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {template.compatibleWith && template.compatibleWith.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              Compatible Versions
                            </h4>
                            <div className="space-y-1">
                              {template.compatibleWith.map(version => (
                                <div key={version} className="text-sm text-gray-600">
                                  • {version}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {template.isoStandards && template.isoStandards.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">ISO Standards</h4>
                          <div className="flex flex-wrap gap-2">
                            {template.isoStandards.map(standard => (
                              <Badge key={standard} variant="outline">
                                {standard}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>

                    {/* Screenshots */}
                    {template.screenshots && template.screenshots.length > 0 && (
                      <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Screenshots</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {template.screenshots.map((screenshot, index) => (
                            <img
                              key={index}
                              src={screenshot}
                              alt={`Screenshot ${index + 1}`}
                              className="w-full h-48 object-cover rounded-lg border"
                            />
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Panels Tab */}
              <TabsContent value="panels" className="h-full">
                <ScrollArea className="h-full px-6 pb-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Dashboard Panels</h3>
                      <Badge variant="outline">
                        {(template.config as Dashboard).panels?.length || 0} panels
                      </Badge>
                    </div>

                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {((template.config as Dashboard).panels || []).map(panel => 
                          renderPanelPreview(panel)
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Variables Tab */}
              <TabsContent value="variables" className="h-full">
                <ScrollArea className="h-full px-6 pb-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Template Variables</h3>

                    {template.variables && template.variables.length > 0 ? (
                      <div className="space-y-4">
                        {(template.variables as TemplateVariableConfig[]).map((variable, index) => (
                          <Card key={index} className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-medium">{variable.label || variable.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {variable.type}
                              </Badge>
                            </div>
                            
                            {variable.description && (
                              <p className="text-sm text-gray-600 mb-3">{variable.description}</p>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Name:</span>
                                <code className="ml-2 bg-gray-100 px-1 rounded">{variable.name}</code>
                              </div>
                              
                              {variable.defaultValue !== undefined && (
                                <div>
                                  <span className="text-gray-600">Default:</span>
                                  <span className="ml-2">{String(variable.defaultValue)}</span>
                                </div>
                              )}

                              {variable.required && (
                                <div>
                                  <span className="text-red-600">Required</span>
                                </div>
                              )}
                            </div>

                            {variable.options && variable.options.length > 0 && (
                              <div className="mt-3">
                                <span className="text-sm text-gray-600">Options:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {variable.options.slice(0, 5).map((option, optIndex) => (
                                    <Badge key={optIndex} variant="secondary" className="text-xs">
                                      {option.label}
                                    </Badge>
                                  ))}
                                  {variable.options.length > 5 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{variable.options.length - 5} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Settings className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p>No configurable variables in this template</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Configuration Tab */}
              <TabsContent value="config" className="h-full">
                <ScrollArea className="h-full px-6 pb-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Dashboard Configuration</h3>
                    
                    <Card className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">JSON Configuration</h4>
                        <Button variant="outline" size="sm">
                          <Code className="w-4 h-4 mr-2" />
                          Copy JSON
                        </Button>
                      </div>
                      
                      <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-auto max-h-96">
                        {JSON.stringify(template.config, null, 2)}
                      </pre>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="border-t p-6 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Last updated {formatDate(template.lastUpdatedAt)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={handleImport}>
                <Play className="w-4 h-4 mr-2" />
                Use This Template
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}