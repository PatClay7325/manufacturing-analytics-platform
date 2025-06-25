/**
 * Centralized Error Handler
 * Production-ready error handling with categorization and recovery
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

// Error categories
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT',
  DATABASE = 'DATABASE',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  FILE_OPERATION = 'FILE_OPERATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  INTERNAL = 'INTERNAL',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Custom error class
export class AppError extends Error {
  public readonly id: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: Record<string, any>;
  public readonly correlationId?: string;
  public readonly timestamp: Date;

  constructor(
    message: string,
    category: ErrorCategory,
    statusCode: number,
    options?: {
      severity?: ErrorSeverity;
      isOperational?: boolean;
      context?: Record<string, any>;
      correlationId?: string;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.id = randomUUID();
    this.category = category;
    this.statusCode = statusCode;
    this.severity = options?.severity || ErrorSeverity.MEDIUM;
    this.isOperational = options?.isOperational ?? true;
    this.context = options?.context;
    this.correlationId = options?.correlationId || this.getCorrelationId();
    this.timestamp = new Date();
    
    if (options?.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace(this, this.constructor);
  }

  private getCorrelationId(): string {
    // Try to get from async context or generate new
    return (global as any).__currentJob?.correlationId || randomUUID();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      context: this.context,
      correlationId: this.correlationId,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined,
    };
  }
}

// Error factory functions
export const ValidationError = (message: string, context?: any) =>
  new AppError(message, ErrorCategory.VALIDATION, 400, {
    severity: ErrorSeverity.LOW,
    context,
  });

export const AuthenticationError = (message: string) =>
  new AppError(message, ErrorCategory.AUTHENTICATION, 401, {
    severity: ErrorSeverity.MEDIUM,
  });

export const AuthorizationError = (message: string, context?: any) =>
  new AppError(message, ErrorCategory.AUTHORIZATION, 403, {
    severity: ErrorSeverity.MEDIUM,
    context,
  });

export const NotFoundError = (resource: string, id?: string) =>
  new AppError(`${resource} not found`, ErrorCategory.NOT_FOUND, 404, {
    severity: ErrorSeverity.LOW,
    context: { resource, id },
  });

export const ConflictError = (message: string, context?: any) =>
  new AppError(message, ErrorCategory.CONFLICT, 409, {
    severity: ErrorSeverity.MEDIUM,
    context,
  });

export const RateLimitError = (limit: number, window: string) =>
  new AppError('Rate limit exceeded', ErrorCategory.RATE_LIMIT, 429, {
    severity: ErrorSeverity.LOW,
    context: { limit, window },
  });

export const DatabaseError = (operation: string, error: any) =>
  new AppError('Database operation failed', ErrorCategory.DATABASE, 500, {
    severity: ErrorSeverity.HIGH,
    isOperational: false,
    context: { operation },
    cause: error,
  });

export const ExternalServiceError = (service: string, error: any) =>
  new AppError(`External service error: ${service}`, ErrorCategory.EXTERNAL_SERVICE, 502, {
    severity: ErrorSeverity.HIGH,
    context: { service },
    cause: error,
  });

export const FileOperationError = (operation: string, path: string, error: any) =>
  new AppError(`File operation failed: ${operation}`, ErrorCategory.FILE_OPERATION, 500, {
    severity: ErrorSeverity.MEDIUM,
    context: { operation, path },
    cause: error,
  });

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: Map<ErrorCategory, Array<(error: AppError) => void>> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle error and return appropriate response
   */
  handleError(error: any, request?: NextRequest): NextResponse {
    const appError = this.normalizeError(error);
    
    // Log error
    this.logError(appError, request);
    
    // Notify listeners
    this.notifyListeners(appError);
    
    // Check circuit breakers
    this.updateCircuitBreakers(appError);
    
    // Return response
    return this.createErrorResponse(appError);
  }

  /**
   * Normalize various error types to AppError
   */
  private normalizeError(error: any): AppError {
    // Already an AppError
    if (error instanceof AppError) {
      return error;
    }

    // Zod validation error
    if (error instanceof ZodError) {
      return new AppError(
        'Validation failed',
        ErrorCategory.VALIDATION,
        400,
        {
          severity: ErrorSeverity.LOW,
          context: { errors: error.flatten() },
        }
      );
    }

    // JWT errors
    if (error instanceof jwt.JsonWebTokenError) {
      return new AppError(
        'Invalid token',
        ErrorCategory.AUTHENTICATION,
        401,
        {
          severity: ErrorSeverity.MEDIUM,
          cause: error,
        }
      );
    }

    if (error instanceof jwt.TokenExpiredError) {
      return new AppError(
        'Token expired',
        ErrorCategory.AUTHENTICATION,
        401,
        {
          severity: ErrorSeverity.LOW,
          cause: error,
        }
      );
    }

    // Prisma errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(error);
    }

    // Network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return new AppError(
        'Service unavailable',
        ErrorCategory.EXTERNAL_SERVICE,
        503,
        {
          severity: ErrorSeverity.HIGH,
          isOperational: false,
          cause: error,
        }
      );
    }

    // Default error
    return new AppError(
      error.message || 'Internal server error',
      ErrorCategory.INTERNAL,
      500,
      {
        severity: ErrorSeverity.CRITICAL,
        isOperational: false,
        cause: error,
      }
    );
  }

  /**
   * Handle Prisma-specific errors
   */
  private handlePrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
    switch (error.code) {
      case 'P2002':
        return new AppError(
          'Unique constraint violation',
          ErrorCategory.CONFLICT,
          409,
          {
            severity: ErrorSeverity.MEDIUM,
            context: { target: error.meta?.target },
            cause: error,
          }
        );
      
      case 'P2025':
        return new AppError(
          'Record not found',
          ErrorCategory.NOT_FOUND,
          404,
          {
            severity: ErrorSeverity.LOW,
            cause: error,
          }
        );
      
      case 'P2003':
        return new AppError(
          'Foreign key constraint violation',
          ErrorCategory.VALIDATION,
          400,
          {
            severity: ErrorSeverity.MEDIUM,
            context: { field: error.meta?.field_name },
            cause: error,
          }
        );
      
      default:
        return new AppError(
          'Database error',
          ErrorCategory.DATABASE,
          500,
          {
            severity: ErrorSeverity.HIGH,
            isOperational: false,
            context: { code: error.code },
            cause: error,
          }
        );
    }
  }

  /**
   * Log error with appropriate level
   */
  private logError(error: AppError, request?: NextRequest): void {
    const logData = {
      error: error.toJSON(),
      request: request ? {
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      } : undefined,
    };

    switch (error.severity) {
      case ErrorSeverity.LOW:
        console.info('Error occurred:', logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('Error occurred:', logData);
        break;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        console.error('Error occurred:', logData);
        break;
    }

    // Send to monitoring service
    if (error.severity === ErrorSeverity.CRITICAL || !error.isOperational) {
      this.sendToMonitoring(error, request);
    }
  }

  /**
   * Create error response
   */
  private createErrorResponse(error: AppError): NextResponse {
    const response = {
      error: {
        id: error.id,
        message: error.message,
        category: error.category,
        correlationId: error.correlationId,
        timestamp: error.timestamp,
        ...(process.env.NODE_ENV === 'development' && {
          context: error.context,
          stack: error.stack,
        }),
      },
    };

    return NextResponse.json(response, {
      status: error.statusCode,
      headers: {
        'X-Error-Id': error.id,
        'X-Correlation-Id': error.correlationId || '',
      },
    });
  }

  /**
   * Register error listener
   */
  onError(category: ErrorCategory, listener: (error: AppError) => void): void {
    if (!this.errorListeners.has(category)) {
      this.errorListeners.set(category, []);
    }
    this.errorListeners.get(category)!.push(listener);
  }

  /**
   * Notify error listeners
   */
  private notifyListeners(error: AppError): void {
    const listeners = this.errorListeners.get(error.category) || [];
    listeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }

  /**
   * Get or create circuit breaker
   */
  getCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(name, options));
    }
    return this.circuitBreakers.get(name)!;
  }

  /**
   * Update circuit breakers based on error
   */
  private updateCircuitBreakers(error: AppError): void {
    if (error.category === ErrorCategory.EXTERNAL_SERVICE && error.context?.service) {
      const breaker = this.getCircuitBreaker(error.context.service);
      breaker.recordFailure();
    }
  }

  /**
   * Send critical errors to monitoring
   */
  private sendToMonitoring(error: AppError, request?: NextRequest): void {
    // This would integrate with Sentry, DataDog, etc.
    // For now, just log
    console.error('[MONITORING] Critical error:', {
      error: error.toJSON(),
      request: request?.url,
    });
  }

  /**
   * Error recovery strategies
   */
  async recover(error: AppError): Promise<void> {
    switch (error.category) {
      case ErrorCategory.DATABASE:
        // Retry with backoff
        await this.retryWithBackoff(async () => {
          // Reconnect database
        });
        break;
      
      case ErrorCategory.EXTERNAL_SERVICE:
        // Check circuit breaker
        const service = error.context?.service;
        if (service) {
          const breaker = this.getCircuitBreaker(service);
          if (breaker.isOpen()) {
            throw new AppError(
              `Service ${service} is temporarily unavailable`,
              ErrorCategory.EXTERNAL_SERVICE,
              503
            );
          }
        }
        break;
    }
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff(
    fn: () => Promise<any>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

// Circuit breaker implementation
interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
}

class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failures = 0;
  private lastFailureTime?: Date;
  private successCount = 0;
  
  constructor(
    private name: string,
    private options: CircuitBreakerOptions = {}
  ) {
    this.options = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 300000, // 5 minutes
      ...options,
    };
  }

  isOpen(): boolean {
    if (this.state === 'OPEN') {
      // Check if reset timeout has passed
      if (this.lastFailureTime) {
        const elapsed = Date.now() - this.lastFailureTime.getTime();
        if (elapsed > this.options.resetTimeout!) {
          this.state = 'HALF_OPEN';
          return false;
        }
      }
      return true;
    }
    return false;
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= 3) {
        this.state = 'CLOSED';
        this.failures = 0;
        this.successCount = 0;
      }
    }
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.successCount = 0;
    } else if (this.failures >= this.options.failureThreshold!) {
      this.state = 'OPEN';
    }
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Export error handling middleware
export function withErrorHandler(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      return await handler(request);
    } catch (error) {
      return errorHandler.handleError(error, request);
    }
  };
}