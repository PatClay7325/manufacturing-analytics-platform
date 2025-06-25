/**
 * Distributed Tracing System
 * Production-ready tracing with OpenTelemetry compatibility
 */

import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import { Redis } from 'ioredis';

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
  sampled: boolean;
  flags: number;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags: Record<string, any>;
  logs: SpanLog[];
  status: SpanStatus;
  kind: SpanKind;
  references: SpanReference[];
  baggage: Record<string, string>;
  process: ProcessInfo;
}

export interface SpanLog {
  timestamp: number;
  fields: Record<string, any>;
}

export interface SpanReference {
  type: 'childOf' | 'followsFrom';
  spanId: string;
  traceId: string;
}

export type SpanStatus = 'ok' | 'error' | 'timeout' | 'cancelled';
export type SpanKind = 'server' | 'client' | 'producer' | 'consumer' | 'internal';

export interface ProcessInfo {
  serviceName: string;
  serviceVersion: string;
  hostname: string;
  pid: number;
  tags: Record<string, any>;
}

export interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  enableSampling: boolean;
  samplingRate: number;
  enableRedis: boolean;
  enableJaeger: boolean;
  redisConfig?: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  jaegerConfig?: {
    endpoint: string;
    headers?: Record<string, string>;
  };
  maxSpansPerTrace: number;
  traceTimeout: number; // milliseconds
}

export class DistributedTracer extends EventEmitter {
  private static instance: DistributedTracer;
  private config: TracingConfig;
  private redis?: Redis;
  private contextStorage = new AsyncLocalStorage<TraceContext>();
  private activeSpans = new Map<string, Span>();
  private activeTraces = new Map<string, Set<string>>();
  private processInfo: ProcessInfo;

  constructor(config: TracingConfig) {
    super();
    this.config = config;

    this.processInfo = {
      serviceName: config.serviceName,
      serviceVersion: config.serviceVersion,
      hostname: require('os').hostname(),
      pid: process.pid,
      tags: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    // Initialize Redis if enabled
    if (config.enableRedis && config.redisConfig) {
      this.redis = new Redis({
        host: config.redisConfig.host,
        port: config.redisConfig.port,
        password: config.redisConfig.password,
        db: config.redisConfig.db,
        keyPrefix: 'trace:',
      });
    }

    // Cleanup completed traces periodically
    setInterval(() => this.cleanupCompletedTraces(), 60000); // Every minute
  }

  static getInstance(config?: TracingConfig): DistributedTracer {
    if (!DistributedTracer.instance) {
      if (!config) {
        throw new Error('Tracer configuration required for first initialization');
      }
      DistributedTracer.instance = new DistributedTracer(config);
    }
    return DistributedTracer.instance;
  }

  /**
   * Start a new trace
   */
  startTrace(operationName: string, options: {
    parentContext?: TraceContext;
    tags?: Record<string, any>;
    baggage?: Record<string, string>;
    kind?: SpanKind;
  } = {}): Span {
    const traceId = options.parentContext?.traceId || this.generateTraceId();
    const spanId = this.generateSpanId();
    const sampled = this.shouldSample(traceId);

    const context: TraceContext = {
      traceId,
      spanId,
      parentSpanId: options.parentContext?.spanId,
      baggage: { ...options.parentContext?.baggage, ...options.baggage },
      sampled,
      flags: sampled ? 1 : 0,
    };

    const span: Span = {
      traceId,
      spanId,
      parentSpanId: options.parentContext?.spanId,
      operationName,
      startTime: performance.now(),
      tags: { ...options.tags },
      logs: [],
      status: 'ok',
      kind: options.kind || 'internal',
      references: options.parentContext ? [{
        type: 'childOf',
        spanId: options.parentContext.spanId,
        traceId: options.parentContext.traceId,
      }] : [],
      baggage: context.baggage || {},
      process: this.processInfo,
    };

    // Store span
    this.activeSpans.set(spanId, span);
    
    // Track spans per trace
    if (!this.activeTraces.has(traceId)) {
      this.activeTraces.set(traceId, new Set());
    }
    this.activeTraces.get(traceId)!.add(spanId);

    // Set context for current execution
    this.contextStorage.enterWith(context);

    this.emit('span_started', span);
    return span;
  }

  /**
   * Execute function with tracing
   */
  trace<T>(
    operationName: string,
    fn: (span: Span) => T | Promise<T>,
    options: {
      tags?: Record<string, any>;
      kind?: SpanKind;
    } = {}
  ): T | Promise<T> {
    const parentContext = this.getContext();
    const span = this.startTrace(operationName, {
      parentContext,
      tags: options.tags,
      kind: options.kind,
    });

    const finishSpan = (result?: any, error?: Error) => {
      if (error) {
        span.status = 'error';
        span.tags.error = true;
        span.tags['error.message'] = error.message;
        span.tags['error.stack'] = error.stack;
      }

      if (result !== undefined) {
        span.tags.result = typeof result === 'object' ? 
          JSON.stringify(result).substring(0, 1000) : String(result);
      }

      this.finishSpan(span);
    };

    try {
      const result = this.contextStorage.run(this.getContext()!, () => fn(span));

      if (result instanceof Promise) {
        return result
          .then((res) => {
            finishSpan(res);
            return res;
          })
          .catch((err) => {
            finishSpan(undefined, err);
            throw err;
          });
      } else {
        finishSpan(result);
        return result;
      }
    } catch (error) {
      finishSpan(undefined, error as Error);
      throw error;
    }
  }

  /**
   * Get current trace context
   */
  getContext(): TraceContext | undefined {
    return this.contextStorage.getStore();
  }

  /**
   * Create child span
   */
  createChildSpan(
    operationName: string,
    options: {
      tags?: Record<string, any>;
      kind?: SpanKind;
    } = {}
  ): Span | null {
    const parentContext = this.getContext();
    if (!parentContext) {
      return null;
    }

    return this.startTrace(operationName, {
      parentContext,
      tags: options.tags,
      kind: options.kind,
    });
  }

  /**
   * Add tag to current span
   */
  addTag(key: string, value: any): void {
    const context = this.getContext();
    if (!context) return;

    const span = this.activeSpans.get(context.spanId);
    if (span) {
      span.tags[key] = value;
    }
  }

  /**
   * Add log to current span
   */
  addLog(fields: Record<string, any>): void {
    const context = this.getContext();
    if (!context) return;

    const span = this.activeSpans.get(context.spanId);
    if (span) {
      span.logs.push({
        timestamp: performance.now(),
        fields,
      });
    }
  }

  /**
   * Set baggage item
   */
  setBaggageItem(key: string, value: string): void {
    const context = this.getContext();
    if (!context) return;

    context.baggage = context.baggage || {};
    context.baggage[key] = value;

    // Update span baggage
    const span = this.activeSpans.get(context.spanId);
    if (span) {
      span.baggage[key] = value;
    }
  }

  /**
   * Get baggage item
   */
  getBaggageItem(key: string): string | undefined {
    const context = this.getContext();
    return context?.baggage?.[key];
  }

  /**
   * Finish span
   */
  finishSpan(span: Span): void {
    span.endTime = performance.now();
    span.duration = span.endTime - span.startTime;

    // Remove from active spans
    this.activeSpans.delete(span.spanId);

    // Remove from trace tracking
    const traceSpans = this.activeTraces.get(span.traceId);
    if (traceSpans) {
      traceSpans.delete(span.spanId);
      
      // If this was the last span in the trace, process the complete trace
      if (traceSpans.size === 0) {
        this.activeTraces.delete(span.traceId);
        this.processCompleteTrace(span.traceId);
      }
    }

    this.emit('span_finished', span);

    // Send to external systems if sampled
    if (this.getContext()?.sampled) {
      this.exportSpan(span);
    }
  }

  /**
   * Inject trace context into carriers (for HTTP headers, etc.)
   */
  inject(context: TraceContext, carrier: Record<string, string>): void {
    carrier['x-trace-id'] = context.traceId;
    carrier['x-span-id'] = context.spanId;
    if (context.parentSpanId) {
      carrier['x-parent-span-id'] = context.parentSpanId;
    }
    carrier['x-trace-flags'] = context.flags.toString();
    
    // Inject baggage
    if (context.baggage) {
      for (const [key, value] of Object.entries(context.baggage)) {
        carrier[`x-baggage-${key}`] = value;
      }
    }
  }

  /**
   * Extract trace context from carriers
   */
  extract(carrier: Record<string, string>): TraceContext | null {
    const traceId = carrier['x-trace-id'];
    const spanId = carrier['x-span-id'];
    
    if (!traceId || !spanId) {
      return null;
    }

    const baggage: Record<string, string> = {};
    for (const [key, value] of Object.entries(carrier)) {
      if (key.startsWith('x-baggage-')) {
        const baggageKey = key.replace('x-baggage-', '');
        baggage[baggageKey] = value;
      }
    }

    return {
      traceId,
      spanId,
      parentSpanId: carrier['x-parent-span-id'],
      baggage,
      sampled: parseInt(carrier['x-trace-flags'] || '0') === 1,
      flags: parseInt(carrier['x-trace-flags'] || '0'),
    };
  }

  /**
   * Get trace by ID
   */
  async getTrace(traceId: string): Promise<Span[]> {
    const spans: Span[] = [];

    // Check active spans first
    for (const span of this.activeSpans.values()) {
      if (span.traceId === traceId) {
        spans.push(span);
      }
    }

    // Check Redis for completed spans
    if (this.redis) {
      try {
        const spanIds = await this.redis.smembers(`spans:${traceId}`);
        for (const spanId of spanIds) {
          const spanData = await this.redis.get(`span:${spanId}`);
          if (spanData) {
            spans.push(JSON.parse(spanData));
          }
        }
      } catch (error) {
        console.error('Error retrieving trace from Redis:', error);
      }
    }

    return spans.sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Query traces
   */
  async queryTraces(query: {
    serviceName?: string;
    operationName?: string;
    tags?: Record<string, any>;
    minDuration?: number;
    maxDuration?: number;
    startTime?: number;
    endTime?: number;
    limit?: number;
  }): Promise<string[]> {
    if (!this.redis) {
      return [];
    }

    try {
      // This is a simplified implementation
      // In a real system, you'd use a more sophisticated indexing strategy
      const allTraceIds = await this.redis.keys('spans:*');
      const traceIds = allTraceIds.map(key => key.replace('spans:', ''));
      
      const filteredTraces: string[] = [];
      
      for (const traceId of traceIds.slice(0, query.limit || 100)) {
        const spans = await this.getTrace(traceId);
        
        if (spans.length === 0) continue;
        
        // Apply filters
        let matches = true;
        
        if (query.serviceName && !spans.some(s => s.process.serviceName === query.serviceName)) {
          matches = false;
        }
        
        if (query.operationName && !spans.some(s => s.operationName === query.operationName)) {
          matches = false;
        }
        
        if (query.tags) {
          const hasAllTags = Object.entries(query.tags).every(([key, value]) =>
            spans.some(s => s.tags[key] === value)
          );
          if (!hasAllTags) matches = false;
        }
        
        if (query.minDuration || query.maxDuration) {
          const rootSpan = spans.find(s => !s.parentSpanId);
          if (rootSpan && rootSpan.duration) {
            if (query.minDuration && rootSpan.duration < query.minDuration) matches = false;
            if (query.maxDuration && rootSpan.duration > query.maxDuration) matches = false;
          }
        }
        
        if (matches) {
          filteredTraces.push(traceId);
        }
      }
      
      return filteredTraces;
    } catch (error) {
      console.error('Error querying traces:', error);
      return [];
    }
  }

  /**
   * Get tracing statistics
   */
  async getStatistics(timeRange?: { from: number; to: number }): Promise<{
    totalTraces: number;
    totalSpans: number;
    averageTraceLength: number;
    slowestTraces: Array<{ traceId: string; duration: number }>;
    errorRate: number;
    throughput: number; // traces per second
  }> {
    if (!this.redis) {
      return {
        totalTraces: 0,
        totalSpans: 0,
        averageTraceLength: 0,
        slowestTraces: [],
        errorRate: 0,
        throughput: 0,
      };
    }

    try {
      const traceKeys = await this.redis.keys('spans:*');
      const totalTraces = traceKeys.length;
      let totalSpans = 0;
      let errorSpans = 0;
      const traceDurations: Array<{ traceId: string; duration: number }> = [];

      for (const key of traceKeys) {
        const traceId = key.replace('spans:', '');
        const spans = await this.getTrace(traceId);
        totalSpans += spans.length;
        
        // Count error spans
        errorSpans += spans.filter(s => s.status === 'error').length;
        
        // Calculate trace duration (root span duration)
        const rootSpan = spans.find(s => !s.parentSpanId);
        if (rootSpan && rootSpan.duration) {
          traceDurations.push({ traceId, duration: rootSpan.duration });
        }
      }

      const averageTraceLength = totalTraces > 0 ? totalSpans / totalTraces : 0;
      const errorRate = totalSpans > 0 ? (errorSpans / totalSpans) * 100 : 0;
      const slowestTraces = traceDurations
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10);

      // Calculate throughput (simplified)
      const timeRangeSeconds = timeRange ? 
        (timeRange.to - timeRange.from) / 1000 : 
        3600; // 1 hour default
      const throughput = totalTraces / timeRangeSeconds;

      return {
        totalTraces,
        totalSpans,
        averageTraceLength,
        slowestTraces,
        errorRate,
        throughput,
      };
    } catch (error) {
      console.error('Error getting tracing statistics:', error);
      return {
        totalTraces: 0,
        totalSpans: 0,
        averageTraceLength: 0,
        slowestTraces: [],
        errorRate: 0,
        throughput: 0,
      };
    }
  }

  /**
   * Generate trace ID
   */
  private generateTraceId(): string {
    return randomUUID().replace(/-/g, '');
  }

  /**
   * Generate span ID
   */
  private generateSpanId(): string {
    return randomUUID().replace(/-/g, '').substring(0, 16);
  }

  /**
   * Determine if trace should be sampled
   */
  private shouldSample(traceId: string): boolean {
    if (!this.config.enableSampling) {
      return true;
    }

    // Use trace ID for consistent sampling decisions
    const hash = parseInt(traceId.substring(0, 8), 16);
    return (hash % 100) < (this.config.samplingRate * 100);
  }

  /**
   * Export span to external systems
   */
  private async exportSpan(span: Span): Promise<void> {
    // Export to Redis
    if (this.config.enableRedis && this.redis) {
      try {
        const spanKey = `span:${span.spanId}`;
        const traceSpansKey = `spans:${span.traceId}`;
        
        await Promise.all([
          this.redis.setex(spanKey, 24 * 60 * 60, JSON.stringify(span)), // 24 hours TTL
          this.redis.sadd(traceSpansKey, span.spanId),
          this.redis.expire(traceSpansKey, 24 * 60 * 60),
        ]);
      } catch (error) {
        console.error('Error exporting span to Redis:', error);
      }
    }

    // Export to Jaeger
    if (this.config.enableJaeger) {
      this.emit('jaeger_export', span);
    }

    this.emit('span_exported', span);
  }

  /**
   * Process complete trace
   */
  private processCompleteTrace(traceId: string): void {
    this.emit('trace_completed', traceId);
  }

  /**
   * Cleanup completed traces
   */
  private cleanupCompletedTraces(): void {
    const now = performance.now();
    const timeout = this.config.traceTimeout;

    for (const [spanId, span] of this.activeSpans.entries()) {
      if (now - span.startTime > timeout) {
        // Force finish timed out spans
        span.status = 'timeout';
        this.finishSpan(span);
      }
    }
  }

  /**
   * Cleanup old traces from Redis
   */
  async cleanup(olderThan: number = 24 * 60 * 60 * 1000): Promise<number> {
    if (!this.redis) return 0;

    try {
      let deletedCount = 0;
      const cutoff = Date.now() - olderThan;

      const traceKeys = await this.redis.keys('spans:*');
      for (const key of traceKeys) {
        const traceId = key.replace('spans:', '');
        const spans = await this.getTrace(traceId);
        
        if (spans.length === 0) continue;
        
        const oldestSpan = spans.reduce((oldest, current) => 
          current.startTime < oldest.startTime ? current : oldest
        );

        if (oldestSpan.startTime < cutoff) {
          // Delete all spans for this trace
          const spanIds = await this.redis.smembers(key);
          const pipeline = this.redis.pipeline();
          
          for (const spanId of spanIds) {
            pipeline.del(`span:${spanId}`);
          }
          pipeline.del(key);
          
          await pipeline.exec();
          deletedCount += spanIds.length;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up traces:', error);
      return 0;
    }
  }

  /**
   * Shutdown tracer
   */
  async shutdown(): Promise<void> {
    // Finish all active spans
    for (const span of this.activeSpans.values()) {
      this.finishSpan(span);
    }

    // Close Redis connection
    if (this.redis) {
      await this.redis.quit();
    }

    this.emit('shutdown');
  }
}

// Export singleton instance
export const tracer = DistributedTracer.getInstance({
  serviceName: process.env.SERVICE_NAME || 'manufacturing-analytics',
  serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
  enableSampling: process.env.TRACING_SAMPLING === 'true',
  samplingRate: parseFloat(process.env.TRACING_SAMPLING_RATE || '0.1'),
  enableRedis: process.env.TRACING_REDIS === 'true',
  enableJaeger: process.env.TRACING_JAEGER === 'true',
  redisConfig: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_TRACING_DB || '13'),
  },
  jaegerConfig: process.env.JAEGER_ENDPOINT ? {
    endpoint: process.env.JAEGER_ENDPOINT,
    headers: process.env.JAEGER_HEADERS ? 
      JSON.parse(process.env.JAEGER_HEADERS) : undefined,
  } : undefined,
  maxSpansPerTrace: parseInt(process.env.MAX_SPANS_PER_TRACE || '1000'),
  traceTimeout: parseInt(process.env.TRACE_TIMEOUT || '300000'), // 5 minutes
});