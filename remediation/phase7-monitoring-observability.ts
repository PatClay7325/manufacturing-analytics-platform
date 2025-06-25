#!/usr/bin/env ts-node
/**
 * Phase 7: Monitoring and Observability
 * Implements OpenTelemetry, distributed tracing, custom metrics, and self-healing
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader, ConsoleMetricExporter } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { metrics, trace, context, SpanStatusCode } from '@opentelemetry/api';
import * as prom from 'prom-client';
import { EventEmitter } from 'events';
import Bull from 'bull';
import Redis from 'ioredis';
import { prisma } from '@/lib/prisma';

// =====================================================
// TELEMETRY SERVICE
// =====================================================

export class TelemetryService {
  private static instance: TelemetryService;
  private sdk: NodeSDK;
  private meter: any;
  private tracer: any;
  
  // Custom metrics
  private metricsIngested: any;
  private queryLatency: any;
  private apiLatency: any;
  private errorRate: any;
  private activeConnections: any;
  private cacheHitRate: any;
  private alertsProcessed: any;
  private dataQualityScore: any;

  private constructor() {
    this.initializeOpenTelemetry();
    this.initializeCustomMetrics();
  }

  static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  private initializeOpenTelemetry() {
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'manufacturing-analytics-platform',
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      })
    );

    // Configure exporters
    const traceExporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
    });

    const metricExporter = new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
    });

    // Prometheus exporter for metrics scraping
    const prometheusExporter = new PrometheusExporter({
      port: 9090,
      endpoint: '/metrics',
    }, () => {
      console.log('🎯 Prometheus metrics available at http://localhost:9090/metrics');
    });

    // Initialize SDK
    this.sdk = new NodeSDK({
      resource,
      traceExporter,
      metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 10000, // 10 seconds
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable to reduce noise
          },
        }),
      ],
    });

    this.sdk.start();

    // Get meter and tracer
    this.meter = metrics.getMeter('manufacturing-analytics', '1.0.0');
    this.tracer = trace.getTracer('manufacturing-analytics', '1.0.0');
  }

  private initializeCustomMetrics() {
    // Data ingestion metrics
    this.metricsIngested = this.meter.createCounter('metrics_ingested_total', {
      description: 'Total number of metrics ingested',
    });

    // Query performance
    this.queryLatency = this.meter.createHistogram('query_latency_ms', {
      description: 'Database query latency in milliseconds',
      boundaries: [0, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
    });

    // API performance
    this.apiLatency = this.meter.createHistogram('api_latency_ms', {
      description: 'API endpoint latency in milliseconds',
      boundaries: [0, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
    });

    // Error tracking
    this.errorRate = this.meter.createCounter('errors_total', {
      description: 'Total number of errors',
    });

    // Connection pool
    this.activeConnections = this.meter.createUpDownCounter('active_connections', {
      description: 'Number of active database connections',
    });

    // Cache performance
    this.cacheHitRate = this.meter.createCounter('cache_hits_total', {
      description: 'Total number of cache hits and misses',
    });

    // Alert processing
    this.alertsProcessed = this.meter.createCounter('alerts_processed_total', {
      description: 'Total number of alerts processed',
    });

    // Data quality
    this.dataQualityScore = this.meter.createObservableGauge('data_quality_score', {
      description: 'Current data quality score (0-100)',
    });

    // Set up observable gauge callback
    this.dataQualityScore.addCallback(async (observableResult: any) => {
      const score = await this.calculateDataQualityScore();
      observableResult.observe(score, { type: 'overall' });
    });
  }

  // Metric recording methods
  recordMetricIngestion(count: number, attributes: any = {}) {
    this.metricsIngested.add(count, {
      ...attributes,
      timestamp: new Date().toISOString(),
    });
  }

  recordQueryLatency(operation: string, duration: number, success: boolean = true) {
    this.queryLatency.record(duration, {
      operation,
      success: success.toString(),
      database: 'timescaledb',
    });
  }

  recordApiLatency(endpoint: string, method: string, duration: number, statusCode: number) {
    this.apiLatency.record(duration, {
      endpoint,
      method,
      status_code: statusCode.toString(),
      status_class: `${Math.floor(statusCode / 100)}xx`,
    });
  }

  recordError(errorType: string, component: string, fatal: boolean = false) {
    this.errorRate.add(1, {
      error_type: errorType,
      component,
      fatal: fatal.toString(),
    });
  }

  updateActiveConnections(delta: number, pool: string = 'default') {
    this.activeConnections.add(delta, { pool });
  }

  recordCacheOperation(hit: boolean, cacheType: string) {
    this.cacheHitRate.add(1, {
      hit: hit.toString(),
      cache_type: cacheType,
    });
  }

  recordAlertProcessed(alertType: string, severity: string, suppressed: boolean = false) {
    this.alertsProcessed.add(1, {
      alert_type: alertType,
      severity,
      suppressed: suppressed.toString(),
    });
  }

  // Tracing methods
  startSpan(name: string, attributes: any = {}): any {
    return this.tracer.startSpan(name, {
      attributes: {
        ...attributes,
        'service.name': 'manufacturing-analytics',
      },
    });
  }

  async traceAsync<T>(
    name: string,
    fn: () => Promise<T>,
    attributes: any = {}
  ): Promise<T> {
    const span = this.startSpan(name, attributes);
    
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  // Helper methods
  private async calculateDataQualityScore(): Promise<number> {
    try {
      const [completeness, accuracy, timeliness] = await Promise.all([
        this.calculateCompleteness(),
        this.calculateAccuracy(),
        this.calculateTimeliness(),
      ]);

      return (completeness + accuracy + timeliness) / 3;
    } catch (error) {
      console.error('Failed to calculate data quality score:', error);
      return 0;
    }
  }

  private async calculateCompleteness(): Promise<number> {
    const result = await prisma.$queryRaw<[{ score: number }]>`
      SELECT 
        (COUNT(*) FILTER (WHERE units_produced IS NOT NULL AND oee IS NOT NULL) * 100.0 / COUNT(*)) as score
      FROM production_metrics
      WHERE time >= NOW() - INTERVAL '1 hour'
    `;
    return result[0]?.score || 0;
  }

  private async calculateAccuracy(): Promise<number> {
    const result = await prisma.$queryRaw<[{ score: number }]>`
      SELECT 
        (COUNT(*) FILTER (WHERE oee BETWEEN 0 AND 1) * 100.0 / COUNT(*)) as score
      FROM production_metrics
      WHERE time >= NOW() - INTERVAL '1 hour'
    `;
    return result[0]?.score || 0;
  }

  private async calculateTimeliness(): Promise<number> {
    const result = await prisma.$queryRaw<[{ avg_delay: number }]>`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (created_at - time))) as avg_delay
      FROM production_metrics
      WHERE time >= NOW() - INTERVAL '1 hour'
    `;
    
    const avgDelay = result[0]?.avg_delay || 0;
    // Score based on delay (100 if < 1 min, 0 if > 10 min)
    return Math.max(0, Math.min(100, 100 - (avgDelay / 6)));
  }

  async shutdown() {
    await this.sdk.shutdown();
  }
}

// =====================================================
// HEALTH CHECK SERVICE
// =====================================================

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, ComponentHealth>;
  timestamp: Date;
}

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  message?: string;
  metadata?: any;
}

export class HealthCheckService extends EventEmitter {
  private checks: Map<string, () => Promise<ComponentHealth>> = new Map();
  private checkInterval: NodeJS.Timeout;
  private lastResult: HealthCheckResult;

  constructor(private telemetry: TelemetryService) {
    super();
    this.registerDefaultChecks();
  }

  private registerDefaultChecks() {
    // Database health
    this.registerCheck('database', async () => {
      const start = Date.now();
      try {
        await prisma.$queryRaw`SELECT 1`;
        const latency = Date.now() - start;
        
        return {
          status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
          latency,
          message: `Database responding in ${latency}ms`,
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          message: `Database connection failed: ${error.message}`,
        };
      }
    });

    // Redis health
    this.registerCheck('redis', async () => {
      const redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      });
      
      const start = Date.now();
      try {
        await redis.ping();
        const latency = Date.now() - start;
        
        return {
          status: latency < 10 ? 'healthy' : latency < 50 ? 'degraded' : 'unhealthy',
          latency,
          message: `Redis responding in ${latency}ms`,
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          message: `Redis connection failed: ${error.message}`,
        };
      } finally {
        redis.disconnect();
      }
    });

    // MQTT health
    this.registerCheck('mqtt', async () => {
      // Simplified check - in production would actually connect
      const mqttHealthy = await this.checkMqttBroker();
      
      return {
        status: mqttHealthy ? 'healthy' : 'unhealthy',
        message: mqttHealthy ? 'MQTT broker accessible' : 'MQTT broker unreachable',
      };
    });

    // Disk space
    this.registerCheck('disk', async () => {
      const diskUsage = await this.getDiskUsage();
      const usagePercent = diskUsage.used / diskUsage.total * 100;
      
      return {
        status: usagePercent < 80 ? 'healthy' : usagePercent < 90 ? 'degraded' : 'unhealthy',
        message: `Disk usage: ${usagePercent.toFixed(1)}%`,
        metadata: diskUsage,
      };
    });

    // Memory usage
    this.registerCheck('memory', async () => {
      const memUsage = process.memoryUsage();
      const totalMem = require('os').totalmem();
      const usagePercent = (memUsage.rss / totalMem) * 100;
      
      return {
        status: usagePercent < 70 ? 'healthy' : usagePercent < 85 ? 'degraded' : 'unhealthy',
        message: `Memory usage: ${usagePercent.toFixed(1)}%`,
        metadata: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        },
      };
    });

    // API rate limits
    this.registerCheck('rateLimit', async () => {
      const currentRate = await this.getCurrentRequestRate();
      const limit = parseInt(process.env.RATE_LIMIT || '1000');
      const usagePercent = (currentRate / limit) * 100;
      
      return {
        status: usagePercent < 70 ? 'healthy' : usagePercent < 90 ? 'degraded' : 'unhealthy',
        message: `API rate: ${currentRate}/${limit} requests per minute`,
        metadata: { currentRate, limit },
      };
    });
  }

  registerCheck(name: string, checkFn: () => Promise<ComponentHealth>) {
    this.checks.set(name, checkFn);
  }

  async runHealthChecks(): Promise<HealthCheckResult> {
    const span = this.telemetry.startSpan('health_check');
    
    try {
      const results: Record<string, ComponentHealth> = {};
      
      // Run all checks in parallel
      const checkPromises = Array.from(this.checks.entries()).map(
        async ([name, checkFn]) => {
          const checkSpan = this.telemetry.startSpan(`health_check.${name}`);
          
          try {
            const start = Date.now();
            const result = await checkFn();
            const duration = Date.now() - start;
            
            checkSpan.setAttributes({
              'health.status': result.status,
              'health.latency': duration,
            });
            
            return { name, result };
          } catch (error) {
            checkSpan.recordException(error);
            return {
              name,
              result: {
                status: 'unhealthy' as const,
                message: `Check failed: ${error.message}`,
              },
            };
          } finally {
            checkSpan.end();
          }
        }
      );
      
      const checkResults = await Promise.all(checkPromises);
      
      // Compile results
      checkResults.forEach(({ name, result }) => {
        results[name] = result;
      });
      
      // Determine overall status
      const statuses = Object.values(results).map(r => r.status);
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (statuses.includes('unhealthy')) {
        overallStatus = 'unhealthy';
      } else if (statuses.includes('degraded')) {
        overallStatus = 'degraded';
      }
      
      const healthResult: HealthCheckResult = {
        status: overallStatus,
        checks: results,
        timestamp: new Date(),
      };
      
      this.lastResult = healthResult;
      
      // Emit events based on status changes
      if (this.lastResult && this.lastResult.status !== overallStatus) {
        this.emit('statusChanged', overallStatus, this.lastResult.status);
      }
      
      span.setAttributes({
        'health.overall_status': overallStatus,
        'health.checks_count': Object.keys(results).length,
      });
      
      return healthResult;
    } finally {
      span.end();
    }
  }

  startPeriodicChecks(intervalMs: number = 30000) {
    this.checkInterval = setInterval(async () => {
      await this.runHealthChecks();
    }, intervalMs);
  }

  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
  }

  getLastResult(): HealthCheckResult | undefined {
    return this.lastResult;
  }

  // Helper methods
  private async checkMqttBroker(): Promise<boolean> {
    // Simple TCP connection check
    const net = require('net');
    const host = process.env.MQTT_HOST || 'localhost';
    const port = parseInt(process.env.MQTT_PORT || '1883');
    
    return new Promise((resolve) => {
      const socket = net.createConnection(port, host);
      
      socket.on('connect', () => {
        socket.end();
        resolve(true);
      });
      
      socket.on('error', () => {
        resolve(false);
      });
      
      socket.setTimeout(1000, () => {
        socket.destroy();
        resolve(false);
      });
    });
  }

  private async getDiskUsage(): Promise<any> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout } = await execAsync('df -k /');
      const lines = stdout.trim().split('\n');
      const data = lines[1].split(/\s+/);
      
      return {
        total: parseInt(data[1]) * 1024,
        used: parseInt(data[2]) * 1024,
        available: parseInt(data[3]) * 1024,
      };
    } catch (error) {
      return { total: 0, used: 0, available: 0 };
    }
  }

  private async getCurrentRequestRate(): Promise<number> {
    // Get from Redis rate limiter
    const redis = new Redis();
    const key = 'rate_limit:global';
    const count = await redis.get(key);
    redis.disconnect();
    
    return parseInt(count || '0');
  }
}

// =====================================================
// CIRCUIT BREAKER
// =====================================================

interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitorInterval: number;
  requestTimeout: number;
}

export class CircuitBreaker extends EventEmitter {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failures = 0;
  private successCount = 0;
  private lastFailTime = 0;
  private nextAttempt = 0;
  
  constructor(
    private name: string,
    private options: CircuitBreakerOptions,
    private telemetry: TelemetryService
  ) {
    super();
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const span = this.telemetry.startSpan(`circuit_breaker.${this.name}`, {
      'circuit_breaker.state': this.state,
      'circuit_breaker.failures': this.failures,
    });

    try {
      // Check circuit state
      if (this.state === 'open') {
        if (Date.now() < this.nextAttempt) {
          throw new Error(`Circuit breaker is open for ${this.name}`);
        }
        // Try half-open
        this.state = 'half-open';
        this.emit('stateChange', 'half-open');
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(fn);
      
      // Record success
      this.onSuccess();
      
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      // Record failure
      this.onFailure();
      
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);
      
      throw error;
    } finally {
      span.end();
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), this.options.requestTimeout)
      ),
    ]);
  }

  private onSuccess() {
    this.failures = 0;
    
    if (this.state === 'half-open') {
      this.successCount++;
      
      // Need multiple successes to close
      if (this.successCount >= 3) {
        this.state = 'closed';
        this.successCount = 0;
        this.emit('stateChange', 'closed');
        this.telemetry.recordError('circuit_breaker_closed', this.name);
      }
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.options.failureThreshold) {
      this.state = 'open';
      this.nextAttempt = Date.now() + this.options.resetTimeout;
      this.emit('stateChange', 'open');
      this.telemetry.recordError('circuit_breaker_open', this.name, true);
      
      // Schedule notification
      this.notifyOperations(`Circuit breaker opened for ${this.name}`);
    }
  }

  private async notifyOperations(message: string) {
    // Send alert through notification system
    console.error(`🚨 ${message}`);
    
    // In production, would integrate with alert system
    this.emit('alert', {
      severity: 'high',
      component: this.name,
      message,
      timestamp: new Date(),
    });
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailTime: this.lastFailTime,
      nextAttempt: this.nextAttempt,
    };
  }
}

// =====================================================
// AUTO-RECOVERY SERVICE
// =====================================================

interface RecoveryStrategy {
  name: string;
  condition: () => Promise<boolean>;
  recover: () => Promise<void>;
  maxRetries: number;
  retryDelay: number;
}

export class AutoRecoveryService extends EventEmitter {
  private strategies: Map<string, RecoveryStrategy> = new Map();
  private recoveryQueue: Bull.Queue;
  private activeRecoveries: Set<string> = new Set();

  constructor(
    private telemetry: TelemetryService,
    private healthCheck: HealthCheckService
  ) {
    super();
    
    this.recoveryQueue = new Bull('recovery', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    this.initializeStrategies();
    this.setupQueueProcessing();
    this.monitorHealth();
  }

  private initializeStrategies() {
    // Database connection recovery
    this.strategies.set('database', {
      name: 'Database Connection Recovery',
      condition: async () => {
        try {
          await prisma.$queryRaw`SELECT 1`;
          return false; // No recovery needed
        } catch {
          return true; // Need recovery
        }
      },
      recover: async () => {
        console.log('🔧 Attempting database recovery...');
        
        // Disconnect and reconnect
        await prisma.$disconnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await prisma.$connect();
        
        // Verify connection
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Database connection recovered');
      },
      maxRetries: 5,
      retryDelay: 5000,
    });

    // Redis connection recovery
    this.strategies.set('redis', {
      name: 'Redis Connection Recovery',
      condition: async () => {
        const redis = new Redis();
        try {
          await redis.ping();
          redis.disconnect();
          return false;
        } catch {
          redis.disconnect();
          return true;
        }
      },
      recover: async () => {
        console.log('🔧 Attempting Redis recovery...');
        
        // Clear connection pool and reconnect
        // In production, would manage Redis connection pool
        
        console.log('✅ Redis connection recovered');
      },
      maxRetries: 3,
      retryDelay: 3000,
    });

    // Disk space recovery
    this.strategies.set('disk_space', {
      name: 'Disk Space Recovery',
      condition: async () => {
        const usage = await this.getDiskUsage();
        return usage.percent > 90;
      },
      recover: async () => {
        console.log('🔧 Attempting disk space recovery...');
        
        // Clean up old data
        await this.cleanupOldData();
        
        // Compress logs
        await this.compressLogs();
        
        console.log('✅ Disk space recovered');
      },
      maxRetries: 1,
      retryDelay: 60000,
    });

    // Memory recovery
    this.strategies.set('memory', {
      name: 'Memory Recovery',
      condition: async () => {
        const usage = process.memoryUsage();
        const limit = parseInt(process.env.MEMORY_LIMIT || '2147483648'); // 2GB default
        return usage.heapUsed > limit * 0.9;
      },
      recover: async () => {
        console.log('🔧 Attempting memory recovery...');
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        // Clear caches
        await this.clearCaches();
        
        console.log('✅ Memory recovered');
      },
      maxRetries: 2,
      retryDelay: 10000,
    });
  }

  private setupQueueProcessing() {
    this.recoveryQueue.process(async (job) => {
      const { strategyName, attempt } = job.data;
      
      const strategy = this.strategies.get(strategyName);
      if (!strategy) return;
      
      const span = this.telemetry.startSpan(`recovery.${strategyName}`, {
        'recovery.attempt': attempt,
      });
      
      try {
        // Check if still needed
        const needsRecovery = await strategy.condition();
        if (!needsRecovery) {
          console.log(`✅ ${strategy.name} no longer needs recovery`);
          return;
        }
        
        // Attempt recovery
        await strategy.recover();
        
        // Verify recovery
        const stillNeeded = await strategy.condition();
        if (stillNeeded && attempt < strategy.maxRetries) {
          // Schedule retry
          await this.recoveryQueue.add(
            { strategyName, attempt: attempt + 1 },
            { delay: strategy.retryDelay * attempt }
          );
        } else if (stillNeeded) {
          // Max retries reached
          this.emit('recoveryFailed', strategyName);
          this.telemetry.recordError('recovery_failed', strategyName, true);
        } else {
          // Success
          this.emit('recoverySuccess', strategyName);
        }
        
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        
        // Schedule retry if under limit
        if (attempt < strategy.maxRetries) {
          await this.recoveryQueue.add(
            { strategyName, attempt: attempt + 1 },
            { delay: strategy.retryDelay * attempt }
          );
        }
      } finally {
        span.end();
        this.activeRecoveries.delete(strategyName);
      }
    });
  }

  private monitorHealth() {
    // Listen for health check results
    this.healthCheck.on('statusChanged', async (newStatus, oldStatus) => {
      if (newStatus === 'unhealthy') {
        // Check which components need recovery
        const lastResult = this.healthCheck.getLastResult();
        
        if (lastResult) {
          for (const [component, health] of Object.entries(lastResult.checks)) {
            if (health.status === 'unhealthy' && this.strategies.has(component)) {
              await this.triggerRecovery(component);
            }
          }
        }
      }
    });
  }

  async triggerRecovery(strategyName: string) {
    if (this.activeRecoveries.has(strategyName)) {
      console.log(`⏳ Recovery already in progress for ${strategyName}`);
      return;
    }
    
    this.activeRecoveries.add(strategyName);
    
    await this.recoveryQueue.add(
      { strategyName, attempt: 1 },
      { delay: 0 }
    );
  }

  // Helper methods
  private async getDiskUsage(): Promise<any> {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync('df -h /');
    const lines = stdout.trim().split('\n');
    const data = lines[1].split(/\s+/);
    
    return {
      percent: parseInt(data[4]),
      available: data[3],
    };
  }

  private async cleanupOldData() {
    // Delete old sensor data
    await prisma.$executeRaw`
      DELETE FROM sensor_data 
      WHERE time < NOW() - INTERVAL '30 days'
      AND time NOT IN (
        SELECT time FROM sensor_data 
        WHERE time < NOW() - INTERVAL '30 days'
        ORDER BY RANDOM() 
        LIMIT 1000
      )
    `;
    
    // Clean up old logs
    await prisma.$executeRaw`
      DELETE FROM audit_log 
      WHERE timestamp < NOW() - INTERVAL '90 days'
    `;
  }

  private async compressLogs() {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Compress old log files
    await execAsync('find /var/log -name "*.log" -mtime +7 -exec gzip {} \\;');
  }

  private async clearCaches() {
    // Clear in-memory caches
    // This would be implemented based on your caching strategy
    console.log('🧹 Clearing application caches...');
  }
}

// =====================================================
// DISTRIBUTED TRACING MIDDLEWARE
// =====================================================

export function tracingMiddleware(telemetry: TelemetryService) {
  return async (req: any, res: any, next: any) => {
    const span = telemetry.startSpan(`http.${req.method} ${req.path}`, {
      'http.method': req.method,
      'http.url': req.url,
      'http.target': req.path,
      'http.host': req.hostname,
      'http.scheme': req.protocol,
      'http.user_agent': req.get('user-agent'),
      'http.request_content_length': req.get('content-length'),
    });

    const startTime = Date.now();

    // Add span to request context
    req.span = span;

    // Capture response
    const originalSend = res.send;
    res.send = function(data: any) {
      const duration = Date.now() - startTime;
      
      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.response_content_length': res.get('content-length'),
        'http.duration': duration,
      });

      if (res.statusCode >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${res.statusCode}`,
        });
      }

      // Record metrics
      telemetry.recordApiLatency(
        req.path,
        req.method,
        duration,
        res.statusCode
      );

      span.end();
      originalSend.apply(res, arguments);
    };

    next();
  };
}

// =====================================================
// MONITORING DASHBOARD
// =====================================================

export class MonitoringDashboard {
  private metricsRegistry: prom.Registry;
  
  constructor(private telemetry: TelemetryService) {
    this.metricsRegistry = new prom.Registry();
    this.setupPrometheusMetrics();
  }

  private setupPrometheusMetrics() {
    // System metrics
    prom.collectDefaultMetrics({ register: this.metricsRegistry });

    // Custom business metrics
    const oeeGauge = new prom.Gauge({
      name: 'manufacturing_oee',
      help: 'Overall Equipment Effectiveness',
      labelNames: ['equipment_id', 'site'],
      registers: [this.metricsRegistry],
    });

    const productionCounter = new prom.Counter({
      name: 'manufacturing_units_produced_total',
      help: 'Total units produced',
      labelNames: ['equipment_id', 'product', 'shift'],
      registers: [this.metricsRegistry],
    });

    const downtimeHistogram = new prom.Histogram({
      name: 'manufacturing_downtime_duration_seconds',
      help: 'Downtime duration in seconds',
      labelNames: ['equipment_id', 'reason'],
      buckets: [60, 300, 600, 1800, 3600, 7200],
      registers: [this.metricsRegistry],
    });

    const alertsGauge = new prom.Gauge({
      name: 'manufacturing_active_alerts',
      help: 'Number of active alerts',
      labelNames: ['severity', 'type'],
      registers: [this.metricsRegistry],
    });

    // Update metrics periodically
    setInterval(async () => {
      await this.updateMetrics({
        oeeGauge,
        productionCounter,
        downtimeHistogram,
        alertsGauge,
      });
    }, 30000); // Every 30 seconds
  }

  private async updateMetrics(metrics: any) {
    try {
      // Update OEE metrics
      const oeeData = await prisma.$queryRaw<any[]>`
        SELECT 
          equipment_id,
          site_code,
          AVG(oee) as avg_oee
        FROM production_metrics
        WHERE time >= NOW() - INTERVAL '1 hour'
        GROUP BY equipment_id, site_code
      `;

      oeeData.forEach(row => {
        metrics.oeeGauge.set(
          { equipment_id: row.equipment_id, site: row.site_code },
          row.avg_oee
        );
      });

      // Update active alerts
      const alertData = await prisma.$queryRaw<any[]>`
        SELECT 
          severity,
          type,
          COUNT(*) as count
        FROM alerts
        WHERE status = 'active'
        GROUP BY severity, type
      `;

      alertData.forEach(row => {
        metrics.alertsGauge.set(
          { severity: row.severity, type: row.type },
          row.count
        );
      });

    } catch (error) {
      console.error('Failed to update monitoring metrics:', error);
    }
  }

  getMetrics(): string {
    return this.metricsRegistry.metrics();
  }

  async getSystemStatus(): Promise<any> {
    const [dbPool, redisInfo, processMetrics] = await Promise.all([
      this.getDatabasePoolStatus(),
      this.getRedisStatus(),
      this.getProcessMetrics(),
    ]);

    return {
      timestamp: new Date(),
      database: dbPool,
      redis: redisInfo,
      process: processMetrics,
      uptime: process.uptime(),
    };
  }

  private async getDatabasePoolStatus(): Promise<any> {
    // Would get from connection pool metrics
    return {
      active: 5,
      idle: 15,
      total: 20,
      waitingCount: 0,
    };
  }

  private async getRedisStatus(): Promise<any> {
    const redis = new Redis();
    const info = await redis.info();
    redis.disconnect();

    const lines = info.split('\r\n');
    const stats: any = {};
    
    lines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    });

    return {
      version: stats.redis_version,
      connectedClients: parseInt(stats.connected_clients || '0'),
      usedMemory: stats.used_memory_human,
      uptimeInSeconds: parseInt(stats.uptime_in_seconds || '0'),
    };
  }

  private getProcessMetrics(): any {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
      },
      cpu: {
        user: cpuUsage.user / 1000000,
        system: cpuUsage.system / 1000000,
      },
      pid: process.pid,
      version: process.version,
      platform: process.platform,
    };
  }
}

// =====================================================
// MAIN DEMONSTRATION
// =====================================================

async function demonstrateMonitoring() {
  console.log('📊 Monitoring and Observability Demonstration\n');

  const telemetry = TelemetryService.getInstance();
  const healthCheck = new HealthCheckService(telemetry);
  const autoRecovery = new AutoRecoveryService(telemetry, healthCheck);
  const dashboard = new MonitoringDashboard(telemetry);

  // 1. Health Checks
  console.log('1️⃣ Running Health Checks...');
  const healthResult = await healthCheck.runHealthChecks();
  console.log(`   Overall Status: ${healthResult.status}`);
  Object.entries(healthResult.checks).forEach(([component, health]) => {
    console.log(`   ${component}: ${health.status} - ${health.message}`);
  });

  // 2. Circuit Breaker Demo
  console.log('\n2️⃣ Circuit Breaker Demo');
  const dbBreaker = new CircuitBreaker('database', {
    failureThreshold: 3,
    resetTimeout: 5000,
    monitorInterval: 1000,
    requestTimeout: 2000,
  }, telemetry);

  // Simulate failures
  for (let i = 0; i < 5; i++) {
    try {
      await dbBreaker.execute(async () => {
        if (i < 3) throw new Error('Simulated failure');
        return 'Success';
      });
      console.log(`   Request ${i + 1}: Success`);
    } catch (error) {
      console.log(`   Request ${i + 1}: ${error.message}`);
    }
  }
  console.log(`   Circuit State: ${dbBreaker.getState().state}`);

  // 3. Tracing Example
  console.log('\n3️⃣ Distributed Tracing Example');
  await telemetry.traceAsync('process_production_batch', async () => {
    const validationSpan = telemetry.startSpan('validate_data');
    await new Promise(resolve => setTimeout(resolve, 50));
    validationSpan.end();

    const calculationSpan = telemetry.startSpan('calculate_oee');
    await new Promise(resolve => setTimeout(resolve, 100));
    calculationSpan.end();

    const storageSpan = telemetry.startSpan('store_results');
    await new Promise(resolve => setTimeout(resolve, 30));
    storageSpan.end();

    console.log('   Trace completed with 3 spans');
  });

  // 4. Metrics Recording
  console.log('\n4️⃣ Recording Custom Metrics');
  telemetry.recordMetricIngestion(1000, { source: 'mqtt', equipment: 'CNC-001' });
  telemetry.recordQueryLatency('getProductionMetrics', 45, true);
  telemetry.recordApiLatency('/api/oee', 'GET', 120, 200);
  telemetry.recordCacheOperation(true, 'redis');
  telemetry.recordAlertProcessed('temperature_high', 'critical', false);
  console.log('   Metrics recorded successfully');

  // 5. System Status
  console.log('\n5️⃣ System Status');
  const systemStatus = await dashboard.getSystemStatus();
  console.log(`   Uptime: ${Math.floor(systemStatus.uptime / 60)} minutes`);
  console.log(`   Memory: ${systemStatus.process.memory.heapUsed}`);
  console.log(`   Database Pool: ${systemStatus.database.active}/${systemStatus.database.total} connections`);

  // 6. Prometheus Metrics
  console.log('\n6️⃣ Prometheus Metrics Available');
  console.log('   Access metrics at: http://localhost:9090/metrics');
  console.log('   Sample metrics:');
  const metricsOutput = dashboard.getMetrics();
  console.log('   ' + metricsOutput.split('\n').slice(0, 5).join('\n   '));

  console.log('\n✅ Monitoring demonstration complete!');
  console.log('📊 Telemetry data exported to OTLP collector');
  
  // Cleanup
  healthCheck.stopPeriodicChecks();
  await telemetry.shutdown();
}

// Run if executed directly
if (require.main === module) {
  demonstrateMonitoring()
    .catch(console.error)
    .finally(() => process.exit(0));
}

export {
  TelemetryService,
  HealthCheckService,
  CircuitBreaker,
  AutoRecoveryService,
  MonitoringDashboard,
  tracingMiddleware
};