/**
 * Distributed Locking Service for Critical Operations
 * Manufacturing Analytics Platform
 */

import { Redis } from 'ioredis';
import crypto from 'crypto';
import { databaseConfig } from '@/config/database.config';

export interface LockOptions {
  ttl: number; // Time to live in milliseconds
  retryDelay?: number; // Delay between retry attempts
  retryCount?: number; // Number of retry attempts
  identifier?: string; // Custom lock identifier
}

export interface LockInfo {
  key: string;
  value: string;
  ttl: number;
  acquiredAt: number;
  expiresAt: number;
}

export class DistributedLockError extends Error {
  constructor(message: string, public readonly lockKey: string) {
    super(message);
    this.name = 'DistributedLockError';
  }
}

/**
 * Distributed Lock Implementation using Redis
 * Prevents race conditions in distributed operations
 */
export class DistributedLock {
  private redis: Redis;
  private activeLocks: Map<string, LockInfo> = new Map();
  private lockExtensionInterval?: NodeJS.Timeout;

  constructor() {
    this.redis = new Redis({
      host: databaseConfig.redis.host,
      port: databaseConfig.redis.port,
      password: databaseConfig.redis.password,
      db: databaseConfig.redis.db,
      keyPrefix: databaseConfig.redis.keyPrefix + 'lock:',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    this.startLockMaintenance();
  }

  /**
   * Acquire a distributed lock
   */
  async acquireLock(
    key: string, 
    options: LockOptions
  ): Promise<string | null> {
    const lockKey = this.formatLockKey(key);
    const lockValue = options.identifier || this.generateLockValue();
    const ttlSeconds = Math.ceil(options.ttl / 1000);

    const retryCount = options.retryCount ?? 0;
    const retryDelay = options.retryDelay ?? 100;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        // Use SET with NX (Not eXists) and EX (EXpire) options
        const result = await this.redis.set(
          lockKey,
          lockValue,
          'PX', // Expire in milliseconds
          options.ttl,
          'NX' // Only set if not exists
        );

        if (result === 'OK') {
          const lockInfo: LockInfo = {
            key: lockKey,
            value: lockValue,
            ttl: options.ttl,
            acquiredAt: Date.now(),
            expiresAt: Date.now() + options.ttl,
          };

          this.activeLocks.set(lockKey, lockInfo);
          
          console.log(`[DistributedLock] Acquired lock: ${lockKey} (attempt ${attempt + 1})`);
          return lockValue;
        }

        // If not the last attempt, wait before retrying
        if (attempt < retryCount) {
          await this.sleep(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      } catch (error) {
        console.error(`[DistributedLock] Error acquiring lock ${lockKey}:`, error);
        
        if (attempt === retryCount) {
          throw new DistributedLockError(
            `Failed to acquire lock after ${retryCount + 1} attempts: ${error}`,
            lockKey
          );
        }
      }
    }

    return null;
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(key: string, lockValue: string): Promise<boolean> {
    const lockKey = this.formatLockKey(key);

    try {
      // Use Lua script to ensure atomic check-and-delete
      const luaScript = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(luaScript, 1, lockKey, lockValue) as number;
      
      if (result === 1) {
        this.activeLocks.delete(lockKey);
        console.log(`[DistributedLock] Released lock: ${lockKey}`);
        return true;
      } else {
        console.warn(`[DistributedLock] Failed to release lock (not owner): ${lockKey}`);
        return false;
      }
    } catch (error) {
      console.error(`[DistributedLock] Error releasing lock ${lockKey}:`, error);
      throw new DistributedLockError(
        `Failed to release lock: ${error}`,
        lockKey
      );
    }
  }

  /**
   * Extend lock TTL
   */
  async extendLock(
    key: string, 
    lockValue: string, 
    additionalTtl: number
  ): Promise<boolean> {
    const lockKey = this.formatLockKey(key);

    try {
      // Use Lua script to extend TTL only if we own the lock
      const luaScript = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("PEXPIRE", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(
        luaScript, 
        1, 
        lockKey, 
        lockValue, 
        additionalTtl.toString()
      ) as number;

      if (result === 1) {
        // Update local lock info
        const lockInfo = this.activeLocks.get(lockKey);
        if (lockInfo) {
          lockInfo.expiresAt = Date.now() + additionalTtl;
          lockInfo.ttl = additionalTtl;
        }
        
        console.log(`[DistributedLock] Extended lock: ${lockKey} (+${additionalTtl}ms)`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`[DistributedLock] Error extending lock ${lockKey}:`, error);
      return false;
    }
  }

  /**
   * Check if lock exists and get info
   */
  async getLockInfo(key: string): Promise<{
    exists: boolean;
    ttl?: number;
    owner?: string;
  }> {
    const lockKey = this.formatLockKey(key);

    try {
      const [value, ttl] = await Promise.all([
        this.redis.get(lockKey),
        this.redis.pttl(lockKey),
      ]);

      return {
        exists: value !== null,
        ttl: ttl > 0 ? ttl : undefined,
        owner: value || undefined,
      };
    } catch (error) {
      console.error(`[DistributedLock] Error getting lock info ${lockKey}:`, error);
      return { exists: false };
    }
  }

  /**
   * Execute operation with automatic lock management
   */
  async withLock<T>(
    key: string,
    operation: () => Promise<T>,
    options: LockOptions
  ): Promise<T> {
    const lockValue = await this.acquireLock(key, options);
    
    if (!lockValue) {
      throw new DistributedLockError(
        `Unable to acquire lock for operation: ${key}`,
        this.formatLockKey(key)
      );
    }

    try {
      const result = await operation();
      return result;
    } finally {
      await this.releaseLock(key, lockValue);
    }
  }

  /**
   * Execute operation with lock and automatic extension
   */
  async withAutoExtendingLock<T>(
    key: string,
    operation: () => Promise<T>,
    options: LockOptions & { extensionInterval?: number }
  ): Promise<T> {
    const lockValue = await this.acquireLock(key, options);
    
    if (!lockValue) {
      throw new DistributedLockError(
        `Unable to acquire lock for operation: ${key}`,
        this.formatLockKey(key)
      );
    }

    const extensionInterval = options.extensionInterval || Math.floor(options.ttl / 3);
    let extensionTimer: NodeJS.Timeout | undefined;

    // Start auto-extension
    const startAutoExtension = () => {
      extensionTimer = setInterval(async () => {
        try {
          await this.extendLock(key, lockValue, options.ttl);
        } catch (error) {
          console.error(`[DistributedLock] Auto-extension failed for ${key}:`, error);
        }
      }, extensionInterval);
    };

    startAutoExtension();

    try {
      const result = await operation();
      return result;
    } finally {
      if (extensionTimer) {
        clearInterval(extensionTimer);
      }
      await this.releaseLock(key, lockValue);
    }
  }

  /**
   * Get statistics about active locks
   */
  getStats(): {
    activeLocks: number;
    lockKeys: string[];
    expiringLocks: Array<{ key: string; expiresIn: number }>;
  } {
    const now = Date.now();
    const expiringLocks = Array.from(this.activeLocks.values())
      .filter(lock => lock.expiresAt - now < 30000) // Expiring in next 30 seconds
      .map(lock => ({
        key: lock.key,
        expiresIn: Math.max(0, lock.expiresAt - now),
      }))
      .sort((a, b) => a.expiresIn - b.expiresIn);

    return {
      activeLocks: this.activeLocks.size,
      lockKeys: Array.from(this.activeLocks.keys()),
      expiringLocks,
    };
  }

  /**
   * Clean up expired locks from local tracking
   */
  private startLockMaintenance(): void {
    this.lockExtensionInterval = setInterval(() => {
      const now = Date.now();
      const expiredLocks: string[] = [];

      this.activeLocks.forEach((lockInfo, key) => {
        if (lockInfo.expiresAt <= now) {
          expiredLocks.push(key);
        }
      });

      expiredLocks.forEach(key => {
        this.activeLocks.delete(key);
      });

      if (expiredLocks.length > 0) {
        console.log(`[DistributedLock] Cleaned up ${expiredLocks.length} expired locks`);
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Format lock key with prefix
   */
  private formatLockKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9:_-]/g, '_');
  }

  /**
   * Generate unique lock value
   */
  private generateLockValue(): string {
    return `${process.pid}-${Date.now()}-${crypto.randomUUID()}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    if (this.lockExtensionInterval) {
      clearInterval(this.lockExtensionInterval);
    }

    // Release all active locks
    const releasePromises = Array.from(this.activeLocks.values()).map(lock =>
      this.releaseLock(lock.key.replace(this.redis.options.keyPrefix || '', ''), lock.value)
        .catch(error => console.error('Error releasing lock during shutdown:', error))
    );

    await Promise.all(releasePromises);
    await this.redis.quit();
  }
}

/**
 * Manufacturing-specific distributed locks
 */
export class ManufacturingLocks {
  constructor(private lockService: DistributedLock) {}

  /**
   * Lock for OEE calculation to prevent duplicate calculations
   */
  async withOEECalculationLock<T>(
    equipmentId: number,
    timeRange: { start: Date; end: Date },
    operation: () => Promise<T>
  ): Promise<T> {
    const lockKey = `oee-calc:${equipmentId}:${timeRange.start.toISOString()}:${timeRange.end.toISOString()}`;
    
    return this.lockService.withLock(lockKey, operation, {
      ttl: 30000, // 30 seconds
      retryCount: 3,
      retryDelay: 500,
    });
  }

  /**
   * Lock for equipment state changes
   */
  async withEquipmentStateLock<T>(
    equipmentId: number,
    operation: () => Promise<T>
  ): Promise<T> {
    const lockKey = `equipment-state:${equipmentId}`;
    
    return this.lockService.withLock(lockKey, operation, {
      ttl: 10000, // 10 seconds
      retryCount: 5,
      retryDelay: 200,
    });
  }

  /**
   * Lock for production batch operations
   */
  async withProductionBatchLock<T>(
    batchId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const lockKey = `production-batch:${batchId}`;
    
    return this.lockService.withAutoExtendingLock(lockKey, operation, {
      ttl: 300000, // 5 minutes
      extensionInterval: 60000, // Extend every minute
      retryCount: 2,
      retryDelay: 1000,
    });
  }

  /**
   * Lock for maintenance scheduling
   */
  async withMaintenanceScheduleLock<T>(
    equipmentId: number,
    operation: () => Promise<T>
  ): Promise<T> {
    const lockKey = `maintenance-schedule:${equipmentId}`;
    
    return this.lockService.withLock(lockKey, operation, {
      ttl: 60000, // 1 minute
      retryCount: 3,
      retryDelay: 2000,
    });
  }

  /**
   * Lock for critical system configuration changes
   */
  async withSystemConfigLock<T>(
    configSection: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const lockKey = `system-config:${configSection}`;
    
    return this.lockService.withLock(lockKey, operation, {
      ttl: 120000, // 2 minutes
      retryCount: 1,
      retryDelay: 5000,
    });
  }

  /**
   * Lock for data migration operations
   */
  async withDataMigrationLock<T>(
    migrationId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const lockKey = `data-migration:${migrationId}`;
    
    return this.lockService.withAutoExtendingLock(lockKey, operation, {
      ttl: 1800000, // 30 minutes
      extensionInterval: 300000, // Extend every 5 minutes
      retryCount: 0, // Don't retry migrations
    });
  }
}

// Export singleton instances
export const distributedLock = new DistributedLock();
export const manufacturingLocks = new ManufacturingLocks(distributedLock);