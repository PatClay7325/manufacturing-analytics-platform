/**
 * Chat Cache Service
 * Implements caching for chat responses and intermediate results
 */

import { Redis } from 'ioredis';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export interface CacheConfig {
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  ttl: {
    query: number;      // Query result cache TTL in seconds
    context: number;    // Context cache TTL in seconds
    response: number;   // Response cache TTL in seconds
  };
  maxSize?: number;     // Max cache size in MB
}

export class ChatCache {
  private redis?: Redis;
  private localCache: Map<string, { data: any; expires: number }> = new Map();
  private config: CacheConfig;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      ttl: {
        query: 3600,      // 1 hour
        context: 7200,    // 2 hours
        response: 1800    // 30 minutes
      },
      maxSize: 100,      // 100MB
      ...config
    };

    // Initialize Redis if config provided
    if (this.config.redis) {
      try {
        this.redis = new Redis({
          host: this.config.redis.host,
          port: this.config.redis.port,
          password: this.config.redis.password,
          retryStrategy: (times) => {
            if (times > 3) return null;
            return Math.min(times * 1000, 3000);
          }
        });

        this.redis.on('error', (err) => {
          logger.error('Redis cache error:', err);
        });

        this.redis.on('connect', () => {
          logger.info('Redis cache connected');
        });
      } catch (error) {
        logger.warn('Failed to initialize Redis cache, falling back to local cache:', error);
      }
    }

    // Cleanup expired entries periodically
    setInterval(() => this.cleanupExpired(), 60000); // Every minute
  }

  /**
   * Generate cache key from query and context
   */
  private generateKey(type: string, data: any): string {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
    
    return `chat:${type}:${hash}`;
  }

  /**
   * Get cached query results
   */
  async getQueryCache(query: string, timeRange?: { start: Date; end: Date }): Promise<any | null> {
    const key = this.generateKey('query', { query, timeRange });
    return this.get(key);
  }

  /**
   * Set query cache
   */
  async setQueryCache(
    query: string, 
    timeRange: { start: Date; end: Date } | undefined,
    data: any
  ): Promise<void> {
    const key = this.generateKey('query', { query, timeRange });
    await this.set(key, data, this.config.ttl.query);
  }

  /**
   * Get cached manufacturing context
   */
  async getContextCache(contextId: string): Promise<any | null> {
    const key = `chat:context:${contextId}`;
    return this.get(key);
  }

  /**
   * Set context cache
   */
  async setContextCache(contextId: string, data: any): Promise<void> {
    const key = `chat:context:${contextId}`;
    await this.set(key, data, this.config.ttl.context);
  }

  /**
   * Get cached response
   */
  async getResponseCache(query: string, analysisType: string): Promise<any | null> {
    const key = this.generateKey('response', { query, analysisType });
    return this.get(key);
  }

  /**
   * Set response cache
   */
  async setResponseCache(query: string, analysisType: string, response: any): Promise<void> {
    const key = this.generateKey('response', { query, analysisType });
    await this.set(key, response, this.config.ttl.response);
  }

  /**
   * Get value from cache
   */
  private async get(key: string): Promise<any | null> {
    try {
      // Try Redis first
      if (this.redis) {
        const value = await this.redis.get(key);
        if (value) {
          logger.debug(`Cache hit (Redis): ${key}`);
          return JSON.parse(value);
        }
      }

      // Fallback to local cache
      const cached = this.localCache.get(key);
      if (cached && cached.expires > Date.now()) {
        logger.debug(`Cache hit (local): ${key}`);
        return cached.data;
      }

      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  private async set(key: string, value: any, ttl: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      
      // Store in Redis if available
      if (this.redis) {
        await this.redis.setex(key, ttl, serialized);
      }

      // Also store in local cache
      this.localCache.set(key, {
        data: value,
        expires: Date.now() + (ttl * 1000)
      });

      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  /**
   * Clear specific cache entries
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      // Clear from Redis
      if (this.redis) {
        const keys = await this.redis.keys(`chat:${pattern}:*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }

      // Clear from local cache
      const keysToDelete: string[] = [];
      this.localCache.forEach((_, key) => {
        if (key.startsWith(`chat:${pattern}:`)) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => this.localCache.delete(key));
      
      logger.info(`Invalidated cache pattern: ${pattern}`);
    } catch (error) {
      logger.error('Cache invalidation error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.redis) {
        const keys = await this.redis.keys('chat:*');
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
      
      this.localCache.clear();
      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  /**
   * Cleanup expired entries from local cache
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.localCache.forEach((value, key) => {
      if (value.expires <= now) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.localCache.delete(key));
    
    if (keysToDelete.length > 0) {
      logger.debug(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    localSize: number;
    redisConnected: boolean;
    hitRate: number;
  }> {
    return {
      localSize: this.localCache.size,
      redisConnected: this.redis ? this.redis.status === 'ready' : false,
      hitRate: 0 // Would need to track hits/misses for this
    };
  }

  /**
   * Close cache connections
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    this.localCache.clear();
  }
}

// Singleton instance
let chatCache: ChatCache | null = null;

export function getChatCache(config?: Partial<CacheConfig>): ChatCache {
  if (!chatCache) {
    chatCache = new ChatCache(config);
  }
  return chatCache;
}