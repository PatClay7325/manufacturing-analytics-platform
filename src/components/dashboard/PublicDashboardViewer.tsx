'use client';

import React, { useState, useEffect } from 'react';
import { 
  Lock, Eye, Calendar, User, AlertCircle, Download, 
  Printer, Share2, Maximize2, Settings, RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import DashboardViewer from './DashboardViewer';
import { TimeRangePicker } from './TimeRangePicker';
import VariableSelector from './VariableSelector';
import { Dashboard, TimeRange } from '@/types/dashboard';

interface PublicDashboardViewerProps {
  shareKey: string;
  className?: string;
}

interface PublicShareData {
  id: string;
  dashboardId: string;
  title: string;
  dashboard?: Dashboard;
  snapshot?: {
    id: string;
    config: any;
    data?: any;
  };
  isActive: boolean;
  expiresAt?: string;
  viewCount: number;
  lastViewedAt?: string;
  theme?: string;
  showTimeRange: boolean;
  showVariables: boolean;
  showRefresh: boolean;
  allowExport: boolean;
  allowPrint: boolean;
  allowEmbed: boolean;
  lockedTimeFrom?: string;
  lockedTimeTo?: string;
  lockedVariables?: Record<string, any>;
  createdAt: string;
  User: {
    name?: string;
    email: string;
  };
}

export function PublicDashboardViewer({
  shareKey,
  className = ''
}: PublicDashboardViewerProps) {
  const [shareData, setShareData] = useState<PublicShareData | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>({
    from: 'now-6h',
    to: 'now'
  });
  const [variables, setVariables] = useState<Record<string, any>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadPublicShare();
  }, [shareKey]);

  useEffect(() => {
    // Apply theme if specified
    if (shareData?.theme) {
      document.documentElement.setAttribute('data-theme', shareData.theme);
    }
    
    return () => {
      document.documentElement.removeAttribute('data-theme');
    };
  }, [shareData?.theme]);

  const loadPublicShare = async (withPassword?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (withPassword) {
        headers['X-Share-Password'] = withPassword;
      }

      const response = await fetch(`/api/public/share/${shareKey}`, {
        method: 'GET',
        headers
      });

      if (response.status === 401) {
        const data = await response.json();
        if (data.requiresPassword) {
          setRequiresPassword(true);
          setIsLoading(false);
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load dashboard');
      }

      const data = await response.json();
      
      // Check if share is still valid
      if (!data.isActive) {
        throw new Error('This share link is no longer active');
      }

      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        throw new Error('This share link has expired');
      }

      setShareData(data);
      
      // Load dashboard configuration
      if (data.snapshot) {
        // Use snapshot data
        setDashboard({
          ...data.snapshot.config,
          id: data.dashboardId,
          title: data.title,
          editable: false
        });
      } else if (data.dashboard) {
        // Use live dashboard
        setDashboard({
          ...data.dashboard,
          editable: false
        });
      }

      // Apply locked time range if specified
      if (data.lockedTimeFrom && data.lockedTimeTo) {
        setTimeRange({
          from: new Date(data.lockedTimeFrom),
          to: new Date(data.lockedTimeTo)
        });
      }

      // Apply locked variables if specified
      if (data.lockedVariables) {
        setVariables(data.lockedVariables);
      }

      // Track view
      trackView();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadPublicShare(password);
  };

  const trackView = async () => {
    try {
      await fetch(`/api/public/share/${shareKey}/view`, {
        method: 'POST'
      });
    } catch (err) {
      console.error('Failed to track view:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Reload dashboard data
    await loadPublicShare();
    setLastRefresh(new Date());
    
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const handleExport = async (format: 'pdf' | 'png' | 'csv') => {
    if (!shareData?.allowExport) return;

    try {
      const response = await fetch(`/api/public/share/${shareKey}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-${shareData.dashboardId}-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const handlePrint = () => {
    if (!shareData?.allowPrint) return;
    window.print();
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData?.title || 'Dashboard',
          url: shareUrl
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      // Fallback to copy URL
      try {
        await navigator.clipboard.writeText(shareUrl);
        // Show toast notification
        alert('Share link copied to clipboard');
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  // Password prompt screen
  if (requiresPassword && !shareData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">Password Required</h2>
            <p className="text-sm text-gray-600 mt-2">
              This dashboard is password protected. Please enter the password to continue.
            </p>
          </div>
          
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            
            <button
              type="submit"
              className="w-full mt-4 px-4 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Error screen
  if (error || !dashboard || !shareData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Dashboard</h2>
          <p className="text-gray-600">{error || 'Dashboard not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Title and Info */}
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-gray-900">{shareData.title}</h1>
              <div className="hidden sm:flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {shareData.User.name || shareData.User.email}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDistanceToNow(new Date(shareData.createdAt), { addSuffix: true })}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {shareData.viewCount} views
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {shareData.showRefresh && (
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                  title="Refresh dashboard"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              )}
              
              {shareData.allowPrint && (
                <button
                  onClick={handlePrint}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  title="Print dashboard"
                >
                  <Printer className="h-4 w-4" />
                </button>
              )}
              
              {shareData.allowExport && (
                <div className="relative group">
                  <button
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                    title="Export dashboard"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  
                  {/* Export dropdown */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="py-1">
                      <button
                        onClick={() => handleExport('pdf')}
                        className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                      >
                        Export as PDF
                      </button>
                      <button
                        onClick={() => handleExport('png')}
                        className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                      >
                        Export as Image
                      </button>
                      <button
                        onClick={() => handleExport('csv')}
                        className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                      >
                        Export Data (CSV)
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleShare}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Share dashboard"
              >
                <Share2 className="h-4 w-4" />
              </button>
              
              <button
                onClick={() => document.documentElement.requestFullscreen()}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Fullscreen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Time Range and Variables */}
        {(shareData.showTimeRange || shareData.showVariables) && (
          <div className="px-4 sm:px-6 lg:px-8 pb-3 border-t border-gray-200">
            <div className="flex items-center gap-4 pt-3">
              {shareData.showTimeRange && !shareData.lockedTimeFrom && (
                <TimeRangePicker
                  value={timeRange}
                  onChange={setTimeRange}
                  className="flex-shrink-0"
                />
              )}
              
              {shareData.showVariables && dashboard.templating?.list && (
                <div className="flex-1 flex gap-2 overflow-x-auto">
                  {dashboard.templating.list
                    .filter(v => !shareData.lockedVariables?.[v.name])
                    .map(variable => (
                      <VariableSelector
                        key={variable.name}
                        variable={variable}
                        value={variables[variable.name]}
                        onChange={(value) => setVariables(prev => ({ ...prev, [variable.name]: value }))}
                      />
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dashboard Content */}
      <div className="p-4 sm:p-6 lg:p-8">
        <DashboardViewer
          dashboard={dashboard}
          isEditing={false}
        />
      </div>

      {/* Footer */}
      <div className="mt-8 pb-8 text-center text-sm text-gray-500">
        {shareData.expiresAt && (
          <p className="mb-2">
            This share link expires {formatDistanceToNow(new Date(shareData.expiresAt), { addSuffix: true })}
          </p>
        )}
        <p>
          Last refreshed {formatDistanceToNow(lastRefresh, { addSuffix: true })}
        </p>
      </div>
    </div>
  );
}

export default PublicDashboardViewer;