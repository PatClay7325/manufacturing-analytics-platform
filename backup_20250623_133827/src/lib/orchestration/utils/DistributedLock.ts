/**
 * Redis-based distributed locking for workflow orchestration
 * Prevents duplicate workflow execution across multiple instances
 */

import Redis from 'ioredis';
import { logger } from '@/lib/logger';
import { getRedisClient } from '@/lib/redis/redisClient';
import { v4 as uuidv4 } from 'uuid';

export interface LockOptions {
  ttl?: number; // Time to live in milliseconds
  retryDelay?: number; // Delay between retry attempts
  retryCount?: number; // Maximum number of retry attempts
  identifier?: string; // Custom identifier for the lock holder
}

export class DistributedLock {
  private redis: Redis;
  private lockKey: string;
  private identifier: string;
  private ttl: number;
  private isLocked = false;
  private renewalTimer?: NodeJS.Timeout;

  constructor(
    lockKey: string,
    options: LockOptions = {}
  ) {
    this.redis = getRedisClient();
    this.lockKey = `lock:${lockKey}`;
    this.identifier = options.identifier || `${process.pid}-${uuidv4()}`;
    this.ttl = options.ttl || 30000; // 30 seconds default
  }

  /**
   * Acquire the distributed lock
   */
  async acquire(options: LockOptions = {}): Promise<boolean> {
    const retryCount = options.retryCount ?? 3;
    const retryDelay = options.retryDelay ?? 1000;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const acquired = await this.tryAcquire();
        if (acquired) {
          this.isLocked = true;
          this.startRenewal();
          
          logger.debug({
            lockKey: this.lockKey,
            identifier: this.identifier,
            ttl: this.ttl,
            attempt: attempt + 1,
          }, 'Distributed lock acquired');
          
          return true;
        }

        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      } catch (error) {
        logger.error({
          error,
          lockKey: this.lockKey,
          identifier: this.identifier,
          attempt: attempt + 1,
        }, 'Failed to acquire distributed lock');
      }
    }

    logger.warn({
      lockKey: this.lockKey,
      identifier: this.identifier,
      retryCount,
    }, 'Failed to acquire distributed lock after retries');

    return false;
  }

  /**
   * Release the distributed lock
   */
  async release(): Promise<boolean> {
    if (!this.isLocked) {
      return true;
    }

    try {
      this.stopRenewal();

      // Use Lua script to ensure atomic release
      const releaseScript = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(
        releaseScript,
        1,
        this.lockKey,
        this.identifier
      ) as number;

      this.isLocked = false;

      if (result === 1) {
        logger.debug({
          lockKey: this.lockKey,
          identifier: this.identifier,
        }, 'Distributed lock released');
        return true;
      } else {
        logger.warn({
          lockKey: this.lockKey,
          identifier: this.identifier,
        }, 'Lock was not owned by this instance during release');
        return false;
      }
    } catch (error) {
      logger.error({
        error,
        lockKey: this.lockKey,
        identifier: this.identifier,
      }, 'Failed to release distributed lock');
      return false;
    }
  }

  /**
   * Check if lock is currently held
   */
  async isHeld(): Promise<boolean> {
    try {
      const value = await this.redis.get(this.lockKey);
      return value === this.identifier;
    } catch (error) {
      logger.error({
        error,
        lockKey: this.lockKey,
      }, 'Failed to check lock status');
      return false;
    }
  }

  /**
   * Extend the lock TTL
   */
  async extend(additionalTtl: number = this.ttl): Promise<boolean> {
    if (!this.isLocked) {
      return false;
    }

    try {
      // Use Lua script to atomically check ownership and extend TTL
      const extendScript = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("PEXPIRE", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(
        extendScript,
        1,
        this.lockKey,
        this.identifier,
        additionalTtl
      ) as number;

      if (result === 1) {
        logger.debug({
          lockKey: this.lockKey,
          identifier: this.identifier,
          additionalTtl,
        }, 'Lock TTL extended');
        return true;
      } else {
        logger.warn({
          lockKey: this.lockKey,
          identifier: this.identifier,
        }, 'Failed to extend lock - not owned by this instance');
        this.isLocked = false;
        this.stopRenewal();
        return false;
      }
    } catch (error) {
      logger.error({
        error,
        lockKey: this.lockKey,
        identifier: this.identifier,
      }, 'Failed to extend lock TTL');
      return false;
    }
  }

  /**
   * Get lock information
   */
  async getInfo(): Promise<{
    isLocked: boolean;
    owner?: string;
    ttl?: number;
  }> {
    try {
      const [owner, ttl] = await Promise.all([
        this.redis.get(this.lockKey),
        this.redis.pttl(this.lockKey),
      ]);

      return {
        isLocked: owner !== null,
        owner: owner || undefined,
        ttl: ttl > 0 ? ttl : undefined,
      };
    } catch (error) {
      logger.error({
        error,
        lockKey: this.lockKey,
      }, 'Failed to get lock info');
      return { isLocked: false };
    }
  }

  /**
   * Try to acquire lock once without retries
   */
  private async tryAcquire(): Promise<boolean> {
    // Use SET with NX (only if not exists) and PX (expire time)
    const result = await this.redis.set(
      this.lockKey,
      this.identifier,
      'PX',
      this.ttl,
      'NX'
    );

    return result === 'OK';
  }

  /**
   * Start automatic lock renewal
   */
  private startRenewal(): void {
    // Renew at 2/3 of TTL interval
    const renewalInterval = Math.floor(this.ttl * 2 / 3);
    
    this.renewalTimer = setInterval(async () => {
      if (this.isLocked) {
        const extended = await this.extend();
        if (!extended) {
          logger.warn({
            lockKey: this.lockKey,
            identifier: this.identifier,
          }, 'Failed to renew lock - stopping renewal');
          this.stopRenewal();
        }
      }
    }, renewalInterval);
  }

  /**
   * Stop automatic lock renewal
   */
  private stopRenewal(): void {
    if (this.renewalTimer) {
      clearInterval(this.renewalTimer);
      this.renewalTimer = undefined;
    }
  }
}

/**
 * Lock manager for common workflow locking patterns
 */
export class WorkflowLockManager {
  private static locks = new Map<string, DistributedLock>();

  /**
   * Acquire lock for workflow execution
   */
  static async acquireExecutionLock(
    workflowId: string,
    executionId: string,
    options: LockOptions = {}
  ): Promise<DistributedLock | null> {
    const lockKey = `workflow:execution:${workflowId}:${executionId}`;
    const lock = new DistributedLock(lockKey, {
      ttl: 300000, // 5 minutes default for workflow execution
      ...options,
    });

    const acquired = await lock.acquire(options);
    if (acquired) {
      this.locks.set(lockKey, lock);
      return lock;
    }

    return null;
  }

  /**
   * Acquire lock for workflow definition updates
   */
  static async acquireDefinitionLock(
    workflowId: string,
    options: LockOptions = {}
  ): Promise<DistributedLock | null> {
    const lockKey = `workflow:definition:${workflowId}`;
    const lock = new DistributedLock(lockKey, {
      ttl: 60000, // 1 minute default for definition updates
      ...options,
    });

    const acquired = await lock.acquire(options);
    if (acquired) {
      this.locks.set(lockKey, lock);
      return lock;
    }

    return null;
  }

  /**
   * Acquire lock for resource access
   */
  static async acquireResourceLock(
    resourceType: string,
    resourceId: string,
    options: LockOptions = {}
  ): Promise<DistributedLock | null> {
    const lockKey = `resource:${resourceType}:${resourceId}`;
    const lock = new DistributedLock(lockKey, {
      ttl: 120000, // 2 minutes default for resource access
      ...options,
    });

    const acquired = await lock.acquire(options);
    if (acquired) {
      this.locks.set(lockKey, lock);
      return lock;
    }

    return null;
  }

  /**
   * Release a specific lock
   */
  static async releaseLock(lockKey: string): Promise<boolean> {
    const lock = this.locks.get(lockKey);
    if (lock) {
      const released = await lock.release();
      if (released) {
        this.locks.delete(lockKey);
      }
      return released;
    }
    return true; // Already released
  }

  /**
   * Release all managed locks
   */
  static async releaseAllLocks(): Promise<void> {
    const releasePromises = Array.from(this.locks.entries()).map(
      async ([lockKey, lock]) => {
        try {
          await lock.release();
          this.locks.delete(lockKey);
        } catch (error) {
          logger.error({
            error,
            lockKey,
          }, 'Failed to release lock during cleanup');
        }
      }
    );

    await Promise.allSettled(releasePromises);
    this.locks.clear();
  }

  /**
   * Get status of all managed locks
   */
  static async getLocksStatus(): Promise<Array<{
    lockKey: string;
    isHeld: boolean;
    info: any;
  }>> {
    const statusPromises = Array.from(this.locks.entries()).map(
      async ([lockKey, lock]) => {
        try {
          const [isHeld, info] = await Promise.all([
            lock.isHeld(),
            lock.getInfo(),
          ]);
          
          return {
            lockKey,
            isHeld,
            info,
          };
        } catch (error) {
          logger.error({
            error,
            lockKey,
          }, 'Failed to get lock status');
          
          return {
            lockKey,
            isHeld: false,
            info: { error: 'Failed to get status' },
          };
        }
      }
    );

    return await Promise.all(statusPromises);
  }
}

/**
 * Helper function for executing code with distributed lock
 */
export async function withDistributedLock<T>(
  lockKey: string,
  fn: () => Promise<T>,
  options: LockOptions = {}
): Promise<T> {
  const lock = new DistributedLock(lockKey, options);
  
  const acquired = await lock.acquire(options);
  if (!acquired) {
    throw new Error(`Failed to acquire distributed lock: ${lockKey}`);
  }

  try {
    return await fn();
  } finally {
    await lock.release();
  }
}