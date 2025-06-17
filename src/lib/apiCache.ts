/**
 * Simple in-memory API response cache to improve response times
 */

// Cache configuration
const CACHE_TTL = 30000; // 30 seconds TTL for cache entries
const CACHE_MAX_SIZE = 100; // Maximum number of cache entries

// Cache entry interface
interface CacheEntry<T = unknown> {
  data: T;
  expiry: number;
}

// Cache store
const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get a value from the cache
 * @param key - Cache key
 * @returns Cached value or null if not found or expired
 */
export function getCached<T = unknown>(key: string): T | null {
  if (!cache.has(key)) {
    return null;
  }

  const entry = cache.get(key)!;
  
  // Check if entry has expired
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  
  return entry.data as T;
}

/**
 * Set a value in the cache
 * @param key - Cache key
 * @param data - Data to cache
 * @param ttl - Time to live in milliseconds (optional, defaults to CACHE_TTL)
 */
export function setCached<T = unknown>(key: string, data: T, ttl: number = CACHE_TTL): void {
  // If we've reached max size, remove the oldest entry
  if (cache.size >= CACHE_MAX_SIZE) {
    const keys = cache.keys();
    const firstKey = keys.next();
    if (!firstKey.done && firstKey.value) {
      cache.delete(firstKey.value);
    }
  }
  
  cache.set(key, {
    data: data as unknown,
    expiry: Date.now() + ttl
  });
}

/**
 * Remove a value from the cache
 * @param key - Cache key
 */
export function invalidateCached(key: string): void {
  cache.delete(key);
}

/**
 * Clear the entire cache
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Remove all expired entries from the cache
 */
export function pruneExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiry) {
      cache.delete(key);
    }
  }
}

/**
 * Run a function with caching
 * @param key - Cache key
 * @param fn - Function to execute if cache miss
 * @param ttl - Time to live in milliseconds (optional)
 * @returns The cached or newly computed value
 */
export async function withCache<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== null) {
    return cached;
  }
  
  const result = await fn();
  setCached(key, result, ttl);
  return result;
}

// Periodically clean up expired entries
setInterval(pruneExpiredEntries, 60000); // Every minute