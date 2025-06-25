/**
 * Distributed Locking with Redlock
 * Production-ready distributed locking for multi-instance deployments
 */

import Redlock from 'redlock';
import Redis from 'ioredis';
import { randomBytes } from 'crypto';

interface LockOptions {
  ttl?: number; // Time to live in milliseconds
  retryCount?: number;
  retryDelay?: number;
  retryJitter?: number;
}

interface Lock {
  resource: string;
  value: string;
  ttl: number;
  attempts: number;
  expiration: number;
}

export class DistributedLockService {
  private static instance: DistributedLockService;
  private redlock: Redlock;
  private redis: Redis[];
  private defaultTTL = 30000; // 30 seconds
  private activeLocks: Map<string, Lock> = new Map();

  constructor() {
    // Create Redis clients for Redlock (should use multiple Redis instances in production)
    this.redis = this.createRedisClients();

    // Initialize Redlock
    this.redlock = new Redlock(this.redis, {
      // The expected clock drift; for more details see:
      // http://redis.io/topics/distlock
      driftFactor: 0.01, // multiplied by lock ttl to determine drift time

      // The max number of times Redlock will attempt to lock a resource
      retryCount: 10,

      // The time in ms between attempts
      retryDelay: 200, // time in ms

      // The max time in ms randomly added to retries
      retryJitter: 200, // time in ms

      // The minimum remaining time on a lock before an extension is automatically attempted
      automaticExtensionThreshold: 500, // time in ms
    });

    // Handle Redlock errors
    this.redlock.on('error', (error) => {
      console.error('Redlock error:', error);
    });
  }

  static getInstance(): DistributedLockService {
    if (!DistributedLockService.instance) {
      DistributedLockService.instance = new DistributedLockService();
    }
    return DistributedLockService.instance;
  }

  /**
   * Create Redis clients for Redlock
   */
  private createRedisClients(): Redis[] {
    // In production, use multiple Redis instances for fault tolerance
    const redisHosts = process.env.REDIS_LOCK_HOSTS?.split(',') || ['localhost:6379'];
    
    return redisHosts.map(host => {
      const [hostname, port] = host.split(':');
      return new Redis({
        host: hostname,
        port: parseInt(port || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_LOCK_DB || '3'),
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
      });
    });
  }

  /**
   * Acquire a distributed lock
   */
  async acquireLock(
    resource: string,
    options: LockOptions = {}
  ): Promise<Redlock.Lock> {
    const ttl = options.ttl || this.defaultTTL;
    
    try {
      // Attempt to acquire lock
      const lock = await this.redlock.acquire([resource], ttl, {
        retryCount: options.retryCount,
        retryDelay: options.retryDelay,
        retryJitter: options.retryJitter,
      });

      // Track active lock
      this.activeLocks.set(resource, {
        resource,
        value: lock.value,
        ttl,
        attempts: lock.attempts.length,
        expiration: Date.now() + ttl,
      });

      // Setup auto-extension if needed
      if (ttl > 5000) {
        this.setupAutoExtension(lock, ttl);
      }

      return lock;
    } catch (error) {
      if (error instanceof Redlock.LockError) {
        throw new Error(`Failed to acquire lock for resource: ${resource}`);
      }
      throw error;
    }
  }

  /**
   * Try to acquire a lock (non-blocking)
   */
  async tryAcquireLock(
    resource: string,
    ttl?: number
  ): Promise<Redlock.Lock | null> {
    try {
      const lock = await this.redlock.acquire(
        [resource],
        ttl || this.defaultTTL,
        { retryCount: 0 }
      );
      
      this.activeLocks.set(resource, {
        resource,
        value: lock.value,
        ttl: ttl || this.defaultTTL,
        attempts: 1,
        expiration: Date.now() + (ttl || this.defaultTTL),
      });

      return lock;
    } catch (error) {
      return null;
    }
  }

  /**
   * Release a lock
   */
  async releaseLock(lock: Redlock.Lock): Promise<void> {
    try {
      await lock.release();
      this.activeLocks.delete(lock.resources[0]);
    } catch (error) {
      console.error('Error releasing lock:', error);
      // Even if release fails, remove from tracking
      this.activeLocks.delete(lock.resources[0]);
    }
  }

  /**
   * Extend lock TTL
   */
  async extendLock(lock: Redlock.Lock, ttl?: number): Promise<Redlock.Lock> {
    const newTTL = ttl || this.defaultTTL;
    const extended = await lock.extend(newTTL);
    
    // Update tracking
    const resource = lock.resources[0];
    const tracked = this.activeLocks.get(resource);
    if (tracked) {
      tracked.expiration = Date.now() + newTTL;
      tracked.ttl = newTTL;
    }

    return extended;
  }

  /**
   * Execute function with lock
   */
  async withLock<T>(
    resource: string,
    fn: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const lock = await this.acquireLock(resource, options);
    
    try {
      return await fn();
    } finally {
      await this.releaseLock(lock);
    }
  }

  /**
   * Execute function with lock (non-blocking)
   */
  async tryWithLock<T>(
    resource: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T | null> {
    const lock = await this.tryAcquireLock(resource, ttl);
    
    if (!lock) {
      return null;
    }

    try {
      return await fn();
    } finally {
      await this.releaseLock(lock);
    }
  }

  /**
   * Setup auto-extension for long-running locks
   */
  private setupAutoExtension(lock: Redlock.Lock, ttl: number): void {
    const extensionInterval = Math.max(ttl / 3, 1000); // Extend at 1/3 of TTL
    let intervalId: NodeJS.Timeout;

    const extend = async () => {
      try {
        await this.extendLock(lock, ttl);
      } catch (error) {
        console.error('Failed to extend lock:', error);
        clearInterval(intervalId);
      }
    };

    intervalId = setInterval(extend, extensionInterval);

    // Clean up interval when lock is released
    const originalRelease = lock.release.bind(lock);
    lock.release = async () => {
      clearInterval(intervalId);
      return originalRelease();
    };
  }

  /**
   * Check if resource is locked
   */
  async isLocked(resource: string): Promise<boolean> {
    // Check local tracking first
    const tracked = this.activeLocks.get(resource);
    if (tracked && tracked.expiration > Date.now()) {
      return true;
    }

    // Try to acquire with no retry
    const lock = await this.tryAcquireLock(resource, 1000);
    if (lock) {
      await this.releaseLock(lock);
      return false;
    }

    return true;
  }

  /**
   * Get lock info
   */
  getLockInfo(resource: string): Lock | undefined {
    return this.activeLocks.get(resource);
  }

  /**
   * Get all active locks
   */
  getActiveLocks(): Lock[] {
    return Array.from(this.activeLocks.values()).filter(
      lock => lock.expiration > Date.now()
    );
  }

  /**
   * Mutex pattern for critical sections
   */
  async mutex<T>(
    resource: string,
    fn: () => Promise<T>,
    timeout = 30000
  ): Promise<T> {
    const lockKey = `mutex:${resource}`;
    const lock = await this.acquireLock(lockKey, { ttl: timeout });

    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Mutex timeout')), timeout - 1000);
        }),
      ]);
    } finally {
      await this.releaseLock(lock);
    }
  }

  /**
   * Semaphore pattern for limiting concurrent access
   */
  async semaphore<T>(
    resource: string,
    limit: number,
    fn: () => Promise<T>
  ): Promise<T> {
    let acquired = false;
    let slot = 0;

    // Try to acquire a slot
    for (let i = 0; i < limit; i++) {
      const lock = await this.tryAcquireLock(`${resource}:${i}`, 30000);
      if (lock) {
        acquired = true;
        slot = i;
        
        try {
          return await fn();
        } finally {
          await this.releaseLock(lock);
        }
      }
    }

    throw new Error(`Semaphore limit reached for resource: ${resource}`);
  }

  /**
   * Leader election pattern
   */
  async electLeader(
    resource: string,
    ttl = 10000
  ): Promise<{ isLeader: boolean; lock?: Redlock.Lock }> {
    const lock = await this.tryAcquireLock(`leader:${resource}`, ttl);
    
    if (lock) {
      // Setup auto-renewal for leadership
      this.setupAutoExtension(lock, ttl);
      return { isLeader: true, lock };
    }

    return { isLeader: false };
  }

  /**
   * Cleanup expired locks from tracking
   */
  cleanupExpiredLocks(): void {
    const now = Date.now();
    for (const [resource, lock] of this.activeLocks.entries()) {
      if (lock.expiration < now) {
        this.activeLocks.delete(resource);
      }
    }
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    // Release all active locks
    const activeLocks = this.getActiveLocks();
    await Promise.all(
      activeLocks.map(lock => 
        this.redlock.release([lock.resource], lock.value)
      )
    );

    // Close Redis connections
    await Promise.all(this.redis.map(client => client.quit()));
  }
}

// Export singleton instance
export const distributedLock = DistributedLockService.getInstance();

// Utility functions
export async function withDistributedLock<T>(
  resource: string,
  fn: () => Promise<T>,
  options?: LockOptions
): Promise<T> {
  return distributedLock.withLock(resource, fn, options);
}

export async function tryWithDistributedLock<T>(
  resource: string,
  fn: () => Promise<T>,
  ttl?: number
): Promise<T | null> {
  return distributedLock.tryWithLock(resource, fn, ttl);
}