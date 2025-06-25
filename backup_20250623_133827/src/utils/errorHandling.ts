/**
 * Error Handling Utilities for Manufacturing Analytics
 * Provides consistent error handling across the application
 */

import { Prisma } from '@prisma/client';

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  BAD_REQUEST = 'BAD_REQUEST',
}

export class ApplicationError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with id ${id} not found`
      : `${resource} not found`;
    super(ErrorCode.NOT_FOUND, message, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, details?: any) {
    super(ErrorCode.CONFLICT, message, 409, details);
    this.name = 'ConflictError';
  }
}

export class DatabaseError extends ApplicationError {
  constructor(message: string, originalError?: any) {
    super(ErrorCode.DATABASE_ERROR, message, 500, originalError);
    this.name = 'DatabaseError';
  }
}

/**
 * Error handler for Prisma errors
 */
export function handlePrismaError(error: any): ApplicationError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return new ConflictError(
          `Unique constraint violation on ${error.meta?.target}`,
          error
        );
      case 'P2025':
        return new NotFoundError('Record', error.meta?.cause as string);
      case 'P2003':
        return new ValidationError(
          `Foreign key constraint violation: ${error.meta?.field_name}`,
          error
        );
      case 'P2014':
        return new ValidationError(
          `Invalid ID: ${error.meta?.argument_name}`,
          error
        );
      default:
        return new DatabaseError(`Database error: ${error.message}`, error);
    }
  }
  
  if (error instanceof Prisma.PrismaClientValidationError) {
    return new ValidationError('Invalid data provided', error);
  }
  
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new DatabaseError('Database connection failed', error);
  }
  
  return new DatabaseError('Unknown database error', error);
}

/**
 * Async error wrapper for route handlers
 */
export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      
      if (error instanceof Prisma.PrismaClientKnownRequestError ||
          error instanceof Prisma.PrismaClientValidationError ||
          error instanceof Prisma.PrismaClientInitializationError) {
        throw handlePrismaError(error);
      }
      
      // Log unexpected errors
      console.error('Unexpected error:', error);
      throw new ApplicationError(
        ErrorCode.INTERNAL_ERROR,
        'An unexpected error occurred',
        500,
        process.env.NODE_ENV === 'development' ? error : undefined
      );
    }
  }) as T;
}

/**
 * Result type for service methods
 */
export type Result<T, E = ApplicationError> = 
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a success result
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Create an error result
 */
export function failure<E = ApplicationError>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Error logging utility
 */
export class ErrorLogger {
  static log(error: Error, context?: any): void {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
    };

    if (error instanceof ApplicationError) {
      errorInfo['code'] = error.code;
      errorInfo['statusCode'] = error.statusCode;
      errorInfo['details'] = error.details;
    }

    // In production, this would go to a logging service
    console.error('[ERROR]', JSON.stringify(errorInfo, null, 2));
  }

  static logWarning(message: string, context?: any): void {
    const timestamp = new Date().toISOString();
    console.warn('[WARNING]', timestamp, message, context || '');
  }
}

/**
 * Retry mechanism for transient failures
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoff?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 2,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw error;
      }

      if (onRetry) {
        onRetry(lastError, attempt);
      }

      const waitTime = delay * Math.pow(backoff, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError!;
}

/**
 * Circuit breaker for external service calls
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new ApplicationError(
          ErrorCode.SERVICE_UNAVAILABLE,
          'Service temporarily unavailable',
          503
        );
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
      }
      
      throw error;
    }
  }
}