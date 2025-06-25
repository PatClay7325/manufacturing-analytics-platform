import { NextRequest } from 'next/server';
import { GET, HEAD } from '@/app/api/health/route';
import { HealthStatus } from '@/lib/resilience';

// Mock the resilience module
jest.mock('@/lib/resilience', () => ({
  systemHealthChecker: {
    runAllChecks: jest.fn(),
  },
  getCircuitBreakerMetrics: jest.fn(),
  HealthStatus: {
    HEALTHY: 'HEALTHY',
    UNHEALTHY: 'UNHEALTHY',
    DEGRADED: 'DEGRADED',
    UNKNOWN: 'UNKNOWN',
  },
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('/api/health', () => {
  const mockHealthChecker = require('@/lib/resilience').systemHealthChecker;
  const mockGetCircuitBreakerMetrics = require('@/lib/resilience').getCircuitBreakerMetrics;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset process.env
    delete process.env.npm_package_version;
    delete process.env.NODE_ENV;
  });

  describe('GET /api/health', () => {
    it('should return healthy status when all checks pass', async () => {
      const mockHealthReport = {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        responseTime: 50,
        checks: {
          database: {
            status: HealthStatus.HEALTHY,
            message: 'Database is healthy',
            timestamp: new Date(),
          },
        },
      };

      const mockCircuitBreakerMetrics = {
        database: {
          state: 'CLOSED',
          failures: 0,
          successes: 10,
          totalRequests: 10,
        },
      };

      mockHealthChecker.runAllChecks.mockResolvedValue(mockHealthReport);
      mockGetCircuitBreakerMetrics.mockReturnValue(mockCircuitBreakerMetrics);

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);

      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.status).toBe(HealthStatus.HEALTHY);
      expect(responseData.checks).toEqual(mockHealthReport.checks);
      expect(responseData.circuitBreakers).toEqual(mockCircuitBreakerMetrics);
      expect(responseData.system).toBeDefined();
      expect(responseData.system.uptime).toBeGreaterThan(0);
      expect(responseData.system.memory).toBeDefined();
    });

    it('should return 503 status when system is unhealthy', async () => {
      const mockHealthReport = {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        responseTime: 100,
        checks: {
          database: {
            status: HealthStatus.UNHEALTHY,
            message: 'Database connection failed',
            timestamp: new Date(),
          },
        },
      };

      mockHealthChecker.runAllChecks.mockResolvedValue(mockHealthReport);
      mockGetCircuitBreakerMetrics.mockReturnValue({});

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);

      expect(response.status).toBe(503);
      
      const responseData = await response.json();
      expect(responseData.status).toBe(HealthStatus.UNHEALTHY);
    });

    it('should return 200 status when system is degraded', async () => {
      const mockHealthReport = {
        status: HealthStatus.DEGRADED,
        timestamp: new Date(),
        responseTime: 75,
        checks: {
          database: {
            status: HealthStatus.HEALTHY,
            message: 'Database is healthy',
            timestamp: new Date(),
          },
          redis: {
            status: HealthStatus.UNHEALTHY,
            message: 'Redis connection failed',
            timestamp: new Date(),
          },
        },
      };

      mockHealthChecker.runAllChecks.mockResolvedValue(mockHealthReport);
      mockGetCircuitBreakerMetrics.mockReturnValue({});

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);

      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.status).toBe(HealthStatus.DEGRADED);
    });

    it('should include environment information', async () => {
      process.env.npm_package_version = '1.2.3';
      process.env.NODE_ENV = 'production';

      const mockHealthReport = {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        responseTime: 25,
        checks: {},
      };

      mockHealthChecker.runAllChecks.mockResolvedValue(mockHealthReport);
      mockGetCircuitBreakerMetrics.mockReturnValue({});

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);

      const responseData = await response.json();
      expect(responseData.version).toBe('1.2.3');
      expect(responseData.environment).toBe('production');
    });

    it('should use default values when environment variables are not set', async () => {
      const mockHealthReport = {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        responseTime: 25,
        checks: {},
      };

      mockHealthChecker.runAllChecks.mockResolvedValue(mockHealthReport);
      mockGetCircuitBreakerMetrics.mockReturnValue({});

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);

      const responseData = await response.json();
      expect(responseData.version).toBe('1.0.0');
      expect(responseData.environment).toBe('development');
    });

    it('should handle health check errors gracefully', async () => {
      mockHealthChecker.runAllChecks.mockRejectedValue(new Error('Health check system failure'));

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);

      expect(response.status).toBe(500);
      
      const responseData = await response.json();
      expect(responseData.status).toBe(HealthStatus.UNKNOWN);
      expect(responseData.error).toBe('Health check system failure');
      expect(responseData.message).toBe('Health check system failure');
    });

    it('should include circuit breaker metrics', async () => {
      const mockHealthReport = {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        responseTime: 30,
        checks: {},
      };

      const mockCircuitBreakerMetrics = {
        database: {
          state: 'CLOSED',
          failures: 2,
          successes: 98,
          totalRequests: 100,
          lastSuccessTime: new Date().toISOString(),
        },
        redis: {
          state: 'OPEN',
          failures: 5,
          successes: 45,
          totalRequests: 50,
          nextAttempt: new Date(Date.now() + 30000).toISOString(),
        },
      };

      mockHealthChecker.runAllChecks.mockResolvedValue(mockHealthReport);
      mockGetCircuitBreakerMetrics.mockReturnValue(mockCircuitBreakerMetrics);

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await GET(request);

      const responseData = await response.json();
      expect(responseData.circuitBreakers).toEqual(mockCircuitBreakerMetrics);
    });
  });

  describe('HEAD /api/health', () => {
    it('should return 200 for healthy system', async () => {
      const mockHealthReport = {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        responseTime: 20,
        checks: {},
      };

      mockHealthChecker.runAllChecks.mockResolvedValue(mockHealthReport);

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await HEAD(request);

      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
    });

    it('should return 503 for unhealthy system', async () => {
      const mockHealthReport = {
        status: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        responseTime: 100,
        checks: {},
      };

      mockHealthChecker.runAllChecks.mockResolvedValue(mockHealthReport);

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await HEAD(request);

      expect(response.status).toBe(503);
      expect(response.body).toBeNull();
    });

    it('should return 200 for degraded system', async () => {
      const mockHealthReport = {
        status: HealthStatus.DEGRADED,
        timestamp: new Date(),
        responseTime: 50,
        checks: {},
      };

      mockHealthChecker.runAllChecks.mockResolvedValue(mockHealthReport);

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await HEAD(request);

      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
    });

    it('should return 500 for health check errors', async () => {
      mockHealthChecker.runAllChecks.mockRejectedValue(new Error('System failure'));

      const request = new NextRequest('http://localhost:3000/api/health');
      const response = await HEAD(request);

      expect(response.status).toBe(500);
      expect(response.body).toBeNull();
    });
  });

  describe('Logging', () => {
    it('should log successful health checks', async () => {
      const { logger } = require('@/lib/logger');
      
      const mockHealthReport = {
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
        responseTime: 30,
        checks: {},
      };

      mockHealthChecker.runAllChecks.mockResolvedValue(mockHealthReport);
      mockGetCircuitBreakerMetrics.mockReturnValue({});

      const request = new NextRequest('http://localhost:3000/api/health');
      await GET(request);

      expect(logger.info).toHaveBeenCalledWith(
        'Health check completed',
        expect.objectContaining({
          status: HealthStatus.HEALTHY,
          responseTime: 30,
          statusCode: 200,
        })
      );
    });

    it('should log health check errors', async () => {
      const { logger } = require('@/lib/logger');
      
      mockHealthChecker.runAllChecks.mockRejectedValue(new Error('Test error'));

      const request = new NextRequest('http://localhost:3000/api/health');
      await GET(request);

      expect(logger.error).toHaveBeenCalledWith(
        'Health check failed',
        expect.objectContaining({
          error: 'Test error',
        })
      );
    });
  });
});