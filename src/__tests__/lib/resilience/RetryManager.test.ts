import { RetryManager, RetryStrategy } from '@/lib/resilience/RetryManager';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('RetryManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with correct options', () => {
      const retryManager = new RetryManager({
        maxAttempts: 3,
        strategy: RetryStrategy.EXPONENTIAL,
        baseDelay: 1000,
        maxDelay: 5000,
        retryableErrors: ['NetworkError'],
        jitter: false,
        name: 'test-retry',
      });

      expect(retryManager).toBeInstanceOf(RetryManager);
    });

    it('should use default values for optional parameters', () => {
      const retryManager = new RetryManager({
        maxAttempts: 3,
        strategy: RetryStrategy.FIXED,
        baseDelay: 1000,
      });

      expect(retryManager).toBeInstanceOf(RetryManager);
    });
  });

  describe('Successful operations', () => {
    it('should execute successful operation on first attempt', async () => {
      const retryManager = new RetryManager({
        maxAttempts: 3,
        strategy: RetryStrategy.FIXED,
        baseDelay: 100,
      });

      const mockOperation = jest.fn().mockResolvedValue('success');
      const result = await retryManager.execute(mockOperation);

      expect(result.result).toBe('success');
      expect(result.attemptsMade).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should return timing information', async () => {
      const retryManager = new RetryManager({
        maxAttempts: 3,
        strategy: RetryStrategy.FIXED,
        baseDelay: 100,
      });

      const mockOperation = jest.fn().mockResolvedValue('success');
      const result = await retryManager.execute(mockOperation);

      expect(result.totalTime).toBeGreaterThan(0);
      expect(typeof result.totalTime).toBe('number');
    });
  });

  describe('Retry scenarios', () => {
    it('should retry failed operations up to max attempts', async () => {
      const retryManager = new RetryManager({
        maxAttempts: 3,
        strategy: RetryStrategy.FIXED,
        baseDelay: 10, // Short delay for testing
      });

      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('attempt 1'))
        .mockRejectedValueOnce(new Error('attempt 2'))
        .mockResolvedValue('success');

      const result = await retryManager.execute(mockOperation);

      expect(result.result).toBe('success');
      expect(result.attemptsMade).toBe(3);
      expect(result.errors).toHaveLength(2);
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts exceeded', async () => {
      const retryManager = new RetryManager({
        maxAttempts: 2,
        strategy: RetryStrategy.FIXED,
        baseDelay: 10,
      });

      const error = new Error('persistent failure');
      const mockOperation = jest.fn().mockRejectedValue(error);

      await expect(retryManager.execute(mockOperation)).rejects.toThrow('persistent failure');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should call onRetry callback', async () => {
      const onRetryMock = jest.fn();
      const retryManager = new RetryManager({
        maxAttempts: 3,
        strategy: RetryStrategy.FIXED,
        baseDelay: 10,
        onRetry: onRetryMock,
      });

      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('attempt 1'))
        .mockResolvedValue('success');

      await retryManager.execute(mockOperation);

      expect(onRetryMock).toHaveBeenCalledTimes(1);
      expect(onRetryMock).toHaveBeenCalledWith(1, expect.any(Error));
    });
  });

  describe('Retryable error filtering', () => {
    it('should retry only retryable errors when filter is specified', async () => {
      const retryManager = new RetryManager({
        maxAttempts: 3,
        strategy: RetryStrategy.FIXED,
        baseDelay: 10,
        retryableErrors: ['NetworkError'],
      });

      const networkError = new Error('Network failure');
      networkError.name = 'NetworkError';
      const mockOperation = jest.fn().mockRejectedValue(networkError);

      await expect(retryManager.execute(mockOperation)).rejects.toThrow('Network failure');
      expect(mockOperation).toHaveBeenCalledTimes(3); // Should retry
    });

    it('should not retry non-retryable errors', async () => {
      const retryManager = new RetryManager({
        maxAttempts: 3,
        strategy: RetryStrategy.FIXED,
        baseDelay: 10,
        retryableErrors: ['NetworkError'],
      });

      const validationError = new Error('Validation failure');
      validationError.name = 'ValidationError';
      const mockOperation = jest.fn().mockRejectedValue(validationError);

      await expect(retryManager.execute(mockOperation)).rejects.toThrow('Validation failure');
      expect(mockOperation).toHaveBeenCalledTimes(1); // Should not retry
    });

    it('should retry all errors when no filter specified', async () => {
      const retryManager = new RetryManager({
        maxAttempts: 3,
        strategy: RetryStrategy.FIXED,
        baseDelay: 10,
      });

      const anyError = new Error('Any failure');
      const mockOperation = jest.fn().mockRejectedValue(anyError);

      await expect(retryManager.execute(mockOperation)).rejects.toThrow('Any failure');
      expect(mockOperation).toHaveBeenCalledTimes(3); // Should retry all errors
    });
  });

  describe('Delay strategies', () => {
    it('should use fixed delay strategy', async () => {
      const retryManager = new RetryManager({
        maxAttempts: 3,
        strategy: RetryStrategy.FIXED,
        baseDelay: 100,
        jitter: false,
      });

      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('attempt 1'))
        .mockRejectedValueOnce(new Error('attempt 2'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await retryManager.execute(mockOperation);
      const endTime = Date.now();

      // Should take approximately 200ms (2 delays of 100ms each)
      expect(endTime - startTime).toBeGreaterThan(180);
      expect(endTime - startTime).toBeLessThan(300);
    });

    it('should use exponential backoff strategy', async () => {
      const retryManager = new RetryManager({
        maxAttempts: 3,
        strategy: RetryStrategy.EXPONENTIAL,
        baseDelay: 50,
        jitter: false,
      });

      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('attempt 1'))
        .mockRejectedValueOnce(new Error('attempt 2'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await retryManager.execute(mockOperation);
      const endTime = Date.now();

      // Should take approximately 150ms (50ms + 100ms delays)
      expect(endTime - startTime).toBeGreaterThan(130);
      expect(endTime - startTime).toBeLessThan(250);
    });

    it('should use linear backoff strategy', async () => {
      const retryManager = new RetryManager({
        maxAttempts: 3,
        strategy: RetryStrategy.LINEAR,
        baseDelay: 50,
        jitter: false,
      });

      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('attempt 1'))
        .mockRejectedValueOnce(new Error('attempt 2'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await retryManager.execute(mockOperation);
      const endTime = Date.now();

      // Should take approximately 150ms (50ms + 100ms delays)
      expect(endTime - startTime).toBeGreaterThan(130);
      expect(endTime - startTime).toBeLessThan(250);
    });

    it('should respect max delay limit', async () => {
      const retryManager = new RetryManager({
        maxAttempts: 5,
        strategy: RetryStrategy.EXPONENTIAL,
        baseDelay: 100,
        maxDelay: 200,
        jitter: false,
      });

      const mockOperation = jest.fn().mockRejectedValue(new Error('failure'));

      const startTime = Date.now();
      await expect(retryManager.execute(mockOperation)).rejects.toThrow();
      const endTime = Date.now();

      // Even with exponential backoff, delays should be capped at 200ms
      // Total should be less than if uncapped exponential was used
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Static convenience methods', () => {
    it('should work with withExponentialBackoff', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('attempt 1'))
        .mockResolvedValue('success');

      const result = await RetryManager.withExponentialBackoff(
        mockOperation,
        3,
        10
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should work with withFixedDelay', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('attempt 1'))
        .mockResolvedValue('success');

      const result = await RetryManager.withFixedDelay(
        mockOperation,
        3,
        10
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should work with withLinearBackoff', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('attempt 1'))
        .mockResolvedValue('success');

      const result = await RetryManager.withLinearBackoff(
        mockOperation,
        3,
        10
      );

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle operations that throw non-Error objects', async () => {
      const retryManager = new RetryManager({
        maxAttempts: 2,
        strategy: RetryStrategy.FIXED,
        baseDelay: 10,
      });

      const mockOperation = jest.fn().mockRejectedValue('string error');

      await expect(retryManager.execute(mockOperation)).rejects.toBe('string error');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should handle operations that throw null/undefined', async () => {
      const retryManager = new RetryManager({
        maxAttempts: 2,
        strategy: RetryStrategy.FIXED,
        baseDelay: 10,
      });

      const mockOperation = jest.fn().mockRejectedValue(null);

      await expect(retryManager.execute(mockOperation)).rejects.toBeNull();
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('Jitter functionality', () => {
    it('should add jitter when enabled', async () => {
      const retryManager = new RetryManager({
        maxAttempts: 3,
        strategy: RetryStrategy.FIXED,
        baseDelay: 100,
        jitter: true,
      });

      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('attempt 1'))
        .mockResolvedValue('success');

      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      global.setTimeout = jest.fn((callback: any, delay: number) => {
        delays.push(delay);
        return originalSetTimeout(callback, 1); // Execute immediately for testing
      }) as any;

      await retryManager.execute(mockOperation);

      // Should have one delay with jitter applied
      expect(delays).toHaveLength(1);
      expect(delays[0]).not.toBe(100); // Should be different due to jitter
      expect(delays[0]).toBeGreaterThan(90); // Within reasonable jitter range
      expect(delays[0]).toBeLessThan(110);

      global.setTimeout = originalSetTimeout;
    });
  });
});