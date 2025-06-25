/**
 * Production Secret Cache - In-memory caching with TTL and encryption
 */

import { logger } from '@/lib/logger';
import { cryptoManager } from '@/lib/security/CryptoManager';
import { EventEmitter } from 'events';
import { Gauge, Counter } from 'prom-client';

// Metrics
const cacheSize = new Gauge({
  name: 'secret_cache_size',
  help: 'Number of secrets in cache',
  labelNames: ['namespace']
});

const cacheHits = new Counter({
  name: 'secret_cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['namespace', 'operation']
});

const cacheMisses = new Counter({
  name: 'secret_cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['namespace', 'operation']
});

const cacheEvictions = new Counter({
  name: 'secret_cache_evictions_total',
  help: 'Total cache evictions',
  labelNames: ['namespace', 'reason']
});

export interface CacheConfig {
  maxSize: number; // Maximum number of entries
  maxMemoryMB: number; // Maximum memory usage in MB
  defaultTTL: number; // Default TTL in seconds
  checkInterval: number; // Cleanup interval in seconds
  encryptionEnabled: boolean;
  encryptionKey?: string;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  encrypted: boolean;
  size: number; // Size in bytes
  ttl: number;
  expiresAt: number;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
  namespace: string;
}

export interface CacheStats {
  size: number;
  memoryUsage: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  oldestEntry: number;
  namespaces: Record<string, {
    size: number;
    memoryUsage: number;
    hits: number;
    misses: number;
  }>;
}

export class SecretCache<T = any> extends EventEmitter {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timer;
  private totalHits = 0;
  private totalMisses = 0;
  private totalEvictions = 0;
  private currentMemoryUsage = 0;
  private encryptionPassword: string;

  constructor(config: Partial<CacheConfig> = {}) {
    super();
    
    this.config = {
      maxSize: 1000,
      maxMemoryMB: 100,
      defaultTTL: 300, // 5 minutes
      checkInterval: 60, // 1 minute
      encryptionEnabled: true,
      ...config
    };

    // Generate or use provided encryption key
    this.encryptionPassword = config.encryptionKey || this.generateEncryptionKey();

    this.startCleanupTimer();
    
    logger.info({
      maxSize: this.config.maxSize,
      maxMemoryMB: this.config.maxMemoryMB,
      defaultTTL: this.config.defaultTTL,
      encryptionEnabled: this.config.encryptionEnabled
    }, 'Secret cache initialized');
  }

  /**
   * Get item from cache
   */
  async get(key: string, namespace: string = 'default'): Promise<T | null> {
    const cacheKey = this.getCacheKey(key, namespace);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      this.totalMisses++;
      cacheMisses.inc({ namespace, operation: 'get' });
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      this.updateMemoryUsage(-entry.size);
      cacheEvictions.inc({ namespace, reason: 'expired' });
      this.totalMisses++;
      cacheMisses.inc({ namespace, operation: 'get' });
      return null;
    }

    // Update access info
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    this.totalHits++;
    cacheHits.inc({ namespace, operation: 'get' });

    // Decrypt if needed
    if (entry.encrypted && this.config.encryptionEnabled) {
      try {
        const decrypted = await cryptoManager.decrypt(entry.value as any, this.encryptionPassword);
        return JSON.parse(decrypted) as T;
      } catch (error) {
        logger.error({
          key: cacheKey,
          error: error.message
        }, 'Failed to decrypt cache entry');
        this.cache.delete(cacheKey);
        return null;
      }
    }

    return entry.value;
  }

  /**
   * Set item in cache
   */
  async set(
    key: string, 
    value: T, 
    options: {
      namespace?: string;
      ttl?: number;
      encrypt?: boolean;
    } = {}
  ): Promise<void> {
    const namespace = options.namespace || 'default';
    const ttl = options.ttl || this.config.defaultTTL;
    const shouldEncrypt = options.encrypt !== undefined ? options.encrypt : this.config.encryptionEnabled;
    const cacheKey = this.getCacheKey(key, namespace);

    // Calculate size
    const valueStr = JSON.stringify(value);
    const size = Buffer.byteLength(valueStr);

    // Check memory limit
    if (this.currentMemoryUsage + size > this.config.maxMemoryMB * 1024 * 1024) {
      await this.evictLRU();
    }

    // Check size limit
    if (this.cache.size >= this.config.maxSize) {
      await this.evictLRU();
    }

    // Encrypt if needed
    let storedValue: any = value;
    if (shouldEncrypt && this.config.encryptionEnabled) {
      try {
        storedValue = await cryptoManager.encrypt(valueStr, this.encryptionPassword);
      } catch (error) {
        logger.error({
          key: cacheKey,
          error: error.message
        }, 'Failed to encrypt cache entry');
        throw error;
      }
    }

    // Remove old entry if exists
    const oldEntry = this.cache.get(cacheKey);
    if (oldEntry) {
      this.updateMemoryUsage(-oldEntry.size);
    }

    // Create new entry
    const entry: CacheEntry<T> = {
      key,
      value: storedValue,
      encrypted: shouldEncrypt && this.config.encryptionEnabled,
      size,
      ttl,
      expiresAt: Date.now() + (ttl * 1000),
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      namespace
    };

    this.cache.set(cacheKey, entry);
    this.updateMemoryUsage(size);
    
    cacheSize.set({ namespace }, this.getNamespaceSize(namespace));
    
    this.emit('set', { key, namespace });
  }

  /**
   * Delete item from cache
   */
  delete(key: string, namespace: string = 'default'): boolean {
    const cacheKey = this.getCacheKey(key, namespace);
    const entry = this.cache.get(cacheKey);
    
    if (entry) {
      this.cache.delete(cacheKey);
      this.updateMemoryUsage(-entry.size);
      cacheSize.set({ namespace }, this.getNamespaceSize(namespace));
      this.emit('delete', { key, namespace });
      return true;
    }
    
    return false;
  }

  /**
   * Clear entire cache or namespace
   */
  clear(namespace?: string): void {
    if (namespace) {
      const keysToDelete: string[] = [];
      
      for (const [cacheKey, entry] of this.cache.entries()) {
        if (entry.namespace === namespace) {
          keysToDelete.push(cacheKey);
          this.updateMemoryUsage(-entry.size);
        }
      }
      
      keysToDelete.forEach(key => this.cache.delete(key));
      cacheSize.set({ namespace }, 0);
      
    } else {
      this.cache.clear();
      this.currentMemoryUsage = 0;
      
      // Reset all namespace metrics
      for (const ns of this.getNamespaces()) {
        cacheSize.set({ namespace: ns }, 0);
      }
    }
    
    this.emit('clear', { namespace });
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string, namespace: string = 'default'): boolean {
    const cacheKey = this.getCacheKey(key, namespace);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return false;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      this.updateMemoryUsage(-entry.size);
      return false;
    }
    
    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const namespaces: Record<string, any> = {};
    let oldestEntry = Date.now();
    
    for (const entry of this.cache.values()) {
      if (!namespaces[entry.namespace]) {
        namespaces[entry.namespace] = {
          size: 0,
          memoryUsage: 0,
          hits: 0,
          misses: 0
        };
      }
      
      namespaces[entry.namespace].size++;
      namespaces[entry.namespace].memoryUsage += entry.size;
      
      if (entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }
    }
    
    const total = this.totalHits + this.totalMisses;
    
    return {
      size: this.cache.size,
      memoryUsage: this.currentMemoryUsage,
      hitRate: total > 0 ? (this.totalHits / total) * 100 : 0,
      missRate: total > 0 ? (this.totalMisses / total) * 100 : 0,
      evictionCount: this.totalEvictions,
      oldestEntry,
      namespaces
    };
  }

  /**
   * Get all namespaces
   */
  private getNamespaces(): string[] {
    const namespaces = new Set<string>();
    for (const entry of this.cache.values()) {
      namespaces.add(entry.namespace);
    }
    return Array.from(namespaces);
  }

  /**
   * Get namespace size
   */
  private getNamespaceSize(namespace: string): number {
    let count = 0;
    for (const entry of this.cache.values()) {
      if (entry.namespace === namespace) count++;
    }
    return count;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(key: string, namespace: string): string {
    return `${namespace}:${key}`;
  }

  /**
   * Update memory usage tracking
   */
  private updateMemoryUsage(delta: number): void {
    this.currentMemoryUsage += delta;
  }

  /**
   * Evict least recently used entries
   */
  private async evictLRU(): Promise<void> {
    const entries = Array.from(this.cache.entries())
      .map(([cacheKey, entry]) => ({ cacheKey, entry }))
      .sort((a, b) => a.entry.lastAccessed - b.entry.lastAccessed);
    
    // Evict 10% of cache or at least 1 entry
    const evictCount = Math.max(1, Math.floor(this.cache.size * 0.1));
    
    for (let i = 0; i < evictCount && i < entries.length; i++) {
      const { cacheKey, entry } = entries[i];
      this.cache.delete(cacheKey);
      this.updateMemoryUsage(-entry.size);
      this.totalEvictions++;
      cacheEvictions.inc({ namespace: entry.namespace, reason: 'lru' });
      this.emit('evict', { key: entry.key, namespace: entry.namespace, reason: 'lru' });
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [cacheKey, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(cacheKey);
        this.updateMemoryUsage(-entry.size);
        this.totalEvictions++;
        cacheEvictions.inc({ namespace: entry.namespace, reason: 'expired' });
        this.emit('evict', { key: entry.key, namespace: entry.namespace, reason: 'expired' });
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    // Update size metrics
    for (const namespace of this.getNamespaces()) {
      cacheSize.set({ namespace }, this.getNamespaceSize(namespace));
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.checkInterval * 1000);
  }

  /**
   * Generate encryption key
   */
  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  /**
   * Warm up cache with initial data
   */
  async warmUp(
    data: Array<{
      key: string;
      value: T;
      namespace?: string;
      ttl?: number;
    }>
  ): Promise<void> {
    logger.info({ count: data.length }, 'Warming up cache');
    
    for (const item of data) {
      await this.set(item.key, item.value, {
        namespace: item.namespace,
        ttl: item.ttl
      });
    }
    
    logger.info({ 
      size: this.cache.size,
      memoryUsage: this.currentMemoryUsage 
    }, 'Cache warm-up complete');
  }

  /**
   * Export cache data (for persistence)
   */
  async export(): Promise<Array<{
    key: string;
    value: any;
    namespace: string;
    ttl: number;
    expiresIn: number;
  }>> {
    const now = Date.now();
    const data: any[] = [];
    
    for (const [_, entry] of this.cache.entries()) {
      if (now < entry.expiresAt) {
        let value = entry.value;
        
        // Decrypt if needed
        if (entry.encrypted && this.config.encryptionEnabled) {
          try {
            const decrypted = await cryptoManager.decrypt(value, this.encryptionPassword);
            value = JSON.parse(decrypted);
          } catch (error) {
            logger.error({
              key: entry.key,
              error: error.message
            }, 'Failed to decrypt entry for export');
            continue;
          }
        }
        
        data.push({
          key: entry.key,
          value,
          namespace: entry.namespace,
          ttl: entry.ttl,
          expiresIn: Math.floor((entry.expiresAt - now) / 1000)
        });
      }
    }
    
    return data;
  }

  /**
   * Import cache data
   */
  async import(data: Array<{
    key: string;
    value: any;
    namespace: string;
    ttl: number;
    expiresIn: number;
  }>): Promise<void> {
    logger.info({ count: data.length }, 'Importing cache data');
    
    for (const item of data) {
      if (item.expiresIn > 0) {
        await this.set(item.key, item.value, {
          namespace: item.namespace,
          ttl: item.expiresIn
        });
      }
    }
    
    logger.info({ 
      size: this.cache.size,
      memoryUsage: this.currentMemoryUsage 
    }, 'Cache import complete');
  }

  /**
   * Destroy cache
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.clear();
    this.removeAllListeners();
    
    logger.info('Secret cache destroyed');
  }
}

// Create default cache instances
export const secretCache = new SecretCache({
  maxSize: 500,
  maxMemoryMB: 50,
  defaultTTL: 300,
  encryptionEnabled: true
});

export const metricCache = new SecretCache({
  maxSize: 10000,
  maxMemoryMB: 200,
  defaultTTL: 60,
  encryptionEnabled: false
});