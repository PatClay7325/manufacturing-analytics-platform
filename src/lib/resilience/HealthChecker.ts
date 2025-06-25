import { logger } from '../logger';

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  UNHEALTHY = 'UNHEALTHY',
  DEGRADED = 'DEGRADED',
  UNKNOWN = 'UNKNOWN',
}

export interface HealthCheck {
  name: string;
  check: () => Promise<HealthCheckResult>;
  timeout?: number;
  critical?: boolean;
}

export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  details?: Record<string, any>;
  responseTime?: number;
  timestamp: Date;
}

export interface SystemHealthReport {
  status: HealthStatus;
  checks: Record<string, HealthCheckResult>;
  timestamp: Date;
  responseTime: number;
}

export class HealthChecker {
  private healthChecks: Map<string, HealthCheck> = new Map();
  private lastResults: Map<string, HealthCheckResult> = new Map();
  private isRunning = false;
  private intervalId?: NodeJS.Timeout;

  constructor(private readonly options: {
    checkInterval?: number;
    defaultTimeout?: number;
  } = {}) {
    this.options.checkInterval = options.checkInterval || 30000; // 30 seconds
    this.options.defaultTimeout = options.defaultTimeout || 5000; // 5 seconds

    logger.info('Health checker initialized', {
      checkInterval: this.options.checkInterval,
      defaultTimeout: this.options.defaultTimeout,
    });
  }

  addCheck(healthCheck: HealthCheck): void {
    this.healthChecks.set(healthCheck.name, {
      ...healthCheck,
      timeout: healthCheck.timeout || this.options.defaultTimeout,
      critical: healthCheck.critical ?? true,
    });

    logger.debug('Health check added', {
      name: healthCheck.name,
      timeout: healthCheck.timeout || this.options.defaultTimeout,
      critical: healthCheck.critical ?? true,
    });
  }

  removeCheck(name: string): void {
    this.healthChecks.delete(name);
    this.lastResults.delete(name);
    
    logger.debug('Health check removed', { name });
  }

  async runCheck(name: string): Promise<HealthCheckResult> {
    const healthCheck = this.healthChecks.get(name);
    if (!healthCheck) {
      throw new Error(`Health check '${name}' not found`);
    }

    const startTime = Date.now();
    
    try {
      logger.debug('Running health check', { name });

      const result = await this.executeWithTimeout(
        healthCheck.check(),
        healthCheck.timeout!
      );

      result.responseTime = Date.now() - startTime;
      result.timestamp = new Date();

      this.lastResults.set(name, result);

      logger.debug('Health check completed', {
        name,
        status: result.status,
        responseTime: result.responseTime,
      });

      return result;
    } catch (error) {
      const errorResult: HealthCheckResult = {
        status: HealthStatus.UNHEALTHY,
        message: `Health check failed: ${(error as Error).message}`,
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
      };

      this.lastResults.set(name, errorResult);

      logger.error('Health check failed', {
        name,
        error: (error as Error).message,
        responseTime: errorResult.responseTime,
      });

      return errorResult;
    }
  }

  async runAllChecks(): Promise<SystemHealthReport> {
    const startTime = Date.now();
    const results: Record<string, HealthCheckResult> = {};

    // Run all health checks in parallel
    const checkPromises = Array.from(this.healthChecks.keys()).map(async (name) => {
      try {
        const result = await this.runCheck(name);
        results[name] = result;
      } catch (error) {
        results[name] = {
          status: HealthStatus.UNHEALTHY,
          message: `Failed to execute health check: ${(error as Error).message}`,
          timestamp: new Date(),
        };
      }
    });

    await Promise.all(checkPromises);

    const overallStatus = this.calculateOverallStatus(results);
    const responseTime = Date.now() - startTime;

    const report: SystemHealthReport = {
      status: overallStatus,
      checks: results,
      timestamp: new Date(),
      responseTime,
    };

    logger.info('System health check completed', {
      overallStatus,
      responseTime,
      totalChecks: Object.keys(results).length,
      healthyChecks: Object.values(results).filter(r => r.status === HealthStatus.HEALTHY).length,
    });

    return report;
  }

  private calculateOverallStatus(results: Record<string, HealthCheckResult>): HealthStatus {
    const statuses = Object.entries(results);
    
    if (statuses.length === 0) {
      return HealthStatus.UNKNOWN;
    }

    // Check critical health checks first
    const criticalChecks = statuses.filter(([name]) => {
      const check = this.healthChecks.get(name);
      return check?.critical === true;
    });

    const hasCriticalFailure = criticalChecks.some(([, result]) => 
      result.status === HealthStatus.UNHEALTHY
    );

    if (hasCriticalFailure) {
      return HealthStatus.UNHEALTHY;
    }

    // Check for any unhealthy non-critical checks
    const hasAnyUnhealthy = statuses.some(([, result]) => 
      result.status === HealthStatus.UNHEALTHY
    );

    if (hasAnyUnhealthy) {
      return HealthStatus.DEGRADED;
    }

    // Check for any degraded checks
    const hasAnyDegraded = statuses.some(([, result]) => 
      result.status === HealthStatus.DEGRADED
    );

    if (hasAnyDegraded) {
      return HealthStatus.DEGRADED;
    }

    // Check if all are healthy
    const allHealthy = statuses.every(([, result]) => 
      result.status === HealthStatus.HEALTHY
    );

    return allHealthy ? HealthStatus.HEALTHY : HealthStatus.UNKNOWN;
  }

  startPeriodicChecks(): void {
    if (this.isRunning) {
      logger.warn('Periodic health checks already running');
      return;
    }

    this.isRunning = true;
    
    // Run initial check
    this.runAllChecks().catch(error => {
      logger.error('Initial health check failed', { error: error.message });
    });

    // Set up periodic checks
    this.intervalId = setInterval(async () => {
      try {
        await this.runAllChecks();
      } catch (error) {
        logger.error('Periodic health check failed', { error: (error as Error).message });
      }
    }, this.options.checkInterval);

    logger.info('Periodic health checks started', {
      interval: this.options.checkInterval,
    });
  }

  stopPeriodicChecks(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    logger.info('Periodic health checks stopped');
  }

  getLastResults(): Record<string, HealthCheckResult> {
    const results: Record<string, HealthCheckResult> = {};
    
    for (const [name, result] of this.lastResults.entries()) {
      results[name] = result;
    }

    return results;
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }

  // Static factory methods for common health checks
  static createDatabaseCheck(
    name: string,
    testQuery: () => Promise<any>,
    timeout?: number
  ): HealthCheck {
    return {
      name,
      timeout,
      critical: true,
      check: async (): Promise<HealthCheckResult> => {
        try {
          await testQuery();
          return {
            status: HealthStatus.HEALTHY,
            message: 'Database connection successful',
            timestamp: new Date(),
          };
        } catch (error) {
          return {
            status: HealthStatus.UNHEALTHY,
            message: `Database check failed: ${(error as Error).message}`,
            timestamp: new Date(),
          };
        }
      },
    };
  }

  static createHttpCheck(
    name: string,
    url: string,
    timeout?: number
  ): HealthCheck {
    return {
      name,
      timeout,
      critical: false,
      check: async (): Promise<HealthCheckResult> => {
        try {
          const response = await fetch(url, {
            method: 'GET',
            signal: AbortSignal.timeout(timeout || 5000),
          });

          if (response.ok) {
            return {
              status: HealthStatus.HEALTHY,
              message: `HTTP check successful (${response.status})`,
              details: {
                statusCode: response.status,
                url,
              },
              timestamp: new Date(),
            };
          } else {
            return {
              status: HealthStatus.UNHEALTHY,
              message: `HTTP check failed with status ${response.status}`,
              details: {
                statusCode: response.status,
                url,
              },
              timestamp: new Date(),
            };
          }
        } catch (error) {
          return {
            status: HealthStatus.UNHEALTHY,
            message: `HTTP check failed: ${(error as Error).message}`,
            details: { url },
            timestamp: new Date(),
          };
        }
      },
    };
  }
}