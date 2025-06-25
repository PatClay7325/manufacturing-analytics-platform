/**
 * Performance Monitor Component - Real-time performance tracking and optimization
 * Monitors React performance, cache efficiency, and component render times
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { dataCacheManager } from '@/core/cache/DataCacheManager';
import { queryCache } from '@/core/cache/QueryCache';
import { PanelPreloader } from '@/core/lazy/LazyPanelLoader';

interface PerformanceMetrics {
  render: {
    componentRenders: number;
    totalRenderTime: number;
    averageRenderTime: number;
    slowestRender: number;
  };
  cache: {
    hitRate: number;
    totalHits: number;
    totalMisses: number;
    cacheSize: number;
    entryCount: number;
  };
  memory: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  network: {
    activeRequests: number;
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
  };
  panels: {
    preloaded: string[];
    pending: string[];
    totalPanels: number;
  };
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  resolved: boolean;
}

interface PerformanceMonitorProps {
  updateInterval?: number;
  showAlerts?: boolean;
  showDetails?: boolean;
  onAlert?: (alert: PerformanceAlert) => void;
  thresholds?: {
    slowRenderTime?: number;
    lowCacheHitRate?: number;
    highMemoryUsage?: number;
    highErrorRate?: number;
  };
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  updateInterval = 1000,
  showAlerts = true,
  showDetails = false,
  onAlert,
  thresholds = {
    slowRenderTime: 16, // 16ms (60fps threshold)
    lowCacheHitRate: 0.7, // 70%
    highMemoryUsage: 0.8, // 80%
    highErrorRate: 0.05 // 5%
  }
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    render: {
      componentRenders: 0,
      totalRenderTime: 0,
      averageRenderTime: 0,
      slowestRender: 0
    },
    cache: {
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0,
      cacheSize: 0,
      entryCount: 0
    },
    memory: {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    },
    network: {
      activeRequests: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      errorRate: 0
    },
    panels: {
      preloaded: [],
      pending: [],
      totalPanels: 0
    }
  });

  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);

  // Performance tracking state
  const [renderTimes, setRenderTimes] = useState<number[]>([]);
  const [networkRequests, setNetworkRequests] = useState<Array<{
    timestamp: number;
    responseTime: number;
    success: boolean;
  }>>([]);

  // Collect performance metrics
  const collectMetrics = useCallback(() => {
    // Cache metrics
    const cacheMetrics = dataCacheManager.getMetrics();
    const queryCacheStats = queryCache.getQueryCacheStats();
    
    // Memory metrics
    const memoryInfo = (performance as any).memory || {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0
    };

    // Panel loading metrics
    const panelStats = PanelPreloader.getStats();

    // Network metrics (simplified - would need actual network monitoring)
    const recentRequests = networkRequests.filter(
      req => Date.now() - req.timestamp < 60000 // Last minute
    );
    const successfulRequests = recentRequests.filter(req => req.success);
    const averageResponseTime = recentRequests.length > 0
      ? recentRequests.reduce((sum, req) => sum + req.responseTime, 0) / recentRequests.length
      : 0;

    // Render metrics
    const recentRenders = renderTimes.filter(
      time => Date.now() - time < 60000 // Last minute
    );

    const newMetrics: PerformanceMetrics = {
      render: {
        componentRenders: recentRenders.length,
        totalRenderTime: recentRenders.reduce((sum, time) => sum + time, 0),
        averageRenderTime: recentRenders.length > 0
          ? recentRenders.reduce((sum, time) => sum + time, 0) / recentRenders.length
          : 0,
        slowestRender: recentRenders.length > 0 ? Math.max(...recentRenders) : 0
      },
      cache: {
        hitRate: cacheMetrics.hitRate,
        totalHits: cacheMetrics.hits,
        totalMisses: cacheMetrics.misses,
        cacheSize: cacheMetrics.totalSize,
        entryCount: cacheMetrics.entryCount
      },
      memory: {
        usedJSHeapSize: memoryInfo.usedJSHeapSize,
        totalJSHeapSize: memoryInfo.totalJSHeapSize,
        jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit
      },
      network: {
        activeRequests: 0, // Would need network monitoring
        totalRequests: recentRequests.length,
        averageResponseTime,
        errorRate: recentRequests.length > 0
          ? (recentRequests.length - successfulRequests.length) / recentRequests.length
          : 0
      },
      panels: {
        preloaded: panelStats.preloaded,
        pending: panelStats.pending,
        totalPanels: panelStats.total
      }
    };

    setMetrics(newMetrics);
    checkPerformanceThresholds(newMetrics);
  }, [renderTimes, networkRequests]);

  // Check performance thresholds and generate alerts
  const checkPerformanceThresholds = useCallback((metrics: PerformanceMetrics) => {
    const newAlerts: PerformanceAlert[] = [];

    // Check render performance
    if (metrics.render.averageRenderTime > thresholds.slowRenderTime!) {
      newAlerts.push({
        id: `slow-render-${Date.now()}`,
        type: 'warning',
        message: `Slow rendering detected: ${metrics.render.averageRenderTime.toFixed(2)}ms average`,
        timestamp: Date.now(),
        resolved: false
      });
    }

    // Check cache performance
    if (metrics.cache.hitRate < thresholds.lowCacheHitRate!) {
      newAlerts.push({
        id: `low-cache-${Date.now()}`,
        type: 'warning',
        message: `Low cache hit rate: ${(metrics.cache.hitRate * 100).toFixed(1)}%`,
        timestamp: Date.now(),
        resolved: false
      });
    }

    // Check memory usage
    if (metrics.memory.jsHeapSizeLimit > 0) {
      const memoryUsage = metrics.memory.usedJSHeapSize / metrics.memory.jsHeapSizeLimit;
      if (memoryUsage > thresholds.highMemoryUsage!) {
        newAlerts.push({
          id: `high-memory-${Date.now()}`,
          type: 'error',
          message: `High memory usage: ${(memoryUsage * 100).toFixed(1)}%`,
          timestamp: Date.now(),
          resolved: false
        });
      }
    }

    // Check network error rate
    if (metrics.network.errorRate > thresholds.highErrorRate!) {
      newAlerts.push({
        id: `high-error-rate-${Date.now()}`,
        type: 'error',
        message: `High error rate: ${(metrics.network.errorRate * 100).toFixed(1)}%`,
        timestamp: Date.now(),
        resolved: false
      });
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev, ...newAlerts]);
      newAlerts.forEach(alert => onAlert?.(alert));
    }
  }, [thresholds, onAlert]);

  // Track component render times
  const trackRenderTime = useCallback((renderTime: number) => {
    setRenderTimes(prev => [...prev.slice(-50), renderTime]); // Keep last 50 renders
  }, []);

  // Track network requests
  const trackNetworkRequest = useCallback((responseTime: number, success: boolean) => {
    setNetworkRequests(prev => [...prev.slice(-100), {
      timestamp: Date.now(),
      responseTime,
      success
    }]);
  }, []);

  // Start/stop monitoring
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(collectMetrics, updateInterval);
    return () => clearInterval(interval);
  }, [isMonitoring, updateInterval, collectMetrics]);

  // Performance score calculation
  const performanceScore = useMemo(() => {
    const scores = {
      render: Math.max(0, 100 - (metrics.render.averageRenderTime / thresholds.slowRenderTime!) * 100),
      cache: metrics.cache.hitRate * 100,
      memory: metrics.memory.jsHeapSizeLimit > 0
        ? Math.max(0, 100 - (metrics.memory.usedJSHeapSize / metrics.memory.jsHeapSizeLimit) * 100)
        : 100,
      network: Math.max(0, 100 - (metrics.network.errorRate * 100))
    };

    return Math.round((scores.render + scores.cache + scores.memory + scores.network) / 4);
  }, [metrics, thresholds]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number): string => {
    return `${ms.toFixed(2)}ms`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Performance Monitor</h3>
        <div className="flex items-center space-x-4">
          <div className={`text-2xl font-bold ${getScoreColor(performanceScore)}`}>
            {performanceScore}
          </div>
          <button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={`px-3 py-1 rounded text-sm ${
              isMonitoring 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {isMonitoring ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>

      {/* Performance alerts */}
      {showAlerts && alerts.filter(alert => !alert.resolved).length > 0 && (
        <div className="mb-4 space-y-2">
          {alerts.filter(alert => !alert.resolved).map(alert => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border ${
                alert.type === 'error' 
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : alert.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm">{alert.message}</span>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-600">Render Time</div>
          <div className="text-lg font-semibold">
            {formatTime(metrics.render.averageRenderTime)}
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-600">Cache Hit Rate</div>
          <div className="text-lg font-semibold">
            {(metrics.cache.hitRate * 100).toFixed(1)}%
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-600">Memory Usage</div>
          <div className="text-lg font-semibold">
            {formatBytes(metrics.memory.usedJSHeapSize)}
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded">
          <div className="text-sm text-gray-600">Panels Loaded</div>
          <div className="text-lg font-semibold">
            {metrics.panels.preloaded.length}/{metrics.panels.totalPanels}
          </div>
        </div>
      </div>

      {/* Detailed metrics */}
      {showDetails && (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Rendering Performance</h4>
            <div className="text-sm space-y-1">
              <div>Components rendered: {metrics.render.componentRenders}</div>
              <div>Slowest render: {formatTime(metrics.render.slowestRender)}</div>
              <div>Total render time: {formatTime(metrics.render.totalRenderTime)}</div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Cache Performance</h4>
            <div className="text-sm space-y-1">
              <div>Cache hits: {metrics.cache.totalHits}</div>
              <div>Cache misses: {metrics.cache.totalMisses}</div>
              <div>Cache size: {formatBytes(metrics.cache.cacheSize)}</div>
              <div>Cache entries: {metrics.cache.entryCount}</div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Memory Usage</h4>
            <div className="text-sm space-y-1">
              <div>Used: {formatBytes(metrics.memory.usedJSHeapSize)}</div>
              <div>Total: {formatBytes(metrics.memory.totalJSHeapSize)}</div>
              <div>Limit: {formatBytes(metrics.memory.jsHeapSizeLimit)}</div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Panel Loading</h4>
            <div className="text-sm space-y-1">
              <div>Preloaded: {metrics.panels.preloaded.join(', ') || 'None'}</div>
              <div>Pending: {metrics.panels.pending.join(', ') || 'None'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// HOC for tracking component render times
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return React.memo((props: P) => {
    const renderStart = performance.now();
    
    useEffect(() => {
      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;
      
      if (renderTime > 16) { // Only track renders over 16ms
        console.log(`${componentName} rendered in ${renderTime.toFixed(2)}ms`);
      }
    });

    return <Component {...props} />;
  });
}

export default PerformanceMonitor;