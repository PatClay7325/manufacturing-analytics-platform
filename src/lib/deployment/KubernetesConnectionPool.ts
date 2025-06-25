/**
 * Production Kubernetes Connection Pool
 * Manages connections efficiently with proper resource management
 */

import { KubeConfig, CoreV1Api, AppsV1Api, BatchV1Api, NetworkingV1Api } from '@kubernetes/client-node';
import { logger } from '@/lib/logger';
import { EventEmitter } from 'events';
import { Counter, Histogram, Gauge } from 'prom-client';

// Metrics
const poolConnections = new Gauge({
  name: 'k8s_connection_pool_size',
  help: 'Current size of Kubernetes connection pool',
  labelNames: ['cluster', 'api_type']
});

const poolUtilization = new Gauge({
  name: 'k8s_connection_pool_utilization',
  help: 'Connection pool utilization percentage',
  labelNames: ['cluster', 'api_type']
});

const connectionWaitTime = new Histogram({
  name: 'k8s_connection_wait_seconds',
  help: 'Time waiting for connection from pool',
  labelNames: ['cluster', 'api_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});

export interface PoolConfig {
  minConnections: number;
  maxConnections: number;
  acquireTimeout: number; // ms
  createTimeout: number; // ms
  destroyTimeout: number; // ms
  idleTimeout: number; // ms
  reapInterval: number; // ms
  createRetries: number;
  validateOnBorrow: boolean;
  validateOnReturn: boolean;
}

export interface Connection<T> {
  id: string;
  api: T;
  created: Date;
  lastUsed: Date;
  useCount: number;
  errors: number;
  inUse: boolean;
}

export class KubernetesConnectionPool extends EventEmitter {
  private config: PoolConfig;
  private kubeConfig: KubeConfig;
  private cluster: string;
  
  // Connection pools for different API types
  private coreV1Pool: Connection<CoreV1Api>[] = [];
  private appsV1Pool: Connection<AppsV1Api>[] = [];
  private batchV1Pool: Connection<BatchV1Api>[] = [];
  private networkingV1Pool: Connection<NetworkingV1Api>[] = [];
  
  private destroyed = false;
  private reapTimer?: NodeJS.Timer;
  private waitingQueue: Array<{
    type: string;
    resolve: (conn: any) => void;
    reject: (err: Error) => void;
    timer: NodeJS.Timeout;
  }> = [];

  constructor(kubeConfig: KubeConfig, config: Partial<PoolConfig> = {}) {
    super();
    
    this.kubeConfig = kubeConfig;
    this.cluster = kubeConfig.getCurrentCluster()?.name || 'default';
    
    this.config = {
      minConnections: 2,
      maxConnections: 10,
      acquireTimeout: 30000,
      createTimeout: 30000,
      destroyTimeout: 5000,
      idleTimeout: 300000, // 5 minutes
      reapInterval: 60000, // 1 minute
      createRetries: 3,
      validateOnBorrow: true,
      validateOnReturn: false,
      ...config
    };

    this.initialize();
  }

  /**
   * Initialize the connection pool
   */
  private async initialize(): Promise<void> {
    logger.info({
      cluster: this.cluster,
      minConnections: this.config.minConnections,
      maxConnections: this.config.maxConnections
    }, 'Initializing Kubernetes connection pool');

    // Create minimum connections
    await this.ensureMinimumConnections();

    // Start reaper to clean idle connections
    this.startReaper();

    this.emit('ready');
  }

  /**
   * Ensure minimum connections are available
   */
  private async ensureMinimumConnections(): Promise<void> {
    const promises: Promise<void>[] = [];

    // Create minimum connections for each API type
    for (let i = 0; i < this.config.minConnections; i++) {
      promises.push(this.createConnection('coreV1'));
      promises.push(this.createConnection('appsV1'));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Create a new connection
   */
  private async createConnection(type: string): Promise<void> {
    if (this.destroyed) {
      throw new Error('Connection pool is destroyed');
    }

    const pool = this.getPool(type);
    if (pool.length >= this.config.maxConnections) {
      return;
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.createRetries; attempt++) {
      try {
        const connection = await this.createApiConnection(type);
        pool.push(connection);
        
        poolConnections.set(
          { cluster: this.cluster, api_type: type },
          pool.length
        );
        
        logger.debug({
          connectionId: connection.id,
          type,
          poolSize: pool.length
        }, 'Created new connection');
        
        return;
        
      } catch (error) {
        lastError = error;
        logger.warn({
          attempt: attempt + 1,
          type,
          error: error.message
        }, 'Failed to create connection');
        
        if (attempt < this.config.createRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('Failed to create connection');
  }

  /**
   * Create API connection based on type
   */
  private async createApiConnection(type: string): Promise<Connection<any>> {
    const connectionId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    let api: any;
    switch (type) {
      case 'coreV1':
        api = this.kubeConfig.makeApiClient(CoreV1Api);
        break;
      case 'appsV1':
        api = this.kubeConfig.makeApiClient(AppsV1Api);
        break;
      case 'batchV1':
        api = this.kubeConfig.makeApiClient(BatchV1Api);
        break;
      case 'networkingV1':
        api = this.kubeConfig.makeApiClient(NetworkingV1Api);
        break;
      default:
        throw new Error(`Unknown API type: ${type}`);
    }

    // Validate connection
    await this.validateConnection(api, type);

    return {
      id: connectionId,
      api,
      created: new Date(),
      lastUsed: new Date(),
      useCount: 0,
      errors: 0,
      inUse: false
    };
  }

  /**
   * Validate connection is working
   */
  private async validateConnection(api: any, type: string): Promise<void> {
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Connection validation timeout')), 5000);
    });

    try {
      switch (type) {
        case 'coreV1':
          await Promise.race([
            (api as CoreV1Api).listNamespace(undefined, undefined, undefined, undefined, 1),
            timeout
          ]);
          break;
        case 'appsV1':
          await Promise.race([
            (api as AppsV1Api).listDeploymentForAllNamespaces(undefined, undefined, undefined, undefined, 1),
            timeout
          ]);
          break;
        default:
          // Basic validation for other types
          break;
      }
    } catch (error) {
      throw new Error(`Connection validation failed: ${error.message}`);
    }
  }

  /**
   * Get pool for API type
   */
  private getPool(type: string): Connection<any>[] {
    switch (type) {
      case 'coreV1':
        return this.coreV1Pool;
      case 'appsV1':
        return this.appsV1Pool;
      case 'batchV1':
        return this.batchV1Pool;
      case 'networkingV1':
        return this.networkingV1Pool;
      default:
        throw new Error(`Unknown API type: ${type}`);
    }
  }

  /**
   * Acquire connection from pool
   */
  async acquire<T>(type: string): Promise<T> {
    if (this.destroyed) {
      throw new Error('Connection pool is destroyed');
    }

    const timer = connectionWaitTime.startTimer({
      cluster: this.cluster,
      api_type: type
    });

    try {
      // Try to get available connection
      const connection = await this.getAvailableConnection(type);
      
      if (connection) {
        timer();
        return connection.api as T;
      }

      // If no connection available, wait in queue
      return await this.waitForConnection(type);
      
    } finally {
      timer();
    }
  }

  /**
   * Get available connection from pool
   */
  private async getAvailableConnection(type: string): Promise<Connection<any> | null> {
    const pool = this.getPool(type);
    
    // Find available connection
    for (const connection of pool) {
      if (!connection.inUse) {
        connection.inUse = true;
        connection.lastUsed = new Date();
        connection.useCount++;
        
        // Validate on borrow if configured
        if (this.config.validateOnBorrow) {
          try {
            await this.validateConnection(connection.api, type);
          } catch (error) {
            // Remove invalid connection
            this.removeConnection(connection, type);
            continue;
          }
        }
        
        this.updateUtilization(type);
        return connection;
      }
    }

    // Try to create new connection if under limit
    if (pool.length < this.config.maxConnections) {
      try {
        await this.createConnection(type);
        return this.getAvailableConnection(type);
      } catch (error) {
        logger.error({
          type,
          error: error.message
        }, 'Failed to create connection on demand');
      }
    }

    return null;
  }

  /**
   * Wait for connection to become available
   */
  private waitForConnection<T>(type: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.waitingQueue.findIndex(w => w.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
        }
        reject(new Error(`Connection acquire timeout after ${this.config.acquireTimeout}ms`));
      }, this.config.acquireTimeout);

      this.waitingQueue.push({
        type,
        resolve: (conn) => {
          clearTimeout(timer);
          resolve(conn);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
        timer
      });
    });
  }

  /**
   * Release connection back to pool
   */
  async release<T>(api: T, type: string): Promise<void> {
    const pool = this.getPool(type);
    const connection = pool.find(c => c.api === api);
    
    if (!connection) {
      logger.warn({ type }, 'Attempted to release unknown connection');
      return;
    }

    // Validate on return if configured
    if (this.config.validateOnReturn) {
      try {
        await this.validateConnection(connection.api, type);
      } catch (error) {
        // Remove invalid connection
        this.removeConnection(connection, type);
        return;
      }
    }

    connection.inUse = false;
    connection.lastUsed = new Date();
    
    this.updateUtilization(type);
    
    // Process waiting queue
    this.processWaitingQueue(type);
  }

  /**
   * Process waiting queue
   */
  private processWaitingQueue(type: string): void {
    const waiting = this.waitingQueue.find(w => w.type === type);
    if (waiting) {
      const connection = this.getAvailableConnection(type);
      if (connection) {
        const index = this.waitingQueue.indexOf(waiting);
        this.waitingQueue.splice(index, 1);
        connection.then(conn => waiting.resolve(conn.api));
      }
    }
  }

  /**
   * Remove connection from pool
   */
  private removeConnection(connection: Connection<any>, type: string): void {
    const pool = this.getPool(type);
    const index = pool.indexOf(connection);
    
    if (index !== -1) {
      pool.splice(index, 1);
      
      poolConnections.set(
        { cluster: this.cluster, api_type: type },
        pool.length
      );
      
      logger.debug({
        connectionId: connection.id,
        type,
        useCount: connection.useCount,
        errors: connection.errors
      }, 'Removed connection from pool');
    }
  }

  /**
   * Update pool utilization metrics
   */
  private updateUtilization(type: string): void {
    const pool = this.getPool(type);
    const inUse = pool.filter(c => c.inUse).length;
    const utilization = pool.length > 0 ? (inUse / pool.length) * 100 : 0;
    
    poolUtilization.set(
      { cluster: this.cluster, api_type: type },
      utilization
    );
  }

  /**
   * Start connection reaper
   */
  private startReaper(): void {
    this.reapTimer = setInterval(() => {
      this.reapIdleConnections();
    }, this.config.reapInterval);
  }

  /**
   * Reap idle connections
   */
  private reapIdleConnections(): void {
    const now = Date.now();
    
    for (const type of ['coreV1', 'appsV1', 'batchV1', 'networkingV1']) {
      const pool = this.getPool(type);
      const minConnections = this.config.minConnections;
      
      // Keep minimum connections
      const toRemove = pool
        .filter(c => !c.inUse && pool.length > minConnections)
        .filter(c => now - c.lastUsed.getTime() > this.config.idleTimeout)
        .slice(0, pool.length - minConnections);
      
      for (const connection of toRemove) {
        this.removeConnection(connection, type);
      }
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const type of ['coreV1', 'appsV1', 'batchV1', 'networkingV1']) {
      const pool = this.getPool(type);
      stats[type] = {
        total: pool.length,
        available: pool.filter(c => !c.inUse).length,
        inUse: pool.filter(c => c.inUse).length,
        waitingQueue: this.waitingQueue.filter(w => w.type === type).length,
        totalUseCount: pool.reduce((sum, c) => sum + c.useCount, 0),
        totalErrors: pool.reduce((sum, c) => sum + c.errors, 0)
      };
    }
    
    return stats;
  }

  /**
   * Destroy connection pool
   */
  async destroy(): Promise<void> {
    this.destroyed = true;
    
    if (this.reapTimer) {
      clearInterval(this.reapTimer);
    }

    // Reject all waiting requests
    for (const waiting of this.waitingQueue) {
      waiting.reject(new Error('Connection pool destroyed'));
    }
    this.waitingQueue = [];

    // Clear all pools
    this.coreV1Pool = [];
    this.appsV1Pool = [];
    this.batchV1Pool = [];
    this.networkingV1Pool = [];

    logger.info({ cluster: this.cluster }, 'Connection pool destroyed');
  }
}