import { CircuitBreaker, CircuitBreakerState } from '@/lib/resilience/CircuitBreaker';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('CircuitBreaker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with CLOSED state', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        timeout: 5000,
        monitoringPeriod: 10000,
        name: 'test-breaker',
      });

      const metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
      expect(metrics.failures).toBe(0);
      expect(metrics.successes).toBe(0);
      expect(metrics.totalRequests).toBe(0);
    });

    it('should use default values for optional parameters', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        timeout: 5000,
        monitoringPeriod: 10000,
      });

      const metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('Success scenarios', () => {
    it('should execute successful operations', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        timeout: 5000,
        monitoringPeriod: 10000,
      });

      const mockOperation = jest.fn().mockResolvedValue('success');
      const result = await breaker.execute(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);

      const metrics = breaker.getMetrics();
      expect(metrics.successes).toBe(1);
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should track multiple successful operations', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        timeout: 5000,
        monitoringPeriod: 10000,
      });

      const mockOperation = jest.fn().mockResolvedValue('success');
      
      await breaker.execute(mockOperation);
      await breaker.execute(mockOperation);
      await breaker.execute(mockOperation);

      const metrics = breaker.getMetrics();
      expect(metrics.successes).toBe(3);
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.failures).toBe(0);
    });
  });

  describe('Failure scenarios', () => {
    it('should track failures without opening below threshold', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        timeout: 5000,
        monitoringPeriod: 10000,
      });

      const mockOperation = jest.fn().mockRejectedValue(new Error('test error'));
      
      await expect(breaker.execute(mockOperation)).rejects.toThrow('test error');
      await expect(breaker.execute(mockOperation)).rejects.toThrow('test error');

      const metrics = breaker.getMetrics();
      expect(metrics.failures).toBe(2);
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should open circuit breaker when failure threshold is reached', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        timeout: 5000,
        monitoringPeriod: 10000,
      });

      const mockOperation = jest.fn().mockRejectedValue(new Error('test error'));
      
      // Cause 3 failures to meet threshold
      await expect(breaker.execute(mockOperation)).rejects.toThrow('test error');
      await expect(breaker.execute(mockOperation)).rejects.toThrow('test error');
      await expect(breaker.execute(mockOperation)).rejects.toThrow('test error');

      const metrics = breaker.getMetrics();
      expect(metrics.failures).toBe(3);
      expect(metrics.state).toBe(CircuitBreakerState.OPEN);
      expect(metrics.nextAttempt).toBeDefined();
    });

    it('should reject requests when circuit breaker is open', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 5000,
        monitoringPeriod: 10000,
      });

      const mockOperation = jest.fn().mockRejectedValue(new Error('test error'));
      
      // Cause failures to open circuit
      await expect(breaker.execute(mockOperation)).rejects.toThrow('test error');
      await expect(breaker.execute(mockOperation)).rejects.toThrow('test error');

      // Circuit should be open now
      const successOperation = jest.fn().mockResolvedValue('success');
      await expect(breaker.execute(successOperation)).rejects.toThrow('Circuit breaker is OPEN');
      
      // The success operation should not have been called
      expect(successOperation).not.toHaveBeenCalled();
    });
  });

  describe('Expected errors', () => {
    it('should not count expected errors as failures', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 5000,
        monitoringPeriod: 10000,
        expectedErrors: ['ExpectedError'],
      });

      const expectedError = new Error('Expected failure');
      expectedError.name = 'ExpectedError';
      const mockOperation = jest.fn().mockRejectedValue(expectedError);
      
      // Should throw but not count as failures
      await expect(breaker.execute(mockOperation)).rejects.toThrow('Expected failure');
      await expect(breaker.execute(mockOperation)).rejects.toThrow('Expected failure');
      await expect(breaker.execute(mockOperation)).rejects.toThrow('Expected failure');

      const metrics = breaker.getMetrics();
      expect(metrics.failures).toBe(0); // Should not count expected errors
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should count unexpected errors as failures', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 5000,
        monitoringPeriod: 10000,
        expectedErrors: ['ExpectedError'],
      });

      const unexpectedError = new Error('Unexpected failure');
      const mockOperation = jest.fn().mockRejectedValue(unexpectedError);
      
      await expect(breaker.execute(mockOperation)).rejects.toThrow('Unexpected failure');
      await expect(breaker.execute(mockOperation)).rejects.toThrow('Unexpected failure');

      const metrics = breaker.getMetrics();
      expect(metrics.failures).toBe(2);
      expect(metrics.state).toBe(CircuitBreakerState.OPEN);
    });
  });

  describe('Recovery scenarios', () => {
    it('should transition to HALF_OPEN after timeout', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 100, // Short timeout for testing
        monitoringPeriod: 10000,
      });

      const mockOperation = jest.fn().mockRejectedValue(new Error('test error'));
      
      // Open the circuit
      await expect(breaker.execute(mockOperation)).rejects.toThrow('test error');
      await expect(breaker.execute(mockOperation)).rejects.toThrow('test error');

      expect(breaker.getMetrics().state).toBe(CircuitBreakerState.OPEN);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Next operation should transition to HALF_OPEN
      const successOperation = jest.fn().mockResolvedValue('success');
      const result = await breaker.execute(successOperation);

      expect(result).toBe('success');
      expect(breaker.getMetrics().state).toBe(CircuitBreakerState.CLOSED);
    });

    it('should reset failures on successful operation in HALF_OPEN state', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 100,
        monitoringPeriod: 10000,
      });

      const mockFailure = jest.fn().mockRejectedValue(new Error('test error'));
      
      // Open the circuit
      await expect(breaker.execute(mockFailure)).rejects.toThrow();
      await expect(breaker.execute(mockFailure)).rejects.toThrow();

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Successful operation should close circuit and reset failures
      const successOperation = jest.fn().mockResolvedValue('success');
      await breaker.execute(successOperation);

      const metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
      expect(metrics.failures).toBe(0);
    });
  });

  describe('Manual controls', () => {
    it('should reset circuit breaker manually', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 5000,
        monitoringPeriod: 10000,
      });

      // Manually set some state
      breaker.forceOpen();
      expect(breaker.getMetrics().state).toBe(CircuitBreakerState.OPEN);

      // Reset should close it
      breaker.reset();
      const metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
      expect(metrics.failures).toBe(0);
      expect(metrics.nextAttempt).toBeUndefined();
    });

    it('should force open circuit breaker', () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        timeout: 5000,
        monitoringPeriod: 10000,
      });

      expect(breaker.getMetrics().state).toBe(CircuitBreakerState.CLOSED);

      breaker.forceOpen();
      const metrics = breaker.getMetrics();
      expect(metrics.state).toBe(CircuitBreakerState.OPEN);
      expect(metrics.nextAttempt).toBeDefined();
    });
  });

  describe('Metrics', () => {
    it('should provide accurate metrics', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 3,
        timeout: 5000,
        monitoringPeriod: 10000,
        name: 'test-metrics',
      });

      const successOp = jest.fn().mockResolvedValue('success');
      const failureOp = jest.fn().mockRejectedValue(new Error('failure'));

      // Execute various operations
      await breaker.execute(successOp);
      await expect(breaker.execute(failureOp)).rejects.toThrow();
      await breaker.execute(successOp);

      const metrics = breaker.getMetrics();
      expect(metrics.successes).toBe(2);
      expect(metrics.failures).toBe(1);
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.state).toBe(CircuitBreakerState.CLOSED);
      expect(metrics.lastSuccessTime).toBeInstanceOf(Date);
      expect(metrics.lastFailureTime).toBeInstanceOf(Date);
    });
  });
});