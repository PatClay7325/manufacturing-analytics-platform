import { logger } from '../logger';

export enum RetryStrategy {
  FIXED = 'FIXED',
  EXPONENTIAL = 'EXPONENTIAL',
  LINEAR = 'LINEAR',
}

export interface RetryOptions {
  maxAttempts: number;
  strategy: RetryStrategy;
  baseDelay: number;
  maxDelay?: number;
  retryableErrors?: string[];
  jitter?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
  name?: string;
}

export interface RetryResult<T> {
  result: T;
  attemptsMade: number;
  totalTime: number;
  errors: Error[];
}

export class RetryManager {
  private readonly options: Required<RetryOptions>;

  constructor(options: RetryOptions) {
    this.options = {
      maxAttempts: options.maxAttempts,
      strategy: options.strategy,
      baseDelay: options.baseDelay,
      maxDelay: options.maxDelay || 30000, // 30 seconds default max
      retryableErrors: options.retryableErrors || [],
      jitter: options.jitter ?? true,
      onRetry: options.onRetry || (() => {}),
      name: options.name || 'RetryManager',
    };

    logger.debug('Retry manager initialized', {
      name: this.options.name,
      maxAttempts: this.options.maxAttempts,
      strategy: this.options.strategy,
      baseDelay: this.options.baseDelay,
    });
  }

  async execute<T>(operation: () => Promise<T>): Promise<RetryResult<T>> {
    const startTime = Date.now();
    const errors: Error[] = [];
    let attemptsMade = 0;

    while (attemptsMade < this.options.maxAttempts) {
      attemptsMade++;
      
      try {
        logger.debug('Executing operation attempt', {
          name: this.options.name,
          attempt: attemptsMade,
          maxAttempts: this.options.maxAttempts,
        });

        const result = await operation();
        
        const totalTime = Date.now() - startTime;
        
        if (attemptsMade > 1) {
          logger.info('Operation succeeded after retries', {
            name: this.options.name,
            attemptsMade,
            totalTime,
          });
        }

        return {
          result,
          attemptsMade,
          totalTime,
          errors,
        };
      } catch (error) {
        const err = error as Error;
        errors.push(err);

        logger.warn('Operation attempt failed', {
          name: this.options.name,
          attempt: attemptsMade,
          error: err.message,
          stack: err.stack,
        });

        // Check if this error is retryable
        if (!this.isRetryableError(err)) {
          logger.error('Non-retryable error encountered', {
            name: this.options.name,
            error: err.message,
            attempt: attemptsMade,
          });
          throw err;
        }

        // If this was the last attempt, throw the error
        if (attemptsMade >= this.options.maxAttempts) {
          logger.error('Max retry attempts exceeded', {
            name: this.options.name,
            maxAttempts: this.options.maxAttempts,
            totalErrors: errors.length,
            lastError: err.message,
          });
          throw err;
        }

        // Calculate delay and wait before next attempt
        const delay = this.calculateDelay(attemptsMade);
        
        this.options.onRetry(attemptsMade, err);
        
        logger.info('Retrying operation after delay', {
          name: this.options.name,
          attempt: attemptsMade,
          nextAttempt: attemptsMade + 1,
          delay,
        });

        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript requires it
    throw new Error('Unexpected end of retry loop');
  }

  private isRetryableError(error: Error): boolean {
    // If no specific retryable errors are defined, retry all errors
    if (this.options.retryableErrors.length === 0) {
      return true;
    }

    // Check if error matches any retryable patterns
    return this.options.retryableErrors.some(pattern => {
      return error.message.includes(pattern) || 
             error.name === pattern ||
             error.constructor.name === pattern;
    });
  }

  private calculateDelay(attempt: number): number {
    let delay: number;

    switch (this.options.strategy) {
      case RetryStrategy.FIXED:
        delay = this.options.baseDelay;
        break;
      
      case RetryStrategy.LINEAR:
        delay = this.options.baseDelay * attempt;
        break;
      
      case RetryStrategy.EXPONENTIAL:
        delay = this.options.baseDelay * Math.pow(2, attempt - 1);
        break;
      
      default:
        delay = this.options.baseDelay;
    }

    // Apply maximum delay limit
    delay = Math.min(delay, this.options.maxDelay);

    // Apply jitter if enabled
    if (this.options.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      const jitter = (Math.random() - 0.5) * 2 * jitterAmount;
      delay += jitter;
    }

    return Math.max(delay, 0);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Static convenience methods for common retry patterns
  static async withExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000,
    name?: string
  ): Promise<T> {
    const retryManager = new RetryManager({
      maxAttempts,
      strategy: RetryStrategy.EXPONENTIAL,
      baseDelay,
      name,
    });

    const result = await retryManager.execute(operation);
    return result.result;
  }

  static async withFixedDelay<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000,
    name?: string
  ): Promise<T> {
    const retryManager = new RetryManager({
      maxAttempts,
      strategy: RetryStrategy.FIXED,
      baseDelay: delay,
      name,
    });

    const result = await retryManager.execute(operation);
    return result.result;
  }

  static async withLinearBackoff<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    baseDelay: number = 1000,
    name?: string
  ): Promise<T> {
    const retryManager = new RetryManager({
      maxAttempts,
      strategy: RetryStrategy.LINEAR,
      baseDelay,
      name,
    });

    const result = await retryManager.execute(operation);
    return result.result;
  }
}