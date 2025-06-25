/**
 * Error Handling Utilities for Disaster Recovery
 * Provides circuit breaker, retry logic, and custom error types
 */

import { logger } from '@/lib/logger';

/**
 * Custom error for disaster recovery operations
 */
export class DRError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly context?: any;
  public readonly timestamp: Date;

  constructor(
    code: string,
    message: string,
    retryable: boolean = true,
    context?: any
  ) {
    super(message);
    this.name = 'DRError';
    this.code = code;
    this.retryable = retryable;
    this.context = context;
    this.timestamp = new Date();
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DRError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold?: number;
  resetTimeout?: number;
  monitoringPeriod?: number;
  halfOpenRequests?: number;
  onStateChange?: (state: CircuitBreakerState) => void;
}

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker implementation
 */
class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: Date;
  private halfOpenRequests = 0;
  private readonly config: Required<CircuitBreakerConfig>;

  constructor(private readonly name: string, config: CircuitBreakerConfig = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeout: config.resetTimeout ?? 60000, // 1 minute
      monitoringPeriod: config.monitoringPeriod ?? 300000, // 5 minutes
      halfOpenRequests: config.halfOpenRequests ?? 3,
      onStateChange: config.onStateChange ?? (() => {}),
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should be reset
    this.checkReset();

    // Check circuit state
    if (this.state === CircuitBreakerState.OPEN) {
      throw new DRError(
        'CIRCUIT_BREAKER_OPEN',
        `Circuit breaker ${this.name} is OPEN`,
        true,
        { failures: this.failures, lastFailure: this.lastFailureTime }
      );
    }

    // Handle half-open state
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.halfOpenRequests >= this.config.halfOpenRequests) {
        throw new DRError(
          'CIRCUIT_BREAKER_HALF_OPEN_LIMIT',
          `Circuit breaker ${this.name} half-open request limit reached`,
          true
        );
      }
      this.halfOpenRequests++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.config.halfOpenRequests) {
        this.setState(CircuitBreakerState.CLOSED);
        this.reset();
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(error: Error): void {
    this.failures++;
    this.lastFailureTime = new Date();

    logger.warn({
      circuitBreaker: this.name,
      failures: this.failures,
      threshold: this.config.failureThreshold,
      error: error.message,
    }, 'Circuit breaker failure recorded');

    if (this.failures >= this.config.failureThreshold) {
      this.setState(CircuitBreakerState.OPEN);
    }
  }

  private checkReset(): void {
    if (
      this.state === CircuitBreakerState.OPEN &&
      this.lastFailureTime &&
      Date.now() - this.lastFailureTime.getTime() > this.config.resetTimeout
    ) {
      this.setState(CircuitBreakerState.HALF_OPEN);
      this.halfOpenRequests = 0;
      this.successes = 0;
    }
  }

  private setState(state: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = state;
    
    logger.info({
      circuitBreaker: this.name,
      oldState,
      newState: state,
    }, 'Circuit breaker state changed');
    
    this.config.onStateChange(state);
  }

  private reset(): void {
    this.failures = 0;
    this.successes = 0;
    this.halfOpenRequests = 0;
    this.lastFailureTime = undefined;
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

// Circuit breaker registry
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker
 */
export function getCircuitBreaker(
  name: string,
  config?: CircuitBreakerConfig
): CircuitBreaker {
  let breaker = circuitBreakers.get(name);
  if (!breaker) {
    breaker = new CircuitBreaker(name, config);
    circuitBreakers.set(name, breaker);
  }
  return breaker;
}

/**
 * Execute function with circuit breaker
 */
export async function circuitBreaker<T>(
  fn: () => Promise<T>,
  name: string,
  config?: CircuitBreakerConfig & { maxAttempts?: number }
): Promise<T> {
  const breaker = getCircuitBreaker(name, config);
  const maxAttempts = config?.maxAttempts ?? 1;
  
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await breaker.execute(fn);
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if circuit is open
      if ((error as DRError).code === 'CIRCUIT_BREAKER_OPEN') {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        throw error;
      }
      
      // Wait before retry
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Retry logic with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    retryCondition = (error: Error) => {
      // Default: retry on retryable errors
      if (error instanceof DRError) {
        return error.retryable;
      }
      // Retry on common transient errors
      const message = error.message.toLowerCase();
      return (
        message.includes('timeout') ||
        message.includes('econnrefused') ||
        message.includes('enotfound') ||
        message.includes('throttl')
      );
    },
    onRetry = () => {},
  } = config;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      if (!retryCondition(lastError)) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        throw lastError;
      }

      // Log retry attempt
      logger.warn(
        {
          attempt,
          maxAttempts,
          delay,
          error: lastError.message,
        },
        'Retrying operation'
      );

      // Call retry callback
      onRetry(lastError, attempt);

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));

      // Calculate next delay
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Timeout wrapper
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutError?: string
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(
        new DRError(
          'TIMEOUT',
          timeoutError || `Operation timed out after ${timeoutMs}ms`,
          true
        )
      );
    }, timeoutMs);
  });

  return Promise.race([fn(), timeoutPromise]);
}

/**
 * Concurrent operation with circuit breaker
 */
export async function concurrentWithCircuitBreaker<T>(
  operations: Array<() => Promise<T>>,
  circuitBreakerName: string,
  config?: CircuitBreakerConfig & { concurrency?: number }
): Promise<T[]> {
  const breaker = getCircuitBreaker(circuitBreakerName, config);
  const concurrency = config?.concurrency ?? 5;
  const results: T[] = [];
  const errors: Error[] = [];

  // Process in batches
  for (let i = 0; i < operations.length; i += concurrency) {
    const batch = operations.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(op => breaker.execute(op))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        errors.push(result.reason);
      }
    }
  }

  // If all operations failed, throw the first error
  if (results.length === 0 && errors.length > 0) {
    throw errors[0];
  }

  return results;
}

/**
 * Error aggregator for multiple failures
 */
export class AggregateError extends Error {
  constructor(public readonly errors: Error[], message?: string) {
    super(message || `${errors.length} errors occurred`);
    this.name = 'AggregateError';
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      errors: this.errors.map(e => ({
        name: e.name,
        message: e.message,
        stack: e.stack,
      })),
    };
  }
}

/**
 * Validate operation result
 */
export function validateResult<T>(
  result: T,
  validator: (result: T) => boolean,
  errorMessage: string
): T {
  if (!validator(result)) {
    throw new DRError(
      'VALIDATION_FAILED',
      errorMessage,
      false,
      { result }
    );
  }
  return result;
}

/**
 * Create error with context
 */
export function createError(
  code: string,
  message: string,
  context?: any,
  retryable: boolean = true
): DRError {
  return new DRError(code, message, retryable, context);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof DRError) {
    return error.retryable;
  }
  
  const retryableMessages = [
    'timeout',
    'econnrefused',
    'enotfound',
    'throttl',
    'too many requests',
    'service unavailable',
    'internal server error',
  ];
  
  const message = error.message.toLowerCase();
  return retryableMessages.some(msg => message.includes(msg));
}

/**
 * Extract error details
 */
export function extractErrorDetails(error: any): {
  code: string;
  message: string;
  details?: any;
} {
  if (error instanceof DRError) {
    return {
      code: error.code,
      message: error.message,
      details: error.context,
    };
  }
  
  if (error?.code) {
    return {
      code: error.code,
      message: error.message || 'Unknown error',
      details: error,
    };
  }
  
  return {
    code: 'UNKNOWN_ERROR',
    message: error?.message || 'An unknown error occurred',
    details: error,
  };
}

/**
 * Reset all circuit breakers (useful for testing)
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakers.clear();
}

/**
 * Get circuit breaker statistics
 */
export function getCircuitBreakerStats(): Record<string, any> {
  const stats: Record<string, any> = {};
  
  circuitBreakers.forEach((breaker, name) => {
    stats[name] = breaker.getStats();
  });
  
  return stats;
}