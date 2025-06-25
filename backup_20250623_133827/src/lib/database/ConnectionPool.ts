/**
 * Enterprise Database Connection Pool
 * High-performance connection management with read/write splitting
 */

import { Pool, PoolClient, PoolConfig } from 'pg';
import { logger } from '@/lib/logger';
import { Gauge, Counter, Histogram, register } from 'prom-client';
import { EventEmitter } from 'events';

export interface DatabaseConfig {
  primary: PoolConfig;
  readonly?: PoolConfig[];
  ssl: {
    enabled: boolean;
    rejectUnauthorized: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
  poolSettings: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    acquireTimeoutMillis: number;
  };
  healthCheck: {
    interval: number;
    timeout: number;
    retries: number;
  };
}

export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalQueries: number;
  averageQueryTime: number;
  errorRate: number;
}

// Database metrics
const dbConnections = new Gauge({
  name: 'db_connections_total',
  help: 'Total number of database connections',
  labelNames: ['pool', 'state'],
});

const dbQueries = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['pool', 'operation', 'status'],
});

const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['pool', 'operation'],
  buckets: [0.001, 0.01, 0.1, 1, 5, 10],
});

const dbConnectionErrors = new Counter({
  name: 'db_connection_errors_total',
  help: 'Total number of database connection errors',
  labelNames: ['pool', 'error_type'],
});

register.registerMetric(dbConnections);
register.registerMetric(dbQueries);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbConnectionErrors);

export class DatabaseConnectionPool extends EventEmitter {
  private static instance: DatabaseConnectionPool;
  private primaryPool: Pool;
  private readOnlyPools: Pool[] = [];
  private config: DatabaseConfig;
  private healthCheckInterval?: NodeJS.Timeout;
  private stats = {
    totalQueries: 0,
    totalQueryTime: 0,
    errors: 0,
  };

  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
    this.setupPools();
    this.startHealthChecks();
    this.setupEventHandlers();
  }

  static getInstance(config?: DatabaseConfig): DatabaseConnectionPool {
    if (!DatabaseConnectionPool.instance) {
      if (!config) {
        throw new Error('Database configuration required for first initialization');
      }
      DatabaseConnectionPool.instance = new DatabaseConnectionPool(config);
    }
    return DatabaseConnectionPool.instance;
  }

  /**
   * Execute query with automatic read/write routing
   */
  async query(
    text: string,
    params?: any[],
    options: {
      preferRead?: boolean;
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<any> {
    const isReadOperation = this.isReadOperation(text);
    const useReadReplica = (options.preferRead || isReadOperation) && this.readOnlyPools.length > 0;
    
    const pool = useReadReplica 
      ? this.selectReadOnlyPool()
      : this.primaryPool;
    
    const poolName = useReadReplica ? 'readonly' : 'primary';
    const operation = this.extractOperation(text);
    
    const timer = dbQueryDuration.startTimer({ pool: poolName, operation });
    const startTime = Date.now();
    
    try {
      const client = await this.acquireClient(pool, options.timeout);
      
      try {
        // Set query timeout if specified
        if (options.timeout) {
          await client.query(`SET statement_timeout = ${options.timeout}`);
        }
        
        const result = await client.query(text, params);
        
        // Update stats
        this.stats.totalQueries++;
        this.stats.totalQueryTime += Date.now() - startTime;
        
        dbQueries.inc({ pool: poolName, operation, status: 'success' });
        
        return result;
      } finally {
        client.release();
        timer();
      }
    } catch (error) {
      this.stats.errors++;
      dbQueries.inc({ pool: poolName, operation, status: 'error' });
      
      logger.error({
        error,
        query: text.substring(0, 100),
        poolName,
        operation,
      }, 'Database query failed');
      
      // Retry logic for transient errors
      if (options.retries && options.retries > 0 && this.isRetryableError(error)) {
        logger.info({ retries: options.retries }, 'Retrying database query');
        return this.query(text, params, { ...options, retries: options.retries - 1 });
      }
      
      throw error;
    }
  }

  /**
   * Execute transaction with automatic retry and rollback
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
    options: {
      isolationLevel?: 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';
      timeout?: number;
      retries?: number;
    } = {}
  ): Promise<T> {
    const timer = dbQueryDuration.startTimer({ pool: 'primary', operation: 'transaction' });
    
    const client = await this.acquireClient(this.primaryPool, options.timeout);
    
    try {
      await client.query('BEGIN');
      
      if (options.isolationLevel) {
        await client.query(`SET TRANSACTION ISOLATION LEVEL ${options.isolationLevel}`);
      }
      
      if (options.timeout) {
        await client.query(`SET statement_timeout = ${options.timeout}`);
      }
      
      const result = await callback(client);
      
      await client.query('COMMIT');
      
      dbQueries.inc({ pool: 'primary', operation: 'transaction', status: 'success' });
      
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error({ error: rollbackError }, 'Transaction rollback failed');
      }
      
      dbQueries.inc({ pool: 'primary', operation: 'transaction', status: 'error' });
      
      // Retry for serialization failures
      if (options.retries && options.retries > 0 && this.isSerializationError(error)) {
        logger.info({ retries: options.retries }, 'Retrying transaction due to serialization failure');
        return this.transaction(callback, { ...options, retries: options.retries - 1 });
      }
      
      throw error;
    } finally {
      client.release();
      timer();
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    const primaryStats = {
      totalConnections: this.primaryPool.totalCount,
      activeConnections: this.primaryPool.totalCount - this.primaryPool.idleCount,
      idleConnections: this.primaryPool.idleCount,
      waitingClients: this.primaryPool.waitingCount,
    };
    
    const readOnlyStats = this.readOnlyPools.reduce((acc, pool) => {
      acc.totalConnections += pool.totalCount;
      acc.activeConnections += pool.totalCount - pool.idleCount;
      acc.idleConnections += pool.idleCount;
      acc.waitingClients += pool.waitingCount;
      return acc;
    }, { totalConnections: 0, activeConnections: 0, idleConnections: 0, waitingClients: 0 });
    
    const averageQueryTime = this.stats.totalQueries > 0 
      ? this.stats.totalQueryTime / this.stats.totalQueries
      : 0;
    
    const errorRate = this.stats.totalQueries > 0
      ? this.stats.errors / this.stats.totalQueries
      : 0;
    
    return {
      totalConnections: primaryStats.totalConnections + readOnlyStats.totalConnections,
      activeConnections: primaryStats.activeConnections + readOnlyStats.activeConnections,
      idleConnections: primaryStats.idleConnections + readOnlyStats.idleConnections,
      waitingClients: primaryStats.waitingClients + readOnlyStats.waitingClients,
      totalQueries: this.stats.totalQueries,
      averageQueryTime,
      errorRate,
    };
  }

  /**
   * Health check for all pools
   */
  async healthCheck(): Promise<{
    primary: { healthy: boolean; latency?: number; error?: string };
    readonly: Array<{ healthy: boolean; latency?: number; error?: string }>;
  }> {
    const results = {
      primary: await this.checkPoolHealth(this.primaryPool, 'primary'),
      readonly: await Promise.all(
        this.readOnlyPools.map((pool, index) => 
          this.checkPoolHealth(pool, `readonly-${index}`)
        )
      ),
    };
    
    return results;
  }

  /**
   * Graceful shutdown of all pools
   */
  async shutdown(): Promise<void> {
    logger.info('Starting database connection pool shutdown');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    const shutdownPromises = [
      this.primaryPool.end(),
      ...this.readOnlyPools.map(pool => pool.end()),
    ];
    
    try {
      await Promise.allSettled(shutdownPromises);
      logger.info('Database connection pool shutdown completed');
    } catch (error) {
      logger.error({ error }, 'Error during database pool shutdown');
    }
    
    this.emit('shutdown');
  }

  /**
   * Setup database connection pools
   */
  private setupPools(): void {
    // Primary pool configuration
    const primaryConfig: PoolConfig = {
      ...this.config.primary,
      min: this.config.poolSettings.min,
      max: this.config.poolSettings.max,
      idleTimeoutMillis: this.config.poolSettings.idleTimeoutMillis,
      connectionTimeoutMillis: this.config.poolSettings.connectionTimeoutMillis,
      acquireTimeoutMillis: this.config.poolSettings.acquireTimeoutMillis,
      ssl: this.config.ssl.enabled ? {
        rejectUnauthorized: this.config.ssl.rejectUnauthorized,
        ca: this.config.ssl.ca,
        cert: this.config.ssl.cert,
        key: this.config.ssl.key,
      } : false,
    };
    
    this.primaryPool = new Pool(primaryConfig);
    
    // Read-only pools
    if (this.config.readonly) {
      this.readOnlyPools = this.config.readonly.map((readConfig, index) => {
        const poolConfig: PoolConfig = {
          ...readConfig,
          min: Math.ceil(this.config.poolSettings.min / 2), // Fewer connections for read replicas
          max: Math.ceil(this.config.poolSettings.max / 2),
          idleTimeoutMillis: this.config.poolSettings.idleTimeoutMillis,
          connectionTimeoutMillis: this.config.poolSettings.connectionTimeoutMillis,
          ssl: this.config.ssl.enabled ? {
            rejectUnauthorized: this.config.ssl.rejectUnauthorized,
            ca: this.config.ssl.ca,
            cert: this.config.ssl.cert,
            key: this.config.ssl.key,
          } : false,
        };
        
        return new Pool(poolConfig);
      });
    }
    
    logger.info({
      primaryPool: primaryConfig,
      readOnlyPools: this.readOnlyPools.length,
    }, 'Database connection pools initialized');
  }

  /**
   * Setup event handlers for pools
   */
  private setupEventHandlers(): void {
    this.primaryPool.on('connect', (client) => {
      dbConnections.set({ pool: 'primary', state: 'active' }, this.primaryPool.totalCount - this.primaryPool.idleCount);
      dbConnections.set({ pool: 'primary', state: 'idle' }, this.primaryPool.idleCount);
      logger.debug('New client connected to primary pool');
    });
    
    this.primaryPool.on('remove', (client) => {
      dbConnections.set({ pool: 'primary', state: 'active' }, this.primaryPool.totalCount - this.primaryPool.idleCount);
      dbConnections.set({ pool: 'primary', state: 'idle' }, this.primaryPool.idleCount);
      logger.debug('Client removed from primary pool');
    });
    
    this.primaryPool.on('error', (error, client) => {
      dbConnectionErrors.inc({ pool: 'primary', error_type: 'connection_error' });
      logger.error({ error }, 'Primary pool error');
    });
    
    // Setup handlers for read-only pools
    this.readOnlyPools.forEach((pool, index) => {
      const poolName = `readonly-${index}`;
      
      pool.on('connect', () => {
        dbConnections.set({ pool: poolName, state: 'active' }, pool.totalCount - pool.idleCount);
        dbConnections.set({ pool: poolName, state: 'idle' }, pool.idleCount);
      });
      
      pool.on('remove', () => {
        dbConnections.set({ pool: poolName, state: 'active' }, pool.totalCount - pool.idleCount);
        dbConnections.set({ pool: poolName, state: 'idle' }, pool.idleCount);
      });
      
      pool.on('error', (error) => {
        dbConnectionErrors.inc({ pool: poolName, error_type: 'connection_error' });
        logger.error({ error, poolName }, 'Read-only pool error');
      });
    });
  }

  /**
   * Start health check monitoring
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.healthCheck();
        
        if (!health.primary.healthy) {
          logger.error({ health: health.primary }, 'Primary database unhealthy');
          this.emit('primary_unhealthy', health.primary);
        }
        
        health.readonly.forEach((readHealth, index) => {
          if (!readHealth.healthy) {
            logger.warn({ health: readHealth, index }, 'Read-only database unhealthy');
            this.emit('readonly_unhealthy', { index, health: readHealth });
          }
        });
      } catch (error) {
        logger.error({ error }, 'Health check failed');
      }
    }, this.config.healthCheck.interval);
  }

  /**
   * Check health of individual pool
   */
  private async checkPoolHealth(
    pool: Pool, 
    poolName: string
  ): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        const latency = Date.now() - startTime;
        
        return { healthy: true, latency };
      } finally {
        client.release();
      }
    } catch (error) {
      dbConnectionErrors.inc({ pool: poolName, error_type: 'health_check_failed' });
      
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Acquire client with timeout
   */
  private async acquireClient(pool: Pool, timeout?: number): Promise<PoolClient> {
    if (timeout) {
      return Promise.race([
        pool.connect(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Client acquisition timeout')), timeout);
        }),
      ]);
    }
    
    return pool.connect();
  }

  /**
   * Select read-only pool using round-robin
   */
  private selectReadOnlyPool(): Pool {
    if (this.readOnlyPools.length === 0) {
      return this.primaryPool;
    }
    
    // Simple round-robin selection
    const index = Math.floor(Math.random() * this.readOnlyPools.length);
    return this.readOnlyPools[index];
  }

  /**
   * Determine if query is read-only
   */
  private isReadOperation(query: string): boolean {
    const trimmed = query.trim().toLowerCase();
    return trimmed.startsWith('select') || 
           trimmed.startsWith('with') || 
           trimmed.startsWith('show') || 
           trimmed.startsWith('explain');
  }

  /**
   * Extract operation type from query
   */
  private extractOperation(query: string): string {
    const trimmed = query.trim().toLowerCase();
    const firstWord = trimmed.split(' ')[0];
    
    switch (firstWord) {
      case 'select':
      case 'with':
        return 'select';
      case 'insert':
        return 'insert';
      case 'update':
        return 'update';
      case 'delete':
        return 'delete';
      case 'begin':
      case 'commit':
      case 'rollback':
        return 'transaction';
      default:
        return 'other';
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      '53300', // too_many_connections
      '53400', // configuration_limit_exceeded
      '08000', // connection_exception
      '08003', // connection_does_not_exist
      '08006', // connection_failure
    ];
    
    return retryableCodes.includes(error.code);
  }

  /**
   * Check if error is due to serialization failure
   */
  private isSerializationError(error: any): boolean {
    return error.code === '40001' || // serialization_failure
           error.code === '40P01';   // deadlock_detected
  }
}

/**
 * Get database configuration from environment
 */
export function getDatabaseConfig(): DatabaseConfig {
  return {
    primary: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'manufacturing',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    },
    readonly: process.env.DB_READONLY_HOSTS ? 
      process.env.DB_READONLY_HOSTS.split(',').map(host => ({
        host: host.trim(),
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'manufacturing',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
      })) : undefined,
    ssl: {
      enabled: process.env.DB_SSL === 'true',
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
      ca: process.env.DB_SSL_CA,
      cert: process.env.DB_SSL_CERT,
      key: process.env.DB_SSL_KEY,
    },
    poolSettings: {
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'),
      acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
    },
    healthCheck: {
      interval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000'),
      timeout: parseInt(process.env.DB_HEALTH_CHECK_TIMEOUT || '5000'),
      retries: parseInt(process.env.DB_HEALTH_CHECK_RETRIES || '3'),
    },
  };
}