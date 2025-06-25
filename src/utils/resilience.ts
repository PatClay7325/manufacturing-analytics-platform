/**
 * Resilience Utilities - Circuit Breakers, Retries, and Rate Limiting
 * Production-ready resilience patterns for enterprise deployment
 */

import CircuitBreaker from 'opossum';
import { logger } from '@/lib/logger';
import { Counter, Histogram, Gauge } from 'prom-client';

// Metrics
const circuitBreakerOpen = new Gauge({
  name: 'circuit_breaker_open',
  help: 'Circuit breaker state (1 = open, 0 = closed)',
  labelNames: ['name'],
});

const retryAttempts = new Counter({
  name: 'retry_attempts_total',
  help: 'Total number of retry attempts',
  labelNames: ['operation', 'success'],
});

const operationDuration = new Histogram({
  name: 'operation_duration_seconds',
  help: 'Duration of operations with resilience patterns',
  labelNames: ['operation', 'success'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

interface RetryOptions {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter?: boolean;
}

interface CircuitBreakerOptions {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  rollingCountTimeout: number;
  rollingCountBuckets: number;
  name: string;
}

// Circuit breaker registry
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Enhanced retry mechanism with exponential backoff and jitter
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const operationName = operation.name || 'anonymous';
  const timer = operationDuration.startTimer({ operation: operationName, success: 'unknown' });
  
  let lastError: Error;
  let attempt = 0;
  
  while (attempt < options.maxAttempts) {
    attempt++;
    
    try {
      const result = await operation();
      
      retryAttempts.inc({ operation: operationName, success: 'true' });
      timer({ success: 'true' });
      
      if (attempt > 1) {
        logger.info({
          operation: operationName,
          attempt,
          success: true,
        }, 'Operation succeeded after retry');
      }
      
      return result;
      
    } catch (error) {
      lastError = error as Error;
      
      logger.warn({
        operation: operationName,
        attempt,
        maxAttempts: options.maxAttempts,
        error: lastError.message,
      }, 'Operation failed, will retry');
      
      if (attempt >= options.maxAttempts) {
        retryAttempts.inc({ operation: operationName, success: 'false' });
        timer({ success: 'false' });
        break;
      }
      
      // Calculate delay with exponential backoff
      let delay = Math.min(
        options.initialDelay * Math.pow(options.backoffMultiplier, attempt - 1),
        options.maxDelay
      );
      
      // Add jitter to prevent thundering herd
      if (options.jitter) {
        delay = delay * (0.5 + Math.random() * 0.5);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  logger.error({
    operation: operationName,
    attempts: attempt,
    error: lastError.message,
  }, 'Operation failed after all retry attempts');
  
  throw lastError;
}

/**
 * Circuit breaker wrapper with metrics and monitoring
 */
export function withCircuitBreaker<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  options: CircuitBreakerOptions
): (...args: T) => Promise<R> {
  let breaker = circuitBreakers.get(options.name);
  
  if (!breaker) {
    breaker = new CircuitBreaker(operation, {
      timeout: options.timeout,
      errorThresholdPercentage: options.errorThresholdPercentage,
      resetTimeout: options.resetTimeout,
      rollingCountTimeout: options.rollingCountTimeout,
      rollingCountBuckets: options.rollingCountBuckets,
      name: options.name,
    });
    
    // Set up event listeners
    breaker.on('open', () => {
      circuitBreakerOpen.set({ name: options.name }, 1);
      logger.warn({ circuitBreaker: options.name }, 'Circuit breaker opened');
    });
    
    breaker.on('halfOpen', () => {
      logger.info({ circuitBreaker: options.name }, 'Circuit breaker half-open');
    });
    
    breaker.on('close', () => {
      circuitBreakerOpen.set({ name: options.name }, 0);
      logger.info({ circuitBreaker: options.name }, 'Circuit breaker closed');
    });
    
    breaker.on('failure', (error) => {
      logger.warn({
        circuitBreaker: options.name,
        error: error.message,
      }, 'Circuit breaker recorded failure');
    });
    
    breaker.on('fallback', () => {
      logger.warn({ circuitBreaker: options.name }, 'Circuit breaker fallback triggered');
    });
    
    // Fallback function
    breaker.fallback(() => {
      throw new Error(`Circuit breaker ${options.name} is open`);
    });
    
    circuitBreakers.set(options.name, breaker);
  }
  
  return (...args: T) => breaker!.fire(...args);
}

/**
 * Get circuit breaker statistics
 */
export function getCircuitBreakerStats(): Record<string, any> {
  const stats: Record<string, any> = {};
  
  for (const [name, breaker] of circuitBreakers) {
    const options = breaker.options;
    stats[name] = {
      state: breaker.opened ? 'OPEN' : breaker.halfOpen ? 'HALF_OPEN' : 'CLOSED',
      failures: breaker.stats.failures,
      successes: breaker.stats.successes,
      requests: breaker.stats.requests,
      rejects: breaker.stats.rejects,
      fires: breaker.stats.fires,
      timeouts: breaker.stats.timeouts,
      cacheHits: breaker.stats.cacheHits,
      cacheMisses: breaker.stats.cacheMisses,
      percentiles: breaker.stats.percentiles,
      lastFailureTime: breaker.stats.latestTime,
      nextAttempt: breaker.opened ? new Date(Date.now() + options.resetTimeout) : null,
    };
  }
  
  return stats;
}

/**
 * Rate limiter implementation
 */
export class RateLimiter {
  private requests: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;
  
  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  /**
   * Check if request is allowed
   */
  isAllowed(): boolean {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);
    
    // Check if we're under the limit
    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }
    
    return false;
  }
  
  /**
   * Get current rate limiting status
   */
  getStatus(): {
    requests: number;
    maxRequests: number;
    windowMs: number;
    resetTime: Date;
  } {
    const now = Date.now();
    const oldestRequest = Math.min(...this.requests);
    const resetTime = new Date(oldestRequest + this.windowMs);
    
    return {
      requests: this.requests.length,
      maxRequests: this.maxRequests,
      windowMs: this.windowMs,
      resetTime,
    };
  }
}

/**
 * Timeout wrapper
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage?: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    
    operation()
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Bulkhead pattern - limit concurrent operations
 */
export class Bulkhead {
  private activeOperations = 0;
  private readonly maxConcurrent: number;
  private readonly queue: Array<() => void> = [];
  
  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Wait for a slot to become available
    await this.acquireSlot();
    
    try {
      this.activeOperations++;
      return await operation();
    } finally {
      this.activeOperations--;
      this.releaseSlot();
    }
  }
  
  private async acquireSlot(): Promise<void> {
    if (this.activeOperations < this.maxConcurrent) {
      return;
    }
    
    return new Promise<void>(resolve => {
      this.queue.push(resolve);
    });
  }
  
  private releaseSlot(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }
  
  getStatus(): {
    active: number;
    queued: number;
    maxConcurrent: number;
  } {
    return {
      active: this.activeOperations,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
    };
  }
}

/**
 * Combined resilience wrapper
 */
export async function withResilience<T>(
  operation: () => Promise<T>,
  options: {
    retry?: RetryOptions;
    circuitBreaker?: CircuitBreakerOptions;
    timeout?: number;
    bulkhead?: Bulkhead;
  }
): Promise<T> {
  let wrappedOperation = operation;
  
  // Apply timeout if specified
  if (options.timeout) {
    const originalOperation = wrappedOperation;
    wrappedOperation = () => withTimeout(originalOperation(), options.timeout!);
  }
  
  // Apply circuit breaker if specified
  if (options.circuitBreaker) {
    wrappedOperation = withCircuitBreaker(wrappedOperation, options.circuitBreaker);
  }
  
  // Apply retry if specified
  if (options.retry) {
    const originalOperation = wrappedOperation;
    wrappedOperation = () => withRetry(originalOperation, options.retry!);
  }
  
  // Apply bulkhead if specified
  if (options.bulkhead) {
    return options.bulkhead.execute(wrappedOperation);
  }
  
  return wrappedOperation();
}

/**
 * Health check for resilience components
 */
export function getResilienceHealth(): {
  circuitBreakers: Record<string, any>;
  healthy: boolean;
} {
  const circuitBreakerStats = getCircuitBreakerStats();
  
  // Check if any circuit breakers are open
  const hasOpenCircuitBreakers = Object.values(circuitBreakerStats).some(
    (stats: any) => stats.state === 'OPEN'
  );
  
  return {
    circuitBreakers: circuitBreakerStats,
    healthy: !hasOpenCircuitBreakers,
  };
}

/**
 * Reset all circuit breakers (for testing/emergency)
 */
export function resetAllCircuitBreakers(): void {
  for (const [name, breaker] of circuitBreakers) {
    breaker.close();
    logger.info({ circuitBreaker: name }, 'Circuit breaker manually reset');
  }
}

/**
 * Graceful degradation helper
 */
export async function withFallback<T, F>(
  primaryOperation: () => Promise<T>,
  fallbackOperation: () => Promise<F>,
  shouldFallback: (error: Error) => boolean = () => true
): Promise<T | F> {
  try {
    return await primaryOperation();
  } catch (error) {
    if (shouldFallback(error as Error)) {
      logger.warn({
        error: (error as Error).message,
      }, 'Primary operation failed, using fallback');
      
      return await fallbackOperation();
    }
    throw error;
  }
}