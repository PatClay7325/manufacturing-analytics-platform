'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SupersetDashboardProps {
  dashboardId: string;
  title?: string;
  height?: number | string;
  filters?: Record<string, any>;
  className?: string;
}

export function SupersetDashboard({
  dashboardId,
  title,
  height = 600,
  filters,
  className,
}: SupersetDashboardProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function fetchGuestToken() {
      try {
        const response = await fetch('/api/analytics/guest-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dashboardId,
            user: session?.user,
          }),
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
    }

    if (session) {
      fetchGuestToken();
    }
  }, [dashboardId, session]);

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
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {title && (
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
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

export default SupersetDashboard;