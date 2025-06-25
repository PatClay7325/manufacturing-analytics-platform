import { useEffect, useState, useCallback } from 'react';
import { Dashboard, TimeRange } from '@/types/dashboard';
import { DashboardState, DashboardStateManager, getDashboardStateManager, clearDashboardStateManager } from '@/core/dashboard/DashboardStateManager';

export interface UseDashboardStateOptions {
  dashboard: Dashboard;
  onRefresh?: () => void;
}

export function useDashboardState({ dashboard, onRefresh }: UseDashboardStateOptions) {
  const [state, setState] = useState<DashboardState>(() => {
    // Initialize state manager only in browser
    if (typeof window !== 'undefined') {
      const manager = getDashboardStateManager(dashboard);
      return manager.getState();
    }
    // Return default state for SSR
    return {
      dashboard,
      timeRange: {
        from: 'now-6h',
        to: 'now',
        raw: { from: 'now-6h', to: 'now' }
      },
      refreshInterval: '30s',
      variables: {},
      isRefreshing: false
    };
  });

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;
    
    // Get or create state manager
    const manager = getDashboardStateManager(dashboard);
    
    // Subscribe to state changes
    const unsubscribe = manager.subscribe((newState) => {
      setState(newState);
    });

    // Initial state
    setState(manager.getState());

    return () => {
      unsubscribe();
    };
  }, [dashboard]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearDashboardStateManager();
    };
  }, []);

  const updateTimeRange = useCallback((timeRange: TimeRange) => {
    const manager = getDashboardStateManager();
    manager.setTimeRange(timeRange);
  }, []);

  const updateRefreshInterval = useCallback((interval: string) => {
    const manager = getDashboardStateManager();
    manager.setRefreshInterval(interval);
  }, []);

  const updateVariable = useCallback((name: string, value: string | string[]) => {
    const manager = getDashboardStateManager();
    manager.updateVariable(name, value);
  }, []);

  const refreshDashboard = useCallback(async () => {
    const manager = getDashboardStateManager();
    await manager.refreshDashboard();
    onRefresh?.();
  }, [onRefresh]);

  const interpolateQuery = useCallback((query: string, scopedVars?: Record<string, any>) => {
    const manager = getDashboardStateManager();
    return manager.interpolateQuery(query, scopedVars);
  }, []);

  return {
    state,
    updateTimeRange,
    updateRefreshInterval,
    updateVariable,
    refreshDashboard,
    interpolateQuery
  };
}