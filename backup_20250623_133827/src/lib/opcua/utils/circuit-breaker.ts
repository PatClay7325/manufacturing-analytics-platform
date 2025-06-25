/**
 * Circuit Breaker Pattern Implementation for OPC UA Client
 * Prevents cascade failures and provides graceful degradation
 */

import { CircuitBreakerState } from '../types';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxAttempts: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: Date;
  private halfOpenAttempts: number = 0;
  private monitoringWindowStart: Date = new Date();
  private windowFailures: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.halfOpenAttempts = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.successCount++;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        this.state = CircuitBreakerState.CLOSED;
        this.halfOpenAttempts = 0;
      }
    }

    // Reset monitoring window if needed
    this.checkMonitoringWindow();
  }

  private onFailure(): void {
    this.failures++;
    this.windowFailures++;
    this.lastFailureTime = new Date();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.OPEN;
      return;
    }

    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
    }

    // Check if we need to open based on monitoring window
    this.checkMonitoringWindow();
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.config.resetTimeout;
  }

  private checkMonitoringWindow(): void {
    const windowDuration = Date.now() - this.monitoringWindowStart.getTime();
    
    if (windowDuration >= this.config.monitoringPeriod) {
      // Reset window
      this.monitoringWindowStart = new Date();
      this.windowFailures = 0;
    }
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  getMetrics() {
    return {
      state: this.state,
      failures: this.failures,
      successCount: this.successCount,
      windowFailures: this.windowFailures,
      lastFailureTime: this.lastFailureTime,
      halfOpenAttempts: this.halfOpenAttempts
    };
  }

  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    this.windowFailures = 0;
    this.monitoringWindowStart = new Date();
  }
}