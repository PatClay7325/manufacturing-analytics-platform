/**
 * Connection pooling for workflow orchestration
 * Manages database, Redis, and HTTP connections efficiently
 */

import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';
import { ResourceManager, createDatabaseResource, createRedisResource } from './ResourceManager';

export interface PoolConfig {
  min: number;
  max: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
  evictionIntervalMs: number;
  testOnBorrow?: boolean;
  testOnReturn?: boolean;
}

export interface PooledConnection<T = any> {
  id: string;
  connection: T;
  createdAt: Date;
  lastUsed: Date;
  inUse: boolean;
  isHealthy: boolean;
}

export class ConnectionPool<T = any> extends EventEmitter {
  private connections = new Map<string, PooledConnection<T>>();
  private waitingQueue: Array<{
    resolve: (connection: PooledConnection<T>) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = [];
  
  private evictionTimer?: NodeJS.Timeout;
  private isShuttingDown = false;
  private resourceManager = ResourceManager.getInstance();

  constructor(
    private config: PoolConfig,
    private factory: {
      create: () => Promise<T>;
      destroy: (connection: T) => Promise<void>;
      validate?: (connection: T) => Promise<boolean>;
    }
  ) {
    super();
    this.startEvictionTimer();
    this.initializeMinConnections();
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<PooledConnection<T>> {
    if (this.isShuttingDown) {
      throw new Error('Pool is shutting down');
    }

    // Try to find an available connection
    const available = this.findAvailableConnection();
    if (available) {
      available.inUse = true;
      available.lastUsed = new Date();
      this.resourceManager.touch(available.id);
      return available;
    }

    // Create new connection if under max limit
    if (this.connections.size < this.config.max) {
      try {
        const pooled = await this.createConnection();
        pooled.inUse = true;
        return pooled;
      } catch (error) {
        logger.error({ error }, 'Failed to create new connection');
        throw error;
      }
    }

    // Wait for an available connection
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.waitingQueue.findIndex(item => item.resolve === resolve);
        if (index >= 0) {
          this.waitingQueue.splice(index, 1);
        }
        reject(new Error('Connection acquire timeout'));
      }, this.config.acquireTimeoutMs);

      this.waitingQueue.push({ resolve, reject, timeout });
    });
  }

  /**
   * Release a connection back to the pool
   */
  async release(pooledConnection: PooledConnection<T>): Promise<void> {
    const connection = this.connections.get(pooledConnection.id);
    if (!connection) {
      logger.warn({ connectionId: pooledConnection.id }, 'Attempted to release unknown connection');
      return;
    }

    // Validate connection if configured
    let isValid = true;
    if (this.config.testOnReturn && this.factory.validate) {
      try {
        isValid = await this.factory.validate(connection.connection);
      } catch (error) {
        logger.error({ error, connectionId: connection.id }, 'Connection validation failed on return');
        isValid = false;
      }
    }

    if (!isValid) {
      await this.destroyConnection(connection.id);
      this.ensureMinConnections();
      this.processWaitingQueue();
      return;
    }

    // Mark as available
    connection.inUse = false;
    connection.lastUsed = new Date();
    connection.isHealthy = true;

    // Process waiting queue
    this.processWaitingQueue();
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    total: number;
    inUse: number;
    available: number;
    waiting: number;
    min: number;
    max: number;
  } {
    const inUse = Array.from(this.connections.values()).filter(c => c.inUse).length;
    
    return {
      total: this.connections.size,
      inUse,
      available: this.connections.size - inUse,
      waiting: this.waitingQueue.length,
      min: this.config.min,
      max: this.config.max,
    };
  }

  /**
   * Drain and close all connections
   */
  async drain(): Promise<void> {
    this.isShuttingDown = true;

    // Stop eviction timer
    if (this.evictionTimer) {
      clearInterval(this.evictionTimer);
    }

    // Reject all waiting requests
    this.waitingQueue.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('Pool is draining'));
    });
    this.waitingQueue.clear();

    // Wait for in-use connections to be released (with timeout)
    const drainTimeout = 30000; // 30 seconds
    const start = Date.now();
    
    while (this.hasInUseConnections() && (Date.now() - start) < drainTimeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Force close all connections
    const connectionIds = Array.from(this.connections.keys());
    await Promise.allSettled(
      connectionIds.map(id => this.destroyConnection(id))
    );

    logger.info('Connection pool drained');
    this.emit('drained');
  }

  private findAvailableConnection(): PooledConnection<T> | null {
    for (const connection of this.connections.values()) {
      if (!connection.inUse && connection.isHealthy) {
        return connection;
      }
    }
    return null;
  }

  private async createConnection(): Promise<PooledConnection<T>> {
    try {
      const rawConnection = await this.factory.create();
      
      // Validate new connection if configured
      if (this.config.testOnBorrow && this.factory.validate) {
        const isValid = await this.factory.validate(rawConnection);
        if (!isValid) {
          await this.factory.destroy(rawConnection);
          throw new Error('New connection failed validation');
        }
      }

      const id = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const pooled: PooledConnection<T> = {
        id,
        connection: rawConnection,
        createdAt: new Date(),
        lastUsed: new Date(),
        inUse: false,
        isHealthy: true,
      };

      this.connections.set(id, pooled);

      // Register with resource manager
      const resourceHandle = createDatabaseResource(rawConnection);
      this.resourceManager.register(resourceHandle);

      logger.debug({ connectionId: id, total: this.connections.size }, 'Connection created');
      return pooled;
    } catch (error) {
      logger.error({ error }, 'Failed to create connection');
      throw error;
    }
  }

  private async destroyConnection(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    try {
      await this.factory.destroy(connection.connection);
      this.connections.delete(connectionId);
      
      logger.debug({ 
        connectionId, 
        total: this.connections.size 
      }, 'Connection destroyed');
    } catch (error) {
      logger.error({ error, connectionId }, 'Failed to destroy connection');
    }
  }

  private processWaitingQueue(): void {
    while (this.waitingQueue.length > 0) {
      const available = this.findAvailableConnection();
      if (!available) {
        break;
      }

      const waiter = this.waitingQueue.shift();
      if (waiter) {
        clearTimeout(waiter.timeout);
        available.inUse = true;
        available.lastUsed = new Date();
        waiter.resolve(available);
      }
    }
  }

  private async initializeMinConnections(): Promise<void> {
    const promises: Promise<PooledConnection<T>>[] = [];
    
    for (let i = 0; i < this.config.min; i++) {
      promises.push(this.createConnection());
    }

    try {
      await Promise.allSettled(promises);
      logger.info({ 
        created: this.connections.size, 
        target: this.config.min 
      }, 'Initial connections created');
    } catch (error) {
      logger.error({ error }, 'Failed to create initial connections');
    }
  }

  private async ensureMinConnections(): Promise<void> {
    const available = this.connections.size - this.getInUseCount();
    const needed = this.config.min - available;

    if (needed > 0 && this.connections.size < this.config.max) {
      const toCreate = Math.min(needed, this.config.max - this.connections.size);
      
      for (let i = 0; i < toCreate; i++) {
        try {
          await this.createConnection();
        } catch (error) {
          logger.error({ error }, 'Failed to ensure minimum connections');
        }
      }
    }
  }

  private getInUseCount(): number {
    return Array.from(this.connections.values()).filter(c => c.inUse).length;
  }

  private hasInUseConnections(): boolean {
    return this.getInUseCount() > 0;
  }

  private startEvictionTimer(): void {
    this.evictionTimer = setInterval(async () => {
      if (this.isShuttingDown) {
        return;
      }

      const now = new Date();
      const toEvict: string[] = [];

      for (const [id, connection] of this.connections) {
        if (!connection.inUse) {
          const idleTime = now.getTime() - connection.lastUsed.getTime();
          if (idleTime > this.config.idleTimeoutMs) {
            toEvict.push(id);
          }
        }
      }

      // Don't evict below minimum
      const maxToEvict = Math.max(0, this.connections.size - this.config.min);
      const actualEvictions = toEvict.slice(0, maxToEvict);

      for (const id of actualEvictions) {
        await this.destroyConnection(id);
      }

      if (actualEvictions.length > 0) {
        logger.debug({ 
          evicted: actualEvictions.length, 
          total: this.connections.size 
        }, 'Evicted idle connections');
      }

      // Ensure minimum connections
      await this.ensureMinConnections();

    }, this.config.evictionIntervalMs);
  }
}