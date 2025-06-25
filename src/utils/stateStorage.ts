/**
 * Production-Grade Redis State Storage with Distributed Locking
 * Enterprise state management with clustering, failover, and observability
 */

import Redis, { Cluster } from 'ioredis';
import { logger } from '@/lib/logger';
import { retryWithBackoff } from './resilience-production';
import { Counter, Histogram, Gauge } from 'prom-client';
import crypto from 'crypto';

// Metrics for Redis operations
const redisOperations = new Counter({
  name: 'redis_operations_total',
  help: 'Total Redis operations',
  labelNames: ['operation', 'status', 'cluster_node']
});

const redisLatency = new Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Redis operation latency',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

const redisConnections = new Gauge({
  name: 'redis_connections_active',
  help: 'Active Redis connections',
  labelNames: ['cluster_node']
});

const activeLocks = new Gauge({
  name: 'distributed_locks_active',
  help: 'Active distributed locks',
  labelNames: ['lock_type']
});

export enum LockStatus {
  Acquired = 'ACQUIRED',
  Failed = 'FAILED',
  Timeout = 'TIMEOUT',
  AlreadyHeld = 'ALREADY_HELD'
}

export enum LockType {
  Deployment = 'deployment',
  Experiment = 'experiment',
  Configuration = 'configuration',
  Resource = 'resource'
}

interface LockInfo {
  key: string;
  owner: string;
  acquiredAt: number;
  expiresAt: number;
  lockType: LockType;
  metadata?: Record<string, any>;
}

interface StateStorageConfig {
  redisUrl?: string;
  clusterNodes?: Array<{ host: string; port: number }>;
  password?: string;
  database?: number;
  keyPrefix?: string;
  lockTtlSeconds?: number;
  retryDelayMs?: number;
  maxRetries?: number;
  enableCluster?: boolean;
  enableReadReplica?: boolean;
}

export class EnterpriseStateStorage {
  private client: Redis | Cluster;
  private readClient?: Redis | Cluster;
  private config: Required<StateStorageConfig>;
  private instanceId: string;
  private activeLockTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: StateStorageConfig = {}) {
    this.config = {
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      clusterNodes: [],
      password: process.env.REDIS_PASSWORD || '',
      database: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'enterprise:',
      lockTtlSeconds: 3600,
      retryDelayMs: 100,
      maxRetries: 3,
      enableCluster: process.env.REDIS_CLUSTER === 'true',
      enableReadReplica: process.env.REDIS_READ_REPLICA === 'true',
      ...config
    };

    this.instanceId = crypto.randomBytes(16).toString('hex');
    this.initializeClients();
    this.setupHealthMonitoring();
    this.setupLockCleanup();
  }

  /**
   * Initialize Redis clients with clustering and read replica support
   */
  private initializeClients(): void {
    try {
      if (this.config.enableCluster && this.config.clusterNodes.length > 0) {
        // Redis Cluster mode
        this.client = new Redis.Cluster(this.config.clusterNodes, {
          redisOptions: {
            password: this.config.password,
            db: this.config.database,
            retryDelayOnFailover: this.config.retryDelayMs,
            maxRetriesPerRequest: this.config.maxRetries,
            lazyConnect: true
          },
          natMap: process.env.REDIS_NAT_MAP ? JSON.parse(process.env.REDIS_NAT_MAP) : undefined,
          enableOfflineQueue: false,
          clusterRetryDelayOnFailover: this.config.retryDelayMs,
          maxRetriesPerRequest: this.config.maxRetries
        });

        if (this.config.enableReadReplica) {
          this.readClient = new Redis.Cluster(this.config.clusterNodes, {
            redisOptions: {
              password: this.config.password,
              db: this.config.database,
              readOnly: true
            },
            scaleReads: 'slave'
          });
        }

      } else {
        // Single Redis instance
        this.client = new Redis(this.config.redisUrl, {
          password: this.config.password,
          db: this.config.database,
          retryDelayOnFailover: this.config.retryDelayMs,
          maxRetriesPerRequest: this.config.maxRetries,
          lazyConnect: true
        });

        if (this.config.enableReadReplica && process.env.REDIS_READ_URL) {
          this.readClient = new Redis(process.env.REDIS_READ_URL, {
            password: this.config.password,
            db: this.config.database,
            readOnly: true
          });
        }
      }

      // Set up event listeners
      this.client.on('connect', () => {
        logger.info('Redis client connected');
        redisConnections.inc({ cluster_node: 'primary' });
      });

      this.client.on('error', (error) => {
        logger.error({ error: error.message, stack: error.stack }, 'Redis client error');
        redisOperations.inc({ operation: 'connection', status: 'error', cluster_node: 'primary' });
      });

      this.client.on('close', () => {
        logger.warn('Redis client connection closed');
        redisConnections.dec({ cluster_node: 'primary' });
      });

      if (this.readClient) {
        this.readClient.on('connect', () => {
          logger.info('Redis read client connected');
          redisConnections.inc({ cluster_node: 'read-replica' });
        });

        this.readClient.on('error', (error) => {
          logger.error({ error: error.message }, 'Redis read client error');
        });
      }

      logger.info({
        cluster: this.config.enableCluster,
        readReplica: this.config.enableReadReplica,
        instanceId: this.instanceId
      }, 'Redis state storage initialized');

    } catch (error) {
      logger.error({ error: error.message, config: this.config }, 'Failed to initialize Redis clients');
      throw error;
    }
  }

  /**
   * Set deployment state with validation and compression
   */
  async setDeploymentState(deploymentId: string, state: any): Promise<void> {
    const timer = redisLatency.startTimer({ operation: 'set_deployment' });
    
    try {
      const key = this.getKey('deployment', deploymentId);
      const serializedState = JSON.stringify({
        ...state,
        updatedAt: Date.now(),
        instanceId: this.instanceId,
        version: state.version || 1
      });

      await retryWithBackoff(async () => {
        if (serializedState.length > 1024 * 1024) { // 1MB threshold
          // Use compression for large states
          const zlib = require('zlib');
          const compressed = zlib.deflateSync(serializedState);
          await this.client.hset(key, 'data', compressed, 'compressed', 'true');
        } else {
          await this.client.hset(key, 'data', serializedState, 'compressed', 'false');
        }
        
        // Set TTL
        await this.client.expire(key, 86400); // 24 hours
      }, {
        maxAttempts: this.config.maxRetries,
        initialDelay: this.config.retryDelayMs
      });

      redisOperations.inc({ operation: 'set_deployment', status: 'success', cluster_node: 'primary' });
      
      logger.debug({
        deploymentId,
        size: serializedState.length,
        compressed: serializedState.length > 1024 * 1024
      }, 'Deployment state stored');

    } catch (error) {
      redisOperations.inc({ operation: 'set_deployment', status: 'error', cluster_node: 'primary' });
      logger.error({
        deploymentId,
        error: error.message,
        stack: error.stack
      }, 'Failed to set deployment state');
      throw error;
    } finally {
      timer();
    }
  }

  /**
   * Get deployment state with decompression and validation
   */
  async getDeploymentState(deploymentId: string): Promise<any> {
    const timer = redisLatency.startTimer({ operation: 'get_deployment' });
    const client = this.readClient || this.client;
    
    try {
      const key = this.getKey('deployment', deploymentId);
      
      const result = await retryWithBackoff(async () => {
        return await client.hmget(key, 'data', 'compressed');
      }, {
        maxAttempts: this.config.maxRetries,
        initialDelay: this.config.retryDelayMs
      });

      if (!result[0]) {
        return null;
      }

      let data = result[0];
      const isCompressed = result[1] === 'true';

      if (isCompressed) {
        const zlib = require('zlib');
        data = zlib.inflateSync(Buffer.from(data, 'base64')).toString();
      }

      const state = JSON.parse(data);
      
      redisOperations.inc({ operation: 'get_deployment', status: 'success', cluster_node: client === this.readClient ? 'read-replica' : 'primary' });
      
      logger.debug({
        deploymentId,
        hasState: !!state,
        compressed: isCompressed,
        version: state?.version
      }, 'Deployment state retrieved');

      return state;

    } catch (error) {
      redisOperations.inc({ operation: 'get_deployment', status: 'error', cluster_node: client === this.readClient ? 'read-replica' : 'primary' });
      logger.error({
        deploymentId,
        error: error.message
      }, 'Failed to get deployment state');
      return null;
    } finally {
      timer();
    }
  }

  /**
   * Acquire distributed lock with proper ownership and expiration
   */
  async acquireLock(
    key: string,
    lockType: LockType,
    ttlSeconds: number = this.config.lockTtlSeconds,
    metadata?: Record<string, any>
  ): Promise<LockStatus> {
    const timer = redisLatency.startTimer({ operation: 'acquire_lock' });
    const lockKey = this.getKey('lock', key);
    const owner = `${this.instanceId}:${process.pid}:${Date.now()}`;
    
    try {
      const lockInfo: LockInfo = {
        key,
        owner,
        acquiredAt: Date.now(),
        expiresAt: Date.now() + (ttlSeconds * 1000),
        lockType,
        metadata
      };

      // Use Lua script for atomic lock acquisition
      const luaScript = `
        local key = KEYS[1]
        local owner = ARGV[1]
        local ttl = tonumber(ARGV[2])
        local lockData = ARGV[3]
        
        local current = redis.call('GET', key)
        if not current then
          redis.call('SETEX', key, ttl, lockData)
          return 'ACQUIRED'
        else
          local currentData = cjson.decode(current)
          if currentData.owner == owner then
            redis.call('SETEX', key, ttl, lockData)
            return 'ALREADY_HELD'
          else
            return 'FAILED'
          end
        end
      `;

      const result = await retryWithBackoff(async () => {
        return await this.client.eval(
          luaScript,
          1,
          lockKey,
          owner,
          ttlSeconds.toString(),
          JSON.stringify(lockInfo)
        ) as string;
      }, {
        maxAttempts: this.config.maxRetries,
        initialDelay: this.config.retryDelayMs
      });

      const status = result as LockStatus;

      if (status === LockStatus.Acquired || status === LockStatus.AlreadyHeld) {
        // Set up auto-renewal timer
        this.setupLockRenewal(lockKey, owner, lockInfo, ttlSeconds);
        activeLocks.inc({ lock_type: lockType });
        
        logger.info({
          lockKey: key,
          owner,
          lockType,
          ttlSeconds,
          status,
          metadata
        }, 'Distributed lock acquired');
      } else {
        logger.warn({
          lockKey: key,
          lockType,
          status
        }, 'Failed to acquire distributed lock');
      }

      redisOperations.inc({ operation: 'acquire_lock', status: 'success', cluster_node: 'primary' });
      return status;

    } catch (error) {
      redisOperations.inc({ operation: 'acquire_lock', status: 'error', cluster_node: 'primary' });
      logger.error({
        lockKey: key,
        lockType,
        error: error.message
      }, 'Error acquiring distributed lock');
      return LockStatus.Failed;
    } finally {
      timer();
    }
  }

  /**
   * Release distributed lock with ownership verification
   */
  async releaseLock(key: string, lockType: LockType): Promise<boolean> {
    const timer = redisLatency.startTimer({ operation: 'release_lock' });
    const lockKey = this.getKey('lock', key);
    
    try {
      // Lua script for atomic lock release with ownership check
      const luaScript = `
        local key = KEYS[1]
        local instanceId = ARGV[1]
        
        local current = redis.call('GET', key)
        if current then
          local lockData = cjson.decode(current)
          if string.find(lockData.owner, instanceId, 1, true) then
            redis.call('DEL', key)
            return 1
          else
            return 0
          end
        else
          return 1
        end
      `;

      const result = await retryWithBackoff(async () => {
        return await this.client.eval(luaScript, 1, lockKey, this.instanceId) as number;
      }, {
        maxAttempts: this.config.maxRetries,
        initialDelay: this.config.retryDelayMs
      });

      const released = result === 1;

      if (released) {
        // Cancel auto-renewal timer
        const timerId = this.activeLockTimers.get(lockKey);
        if (timerId) {
          clearTimeout(timerId);
          this.activeLockTimers.delete(lockKey);
        }
        
        activeLocks.dec({ lock_type: lockType });
        
        logger.info({
          lockKey: key,
          lockType,
          instanceId: this.instanceId
        }, 'Distributed lock released');
      } else {
        logger.warn({
          lockKey: key,
          lockType,
          instanceId: this.instanceId
        }, 'Failed to release lock - not owner or already released');
      }

      redisOperations.inc({ operation: 'release_lock', status: 'success', cluster_node: 'primary' });
      return released;

    } catch (error) {
      redisOperations.inc({ operation: 'release_lock', status: 'error', cluster_node: 'primary' });
      logger.error({
        lockKey: key,
        lockType,
        error: error.message
      }, 'Error releasing distributed lock');
      return false;
    } finally {
      timer();
    }
  }

  /**
   * Set up automatic lock renewal to prevent expiration
   */
  private setupLockRenewal(
    lockKey: string,
    owner: string,
    lockInfo: LockInfo,
    ttlSeconds: number
  ): void {
    // Renew at 2/3 of TTL to provide buffer
    const renewalInterval = (ttlSeconds * 1000 * 2) / 3;
    
    const timerId = setTimeout(async () => {
      try {
        const luaScript = `
          local key = KEYS[1]
          local owner = ARGV[1]
          local ttl = tonumber(ARGV[2])
          local lockData = ARGV[3]
          
          local current = redis.call('GET', key)
          if current then
            local currentData = cjson.decode(current)
            if currentData.owner == owner then
              redis.call('SETEX', key, ttl, lockData)
              return 1
            end
          end
          return 0
        `;

        const renewed = await this.client.eval(
          luaScript,
          1,
          lockKey,
          owner,
          ttlSeconds.toString(),
          JSON.stringify({
            ...lockInfo,
            renewedAt: Date.now(),
            expiresAt: Date.now() + (ttlSeconds * 1000)
          })
        ) as number;

        if (renewed) {
          // Set up next renewal
          this.setupLockRenewal(lockKey, owner, lockInfo, ttlSeconds);
          logger.debug({ lockKey, owner }, 'Lock renewed');
        } else {
          this.activeLockTimers.delete(lockKey);
          logger.warn({ lockKey, owner }, 'Lock renewal failed - lock may have been released');
        }

      } catch (error) {
        logger.error({
          lockKey,
          owner,
          error: error.message
        }, 'Lock renewal error');
        this.activeLockTimers.delete(lockKey);
      }
    }, renewalInterval);

    this.activeLockTimers.set(lockKey, timerId);
  }

  /**
   * Get lock information
   */
  async getLockInfo(key: string): Promise<LockInfo | null> {
    const timer = redisLatency.startTimer({ operation: 'get_lock_info' });
    const lockKey = this.getKey('lock', key);
    const client = this.readClient || this.client;
    
    try {
      const lockData = await client.get(lockKey);
      
      if (!lockData) {
        return null;
      }

      const lockInfo = JSON.parse(lockData) as LockInfo;
      
      // Check if lock has expired
      if (Date.now() > lockInfo.expiresAt) {
        return null;
      }

      return lockInfo;

    } catch (error) {
      logger.error({
        lockKey: key,
        error: error.message
      }, 'Error getting lock info');
      return null;
    } finally {
      timer();
    }
  }

  /**
   * Set up health monitoring and metrics collection
   */
  private setupHealthMonitoring(): void {
    // Monitor connection health every 30 seconds
    setInterval(async () => {
      try {
        await this.client.ping();
        redisOperations.inc({ operation: 'health_check', status: 'success', cluster_node: 'primary' });
      } catch (error) {
        redisOperations.inc({ operation: 'health_check', status: 'error', cluster_node: 'primary' });
        logger.error({ error: error.message }, 'Redis health check failed');
      }

      if (this.readClient) {
        try {
          await this.readClient.ping();
          redisOperations.inc({ operation: 'health_check', status: 'success', cluster_node: 'read-replica' });
        } catch (error) {
          redisOperations.inc({ operation: 'health_check', status: 'error', cluster_node: 'read-replica' });
          logger.error({ error: error.message }, 'Redis read client health check failed');
        }
      }
    }, 30000);
  }

  /**
   * Set up automatic cleanup of expired locks
   */
  private setupLockCleanup(): void {
    // Clean up expired locks every 5 minutes
    setInterval(async () => {
      try {
        const pattern = this.getKey('lock', '*');
        const keys = await this.client.keys(pattern);
        
        for (const key of keys) {
          try {
            const lockData = await this.client.get(key);
            if (lockData) {
              const lockInfo = JSON.parse(lockData) as LockInfo;
              if (Date.now() > lockInfo.expiresAt) {
                await this.client.del(key);
                activeLocks.dec({ lock_type: lockInfo.lockType });
                logger.debug({ key, lockInfo }, 'Cleaned up expired lock');
              }
            }
          } catch (error) {
            logger.warn({ key, error: error.message }, 'Error during lock cleanup');
          }
        }
      } catch (error) {
        logger.error({ error: error.message }, 'Lock cleanup process failed');
      }
    }, 300000); // 5 minutes
  }

  /**
   * Generate prefixed key for namespacing
   */
  private getKey(type: string, id: string): string {
    return `${this.config.keyPrefix}${type}:${id}`;
  }

  /**
   * Get storage health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, any>;
    metrics: Record<string, any>;
  }> {
    const checks: Record<string, any> = {};
    const metrics: Record<string, any> = {};

    try {
      // Primary client health
      const primaryStart = Date.now();
      await this.client.ping();
      checks.primary = {
        status: 'healthy',
        latencyMs: Date.now() - primaryStart
      };
    } catch (error) {
      checks.primary = {
        status: 'unhealthy',
        error: error.message
      };
    }

    // Read replica health (if enabled)
    if (this.readClient) {
      try {
        const replicaStart = Date.now();
        await this.readClient.ping();
        checks.readReplica = {
          status: 'healthy',
          latencyMs: Date.now() - replicaStart
        };
      } catch (error) {
        checks.readReplica = {
          status: 'unhealthy',
          error: error.message
        };
      }
    }

    // Active locks count
    metrics.activeLocks = this.activeLockTimers.size;
    metrics.instanceId = this.instanceId;

    // Determine overall status
    const unhealthyChecks = Object.values(checks).filter((check: any) => check.status === 'unhealthy');
    const status = unhealthyChecks.length === 0 ? 'healthy' : 
                  unhealthyChecks.length === Object.keys(checks).length ? 'unhealthy' : 'degraded';

    return {
      status,
      checks,
      metrics
    };
  }

  /**
   * Graceful shutdown with lock cleanup
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down state storage');

    // Clear all active lock timers
    for (const [lockKey, timerId] of this.activeLockTimers) {
      clearTimeout(timerId);
      logger.debug({ lockKey }, 'Cleared lock renewal timer');
    }
    this.activeLockTimers.clear();

    // Release all locks held by this instance
    try {
      const pattern = this.getKey('lock', '*');
      const keys = await this.client.keys(pattern);
      
      for (const key of keys) {
        try {
          const lockData = await this.client.get(key);
          if (lockData) {
            const lockInfo = JSON.parse(lockData) as LockInfo;
            if (lockInfo.owner.includes(this.instanceId)) {
              await this.client.del(key);
              logger.debug({ key, owner: lockInfo.owner }, 'Released lock during shutdown');
            }
          }
        } catch (error) {
          logger.warn({ key, error: error.message }, 'Error releasing lock during shutdown');
        }
      }
    } catch (error) {
      logger.error({ error: error.message }, 'Error during lock cleanup in shutdown');
    }

    // Close connections
    await this.client.quit();
    if (this.readClient) {
      await this.readClient.quit();
    }

    logger.info('State storage shutdown complete');
  }
}

// Global instance
let globalStateStorage: EnterpriseStateStorage | null = null;

/**
 * Get or create global state storage instance
 */
export function getStateStorage(config?: StateStorageConfig): EnterpriseStateStorage {
  if (!globalStateStorage) {
    globalStateStorage = new EnterpriseStateStorage(config);
  }
  return globalStateStorage;
}

/**
 * Convenience functions using global instance
 */
export async function setExperiment(id: string, data: any): Promise<void> {
  const storage = getStateStorage();
  await storage.setDeploymentState(`experiment:${id}`, data);
}

export async function getExperiment(id: string): Promise<any> {
  const storage = getStateStorage();
  return await storage.getDeploymentState(`experiment:${id}`);
}

export async function acquireLock(
  key: string,
  lockType: LockType = LockType.Resource,
  ttlSeconds?: number
): Promise<LockStatus> {
  const storage = getStateStorage();
  return await storage.acquireLock(key, lockType, ttlSeconds);
}

export async function releaseLock(key: string, lockType: LockType = LockType.Resource): Promise<boolean> {
  const storage = getStateStorage();
  return await storage.releaseLock(key, lockType);
}