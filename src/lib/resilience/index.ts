// Resilience utilities for error handling, retries, and monitoring
export { 
  CircuitBreaker, 
  CircuitBreakerState, 
  type CircuitBreakerOptions, 
  type CircuitBreakerMetrics 
} from './CircuitBreaker';

export { 
  RetryManager, 
  RetryStrategy, 
  type RetryOptions, 
  type RetryResult 
} from './RetryManager';

export { 
  HealthChecker, 
  HealthStatus, 
  type HealthCheck, 
  type HealthCheckResult, 
  type SystemHealthReport 
} from './HealthChecker';

// Singleton instances for application-wide use
import { CircuitBreaker } from './CircuitBreaker';
import { HealthChecker } from './HealthChecker';
import { logger } from '../logger';

// Application-wide circuit breakers
export const circuitBreakers = {
  database: new CircuitBreaker({
    name: 'Database',
    failureThreshold: 5,
    timeout: 60000, // 1 minute
    monitoringPeriod: 30000,
    expectedErrors: ['ConnectionError', 'TimeoutError'],
  }),

  grafana: new CircuitBreaker({
    name: 'Grafana',
    failureThreshold: 3,
    timeout: 30000, // 30 seconds
    monitoringPeriod: 15000,
    expectedErrors: ['NetworkError', 'TimeoutError'],
  }),

  mqtt: new CircuitBreaker({
    name: 'MQTT',
    failureThreshold: 3,
    timeout: 30000,
    monitoringPeriod: 15000,
    expectedErrors: ['ConnectionRefusedError'],
  }),

  redis: new CircuitBreaker({
    name: 'Redis',
    failureThreshold: 3,
    timeout: 30000,
    monitoringPeriod: 15000,
    expectedErrors: ['ConnectionError'],
  }),
};

// Application-wide health checker
export const systemHealthChecker = new HealthChecker({
  checkInterval: 30000, // 30 seconds
  defaultTimeout: 5000, // 5 seconds
});

// Initialize health checks
export function initializeHealthChecks() {
  logger.info('Initializing system health checks');

  // Database health check
  systemHealthChecker.addCheck(
    HealthChecker.createDatabaseCheck(
      'Database',
      async () => {
        // This will be implemented with actual database connection
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        await prisma.$queryRaw`SELECT 1`;
        await prisma.$disconnect();
      },
      5000
    )
  );

  // Grafana health check
  systemHealthChecker.addCheck(
    HealthChecker.createHttpCheck(
      'Grafana',
      process.env.GRAFANA_URL + '/api/health' || 'http://grafana:3000/api/health',
      5000
    )
  );

  // Redis health check (if Redis URL is configured)
  if (process.env.REDIS_URL) {
    systemHealthChecker.addCheck({
      name: 'Redis',
      timeout: 5000,
      critical: false,
      check: async () => {
        try {
          const Redis = require('ioredis');
          const redis = new Redis(process.env.REDIS_URL);
          await redis.ping();
          redis.disconnect();
          
          return {
            status: HealthStatus.HEALTHY,
            message: 'Redis connection successful',
            timestamp: new Date(),
          };
        } catch (error) {
          return {
            status: HealthStatus.UNHEALTHY,
            message: `Redis check failed: ${(error as Error).message}`,
            timestamp: new Date(),
          };
        }
      },
    });
  }

  // MQTT health check (if MQTT URL is configured)
  if (process.env.MQTT_URL) {
    systemHealthChecker.addCheck({
      name: 'MQTT',
      timeout: 5000,
      critical: false,
      check: async () => {
        try {
          const mqtt = require('mqtt');
          const client = mqtt.connect(process.env.MQTT_URL);
          
          return new Promise((resolve) => {
            const timeout = setTimeout(() => {
              client.end();
              resolve({
                status: HealthStatus.UNHEALTHY,
                message: 'MQTT connection timeout',
                timestamp: new Date(),
              });
            }, 5000);

            client.on('connect', () => {
              clearTimeout(timeout);
              client.end();
              resolve({
                status: HealthStatus.HEALTHY,
                message: 'MQTT connection successful',
                timestamp: new Date(),
              });
            });

            client.on('error', (error: Error) => {
              clearTimeout(timeout);
              client.end();
              resolve({
                status: HealthStatus.UNHEALTHY,
                message: `MQTT check failed: ${error.message}`,
                timestamp: new Date(),
              });
            });
          });
        } catch (error) {
          return {
            status: HealthStatus.UNHEALTHY,
            message: `MQTT check failed: ${(error as Error).message}`,
            timestamp: new Date(),
          };
        }
      },
    });
  }

  logger.info('Health checks initialized');
}

// Start periodic health monitoring
export function startHealthMonitoring() {
  systemHealthChecker.startPeriodicChecks();
  logger.info('Health monitoring started');
}

// Stop health monitoring
export function stopHealthMonitoring() {
  systemHealthChecker.stopPeriodicChecks();
  logger.info('Health monitoring stopped');
}

// Get circuit breaker metrics for monitoring
export function getCircuitBreakerMetrics() {
  const metrics: Record<string, any> = {};
  
  Object.entries(circuitBreakers).forEach(([name, breaker]) => {
    metrics[name] = breaker.getMetrics();
  });

  return metrics;
}

// Reset all circuit breakers (useful for testing or manual intervention)
export function resetAllCircuitBreakers() {
  Object.entries(circuitBreakers).forEach(([name, breaker]) => {
    breaker.reset();
    logger.info(`Circuit breaker reset: ${name}`);
  });
}