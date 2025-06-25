/**
 * Application Performance Monitoring (APM) Integration
 * Distributed tracing, performance monitoring, and memory leak detection
 */

import { EventEmitter } from 'events';
import { performance, PerformanceObserver } from 'perf_hooks';
import { logger } from '@/lib/logger';
import { Histogram, Counter, Gauge, register } from 'prom-client';

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  duration?: number;
  tags: Record<string, any>;
  logs: Array<{ timestamp: number; message: string; level: string }>;
  status: 'ok' | 'error' | 'timeout';
}

export interface PerformanceMetrics {
  requestDuration: number;
  memoryUsage: NodeJS.MemoryUsage;
  eventLoopLag: number;
  activeHandles: number;
  cpuUsage: NodeJS.CpuUsage;
  timestamp: Date;
}

export interface MemoryLeakDetection {
  suspiciousGrowth: boolean;
  heapGrowthRate: number; // MB per minute
  gcEfficiency: number; // percentage
  recommendations: string[];
}

// APM metrics
const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5, 10],
});

const memoryLeakIndicator = new Gauge({
  name: 'memory_leak_indicator',
  help: 'Memory leak detection indicator (0-1)',
});

const eventLoopLag = new Histogram({
  name: 'nodejs_eventloop_lag_seconds',
  help: 'Event loop lag in seconds',
  buckets: [0.001, 0.01, 0.1, 1, 10],
});

const activeTraces = new Gauge({
  name: 'active_traces_count',
  help: 'Number of active traces',
});

const spanDuration = new Histogram({
  name: 'span_duration_seconds',
  help: 'Duration of spans in seconds',
  labelNames: ['operation', 'status'],
  buckets: [0.001, 0.01, 0.1, 1, 5],
});

register.registerMetric(requestDuration);
register.registerMetric(memoryLeakIndicator);
register.registerMetric(eventLoopLag);
register.registerMetric(activeTraces);
register.registerMetric(spanDuration);

export class APMIntegration extends EventEmitter {
  private static instance: APMIntegration;
  private traces = new Map<string, TraceSpan>();
  private performanceHistory: PerformanceMetrics[] = [];
  private maxHistorySize = 1000;
  private eventLoopObserver?: PerformanceObserver;
  private memoryMonitorInterval?: NodeJS.Timeout;
  private gcStats: Array<{ timestamp: number; used: number; total: number }> = [];
  private isMonitoring = false;

  constructor() {
    super();
    this.setupPerformanceObservers();
  }

  static getInstance(): APMIntegration {
    if (!APMIntegration.instance) {
      APMIntegration.instance = new APMIntegration();
    }
    return APMIntegration.instance;
  }

  /**
   * Start a new trace span
   */
  startSpan(
    operationName: string,
    traceId?: string,
    parentSpanId?: string,
    tags: Record<string, any> = {}
  ): TraceSpan {
    const span: TraceSpan = {
      traceId: traceId || this.generateId(),
      spanId: this.generateId(),
      parentSpanId,
      operationName,
      startTime: performance.now(),
      tags: {
        ...tags,
        service: 'manufacturing-analytics',
        version: process.env.npm_package_version || '1.0.0',
      },
      logs: [],
      status: 'ok',
    };

    this.traces.set(span.spanId, span);
    activeTraces.set(this.traces.size);

    logger.debug({
      traceId: span.traceId,
      spanId: span.spanId,
      operation: operationName,
    }, 'Span started');

    return span;
  }

  /**
   * Finish a trace span
   */
  finishSpan(spanId: string, status: 'ok' | 'error' | 'timeout' = 'ok', error?: Error): void {
    const span = this.traces.get(spanId);
    if (!span) {
      logger.warn({ spanId }, 'Attempted to finish non-existent span');
      return;
    }

    span.duration = performance.now() - span.startTime;
    span.status = status;

    if (error) {
      span.logs.push({
        timestamp: performance.now(),
        message: error.message,
        level: 'error',
      });
      span.tags.error = true;
      span.tags.errorMessage = error.message;
    }

    // Record metrics
    spanDuration.observe(
      { operation: span.operationName, status },
      span.duration / 1000
    );

    // Emit span finished event
    this.emit('span:finished', span);

    // Clean up completed span
    this.traces.delete(spanId);
    activeTraces.set(this.traces.size);

    logger.debug({
      traceId: span.traceId,
      spanId: span.spanId,
      operation: span.operationName,
      duration: span.duration,
      status,
    }, 'Span finished');
  }

  /**
   * Add log to span
   */
  addSpanLog(spanId: string, message: string, level: string = 'info'): void {
    const span = this.traces.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: performance.now(),
        message,
        level,
      });
    }
  }

  /**
   * Add tags to span
   */
  addSpanTags(spanId: string, tags: Record<string, any>): void {
    const span = this.traces.get(spanId);
    if (span) {
      Object.assign(span.tags, tags);
    }
  }

  /**
   * Create a child span
   */
  createChildSpan(
    parentSpanId: string,
    operationName: string,
    tags: Record<string, any> = {}
  ): TraceSpan | null {
    const parentSpan = this.traces.get(parentSpanId);
    if (!parentSpan) {
      logger.warn({ parentSpanId }, 'Parent span not found for child span');
      return null;
    }

    return this.startSpan(operationName, parentSpan.traceId, parentSpanId, tags);
  }

  /**
   * Instrument HTTP requests
   */
  instrumentRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number
  ): void {
    requestDuration.observe(
      { method, route, status_code: statusCode.toString() },
      duration / 1000
    );
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Start memory monitoring
    this.memoryMonitorInterval = setInterval(() => {
      this.collectPerformanceMetrics();
    }, 10000); // Every 10 seconds

    // Start event loop monitoring
    if (this.eventLoopObserver) {
      this.eventLoopObserver.observe({ entryTypes: ['measure'] });
    }

    logger.info('APM monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }

    if (this.eventLoopObserver) {
      this.eventLoopObserver.disconnect();
    }

    logger.info('APM monitoring stopped');
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      requestDuration: 0, // Would be populated from active requests
      memoryUsage: memUsage,
      eventLoopLag: this.measureEventLoopLag(),
      activeHandles: process._getActiveHandles().length,
      cpuUsage,
      timestamp: new Date(),
    };
  }

  /**
   * Detect memory leaks
   */
  detectMemoryLeaks(): MemoryLeakDetection {
    if (this.gcStats.length < 10) {
      return {
        suspiciousGrowth: false,
        heapGrowthRate: 0,
        gcEfficiency: 100,
        recommendations: ['Not enough data collected yet'],
      };
    }

    // Calculate heap growth rate (MB per minute)
    const recentStats = this.gcStats.slice(-10);
    const oldestStat = recentStats[0];
    const newestStat = recentStats[recentStats.length - 1];
    
    const timeDiffMinutes = (newestStat.timestamp - oldestStat.timestamp) / 60000;
    const heapDiffMB = (newestStat.used - oldestStat.used) / 1024 / 1024;
    const heapGrowthRate = heapDiffMB / timeDiffMinutes;

    // Calculate GC efficiency
    let totalFreed = 0;
    let totalAllocated = 0;
    
    for (let i = 1; i < recentStats.length; i++) {
      const current = recentStats[i];
      const previous = recentStats[i - 1];
      
      if (current.used < previous.used) {
        totalFreed += previous.used - current.used;
      }
      totalAllocated += Math.max(0, current.used - previous.used);
    }
    
    const gcEfficiency = totalAllocated > 0 ? (totalFreed / totalAllocated) * 100 : 100;

    // Determine if there's suspicious growth
    const suspiciousGrowth = heapGrowthRate > 10 || gcEfficiency < 50;

    // Generate recommendations
    const recommendations: string[] = [];
    if (heapGrowthRate > 10) {
      recommendations.push('High heap growth rate detected - check for memory leaks');
    }
    if (gcEfficiency < 50) {
      recommendations.push('Low GC efficiency - review object lifecycle management');
    }
    if (newestStat.used > 500 * 1024 * 1024) { // 500MB
      recommendations.push('High memory usage - consider implementing memory optimization');
    }

    // Update metrics
    const leakIndicator = suspiciousGrowth ? 1 : 0;
    memoryLeakIndicator.set(leakIndicator);

    return {
      suspiciousGrowth,
      heapGrowthRate,
      gcEfficiency,
      recommendations,
    };
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): TraceSpan[] {
    return Array.from(this.traces.values()).filter(span => span.traceId === traceId);
  }

  /**
   * Get all active traces
   */
  getActiveTraces(): TraceSpan[] {
    return Array.from(this.traces.values());
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(limit?: number): PerformanceMetrics[] {
    const history = this.performanceHistory;
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Export trace data for external APM systems
   */
  exportTraces(format: 'jaeger' | 'zipkin' | 'otlp' = 'jaeger'): any[] {
    const traces = this.getActiveTraces();
    
    switch (format) {
      case 'jaeger':
        return this.exportToJaeger(traces);
      case 'zipkin':
        return this.exportToZipkin(traces);
      case 'otlp':
        return this.exportToOTLP(traces);
      default:
        return traces;
    }
  }

  /**
   * Setup performance observers
   */
  private setupPerformanceObservers(): void {
    // Event loop lag observer
    this.eventLoopObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        if (entry.name === 'eventloop-lag') {
          eventLoopLag.observe(entry.duration / 1000);
        }
      }
    });

    // Measure event loop lag periodically
    setInterval(() => {
      const start = performance.now();
      setImmediate(() => {
        const lag = performance.now() - start;
        performance.measure('eventloop-lag', { start, duration: lag });
      });
    }, 1000);
  }

  /**
   * Collect performance metrics
   */
  private collectPerformanceMetrics(): void {
    const metrics = this.getCurrentMetrics();
    
    this.performanceHistory.push(metrics);
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }

    // Update GC stats
    this.gcStats.push({
      timestamp: Date.now(),
      used: metrics.memoryUsage.heapUsed,
      total: metrics.memoryUsage.heapTotal,
    });
    
    if (this.gcStats.length > 100) {
      this.gcStats.shift();
    }

    // Emit metrics event
    this.emit('metrics:collected', metrics);

    // Check for memory leaks
    const memoryLeakDetection = this.detectMemoryLeaks();
    if (memoryLeakDetection.suspiciousGrowth) {
      this.emit('memory:leak_detected', memoryLeakDetection);
      logger.warn({ memoryLeakDetection }, 'Potential memory leak detected');
    }
  }

  /**
   * Measure event loop lag
   */
  private measureEventLoopLag(): number {
    const start = performance.now();
    return new Promise<number>((resolve) => {
      setImmediate(() => {
        resolve(performance.now() - start);
      });
    }) as any; // Simplified for synchronous return
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 16);
  }

  /**
   * Export traces to Jaeger format
   */
  private exportToJaeger(traces: TraceSpan[]): any[] {
    return traces.map(span => ({
      traceID: span.traceId,
      spanID: span.spanId,
      parentSpanID: span.parentSpanId,
      operationName: span.operationName,
      startTime: span.startTime * 1000, // microseconds
      duration: (span.duration || 0) * 1000,
      tags: Object.entries(span.tags).map(([key, value]) => ({
        key,
        type: typeof value === 'string' ? 'string' : 'number',
        value: String(value),
      })),
      logs: span.logs.map(log => ({
        timestamp: log.timestamp * 1000,
        fields: [
          { key: 'level', value: log.level },
          { key: 'message', value: log.message },
        ],
      })),
    }));
  }

  /**
   * Export traces to Zipkin format
   */
  private exportToZipkin(traces: TraceSpan[]): any[] {
    return traces.map(span => ({
      traceId: span.traceId,
      id: span.spanId,
      parentId: span.parentSpanId,
      name: span.operationName,
      timestamp: span.startTime * 1000,
      duration: (span.duration || 0) * 1000,
      tags: span.tags,
      annotations: span.logs.map(log => ({
        timestamp: log.timestamp * 1000,
        value: `${log.level}: ${log.message}`,
      })),
    }));
  }

  /**
   * Export traces to OpenTelemetry format
   */
  private exportToOTLP(traces: TraceSpan[]): any[] {
    return traces.map(span => ({
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.operationName,
      startTimeUnixNano: span.startTime * 1000000,
      endTimeUnixNano: (span.startTime + (span.duration || 0)) * 1000000,
      attributes: span.tags,
      events: span.logs.map(log => ({
        timeUnixNano: log.timestamp * 1000000,
        name: log.level,
        attributes: { message: log.message },
      })),
      status: { code: span.status === 'ok' ? 1 : 2 },
    }));
  }
}

// Export singleton instance
export const apmIntegration = APMIntegration.getInstance();