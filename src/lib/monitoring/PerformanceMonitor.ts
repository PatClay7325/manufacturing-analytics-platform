/**
 * Performance Monitoring Service
 * Tracks and reports on system performance metrics
 */

import { logger } from '@/lib/logger';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface PerformanceSnapshot {
  timestamp: Date;
  metrics: {
    chatResponseTime: number;
    databaseQueryTime: number;
    ollamaResponseTime: number;
    agentExecutionTime: number;
    cacheHitRate: number;
    activeConnections: number;
    memoryUsage: number;
    errorRate: number;
  };
  details: {
    slowQueries: Array<{ query: string; duration: number }>;
    slowAgents: Array<{ agent: string; duration: number }>;
    errors: Array<{ type: string; count: number }>;
  };
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private startTimes: Map<string, number> = new Map();
  private counters: Map<string, number> = new Map();
  private errors: Map<string, number> = new Map();
  private maxMetricsPerType = 1000;

  /**
   * Start timing an operation
   */
  startTimer(operationId: string): void {
    this.startTimes.set(operationId, Date.now());
  }

  /**
   * End timing and record the metric
   */
  endTimer(operationId: string, metricName: string, tags?: Record<string, string>): number {
    const startTime = this.startTimes.get(operationId);
    if (!startTime) {
      logger.warn(`No start time found for operation: ${operationId}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.startTimes.delete(operationId);

    this.recordMetric({
      name: metricName,
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      tags
    });

    return duration;
  }

  /**
   * Record a metric
   */
  recordMetric(metric: PerformanceMetric): void {
    const metrics = this.metrics.get(metric.name) || [];
    metrics.push(metric);

    // Keep only recent metrics
    if (metrics.length > this.maxMetricsPerType) {
      metrics.shift();
    }

    this.metrics.set(metric.name, metrics);
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, value: number = 1): void {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }

  /**
   * Record an error
   */
  recordError(errorType: string): void {
    const current = this.errors.get(errorType) || 0;
    this.errors.set(errorType, current + 1);
  }

  /**
   * Get average metric value
   */
  getAverageMetric(metricName: string, windowMs: number = 60000): number {
    const metrics = this.metrics.get(metricName) || [];
    const cutoff = Date.now() - windowMs;
    
    const recentMetrics = metrics.filter(m => m.timestamp.getTime() > cutoff);
    
    if (recentMetrics.length === 0) return 0;
    
    const sum = recentMetrics.reduce((acc, m) => acc + m.value, 0);
    return sum / recentMetrics.length;
  }

  /**
   * Get percentile metric value
   */
  getPercentileMetric(metricName: string, percentile: number, windowMs: number = 60000): number {
    const metrics = this.metrics.get(metricName) || [];
    const cutoff = Date.now() - windowMs;
    
    const recentMetrics = metrics
      .filter(m => m.timestamp.getTime() > cutoff)
      .map(m => m.value)
      .sort((a, b) => a - b);
    
    if (recentMetrics.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * recentMetrics.length) - 1;
    return recentMetrics[index];
  }

  /**
   * Get counter value
   */
  getCounter(name: string): number {
    return this.counters.get(name) || 0;
  }

  /**
   * Get error count
   */
  getErrorCount(errorType?: string): number {
    if (errorType) {
      return this.errors.get(errorType) || 0;
    }
    
    let total = 0;
    this.errors.forEach(count => total += count);
    return total;
  }

  /**
   * Get performance snapshot
   */
  getSnapshot(): PerformanceSnapshot {
    const windowMs = 5 * 60 * 1000; // 5 minutes

    // Calculate metrics
    const chatResponseTime = this.getAverageMetric('chat.response_time', windowMs);
    const databaseQueryTime = this.getAverageMetric('database.query_time', windowMs);
    const ollamaResponseTime = this.getAverageMetric('ollama.response_time', windowMs);
    const agentExecutionTime = this.getAverageMetric('agent.execution_time', windowMs);
    
    const cacheHits = this.getCounter('cache.hits');
    const cacheMisses = this.getCounter('cache.misses');
    const cacheHitRate = cacheHits + cacheMisses > 0 
      ? (cacheHits / (cacheHits + cacheMisses)) * 100 
      : 0;

    // Get slow queries
    const dbMetrics = this.metrics.get('database.query_time') || [];
    const slowQueries = dbMetrics
      .filter(m => m.value > 1000) // Queries over 1 second
      .slice(-10)
      .map(m => ({
        query: m.tags?.query || 'unknown',
        duration: m.value
      }));

    // Get slow agents
    const agentMetrics = this.metrics.get('agent.execution_time') || [];
    const slowAgents = agentMetrics
      .filter(m => m.value > 5000) // Agents over 5 seconds
      .slice(-10)
      .map(m => ({
        agent: m.tags?.agent || 'unknown',
        duration: m.value
      }));

    // Get error summary
    const errorSummary: Array<{ type: string; count: number }> = [];
    this.errors.forEach((count, type) => {
      errorSummary.push({ type, count });
    });

    return {
      timestamp: new Date(),
      metrics: {
        chatResponseTime,
        databaseQueryTime,
        ollamaResponseTime,
        agentExecutionTime,
        cacheHitRate,
        activeConnections: this.getCounter('connections.active'),
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        errorRate: this.getErrorCount() / Math.max(1, this.getCounter('requests.total')) * 100
      },
      details: {
        slowQueries,
        slowAgents,
        errors: errorSummary.sort((a, b) => b.count - a.count).slice(0, 10)
      }
    };
  }

  /**
   * Log performance report
   */
  logReport(): void {
    const snapshot = this.getSnapshot();
    
    logger.info('Performance Report', {
      avgChatResponseTime: `${snapshot.metrics.chatResponseTime.toFixed(0)}ms`,
      avgDatabaseQueryTime: `${snapshot.metrics.databaseQueryTime.toFixed(0)}ms`,
      avgOllamaResponseTime: `${snapshot.metrics.ollamaResponseTime.toFixed(0)}ms`,
      avgAgentExecutionTime: `${snapshot.metrics.agentExecutionTime.toFixed(0)}ms`,
      cacheHitRate: `${snapshot.metrics.cacheHitRate.toFixed(1)}%`,
      errorRate: `${snapshot.metrics.errorRate.toFixed(1)}%`,
      memoryUsage: `${snapshot.metrics.memoryUsage.toFixed(1)}MB`
    });

    if (snapshot.details.slowQueries.length > 0) {
      logger.warn('Slow database queries detected:', snapshot.details.slowQueries);
    }

    if (snapshot.details.slowAgents.length > 0) {
      logger.warn('Slow agent executions detected:', snapshot.details.slowAgents);
    }

    if (snapshot.details.errors.length > 0) {
      logger.error('Error summary:', snapshot.details.errors);
    }
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.startTimes.clear();
    this.counters.clear();
    this.errors.clear();
  }

  /**
   * Get metrics for export
   */
  exportMetrics(): Record<string, any> {
    const exported: Record<string, any> = {
      metrics: {},
      counters: {},
      errors: {}
    };

    this.metrics.forEach((values, name) => {
      exported.metrics[name] = values;
    });

    this.counters.forEach((value, name) => {
      exported.counters[name] = value;
    });

    this.errors.forEach((count, type) => {
      exported.errors[type] = count;
    });

    return exported;
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

// Start periodic reporting
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    performanceMonitor.logReport();
  }, 60000); // Every minute in development
}

export { performanceMonitor };