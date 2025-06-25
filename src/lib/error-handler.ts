// Centralized error handling with proper logging and user-friendly messages

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string>) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('Too many requests', 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
    if (retryAfter) {
      this.retryAfter = retryAfter;
    }
  }
  retryAfter?: number;
}

// Database-specific errors
export class DatabaseError extends AppError {
  constructor(message: string, public originalError?: Error) {
    super(message, 500, 'DATABASE_ERROR', false);
    this.name = 'DatabaseError';
  }
}

export class ConnectionError extends DatabaseError {
  constructor(service: string) {
    super(`Failed to connect to ${service}`);
    this.name = 'ConnectionError';
    this.code = 'CONNECTION_ERROR';
  }
}

// External service errors
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`${service} error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
    this.name = 'ExternalServiceError';
  }
}

// Error response formatter
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path?: string;
    fields?: Record<string, string>;
    retryAfter?: number;
  };
}

export function formatErrorResponse(
  error: Error | AppError,
  path?: string
): ErrorResponse {
  const timestamp = new Date().toISOString();
  
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        statusCode: error.statusCode,
        timestamp,
        path,
        ...(error instanceof ValidationError && error.fields && { fields: error.fields }),
        ...(error instanceof RateLimitError && error.retryAfter && { retryAfter: error.retryAfter })
      }
    };
  }
  
  // Generic errors - don't expose internals in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  return {
    error: {
      code: 'INTERNAL_ERROR',
      message: isDevelopment ? error.message : 'An unexpected error occurred',
      statusCode: 500,
      timestamp,
      path
    }
  };
}

// Async error wrapper for route handlers
export function asyncHandler<T = any>(
  fn: (req: Request, ...args: any[]) => Promise<T>
) {
  return async (req: Request, ...args: any[]): Promise<T> => {
    try {
      return await fn(req, ...args);
    } catch (error) {
      console.error('Route handler error:', error);
      throw error;
    }
  };
}

// Error logging utility
export function logError(error: Error | AppError, context?: Record<string, any>) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...context
  };
  
  if (error instanceof AppError) {
    errorLog.code = error.code;
    errorLog.statusCode = error.statusCode;
    errorLog.isOperational = error.isOperational;
  }
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to monitoring service (e.g., Sentry, DataDog)
    console.error(JSON.stringify(errorLog));
  } else {
    console.error('Error:', errorLog);
  }
}

// Global error handler for unhandled errors
export function setupGlobalErrorHandlers() {
  process.on('uncaughtException', (error: Error) => {
    logError(error, { type: 'uncaughtException' });
    // Give time to log before exit
    setTimeout(() => process.exit(1), 1000);
  });
  
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logError(
      new Error(`Unhandled Rejection: ${reason}`),
      { type: 'unhandledRejection', promise }
    );
  });
}