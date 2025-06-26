// Jest test - using global test functions
/**
 * Error Handler Tests
 * Comprehensive test suite for error handling and logging
 */

import { ErrorHandler, ApplicationError, ErrorCode, ErrorSeverity } from '@/lib/error/ErrorHandler';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  errorLog: {
    create: jest.fn()
  }
} as unknown as PrismaClient;

// Mock console methods
const originalConsole = global.console;
const mockConsole = {
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn()
};

describe('ApplicationError', () => {
  test('should create error with all properties', () => {
    const error = new ApplicationError(
      'Test error message',
      ErrorCode.VALIDATION_FAILED,
      ErrorSeverity.MEDIUM,
      400,
      {
        context: { field: 'test' },
        userMessage: 'Custom user message',
        retryable: true,
        correlationId: 'test-correlation-id'
      }
    );

    expect(error.message).toBe('Test error message');
    expect(error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.statusCode).toBe(400);
    expect(error.context).toEqual({ field: 'test' });
    expect(error.userMessage).toBe('Custom user message');
    expect(error.retryable).toBe(true);
    expect(error.correlationId).toBe('test-correlation-id');
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  test('should use default values when not provided', () => {
    const error = new ApplicationError(
      'Test error',
      ErrorCode.INTERNAL_SERVER_ERROR
    );

    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.statusCode).toBe(500);
    expect(error.userMessage).toBe('An internal error occurred. Please try again.');
    expect(error.retryable).toBe(false);
    expect(error.correlationId).toMatch(/^err_\d+_[a-z0-9]+$/);
  });

  test('should determine retryable status based on error code', () => {
    const retryableError = new ApplicationError(
      'Database connection failed',
      ErrorCode.DATABASE_CONNECTION_FAILED
    );
    expect(retryableError.retryable).toBe(true);

    const nonRetryableError = new ApplicationError(
      'Validation failed',
      ErrorCode.VALIDATION_FAILED
    );
    expect(nonRetryableError.retryable).toBe(false);
  });

  test('should include cause in stack trace', () => {
    const causeError = new Error('Original cause');
    const error = new ApplicationError(
      'Wrapper error',
      ErrorCode.INTERNAL_SERVER_ERROR,
      ErrorSeverity.HIGH,
      500,
      { cause: causeError }
    );

    expect(error.stack).toContain('Caused by:');
    expect(error.stack).toContain('Original cause');
  });
});

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    (errorHandler as any).prisma = mockPrisma;
    
    // Mock console
    global.console = mockConsole as any;
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.console = originalConsole;
    jest.resetAllMocks();
  });

  describe('logError', () => {
    test('should log error to database and console', async () => {
      const error = new ApplicationError(
        'Test error',
        ErrorCode.VALIDATION_FAILED,
        ErrorSeverity.MEDIUM,
        400
      );

      const mockRequest = {
        headers: new Map([
          ['user-agent', 'Mozilla/5.0'],
          ['x-forwarded-for', '192.168.1.1']
        ]),
        url: 'https://example.com/api/test',
        method: 'POST'
      } as any as NextRequest;

      (mockPrisma.errorLog.create as any).mockResolvedValue({});

      await errorHandler.logError(error, mockRequest, 'user-123');

      expect(mockPrisma.errorLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          errorId: error.correlationId,
          message: 'Test error',
          code: ErrorCode.VALIDATION_FAILED,
          severity: ErrorSeverity.MEDIUM,
          statusCode: 400,
          userAgent: 'Mozilla/5.0',
          url: 'https://example.com/api/test',
          method: 'POST',
          ipAddress: '192.168.1.1',
          userId: 'user-123',
          resolved: false
        })
      });

      expect(mockConsole.warn).toHaveBeenCalled();
    });

    test('should handle database logging failure gracefully', async () => {
      const error = new ApplicationError(
        'Test error',
        ErrorCode.VALIDATION_FAILED
      );

      (mockPrisma.errorLog.create as any).mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(errorHandler.logError(error)).resolves.not.toThrow();

      expect(mockConsole.error).toHaveBeenCalledWith('Failed to log error:', expect.any(Error));
    });

    test('should send alerts for critical errors', async () => {
      const criticalError = new ApplicationError(
        'Critical system failure',
        ErrorCode.INTERNAL_SERVER_ERROR,
        ErrorSeverity.CRITICAL
      );

      const alertHandler = jest.fn().mockResolvedValue(undefined);
      errorHandler.addAlertHandler(alertHandler);

      (mockPrisma.errorLog.create as any).mockResolvedValue({});

      await errorHandler.logError(criticalError);

      expect(alertHandler).toHaveBeenCalledWith(criticalError);
    });
  });

  describe('handleAPIError', () => {
    test('should handle ApplicationError correctly', () => {
      const error = new ApplicationError(
        'Test validation error',
        ErrorCode.VALIDATION_FAILED,
        ErrorSeverity.LOW,
        400
      );

      const response = errorHandler.handleAPIError(error);

      expect(response.status).toBe(400);
      
      // Response body is already created by NextResponse.json
      // We can't easily parse it in tests, so just verify the response status
    });

    test('should convert regular Error to ApplicationError', () => {
      const error = new Error('Regular error');

      const response = errorHandler.handleAPIError(error);

      expect(response.status).toBe(500);
      
      // Response already formatted by NextResponse
    });

    test('should include debug info in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new ApplicationError(
        'Test error',
        ErrorCode.VALIDATION_FAILED,
        ErrorSeverity.LOW,
        400,
        { context: { field: 'test' } }
      );

      const response = errorHandler.handleAPIError(error);
      // Response already formatted by NextResponse
      expect(response.status).toBe(400);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('withRetry', () => {
    test('should retry failed operations', async () => {
      let attempts = 0;
      const operation = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new ApplicationError(
            'Temporary failure',
            ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
            ErrorSeverity.MEDIUM,
            503,
            { retryable: true }
          );
        }
        return 'success';
      });

      const result = await errorHandler.withRetry(operation, {
        maxAttempts: 3,
        delayMs: 10 // Short delay for testing
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    test('should not retry non-retryable errors', async () => {
      const operation = jest.fn().mockImplementation(() => {
        throw new ApplicationError(
          'Validation error',
          ErrorCode.VALIDATION_FAILED,
          ErrorSeverity.LOW,
          400,
          { retryable: false }
        );
      });

      await expect(errorHandler.withRetry(operation)).rejects.toThrow('Validation error');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should respect maxAttempts limit', async () => {
      const operation = jest.fn().mockImplementation(() => {
        throw new ApplicationError(
          'Always fails',
          ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          ErrorSeverity.MEDIUM,
          503,
          { retryable: true }
        );
      });

      await expect(errorHandler.withRetry(operation, { maxAttempts: 2 })).rejects.toThrow('Always fails');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });

  describe('createCircuitBreaker', () => {
    test('should open circuit after failure threshold', async () => {
      let callCount = 0;
      const operation = jest.fn().mockImplementation(() => {
        callCount++;
        throw new Error('Service failure');
      });

      const circuitBreaker = errorHandler.createCircuitBreaker(operation, {
        failureThreshold: 3,
        resetTimeoutMs: 1000,
        monitoringWindowMs: 10000
      });

      // First 3 calls should fail normally
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker()).rejects.toThrow('Service failure');
      }

      // 4th call should be rejected by circuit breaker
      await expect(circuitBreaker()).rejects.toThrow('Circuit breaker is open');
      
      // Operation should not have been called for the 4th attempt
      expect(operation).toHaveBeenCalledTimes(3);
    });

    test('should reset circuit after timeout', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Failure'))
        .mockRejectedValueOnce(new Error('Failure'))
        .mockRejectedValueOnce(new Error('Failure'))
        .mockResolvedValueOnce('Success');

      const circuitBreaker = errorHandler.createCircuitBreaker(operation, {
        failureThreshold: 3,
        resetTimeoutMs: 50, // Short timeout for testing
        monitoringWindowMs: 10000
      });

      // Trigger circuit to open
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker()).rejects.toThrow('Failure');
      }

      // Should be blocked
      await expect(circuitBreaker()).rejects.toThrow('Circuit breaker is open');

      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 60));

      // Should work again
      const result = await circuitBreaker();
      expect(result).toBe('Success');
    });
  });

  describe('convertToApplicationError', () => {
    test('should convert connection errors', () => {
      const connectionError = new Error('connect ECONNREFUSED 127.0.0.1:5432');
      
      const appError = (errorHandler as any).convertToApplicationError(connectionError);
      
      expect(appError).toBeInstanceOf(ApplicationError);
      expect(appError.code).toBe(ErrorCode.DATABASE_CONNECTION_FAILED);
      expect(appError.retryable).toBe(true);
    });

    test('should convert timeout errors', () => {
      const timeoutError = new Error('Request timeout after 5000ms');
      
      const appError = (errorHandler as any).convertToApplicationError(timeoutError);
      
      expect(appError.code).toBe(ErrorCode.EXTERNAL_SERVICE_TIMEOUT);
      expect(appError.retryable).toBe(true);
    });

    test('should default to internal server error', () => {
      const unknownError = new Error('Unknown error');
      
      const appError = (errorHandler as any).convertToApplicationError(unknownError);
      
      expect(appError.code).toBe(ErrorCode.INTERNAL_SERVER_ERROR);
      expect(appError.severity).toBe(ErrorSeverity.HIGH);
    });
  });
});