'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface GrafanaEmbedProps {
  dashboardUid?: string;
  dashboardUrl?: string;
  panelId?: number;
  timeRange?: {
    from: string;
    to: string;
  };
  variables?: Record<string, string | string[]>;
  theme?: 'light' | 'dark';
  refresh?: string;
  height?: number | string;
  width?: number | string;
  className?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export const GrafanaEmbed: React.FC<GrafanaEmbedProps> = ({
  dashboardUid,
  dashboardUrl,
  panelId,
  timeRange = { from: 'now-6h', to: 'now' },
  variables = {},
  theme = 'dark',
  refresh,
  height = 600,
  width = '100%',
  className = '',
  onLoad,
  onError,
}) => {
  const { user } = useAuth();
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!dashboardUid && !dashboardUrl) {
      setError('Either dashboardUid or dashboardUrl must be provided');
      return;
    }

    try {
      const params = new URLSearchParams({
        orgId: process.env.NEXT_PUBLIC_GRAFANA_ORG_ID || '1',
        from: timeRange.from,
        to: timeRange.to,
        theme,
        kiosk: 'tv', // Removes UI chrome for embedded view
      });

      // Add variables to query params
      Object.entries(variables).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(`var-${key}`, v));
        } else {
          params.append(`var-${key}`, value);
        }
      });

      // Add refresh interval if specified
      if (refresh) {
        params.append('refresh', refresh);
      }

      // Build the URL
      const baseUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || '/grafana';
      let path: string;

      if (dashboardUrl) {
        // Use custom dashboard URL
        path = dashboardUrl;
      } else if (panelId) {
        // Single panel view
        path = `d-solo/${dashboardUid}`;
        params.append('panelId', panelId.toString());
      } else {
        // Full dashboard view
        path = `d/${dashboardUid}`;
      }

      setIframeUrl(`${baseUrl}/${path}?${params.toString()}`);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to construct Grafana URL';
      setError(errorMessage);
      onError?.(new Error(errorMessage));
    }
  }, [dashboardUid, dashboardUrl, panelId, timeRange, variables, theme, refresh, onError]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleIframeError = () => {
    setIsLoading(false);
    const errorMessage = 'Failed to load Grafana dashboard';
    setError(errorMessage);
    onError?.(new Error(errorMessage));
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 border border-gray-700 rounded-lg ${className}`} style={{ height, width }}>
        <div className="text-center p-6">
          <p className="text-red-500 mb-2">Error loading dashboard</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${className}`} style={{ height, width }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="mt-2 text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      )}
      
      {iframeUrl && (
        <iframe
          ref={iframeRef}
          src={iframeUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          className="border-0"
          title={`Grafana Dashboard ${dashboardUid || 'Custom'}`}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      )}
    </div>
  );
};

// Panel-specific embed component for convenience
export const GrafanaPanelEmbed: React.FC<Omit<GrafanaEmbedProps, 'panelId'> & { panelId: number }> = (props) => {
  return <GrafanaEmbed {...props} />;
};

// Dashboard grid component for multiple panels
interface GrafanaDashboardGridProps {
  dashboardUid: string;
  panels: Array<{
    id: number;
    gridPos?: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
  }>;
  timeRange?: {
    from: string;
    to: string;
  };
  variables?: Record<string, string | string[]>;
  theme?: 'light' | 'dark';
  refresh?: string;
}

export const GrafanaDashboardGrid: React.FC<GrafanaDashboardGridProps> = ({
  dashboardUid,
  panels,
  timeRange,
  variables,
  theme,
  refresh,
}) => {
  return (
    <div className="grid grid-cols-12 gap-4 auto-rows-[200px]">
      {panels.map((panel) => {
        const gridPos = panel.gridPos || { x: 0, y: 0, w: 6, h: 2 };
        const style = {
          gridColumn: `span ${gridPos.w}`,
          gridRow: `span ${gridPos.h}`,
        };

        return (
          <div key={panel.id} style={style}>
            <GrafanaPanelEmbed
              dashboardUid={dashboardUid}
              panelId={panel.id}
              timeRange={timeRange}
              variables={variables}
              theme={theme}
              refresh={refresh}
              height="100%"
              width="100%"
            />
          </div>
        );
      })}
    </div>
  );
};

export default GrafanaEmbed;
