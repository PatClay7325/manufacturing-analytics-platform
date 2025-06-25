'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, Maximize2, Minimize2, RefreshCw, ExternalLink } from 'lucide-react';

interface ManufacturingDashboardProps {
  dashboardId?: string;
  title?: string;
  height?: string | number;
  timeRange?: string;
  refresh?: string;
  variables?: Record<string, string>;
  theme?: 'light' | 'dark';
  kiosk?: boolean;
  className?: string;
}

export function ManufacturingDashboard({
  dashboardId,
  title,
  height = 800,
  timeRange = 'now-6h',
  refresh = '10s',
  variables = {},
  theme = 'light',
  kiosk = true,
  className = ''
}: ManufacturingDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const analyticsUrl = process.env.NEXT_PUBLIC_Analytics_URL || 'http://localhost:3003';
  
  // Build query parameters
  const queryParams = new URLSearchParams({
    orgId: '1',
    from: timeRange,
    to: 'now',
    refresh,
    theme,
    ...(kiosk && { kiosk: 'tv' })
  });
  
  // Add custom variables
  Object.entries(variables).forEach(([key, value]) => {
    queryParams?.append(`var-${key}`, value);
  });
  
  const iframeSrc = `${analyticsUrl}/d/${dashboardId}?${queryParams?.toString()}`;
  const directLink = `${analyticsUrl}/d/${dashboardId}?${queryParams?.toString()}`;
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [dashboardId]);
  
  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  
  const handleRefresh = () => {
    setIsLoading(true);
    setHasError(false);
    // Force iframe reload
    const iframe = document.getElementById(`analyticsPlatform-${dashboardId}`) as HTMLIFrameElement;
    if (iframe) {
        if (iframe) {
          iframe.src = iframe.src;
        }
    }
    setTimeout(() => setIsLoading(false), 1000);
  };
  
  return (
    <div 
      className={`
        relative bg-white rounded-lg shadow-sm border transition-all duration-300
        ${isFullscreen ? 'fixed inset-0 z-50 m-4' : ''}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {title || `Dashboard ${dashboardId}`}
          </h3>
          {isLoading && (
            <span className="text-sm text-gray-500">Loading dashboard...</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh dashboard"
          >
            <RefreshCw className="h-4 w-4 text-gray-600" />
          </button>
          
          <button
            onClick={handleFullscreen}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4 text-gray-600" />
            ) : (
              <Maximize2 className="h-4 w-4 text-gray-600" />
            )}
          </button>
          
          <a
            href={directLink}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Open in Analytics"
          >
            <ExternalLink className="h-4 w-4 text-gray-600" />
          </a>
        </div>
      </div>
      
      {/* Dashboard Content */}
      <div 
        className="relative overflow-hidden"
        style={{ height: isFullscreen ? 'calc(100vh - 80px)' : height }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading Analytics Dashboard...</p>
            </div>
          </div>
        )}
        
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-900 font-semibold mb-2">Failed to load dashboard</p>
              <p className="text-gray-600 text-sm mb-4">
                Please check if Analytics is running on {analyticsUrl}
              </p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
        
        <iframe
          id={`analyticsPlatform-${dashboardId}`}
          src={iframeSrc}
          width="100%"
          height="100%"
          frameBorder="0"
          className={`transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      </div>
    </div>
  );
}

// Preset dashboard configurations
export const ANALYTICS_DASHBOARDS = {
  MANUFACTURING_OEE: {
    id: 'manufacturing-oee-v1',
    title: 'Manufacturing OEE Dashboard',
    description: 'Overall Equipment Effectiveness metrics and analysis'
  },
  EQUIPMENT_HEALTH: {
    id: 'equipment-health-v1', 
    title: 'Equipment Health Monitoring',
    description: 'Real-time equipment status and health indicators'
  },
  PRODUCTION_METRICS: {
    id: 'production-metrics-v1',
    title: 'Production Metrics',
    description: 'Production rates, quality, and performance tracking'
  }
};