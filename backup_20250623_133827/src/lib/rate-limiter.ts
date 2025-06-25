/**
 * Rate Limiter Service
 * Production-ready rate limiting with Redis support
 */

import { Redis } from 'ioredis';
import crypto from 'crypto';

interface RateLimitOptions {
  max: number;
  window: string; // e.g., '1h', '15m', '1d'
  skipFailedRequests?: boolean;
  keyPrefix?: string;
}

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export class RateLimiter {
  private redis: Redis | null = null;
  private inMemoryStore: Map<string, { count: number; resetAt: Date }> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(redisUrl?: string) {
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
        });
        
        this.redis.on('error', (err) => {
          console.error('Redis rate limiter error:', err);
          // Fallback to in-memory store
          this.redis = null;
        });
      } catch (error) {
        console.warn('Failed to initialize Redis rate limiter, using in-memory store');
      }
    }

    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check rate limit for a key
   */
  async check(
    key: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    const windowMs = this.parseWindow(options.window);
    const now = Date.now();
    const resetAt = new Date(now + windowMs);
    const prefixedKey = `${options.keyPrefix || 'rate'}:${key}`;

    if (this.redis) {
      return this.checkRedis(prefixedKey, options, windowMs, resetAt);
    }

    return this.checkInMemory(prefixedKey, options, windowMs, resetAt);
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string, keyPrefix?: string): Promise<void> {
    const prefixedKey = `${keyPrefix || 'rate'}:${key}`;

    if (this.redis) {
      await this.redis.del(prefixedKey);
    } else {
      this.inMemoryStore.delete(prefixedKey);
    }
  }

  /**
   * Check using Redis
   */
  private async checkRedis(
    key: string,
    options: RateLimitOptions,
    windowMs: number,
    resetAt: Date
  ): Promise<RateLimitResult> {
    const multi = this.redis!.multi();
    const ttl = Math.ceil(windowMs / 1000);

    multi.incr(key);
    multi.expire(key, ttl);
    
    const results = await multi.exec();
    if (!results) {
      throw new Error('Redis transaction failed');
    }

    const count = results[0][1] as number;
    const allowed = count <= options.max;

    return {
      allowed,
      limit: options.max,
      remaining: Math.max(0, options.max - count),
      reset: resetAt,
      retryAfter: allowed ? undefined : Math.ceil(windowMs / 1000),
    };
  }

  /**
   * Check using in-memory store
   */
  private checkInMemory(
    key: string,
    options: RateLimitOptions,
    windowMs: number,
    resetAt: Date
  ): RateLimitResult {
    const now = new Date();
    const entry = this.inMemoryStore.get(key);

    if (!entry || entry.resetAt <= now) {
      // Create new entry
      this.inMemoryStore.set(key, {
        count: 1,
        resetAt,
      });

      return {
        allowed: true,
        limit: options.max,
        remaining: options.max - 1,
        reset: resetAt,
      };
    }

    // Increment existing entry
    entry.count++;
    const allowed = entry.count <= options.max;

    return {
      allowed,
      limit: options.max,
      remaining: Math.max(0, options.max - entry.count),
      reset: entry.resetAt,
      retryAfter: allowed ? undefined : Math.ceil((entry.resetAt.getTime() - now.getTime()) / 1000),
    };
  }

  /**
   * Parse window string to milliseconds
   */
  private parseWindow(window: string): number {
    const match = window.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid window format: ${window}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Invalid time unit: ${unit}`);
    }
  }

  /**
   * Cleanup expired entries from in-memory store
   */
  private cleanup(): void {
    const now = new Date();
    for (const [key, entry] of this.inMemoryStore.entries()) {
      if (entry.resetAt <= now) {
        this.inMemoryStore.delete(key);
      }
    }
  }

  /**
   * Shutdown cleanup
   */
  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Export configured instance
// Only use Redis in production or if explicitly configured
const redisUrl = process.env.NODE_ENV === 'production' ? process.env.REDIS_URL : undefined;
export const rateLimiter = new RateLimiter(redisUrl);