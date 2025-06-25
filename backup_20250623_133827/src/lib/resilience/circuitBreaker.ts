import { logger } from '@/lib/logger';
import { circuitBreakerMetrics } from '@/lib/observability/metrics';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  minimumRequests: number;
  halfOpenRequests: number;
  onOpen?: () => void;
  onClose?: () => void;
  onHalfOpen?: () => void;
}

export enum CircuitState {
  CLOSED = 0,
  OPEN = 1,
  HALF_OPEN = 2,
}

/**
 * Production-ready circuit breaker implementation
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private nextAttempt: number = 0;
  private halfOpenRequests: number = 0;
  private requestsInPeriod: number = 0;
  private periodStart: number = Date.now();

  constructor(
    private name: string,
    private options: CircuitBreakerOptions
  ) {
    this.updateMetrics();
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new CircuitBreakerError('Circuit breaker is OPEN', this.name);
      }
      this.transitionToHalfOpen();
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failures = 0;
    this.successes++;
    this.requestsInPeriod++;

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenRequests++;
      if (this.halfOpenRequests >= this.options.halfOpenRequests) {
        this.transitionToClosed();
      }
    }

    this.checkPeriod();
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.requestsInPeriod++;
    
    circuitBreakerMetrics.failures.inc({ service: this.name });

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToOpen();
    } else if (this.state === CircuitState.CLOSED) {
      if (this.shouldOpen()) {
        this.transitionToOpen();
      }
    }

    this.checkPeriod();
  }

  /**
   * Check if circuit should open
   */
  private shouldOpen(): boolean {
    if (this.requestsInPeriod < this.options.minimumRequests) {
      return false;
    }

    const failureRate = this.failures / this.requestsInPeriod;
    return failureRate >= this.options.failureThreshold;
  }

  /**
   * Transition to OPEN state
   */
  private transitionToOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.options.resetTimeout;
    this.updateMetrics();
    
    logger.warn({
      circuit: this.name,
      failures: this.failures,
      nextAttempt: new Date(this.nextAttempt),
    }, 'Circuit breaker opened');

    this.options.onOpen?.();
  }

  /**
   * Transition to HALF_OPEN state
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    this.halfOpenRequests = 0;
    this.updateMetrics();
    
    logger.info({
      circuit: this.name,
    }, 'Circuit breaker half-open');

    this.options.onHalfOpen?.();
  }

  /**
   * Transition to CLOSED state
   */
  private transitionToClosed(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.updateMetrics();
    
    logger.info({
      circuit: this.name,
    }, 'Circuit breaker closed');

    this.options.onClose?.();
  }

  /**
   * Check if monitoring period has elapsed
   */
  private checkPeriod(): void {
    const now = Date.now();
    if (now - this.periodStart >= this.options.monitoringPeriod) {
      this.periodStart = now;
      this.requestsInPeriod = 0;
      this.failures = 0;
      this.successes = 0;
    }
  }

  /**
   * Update Prometheus metrics
   */
  private updateMetrics(): void {
    circuitBreakerMetrics.state.set({ service: this.name }, this.state);
  }

  /**
   * Get current circuit state
   */
  getState(): {
    state: string;
    failures: number;
    successes: number;
    nextAttempt?: Date;
  } {
    return {
      state: CircuitState[this.state],
      failures: this.failures,
      successes: this.successes,
      nextAttempt: this.state === CircuitState.OPEN 
        ? new Date(this.nextAttempt) 
        : undefined,
    };
  }

  /**
   * Force circuit to close (for testing/manual intervention)
   */
  forceClose(): void {
    this.transitionToClosed();
  }

  /**
   * Force circuit to open (for testing/manual intervention)
   */
  forceOpen(): void {
    this.transitionToOpen();
  }
}

/**
 * Circuit breaker error
 */
export class CircuitBreakerError extends Error {
  constructor(message: string, public service: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Circuit breaker factory with presets
 */
export class CircuitBreakerFactory {
  private static breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create circuit breaker
   */
  static getBreaker(
    name: string,
    options?: Partial<CircuitBreakerOptions>
  ): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const defaultOptions: CircuitBreakerOptions = {
        failureThreshold: 0.5, // 50% failure rate
        resetTimeout: 60000, // 1 minute
        monitoringPeriod: 60000, // 1 minute
        minimumRequests: 10,
        halfOpenRequests: 3,
        ...options,
      };

      this.breakers.set(name, new CircuitBreaker(name, defaultOptions));
    }

    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breakers
   */
  static getAllBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Reset all circuit breakers
   */
  static resetAll(): void {
    this.breakers.forEach(breaker => breaker.forceClose());
  }
}

/**
 * Preset circuit breakers
 */
export const circuitBreakers = {
  openai: CircuitBreakerFactory.getBreaker('openai', {
    failureThreshold: 0.3, // 30% failure rate
    resetTimeout: 30000, // 30 seconds
    minimumRequests: 5,
  }),

  database: CircuitBreakerFactory.getBreaker('database', {
    failureThreshold: 0.5,
    resetTimeout: 10000, // 10 seconds
    minimumRequests: 10,
  }),

  redis: CircuitBreakerFactory.getBreaker('redis', {
    failureThreshold: 0.4,
    resetTimeout: 5000, // 5 seconds
    minimumRequests: 5,
  }),

  externalApi: CircuitBreakerFactory.getBreaker('external-api', {
    failureThreshold: 0.6,
    resetTimeout: 60000, // 1 minute
    minimumRequests: 10,
  }),

  manufacturing: CircuitBreakerFactory.getBreaker('manufacturing-systems', {
    failureThreshold: 0.3,
    resetTimeout: 30000, // 30 seconds
    minimumRequests: 5,
  }),
};

/**
 * Wrap async function with circuit breaker
 */
export function withCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  breaker: CircuitBreaker
): T {
  return (async (...args: Parameters<T>) => {
    return breaker.execute(() => fn(...args));
  }) as T;
}