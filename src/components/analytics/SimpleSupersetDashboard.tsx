'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SimpleSupersetDashboardProps {
  dashboardId: string;
  title?: string;
  height?: number | string;
  filters?: Record<string, any>;
  className?: string;
}

export function SimpleSupersetDashboard({
  dashboardId,
  title,
  height = 600,
  filters,
  className,
}: SimpleSupersetDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    fetchGuestToken();
  }, [dashboardId]);

  const fetchGuestToken = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/analytics/guest-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dashboardId,
          user: {
            email: 'user@manufacturing.com',
            name: 'Manufacturing User'
          }
        }),
        // Important: Don't send cookies to avoid header size issues
        credentials: 'omit'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch guest token');
      }

      const data = await response.json();
      setGuestToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchGuestToken();
  };

  const toggleFullscreen = () => {
    if (!isFullscreen && iframeRef.current) {
      iframeRef.current.requestFullscreen?.();
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const getDashboardUrl = () => {
    const baseUrl = process.env.NEXT_PUBLIC_SUPERSET_URL || 'http://localhost:8088';
    const params = new URLSearchParams();
    
    // Add guest token
    if (guestToken) {
      params.append('guest_token', guestToken);
    }

    // Add filters
    if (filters) {
      params.append('preselect_filters', JSON.stringify(filters));
    }

    // Embedded mode settings
    params.append('standalone', '2');
    params.append('show_filters', '0');
    params.append('expand_filters', '0');

    return `${baseUrl}/superset/dashboard/${dashboardId}/?${params.toString()}`;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading dashboard...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {error.includes('header') && (
                <div className="mt-2 text-sm">
                  <p>This error often occurs due to large cookies. Try:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Opening in incognito/private mode</li>
                    <li>Clearing cookies for localhost</li>
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={handleRetry} 
            variant="outline" 
            size="sm" 
            className="mt-4"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {title && (
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRetry}
              title="Refresh dashboard"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
      <CardContent className="p-0">
        <iframe
          ref={iframeRef}
          src={getDashboardUrl()}
          width="100%"
          height={height}
          frameBorder="0"
          allowFullScreen
          className="border-0"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </CardContent>
    </Card>
  );
}

export default SimpleSupersetDashboard;