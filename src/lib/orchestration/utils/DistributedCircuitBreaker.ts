/**
 * Redis-based distributed circuit breaker for workflow orchestration
 * Shares circuit breaker state across multiple instances
 */

import Redis from 'ioredis';
import { logger } from '@/lib/logger';
import { getRedisClient } from '@/lib/redis/redisClient';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls?: number;
}

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open',
}

export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
  totalRequests: number;
  lastResetTime: number;
}

export class DistributedCircuitBreaker {
  private redis: Redis;
  private readonly name: string;
  private readonly config: CircuitBreakerConfig;
  private readonly stateKey: string;
  private readonly metricsKey: string;
  private localCache?: CircuitBreakerState;
  private lastCacheUpdate = 0;
  private readonly cacheTimeout = 5000; // 5 seconds

  constructor(name: string, config: CircuitBreakerConfig) {
    this.redis = getRedisClient();
    this.name = name;
    this.config = {
      halfOpenMaxCalls: 5,
      ...config,
    };
    this.stateKey = `circuit-breaker:${name}:state`;
    this.metricsKey = `circuit-breaker:${name}:metrics`;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = await this.getState();
    
    // Check if circuit is open
    if (state.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset(state)) {
        await this.transitionToHalfOpen();
      } else {
        throw new Error(`Circuit breaker ${this.name} is open`);
      }
    }

    // Check if we're in half-open state and have exceeded max calls
    if (state.state === CircuitState.HALF_OPEN && 
        state.totalRequests >= (this.config.halfOpenMaxCalls || 5)) {
      throw new Error(`Circuit breaker ${this.name} is half-open with max calls exceeded`);
    }

    try {
      // Execute the function
      const result = await fn();
      
      // Record success
      await this.recordSuccess();
      
      return result;
    } catch (error) {
      // Record failure
      await this.recordFailure();
      throw error;
    }
  }

  /**
   * Get current circuit breaker state
   */
  async getState(): Promise<CircuitBreakerState> {
    const now = Date.now();
    
    // Use cached state if recent enough
    if (this.localCache && (now - this.lastCacheUpdate) < this.cacheTimeout) {
      return this.localCache;
    }

    try {
      const stateData = await this.redis.get(this.stateKey);
      
      if (!stateData) {
        const defaultState: CircuitBreakerState = {
          state: CircuitState.CLOSED,
          failureCount: 0,
          lastFailureTime: 0,
          successCount: 0,
          totalRequests: 0,
          lastResetTime: now,
        };
        
        await this.setState(defaultState);
        this.localCache = defaultState;
        this.lastCacheUpdate = now;
        return defaultState;
      }

      const state = JSON.parse(stateData) as CircuitBreakerState;
      this.localCache = state;
      this.lastCacheUpdate = now;
      
      return state;
    } catch (error) {
      logger.error({ 
        error, 
        circuitBreakerName: this.name 
      }, 'Failed to get circuit breaker state');
      
      // Return safe default state on error
      return {
        state: CircuitState.CLOSED,
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0,
        totalRequests: 0,
        lastResetTime: now,
      };
    }
  }

  /**
   * Force circuit breaker to specific state
   */
  async setState(state: CircuitBreakerState): Promise<void> {
    try {
      await this.redis.setex(
        this.stateKey,
        300, // 5 minutes TTL
        JSON.stringify(state)
      );
      
      this.localCache = state;
      this.lastCacheUpdate = Date.now();
      
      logger.debug({
        circuitBreakerName: this.name,
        state: state.state,
        failureCount: state.failureCount,
        totalRequests: state.totalRequests,
      }, 'Circuit breaker state updated');
    } catch (error) {
      logger.error({ 
        error, 
        circuitBreakerName: this.name,
        state: state.state,
      }, 'Failed to set circuit breaker state');
    }
  }

  /**
   * Record successful execution
   */
  private async recordSuccess(): Promise<void> {
    try {
      const luaScript = `
        local stateKey = KEYS[1]
        local now = tonumber(ARGV[1])
        local resetTimeout = tonumber(ARGV[2])
        
        local state = redis.call('GET', stateKey)
        if not state then
          return nil
        end
        
        local stateData = cjson.decode(state)
        stateData.successCount = stateData.successCount + 1
        stateData.totalRequests = stateData.totalRequests + 1
        
        -- If in half-open state and we have enough successes, transition to closed
        if stateData.state == 'half-open' and stateData.successCount >= 3 then
          stateData.state = 'closed'
          stateData.failureCount = 0
          stateData.lastResetTime = now
          stateData.successCount = 0
          stateData.totalRequests = 0
        end
        
        return redis.call('SETEX', stateKey, 300, cjson.encode(stateData))
      `;

      await this.redis.eval(
        luaScript,
        1,
        this.stateKey,
        Date.now(),
        this.config.resetTimeout
      );

      // Invalidate local cache
      this.lastCacheUpdate = 0;
    } catch (error) {
      logger.error({ 
        error, 
        circuitBreakerName: this.name 
      }, 'Failed to record success');
    }
  }

  /**
   * Record failed execution
   */
  private async recordFailure(): Promise<void> {
    try {
      const luaScript = `
        local stateKey = KEYS[1]
        local now = tonumber(ARGV[1])
        local failureThreshold = tonumber(ARGV[2])
        
        local state = redis.call('GET', stateKey)
        if not state then
          return nil
        end
        
        local stateData = cjson.decode(state)
        stateData.failureCount = stateData.failureCount + 1
        stateData.lastFailureTime = now
        stateData.totalRequests = stateData.totalRequests + 1
        
        -- If failure threshold exceeded, open circuit
        if stateData.failureCount >= failureThreshold then
          stateData.state = 'open'
          stateData.successCount = 0
        end
        
        return redis.call('SETEX', stateKey, 300, cjson.encode(stateData))
      `;

      await this.redis.eval(
        luaScript,
        1,
        this.stateKey,
        Date.now(),
        this.config.failureThreshold
      );

      // Invalidate local cache
      this.lastCacheUpdate = 0;
    } catch (error) {
      logger.error({ 
        error, 
        circuitBreakerName: this.name 
      }, 'Failed to record failure');
    }
  }

  /**
   * Transition circuit to half-open state
   */
  private async transitionToHalfOpen(): Promise<void> {
    try {
      const luaScript = `
        local stateKey = KEYS[1]
        local now = tonumber(ARGV[1])
        
        local state = redis.call('GET', stateKey)
        if not state then
          return nil
        end
        
        local stateData = cjson.decode(state)
        
        -- Only transition if currently open
        if stateData.state == 'open' then
          stateData.state = 'half-open'
          stateData.successCount = 0
          stateData.totalRequests = 0
          stateData.lastResetTime = now
        end
        
        return redis.call('SETEX', stateKey, 300, cjson.encode(stateData))
      `;

      await this.redis.eval(
        luaScript,
        1,
        this.stateKey,
        Date.now()
      );

      // Invalidate local cache
      this.lastCacheUpdate = 0;

      logger.info({
        circuitBreakerName: this.name,
      }, 'Circuit breaker transitioned to half-open state');
    } catch (error) {
      logger.error({ 
        error, 
        circuitBreakerName: this.name 
      }, 'Failed to transition to half-open state');
    }
  }

  /**
   * Check if circuit should attempt reset
   */
  private shouldAttemptReset(state: CircuitBreakerState): boolean {
    const now = Date.now();
    return state.state === CircuitState.OPEN && 
           (now - state.lastFailureTime) >= this.config.resetTimeout;
  }

  /**
   * Get circuit breaker metrics
   */
  async getMetrics(): Promise<{
    state: CircuitState;
    failureCount: number;
    successCount: number;
    totalRequests: number;
    failureRate: number;
    uptime: number;
  }> {
    const state = await this.getState();
    const now = Date.now();
    
    return {
      state: state.state,
      failureCount: state.failureCount,
      successCount: state.successCount,
      totalRequests: state.totalRequests,
      failureRate: state.totalRequests > 0 ? state.failureCount / state.totalRequests : 0,
      uptime: now - state.lastResetTime,
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  async reset(): Promise<void> {
    const resetState: CircuitBreakerState = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      lastFailureTime: 0,
      successCount: 0,
      totalRequests: 0,
      lastResetTime: Date.now(),
    };

    await this.setState(resetState);
    
    logger.info({
      circuitBreakerName: this.name,
    }, 'Circuit breaker manually reset');
  }

  /**
   * Check if circuit breaker is healthy
   */
  async isHealthy(): Promise<boolean> {
    const state = await this.getState();
    return state.state === CircuitState.CLOSED || state.state === CircuitState.HALF_OPEN;
  }
}

/**
 * Factory for managing distributed circuit breakers
 */
export class DistributedCircuitBreakerFactory {
  private static instances = new Map<string, DistributedCircuitBreaker>();

  /**
   * Get or create distributed circuit breaker
   */
  static getOrCreate(name: string, config: CircuitBreakerConfig): DistributedCircuitBreaker {
    if (!this.instances.has(name)) {
      this.instances.set(name, new DistributedCircuitBreaker(name, config));
    }
    return this.instances.get(name)!;
  }

  /**
   * Get all circuit breaker instances
   */
  static getAllInstances(): Map<string, DistributedCircuitBreaker> {
    return new Map(this.instances);
  }

  /**
   * Get metrics for all circuit breakers
   */
  static async getAllMetrics(): Promise<Array<{
    name: string;
    metrics: any;
  }>> {
    const results = [];
    
    for (const [name, circuitBreaker] of this.instances) {
      try {
        const metrics = await circuitBreaker.getMetrics();
        results.push({ name, metrics });
      } catch (error) {
        logger.error({ error, name }, 'Failed to get circuit breaker metrics');
        results.push({ 
          name, 
          metrics: { error: 'Failed to retrieve metrics' } 
        });
      }
    }
    
    return results;
  }

  /**
   * Reset all circuit breakers
   */
  static async resetAll(): Promise<void> {
    const resetPromises = Array.from(this.instances.values()).map(
      cb => cb.reset().catch(error => 
        logger.error({ error }, 'Failed to reset circuit breaker')
      )
    );
    
    await Promise.allSettled(resetPromises);
  }
}