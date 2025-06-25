/**
 * Metrics Collection and Aggregation System
 * Production-ready metrics with multiple backends and real-time aggregation
 */

import { EventEmitter } from 'events';
import { performance } from 'perf_hooks';
import { randomUUID } from 'crypto';
import { Redis } from 'ioredis';

export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary' | 'timer';

export interface MetricLabel {
  [key: string]: string;
}

export interface MetricValue {
  value: number;
  timestamp: number;
  labels: MetricLabel;
}

export interface Metric {
  name: string;
  type: MetricType;
  description: string;
  unit?: string;
  values: MetricValue[];
  aggregations?: {
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
    p50?: number;
    p90?: number;
    p95?: number;
    p99?: number;
  };
  lastUpdated: number;
}

export interface HistogramBucket {
  upperBound: number;
  count: number;
}

export interface HistogramData {
  buckets: HistogramBucket[];
  count: number;
  sum: number;
}

export interface TimerResult {
  duration: number;
  labels?: MetricLabel;
}

export interface MetricsConfig {
  enableCollection: boolean;
  enableRedis: boolean;
  enablePrometheus: boolean;
  collectionInterval: number; // milliseconds
  retentionPeriod: number; // milliseconds
  maxMetricsInMemory: number;
  redisConfig?: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  prometheusConfig?: {
    gateway: string;
    jobName: string;
    pushInterval: number;
  };
  defaultBuckets: number[]; // For histograms
  aggregationWindows: number[]; // Time windows for aggregation in seconds
}

interface MetricBuffer {
  metrics: Map<string, Metric>;
  maxSize: number;
  lastFlush: number;
}

export class MetricsCollector extends EventEmitter {
  private static instance: MetricsCollector;
  private config: MetricsConfig;
  private redis?: Redis;
  private buffer: MetricBuffer;
  private timers: Map<string, number> = new Map();
  private flushInterval?: NodeJS.Timeout;
  private aggregationInterval?: NodeJS.Timeout;

  constructor(config: MetricsConfig) {
    super();
    this.config = config;

    // Initialize Redis if enabled
    if (config.enableRedis && config.redisConfig) {
      this.redis = new Redis({
        host: config.redisConfig.host,
        port: config.redisConfig.port,
        password: config.redisConfig.password,
        db: config.redisConfig.db,
        keyPrefix: 'metrics:',
      });
    }

    // Initialize buffer
    this.buffer = {
      metrics: new Map(),
      maxSize: config.maxMetricsInMemory,
      lastFlush: Date.now(),
    };

    // Start collection if enabled
    if (config.enableCollection) {
      this.startCollection();
    }
  }

  static getInstance(config?: MetricsConfig): MetricsCollector {
    if (!MetricsCollector.instance) {
      if (!config) {
        throw new Error('Metrics configuration required for first initialization');
      }
      MetricsCollector.instance = new MetricsCollector(config);
    }
    return MetricsCollector.instance;
  }

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, increment = 1, labels: MetricLabel = {}): void {
    this.addMetricValue(name, 'counter', increment, labels, 'Number of occurrences');
  }

  /**
   * Set a gauge metric value
   */
  setGauge(name: string, value: number, labels: MetricLabel = {}): void {
    this.addMetricValue(name, 'gauge', value, labels, 'Current value');
  }

  /**
   * Record a value in a histogram
   */
  recordHistogram(name: string, value: number, labels: MetricLabel = {}): void {
    this.addMetricValue(name, 'histogram', value, labels, 'Distribution of values');
  }

  /**
   * Record a summary metric
   */
  recordSummary(name: string, value: number, labels: MetricLabel = {}): void {
    this.addMetricValue(name, 'summary', value, labels, 'Summary statistics');
  }

  /**
   * Start a timer
   */
  startTimer(name: string, labels: MetricLabel = {}): string {
    const timerId = randomUUID();
    const startTime = performance.now();
    this.timers.set(timerId, startTime);
    
    this.emit('timer_started', { name, timerId, labels });
    return timerId;
  }

  /**
   * End a timer and record the duration
   */
  endTimer(timerId: string, name: string, labels: MetricLabel = {}): TimerResult {
    const startTime = this.timers.get(timerId);
    if (!startTime) {
      throw new Error(`Timer not found: ${timerId}`);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.timers.delete(timerId);
    this.addMetricValue(name, 'timer', duration, labels, 'Execution time in milliseconds');
    
    const result: TimerResult = { duration, labels };
    this.emit('timer_ended', { name, timerId, result });
    
    return result;
  }

  /**
   * Time a function execution
   */
  time<T>(
    name: string,
    fn: () => T | Promise<T>,
    labels: MetricLabel = {}
  ): T | Promise<T> {
    const timerId = this.startTimer(name, labels);

    const endTiming = (result?: any, error?: Error) => {
      const finalLabels = { ...labels };
      if (error) {
        finalLabels.status = 'error';
        finalLabels.error_type = error.constructor.name;
      } else {
        finalLabels.status = 'success';
      }
      
      this.endTimer(timerId, name, finalLabels);
    };

    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result
          .then((res) => {
            endTiming(res);
            return res;
          })
          .catch((err) => {
            endTiming(undefined, err);
            throw err;
          });
      } else {
        endTiming(result);
        return result;
      }
    } catch (error) {
      endTiming(undefined, error as Error);
      throw error;
    }
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration: number,
    size?: number
  ): void {
    const labels = {
      method: method.toUpperCase(),
      path,
      status_code: statusCode.toString(),
      status_class: `${Math.floor(statusCode / 100)}xx`,
    };

    this.incrementCounter('http_requests_total', 1, labels);
    this.recordHistogram('http_request_duration_ms', duration, labels);
    
    if (size !== undefined) {
      this.recordHistogram('http_request_size_bytes', size, labels);
    }
  }

  /**
   * Record database operation metrics
   */
  recordDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    rowCount?: number
  ): void {
    const labels = {
      operation: operation.toLowerCase(),
      table,
      status: success ? 'success' : 'error',
    };

    this.incrementCounter('db_operations_total', 1, labels);
    this.recordHistogram('db_operation_duration_ms', duration, labels);
    
    if (rowCount !== undefined) {
      this.recordHistogram('db_rows_affected', rowCount, labels);
    }
  }

  /**
   * Record system resource metrics
   */
  recordSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // Memory metrics
    this.setGauge('nodejs_memory_heap_used_bytes', memUsage.heapUsed);
    this.setGauge('nodejs_memory_heap_total_bytes', memUsage.heapTotal);
    this.setGauge('nodejs_memory_external_bytes', memUsage.external);
    this.setGauge('nodejs_memory_array_buffers_bytes', memUsage.arrayBuffers);

    // CPU metrics (convert from microseconds to seconds)
    this.setGauge('nodejs_cpu_user_seconds', cpuUsage.user / 1000000);
    this.setGauge('nodejs_cpu_system_seconds', cpuUsage.system / 1000000);

    // Event loop lag
    const start = performance.now();
    setImmediate(() => {
      const lag = performance.now() - start;
      this.recordHistogram('nodejs_eventloop_lag_ms', lag);
    });

    // Process uptime
    this.setGauge('nodejs_process_uptime_seconds', process.uptime());

    // Active handles and requests
    this.setGauge('nodejs_active_handles', (process as any)._getActiveHandles().length);
    this.setGauge('nodejs_active_requests', (process as any)._getActiveRequests().length);
  }

  /**
   * Get metric by name
   */
  getMetric(name: string): Metric | undefined {
    return this.buffer.metrics.get(name);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Metric[] {
    return Array.from(this.buffer.metrics.values());
  }

  /**
   * Query metrics with filters
   */
  queryMetrics(filters: {
    name?: string;
    type?: MetricType;
    labels?: MetricLabel;
    from?: number;
    to?: number;
  }): Metric[] {
    const metrics = this.getAllMetrics();
    
    return metrics.filter(metric => {
      // Name filter
      if (filters.name && !metric.name.includes(filters.name)) {
        return false;
      }
      
      // Type filter
      if (filters.type && metric.type !== filters.type) {
        return false;
      }
      
      // Time range filter
      if (filters.from && metric.lastUpdated < filters.from) {
        return false;
      }
      
      if (filters.to && metric.lastUpdated > filters.to) {
        return false;
      }
      
      // Label filters
      if (filters.labels) {
        const hasAllLabels = Object.entries(filters.labels).every(([key, value]) =>
          metric.values.some(v => v.labels[key] === value)
        );
        if (!hasAllLabels) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Get aggregated metrics for time windows
   */
  getAggregatedMetrics(
    name: string,
    window: number, // seconds
    groupBy?: string[] // label keys to group by
  ): Array<{
    labels: MetricLabel;
    aggregations: Metric['aggregations'];
    timestamp: number;
  }> {
    const metric = this.getMetric(name);
    if (!metric) {
      return [];
    }

    const windowMs = window * 1000;
    const now = Date.now();
    const buckets = new Map<string, MetricValue[]>();

    // Group values by time windows and labels
    for (const value of metric.values) {
      if (value.timestamp < now - windowMs) {
        continue; // Skip old values
      }

      const bucketTime = Math.floor(value.timestamp / windowMs) * windowMs;
      const labelKey = groupBy ? 
        groupBy.map(key => `${key}:${value.labels[key] || ''}`).join(',') :
        'all';
      const bucketKey = `${bucketTime}:${labelKey}`;

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(value);
    }

    // Calculate aggregations for each bucket
    const results: Array<{
      labels: MetricLabel;
      aggregations: Metric['aggregations'];
      timestamp: number;
    }> = [];

    for (const [bucketKey, values] of buckets.entries()) {
      const [timeStr, labelKey] = bucketKey.split(':');
      const timestamp = parseInt(timeStr);
      
      // Extract labels
      const labels: MetricLabel = {};
      if (groupBy && labelKey !== 'all') {
        const labelPairs = labelKey.split(',');
        for (const pair of labelPairs) {
          const [key, value] = pair.split(':');
          labels[key] = value;
        }
      }

      // Calculate aggregations
      const nums = values.map(v => v.value);
      const aggregations = this.calculateAggregations(nums);

      results.push({ labels, aggregations, timestamp });
    }

    return results.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusFormat(): string {
    const lines: string[] = [];
    
    for (const metric of this.getAllMetrics()) {
      // Add metric help comment
      lines.push(`# HELP ${metric.name} ${metric.description}`);
      lines.push(`# TYPE ${metric.name} ${this.getPrometheusType(metric.type)}`);
      
      if (metric.type === 'histogram') {
        // Export histogram buckets
        const histogram = this.calculateHistogram(metric.values.map(v => v.value));
        
        for (const bucket of histogram.buckets) {
          const labelsStr = this.formatPrometheusLabels({ le: bucket.upperBound.toString() });
          lines.push(`${metric.name}_bucket${labelsStr} ${bucket.count}`);
        }
        
        lines.push(`${metric.name}_bucket{le="+Inf"} ${histogram.count}`);
        lines.push(`${metric.name}_count ${histogram.count}`);
        lines.push(`${metric.name}_sum ${histogram.sum}`);
      } else {
        // Export regular metrics
        for (const value of metric.values) {
          const labelsStr = this.formatPrometheusLabels(value.labels);
          lines.push(`${metric.name}${labelsStr} ${value.value}`);
        }
      }
      
      lines.push(''); // Empty line between metrics
    }
    
    return lines.join('\n');
  }

  /**
   * Start metrics collection
   */
  private startCollection(): void {
    // Start periodic system metrics collection
    const systemMetricsInterval = setInterval(() => {
      this.recordSystemMetrics();
    }, 10000); // Every 10 seconds

    // Start buffer flush
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, this.config.collectionInterval);

    // Start aggregation
    this.aggregationInterval = setInterval(() => {
      this.performAggregation();
    }, 60000); // Every minute

    // Cleanup on process exit
    process.on('SIGTERM', () => {
      clearInterval(systemMetricsInterval);
      this.shutdown();
    });
    process.on('SIGINT', () => {
      clearInterval(systemMetricsInterval);
      this.shutdown();
    });
  }

  /**
   * Add a metric value
   */
  private addMetricValue(
    name: string,
    type: MetricType,
    value: number,
    labels: MetricLabel,
    description: string
  ): void {
    if (!this.config.enableCollection) {
      return;
    }

    const now = Date.now();
    const metricValue: MetricValue = {
      value,
      timestamp: now,
      labels: { ...labels },
    };

    let metric = this.buffer.metrics.get(name);
    if (!metric) {
      metric = {
        name,
        type,
        description,
        values: [],
        lastUpdated: now,
      };
      this.buffer.metrics.set(name, metric);
    }

    metric.values.push(metricValue);
    metric.lastUpdated = now;

    // Keep only recent values to prevent memory overflow
    const retentionCutoff = now - this.config.retentionPeriod;
    metric.values = metric.values.filter(v => v.timestamp > retentionCutoff);

    // Update aggregations
    metric.aggregations = this.calculateAggregations(metric.values.map(v => v.value));

    this.emit('metric_recorded', { name, type, value, labels });

    // Check if buffer is full
    if (this.buffer.metrics.size > this.buffer.maxSize) {
      this.flushMetrics();
    }
  }

  /**
   * Calculate aggregations for values
   */
  private calculateAggregations(values: number[]): Metric['aggregations'] {
    if (values.length === 0) {
      return {
        count: 0,
        sum: 0,
        min: 0,
        max: 0,
        avg: 0,
      };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      sum,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / values.length,
      p50: this.percentile(sorted, 0.5),
      p90: this.percentile(sorted, 0.9),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil(sortedValues.length * p) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Calculate histogram data
   */
  private calculateHistogram(values: number[]): HistogramData {
    const buckets: HistogramBucket[] = [];
    const sum = values.reduce((a, b) => a + b, 0);
    
    for (const upperBound of this.config.defaultBuckets) {
      const count = values.filter(v => v <= upperBound).length;
      buckets.push({ upperBound, count });
    }

    return {
      buckets,
      count: values.length,
      sum,
    };
  }

  /**
   * Get Prometheus metric type
   */
  private getPrometheusType(type: MetricType): string {
    switch (type) {
      case 'counter': return 'counter';
      case 'gauge': return 'gauge';
      case 'histogram': return 'histogram';
      case 'summary': return 'summary';
      case 'timer': return 'histogram';
      default: return 'gauge';
    }
  }

  /**
   * Format labels for Prometheus output
   */
  private formatPrometheusLabels(labels: MetricLabel): string {
    const pairs = Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    return pairs ? `{${pairs}}` : '';
  }

  /**
   * Flush metrics to external systems
   */
  private async flushMetrics(): Promise<void> {
    if (this.buffer.metrics.size === 0) {
      return;
    }

    const metricsToFlush = Array.from(this.buffer.metrics.values());
    
    // Send to Redis
    if (this.config.enableRedis && this.redis) {
      await this.sendMetricsToRedis(metricsToFlush);
    }

    // Send to Prometheus Gateway
    if (this.config.enablePrometheus && this.config.prometheusConfig) {
      await this.sendMetricsToPrometheus(metricsToFlush);
    }

    this.buffer.lastFlush = Date.now();
    this.emit('metrics_flushed', { count: metricsToFlush.length });
  }

  /**
   * Send metrics to Redis
   */
  private async sendMetricsToRedis(metrics: Metric[]): Promise<void> {
    if (!this.redis) return;

    try {
      const pipeline = this.redis.pipeline();
      const now = Date.now();

      for (const metric of metrics) {
        const key = `metric:${metric.name}`;
        pipeline.setex(key, 3600, JSON.stringify(metric)); // 1 hour TTL
        
        // Add to time series
        for (const value of metric.values) {
          const tsKey = `ts:${metric.name}`;
          pipeline.zadd(tsKey, value.timestamp, JSON.stringify(value));
          pipeline.expire(tsKey, this.config.retentionPeriod / 1000);
        }
      }

      await pipeline.exec();
    } catch (error) {
      console.error('Error sending metrics to Redis:', error);
    }
  }

  /**
   * Send metrics to Prometheus Gateway
   */
  private async sendMetricsToPrometheus(metrics: Metric[]): Promise<void> {
    try {
      const prometheusData = this.exportPrometheusFormat();
      
      // This would typically use a Prometheus client or HTTP request
      // For now, emit an event that can be handled by external service
      this.emit('prometheus_push', {
        data: prometheusData,
        gateway: this.config.prometheusConfig!.gateway,
        jobName: this.config.prometheusConfig!.jobName,
      });
    } catch (error) {
      console.error('Error sending metrics to Prometheus:', error);
    }
  }

  /**
   * Perform metric aggregation
   */
  private performAggregation(): void {
    for (const window of this.config.aggregationWindows) {
      const metrics = this.getAllMetrics();
      
      for (const metric of metrics) {
        const aggregated = this.getAggregatedMetrics(metric.name, window);
        
        if (aggregated.length > 0) {
          this.emit('metrics_aggregated', {
            metric: metric.name,
            window,
            aggregations: aggregated,
          });
        }
      }
    }
  }

  /**
   * Cleanup old metrics
   */
  async cleanup(): Promise<number> {
    const cutoff = Date.now() - this.config.retentionPeriod;
    let removedCount = 0;

    for (const [name, metric] of this.buffer.metrics.entries()) {
      const originalLength = metric.values.length;
      metric.values = metric.values.filter(v => v.timestamp > cutoff);
      removedCount += originalLength - metric.values.length;

      // Remove metric if no values left
      if (metric.values.length === 0) {
        this.buffer.metrics.delete(name);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Shutdown metrics collector
   */
  async shutdown(): Promise<void> {
    // Flush remaining metrics
    await this.flushMetrics();

    // Clear intervals
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }

    // Close Redis connection
    if (this.redis) {
      await this.redis.quit();
    }

    this.emit('shutdown');
  }
}

// Export singleton instance
export const metrics = MetricsCollector.getInstance({
  enableCollection: process.env.METRICS_ENABLED !== 'false',
  enableRedis: process.env.METRICS_REDIS === 'true',
  enablePrometheus: process.env.METRICS_PROMETHEUS === 'true',
  collectionInterval: parseInt(process.env.METRICS_COLLECTION_INTERVAL || '30000'), // 30 seconds
  retentionPeriod: parseInt(process.env.METRICS_RETENTION_PERIOD || '3600000'), // 1 hour
  maxMetricsInMemory: parseInt(process.env.METRICS_MAX_IN_MEMORY || '10000'),
  redisConfig: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_METRICS_DB || '14'),
  },
  prometheusConfig: process.env.PROMETHEUS_GATEWAY ? {
    gateway: process.env.PROMETHEUS_GATEWAY,
    jobName: process.env.PROMETHEUS_JOB_NAME || 'manufacturing-analytics',
    pushInterval: parseInt(process.env.PROMETHEUS_PUSH_INTERVAL || '60000'), // 1 minute
  } : undefined,
  defaultBuckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 600, 1800, 3600], // seconds
  aggregationWindows: [60, 300, 900, 3600], // 1min, 5min, 15min, 1hour
});