import { HealthChecker, HealthStatus } from '@/lib/resilience/HealthChecker';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('HealthChecker', () => {
  let healthChecker: HealthChecker;

  beforeEach(() => {
    jest.clearAllMocks();
    healthChecker = new HealthChecker({
      checkInterval: 1000,
      defaultTimeout: 500,
    });
  });

  afterEach(() => {
    healthChecker.stopPeriodicChecks();
  });

  describe('Initialization', () => {
    it('should initialize with default options', () => {
      const checker = new HealthChecker();
      expect(checker).toBeInstanceOf(HealthChecker);
    });

    it('should initialize with custom options', () => {
      const checker = new HealthChecker({
        checkInterval: 5000,
        defaultTimeout: 2000,
      });
      expect(checker).toBeInstanceOf(HealthChecker);
    });
  });

  describe('Health check management', () => {
    it('should add health checks', () => {
      const healthCheck = {
        name: 'test-service',
        check: jest.fn().mockResolvedValue({
          status: HealthStatus.HEALTHY,
          message: 'Service is healthy',
          timestamp: new Date(),
        }),
      };

      healthChecker.addCheck(healthCheck);
      
      // Should be able to run the check without error
      expect(() => healthChecker.runCheck('test-service')).not.toThrow();
    });

    it('should remove health checks', async () => {
      const healthCheck = {
        name: 'test-service',
        check: jest.fn().mockResolvedValue({
          status: HealthStatus.HEALTHY,
          message: 'Service is healthy',
          timestamp: new Date(),
        }),
      };

      healthChecker.addCheck(healthCheck);
      healthChecker.removeCheck('test-service');
      
      await expect(healthChecker.runCheck('test-service')).rejects.toThrow('Health check \'test-service\' not found');
    });

    it('should use default timeout when not specified', () => {
      const healthCheck = {
        name: 'test-service',
        check: jest.fn().mockResolvedValue({
          status: HealthStatus.HEALTHY,
          timestamp: new Date(),
        }),
      };

      // Should not throw when adding without timeout
      expect(() => healthChecker.addCheck(healthCheck)).not.toThrow();
    });
  });

  describe('Individual health checks', () => {
    it('should run successful health check', async () => {
      const mockCheck = jest.fn().mockResolvedValue({
        status: HealthStatus.HEALTHY,
        message: 'Service is healthy',
        timestamp: new Date(),
      });

      healthChecker.addCheck({
        name: 'test-service',
        check: mockCheck,
      });

      const result = await healthChecker.runCheck('test-service');

      expect(result.status).toBe(HealthStatus.HEALTHY);
      expect(result.message).toBe('Service is healthy');
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(mockCheck).toHaveBeenCalledTimes(1);
    });

    it('should handle failing health check', async () => {
      const mockCheck = jest.fn().mockRejectedValue(new Error('Service unavailable'));

      healthChecker.addCheck({
        name: 'test-service',
        check: mockCheck,
      });

      const result = await healthChecker.runCheck('test-service');

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.message).toContain('Health check failed: Service unavailable');
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle health check timeout', async () => {
      const mockCheck = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );

      healthChecker.addCheck({
        name: 'slow-service',
        check: mockCheck,
        timeout: 100, // Short timeout
      });

      const result = await healthChecker.runCheck('slow-service');

      expect(result.status).toBe(HealthStatus.UNHEALTHY);
      expect(result.message).toContain('timed out');
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should throw error for non-existent health check', async () => {
      await expect(healthChecker.runCheck('non-existent')).rejects.toThrow('Health check \'non-existent\' not found');
    });
  });

  describe('All health checks', () => {
    it('should run all health checks in parallel', async () => {
      const mockCheck1 = jest.fn().mockResolvedValue({
        status: HealthStatus.HEALTHY,
        message: 'Service 1 healthy',
        timestamp: new Date(),
      });

      const mockCheck2 = jest.fn().mockResolvedValue({
        status: HealthStatus.HEALTHY,
        message: 'Service 2 healthy',
        timestamp: new Date(),
      });

      healthChecker.addCheck({ name: 'service1', check: mockCheck1 });
      healthChecker.addCheck({ name: 'service2', check: mockCheck2 });

      const report = await healthChecker.runAllChecks();

      expect(report.status).toBe(HealthStatus.HEALTHY);
      expect(report.checks).toHaveProperty('service1');
      expect(report.checks).toHaveProperty('service2');
      expect(report.responseTime).toBeGreaterThan(0);
      expect(report.timestamp).toBeInstanceOf(Date);
      expect(mockCheck1).toHaveBeenCalledTimes(1);
      expect(mockCheck2).toHaveBeenCalledTimes(1);
    });

    it('should return UNKNOWN status when no checks exist', async () => {
      const report = await healthChecker.runAllChecks();
      expect(report.status).toBe(HealthStatus.UNKNOWN);
      expect(Object.keys(report.checks)).toHaveLength(0);
    });
  });

  describe('Overall status calculation', () => {
    it('should return HEALTHY when all checks are healthy', async () => {
      healthChecker.addCheck({
        name: 'service1',
        critical: true,
        check: jest.fn().mockResolvedValue({ status: HealthStatus.HEALTHY, timestamp: new Date() }),
      });

      healthChecker.addCheck({
        name: 'service2',
        critical: false,
        check: jest.fn().mockResolvedValue({ status: HealthStatus.HEALTHY, timestamp: new Date() }),
      });

      const report = await healthChecker.runAllChecks();
      expect(report.status).toBe(HealthStatus.HEALTHY);
    });

    it('should return UNHEALTHY when critical service fails', async () => {
      healthChecker.addCheck({
        name: 'critical-service',
        critical: true,
        check: jest.fn().mockResolvedValue({ status: HealthStatus.UNHEALTHY, timestamp: new Date() }),
      });

      healthChecker.addCheck({
        name: 'non-critical-service',
        critical: false,
        check: jest.fn().mockResolvedValue({ status: HealthStatus.HEALTHY, timestamp: new Date() }),
      });

      const report = await healthChecker.runAllChecks();
      expect(report.status).toBe(HealthStatus.UNHEALTHY);
    });

    it('should return DEGRADED when non-critical service fails', async () => {
      healthChecker.addCheck({
        name: 'critical-service',
        critical: true,
        check: jest.fn().mockResolvedValue({ status: HealthStatus.HEALTHY, timestamp: new Date() }),
      });

      healthChecker.addCheck({
        name: 'non-critical-service',
        critical: false,
        check: jest.fn().mockResolvedValue({ status: HealthStatus.UNHEALTHY, timestamp: new Date() }),
      });

      const report = await healthChecker.runAllChecks();
      expect(report.status).toBe(HealthStatus.DEGRADED);
    });

    it('should return DEGRADED when any service is degraded', async () => {
      healthChecker.addCheck({
        name: 'service1',
        check: jest.fn().mockResolvedValue({ status: HealthStatus.HEALTHY, timestamp: new Date() }),
      });

      healthChecker.addCheck({
        name: 'service2',
        check: jest.fn().mockResolvedValue({ status: HealthStatus.DEGRADED, timestamp: new Date() }),
      });

      const report = await healthChecker.runAllChecks();
      expect(report.status).toBe(HealthStatus.DEGRADED);
    });
  });

  describe('Periodic health checks', () => {
    it('should start periodic checks', () => {
      const mockCheck = jest.fn().mockResolvedValue({
        status: HealthStatus.HEALTHY,
        timestamp: new Date(),
      });

      healthChecker.addCheck({ name: 'test-service', check: mockCheck });
      
      expect(() => healthChecker.startPeriodicChecks()).not.toThrow();
      expect(() => healthChecker.stopPeriodicChecks()).not.toThrow();
    });

    it('should not start periodic checks if already running', () => {
      healthChecker.startPeriodicChecks();
      
      // Should not throw when starting again
      expect(() => healthChecker.startPeriodicChecks()).not.toThrow();
      
      healthChecker.stopPeriodicChecks();
    });

    it('should handle errors in periodic checks gracefully', async () => {
      const mockCheck = jest.fn().mockRejectedValue(new Error('Periodic check error'));
      
      healthChecker.addCheck({ name: 'failing-service', check: mockCheck });
      
      // Should not throw when starting periodic checks even with failing check
      expect(() => healthChecker.startPeriodicChecks()).not.toThrow();
      
      // Give it a moment to run
      await new Promise(resolve => setTimeout(resolve, 50));
      
      healthChecker.stopPeriodicChecks();
    });
  });

  describe('Last results', () => {
    it('should store and retrieve last results', async () => {
      const mockCheck = jest.fn().mockResolvedValue({
        status: HealthStatus.HEALTHY,
        message: 'Service is healthy',
        timestamp: new Date(),
      });

      healthChecker.addCheck({ name: 'test-service', check: mockCheck });
      
      await healthChecker.runCheck('test-service');
      
      const lastResults = healthChecker.getLastResults();
      expect(lastResults).toHaveProperty('test-service');
      expect(lastResults['test-service'].status).toBe(HealthStatus.HEALTHY);
      expect(lastResults['test-service'].message).toBe('Service is healthy');
    });

    it('should return empty object when no checks have been run', () => {
      const lastResults = healthChecker.getLastResults();
      expect(lastResults).toEqual({});
    });
  });

  describe('Factory methods', () => {
    describe('createDatabaseCheck', () => {
      it('should create database health check that passes', async () => {
        const mockQuery = jest.fn().mockResolvedValue([{ result: 1 }]);
        const dbCheck = HealthChecker.createDatabaseCheck('Database', mockQuery);
        
        const result = await dbCheck.check();
        
        expect(result.status).toBe(HealthStatus.HEALTHY);
        expect(result.message).toBe('Database connection successful');
        expect(mockQuery).toHaveBeenCalledTimes(1);
      });

      it('should create database health check that fails', async () => {
        const mockQuery = jest.fn().mockRejectedValue(new Error('Connection failed'));
        const dbCheck = HealthChecker.createDatabaseCheck('Database', mockQuery);
        
        const result = await dbCheck.check();
        
        expect(result.status).toBe(HealthStatus.UNHEALTHY);
        expect(result.message).toContain('Database check failed: Connection failed');
      });
    });

    describe('createHttpCheck', () => {
      it('should create HTTP health check that passes', async () => {
        // Mock fetch globally
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          status: 200,
        });

        const httpCheck = HealthChecker.createHttpCheck('API', 'http://example.com/health');
        const result = await httpCheck.check();
        
        expect(result.status).toBe(HealthStatus.HEALTHY);
        expect(result.message).toContain('HTTP check successful');
        expect(result.details).toHaveProperty('statusCode', 200);
      });

      it('should create HTTP health check that fails with bad status', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          ok: false,
          status: 500,
        });

        const httpCheck = HealthChecker.createHttpCheck('API', 'http://example.com/health');
        const result = await httpCheck.check();
        
        expect(result.status).toBe(HealthStatus.UNHEALTHY);
        expect(result.message).toContain('HTTP check failed with status 500');
      });

      it('should create HTTP health check that fails with network error', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

        const httpCheck = HealthChecker.createHttpCheck('API', 'http://example.com/health');
        const result = await httpCheck.check();
        
        expect(result.status).toBe(HealthStatus.UNHEALTHY);
        expect(result.message).toContain('HTTP check failed: Network error');
      });
    });
  });
});