'use client';

import React, { useState, useEffect } from 'react';
import { 
  Share2, Link, Mail, Download, Eye, EyeOff, Copy, Check,
  Clock, Users, Globe, Lock, Code, Image, FileText, Settings,
  Calendar, AlertCircle, ExternalLink
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: string;
  dashboardTitle: string;
  currentUrl: string;
  onShare?: (shareConfig: ShareConfig) => void;
  className?: string;
}

interface ShareConfig {
  type: ShareType;
  isPublic: boolean;
  expiresAt?: number;
  allowedUsers?: string[];
  allowedRoles?: string[];
  embedConfig?: EmbedConfig;
  snapshotConfig?: SnapshotConfig;
  linkConfig?: LinkConfig;
}

interface EmbedConfig {
  theme: 'light' | 'dark';
  showTitle: boolean;
  showControls: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  width?: number;
  height?: number;
}

interface SnapshotConfig {
  format: 'png' | 'pdf' | 'json';
  includeData: boolean;
  includeAnnotations: boolean;
  timeRange?: {
    from: string;
    to: string;
  };
}

interface LinkConfig {
  preserveTimeRange: boolean;
  preserveVariables: boolean;
  preserveTheme: boolean;
  allowParameters: boolean;
}

enum ShareType {
  Link = 'link',
  Embed = 'embed',
  Snapshot = 'snapshot',
  Export = 'export',
  Email = 'email'
}

export function ShareModal({
  isOpen,
  onClose,
  dashboardId,
  dashboardTitle,
  currentUrl,
  onShare,
  className = ''
}: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<ShareType>(ShareType.Link);
  const [shareConfig, setShareConfig] = useState<ShareConfig>({
    type: ShareType.Link,
    isPublic: false,
    linkConfig: {
      preserveTimeRange: true,
      preserveVariables: true,
      preserveTheme: false,
      allowParameters: true
    },
    embedConfig: {
      theme: 'light',
      showTitle: true,
      showControls: false,
      autoRefresh: true,
      refreshInterval: 30,
      width: 800,
      height: 600
    },
    snapshotConfig: {
      format: 'png',
      includeData: false,
      includeAnnotations: true
    }
  });
  
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [embedCode, setEmbedCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      generateShareContent();
    }
  }, [isOpen, shareConfig]);

  const generateShareContent = async () => {
    setIsGenerating(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    switch (activeTab) {
      case ShareType.Link:
        generateShareLink();
        break;
      case ShareType.Embed:
        generateEmbedCode();
        break;
      case ShareType.Snapshot:
        generateSnapshotUrl();
        break;
    }
    
    setIsGenerating(false);
  };

  const generateShareLink = () => {
    const url = new URL(currentUrl);
    
    // Add sharing parameters
    url.searchParams.set('shared', 'true');
    url.searchParams.set('dashboard', dashboardId);
    
    if (shareConfig.isPublic) {
      url.searchParams.set('public', 'true');
    }
    
    if (shareConfig.linkConfig?.preserveTimeRange) {
      url.searchParams.set('preserve_time', 'true');
    }
    
    if (shareConfig.linkConfig?.preserveVariables) {
      url.searchParams.set('preserve_vars', 'true');
    }
    
    if (shareConfig.expiresAt) {
      url.searchParams.set('expires', shareConfig.expiresAt.toString());
    }
    
    setGeneratedUrl(url.toString());
  };

  const generateEmbedCode = () => {
    const embedUrl = new URL(currentUrl);
    embedUrl.searchParams.set('embed', 'true');
    embedUrl.searchParams.set('theme', shareConfig.embedConfig?.theme || 'light');
    
    if (!shareConfig.embedConfig?.showTitle) {
      embedUrl.searchParams.set('hide_title', 'true');
    }
    
    if (!shareConfig.embedConfig?.showControls) {
      embedUrl.searchParams.set('hide_controls', 'true');
    }
    
    if (shareConfig.embedConfig?.autoRefresh) {
      embedUrl.searchParams.set('refresh', shareConfig.embedConfig.refreshInterval.toString());
    }
    
    const width = shareConfig.embedConfig?.width || 800;
    const height = shareConfig.embedConfig?.height || 600;
    
    const code = `<iframe
  src="${embedUrl.toString()}"
  width="${width}"
  height="${height}"
  frameborder="0"
  allowfullscreen>
</iframe>`;
    
    setEmbedCode(code);
  };

  const generateSnapshotUrl = () => {
    const snapshotUrl = `/api/dashboards/${dashboardId}/snapshot`;
    const params = new URLSearchParams();
    
    params.set('format', shareConfig.snapshotConfig?.format || 'png');
    params.set('include_data', shareConfig.snapshotConfig?.includeData ? 'true' : 'false');
    params.set('include_annotations', shareConfig.snapshotConfig?.includeAnnotations ? 'true' : 'false');
    
    if (shareConfig.snapshotConfig?.timeRange) {
      params.set('from', shareConfig.snapshotConfig.timeRange.from);
      params.set('to', shareConfig.snapshotConfig.timeRange.to);
    }
    
    setGeneratedUrl(`${window.location.origin}${snapshotUrl}?${params.toString()}`);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleShare = () => {
    onShare?.(shareConfig);
  };

  const formatExpiryOptions = () => [
    { value: '', label: 'Never expires' },
    { value: Date.now() + 60 * 60 * 1000, label: '1 hour' },
    { value: Date.now() + 24 * 60 * 60 * 1000, label: '1 day' },
    { value: Date.now() + 7 * 24 * 60 * 60 * 1000, label: '1 week' },
    { value: Date.now() + 30 * 24 * 60 * 60 * 1000, label: '1 month' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Share Dashboard</h3>
                <p className="text-sm text-gray-500 mt-1">{dashboardTitle}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex">
            {/* Sidebar - Share Options */}
            <div className="w-64 bg-gray-50 border-r border-gray-200">
              <nav className="p-4">
                <div className="space-y-1">
                  {[
                    { type: ShareType.Link, icon: Link, label: 'Share Link' },
                    { type: ShareType.Embed, icon: Code, label: 'Embed Code' },
                    { type: ShareType.Snapshot, icon: Image, label: 'Snapshot' },
                    { type: ShareType.Export, icon: Download, label: 'Export' },
                    { type: ShareType.Email, icon: Mail, label: 'Email' }
                  ].map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      onClick={() => {
                        setActiveTab(type);
                        setShareConfig(prev => ({ ...prev, type }));
                      }}
                      className={`
                        w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
                        ${activeTab === type
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      {label}
                    </button>
                  ))}
                </div>
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6">
              {/* Link Sharing */}
              {activeTab === ShareType.Link && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Link Settings</h4>
                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={shareConfig.isPublic}
                          onChange={(e) => setShareConfig(prev => ({ ...prev, isPublic: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Make this link public</span>
                      </label>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Link expires
                        </label>
                        <select
                          value={shareConfig.expiresAt || ''}
                          onChange={(e) => setShareConfig(prev => ({ 
                            ...prev, 
                            expiresAt: e.target.value ? parseInt(e.target.value) : undefined 
                          }))}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          {formatExpiryOptions().map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={shareConfig.linkConfig?.preserveTimeRange}
                            onChange={(e) => setShareConfig(prev => ({
                              ...prev,
                              linkConfig: { ...prev.linkConfig!, preserveTimeRange: e.target.checked }
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Preserve current time range</span>
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={shareConfig.linkConfig?.preserveVariables}
                            onChange={(e) => setShareConfig(prev => ({
                              ...prev,
                              linkConfig: { ...prev.linkConfig!, preserveVariables: e.target.checked }
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Preserve variable values</span>
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={shareConfig.linkConfig?.preserveTheme}
                            onChange={(e) => setShareConfig(prev => ({
                              ...prev,
                              linkConfig: { ...prev.linkConfig!, preserveTheme: e.target.checked }
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Preserve current theme</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Generated Link */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Share Link</h4>
                    <div className="flex">
                      <input
                        type="text"
                        value={generatedUrl}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(generatedUrl)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Embed Code */}
              {activeTab === ShareType.Embed && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Embed Settings</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Theme
                        </label>
                        <select
                          value={shareConfig.embedConfig?.theme}
                          onChange={(e) => setShareConfig(prev => ({
                            ...prev,
                            embedConfig: { ...prev.embedConfig!, theme: e.target.value as 'light' | 'dark' }
                          }))}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Refresh interval (seconds)
                        </label>
                        <input
                          type="number"
                          value={shareConfig.embedConfig?.refreshInterval}
                          onChange={(e) => setShareConfig(prev => ({
                            ...prev,
                            embedConfig: { ...prev.embedConfig!, refreshInterval: parseInt(e.target.value) }
                          }))}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Width (px)
                        </label>
                        <input
                          type="number"
                          value={shareConfig.embedConfig?.width}
                          onChange={(e) => setShareConfig(prev => ({
                            ...prev,
                            embedConfig: { ...prev.embedConfig!, width: parseInt(e.target.value) }
                          }))}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Height (px)
                        </label>
                        <input
                          type="number"
                          value={shareConfig.embedConfig?.height}
                          onChange={(e) => setShareConfig(prev => ({
                            ...prev,
                            embedConfig: { ...prev.embedConfig!, height: parseInt(e.target.value) }
                          }))}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={shareConfig.embedConfig?.showTitle}
                          onChange={(e) => setShareConfig(prev => ({
                            ...prev,
                            embedConfig: { ...prev.embedConfig!, showTitle: e.target.checked }
                          }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Show dashboard title</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={shareConfig.embedConfig?.showControls}
                          onChange={(e) => setShareConfig(prev => ({
                            ...prev,
                            embedConfig: { ...prev.embedConfig!, showControls: e.target.checked }
                          }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Show dashboard controls</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={shareConfig.embedConfig?.autoRefresh}
                          onChange={(e) => setShareConfig(prev => ({
                            ...prev,
                            embedConfig: { ...prev.embedConfig!, autoRefresh: e.target.checked }
                          }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Auto-refresh data</span>
                      </label>
                    </div>
                  </div>

                  {/* Generated Embed Code */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Embed Code</h4>
                    <div className="relative">
                      <textarea
                        value={embedCode}
                        readOnly
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                      />
                      <button
                        onClick={() => copyToClipboard(embedCode)}
                        className="absolute top-2 right-2 p-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Snapshot */}
              {activeTab === ShareType.Snapshot && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Snapshot Settings</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Format
                        </label>
                        <select
                          value={shareConfig.snapshotConfig?.format}
                          onChange={(e) => setShareConfig(prev => ({
                            ...prev,
                            snapshotConfig: { ...prev.snapshotConfig!, format: e.target.value as 'png' | 'pdf' | 'json' }
                          }))}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="png">PNG Image</option>
                          <option value="pdf">PDF Document</option>
                          <option value="json">JSON Data</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={shareConfig.snapshotConfig?.includeData}
                            onChange={(e) => setShareConfig(prev => ({
                              ...prev,
                              snapshotConfig: { ...prev.snapshotConfig!, includeData: e.target.checked }
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Include raw data</span>
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={shareConfig.snapshotConfig?.includeAnnotations}
                            onChange={(e) => setShareConfig(prev => ({
                              ...prev,
                              snapshotConfig: { ...prev.snapshotConfig!, includeAnnotations: e.target.checked }
                            }))}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Include annotations</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Download Button */}
                  <div>
                    <button
                      onClick={() => window.open(generatedUrl, '_blank')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Snapshot
                    </button>
                  </div>
                </div>
              )}

              {/* Export */}
              {activeTab === ShareType.Export && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Export Options</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <button className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <FileText className="h-8 w-8 text-blue-600 mb-2" />
                        <span className="text-sm font-medium">Export as PDF</span>
                        <span className="text-xs text-gray-500">Full dashboard report</span>
                      </button>

                      <button className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <Image className="h-8 w-8 text-green-600 mb-2" />
                        <span className="text-sm font-medium">Export as PNG</span>
                        <span className="text-xs text-gray-500">High-quality image</span>
                      </button>

                      <button className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <Download className="h-8 w-8 text-purple-600 mb-2" />
                        <span className="text-sm font-medium">Export Data</span>
                        <span className="text-xs text-gray-500">CSV/JSON format</span>
                      </button>

                      <button className="flex flex-col items-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <Code className="h-8 w-8 text-orange-600 mb-2" />
                        <span className="text-sm font-medium">Export Config</span>
                        <span className="text-xs text-gray-500">Dashboard JSON</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Email */}
              {activeTab === ShareType.Email && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Email Settings</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Recipients
                        </label>
                        <textarea
                          placeholder="Enter email addresses separated by commas"
                          rows={3}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Subject
                        </label>
                        <input
                          type="text"
                          defaultValue={`Dashboard: ${dashboardTitle}`}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Message
                        </label>
                        <textarea
                          placeholder="Optional message..."
                          rows={4}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Include dashboard snapshot</span>
                        </label>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Include access link</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
            <div className="flex items-center text-sm text-gray-500">
              <AlertCircle className="h-4 w-4 mr-2" />
              {shareConfig.isPublic 
                ? 'This dashboard will be accessible to anyone with the link'
                : 'Access restricted to authorized users only'
              }
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              {activeTab === ShareType.Link && (
                <button
                  onClick={handleShare}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create Share Link
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}