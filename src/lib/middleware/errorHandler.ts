import { NextRequest, NextResponse } from 'next/server';
import { EnhancedError, ErrorCategory, ErrorSeverity } from '@/lib/enhanced-error/EnhancedError';
import { logger } from '@/lib/logger';

export interface ErrorHandlerOptions {
  enableStackTrace?: boolean;
  enableUserMessages?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
}

export class ApiErrorHandler {
  constructor(private options: ErrorHandlerOptions = {}) {
    this.options = {
      enableStackTrace: process.env.NODE_ENV === 'development',
      enableUserMessages: true,
      logLevel: 'error',
      ...options,
    };
  }

  /**
   * Handle API route errors and return appropriate responses
   */
  handleError(error: unknown, request?: NextRequest): NextResponse {
    const enhancedError = this.normalizeError(error, request);
    
    // Log the error
    this.logError(enhancedError, request);

    // Determine HTTP status code
    const statusCode = this.getStatusCode(enhancedError);

    // Build response
    const response = this.buildErrorResponse(enhancedError);

    return NextResponse.json(response, { status: statusCode });
  }

  /**
   * Wrap API route handler with error handling
   */
  wrapHandler<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      try {
        return await handler(request, ...args);
      } catch (error) {
        return this.handleError(error, request);
      }
    };
  }

  private normalizeError(error: unknown, request?: NextRequest): EnhancedError {
    if (error instanceof EnhancedError) {
      return error;
    }

    if (error instanceof Error) {
      // Check for specific error types and categorize them
      const category = this.categorizeError(error);
      
      return EnhancedError.fromError(error, category, {
        context: {
          requestId: this.getRequestId(request),
          operation: request?.nextUrl.pathname,
          component: 'ApiRoute',
        },
      });
    }

    // Handle unknown error types
    return new EnhancedError(
      typeof error === 'string' ? error : 'Unknown error occurred',
      {
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        context: {
          requestId: this.getRequestId(request),
          operation: request?.nextUrl.pathname,
          component: 'ApiRoute',
          additionalData: { originalError: error },
        },
      }
    );
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Database errors
    if (name.includes('prisma') || 
        message.includes('database') || 
        message.includes('connection') ||
        message.includes('timeout') ||
        name.includes('pool')) {
      return ErrorCategory.DATABASE;
    }

    // Network errors
    if (name.includes('network') ||
        message.includes('network') ||
        message.includes('econnrefused') ||
        message.includes('enotfound') ||
        message.includes('timeout')) {
      return ErrorCategory.NETWORK;
    }

    // Validation errors
    if (name.includes('validation') ||
        name.includes('zod') ||
        message.includes('invalid') ||
        message.includes('required') ||
        message.includes('must be')) {
      return ErrorCategory.VALIDATION;
    }

    // Authentication/Authorization errors
    if (name.includes('auth') ||
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('token') ||
        message.includes('permission')) {
      return error.message.toLowerCase().includes('unauthorized') 
        ? ErrorCategory.AUTHENTICATION 
        : ErrorCategory.AUTHORIZATION;
    }

    // External service errors
    if (message.includes('external') ||
        message.includes('service') ||
        message.includes('api') ||
        message.includes('third-party')) {
      return ErrorCategory.EXTERNAL_SERVICE;
    }

    // Default to system error
    return ErrorCategory.SYSTEM;
  }

  private getStatusCode(error: EnhancedError): number {
    switch (error.metadata.category) {
      case ErrorCategory.AUTHENTICATION:
        return 401;
      case ErrorCategory.AUTHORIZATION:
        return 403;
      case ErrorCategory.VALIDATION:
        return 400;
      case ErrorCategory.NETWORK:
      case ErrorCategory.DATABASE:
      case ErrorCategory.EXTERNAL_SERVICE:
        return error.metadata.retryable ? 503 : 500;
      case ErrorCategory.BUSINESS_LOGIC:
        return 422; // Unprocessable Entity
      case ErrorCategory.SYSTEM:
        return 500;
      default:
        return 500;
    }
  }

  private buildErrorResponse(error: EnhancedError): any {
    const baseResponse = {
      error: {
        code: error.metadata.category.toLowerCase().replace('_', '-'),
        message: this.options.enableUserMessages 
          ? error.getUserMessage() 
          : 'An error occurred',
        correlationId: error.metadata.correlationId,
        timestamp: error.metadata.timestamp,
        retryable: error.metadata.retryable,
      },
    };

    // Add technical details in development
    if (process.env.NODE_ENV === 'development') {
      (baseResponse.error as any).technicalMessage = error.metadata.technicalMessage;
      (baseResponse.error as any).category = error.metadata.category;
      (baseResponse.error as any).severity = error.metadata.severity;
      
      if (this.options.enableStackTrace && error.metadata.stackTrace) {
        (baseResponse.error as any).stack = error.metadata.stackTrace;
      }
    }

    return baseResponse;
  }

  private logError(error: EnhancedError, request?: NextRequest): void {
    const logData = {
      correlationId: error.metadata.correlationId,
      category: error.metadata.category,
      severity: error.metadata.severity,
      message: error.message,
      path: request?.nextUrl.pathname,
      method: request?.method,
      userAgent: request?.headers.get('user-agent'),
      ip: this.getClientIP(request),
      context: error.metadata.context,
    };

    switch (error.metadata.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error('Critical API error', logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error('High severity API error', logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('Medium severity API error', logData);
        break;
      case ErrorSeverity.LOW:
        logger.info('Low severity API error', logData);
        break;
    }
  }

  private getRequestId(request?: NextRequest): string {
    return request?.headers.get('x-request-id') || 
           `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIP(request?: NextRequest): string | undefined {
    if (!request) return undefined;
    
    return request.headers.get('x-forwarded-for')?.split(',')[0] ||
           request.headers.get('x-real-ip') ||
           request.headers.get('cf-connecting-ip') ||
           'unknown';
  }
}

// Singleton instance for application use
export const apiErrorHandler = new ApiErrorHandler();

// Convenience function for API routes
export function withErrorHandler<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return apiErrorHandler.wrapHandler(handler);
}

// Middleware for global error handling in Next.js API routes
export function createErrorMiddleware(options?: ErrorHandlerOptions) {
  const errorHandler = new ApiErrorHandler(options);
  
  return function errorMiddleware(
    handler: (request: NextRequest) => Promise<NextResponse>
  ) {
    return errorHandler.wrapHandler(handler);
  };
}

// Custom error classes for specific scenarios
export class ValidationError extends EnhancedError {
  constructor(message: string, field?: string, value?: any) {
    super(message, {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      retryable: false,
      userMessage: message,
      context: {
        additionalData: { field, value },
      },
    });
  }
}

export class AuthenticationError extends EnhancedError {
  constructor(message: string = 'Authentication required') {
    super(message, {
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      userMessage: 'Authentication required. Please log in and try again.',
    });
  }
}

export class AuthorizationError extends EnhancedError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, {
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      userMessage: 'You do not have permission to perform this action.',
    });
  }
}

export class BusinessLogicError extends EnhancedError {
  constructor(message: string, userMessage?: string) {
    super(message, {
      category: ErrorCategory.BUSINESS_LOGIC,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      userMessage: userMessage || message,
    });
  }
}