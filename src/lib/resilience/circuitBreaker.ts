import { logger } from '../logger';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  timeout: number;
  monitoringPeriod: number;
  expectedErrors?: string[];
  name?: string;
}

export interface CircuitBreakerMetrics {
  state: CircuitBreakerState;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttempt?: Date;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures = 0;
  private successes = 0;
  private totalRequests = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttempt?: Date;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions) {
    this.options = {
      failureThreshold: options.failureThreshold,
      timeout: options.timeout,
      monitoringPeriod: options.monitoringPeriod,
      expectedErrors: options.expectedErrors || [],
      name: options.name || 'CircuitBreaker',
    };

    logger.info('Circuit breaker initialized', {
      name: this.options.name,
      failureThreshold: this.options.failureThreshold,
      timeout: this.options.timeout,
    });
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        logger.info('Circuit breaker transitioning to HALF_OPEN', {
          name: this.options.name,
        });
      } else {
        const error = new Error(`Circuit breaker is OPEN for ${this.options.name}`);
        logger.warn('Circuit breaker rejected request', {
          name: this.options.name,
          state: this.state,
          nextAttempt: this.nextAttempt,
        });
        throw error;
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.lastSuccessTime = new Date();
    this.failures = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
      logger.info('Circuit breaker reset to CLOSED', {
        name: this.options.name,
        successes: this.successes,
      });
    }
  }

  private onFailure(error: Error): void {
    this.failures++;
    this.lastFailureTime = new Date();

    // Check if this is an expected error that shouldn't count toward circuit breaker
    if (this.isExpectedError(error)) {
      logger.debug('Expected error encountered, not counting toward circuit breaker', {
        name: this.options.name,
        error: error.message,
      });
      return;
    }

    logger.warn('Circuit breaker recorded failure', {
      name: this.options.name,
      failures: this.failures,
      threshold: this.options.failureThreshold,
      error: error.message,
    });

    if (this.failures >= this.options.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttempt = new Date(Date.now() + this.options.timeout);
      
      logger.error('Circuit breaker opened due to failures', {
        name: this.options.name,
        failures: this.failures,
        threshold: this.options.failureThreshold,
        nextAttempt: this.nextAttempt,
      });
    }
  }

  private shouldAttemptReset(): boolean {
    return this.nextAttempt ? Date.now() >= this.nextAttempt.getTime() : false;
  }

  private isExpectedError(error: Error): boolean {
    return this.options.expectedErrors.some(expectedError =>
      error.message.includes(expectedError) || error.name === expectedError
    );
  }

  getMetrics(): CircuitBreakerMetrics {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttempt: this.nextAttempt,
    };
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = 0;
    this.nextAttempt = undefined;
    
    logger.info('Circuit breaker manually reset', {
      name: this.options.name,
    });
  }

  // For monitoring and debugging
  forceOpen(): void {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttempt = new Date(Date.now() + this.options.timeout);
    
    logger.warn('Circuit breaker manually forced open', {
      name: this.options.name,
    });
  }
}