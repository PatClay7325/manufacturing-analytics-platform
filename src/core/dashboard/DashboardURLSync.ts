import { Dashboard, TimeRange } from '@/types/dashboard';
import { Variable } from '../variables/VariableTypes';

interface URLState {
  from?: string;
  to?: string;
  refresh?: string;
  variables?: Record<string, string | string[]>;
  viewPanel?: number;
  editPanel?: number;
  orgId?: number;
  kiosk?: boolean | 'tv';
}

/**
 * Manages URL synchronization for dashboard state
 */
export class DashboardURLSync {
  private static instance: DashboardURLSync;
  private listeners = new Set<(state: URLState) => void>();
  
  private constructor() {
    // Listen for browser back/forward (only in browser)
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        this.notifyListeners();
      });
    }
  }
  
  static getInstance(): DashboardURLSync {
    if (!DashboardURLSync.instance) {
      DashboardURLSync.instance = new DashboardURLSync();
    }
    return DashboardURLSync.instance;
  }
  
  /**
   * Get current URL state
   */
  getUrlState(): URLState {
    if (typeof window === 'undefined') {
      return {}; // Return empty state on server
    }
    
    const params = new URLSearchParams(window.location.search);
    const state: URLState = {};
    
    // Time range
    if (params.has('from')) state.from = params.get('from')!;
    if (params.has('to')) state.to = params.get('to')!;
    
    // Refresh
    if (params.has('refresh')) state.refresh = params.get('refresh')!;
    
    // Panel view/edit
    if (params.has('viewPanel')) state.viewPanel = parseInt(params.get('viewPanel')!);
    if (params.has('editPanel')) state.editPanel = parseInt(params.get('editPanel')!);
    
    // Organization
    if (params.has('orgId')) state.orgId = parseInt(params.get('orgId')!);
    
    // Kiosk mode
    if (params.has('kiosk')) {
      const kiosk = params.get('kiosk');
      state.kiosk = kiosk === 'tv' ? 'tv' : true;
    }
    
    // Variables
    state.variables = {};
    params.forEach((value, key) => {
      if (key.startsWith('var-')) {
        const varName = key.substring(4);
        // Handle multi-value variables
        if (value.includes(',')) {
          state.variables![varName] = value.split(',');
        } else {
          state.variables![varName] = value;
        }
      }
    });
    
    return state;
  }
  
  /**
   * Update URL with new state
   */
  updateUrl(updates: Partial<URLState>, replace = true): void {
    if (typeof window === 'undefined') {
      return; // No URL updates on server
    }
    
    const params = new URLSearchParams(window.location.search);
    
    // Update time range
    if (updates.from !== undefined) {
      if (updates.from) {
        params.set('from', updates.from);
      } else {
        params.delete('from');
      }
    }
    if (updates.to !== undefined) {
      if (updates.to) {
        params.set('to', updates.to);
      } else {
        params.delete('to');
      }
    }
    
    // Update refresh
    if (updates.refresh !== undefined) {
      if (updates.refresh && updates.refresh !== 'off') {
        params.set('refresh', updates.refresh);
      } else {
        params.delete('refresh');
      }
    }
    
    // Update panel view/edit
    if (updates.viewPanel !== undefined) {
      if (updates.viewPanel) {
        params.set('viewPanel', updates.viewPanel.toString());
      } else {
        params.delete('viewPanel');
      }
    }
    if (updates.editPanel !== undefined) {
      if (updates.editPanel) {
        params.set('editPanel', updates.editPanel.toString());
      } else {
        params.delete('editPanel');
      }
    }
    
    // Update variables
    if (updates.variables) {
      // Remove existing variable params
      Array.from(params.keys())
        .filter(key => key.startsWith('var-'))
        .forEach(key => params.delete(key));
      
      // Add new variable params
      Object.entries(updates.variables).forEach(([name, value]) => {
        if (value) {
          const paramValue = Array.isArray(value) ? value.join(',') : value;
          params.set(`var-${name}`, paramValue);
        }
      });
    }
    
    // Update URL
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    if (replace) {
      window.history.replaceState({}, '', newUrl);
    } else {
      window.history.pushState({}, '', newUrl);
    }
    
    this.notifyListeners();
  }
  
  /**
   * Sync time range to URL
   */
  syncTimeRange(timeRange: TimeRange, refresh?: string): void {
    this.updateUrl({
      from: timeRange.raw?.from || timeRange.from.toString(),
      to: timeRange.raw?.to || timeRange.to.toString(),
      refresh
    });
  }
  
  /**
   * Sync variables to URL
   */
  syncVariables(variables: Variable[]): void {
    const varState: Record<string, string | string[]> = {};
    
    variables.forEach(variable => {
      if (variable.skipUrlSync || variable.hide === 'variable') {
        return;
      }
      
      const value = variable.current.value;
      if (value && value !== '' && value !== '$__all') {
        varState[variable.name] = value;
      }
    });
    
    this.updateUrl({ variables: varState });
  }
  
  /**
   * Build URL for sharing
   */
  buildShareUrl(dashboard: Dashboard, options?: {
    shortUrl?: boolean;
    theme?: 'light' | 'dark';
    includeVariables?: boolean;
    from?: string;
    to?: string;
  }): string {
    const params = new URLSearchParams();
    
    // Add current URL params if including variables
    if (options?.includeVariables) {
      const currentParams = new URLSearchParams(window.location.search);
      currentParams.forEach((value, key) => {
        if (key.startsWith('var-') || key === 'from' || key === 'to' || key === 'refresh') {
          params.set(key, value);
        }
      });
    }
    
    // Override time range if specified
    if (options?.from) params.set('from', options.from);
    if (options?.to) params.set('to', options.to);
    
    // Add theme if specified
    if (options?.theme) params.set('theme', options.theme);
    
    const baseUrl = `${window.location.origin}/dashboards/${dashboard.uid}`;
    const queryString = params.toString();
    
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }
  
  /**
   * Subscribe to URL changes
   */
  subscribe(listener: (state: URLState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    const state = this.getUrlState();
    this.listeners.forEach(listener => listener(state));
  }
}

// Export singleton instance
export const dashboardURLSync = DashboardURLSync.getInstance();