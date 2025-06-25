/**
 * Query Cache - Specialized caching for data source queries
 * Optimized for time-series data and manufacturing metrics
 */

import { DataCacheManager, MANUFACTURING_CACHE_CONFIGS } from './DataCacheManager';

export interface QueryCacheKey {
  datasourceId: string;
  query: string;
  timeRange: {
    from: string;
    to: string;
  };
  variables?: Record<string, any>;
  maxDataPoints?: number;
  interval?: string;
}

export interface CachedQueryResult {
  data: any[];
  metadata: {
    executedAt: number;
    executionTime: number;
    rowCount: number;
    fromCache: boolean;
  };
}

export interface QueryCacheOptions {
  enableSmartCaching?: boolean;
  timeRangeOptimization?: boolean;
  compressionThreshold?: number; // KB
}

/**
 * Smart query cache with time-range optimization
 */
export class QueryCache {
  private cacheManager: DataCacheManager;
  private options: Required<QueryCacheOptions>;

  constructor(cacheManager: DataCacheManager, options: QueryCacheOptions = {}) {
    this.cacheManager = cacheManager;
    this.options = {
      enableSmartCaching: true,
      timeRangeOptimization: true,
      compressionThreshold: 100, // 100KB
      ...options
    };
  }

  /**
   * Execute query with caching
   */
  async executeQuery<T = any>(
    cacheKey: QueryCacheKey,
    queryExecutor: () => Promise<T[]>
  ): Promise<CachedQueryResult> {
    const startTime = Date.now();
    const key = this.generateCacheKey(cacheKey);

    // Try to get from cache first
    const cached = await this.cacheManager.get<CachedQueryResult>(key);
    if (cached) {
      return {
        ...cached,
        metadata: {
          ...cached.metadata,
          fromCache: true
        }
      };
    }

    // Execute query
    try {
      const data = await queryExecutor();
      const executionTime = Date.now() - startTime;

      const result: CachedQueryResult = {
        data,
        metadata: {
          executedAt: Date.now(),
          executionTime,
          rowCount: Array.isArray(data) ? data.length : 0,
          fromCache: false
        }
      };

      // Cache the result
      await this.cacheResult(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Query execution failed:', error);
      throw error;
    }
  }

  /**
   * Cache query result with smart TTL
   */
  private async cacheResult(cacheKey: QueryCacheKey, result: CachedQueryResult): Promise<void> {
    const key = this.generateCacheKey(cacheKey);
    const ttl = this.calculateTTL(cacheKey, result);
    const tags = this.generateTags(cacheKey);

    await this.cacheManager.set(key, result, { ttl, tags });
  }

  /**
   * Invalidate queries by pattern
   */
  async invalidateQueries(patterns: {
    datasourceId?: string;
    queryPattern?: string | RegExp;
    timeRangeFrom?: Date;
    maxAge?: number;
  }): Promise<number> {
    const rules = [];

    if (patterns.datasourceId) {
      rules.push({
        pattern: new RegExp(`^query:${patterns.datasourceId}:`),
        reason: `Datasource ${patterns.datasourceId} invalidation`
      });
    }

    if (patterns.queryPattern) {
      const pattern = typeof patterns.queryPattern === 'string' 
        ? new RegExp(patterns.queryPattern) 
        : patterns.queryPattern;
      
      rules.push({
        pattern,
        reason: 'Query pattern match'
      });
    }

    if (patterns.maxAge) {
      const cutoffTime = Date.now() - patterns.maxAge;
      rules.push({
        pattern: /^query:/,
        condition: (entry: any) => entry.timestamp < cutoffTime,
        reason: `Entries older than ${patterns.maxAge}ms`
      });
    }

    return this.cacheManager.invalidate(rules);
  }

  /**
   * Preload common queries
   */
  async preloadQueries(queries: Array<{
    key: QueryCacheKey;
    executor: () => Promise<any[]>;
  }>): Promise<void> {
    const promises = queries.map(({ key, executor }) =>
      this.executeQuery(key, executor).catch(error => {
        console.error(`Failed to preload query ${this.generateCacheKey(key)}:`, error);
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Get cache statistics for queries
   */
  getQueryCacheStats(): {
    totalQueries: number;
    cachedQueries: number;
    averageSize: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const entries = this.cacheManager.getEntries();
    const queryEntries = entries.filter(entry => entry.key.startsWith('query:'));

    if (queryEntries.length === 0) {
      return {
        totalQueries: 0,
        cachedQueries: 0,
        averageSize: 0,
        oldestEntry: 0,
        newestEntry: 0
      };
    }

    const totalSize = queryEntries.reduce((sum, entry) => sum + (entry.size || 0), 0);
    const timestamps = queryEntries.map(entry => entry.timestamp);

    return {
      totalQueries: queryEntries.length,
      cachedQueries: queryEntries.length,
      averageSize: totalSize / queryEntries.length,
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps)
    };
  }

  // Private methods

  private generateCacheKey(cacheKey: QueryCacheKey): string {
    const components = [
      'query',
      cacheKey.datasourceId,
      this.hashQuery(cacheKey.query),
      cacheKey.timeRange.from,
      cacheKey.timeRange.to
    ];

    if (cacheKey.variables && Object.keys(cacheKey.variables).length > 0) {
      components.push(this.hashObject(cacheKey.variables));
    }

    if (cacheKey.maxDataPoints) {
      components.push(`mdp:${cacheKey.maxDataPoints}`);
    }

    if (cacheKey.interval) {
      components.push(`int:${cacheKey.interval}`);
    }

    return components.join(':');
  }

  private hashQuery(query: string): string {
    // Simple hash function for query string
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private hashObject(obj: Record<string, any>): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    return this.hashQuery(str);
  }

  private calculateTTL(cacheKey: QueryCacheKey, result: CachedQueryResult): number {
    if (!this.options.enableSmartCaching) {
      return MANUFACTURING_CACHE_CONFIGS.realTimeMetrics.ttl;
    }

    const timeRange = this.parseTimeRange(cacheKey.timeRange);
    const rangeMs = timeRange.to.getTime() - timeRange.from.getTime();
    
    // Smart TTL based on time range and data characteristics
    if (rangeMs <= 60 * 60 * 1000) { // <= 1 hour
      return 30 * 1000; // 30 seconds
    } else if (rangeMs <= 24 * 60 * 60 * 1000) { // <= 1 day
      return 5 * 60 * 1000; // 5 minutes
    } else if (rangeMs <= 7 * 24 * 60 * 60 * 1000) { // <= 1 week
      return 15 * 60 * 1000; // 15 minutes
    } else {
      return 60 * 60 * 1000; // 1 hour
    }
  }

  private generateTags(cacheKey: QueryCacheKey): string[] {
    const tags = ['query', cacheKey.datasourceId];
    
    const timeRange = this.parseTimeRange(cacheKey.timeRange);
    const rangeMs = timeRange.to.getTime() - timeRange.from.getTime();
    
    if (rangeMs <= 60 * 60 * 1000) {
      tags.push('realtime');
    } else if (rangeMs <= 24 * 60 * 60 * 1000) {
      tags.push('recent');
    } else {
      tags.push('historical');
    }

    return tags;
  }

  private parseTimeRange(timeRange: { from: string; to: string }): { from: Date; to: Date } {
    const parseTime = (time: string): Date => {
      if (time.startsWith('now')) {
        const now = new Date();
        if (time === 'now') return now;
        
        const match = time.match(/now-(\d+)([smhd])/);
        if (match) {
          const [, amount, unit] = match;
          const ms = parseInt(amount) * {
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000
          }[unit as 's' | 'm' | 'h' | 'd']!;
          
          return new Date(now.getTime() - ms);
        }
      }
      
      return new Date(time);
    };

    return {
      from: parseTime(timeRange.from),
      to: parseTime(timeRange.to)
    };
  }
}

// Global query cache instance
export const queryCache = new QueryCache(
  new DataCacheManager({
    ttl: 5 * 60 * 1000, // 5 minutes default
    maxSize: 100, // 100MB
    maxEntries: 1000,
    enableMetrics: true
  }),
  {
    enableSmartCaching: true,
    timeRangeOptimization: true,
    compressionThreshold: 100
  }
);

export default QueryCache;