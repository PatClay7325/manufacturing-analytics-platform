/**
 * Query Cache Manager - Caching system for dashboard queries
 * Implements TTL-based caching with invalidation strategies
 */

import { DataQueryRequest, DataQueryResponse, LoadingState } from '@/core/plugins/types';
import { EventEmitter } from 'events';

export interface CacheEntry {
  key: string;
  request: DataQueryRequest;
  response: DataQueryResponse;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number;
}

export interface CacheOptions {
  maxSize: number; // Maximum cache size in bytes
  defaultTTL: number; // Default TTL in milliseconds
  maxEntries: number; // Maximum number of entries
  enableCompression: boolean;
  persistToStorage: boolean;
}

export interface CacheStats {
  entries: number;
  size: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

export class QueryCacheManager extends EventEmitter {
  private cache: Map<string, CacheEntry> = new Map();
  private options: CacheOptions;
  private stats: CacheStats = {
    entries: 0,
    size: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
    hitRate: 0,
  };
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: Partial<CacheOptions> = {}) {
    super();
    
    this.options = {
      maxSize: 50 * 1024 * 1024, // 50MB
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxEntries: 1000,
      enableCompression: false,
      persistToStorage: true,
      ...options,
    };

    this.startCleanupInterval();
    this.loadFromStorage();
  }

  // Generate cache key from request
  private generateCacheKey(request: DataQueryRequest): string {
    const key = {
      targets: request.targets.map(t => ({
        ...t,
        // Exclude request-specific fields
        requestId: undefined,
        startTime: undefined,
      })),
      range: {
        from: request.range.from.toString(),
        to: request.range.to.toString(),
      },
      interval: request.interval,
      scopedVars: request.scopedVars,
    };

    return btoa(JSON.stringify(key));
  }

  // Get cached response
  get(request: DataQueryRequest): DataQueryResponse | null {
    const key = this.generateCacheKey(request);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.entries--;
      this.stats.size -= entry.size;
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update stats
    entry.hits++;
    this.stats.hits++;
    this.updateHitRate();

    this.emit('cacheHit', key, entry);
    return entry.response;
  }

  // Set cached response
  set(
    request: DataQueryRequest, 
    response: DataQueryResponse,
    ttl?: number
  ): void {
    // Only cache successful responses
    if (response.state !== LoadingState.Done) {
      return;
    }

    const key = this.generateCacheKey(request);
    const size = this.calculateSize(response);

    // Check if we need to evict entries
    if (this.shouldEvict(size)) {
      this.evictEntries(size);
    }

    const entry: CacheEntry = {
      key,
      request,
      response,
      timestamp: Date.now(),
      ttl: ttl || this.options.defaultTTL,
      hits: 0,
      size,
    };

    // Update existing entry stats
    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.stats.size -= existingEntry.size;
    } else {
      this.stats.entries++;
    }

    this.cache.set(key, entry);
    this.stats.size += size;

    this.emit('cacheSet', key, entry);
    this.saveToStorage();
  }

  // Invalidate cache entries
  invalidate(pattern?: string | RegExp): number {
    let invalidated = 0;

    if (!pattern) {
      // Clear all
      invalidated = this.cache.size;
      this.cache.clear();
      this.stats.entries = 0;
      this.stats.size = 0;
    } else {
      // Clear matching entries
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      
      for (const [key, entry] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key);
          this.stats.entries--;
          this.stats.size -= entry.size;
          invalidated++;
        }
      }
    }

    this.emit('cacheInvalidated', invalidated);
    this.saveToStorage();
    return invalidated;
  }

  // Invalidate entries for specific dashboard
  invalidateDashboard(dashboardId: string): number {
    return this.invalidate(dashboardId);
  }

  // Invalidate entries for specific time range
  invalidateTimeRange(from: Date, to: Date): number {
    let invalidated = 0;

    for (const [key, entry] of this.cache) {
      const range = entry.request.range;
      const entryFrom = new Date(range.from);
      const entryTo = new Date(range.to);

      // Check if ranges overlap
      if (entryFrom <= to && entryTo >= from) {
        this.cache.delete(key);
        this.stats.entries--;
        this.stats.size -= entry.size;
        invalidated++;
      }
    }

    this.emit('cacheInvalidated', invalidated);
    this.saveToStorage();
    return invalidated;
  }

  // Get cache statistics
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // Get cache entries
  getEntries(): CacheEntry[] {
    return Array.from(this.cache.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // Check if eviction is needed
  private shouldEvict(newSize: number): boolean {
    return (
      this.stats.size + newSize > this.options.maxSize ||
      this.stats.entries >= this.options.maxEntries
    );
  }

  // Evict entries using LRU strategy
  private evictEntries(requiredSize: number): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => {
        // Sort by last access time (timestamp + hits)
        const aScore = a[1].timestamp + (a[1].hits * 60000); // Bonus for hits
        const bScore = b[1].timestamp + (b[1].hits * 60000);
        return aScore - bScore;
      });

    let freedSize = 0;
    let evicted = 0;

    for (const [key, entry] of entries) {
      if (
        freedSize >= requiredSize && 
        this.stats.entries < this.options.maxEntries &&
        this.stats.size + requiredSize - freedSize <= this.options.maxSize
      ) {
        break;
      }

      this.cache.delete(key);
      this.stats.entries--;
      this.stats.size -= entry.size;
      freedSize += entry.size;
      evicted++;
    }

    this.stats.evictions += evicted;
    this.emit('cacheEvicted', evicted);
  }

  // Calculate response size
  private calculateSize(response: DataQueryResponse): number {
    // Rough estimation of object size
    const str = JSON.stringify(response);
    return str.length * 2; // 2 bytes per character
  }

  // Update hit rate
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.stats.entries--;
        this.stats.size -= entry.size;
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.emit('cacheCleanup', cleaned);
      this.saveToStorage();
    }
  }

  // Start cleanup interval
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  // Stop cleanup interval
  private stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // Save cache to storage
  private saveToStorage(): void {
    if (!this.options.persistToStorage || typeof window === 'undefined') {
      return;
    }

    try {
      const data = {
        entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
          key,
          entry: {
            ...entry,
            // Don't persist the full request/response
            request: undefined,
            response: undefined,
          },
        })),
        stats: this.stats,
      };

      localStorage.setItem('queryCache', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save cache to storage:', error);
    }
  }

  // Load cache from storage
  private loadFromStorage(): void {
    if (!this.options.persistToStorage || typeof window === 'undefined') {
      return;
    }

    try {
      const data = localStorage.getItem('queryCache');
      if (!data) return;

      const parsed = JSON.parse(data);
      
      // Only restore stats, not actual entries (they're incomplete)
      if (parsed.stats) {
        this.stats = {
          ...this.stats,
          ...parsed.stats,
          entries: 0,
          size: 0,
        };
      }
    } catch (error) {
      console.error('Failed to load cache from storage:', error);
    }
  }

  // Destroy cache manager
  destroy(): void {
    this.stopCleanupInterval();
    this.cache.clear();
    this.removeAllListeners();
  }
}

// Global cache instance
export const queryCacheManager = new QueryCacheManager();