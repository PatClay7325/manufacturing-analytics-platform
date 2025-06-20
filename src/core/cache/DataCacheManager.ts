/**
 * Data Cache Manager - High-performance caching system for manufacturing data
 * Implements TTL-based caching, invalidation strategies, and memory management
 */

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
  tags: string[];
  size?: number; // Estimated size in bytes
}

export interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds
  maxSize?: number; // Maximum cache size in MB
  maxEntries?: number; // Maximum number of entries
  enableMetrics?: boolean;
  compression?: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
  hitRate: number;
}

export interface CacheInvalidationRule {
  pattern: string | RegExp;
  condition?: (entry: CacheEntry) => boolean;
  reason?: string;
}

/**
 * High-performance data cache manager for manufacturing analytics
 */
export class DataCacheManager {
  private cache = new Map<string, CacheEntry>();
  private timers = new Map<string, NodeJS.Timeout>();
  private metrics: CacheMetrics;
  private options: Required<CacheOptions>;
  private listeners = new Map<string, Set<(data: any) => void>>();

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100, // 100MB default
      maxEntries: 1000,
      enableMetrics: true,
      compression: false,
      ...options
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      entryCount: 0,
      hitRate: 0
    };

    // Periodic cleanup
    setInterval(() => this.cleanup(), 60000); // Cleanup every minute
  }

  /**
   * Get data from cache or execute loader function
   */
  async get<T>(
    key: string, 
    loader?: () => Promise<T>, 
    options?: { ttl?: number; tags?: string[] }
  ): Promise<T | null> {
    const entry = this.cache.get(key);
    
    // Cache hit
    if (entry && !this.isExpired(entry)) {
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.updateMetrics('hit');
      this.notifyListeners(key, entry.data);
      return entry.data as T;
    }

    // Cache miss
    this.updateMetrics('miss');

    // If loader provided, fetch and cache
    if (loader) {
      try {
        const data = await loader();
        await this.set(key, data, options);
        return data;
      } catch (error) {
        console.error(`Cache loader failed for key ${key}:`, error);
        return null;
      }
    }

    return null;
  }

  /**
   * Set data in cache
   */
  async set<T>(
    key: string, 
    data: T, 
    options?: { ttl?: number; tags?: string[] }
  ): Promise<void> {
    const ttl = options?.ttl || this.options.ttl;
    const tags = options?.tags || [];
    const size = this.estimateSize(data);

    // Check if we need to evict entries
    await this.ensureCapacity(size);

    const entry: CacheEntry<T> = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
      tags,
      size
    };

    // Remove existing entry if any
    this.delete(key);

    // Add new entry
    this.cache.set(key, entry);
    this.metrics.totalSize += size;
    this.metrics.entryCount++;

    // Set TTL timer
    if (ttl > 0) {
      const timer = setTimeout(() => {
        this.delete(key);
      }, ttl);
      this.timers.set(key, timer);
    }

    this.notifyListeners(key, data);
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.metrics.totalSize -= entry.size || 0;
    this.metrics.entryCount--;

    // Clear timer
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();

    // Clear cache
    this.cache.clear();

    // Reset metrics
    this.metrics.totalSize = 0;
    this.metrics.entryCount = 0;
  }

  /**
   * Invalidate cache entries by pattern or tags
   */
  invalidate(rules: CacheInvalidationRule[]): number {
    let invalidatedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      for (const rule of rules) {
        let shouldInvalidate = false;

        // Pattern matching
        if (typeof rule.pattern === 'string') {
          shouldInvalidate = key.includes(rule.pattern);
        } else if (rule.pattern instanceof RegExp) {
          shouldInvalidate = rule.pattern.test(key);
        }

        // Conditional invalidation
        if (shouldInvalidate && rule.condition) {
          shouldInvalidate = rule.condition(entry);
        }

        if (shouldInvalidate) {
          this.delete(key);
          invalidatedCount++;
          console.log(`Cache invalidated: ${key} (${rule.reason || 'No reason'})`);
          break;
        }
      }
    }

    return invalidatedCount;
  }

  /**
   * Subscribe to cache updates for a key
   */
  subscribe(key: string, listener: (data: any) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);

    // Return unsubscribe function
    return () => {
      const keyListeners = this.listeners.get(key);
      if (keyListeners) {
        keyListeners.delete(listener);
        if (keyListeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    this.updateHitRate();
    return { ...this.metrics };
  }

  /**
   * Get cache entries for debugging
   */
  getEntries(): CacheEntry[] {
    return Array.from(this.cache.values());
  }

  /**
   * Preload data into cache
   */
  async preload<T>(
    key: string,
    loader: () => Promise<T>,
    options?: { ttl?: number; tags?: string[] }
  ): Promise<void> {
    if (!this.cache.has(key)) {
      await this.get(key, loader, options);
    }
  }

  /**
   * Batch operations
   */
  async batchGet<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    
    for (const key of keys) {
      const value = await this.get<T>(key);
      results.set(key, value);
    }
    
    return results;
  }

  async batchSet<T>(entries: Array<{ key: string; data: T; options?: { ttl?: number; tags?: string[] } }>): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.data, entry.options);
    }
  }

  // Private methods

  private isExpired(entry: CacheEntry): boolean {
    if (entry.ttl <= 0) return false; // No expiration
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private estimateSize(data: any): number {
    try {
      return new TextEncoder().encode(JSON.stringify(data)).length;
    } catch {
      return 1024; // Default estimate
    }
  }

  private async ensureCapacity(newEntrySize: number): Promise<void> {
    const maxSizeBytes = this.options.maxSize * 1024 * 1024;
    
    // Check size limit
    while (this.metrics.totalSize + newEntrySize > maxSizeBytes && this.cache.size > 0) {
      await this.evictLRU();
    }

    // Check entry count limit
    while (this.cache.size >= this.options.maxEntries) {
      await this.evictLRU();
    }
  }

  private async evictLRU(): Promise<void> {
    let oldestEntry: [string, CacheEntry] | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestEntry = [key, entry];
      }
    }

    if (oldestEntry) {
      this.delete(oldestEntry[0]);
      this.metrics.evictions++;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`Cache cleanup: removed ${expiredKeys.length} expired entries`);
    }
  }

  private updateMetrics(type: 'hit' | 'miss'): void {
    if (!this.options.enableMetrics) return;
    
    if (type === 'hit') {
      this.metrics.hits++;
    } else {
      this.metrics.misses++;
    }
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }

  private notifyListeners(key: string, data: any): void {
    const keyListeners = this.listeners.get(key);
    if (keyListeners) {
      keyListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Cache listener error for key ${key}:`, error);
        }
      });
    }
  }
}

// Singleton instance for global use
export const dataCacheManager = new DataCacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 50, // 50MB
  maxEntries: 500,
  enableMetrics: true
});

// Manufacturing-specific cache configurations
export const MANUFACTURING_CACHE_CONFIGS = {
  // Real-time metrics (short TTL)
  realTimeMetrics: {
    ttl: 30 * 1000, // 30 seconds
    tags: ['metrics', 'realtime']
  },
  
  // Historical data (longer TTL)
  historicalData: {
    ttl: 30 * 60 * 1000, // 30 minutes
    tags: ['historical', 'stable']
  },
  
  // Dashboard definitions (medium TTL)
  dashboards: {
    ttl: 10 * 60 * 1000, // 10 minutes
    tags: ['dashboard', 'config']
  },
  
  // Equipment info (long TTL)
  equipmentInfo: {
    ttl: 60 * 60 * 1000, // 1 hour
    tags: ['equipment', 'static']
  }
} as const;

export default DataCacheManager;