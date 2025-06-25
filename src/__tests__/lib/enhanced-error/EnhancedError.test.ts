import { 
  EnhancedError, 
  ErrorCategory, 
  ErrorSeverity 
} from '@/lib/enhanced-error/EnhancedError';

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('EnhancedError', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    it('should create enhanced error with required fields', () => {
      const error = new EnhancedError('Test error', {
        category: ErrorCategory.SYSTEM,
      });

      expect(error.message).toBe('Test error');
      expect(error.metadata.category).toBe(ErrorCategory.SYSTEM);
      expect(error.metadata.severity).toBe(ErrorSeverity.MEDIUM); // default
      expect(error.metadata.retryable).toBe(false); // default
      expect(error.metadata.correlationId).toBeDefined();
      expect(error.metadata.timestamp).toBeInstanceOf(Date);
    });

    it('should create enhanced error with all fields', () => {
      const context = {
        userId: '123',
        operation: 'testOp',
        additionalData: { key: 'value' },
      };

      const error = new EnhancedError('Test error', {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        retryable: true,
        userMessage: 'User friendly message',
        technicalMessage: 'Technical details',
        correlationId: 'custom-id',
        context,
      });

      expect(error.metadata.category).toBe(ErrorCategory.DATABASE);
      expect(error.metadata.severity).toBe(ErrorSeverity.HIGH);
      expect(error.metadata.retryable).toBe(true);
      expect(error.metadata.userMessage).toBe('User friendly message');
      expect(error.metadata.technicalMessage).toBe('Technical details');
      expect(error.metadata.correlationId).toBe('custom-id');
      expect(error.metadata.context).toEqual(context);
    });

    it('should store original error when provided', () => {
      const originalError = new Error('Original error');
      const enhancedError = new EnhancedError('Enhanced message', {
        category: ErrorCategory.NETWORK,
      }, originalError);

      expect(enhancedError.originalError).toBe(originalError);
    });

    it('should generate correlation ID when not provided', () => {
      const error = new EnhancedError('Test error', {
        category: ErrorCategory.SYSTEM,
      });

      expect(error.metadata.correlationId).toMatch(/^err_\d+_[a-z0-9]+$/);
    });
  });

  describe('User messages', () => {
    it('should return custom user message when provided', () => {
      const error = new EnhancedError('Technical error', {
        category: ErrorCategory.VALIDATION,
        userMessage: 'Custom user message',
      });

      expect(error.getUserMessage()).toBe('Custom user message');
    });

    it('should return default user message for authentication errors', () => {
      const error = new EnhancedError('Auth failed', {
        category: ErrorCategory.AUTHENTICATION,
      });

      expect(error.getUserMessage()).toContain('Authentication failed');
    });

    it('should return default user message for authorization errors', () => {
      const error = new EnhancedError('Access denied', {
        category: ErrorCategory.AUTHORIZATION,
      });

      expect(error.getUserMessage()).toContain('permission');
    });

    it('should return default user message for validation errors', () => {
      const error = new EnhancedError('Invalid input', {
        category: ErrorCategory.VALIDATION,
      });

      expect(error.getUserMessage()).toContain('invalid');
    });

    it('should return default user message for network errors', () => {
      const error = new EnhancedError('Network failure', {
        category: ErrorCategory.NETWORK,
      });

      expect(error.getUserMessage()).toContain('Network connection error');
    });

    it('should return default user message for database errors', () => {
      const error = new EnhancedError('DB error', {
        category: ErrorCategory.DATABASE,
      });

      expect(error.getUserMessage()).toContain('database error');
    });

    it('should return default user message for external service errors', () => {
      const error = new EnhancedError('Service down', {
        category: ErrorCategory.EXTERNAL_SERVICE,
      });

      expect(error.getUserMessage()).toContain('external service');
    });

    it('should return default user message for business logic errors', () => {
      const error = new EnhancedError('Rule violation', {
        category: ErrorCategory.BUSINESS_LOGIC,
      });

      expect(error.getUserMessage()).toContain('business rules');
    });

    it('should return default user message for system errors', () => {
      const error = new EnhancedError('System failure', {
        category: ErrorCategory.SYSTEM,
      });

      expect(error.getUserMessage()).toContain('system error');
    });

    it('should return default user message for unknown errors', () => {
      const error = new EnhancedError('Unknown failure', {
        category: ErrorCategory.UNKNOWN,
      });

      expect(error.getUserMessage()).toContain('unexpected error');
    });
  });

  describe('Retryable check', () => {
    it('should return true when error is retryable', () => {
      const error = new EnhancedError('Test error', {
        category: ErrorCategory.NETWORK,
        retryable: true,
      });

      expect(error.isRetryable()).toBe(true);
    });

    it('should return false when error is not retryable', () => {
      const error = new EnhancedError('Test error', {
        category: ErrorCategory.VALIDATION,
        retryable: false,
      });

      expect(error.isRetryable()).toBe(false);
    });
  });

  describe('API response', () => {
    it('should format error for API response', () => {
      const error = new EnhancedError('Test error', {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retryable: false,
        userMessage: 'User message',
        correlationId: 'test-id',
      });

      const response = error.toApiResponse();

      expect(response).toEqual({
        error: {
          code: 'validation',
          message: 'User message',
          correlationId: 'test-id',
          retryable: false,
          category: 'VALIDATION',
          severity: 'LOW',
        },
      });
    });

    it('should handle category with underscore in API response', () => {
      const error = new EnhancedError('Test error', {
        category: ErrorCategory.EXTERNAL_SERVICE,
      });

      const response = error.toApiResponse();
      expect(response.error.code).toBe('external-service');
    });
  });

  describe('Static factory methods', () => {
    describe('fromError', () => {
      it('should create enhanced error from regular error', () => {
        const originalError = new Error('Original message');
        const enhancedError = EnhancedError.fromError(
          originalError,
          ErrorCategory.DATABASE,
          { severity: ErrorSeverity.HIGH }
        );

        expect(enhancedError.message).toBe('Original message');
        expect(enhancedError.metadata.category).toBe(ErrorCategory.DATABASE);
        expect(enhancedError.metadata.severity).toBe(ErrorSeverity.HIGH);
        expect(enhancedError.originalError).toBe(originalError);
      });
    });

    describe('authentication', () => {
      it('should create authentication error', () => {
        const error = EnhancedError.authentication('Auth failed');

        expect(error.metadata.category).toBe(ErrorCategory.AUTHENTICATION);
        expect(error.metadata.severity).toBe(ErrorSeverity.MEDIUM);
        expect(error.metadata.retryable).toBe(false);
      });

      it('should accept context and original error', () => {
        const originalError = new Error('Original');
        const context = { userId: '123' };
        const error = EnhancedError.authentication('Auth failed', context, originalError);

        expect(error.metadata.context).toBe(context);
        expect(error.originalError).toBe(originalError);
      });
    });

    describe('authorization', () => {
      it('should create authorization error', () => {
        const error = EnhancedError.authorization('Access denied');

        expect(error.metadata.category).toBe(ErrorCategory.AUTHORIZATION);
        expect(error.metadata.severity).toBe(ErrorSeverity.MEDIUM);
        expect(error.metadata.retryable).toBe(false);
      });
    });

    describe('validation', () => {
      it('should create validation error', () => {
        const error = EnhancedError.validation('Invalid input', 'User message');

        expect(error.metadata.category).toBe(ErrorCategory.VALIDATION);
        expect(error.metadata.severity).toBe(ErrorSeverity.LOW);
        expect(error.metadata.retryable).toBe(false);
        expect(error.metadata.userMessage).toBe('User message');
      });
    });

    describe('network', () => {
      it('should create network error', () => {
        const error = EnhancedError.network('Connection failed');

        expect(error.metadata.category).toBe(ErrorCategory.NETWORK);
        expect(error.metadata.severity).toBe(ErrorSeverity.HIGH);
        expect(error.metadata.retryable).toBe(true);
      });
    });

    describe('database', () => {
      it('should create database error', () => {
        const error = EnhancedError.database('Query failed');

        expect(error.metadata.category).toBe(ErrorCategory.DATABASE);
        expect(error.metadata.severity).toBe(ErrorSeverity.HIGH);
        expect(error.metadata.retryable).toBe(true);
      });
    });

    describe('externalService', () => {
      it('should create external service error', () => {
        const error = EnhancedError.externalService('API failed', 'PaymentAPI');

        expect(error.metadata.category).toBe(ErrorCategory.EXTERNAL_SERVICE);
        expect(error.metadata.severity).toBe(ErrorSeverity.HIGH);
        expect(error.metadata.retryable).toBe(true);
        expect(error.metadata.context?.component).toBe('PaymentAPI');
      });

      it('should merge context with service name', () => {
        const context = { userId: '123' };
        const error = EnhancedError.externalService('API failed', 'PaymentAPI', context);

        expect(error.metadata.context).toEqual({
          userId: '123',
          component: 'PaymentAPI',
        });
      });
    });

    describe('businessLogic', () => {
      it('should create business logic error', () => {
        const error = EnhancedError.businessLogic('Rule violation', 'User message');

        expect(error.metadata.category).toBe(ErrorCategory.BUSINESS_LOGIC);
        expect(error.metadata.severity).toBe(ErrorSeverity.MEDIUM);
        expect(error.metadata.retryable).toBe(false);
        expect(error.metadata.userMessage).toBe('User message');
      });
    });

    describe('system', () => {
      it('should create system error with default critical severity', () => {
        const error = EnhancedError.system('System failure');

        expect(error.metadata.category).toBe(ErrorCategory.SYSTEM);
        expect(error.metadata.severity).toBe(ErrorSeverity.CRITICAL);
        expect(error.metadata.retryable).toBe(false); // Critical errors are not retryable
      });

      it('should create system error with custom severity', () => {
        const error = EnhancedError.system('System warning', ErrorSeverity.MEDIUM);

        expect(error.metadata.category).toBe(ErrorCategory.SYSTEM);
        expect(error.metadata.severity).toBe(ErrorSeverity.MEDIUM);
        expect(error.metadata.retryable).toBe(true); // Non-critical system errors are retryable
      });
    });
  });

  describe('Logging behavior', () => {
    it('should log error when created', () => {
      const { logger } = require('@/lib/logger');
      
      new EnhancedError('Test error', {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.HIGH,
      });

      expect(logger.error).toHaveBeenCalledWith(
        'High severity error occurred',
        expect.objectContaining({
          category: ErrorCategory.SYSTEM,
          severity: ErrorSeverity.HIGH,
          message: 'Test error',
        })
      );
    });

    it('should log with appropriate level based on severity', () => {
      const { logger } = require('@/lib/logger');

      // Critical
      new EnhancedError('Critical error', {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.CRITICAL,
      });

      // High
      new EnhancedError('High error', {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.HIGH,
      });

      // Medium
      new EnhancedError('Medium error', {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.MEDIUM,
      });

      // Low
      new EnhancedError('Low error', {
        category: ErrorCategory.SYSTEM,
        severity: ErrorSeverity.LOW,
      });

      expect(logger.error).toHaveBeenCalledTimes(2); // Critical and High
      expect(logger.warn).toHaveBeenCalledTimes(1);  // Medium
      expect(logger.info).toHaveBeenCalledTimes(1);  // Low
    });
  });
});