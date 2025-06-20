/**
 * URL Parameters Hook - Handles all Grafana-compatible URL parameters
 * Supports: orgId, from/to, refresh, variables, kiosk, theme, editview
 */

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { parseISO, isValid } from 'date-fns';

export interface UrlParams {
  // Organization
  orgId?: number;
  
  // Time range
  from?: string;
  to?: string;
  
  // Refresh
  refresh?: string;
  
  // Variables (var-*)
  variables: Record<string, string | string[]>;
  
  // Display modes
  kiosk?: 'tv' | '1' | 'full';
  theme?: 'light' | 'dark';
  
  // Edit mode
  editview?: 'settings' | 'variables' | 'annotations' | 'permissions';
  
  // Panel specific
  viewPanel?: string;
  editPanel?: string;
  tab?: string;
  
  // Inspect
  inspect?: string;
  inspectTab?: string;
}

export function useUrlParams() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [params, setParams] = useState<UrlParams>({ variables: {} });

  // Parse URL parameters
  useEffect(() => {
    const newParams: UrlParams = { variables: {} };

    // Organization ID
    const orgId = searchParams.get('orgId');
    if (orgId) {
      newParams.orgId = parseInt(orgId, 10);
    }

    // Time range
    newParams.from = searchParams.get('from') || undefined;
    newParams.to = searchParams.get('to') || undefined;

    // Refresh interval
    newParams.refresh = searchParams.get('refresh') || undefined;

    // Kiosk mode
    const kiosk = searchParams.get('kiosk');
    if (kiosk) {
      newParams.kiosk = kiosk as 'tv' | '1' | 'full';
    }

    // Theme override
    const theme = searchParams.get('theme');
    if (theme === 'light' || theme === 'dark') {
      newParams.theme = theme;
    }

    // Edit view
    const editview = searchParams.get('editview');
    if (editview) {
      newParams.editview = editview as any;
    }

    // Panel specific
    newParams.viewPanel = searchParams.get('viewPanel') || undefined;
    newParams.editPanel = searchParams.get('editPanel') || undefined;
    newParams.tab = searchParams.get('tab') || undefined;
    newParams.inspect = searchParams.get('inspect') || undefined;
    newParams.inspectTab = searchParams.get('inspectTab') || undefined;

    // Template variables (var-*)
    searchParams.forEach((value, key) => {
      if (key.startsWith('var-')) {
        const varName = key.substring(4);
        const existingValue = newParams.variables[varName];
        
        if (existingValue) {
          // Handle multiple values
          if (Array.isArray(existingValue)) {
            newParams.variables[varName] = [...existingValue, value];
          } else {
            newParams.variables[varName] = [existingValue, value];
          }
        } else {
          newParams.variables[varName] = value;
        }
      }
    });

    setParams(newParams);
  }, [searchParams]);

  // Apply kiosk mode
  useEffect(() => {
    if (params.kiosk) {
      document.body.classList.add('kiosk-mode');
      
      switch (params.kiosk) {
        case 'tv':
        case '1':
          document.body.classList.add('kiosk-mode-tv');
          break;
        case 'full':
          document.body.classList.add('kiosk-mode-full');
          break;
      }
    } else {
      document.body.classList.remove('kiosk-mode', 'kiosk-mode-tv', 'kiosk-mode-full');
    }

    return () => {
      document.body.classList.remove('kiosk-mode', 'kiosk-mode-tv', 'kiosk-mode-full');
    };
  }, [params.kiosk]);

  // Apply theme override
  useEffect(() => {
    if (params.theme) {
      const root = document.documentElement;
      
      if (params.theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    }
  }, [params.theme]);

  // Update URL parameter
  const updateParam = useCallback((key: string, value: string | string[] | undefined) => {
    const newSearchParams = new URLSearchParams(searchParams);
    
    if (value === undefined || value === null) {
      newSearchParams.delete(key);
    } else if (Array.isArray(value)) {
      // Remove existing values
      newSearchParams.delete(key);
      // Add all values
      value.forEach(v => newSearchParams.append(key, v));
    } else {
      newSearchParams.set(key, value);
    }

    router.push(`${pathname}?${newSearchParams.toString()}`);
  }, [searchParams, pathname, router]);

  // Update variable
  const updateVariable = useCallback((name: string, value: string | string[] | undefined) => {
    updateParam(`var-${name}`, value);
  }, [updateParam]);

  // Update time range
  const updateTimeRange = useCallback((from?: string, to?: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    
    if (from) {
      newSearchParams.set('from', from);
    } else {
      newSearchParams.delete('from');
    }
    
    if (to) {
      newSearchParams.set('to', to);
    } else {
      newSearchParams.delete('to');
    }

    router.push(`${pathname}?${newSearchParams.toString()}`);
  }, [searchParams, pathname, router]);

  // Get parsed time range
  const getTimeRange = useCallback(() => {
    const now = new Date();
    let from = now;
    let to = now;

    if (params.from) {
      if (params.from.startsWith('now-')) {
        // Relative time
        const duration = parseDuration(params.from.substring(4));
        from = new Date(now.getTime() - duration);
      } else {
        // Absolute time
        const parsed = parseISO(params.from);
        if (isValid(parsed)) {
          from = parsed;
        }
      }
    }

    if (params.to) {
      if (params.to === 'now') {
        to = now;
      } else if (params.to.startsWith('now-')) {
        // Relative time
        const duration = parseDuration(params.to.substring(4));
        to = new Date(now.getTime() - duration);
      } else {
        // Absolute time
        const parsed = parseISO(params.to);
        if (isValid(parsed)) {
          to = parsed;
        }
      }
    }

    return { from, to };
  }, [params.from, params.to]);

  // Get refresh interval in milliseconds
  const getRefreshInterval = useCallback(() => {
    if (!params.refresh) return null;
    return parseDuration(params.refresh);
  }, [params.refresh]);

  return {
    params,
    updateParam,
    updateVariable,
    updateTimeRange,
    getTimeRange,
    getRefreshInterval,
  };
}

// Parse duration string to milliseconds
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhdw])$/);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}