/**
 * Optimized Data Hooks - React memoization and performance optimization hooks
 * Implements useMemo, useCallback, and custom optimization strategies
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { queryCache, QueryCacheKey } from '@/core/cache/QueryCache';
import { dataCacheManager } from '@/core/cache/DataCacheManager';

// Debouncing hook for expensive operations
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Throttling hook for high-frequency updates
export function useThrottle<T>(value: T, interval: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    if (Date.now() >= lastExecuted.current + interval) {
      lastExecuted.current = Date.now();
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, interval);

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

// Optimized data fetching hook with caching
interface UseOptimizedDataOptions {
  enabled?: boolean;
  refreshInterval?: number;
  cacheKey?: string;
  cacheTTL?: number;
  retryCount?: number;
  retryDelay?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useOptimizedData<T>(
  fetcher: () => Promise<T>,
  dependencies: any[],
  options: UseOptimizedDataOptions = {}
) {
  const {
    enabled = true,
    refreshInterval,
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    retryCount = 3,
    retryDelay = 1000,
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const retryAttempts = useRef<number>(0);
  const refreshTimer = useRef<NodeJS.Timeout>();

  // Memoized fetcher function
  const memoizedFetcher = useCallback(async (): Promise<T> => {
    if (cacheKey) {
      return dataCacheManager.get(cacheKey, fetcher, { ttl: cacheTTL }) as Promise<T>;
    }
    return fetcher();
  }, [fetcher, cacheKey, cacheTTL]);

  // Memoized fetch function with retry logic
  const fetchData = useCallback(async (isRetry = false): Promise<void> => {
    if (!enabled) return;

    try {
      setLoading(true);
      setError(null);

      const result = await memoizedFetcher();
      
      setData(result);
      setLastFetch(Date.now());
      retryAttempts.current = 0;
      
      onSuccess?.(result);
    } catch (err) {
      const error = err as Error;
      console.error('Data fetch error:', error);
      
      // Retry logic
      if (retryAttempts.current < retryCount && !isRetry) {
        retryAttempts.current++;
        setTimeout(() => {
          fetchData(true);
        }, retryDelay * retryAttempts.current);
      } else {
        setError(error);
        onError?.(error);
      }
    } finally {
      setLoading(false);
    }
  }, [enabled, memoizedFetcher, retryCount, retryDelay, onSuccess, onError]);

  // Effect to fetch data when dependencies change
  useEffect(() => {
    if (enabled) {
      fetchData();
    }
  }, [enabled, ...dependencies]);

  // Effect for refresh interval
  useEffect(() => {
    if (refreshInterval && enabled) {
      refreshTimer.current = setInterval(() => {
        fetchData();
      }, refreshInterval);

      return () => {
        if (refreshTimer.current) {
          clearInterval(refreshTimer.current);
        }
      };
    }
  }, [refreshInterval, enabled, fetchData]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Clear cache function
  const clearCache = useCallback(() => {
    if (cacheKey) {
      dataCacheManager.delete(cacheKey);
    }
  }, [cacheKey]);

  return {
    data,
    loading,
    error,
    lastFetch,
    refresh,
    clearCache,
    retryAttempts: retryAttempts.current
  };
}

// Optimized query hook with advanced caching
export function useOptimizedQuery<T>(
  queryKey: QueryCacheKey,
  queryFn: () => Promise<T[]>,
  options: {
    enabled?: boolean;
    refreshInterval?: number;
    staleTime?: number;
    retryOnMount?: boolean;
  } = {}
) {
  const {
    enabled = true,
    refreshInterval,
    staleTime = 5 * 60 * 1000,
    retryOnMount = true
  } = options;

  const [result, setResult] = useState<{
    data: T[] | null;
    loading: boolean;
    error: Error | null;
    fromCache: boolean;
    lastUpdated: number;
  }>({
    data: null,
    loading: false,
    error: null,
    fromCache: false,
    lastUpdated: 0
  });

  // Memoized query execution
  const executeQuery = useCallback(async () => {
    if (!enabled) return;

    setResult(prev => ({ ...prev, loading: true, error: null }));

    try {
      const cached = await queryCache.executeQuery(queryKey, queryFn);
      
      setResult({
        data: cached.data,
        loading: false,
        error: null,
        fromCache: cached.metadata.fromCache,
        lastUpdated: cached.metadata.executedAt
      });
    } catch (error) {
      setResult(prev => ({
        ...prev,
        loading: false,
        error: error as Error
      }));
    }
  }, [enabled, queryKey, queryFn]);

  // Dependencies array for query key
  const queryDeps = useMemo(() => [
    queryKey.datasourceId,
    queryKey.query,
    queryKey.timeRange.from,
    queryKey.timeRange.to,
    JSON.stringify(queryKey.variables || {}),
    queryKey.maxDataPoints,
    queryKey.interval
  ], [queryKey]);

  // Execute query when dependencies change
  useEffect(() => {
    executeQuery();
  }, queryDeps);

  // Refresh interval
  useEffect(() => {
    if (refreshInterval && enabled) {
      const interval = setInterval(executeQuery, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, enabled, executeQuery]);

  // Manual refresh
  const refresh = useCallback(() => {
    executeQuery();
  }, [executeQuery]);

  // Check if data is stale
  const isStale = useMemo(() => {
    if (!result.lastUpdated) return true;
    return Date.now() - result.lastUpdated > staleTime;
  }, [result.lastUpdated, staleTime]);

  return {
    ...result,
    refresh,
    isStale,
    queryKey
  };
}

// Memoized data processing hook
export function useMemoizedProcessing<T, R>(
  data: T | null,
  processor: (data: T) => R,
  dependencies: any[] = []
): R | null {
  return useMemo(() => {
    if (!data) return null;
    return processor(data);
  }, [data, ...dependencies]);
}

// Optimized state management for large datasets
export function useOptimizedState<T>(
  initialValue: T,
  options: {
    throttleUpdates?: number;
    enableHistory?: boolean;
    maxHistorySize?: number;
  } = {}
) {
  const {
    throttleUpdates = 0,
    enableHistory = false,
    maxHistorySize = 10
  } = options;

  const [state, setState] = useState<T>(initialValue);
  const [history, setHistory] = useState<T[]>([]);
  const lastUpdate = useRef<number>(0);
  const pendingUpdate = useRef<T | null>(null);

  // Throttled setState
  const setOptimizedState = useCallback((newState: T | ((prev: T) => T)) => {
    const now = Date.now();
    const finalState = typeof newState === 'function' 
      ? (newState as (prev: T) => T)(state)
      : newState;

    if (throttleUpdates > 0) {
      pendingUpdate.current = finalState;
      
      if (now - lastUpdate.current >= throttleUpdates) {
        setState(finalState);
        lastUpdate.current = now;
        
        if (enableHistory) {
          setHistory(prev => {
            const newHistory = [...prev, finalState];
            return newHistory.length > maxHistorySize 
              ? newHistory.slice(-maxHistorySize)
              : newHistory;
          });
        }
      } else {
        setTimeout(() => {
          if (pendingUpdate.current) {
            setState(pendingUpdate.current);
            lastUpdate.current = Date.now();
            pendingUpdate.current = null;
          }
        }, throttleUpdates - (now - lastUpdate.current));
      }
    } else {
      setState(finalState);
      
      if (enableHistory) {
        setHistory(prev => {
          const newHistory = [...prev, finalState];
          return newHistory.length > maxHistorySize 
            ? newHistory.slice(-maxHistorySize)
            : newHistory;
        });
      }
    }
  }, [state, throttleUpdates, enableHistory, maxHistorySize]);

  // Undo function (if history is enabled)
  const undo = useCallback(() => {
    if (history.length > 1) {
      const previousState = history[history.length - 2];
      setState(previousState);
      setHistory(prev => prev.slice(0, -1));
    }
  }, [history]);

  return {
    state,
    setState: setOptimizedState,
    history: enableHistory ? history : undefined,
    undo: enableHistory ? undo : undefined,
    canUndo: enableHistory ? history.length > 1 : false
  };
}

export default {
  useDebounce,
  useThrottle,
  useOptimizedData,
  useOptimizedQuery,
  useMemoizedProcessing,
  useOptimizedState
};