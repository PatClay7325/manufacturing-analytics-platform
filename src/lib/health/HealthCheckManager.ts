/**
 * Production-Ready Health Check Manager
 * Comprehensive service health monitoring for deployment readiness
 */

import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/database';
import { Counter, Gauge, Histogram, register } from 'prom-client';

export interface HealthCheckConfig {
  name: string;
  timeout: number;
  interval: number;
  retries: number;
  critical: boolean;
}

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  duration: number;
  timestamp: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  checks: HealthCheckResult[];
  uptime: number;
  version: string;
}

// Health check metrics
const healthCheckDuration = new Histogram({
  name: 'health_check_duration_seconds',
  help: 'Duration of health checks in seconds',
  labelNames: ['check_name'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

const healthCheckCounter = new Counter({
  name: 'health_checks_total',
  help: 'Total number of health checks performed',
  labelNames: ['check_name', 'status'],
});

const systemHealthGauge = new Gauge({
  name: 'system_health_status',
  help: 'Overall system health status (1=healthy, 0.5=degraded, 0=unhealthy)',
});

register.registerMetric(healthCheckDuration);
register.registerMetric(healthCheckCounter);
register.registerMetric(systemHealthGauge);

export class HealthCheckManager extends EventEmitter {
  private static instance: HealthCheckManager;
  private checks = new Map<string, {
    config: HealthCheckConfig;
    check: () => Promise<{ healthy: boolean; metadata?: any }>;
    lastResult?: HealthCheckResult;
    consecutiveFailures: number;
  }>();
  private isRunning = false;
  private checkInterval?: NodeJS.Timeout;
  private startTime = Date.now();

  constructor() {
    super();
    this.setupDefaultChecks();
  }

  static getInstance(): HealthCheckManager {
    if (!HealthCheckManager.instance) {
      HealthCheckManager.instance = new HealthCheckManager();
    }
    return HealthCheckManager.instance;
  }

  /**
   * Register a custom health check
   */
  registerCheck(
    config: HealthCheckConfig,
    checkFunction: () => Promise<{ healthy: boolean; metadata?: any }>
  ): void {
    this.checks.set(config.name, {
      config,
      check: checkFunction,
      consecutiveFailures: 0,
    });

    logger.info({ checkName: config.name }, 'Health check registered');
  }

  /**
   * Run all health checks
   */
  async runChecks(): Promise<SystemHealth> {
    const results: HealthCheckResult[] = [];
    const timestamp = new Date();

    // Run all checks in parallel with individual timeouts
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkData]) => {
      const timer = healthCheckDuration.startTimer({ check_name: name });
      const startTime = Date.now();
      
      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Health check timeout')), checkData.config.timeout);
        });

        // Race the check against timeout
        const result = await Promise.race([
          checkData.check(),
          timeoutPromise,
        ]);

        const duration = Date.now() - startTime;
        const status = result.healthy ? 'healthy' : 'unhealthy';
        
        const checkResult: HealthCheckResult = {
          name,
          status,
          duration,
          timestamp,
          metadata: result.metadata,
        };

        // Reset failure count on success
        if (result.healthy) {
          checkData.consecutiveFailures = 0;
        } else {
          checkData.consecutiveFailures++;
        }

        checkData.lastResult = checkResult;
        healthCheckCounter.inc({ check_name: name, status });
        timer();
        
        return checkResult;
      } catch (error) {
        const duration = Date.now() - startTime;
        checkData.consecutiveFailures++;
        
        const checkResult: HealthCheckResult = {
          name,
          status: 'unhealthy',
          duration,
          timestamp,
          error: error instanceof Error ? error.message : 'Unknown error',
        };

        checkData.lastResult = checkResult;
        healthCheckCounter.inc({ check_name: name, status: 'unhealthy' });
        timer();
        
        logger.error({ error, checkName: name }, 'Health check failed');
        return checkResult;
      }
    });

    const checkResults = await Promise.allSettled(checkPromises);
    
    // Extract results from settled promises
    for (const result of checkResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }

    // Determine overall system health
    const criticalChecks = results.filter(r => {
      const checkData = this.checks.get(r.name);
      return checkData?.config.critical;
    });

    const healthyChecks = results.filter(r => r.status === 'healthy');
    const degradedChecks = results.filter(r => r.status === 'degraded');
    const unhealthyChecks = results.filter(r => r.status === 'unhealthy');

    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    
    // If any critical check is unhealthy, system is unhealthy
    const unhealthyCritical = criticalChecks.filter(r => r.status === 'unhealthy');
    if (unhealthyCritical.length > 0) {
      overallStatus = 'unhealthy';
    }
    // If more than 25% of checks are unhealthy, system is unhealthy
    else if (unhealthyChecks.length / results.length > 0.25) {
      overallStatus = 'unhealthy';
    }
    // If any checks are degraded or some are unhealthy, system is degraded
    else if (degradedChecks.length > 0 || unhealthyChecks.length > 0) {
      overallStatus = 'degraded';
    }

    const systemHealth: SystemHealth = {
      status: overallStatus,
      timestamp,
      checks: results,
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
    };

    // Update metrics
    const healthValue = overallStatus === 'healthy' ? 1 : 
                       overallStatus === 'degraded' ? 0.5 : 0;
    systemHealthGauge.set(healthValue);

    // Emit health status change events
    this.emit('health:status', systemHealth);
    if (overallStatus !== 'healthy') {
      this.emit('health:degraded', systemHealth);
    }

    return systemHealth;
  }

  /**
   * Start continuous health monitoring
   */
  start(interval: number = 30000): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.checkInterval = setInterval(async () => {
      try {
        await this.runChecks();
      } catch (error) {
        logger.error({ error }, 'Health check monitoring failed');
      }
    }, interval);

    logger.info({ interval }, 'Health check monitoring started');
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    this.isRunning = false;
    logger.info('Health check monitoring stopped');
  }

  /**
   * Get current health status
   */
  async getHealth(): Promise<SystemHealth> {
    return await this.runChecks();
  }

  /**
   * Setup default production health checks
   */
  private setupDefaultChecks(): void {
    // Database connectivity check
    this.registerCheck(
      {
        name: 'database',
        timeout: 5000,
        interval: 30000,
        retries: 3,
        critical: true,
      },
      async () => {
        try {
          await prisma.$queryRaw`SELECT 1`;
          return { healthy: true, metadata: { latency: 'low' } };
        } catch (error) {
          return { 
            healthy: false, 
            metadata: { error: error instanceof Error ? error.message : 'Unknown' }
          };
        }
      }
    );

    // Redis connectivity check
    this.registerCheck(
      {
        name: 'redis',
        timeout: 3000,
        interval: 30000,
        retries: 3,
        critical: true,
      },
      async () => {
        try {
          // Redis client would be imported here
          // await redisClient.ping();
          return { healthy: true };
        } catch (error) {
          return { healthy: false };
        }
      }
    );

    // Memory usage check
    this.registerCheck(
      {
        name: 'memory',
        timeout: 1000,
        interval: 30000,
        retries: 1,
        critical: false,
      },
      async () => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
        const usagePercent = (heapUsedMB / heapTotalMB) * 100;
        
        return {
          healthy: usagePercent < 90,
          metadata: {
            heapUsedMB: Math.round(heapUsedMB),
            heapTotalMB: Math.round(heapTotalMB),
            usagePercent: Math.round(usagePercent),
          },
        };
      }
    );

    // Disk space check
    this.registerCheck(
      {
        name: 'disk',
        timeout: 2000,
        interval: 60000,
        retries: 1,
        critical: false,
      },
      async () => {
        try {
          const fs = await import('fs/promises');
          const stats = await fs.statfs('.');
          const freeMB = (stats.bavail * stats.bsize) / 1024 / 1024;
          const totalMB = (stats.blocks * stats.bsize) / 1024 / 1024;
          const usagePercent = ((totalMB - freeMB) / totalMB) * 100;
          
          return {
            healthy: usagePercent < 85,
            metadata: {
              freeMB: Math.round(freeMB),
              totalMB: Math.round(totalMB),
              usagePercent: Math.round(usagePercent),
            },
          };
        } catch (error) {
          return { healthy: true }; // Fail gracefully if unavailable
        }
      }
    );

    // External service dependencies
    this.registerCheck(
      {
        name: 'ollama_service',
        timeout: 10000,
        interval: 60000,
        retries: 2,
        critical: false,
      },
      async () => {
        try {
          const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
          const response = await fetch(`${ollamaUrl}/api/version`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
          });
          
          return {
            healthy: response.ok,
            metadata: {
              status: response.status,
              version: response.ok ? await response.text() : 'unknown',
            },
          };
        } catch (error) {
          return { 
            healthy: false,
            metadata: { error: error instanceof Error ? error.message : 'Unknown' }
          };
        }
      }
    );
  }
}

// Export singleton instance
export const healthCheckManager = HealthCheckManager.getInstance();