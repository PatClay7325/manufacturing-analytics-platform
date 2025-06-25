/**
 * LRU Cache for File Deduplication
 * Production-ready cache with memory management
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

interface CacheEntry<T> {
  key: string;
  value: T;
  size: number;
  lastAccess: number;
  hits: number;
  hash?: string;
}

interface CacheOptions {
  maxSize?: number; // Max size in bytes
  maxEntries?: number; // Max number of entries
  ttl?: number; // Time to live in milliseconds
  onEvict?: (key: string, value: any) => void;
}

interface CacheStats {
  size: number;
  entries: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
}

export class LRUCache<T = any> extends EventEmitter {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessOrder: string[] = [];
  private currentSize = 0;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(private options: CacheOptions = {}) {
    super();
    this.options = {
      maxSize: 100 * 1024 * 1024, // 100MB default
      maxEntries: 10000,
      ttl: 3600000, // 1 hour default
      ...options,
    };
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.emit('miss', key);
      return undefined;
    }

    // Check TTL
    if (this.options.ttl && Date.now() - entry.lastAccess > this.options.ttl) {
      this.delete(key);
      this.stats.misses++;
      this.emit('expired', key);
      return undefined;
    }

    // Update access order
    this.updateAccessOrder(key);
    entry.lastAccess = Date.now();
    entry.hits++;
    
    this.stats.hits++;
    this.emit('hit', key);
    
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, size?: number): boolean {
    // Calculate size if not provided
    if (size === undefined) {
      size = this.estimateSize(value);
    }

    // Check if it fits
    if (size > this.options.maxSize!) {
      this.emit('reject', key, 'size_exceeded');
      return false;
    }

    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Evict entries if needed
    while (
      (this.currentSize + size > this.options.maxSize!) ||
      (this.cache.size >= this.options.maxEntries!)
    ) {
      const evicted = this.evictLRU();
      if (!evicted) break; // Safety check
    }

    // Add new entry
    const entry: CacheEntry<T> = {
      key,
      value,
      size,
      lastAccess: Date.now(),
      hits: 0,
    };

    this.cache.set(key, entry);
    this.accessOrder.push(key);
    this.currentSize += size;
    
    this.emit('set', key);
    return true;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.currentSize -= entry.size;
    
    // Remove from access order
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }

    this.emit('delete', key);
    
    if (this.options.onEvict) {
      this.options.onEvict(key, entry.value);
    }

    return true;
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check TTL
    if (this.options.ttl && Date.now() - entry.lastAccess > this.options.ttl) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const keys = Array.from(this.cache.keys());
    
    if (this.options.onEvict) {
      for (const key of keys) {
        const entry = this.cache.get(key);
        if (entry) {
          this.options.onEvict(key, entry.value);
        }
      }
    }

    this.cache.clear();
    this.accessOrder = [];
    this.currentSize = 0;
    
    this.emit('clear');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    
    return {
      size: this.currentSize,
      entries: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get memory usage
   */
  memoryUsage(): number {
    return this.currentSize;
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): boolean {
    if (this.accessOrder.length === 0) return false;
    
    const key = this.accessOrder.shift()!;
    const entry = this.cache.get(key);
    
    if (entry) {
      this.cache.delete(key);
      this.currentSize -= entry.size;
      this.stats.evictions++;
      
      this.emit('evict', key);
      
      if (this.options.onEvict) {
        this.options.onEvict(key, entry.value);
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Estimate size of value
   */
  private estimateSize(value: any): number {
    if (Buffer.isBuffer(value)) {
      return value.length;
    }
    
    if (typeof value === 'string') {
      return Buffer.byteLength(value);
    }
    
    // For objects, use JSON serialization as estimate
    try {
      return Buffer.byteLength(JSON.stringify(value));
    } catch {
      // Fallback for circular references
      return 1024; // 1KB default
    }
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    if (!this.options.ttl) return 0;
    
    const now = Date.now();
    const expired: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastAccess > this.options.ttl) {
        expired.push(key);
      }
    }
    
    for (const key of expired) {
      this.delete(key);
    }
    
    return expired.length;
  }
}

/**
 * File deduplication cache with content hashing
 */
export class FileDeduplicationCache extends LRUCache<{
  path: string;
  hash: string;
  size: number;
  timestamp: number;
  metadata?: any;
}> {
  constructor(options?: CacheOptions) {
    super({
      maxSize: 500 * 1024 * 1024, // 500MB for file dedup
      maxEntries: 50000,
      ttl: 24 * 3600000, // 24 hours
      ...options,
    });
  }

  /**
   * Check if file content already exists
   */
  async checkDuplicate(
    content: Buffer | string,
    algorithm: 'sha256' | 'sha512' | 'md5' = 'sha256'
  ): Promise<{
    isDuplicate: boolean;
    hash: string;
    existingPath?: string;
  }> {
    // Calculate hash
    const hash = crypto
      .createHash(algorithm)
      .update(content)
      .digest('hex');
    
    // Check cache
    const existing = this.get(hash);
    
    if (existing) {
      return {
        isDuplicate: true,
        hash,
        existingPath: existing.path,
      };
    }
    
    return {
      isDuplicate: false,
      hash,
    };
  }

  /**
   * Store file hash
   */
  storeFileHash(
    hash: string,
    path: string,
    size: number,
    metadata?: any
  ): boolean {
    return this.set(hash, {
      path,
      hash,
      size,
      timestamp: Date.now(),
      metadata,
    }, size);
  }

  /**
   * Get duplicate statistics
   */
  getDuplicateStats(): {
    totalFiles: number;
    totalSize: number;
    duplicatesFound: number;
    spaceSaved: number;
  } {
    const entries = Array.from(this.cache.values());
    const stats = this.getStats();
    
    // Calculate space saved by deduplication
    let spaceSaved = 0;
    for (const entry of entries) {
      if (entry.value.metadata?.duplicateCount) {
        spaceSaved += entry.value.size * (entry.value.metadata.duplicateCount - 1);
      }
    }
    
    return {
      totalFiles: entries.length,
      totalSize: this.memoryUsage(),
      duplicatesFound: stats.hits,
      spaceSaved,
    };
  }
}

/**
 * Memory pressure aware cache
 */
export class MemoryAwareCache<T> extends LRUCache<T> {
  private memoryThreshold = 0.8; // 80% memory usage threshold
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(options?: CacheOptions) {
    super(options);
    this.startMemoryMonitoring();
  }

  /**
   * Start monitoring memory pressure
   */
  private startMemoryMonitoring(): void {
    this.checkInterval = setInterval(() => {
      this.checkMemoryPressure();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Check memory pressure and evict if needed
   */
  private checkMemoryPressure(): void {
    const usage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const usageRatio = usage.heapUsed / totalMemory;
    
    if (usageRatio > this.memoryThreshold) {
      this.emit('memory_pressure', usageRatio);
      
      // Aggressive eviction
      const targetSize = this.currentSize * 0.5; // Reduce to 50%
      while (this.currentSize > targetSize && this.cache.size > 0) {
        this.evictLRU();
      }
    }
  }

  /**
   * Set memory threshold
   */
  setMemoryThreshold(threshold: number): void {
    this.memoryThreshold = Math.max(0.1, Math.min(0.95, threshold));
  }

  /**
   * Stop memory monitoring
   */
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.clear();
  }
}

// Export singleton instances
export const deduplicationCache = new FileDeduplicationCache();
export const memoryAwareCache = new MemoryAwareCache();