/**
 * Dashboard Viewer Component
 * 
 * Renders Grafana dashboards within iframe with proper authentication
 * and responsive design for the manufacturing analytics platform.
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  Share2, 
  Settings, 
  Download,
  ExternalLink,
  Clock
} from 'lucide-react';

interface DashboardViewerProps {
  uid: string;
  title?: string;
  height?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  timeRange?: {
    from: string;
    to: string;
  };
  variables?: Record<string, string>;
  theme?: 'light' | 'dark';
  editable?: boolean;
  showControls?: boolean;
  className?: string;
}

export default function DashboardViewer({
  uid,
  title,
  height = 800,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  timeRange = { from: 'now-1h', to: 'now' },
  variables = {},
  theme = 'light',
  editable = false,
  showControls = true,
  className = ''
}: DashboardViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Build Grafana URL with parameters
  const buildGrafanaUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3000';
    const params = new URLSearchParams({
      orgId: '1',
      theme,
      from: timeRange.from,
      to: timeRange.to,
      refresh: autoRefresh ? '30s' : '',
      kiosk: 'tv', // Hide Grafana UI chrome
      ...variables
    });

    return `${baseUrl}/d/${uid}?${params.toString()}`;
  };

  // Handle iframe load
  const handleIframeLoad = () => {
    setLoading(false);
    setError(null);
    setLastRefresh(new Date());
  };

  // Handle iframe error
  const handleIframeError = () => {
    setLoading(false);
    setError('Failed to load dashboard');
  };

  // Refresh dashboard
  const refreshDashboard = () => {
    if (iframeRef.current) {
      setLoading(true);
      iframeRef.current.src = buildGrafanaUrl();
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Share dashboard
  const shareDashboard = () => {
    const shareUrl = `${window.location.origin}/public/dashboards/${uid}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      // Could show a toast notification here
      console.log('Share URL copied to clipboard');
    });
  };

  // Open in Grafana
  const openInGrafana = () => {
    const grafanaUrl = buildGrafanaUrl().replace('kiosk=tv', '');
    window.open(grafanaUrl, '_blank');
  };

  // Setup auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        refreshDashboard();
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval]);

  // Update iframe when parameters change
  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.src = buildGrafanaUrl();
    }
  }, [uid, timeRange, variables, theme]);

  const containerClasses = `
    ${className}
    ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'relative'}
  `;

  return (
    <div className={containerClasses}>
      <Card className="h-full">
        {showControls && (
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-xl font-semibold">
              {title || 'Manufacturing Dashboard'}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="w-4 h-4 mr-1" />
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={refreshDashboard}
                disabled={loading}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={shareDashboard}
                className="flex items-center gap-1"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={openInGrafana}
                className="flex items-center gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Grafana
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="flex items-center gap-1"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
                {isFullscreen ? 'Exit' : 'Fullscreen'}
              </Button>
            </div>
          </CardHeader>
        )}
        
        <CardContent className={showControls ? 'p-6' : 'p-0'}>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {error} - Please check your Grafana connection and dashboard UID.
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshDashboard}
                  className="ml-4"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="relative">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-muted-foreground">Loading dashboard...</span>
                  </div>
                </div>
              )}
              
              <iframe
                ref={iframeRef}
                src={buildGrafanaUrl()}
                width="100%"
                height={isFullscreen ? window.innerHeight - (showControls ? 120 : 0) : height}
                frameBorder="0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                className="rounded-lg"
                title={title || 'Grafana Dashboard'}
                allow="fullscreen"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Pre-configured dashboard viewers for common manufacturing scenarios
export function OEEDashboardViewer(props: Omit<DashboardViewerProps, 'uid'>) {
  return (
    <DashboardViewer
      uid="manufacturing-oee"
      title="OEE Analytics Dashboard"
      {...props}
    />
  );
}

export function ProductionDashboardViewer(props: Omit<DashboardViewerProps, 'uid'>) {
  return (
    <DashboardViewer
      uid="production-overview"
      title="Production Overview Dashboard"
      {...props}
    />
  );
}

export function EquipmentDashboardViewer(props: Omit<DashboardViewerProps, 'uid'>) {
  return (
    <DashboardViewer
      uid="equipment-monitoring"
      title="Equipment Monitoring Dashboard"
      {...props}
    />
  );
}

export function QualityDashboardViewer(props: Omit<DashboardViewerProps, 'uid'>) {
  return (
    <DashboardViewer
      uid="quality-metrics"
      title="Quality Metrics Dashboard"
      {...props}
    />
  );
}