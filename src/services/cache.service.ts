import { Redis } from 'ioredis';
import { databaseConfig } from '@/config/database.config';

/**
 * Production-Ready Cache Service
 * Handles caching for expensive calculations and frequently accessed data
 */
export class CacheService {
  private redis: Redis;
  private isConnected: boolean = false;
  
  constructor() {
    this.redis = new Redis({
      host: databaseConfig.redis.host,
      port: databaseConfig.redis.port,
      password: databaseConfig.redis.password,
      db: databaseConfig.redis.db,
      keyPrefix: databaseConfig.redis.keyPrefix,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    
    this.setupEventHandlers();
  }
  
  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers() {
    this.redis.on('connect', () => {
      console.log('[Cache] Connected to Redis');
      this.isConnected = true;
    });
    
    this.redis.on('error', (error) => {
      console.error('[Cache] Redis error:', error);
      this.isConnected = false;
    });
    
    this.redis.on('close', () => {
      console.log('[Cache] Redis connection closed');
      this.isConnected = false;
    });
  }
  
  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.redis.connect();
    }
  }
  
  /**
   * Cache OEE calculation results
   */
  async cacheOEE(
    equipmentId: number,
    timeRange: { start: Date; end: Date },
    oeeData: any
  ): Promise<void> {
    const key = this.getOEEKey(equipmentId, timeRange);
    const ttl = databaseConfig.redis.ttl.oee;
    
    try {
      await this.redis.setex(
        key,
        ttl,
        JSON.stringify({
          ...oeeData,
          cachedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error('[Cache] Failed to cache OEE data:', error);
      // Don't throw - caching failures shouldn't break the application
    }
  }
  
  /**
   * Get cached OEE data
   */
  async getCachedOEE(
    equipmentId: number,
    timeRange: { start: Date; end: Date }
  ): Promise<any | null> {
    const key = this.getOEEKey(equipmentId, timeRange);
    
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('[Cache] Failed to get cached OEE data:', error);
      return null;
    }
  }
  
  /**
   * Cache equipment data
   */
  async cacheEquipment(equipment: any): Promise<void> {
    const key = `equipment:${equipment.id}`;
    const ttl = databaseConfig.redis.ttl.equipment;
    
    try {
      await this.redis.setex(key, ttl, JSON.stringify(equipment));
    } catch (error) {
      console.error('[Cache] Failed to cache equipment data:', error);
    }
  }
  
  /**
   * Get cached equipment data
   */
  async getCachedEquipment(equipmentId: number): Promise<any | null> {
    const key = `equipment:${equipmentId}`;
    
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('[Cache] Failed to get cached equipment data:', error);
      return null;
    }
  }
  
  /**
   * Cache production metrics
   */
  async cacheProductionMetrics(
    equipmentId: number,
    timeRange: { start: Date; end: Date },
    metrics: any
  ): Promise<void> {
    const key = this.getProductionMetricsKey(equipmentId, timeRange);
    const ttl = databaseConfig.redis.ttl.production;
    
    try {
      await this.redis.setex(key, ttl, JSON.stringify(metrics));
    } catch (error) {
      console.error('[Cache] Failed to cache production metrics:', error);
    }
  }
  
  /**
   * Get cached production metrics
   */
  async getCachedProductionMetrics(
    equipmentId: number,
    timeRange: { start: Date; end: Date }
  ): Promise<any | null> {
    const key = this.getProductionMetricsKey(equipmentId, timeRange);
    
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('[Cache] Failed to get cached production metrics:', error);
      return null;
    }
  }
  
  /**
   * Invalidate cache for equipment
   */
  async invalidateEquipmentCache(equipmentId: number): Promise<void> {
    try {
      const patterns = [
        `equipment:${equipmentId}`,
        `oee:${equipmentId}:*`,
        `production:${equipmentId}:*`,
      ];
      
      for (const pattern of patterns) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      console.error('[Cache] Failed to invalidate equipment cache:', error);
    }
  }
  
  /**
   * Cache with automatic serialization and TTL
   */
  async set<T>(
    key: string,
    value: T,
    ttlSeconds: number = databaseConfig.redis.ttl.default
  ): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error(`[Cache] Failed to set key ${key}:`, error);
    }
  }
  
  /**
   * Get with automatic deserialization
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`[Cache] Failed to get key ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Delete key(s)
   */
  async delete(key: string | string[]): Promise<void> {
    try {
      if (Array.isArray(key)) {
        if (key.length > 0) {
          await this.redis.del(...key);
        }
      } else {
        await this.redis.del(key);
      }
    } catch (error) {
      console.error(`[Cache] Failed to delete key(s):`, error);
    }
  }
  
  /**
   * Increment counter with expiration
   */
  async increment(
    key: string,
    increment: number = 1,
    ttlSeconds: number = 3600
  ): Promise<number> {
    try {
      const pipeline = this.redis.pipeline();
      pipeline.incrby(key, increment);
      pipeline.expire(key, ttlSeconds);
      const results = await pipeline.exec();
      return results?.[0]?.[1] as number || 0;
    } catch (error) {
      console.error(`[Cache] Failed to increment key ${key}:`, error);
      return 0;
    }
  }
  
  /**
   * Set if not exists with TTL
   */
  async setNX(key: string, value: any, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.redis.set(
        key,
        JSON.stringify(value),
        'EX',
        ttlSeconds,
        'NX'
      );
      return result === 'OK';
    } catch (error) {
      console.error(`[Cache] Failed to setNX key ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      const info = await this.redis.info('memory');
      const dbSize = await this.redis.dbsize();
      
      return {
        connected: this.isConnected,
        keyCount: dbSize,
        memoryInfo: this.parseRedisInfo(info),
      };
    } catch (error) {
      console.error('[Cache] Failed to get stats:', error);
      return {
        connected: false,
        keyCount: 0,
        memoryInfo: {},
      };
    }
  }
  
  /**
   * Flush cache (use with caution)
   */
  async flush(): Promise<void> {
    try {
      await this.redis.flushdb();
    } catch (error) {
      console.error('[Cache] Failed to flush cache:', error);
    }
  }
  
  /**
   * Close connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
    this.isConnected = false;
  }
  
  /**
   * Generate OEE cache key
   */
  private getOEEKey(equipmentId: number, timeRange: { start: Date; end: Date }): string {
    const startStr = timeRange.start.toISOString().slice(0, 19);
    const endStr = timeRange.end.toISOString().slice(0, 19);
    return `oee:${equipmentId}:${startStr}:${endStr}`;
  }
  
  /**
   * Generate production metrics cache key
   */
  private getProductionMetricsKey(
    equipmentId: number,
    timeRange: { start: Date; end: Date }
  ): string {
    const startStr = timeRange.start.toISOString().slice(0, 10);
    const endStr = timeRange.end.toISOString().slice(0, 10);
    return `production:${equipmentId}:${startStr}:${endStr}`;
  }
  
  /**
   * Parse Redis INFO output
   */
  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }
    
    return result;
  }
  
  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        details: {
          connected: this.isConnected,
          latency,
          host: databaseConfig.redis.host,
          port: databaseConfig.redis.port,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          connected: false,
        },
      };
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();