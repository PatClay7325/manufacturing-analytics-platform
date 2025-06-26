/**
 * Circuit Breaker Service for External Dependency Resilience
 * Manufacturing Analytics Platform
 */

import { EventEmitter } from 'events';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  name: string;
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  volumeThreshold: number;
  errorPercentageThreshold: number;
  slowCallThreshold?: number;
  slowCallDurationThreshold?: number;
}

export interface CircuitBreakerStats {
  name: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalCalls: number;
  lastFailureTime: number;
  lastStateChangeTime: number;
  errorPercentage: number;
  averageResponseTime: number;
}

export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly circuitName: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Circuit Breaker Implementation
 * Prevents cascading failures in distributed systems
 */
export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private totalCalls: number = 0;
  private lastFailureTime: number = 0;
  private lastStateChangeTime: number = Date.now();
  private responseTimes: number[] = [];
  private halfOpenSuccessCount: number = 0;
  
  constructor(private config: CircuitBreakerConfig) {
    super();
    this.validateConfig();
    this.startMonitoring();
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitState.HALF_OPEN);
      } else {
        throw new CircuitBreakerError(
          `Circuit breaker '${this.config.name}' is OPEN`,
          this.config.name
        );
      }
    }

    const startTime = Date.now();
    this.totalCalls++;

    try {
      const result = await Promise.race([
        operation(),
        this.createTimeoutPromise(),
      ]);

      const duration = Date.now() - startTime;
      this.recordSuccess(duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordFailure(duration, error);
      throw error;
    }
  }

  /**
   * Create a timeout promise for slow call detection
   */
  private createTimeoutPromise<T>(): Promise<T> {
    if (!this.config.slowCallDurationThreshold) {
      return new Promise(() => {}); // Never resolves
    }

    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.config.slowCallDurationThreshold}ms`));
      }, this.config.slowCallDurationThreshold);
    });
  }

  /**
   * Record successful operation
   */
  private recordSuccess(duration: number): void {
    this.successCount++;
    this.recordResponseTime(duration);

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenSuccessCount++;
      
      // If enough successes in half-open, close the circuit
      if (this.halfOpenSuccessCount >= Math.ceil(this.config.volumeThreshold / 2)) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }

    this.emit('success', {
      circuitName: this.config.name,
      duration,
      state: this.state,
    });
  }

  /**
   * Record failed operation
   */
  private recordFailure(duration: number, error: any): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.recordResponseTime(duration);

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state opens the circuit
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      // Check if we should open the circuit
      if (this.shouldOpenCircuit()) {
        this.transitionTo(CircuitState.OPEN);
      }
    }

    this.emit('failure', {
      circuitName: this.config.name,
      duration,
      error: error.message,
      state: this.state,
    });
  }

  /**
   * Record response time for monitoring
   */
  private recordResponseTime(duration: number): void {
    this.responseTimes.push(duration);
    
    // Keep only last 100 response times for moving average
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
  }

  /**
   * Check if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    if (this.totalCalls < this.config.volumeThreshold) {
      return false; // Not enough volume to make a decision
    }

    const recentPeriodStart = Date.now() - this.config.monitoringPeriod;
    
    // For simplicity, check failure threshold
    if (this.failureCount >= this.config.failureThreshold) {
      return true;
    }

    // Check error percentage
    const errorPercentage = this.getErrorPercentage();
    if (errorPercentage >= this.config.errorPercentageThreshold) {
      return true;
    }

    // Check slow calls if configured
    if (this.config.slowCallThreshold && this.config.slowCallDurationThreshold) {
      const slowCalls = this.responseTimes.filter(
        time => time >= this.config.slowCallDurationThreshold!
      ).length;
      
      if (slowCalls >= this.config.slowCallThreshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if circuit should attempt reset from OPEN to HALF_OPEN
   */
  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastStateChangeTime >= this.config.recoveryTimeout;
  }

  /**
   * Transition circuit to new state
   */
  private transitionTo(newState: CircuitState): void {
    const previousState = this.state;
    this.state = newState;
    this.lastStateChangeTime = Date.now();

    if (newState === CircuitState.CLOSED) {
      this.reset();
    } else if (newState === CircuitState.HALF_OPEN) {
      this.halfOpenSuccessCount = 0;
    }

    this.emit('stateChange', {
      circuitName: this.config.name,
      previousState,
      newState,
      timestamp: this.lastStateChangeTime,
    });

    console.log(`[CircuitBreaker] ${this.config.name}: ${previousState} -> ${newState}`);
  }

  /**
   * Reset circuit breaker counters
   */
  private reset(): void {
    this.failureCount = 0;
    this.successCount = 0;
    this.totalCalls = 0;
    this.responseTimes = [];
    this.halfOpenSuccessCount = 0;
  }

  /**
   * Get current error percentage
   */
  private getErrorPercentage(): number {
    if (this.totalCalls === 0) return 0;
    return (this.failureCount / this.totalCalls) * 100;
  }

  /**
   * Get average response time
   */
  private getAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    return this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      name: this.config.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCalls: this.totalCalls,
      lastFailureTime: this.lastFailureTime,
      lastStateChangeTime: this.lastStateChangeTime,
      errorPercentage: this.getErrorPercentage(),
      averageResponseTime: this.getAverageResponseTime(),
    };
  }

  /**
   * Force circuit to specific state (for testing/manual intervention)
   */
  forceState(state: CircuitState): void {
    this.transitionTo(state);
  }

  /**
   * Start monitoring and periodic cleanup
   */
  private startMonitoring(): void {
    setInterval(() => {
      // Reset counters periodically to prevent stale data
      const now = Date.now();
      const periodStart = now - this.config.monitoringPeriod;

      // Emit health check event
      this.emit('healthCheck', this.getStats());
      
      // Clean old response times
      if (this.responseTimes.length > 100) {
        this.responseTimes = this.responseTimes.slice(-50);
      }
    }, this.config.monitoringPeriod / 4); // Check 4 times per monitoring period
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    if (this.config.failureThreshold <= 0) {
      throw new Error('Failure threshold must be positive');
    }
    if (this.config.recoveryTimeout <= 0) {
      throw new Error('Recovery timeout must be positive');
    }
    if (this.config.monitoringPeriod <= 0) {
      throw new Error('Monitoring period must be positive');
    }
    if (this.config.errorPercentageThreshold < 0 || this.config.errorPercentageThreshold > 100) {
      throw new Error('Error percentage threshold must be between 0 and 100');
    }
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers for different services
 */
export class CircuitBreakerManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.startHealthMonitoring();
  }

  /**
   * Create or get circuit breaker for a service
   */
  getCircuitBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      const defaultConfig: CircuitBreakerConfig = {
        name,
        failureThreshold: 5,
        recoveryTimeout: 30000, // 30 seconds
        monitoringPeriod: 60000, // 1 minute
        volumeThreshold: 10,
        errorPercentageThreshold: 50,
        slowCallThreshold: 5,
        slowCallDurationThreshold: 5000, // 5 seconds
        ...config,
      };

      const circuitBreaker = new CircuitBreaker(defaultConfig);
      this.circuitBreakers.set(name, circuitBreaker);

      // Forward events to manager
      circuitBreaker.on('stateChange', (event) => {
        console.warn(`[CircuitBreaker] ${event.circuitName} state changed: ${event.previousState} -> ${event.newState}`);
      });

      circuitBreaker.on('failure', (event) => {
        console.error(`[CircuitBreaker] ${event.circuitName} failure: ${event.error}`);
      });
    }

    return this.circuitBreakers.get(name)!;
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): CircuitBreakerStats[] {
    return Array.from(this.circuitBreakers.values()).map(cb => cb.getStats());
  }

  /**
   * Get circuit breakers in OPEN state
   */
  getOpenCircuits(): CircuitBreakerStats[] {
    return this.getAllStats().filter(stats => stats.state === CircuitState.OPEN);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      const openCircuits = this.getOpenCircuits();
      
      if (openCircuits.length > 0) {
        console.warn(`[CircuitBreaker] ${openCircuits.length} circuit(s) are OPEN:`, 
          openCircuits.map(cb => cb.name).join(', '));
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Shutdown all circuit breakers
   */
  shutdown(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.circuitBreakers.forEach(cb => {
      cb.removeAllListeners();
    });
    
    this.circuitBreakers.clear();
  }
}

// Export singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();

/**
 * Manufacturing-specific circuit breakers
 */
export class ManufacturingCircuitBreakers {
  private manager = circuitBreakerManager;

  /**
   * Get circuit breaker for Redis cache operations
   */
  getCacheCircuitBreaker(): CircuitBreaker {
    return this.manager.getCircuitBreaker('redis-cache', {
      failureThreshold: 3,
      recoveryTimeout: 15000, // 15 seconds
      monitoringPeriod: 30000, // 30 seconds
      volumeThreshold: 5,
      errorPercentageThreshold: 30,
      slowCallDurationThreshold: 1000, // 1 second for cache
    });
  }

  /**
   * Get circuit breaker for database operations
   */
  getDatabaseCircuitBreaker(): CircuitBreaker {
    return this.manager.getCircuitBreaker('database', {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 120000, // 2 minutes
      volumeThreshold: 10,
      errorPercentageThreshold: 40,
      slowCallDurationThreshold: 5000, // 5 seconds for DB
    });
  }

  /**
   * Get circuit breaker for external API calls
   */
  getExternalApiCircuitBreaker(apiName: string): CircuitBreaker {
    return this.manager.getCircuitBreaker(`external-api-${apiName}`, {
      failureThreshold: 5,
      recoveryTimeout: 120000, // 2 minutes
      monitoringPeriod: 300000, // 5 minutes
      volumeThreshold: 10,
      errorPercentageThreshold: 50,
      slowCallDurationThreshold: 10000, // 10 seconds for external APIs
    });
  }

  /**
   * Get circuit breaker for event publishing
   */
  getEventPublishingCircuitBreaker(): CircuitBreaker {
    return this.manager.getCircuitBreaker('event-publishing', {
      failureThreshold: 10, // Higher threshold for events
      recoveryTimeout: 30000, // 30 seconds
      monitoringPeriod: 60000, // 1 minute
      volumeThreshold: 20,
      errorPercentageThreshold: 25,
      slowCallDurationThreshold: 2000, // 2 seconds for events
    });
  }
}

// Export manufacturing-specific circuit breakers
export const manufacturingCircuitBreakers = new ManufacturingCircuitBreakers();