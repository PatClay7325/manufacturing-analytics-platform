/**
 * Cache Manager for API requests
 * 
 * Provides caching for API responses to reduce network requests
 * and improve application performance.
 */

export interface CacheOptions {
  ttl: number; // Time to live in milliseconds
  key?: string; // Custom cache key (optional)
}

interface CacheItem<T> {
  data: T;
  expiry: number;
}

export class CacheManager {
  private cache: Map<string, CacheItem<unknown>>;
  private defaultTTL: number;

  constructor(defaultTTL: number = 5 * 60 * 1000) { // Default 5 minutes
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate a cache key from a URL and parameters
   */
  private generateKey(url: string, params?: Record<string, unknown>): string {
    if (params) {
      const sortedParams = Object.keys(params)
        .sort()
        .reduce((result: Record<string, unknown>, key: string) => {
          if (params[key] !== undefined && params[key] !== null) {
            result[key] = params[key];
          }
          return result;
        }, {});
      
      return `${url}:${JSON.stringify(sortedParams)}`;
    }
    
    return url;
  }

  /**
   * Set an item in the cache
   */
  set<T>(
    url: string, 
    data: T, 
    options?: Partial<CacheOptions>,
    params?: Record<string, unknown>
  ): void {
    const ttl = options?.ttl || this.defaultTTL;
    const key = options?.key || this.generateKey(url, params);
    
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
  }

  /**
   * Get an item from the cache
   * Returns undefined if the item doesn't exist or has expired
   */
  get<T>(
    url: string, 
    options?: Partial<CacheOptions>,
    params?: Record<string, unknown>
  ): T | undefined {
    const key = options?.key || this.generateKey(url, params);
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }
    
    // Check if the item has expired
    if (item.expiry < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.data as T;
  }

  /**
   * Check if an item exists in the cache and is not expired
   */
  has(
    url: string, 
    options?: Partial<CacheOptions>,
    params?: Record<string, unknown>
  ): boolean {
    const key = options?.key || this.generateKey(url, params);
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }
    
    // Check if the item has expired
    if (item.expiry < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Remove an item from the cache
   */
  delete(
    url: string, 
    options?: Partial<CacheOptions>,
    params?: Record<string, unknown>
  ): boolean {
    const key = options?.key || this.generateKey(url, params);
    return this.cache.delete(key);
  }

  /**
   * Clear all items from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear items from the cache that match a given prefix
   */
  clearByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get the number of items in the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Cleanup expired items from the cache
   * This should be called periodically to free up memory
   */
  cleanup(): void {
    const now = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Wrapper function that either returns cached data or fetches new data
   */
  async fetchWithCache<T>(
    fetchFn: () => Promise<T>,
    url: string,
    options?: Partial<CacheOptions>,
    params?: Record<string, unknown>
  ): Promise<T> {
    // Check if the data is in the cache
    const cachedData = this.get<T>(url, options, params);
    
    if (cachedData !== undefined) {
      return cachedData;
    }
    
    // If not in cache, fetch the data
    const data = await fetchFn();
    
    // Cache the data
    this.set(url, data, options, params);
    
    return data;
  }
}

// Create and export a default instance
const cacheManager = new CacheManager();
export default cacheManager;