import { logger } from '../logger';

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  SYSTEM = 'SYSTEM',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  equipmentId?: string;
  operation?: string;
  component?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorMetadata {
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  userMessage?: string;
  technicalMessage?: string;
  correlationId?: string;
  context?: ErrorContext;
  timestamp: Date;
  stackTrace?: string;
}

export class EnhancedError extends Error {
  public readonly metadata: ErrorMetadata;
  public readonly originalError?: Error;

  constructor(
    message: string,
    metadata: Partial<ErrorMetadata> & { category: ErrorCategory },
    originalError?: Error
  ) {
    super(message);
    
    this.name = 'EnhancedError';
    this.originalError = originalError;
    
    this.metadata = {
      category: metadata.category,
      severity: metadata.severity || ErrorSeverity.MEDIUM,
      retryable: metadata.retryable || false,
      userMessage: metadata.userMessage,
      technicalMessage: metadata.technicalMessage || message,
      correlationId: metadata.correlationId || this.generateCorrelationId(),
      context: metadata.context,
      timestamp: new Date(),
      stackTrace: this.stack,
    };

    // Log the error when created
    this.logError();
  }

  private generateCorrelationId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logError(): void {
    const logData = {
      correlationId: this.metadata.correlationId,
      category: this.metadata.category,
      severity: this.metadata.severity,
      message: this.message,
      technicalMessage: this.metadata.technicalMessage,
      retryable: this.metadata.retryable,
      context: this.metadata.context,
      originalError: this.originalError?.message,
      stack: this.stack,
    };

    switch (this.metadata.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error('Critical error occurred', logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error('High severity error occurred', logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Medium severity error occurred', logData);
        break;
      case ErrorSeverity.LOW:
        logger.info('Low severity error occurred', logData);
        break;
    }
  }

  // Get user-friendly error message
  getUserMessage(): string {
    return this.metadata.userMessage || this.getDefaultUserMessage();
  }

  private getDefaultUserMessage(): string {
    switch (this.metadata.category) {
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication failed. Please check your credentials and try again.';
      case ErrorCategory.AUTHORIZATION:
        return 'You do not have permission to perform this action.';
      case ErrorCategory.VALIDATION:
        return 'The provided data is invalid. Please check your input and try again.';
      case ErrorCategory.NETWORK:
        return 'Network connection error. Please check your connection and try again.';
      case ErrorCategory.DATABASE:
        return 'A database error occurred. Please try again later.';
      case ErrorCategory.EXTERNAL_SERVICE:
        return 'An external service is currently unavailable. Please try again later.';
      case ErrorCategory.BUSINESS_LOGIC:
        return 'The operation could not be completed due to business rules.';
      case ErrorCategory.SYSTEM:
        return 'A system error occurred. Please try again later.';
      default:
        return 'An unexpected error occurred. Please try again later.';
    }
  }

  // Check if error is retryable
  isRetryable(): boolean {
    return this.metadata.retryable;
  }

  // Get error for API response
  toApiResponse(): {
    error: {
      code: string;
      message: string;
      correlationId: string;
      retryable: boolean;
      category: string;
      severity: string;
    };
  } {
    return {
      error: {
        code: this.metadata.category.toLowerCase().replace('_', '-'),
        message: this.getUserMessage(),
        correlationId: this.metadata.correlationId!,
        retryable: this.metadata.retryable,
        category: this.metadata.category,
        severity: this.metadata.severity,
      },
    };
  }

  // Create enhanced error from regular error
  static fromError(
    error: Error,
    category: ErrorCategory,
    metadata?: Partial<ErrorMetadata>
  ): EnhancedError {
    return new EnhancedError(
      error.message,
      {
        category,
        ...metadata,
      },
      error
    );
  }

  // Static factory methods for common error types
  static authentication(
    message: string,
    context?: ErrorContext,
    originalError?: Error
  ): EnhancedError {
    return new EnhancedError(
      message,
      {
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        context,
      },
      originalError
    );
  }

  static authorization(
    message: string,
    context?: ErrorContext,
    originalError?: Error
  ): EnhancedError {
    return new EnhancedError(
      message,
      {
        category: ErrorCategory.AUTHORIZATION,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        context,
      },
      originalError
    );
  }

  static validation(
    message: string,
    userMessage?: string,
    context?: ErrorContext,
    originalError?: Error
  ): EnhancedError {
    return new EnhancedError(
      message,
      {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retryable: false,
        userMessage,
        context,
      },
      originalError
    );
  }

  static network(
    message: string,
    context?: ErrorContext,
    originalError?: Error
  ): EnhancedError {
    return new EnhancedError(
      message,
      {
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        retryable: true,
        context,
      },
      originalError
    );
  }

  static database(
    message: string,
    context?: ErrorContext,
    originalError?: Error
  ): EnhancedError {
    return new EnhancedError(
      message,
      {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        retryable: true,
        context,
      },
      originalError
    );
  }

  static externalService(
    message: string,
    serviceName: string,
    context?: ErrorContext,
    originalError?: Error
  ): EnhancedError {
    return new EnhancedError(
      message,
      {
        category: ErrorCategory.EXTERNAL_SERVICE,
        severity: ErrorSeverity.HIGH,
        retryable: true,
        context: {
          ...context,
          component: serviceName,
        },
      },
      originalError
    );
  }

  static businessLogic(
    message: string,
    userMessage?: string,
    context?: ErrorContext,
    originalError?: Error
  ): EnhancedError {
    return new EnhancedError(
      message,
      {
        category: ErrorCategory.BUSINESS_LOGIC,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        userMessage,
        context,
      },
      originalError
    );
  }

  static system(
    message: string,
    severity: ErrorSeverity = ErrorSeverity.CRITICAL,
    context?: ErrorContext,
    originalError?: Error
  ): EnhancedError {
    return new EnhancedError(
      message,
      {
        category: ErrorCategory.SYSTEM,
        severity,
        retryable: severity !== ErrorSeverity.CRITICAL,
        context,
      },
      originalError
    );
  }
}