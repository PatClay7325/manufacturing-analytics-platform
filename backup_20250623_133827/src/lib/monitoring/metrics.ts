/**
 * Metrics Collector Service
 * Application metrics collection and monitoring
 */

import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MetricPoint {
  name: string;
  value: number;
  tags: Record<string, string>;
  timestamp: Date;
}

interface CounterMetric {
  name: string;
  value: number;
  tags: Record<string, string>;
}

interface GaugeMetric {
  name: string;
  value: number;
  tags: Record<string, string>;
}

interface HistogramMetric {
  name: string;
  values: number[];
  tags: Record<string, string>;
  buckets: number[];
}

export class MetricsCollector extends EventEmitter {
  private static instance: MetricsCollector;
  private counters: Map<string, CounterMetric>;
  private gauges: Map<string, GaugeMetric>;
  private histograms: Map<string, HistogramMetric>;
  private timers: Map<string, number>;
  private flushInterval: NodeJS.Timeout | null;
  private bufferSize: number;
  private buffer: MetricPoint[];

  constructor() {
    super();
    this.counters = new Map();
    this.gauges = new Map();
    this.histograms = new Map();
    this.timers = new Map();
    this.buffer = [];
    this.bufferSize = 1000;
    this.flushInterval = null;
    
    // Start periodic flush
    this.startPeriodicFlush();
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Increment a counter metric
   */
  increment(
    name: string,
    tags: Record<string, string> = {},
    value: number = 1
  ): void {
    const key = this.getMetricKey(name, tags);
    const counter = this.counters.get(key) || { name, value: 0, tags };
    counter.value += value;
    this.counters.set(key, counter);
    
    this.buffer.push({
      name: `counter.${name}`,
      value,
      tags,
      timestamp: new Date(),
    });
    
    this.checkBuffer();
  }

  /**
   * Decrement a counter metric
   */
  decrement(
    name: string,
    tags: Record<string, string> = {},
    value: number = 1
  ): void {
    this.increment(name, tags, -value);
  }

  /**
   * Set a gauge metric
   */
  gauge(
    name: string,
    value: number,
    tags: Record<string, string> = {}
  ): void {
    const key = this.getMetricKey(name, tags);
    this.gauges.set(key, { name, value, tags });
    
    this.buffer.push({
      name: `gauge.${name}`,
      value,
      tags,
      timestamp: new Date(),
    });
    
    this.checkBuffer();
  }

  /**
   * Record a histogram value
   */
  histogram(
    name: string,
    value: number,
    tags: Record<string, string> = {},
    buckets: number[] = [0.1, 0.5, 1, 5, 10, 50, 100, 500, 1000]
  ): void {
    const key = this.getMetricKey(name, tags);
    const histogram = this.histograms.get(key) || {
      name,
      values: [],
      tags,
      buckets,
    };
    
    histogram.values.push(value);
    this.histograms.set(key, histogram);
    
    this.buffer.push({
      name: `histogram.${name}`,
      value,
      tags,
      timestamp: new Date(),
    });
    
    this.checkBuffer();
  }

  /**
   * Start a timer
   */
  startTimer(name: string): string {
    const timerId = `${name}:${Date.now()}:${Math.random()}`;
    this.timers.set(timerId, Date.now());
    return timerId;
  }

  /**
   * End a timer and record the duration
   */
  endTimer(
    timerId: string,
    tags: Record<string, string> = {}
  ): void {
    const startTime = this.timers.get(timerId);
    if (!startTime) return;
    
    const duration = Date.now() - startTime;
    const name = timerId.split(':')[0];
    
    this.timing(name, duration, tags);
    this.timers.delete(timerId);
  }

  /**
   * Record a timing metric
   */
  timing(
    name: string,
    duration: number,
    tags: Record<string, string> = {}
  ): void {
    this.histogram(`${name}.duration`, duration, tags);
    
    this.buffer.push({
      name: `timing.${name}`,
      value: duration,
      tags,
      timestamp: new Date(),
    });
    
    this.checkBuffer();
  }

  /**
   * Record application performance metrics
   */
  recordPerformance(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      this.gauge('app.memory.heap_used', memory.heapUsed);
      this.gauge('app.memory.heap_total', memory.heapTotal);
      this.gauge('app.memory.rss', memory.rss);
      this.gauge('app.memory.external', memory.external || 0);
    }

    if (typeof process !== 'undefined' && process.cpuUsage) {
      const cpu = process.cpuUsage();
      this.gauge('app.cpu.user', cpu.user);
      this.gauge('app.cpu.system', cpu.system);
    }
  }

  /**
   * Get current metrics snapshot
   */
  getSnapshot(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    histograms: Record<string, any>;
  } {
    const counters: Record<string, number> = {};
    const gauges: Record<string, number> = {};
    const histograms: Record<string, any> = {};

    this.counters.forEach((counter, key) => {
      counters[key] = counter.value;
    });

    this.gauges.forEach((gauge, key) => {
      gauges[key] = gauge.value;
    });

    this.histograms.forEach((histogram, key) => {
      const values = histogram.values;
      const sorted = [...values].sort((a, b) => a - b);
      
      histograms[key] = {
        count: values.length,
        min: sorted[0] || 0,
        max: sorted[sorted.length - 1] || 0,
        mean: values.reduce((a, b) => a + b, 0) / values.length || 0,
        p50: this.percentile(sorted, 0.5),
        p95: this.percentile(sorted, 0.95),
        p99: this.percentile(sorted, 0.99),
      };
    });

    return { counters, gauges, histograms };
  }

  /**
   * Flush metrics to storage
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const metrics = [...this.buffer];
    this.buffer = [];

    try {
      // Batch insert metrics
      await prisma.applicationMetric.createMany({
        data: metrics.map(metric => ({
          name: metric.name,
          value: metric.value,
          tags: JSON.stringify(metric.tags),
          timestamp: metric.timestamp,
        })),
      });
      
      this.emit('metrics:flushed', { count: metrics.length });
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Re-add to buffer (limit to prevent memory issues)
      if (this.buffer.length < this.bufferSize * 2) {
        this.buffer.unshift(...metrics);
      }
    }
  }

  /**
   * Check if buffer should be flushed
   */
  private checkBuffer(): void {
    if (this.buffer.length >= this.bufferSize) {
      this.flush().catch(err => console.error('Flush error:', err));
    }
  }

  /**
   * Start periodic flush
   */
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(async () => {
      await this.flush();
      this.recordPerformance();
    }, 10000); // Flush every 10 seconds
  }

  /**
   * Get metric key
   */
  private getMetricKey(
    name: string,
    tags: Record<string, string>
  ): string {
    const tagPairs = Object.entries(tags)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join(',');
    
    return tagPairs ? `${name}{${tagPairs}}` : name;
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get metrics for time range
   */
  async getMetrics(
    name: string,
    startTime: Date,
    endTime: Date,
    tags?: Record<string, string>
  ): Promise<MetricPoint[]> {
    const where: any = {
      name: { contains: name },
      timestamp: {
        gte: startTime,
        lte: endTime,
      },
    };

    if (tags) {
      where.tags = JSON.stringify(tags);
    }

    const metrics = await prisma.applicationMetric.findMany({
      where,
      orderBy: { timestamp: 'asc' },
    });

    return metrics.map(m => ({
      name: m.name,
      value: m.value,
      tags: JSON.parse(m.tags),
      timestamp: m.timestamp,
    }));
  }

  /**
   * Cleanup old metrics
   */
  async cleanup(retentionDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.applicationMetric.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });

    return result.count;
  }

  /**
   * Shutdown cleanup
   */
  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }
}

// Export singleton instance
export const metricsCollector = MetricsCollector.getInstance();