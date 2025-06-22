/**
 * Comprehensive Error Handling System
 * Production-ready error handling, logging, and recovery mechanisms
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export enum ErrorCode {
  // Authentication errors
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_INSUFFICIENT_PERMISSIONS',
  
  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  
  // Database errors
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED = 'DATABASE_QUERY_FAILED',
  DATABASE_CONSTRAINT_VIOLATION = 'DATABASE_CONSTRAINT_VIOLATION',
  
  // External service errors
  EXTERNAL_SERVICE_UNAVAILABLE = 'EXTERNAL_SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_TIMEOUT = 'EXTERNAL_SERVICE_TIMEOUT',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // System errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  
  // Manufacturing-specific errors
  EQUIPMENT_OFFLINE = 'EQUIPMENT_OFFLINE',
  EQUIPMENT_ERROR = 'EQUIPMENT_ERROR',
  DATA_SOURCE_UNAVAILABLE = 'DATA_SOURCE_UNAVAILABLE',
  MEASUREMENT_OUT_OF_RANGE = 'MEASUREMENT_OUT_OF_RANGE',
  QUALITY_CHECK_FAILED = 'QUALITY_CHECK_FAILED',
  PRODUCTION_LINE_STOPPED = 'PRODUCTION_LINE_STOPPED'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AppError extends Error {
  code: ErrorCode;
  severity: ErrorSeverity;
  statusCode: number;
  context?: Record<string, any>;
  userMessage?: string;
  retryable?: boolean;
  timestamp: Date;
  correlationId?: string;
  stack?: string;
}

export interface ErrorLogEntry {
  id?: string;
  errorId: string;
  message: string;
  code: ErrorCode;
  severity: ErrorSeverity;
  statusCode: number;
  stack?: string;
  context?: Record<string, any>;
  userAgent?: string;
  url?: string;
  method?: string;
  ipAddress?: string;
  userId?: string;
  correlationId?: string;
  timestamp: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  notes?: string;
}

/**
 * Custom Application Error class
 */
export class ApplicationError extends Error implements AppError {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly context?: Record<string, any>;
  public readonly userMessage?: string;
  public readonly retryable: boolean;
  public readonly timestamp: Date;
  public readonly correlationId?: string;

  constructor(
    message: string,
    code: ErrorCode,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    statusCode: number = 500,
    options: {
      context?: Record<string, any>;
      userMessage?: string;
      retryable?: boolean;
      correlationId?: string;
      cause?: Error;
    } = {}
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.severity = severity;
    this.statusCode = statusCode;
    this.context = options.context;
    this.userMessage = options.userMessage || this.getDefaultUserMessage(code);
    this.retryable = options.retryable ?? this.isRetryableByDefault(code);
    this.timestamp = new Date();
    this.correlationId = options.correlationId || this.generateCorrelationId();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApplicationError);
    }

    if (options.cause) {
      this.stack = `${this.stack}\nCaused by: ${options.cause.stack}`;
    }
  }

  private getDefaultUserMessage(code: ErrorCode): string {
    const messages: Record<ErrorCode, string> = {
      [ErrorCode.AUTH_REQUIRED]: 'Authentication required. Please log in.',
      [ErrorCode.AUTH_INVALID]: 'Invalid credentials. Please try again.',
      [ErrorCode.AUTH_EXPIRED]: 'Your session has expired. Please log in again.',
      [ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action.',
      [ErrorCode.VALIDATION_FAILED]: 'The provided data is invalid.',
      [ErrorCode.INVALID_INPUT]: 'Invalid input provided.',
      [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing.',
      [ErrorCode.RESOURCE_NOT_FOUND]: 'The requested resource was not found.',
      [ErrorCode.RESOURCE_ALREADY_EXISTS]: 'Resource already exists.',
      [ErrorCode.RESOURCE_LOCKED]: 'Resource is currently locked by another user.',
      [ErrorCode.DATABASE_CONNECTION_FAILED]: 'Database connection failed. Please try again.',
      [ErrorCode.DATABASE_QUERY_FAILED]: 'Database operation failed. Please try again.',
      [ErrorCode.DATABASE_CONSTRAINT_VIOLATION]: 'Data constraint violation.',
      [ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE]: 'External service is currently unavailable.',
      [ErrorCode.EXTERNAL_SERVICE_TIMEOUT]: 'Request timed out. Please try again.',
      [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'External service error occurred.',
      [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait and try again.',
      [ErrorCode.INTERNAL_SERVER_ERROR]: 'An internal error occurred. Please try again.',
      [ErrorCode.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable.',
      [ErrorCode.CONFIGURATION_ERROR]: 'System configuration error.',
      [ErrorCode.EQUIPMENT_OFFLINE]: 'Equipment is currently offline.',
      [ErrorCode.EQUIPMENT_ERROR]: 'Equipment error detected.',
      [ErrorCode.DATA_SOURCE_UNAVAILABLE]: 'Data source is currently unavailable.',
      [ErrorCode.MEASUREMENT_OUT_OF_RANGE]: 'Measurement value is out of acceptable range.',
      [ErrorCode.QUALITY_CHECK_FAILED]: 'Quality check failed.',
      [ErrorCode.PRODUCTION_LINE_STOPPED]: 'Production line has been stopped.'
    };

    return messages[code] || 'An unexpected error occurred.';
  }

  private isRetryableByDefault(code: ErrorCode): boolean {
    const retryableCodes = [
      ErrorCode.DATABASE_CONNECTION_FAILED,
      ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
      ErrorCode.EXTERNAL_SERVICE_TIMEOUT,
      ErrorCode.SERVICE_UNAVAILABLE,
      ErrorCode.EQUIPMENT_OFFLINE,
      ErrorCode.DATA_SOURCE_UNAVAILABLE
    ];

    return retryableCodes.includes(code);
  }

  private generateCorrelationId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Error Handler Service
 */
export class ErrorHandler {
  private prisma: PrismaClient;
  private alertHandlers: Array<(error: AppError) => Promise<void>> = [];

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Log error to database and external services
   */
  async logError(
    error: AppError,
    request?: NextRequest,
    userId?: string
  ): Promise<void> {
    try {
      const errorLogEntry: Omit<ErrorLogEntry, 'id'> = {
        errorId: error.correlationId || this.generateErrorId(),
        message: error.message,
        code: error.code,
        severity: error.severity,
        statusCode: error.statusCode,
        stack: error.stack,
        context: error.context,
        userAgent: request.headers.get('user-agent') || undefined,
        url: request.url || undefined,
        method: request.method || undefined,
        ipAddress: this.getClientIP(request) || undefined,
        userId,
        correlationId: error.correlationId,
        timestamp: error.timestamp,
        resolved: false
      };

      // Log to database
      await this.prisma.errorLog.create({
        data: errorLogEntry
      });

      // Log to console (structured logging)
      this.logToConsole(error, errorLogEntry);

      // Send alerts for critical errors
      if (error.severity === ErrorSeverity.CRITICAL) {
        await this.sendAlerts(error);
      }

      // External logging (e.g., Sentry, LogRocket, etc.)
      await this.logToExternalServices(error, errorLogEntry);

    } catch (loggingError) {
      // Fallback logging
      console.error('Failed to log error:', loggingError);
      console.error('Original error:', error);
    }
  }

  /**
   * Handle API errors and return appropriate response
   */
  handleAPIError(error: unknown, request?: NextRequest): NextResponse {
    let appError: AppError;

    if (error instanceof ApplicationError) {
      appError = error;
    } else if (error instanceof Error) {
      appError = this.convertToApplicationError(error);
    } else {
      appError = new ApplicationError(
        'Unknown error occurred',
        ErrorCode.INTERNAL_SERVER_ERROR,
        ErrorSeverity.HIGH
      );
    }

    // Log the error
    this.logError(appError, request).catch(console.error);

    // Return error response
    return NextResponse.json(
      {
        error: {
          code: appError.code,
          message: appError.userMessage || appError.message,
          correlationId: appError.correlationId,
          retryable: appError.retryable,
          timestamp: appError.timestamp.toISOString()
        },
        ...(process.env.NODE_ENV === 'development' && {
          debug: {
            stack: appError.stack,
            context: appError.context
          }
        })
      },
      { status: appError.statusCode }
    );
  }

  /**
   * Retry mechanism for retryable operations
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      maxAttempts?: number;
      delayMs?: number;
      backoffMultiplier?: number;
      retryableErrors?: ErrorCode[];
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      delayMs = 1000,
      backoffMultiplier = 2,
      retryableErrors = []
    } = options;

    let lastError: Error;
    let delay = delayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxAttempts) {
          break;
        }

        // Check if error is retryable
        if (error instanceof ApplicationError) {
          if (!error.retryable && !retryableErrors.includes(error.code)) {
            break;
          }
        }

        // Wait before retry
        await this.delay(delay);
        delay *= backoffMultiplier;
      }
    }

    throw lastError!;
  }

  /**
   * Circuit breaker pattern
   */
  createCircuitBreaker(
    operation: () => Promise<any>,
    options: {
      failureThreshold?: number;
      resetTimeoutMs?: number;
      monitoringWindowMs?: number;
    } = {}
  ) {
    const {
      failureThreshold = 5,
      resetTimeoutMs = 60000,
      monitoringWindowMs = 60000
    } = options;

    let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    let failures = 0;
    let lastFailureTime = 0;
    let requests: { timestamp: number; success: boolean }[] = [];

    return async () => {
      const now = Date.now();

      // Clean old requests
      requests = requests.filter(req => now - req.timestamp < monitoringWindowMs);

      // Check if circuit should be reset
      if (state === 'OPEN' && now - lastFailureTime > resetTimeoutMs) {
        state = 'HALF_OPEN';
        failures = 0;
      }

      // Reject if circuit is open
      if (state === 'OPEN') {
        throw new ApplicationError(
          'Circuit breaker is open',
          ErrorCode.SERVICE_UNAVAILABLE,
          ErrorSeverity.HIGH,
          503,
          { retryable: true }
        );
      }

      try {
        const result = await operation();
        
        // Success
        requests.push({ timestamp: now, success: true });
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failures = 0;
        }
        
        return result;
      } catch (error) {
        // Failure
        requests.push({ timestamp: now, success: false });
        failures++;
        lastFailureTime = now;

        const recentFailures = requests.filter(req => !req.success).length;
        if (recentFailures >= failureThreshold) {
          state = 'OPEN';
        }

        throw error;
      }
    };
  }

  /**
   * Add alert handler for critical errors
   */
  addAlertHandler(handler: (error: AppError) => Promise<void>): void {
    this.alertHandlers.push(handler);
  }

  // Private methods

  private convertToApplicationError(error: Error): ApplicationError {
    // Convert common errors to ApplicationError
    if (error.message.includes('ECONNREFUSED')) {
      return new ApplicationError(
        'Connection refused',
        ErrorCode.DATABASE_CONNECTION_FAILED,
        ErrorSeverity.HIGH,
        503,
        { cause: error, retryable: true }
      );
    }

    if (error.message.includes('timeout')) {
      return new ApplicationError(
        'Operation timed out',
        ErrorCode.EXTERNAL_SERVICE_TIMEOUT,
        ErrorSeverity.MEDIUM,
        408,
        { cause: error, retryable: true }
      );
    }

    // Default conversion
    return new ApplicationError(
      error.message,
      ErrorCode.INTERNAL_SERVER_ERROR,
      ErrorSeverity.HIGH,
      500,
      { cause: error }
    );
  }

  private async logToConsole(error: AppError, logEntry: ErrorLogEntry): Promise<void> {
    const logData = {
      timestamp: error.timestamp.toISOString(),
      level: this.severityToLogLevel(error.severity),
      code: error.code,
      message: error.message,
      correlationId: error.correlationId,
      context: error.context,
      stack: error.stack
    };

    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH) {
      console.error('🔥 ERROR:', JSON.stringify(logData, null, 2));
    } else if (error.severity === ErrorSeverity.MEDIUM) {
      console.warn('⚠️  WARNING:', JSON.stringify(logData, null, 2));
    } else {
      console.log('ℹ️  INFO:', JSON.stringify(logData, null, 2));
    }
  }

  private async logToExternalServices(error: AppError, logEntry: ErrorLogEntry): Promise<void> {
    // Example: Send to external logging service
    try {
      if (process.env.EXTERNAL_LOGGING_URL) {
        await fetch(process.env.EXTERNAL_LOGGING_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry)
        });
      }
    } catch (externalError) {
      console.error('Failed to log to external service:', externalError);
    }
  }

  private async sendAlerts(error: AppError): Promise<void> {
    for (const handler of this.alertHandlers) {
      try {
        await handler(error);
      } catch (alertError) {
        console.error('Alert handler failed:', alertError);
      }
    }
  }

  private severityToLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return 'error';
      case ErrorSeverity.HIGH: return 'error';
      case ErrorSeverity.MEDIUM: return 'warn';
      case ErrorSeverity.LOW: return 'info';
      default: return 'info';
    }
  }

  private getClientIP(request?: NextRequest): string | null {
    if (!request) return null;

    return request.headers.get('x-forwarded-for') ||
           request.headers.get('x-real-ip') ||
           request.ip ||
           null;
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler();

// Convenience functions for common errors
export const createAuthError = (message: string, code: ErrorCode = ErrorCode.AUTH_INVALID) =>
  new ApplicationError(message, code, ErrorSeverity.MEDIUM, 401);

export const createValidationError = (message: string, context?: Record<string, any>) =>
  new ApplicationError(message, ErrorCode.VALIDATION_FAILED, ErrorSeverity.LOW, 400, { context });

export const createNotFoundError = (resource: string) =>
  new ApplicationError(`${resource} not found`, ErrorCode.RESOURCE_NOT_FOUND, ErrorSeverity.LOW, 404);

export const createInternalError = (message: string, cause?: Error) =>
  new ApplicationError(message, ErrorCode.INTERNAL_SERVER_ERROR, ErrorSeverity.HIGH, 500, { cause });

export default ErrorHandler;