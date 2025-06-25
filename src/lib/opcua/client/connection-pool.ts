/**
 * OPC UA Connection Pool Manager
 * Manages multiple OPC UA connections with pooling, health checks, and lifecycle management
 */

import { OPCUAClient, ClientSession, MessageSecurityMode, SecurityPolicy } from 'node-opcua';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { 
  OPCUAConnectionConfig, 
  ConnectionPoolEntry, 
  ConnectionError 
} from '../types';
import { CircuitBreaker } from '../utils/circuit-breaker';
import { logger } from '../../logger';

export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  connectionIdleTimeout: number;
  healthCheckInterval: number;
  connectionTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export class ConnectionPool extends EventEmitter {
  private pool: Map<string, ConnectionPoolEntry> = new Map();
  private config: ConnectionPoolConfig;
  private healthCheckTimer?: NodeJS.Timeout;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    super();
    this.config = {
      maxConnections: config.maxConnections || 10,
      minConnections: config.minConnections || 2,
      connectionIdleTimeout: config.connectionIdleTimeout || 300000, // 5 minutes
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
      connectionTimeout: config.connectionTimeout || 10000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000
    };
  }

  async initialize(connectionConfigs: OPCUAConnectionConfig[]): Promise<void> {
    logger.info('Initializing OPC UA connection pool', { 
      configCount: connectionConfigs.length,
      minConnections: this.config.minConnections,
      maxConnections: this.config.maxConnections
    });

    // Create minimum connections
    const connectionsToCreate = Math.min(
      this.config.minConnections, 
      connectionConfigs.length
    );

    const connectionPromises = connectionConfigs
      .slice(0, connectionsToCreate)
      .map(config => this.createConnection(config));

    await Promise.allSettled(connectionPromises);

    // Start health check timer
    this.startHealthCheck();

    logger.info('Connection pool initialized', { 
      activeConnections: this.pool.size 
    });
  }

  async getConnection(endpointUrl: string): Promise<ConnectionPoolEntry> {
    // Try to find existing connection
    let connection = this.findAvailableConnection(endpointUrl);
    
    if (connection) {
      connection.lastUsed = new Date();
      connection.useCount++;
      return connection;
    }

    // Check if we can create a new connection
    if (this.pool.size >= this.config.maxConnections) {
      // Try to close idle connections
      this.closeIdleConnections();
      
      if (this.pool.size >= this.config.maxConnections) {
        throw new ConnectionError('Connection pool exhausted');
      }
    }

    // Create new connection
    const config: OPCUAConnectionConfig = {
      endpointUrl,
      applicationName: 'ManufacturingOPCUAClient',
      connectionTimeout: this.config.connectionTimeout
    };

    return await this.createConnection(config);
  }

  async releaseConnection(connectionId: string): Promise<void> {
    const connection = this.pool.get(connectionId);
    if (connection) {
      connection.lastUsed = new Date();
    }
  }

  private async createConnection(config: OPCUAConnectionConfig): Promise<ConnectionPoolEntry> {
    const connectionId = uuidv4();
    const circuitBreaker = this.getOrCreateCircuitBreaker(config.endpointUrl);

    try {
      const connection = await circuitBreaker.execute(async () => {
        logger.info('Creating OPC UA connection', { 
          endpoint: config.endpointUrl,
          connectionId 
        });

        const client = OPCUAClient.create({
          applicationName: config.applicationName || 'ManufacturingOPCUAClient',
          connectionStrategy: {
            initialDelay: 1000,
            maxRetry: config.maxRetries || this.config.retryAttempts,
            maxDelay: config.maxRetryDelay || 10000
          },
          securityMode: config.securityMode || MessageSecurityMode.None,
          securityPolicy: config.securityPolicy || SecurityPolicy.None,
          endpointMustExist: false,
          keepSessionAlive: config.keepSessionAlive !== false,
          requestedSessionTimeout: config.requestedSessionTimeout || 60000,
          clientName: config.clientName
        });

        // Connect to server
        await client.connect(config.endpointUrl);

        // Create session
        const session = await client.createSession({
          userName: config.userName,
          password: config.password
        });

        const entry: ConnectionPoolEntry = {
          id: connectionId,
          client,
          session,
          endpointUrl: config.endpointUrl,
          isConnected: true,
          lastUsed: new Date(),
          createdAt: new Date(),
          useCount: 1,
          errors: 0
        };

        this.pool.set(connectionId, entry);
        this.emit('connectionCreated', entry);
        
        logger.info('OPC UA connection established', { 
          connectionId,
          endpoint: config.endpointUrl 
        });

        return entry;
      });

      return connection;
    } catch (error) {
      logger.error('Failed to create OPC UA connection', { 
        error,
        endpoint: config.endpointUrl 
      });
      throw new ConnectionError(
        `Failed to connect to ${config.endpointUrl}: ${error.message}`,
        { originalError: error }
      );
    }
  }

  private findAvailableConnection(endpointUrl: string): ConnectionPoolEntry | null {
    for (const [id, connection] of this.pool) {
      if (connection.endpointUrl === endpointUrl && connection.isConnected) {
        return connection;
      }
    }
    return null;
  }

  private async closeConnection(connectionId: string): Promise<void> {
    const connection = this.pool.get(connectionId);
    if (!connection) return;

    try {
      logger.info('Closing OPC UA connection', { connectionId });

      if (connection.session) {
        await connection.session.close();
      }
      if (connection.client) {
        await connection.client.disconnect();
      }

      this.pool.delete(connectionId);
      this.emit('connectionClosed', connectionId);
    } catch (error) {
      logger.error('Error closing connection', { error, connectionId });
    }
  }

  private closeIdleConnections(): void {
    const now = Date.now();
    const idleConnections: string[] = [];

    for (const [id, connection] of this.pool) {
      const idleTime = now - connection.lastUsed.getTime();
      if (idleTime > this.config.connectionIdleTimeout) {
        idleConnections.push(id);
      }
    }

    // Keep minimum connections
    const connectionsToClose = Math.min(
      idleConnections.length,
      this.pool.size - this.config.minConnections
    );

    idleConnections.slice(0, connectionsToClose).forEach(id => {
      this.closeConnection(id).catch(error => {
        logger.error('Error closing idle connection', { error, connectionId: id });
      });
    });
  }

  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck().catch(error => {
        logger.error('Health check failed', { error });
      });
    }, this.config.healthCheckInterval);
  }

  private async performHealthCheck(): Promise<void> {
    const checks = Array.from(this.pool.values()).map(async connection => {
      try {
        // Simple health check - read server status
        await connection.session.readVariableValue('Server_ServerStatus_State');
        connection.isConnected = true;
        connection.errors = 0;
      } catch (error) {
        connection.isConnected = false;
        connection.errors++;
        
        logger.warn('Connection health check failed', {
          connectionId: connection.id,
          endpoint: connection.endpointUrl,
          errors: connection.errors
        });

        // Close connection if too many errors
        if (connection.errors > 3) {
          await this.closeConnection(connection.id);
        }
      }
    });

    await Promise.allSettled(checks);
  }

  private getOrCreateCircuitBreaker(endpointUrl: string): CircuitBreaker {
    let circuitBreaker = this.circuitBreakers.get(endpointUrl);
    
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        monitoringPeriod: 300000, // 5 minutes
        halfOpenMaxAttempts: 3
      });
      this.circuitBreakers.set(endpointUrl, circuitBreaker);
    }

    return circuitBreaker;
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down connection pool');

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    const closePromises = Array.from(this.pool.keys()).map(id => 
      this.closeConnection(id)
    );

    await Promise.allSettled(closePromises);
    
    this.pool.clear();
    this.circuitBreakers.clear();
    
    logger.info('Connection pool shut down');
  }

  getMetrics() {
    const connections = Array.from(this.pool.values());
    
    return {
      totalConnections: connections.length,
      activeConnections: connections.filter(c => c.isConnected).length,
      totalUseCount: connections.reduce((sum, c) => sum + c.useCount, 0),
      totalErrors: connections.reduce((sum, c) => sum + c.errors, 0),
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([url, cb]) => ({
        endpoint: url,
        ...cb.getMetrics()
      }))
    };
  }
}