'use client';

import React, { useState, useEffect } from 'react';
import { MoreVertical, Expand, Share2, Eye, Clock } from 'lucide-react';
import { buildGrafanaUrl, GRAFANA_CONFIG } from '@/config/Analytics.config';

export interface TimeRange {
  from: string;
  to: string;
  label?: string;
}

interface AnalyticsPanelProps {
  title?: string;
  description?: string;
  gridPos?: {
    h?: number;
    w?: number;
    x?: number;
    y?: number;
  };
  children?: React.ReactNode;
  onExpand?: () => void;
  // New props for Analytics embedding
  panelId?: number;
  dashboardUid?: string;
  dashboardName?: string;
  height?: number | string;
  width?: number | string;
  theme?: 'light' | 'dark';
  kiosk?: boolean;
  timeRange?: TimeRange;
  refreshRate?: number;
  showLoading?: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
}

export function AnalyticsPanel({ 
  title, 
  description, 
  gridPos, 
  children,
  onExpand,
  // Analytics embedding props
  panelId,
  dashboardUid = GRAFANA_CONFIG.dashboard.uid,
  dashboardName = GRAFANA_CONFIG.dashboard.name,
  height = '100%',
  width = '100%',
  theme = GRAFANA_CONFIG.theme,
  kiosk = GRAFANA_CONFIG.defaults.kiosk,
  timeRange = { from: 'now-24h', to: 'now' },
  refreshRate,
  showLoading = true,
  onLoad,
  onError
}: AnalyticsPanelProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grafanaAvailable, setGrafanaAvailable] = useState(false);
  const [url, setUrl] = useState<string>('');
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // Calculate grid styles
  const gridStyles = {
    gridColumn: `${gridPos.x + 1} / span ${gridPos.w}`,
    gridRow: `${gridPos.y + 1} / span ${gridPos.h}`,
  };

  // Build Analytics URL if panelId is provided
  useEffect(() => {
    if (!panelId) {
      setIsLoading(false);
      return;
    }

    try {
      // Base URL for Analytics
      let grafanaUrl = GRAFANA_CONFIG.baseUrl;
      
      // Build the single panel URL (d-solo)
      let dashboardUrl = `${grafanaUrl}/d-solo/${dashboardUid}/${dashboardName}?orgId=${GRAFANA_CONFIG.orgId}&theme=${theme}`;
      dashboardUrl += `&panelId=${panelId}`;
      
      // Add time range parameters
      if (timeRange?.from) {
        dashboardUrl += `&from=${timeRange?.from}`;
      }
      
      if (timeRange?.to) {
        dashboardUrl += `&to=${timeRange?.to}`;
      }
      
      // Add kiosk mode if specified
      if (kiosk) {
        dashboardUrl += '&kiosk';
      }
      
      // Add refresh rate if specified
      if (refreshRate) {
        dashboardUrl += `&refresh=${refreshRate}s`;
      }
      
      setUrl(dashboardUrl);
      
      // Check if Analytics is available
      checkGrafanaAvailability(grafanaUrl);
    } catch (err) {
      console.error('Error building Analytics URL:', err);
      const errorMsg = 'Failed to build Analytics URL';
      setError(errorMsg);
      setIsLoading(false);
      if (onError) onError(errorMsg);
    }
  }, [dashboardUid, dashboardName, panelId, theme, kiosk, timeRange, refreshRate]);

  const checkGrafanaAvailability = async (baseUrl: string) => {
    try {
      const response = await fetch(`${baseUrl}/api/health`, { 
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(3000)
      });
      
      if (response?.ok) {
        setGrafanaAvailable(true);
      } else {
        const errorMsg = 'Analytics server responded with an error';
        setError(errorMsg);
        setGrafanaAvailable(false);
        if (onError) onError(errorMsg);
      }
    } catch (err) {
      console.error('Error checking Analytics availability:', err);
      const errorMsg = 'Cannot connect to Analytics server. Please ensure Analytics is running on port 3002.';
      setError(errorMsg);
      setGrafanaAvailable(false);
      if (onError) onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    if (onLoad) onLoad();
    
    // Inject custom styles to hide Analytics loading indicators
    try {
      const iframe = iframeRef?.current;
      if (iframe && iframe?.contentWindow) {
        const iframeDoc = iframe.contentWindow.document;
        const style = iframeDoc.createElement('style');
        if (style) {
          style.innerHTML = `
          .panel-loading, 
          .panel-info-corner--info,
          .dashboard-loading,
          .panel-menu,
          .panel-editor-container,
          .navbar,
          .sidemenu,
          .page-toolbar {
            display: none !important;
          }
          .react-grid-layout {
            margin: 0 !important;
          }
          .panel-container {
            background: transparent !important;
            border: none !important;
          }
        `;
          iframeDoc.head.appendChild(style);
        }
      }
    } catch (e) {
      // Cross-origin restrictions may prevent style injection
      console.debug('Could not inject custom styles into Analytics iframe');
    }
  };

  const handleIframeError = () => {
    const errorMsg = 'Failed to load Analytics Dashboard. Please check your connection.';
    setError(errorMsg);
    setIsLoading(false);
    if (onError) onError(errorMsg);
  };

  return (
    <div 
      className="bg-gray-850 border border-gray-800 rounded-sm flex flex-col"
      style={gridStyles}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-100">{title}</h3>
          {description && (
            <p className="text-xs text-gray-400 mt-0.5">{description}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            className="p-1 hover:bg-gray-800 rounded transition-colors"
            title="View"
          >
            <Eye className="h-3.5 w-3.5 text-gray-400" />
          </button>
          <button
            className="p-1 hover:bg-gray-800 rounded transition-colors"
            title="Share"
          >
            <Share2 className="h-3.5 w-3.5 text-gray-400" />
          </button>
          <button
            className="p-1 hover:bg-gray-800 rounded transition-colors"
            onClick={onExpand}
            title="Expand"
          >
            <Expand className="h-3.5 w-3.5 text-gray-400" />
          </button>
          <div className="relative">
            <button
              className="p-1 hover:bg-gray-800 rounded transition-colors"
              onClick={() => setShowMenu(!showMenu)}
              title="More"
            >
              <MoreVertical className="h-3.5 w-3.5 text-gray-400" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-gray-850 border border-gray-700 rounded shadow-lg z-10">
                <button className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800">
                  Edit
                </button>
                <button className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800">
                  Duplicate
                </button>
                <button className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800">
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 p-3 overflow-auto">
        {panelId && grafanaAvailable && !error ? (
          <div className="relative h-full">
            {showLoading && isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-850 z-10">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <p className="mt-2 text-sm text-gray-400">Loading dashboard...</p>
                </div>
              </div>
            )}
            
            <iframe
              ref={iframeRef}
              src={url}
              width="100%"
              height="100%"
              frameBorder="0"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className={isLoading ? 'invisible' : 'visible'}
              title={`Analytics ${title || dashboardName}`}
              allowFullScreen
            />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm mx-auto p-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-900/20">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h?.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-100">Connection Error</h3>
              <p className="mt-1 text-sm text-gray-400">{error}</p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

// Time range selector component
export function TimeRangeSelector({ 
  onChange,
  defaultValue = 'last24h' 
}: {
  onChange?: (timeRange: TimeRange) => void;
  defaultValue?: string;
}) {
  const [selectedRange, setSelectedRange] = useState('Last 24 hours');
  const [showDropdown, setShowDropdown] = useState(false);

  const timeRanges = [
    { value: 'last5m', label: 'Last 5 minutes', from: 'now-5m', to: 'now' },
    { value: 'last15m', label: 'Last 15 minutes', from: 'now-15m', to: 'now' },
    { value: 'last30m', label: 'Last 30 minutes', from: 'now-30m', to: 'now' },
    { value: 'last1h', label: 'Last 1 hour', from: 'now-1h', to: 'now' },
    { value: 'last3h', label: 'Last 3 hours', from: 'now-3h', to: 'now' },
    { value: 'last6h', label: 'Last 6 hours', from: 'now-6h', to: 'now' },
    { value: 'last12h', label: 'Last 12 hours', from: 'now-12h', to: 'now' },
    { value: 'last24h', label: 'Last 24 hours', from: 'now-24h', to: 'now' },
    { value: 'last2d', label: 'Last 2 days', from: 'now-2d', to: 'now' },
    { value: 'last7d', label: 'Last 7 days', from: 'now-7d', to: 'now' },
    { value: 'last30d', label: 'Last 30 days', from: 'now-30d', to: 'now' },
    { value: 'last90d', label: 'Last 90 days', from: 'now-90d', to: 'now' },
  ];

  // Set initial value
  useEffect(() => {
    const initial = timeRanges?.find(r => r.value === defaultValue);
    if (initial) {
      setSelectedRange(initial?.label);
    }
  }, [defaultValue]);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
      >
        <Clock className="h-4 w-4" />
        <span>{selectedRange}</span>
      </button>
      
      {showDropdown && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded shadow-lg z-20">
          {timeRanges?.map(range => (
            <button
              key={range?.value}
              onClick={() => {
                setSelectedRange(range?.label);
                setShowDropdown(false);
                if (onChange) {
                  onChange({ from: range.from, to: range.to, label: range.label });
                }
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              {range?.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}