/**
 * Production-Ready OPC UA Client
 * Main client interface that orchestrates all OPC UA operations
 */

import { EventEmitter } from 'events';
import {
  OPCUAConnectionConfig,
  ManufacturingDataValue,
  EquipmentNode,
  MonitoredItemConfig,
  SubscriptionConfig,
  BatchReadRequest,
  BatchWriteRequest,
  OPCUAEventHandlers,
  SecurityConfig,
  TypeMappingConfig,
  ConnectionError,
  OPCUAError
} from '../types';
import { ConnectionPool } from './connection-pool';
import { SubscriptionManager } from '../subscriptions/subscription-manager';
import { SecurityManager } from '../security/security-manager';
import { TypeMapper } from '../utils/type-mapper';
import { MetricsCollector } from '../monitoring/metrics-collector';
import { logger } from '../../logger';
import { DataValue, AttributeIds, DataType } from 'node-opcua';

export interface OPCUAClientConfig {
  connectionPool?: {
    maxConnections: number;
    minConnections: number;
    connectionIdleTimeout: number;
    healthCheckInterval: number;
  };
  security?: SecurityConfig;
  typeMapping?: TypeMappingConfig;
  metrics?: {
    enabled: boolean;
    prefix?: string;
    defaultLabels?: Record<string, string>;
  };
  defaultTimeout?: number;
}

export class OPCUAClient extends EventEmitter {
  private connectionPool: ConnectionPool;
  private subscriptionManagers: Map<string, SubscriptionManager> = new Map();
  private securityManager?: SecurityManager;
  private typeMapper: TypeMapper;
  private metricsCollector?: MetricsCollector;
  private eventHandlers: OPCUAEventHandlers;
  private equipmentMappings: Map<string, EquipmentNode> = new Map();
  private initialized: boolean = false;

  constructor(
    private config: OPCUAClientConfig = {},
    eventHandlers: OPCUAEventHandlers = {}
  ) {
    super();
    
    this.eventHandlers = eventHandlers;
    this.typeMapper = new TypeMapper(config.typeMapping);
    
    // Initialize connection pool
    this.connectionPool = new ConnectionPool(config.connectionPool);
    
    // Initialize security if configured
    if (config.security) {
      this.securityManager = new SecurityManager(config.security);
    }
    
    // Initialize metrics if enabled
    if (config.metrics?.enabled) {
      this.metricsCollector = new MetricsCollector({
        prefix: config.metrics.prefix,
        defaultLabels: config.metrics.defaultLabels
      });
    }
    
    this.setupEventHandlers();
  }

  /**
   * Initialize the OPC UA client
   */
  async initialize(connections: OPCUAConnectionConfig[]): Promise<void> {
    try {
      logger.info('Initializing OPC UA client', { 
        connectionCount: connections.length 
      });

      // Initialize security manager
      if (this.securityManager) {
        await this.securityManager.initialize();
      }

      // Apply security settings to connections
      const secureConnections = await this.applySecuritySettings(connections);

      // Initialize connection pool
      await this.connectionPool.initialize(secureConnections);

      this.initialized = true;
      this.emit('initialized');
      
      logger.info('OPC UA client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OPC UA client', { error });
      throw new OPCUAError(
        'Client initialization failed: ' + error.message,
        'INIT_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Apply security settings to connections
   */
  private async applySecuritySettings(
    connections: OPCUAConnectionConfig[]
  ): Promise<OPCUAConnectionConfig[]> {
    if (!this.securityManager) {
      return connections;
    }

    const securityOptions = await this.securityManager.getSecurityOptions();
    
    return connections.map(conn => ({
      ...conn,
      certificateFile: securityOptions.certificateData,
      privateKeyFile: securityOptions.privateKeyData,
      certificateManager: securityOptions.certificateManager
    }));
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Connection pool events
    this.connectionPool.on('connectionCreated', (connection) => {
      logger.info('Connection created', { 
        connectionId: connection.id,
        endpoint: connection.endpointUrl 
      });
      
      if (this.metricsCollector) {
        this.metricsCollector.recordConnectionAttempt(
          connection.endpointUrl,
          true
        );
      }
    });

    this.connectionPool.on('connectionClosed', (connectionId) => {
      logger.info('Connection closed', { connectionId });
      
      // Clean up subscription manager
      this.subscriptionManagers.delete(connectionId);
    });

    // Forward errors
    this.connectionPool.on('error', (error) => {
      this.emit('error', error);
      if (this.eventHandlers.onError) {
        this.eventHandlers.onError(error);
      }
    });
  }

  /**
   * Configure equipment node mappings
   */
  configureEquipment(equipment: EquipmentNode[]): void {
    equipment.forEach(eq => {
      this.equipmentMappings.set(eq.equipmentId, eq);
    });
    
    logger.info('Configured equipment mappings', { 
      count: equipment.length 
    });
  }

  /**
   * Create subscription for an endpoint
   */
  async createSubscription(
    endpointUrl: string,
    subscriptionId: string,
    config?: Partial<SubscriptionConfig>
  ): Promise<string> {
    this.ensureInitialized();

    const startTime = Date.now();
    
    try {
      // Get connection from pool
      const connection = await this.connectionPool.getConnection(endpointUrl);
      
      // Get or create subscription manager for this connection
      let subscriptionManager = this.subscriptionManagers.get(connection.id);
      if (!subscriptionManager) {
        subscriptionManager = new SubscriptionManager(
          connection.session,
          this.eventHandlers,
          this.typeMapper
        );
        
        this.setupSubscriptionEventHandlers(subscriptionManager, endpointUrl);
        this.subscriptionManagers.set(connection.id, subscriptionManager);
      }

      // Create subscription
      const id = await subscriptionManager.createSubscription(subscriptionId, config);

      if (this.metricsCollector) {
        this.metricsCollector.updateActiveSubscriptions(
          endpointUrl,
          subscriptionManager.getMetrics().activeSubscriptions
        );
      }

      return id;
    } catch (error) {
      logger.error('Failed to create subscription', { 
        error,
        endpointUrl,
        subscriptionId 
      });
      
      if (this.metricsCollector) {
        this.metricsCollector.recordSubscriptionError(
          endpointUrl,
          error.name || 'UNKNOWN'
        );
      }
      
      throw error;
    } finally {
      if (this.metricsCollector) {
        const duration = (Date.now() - startTime) / 1000;
        this.metricsCollector.recordRequestDuration(
          endpointUrl,
          'createSubscription',
          duration
        );
      }
    }
  }

  /**
   * Monitor equipment nodes
   */
  async monitorEquipment(
    endpointUrl: string,
    equipmentId: string,
    subscriptionId: string,
    parameters?: string[]
  ): Promise<void> {
    const equipment = this.equipmentMappings.get(equipmentId);
    if (!equipment) {
      throw new OPCUAError(
        `Equipment ${equipmentId} not found`,
        'EQUIPMENT_NOT_FOUND'
      );
    }

    // Determine which parameters to monitor
    const nodesToMonitor = parameters || Object.keys(equipment.nodes);
    
    // Create monitored items configuration
    const monitoredItems: MonitoredItemConfig[] = nodesToMonitor
      .filter(param => equipment.nodes[param])
      .map(param => ({
        nodeId: equipment.nodes[param]!,
        samplingInterval: 1000,
        queueSize: 10,
        discardOldest: true
      }));

    // Add monitored items with equipment context
    const connection = await this.connectionPool.getConnection(endpointUrl);
    const subscriptionManager = this.subscriptionManagers.get(connection.id);
    
    if (!subscriptionManager) {
      throw new OPCUAError(
        'Subscription manager not found',
        'SUBSCRIPTION_MANAGER_NOT_FOUND'
      );
    }

    await subscriptionManager.addMonitoredItems(
      subscriptionId,
      monitoredItems,
      {
        equipmentId: equipment.equipmentId,
        equipmentName: equipment.equipmentName
      }
    );

    logger.info('Monitoring equipment', {
      equipmentId,
      parameters: nodesToMonitor,
      itemCount: monitoredItems.length
    });
  }

  /**
   * Read values from OPC UA server
   */
  async readValues(endpointUrl: string, nodeIds: string[]): Promise<ManufacturingDataValue[]> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      const connection = await this.connectionPool.getConnection(endpointUrl);
      
      // Read values
      const results = await connection.session.read(
        nodeIds.map(nodeId => ({
          nodeId,
          attributeId: AttributeIds.Value
        }))
      );

      // Map results
      const values: ManufacturingDataValue[] = results.map((result, index) => 
        this.typeMapper.mapDataValue(nodeIds[index], result)
      );

      if (this.metricsCollector) {
        this.metricsCollector.recordRequest(endpointUrl, 'read', true);
      }

      return values;
    } catch (error) {
      logger.error('Failed to read values', { 
        error,
        endpointUrl,
        nodeCount: nodeIds.length 
      });
      
      if (this.metricsCollector) {
        this.metricsCollector.recordRequestError(
          endpointUrl,
          'read',
          error.name || 'UNKNOWN'
        );
      }
      
      throw error;
    } finally {
      if (this.metricsCollector) {
        const duration = (Date.now() - startTime) / 1000;
        this.metricsCollector.recordRequestDuration(
          endpointUrl,
          'read',
          duration
        );
      }
    }
  }

  /**
   * Write values to OPC UA server
   */
  async writeValues(
    endpointUrl: string,
    writes: BatchWriteRequest[]
  ): Promise<boolean[]> {
    this.ensureInitialized();
    
    const startTime = Date.now();
    
    try {
      const connection = await this.connectionPool.getConnection(endpointUrl);
      
      // Prepare write values
      const nodesToWrite = writes.map(write => ({
        nodeId: write.nodeId,
        attributeId: AttributeIds.Value,
        value: {
          value: {
            dataType: write.dataType || DataType.Double,
            value: write.value
          }
        }
      }));

      // Write values
      const results = await connection.session.write(nodesToWrite);
      
      // Check results
      const success = results.map(result => result.isGood());

      if (this.metricsCollector) {
        this.metricsCollector.recordRequest(endpointUrl, 'write', true);
      }

      return success;
    } catch (error) {
      logger.error('Failed to write values', { 
        error,
        endpointUrl,
        writeCount: writes.length 
      });
      
      if (this.metricsCollector) {
        this.metricsCollector.recordRequestError(
          endpointUrl,
          'write',
          error.name || 'UNKNOWN'
        );
      }
      
      throw error;
    } finally {
      if (this.metricsCollector) {
        const duration = (Date.now() - startTime) / 1000;
        this.metricsCollector.recordRequestDuration(
          endpointUrl,
          'write',
          duration
        );
      }
    }
  }

  /**
   * Browse server nodes
   */
  async browse(endpointUrl: string, nodeId?: string): Promise<any[]> {
    this.ensureInitialized();
    
    try {
      const connection = await this.connectionPool.getConnection(endpointUrl);
      
      const browseResult = await connection.session.browse({
        nodeId: nodeId || 'RootFolder',
        nodeClassMask: 0,
        resultMask: 63
      });

      return browseResult.references || [];
    } catch (error) {
      logger.error('Failed to browse nodes', { 
        error,
        endpointUrl,
        nodeId 
      });
      throw error;
    }
  }

  /**
   * Setup subscription event handlers
   */
  private setupSubscriptionEventHandlers(
    subscriptionManager: SubscriptionManager,
    endpointUrl: string
  ): void {
    subscriptionManager.on('dataChange', (data: ManufacturingDataValue) => {
      if (this.metricsCollector) {
        this.metricsCollector.recordDataValueReceived(
          endpointUrl,
          data.nodeId,
          data.dataType
        );
      }
      
      this.emit('dataChange', data);
    });

    subscriptionManager.on('batchDataChange', (data: ManufacturingDataValue[]) => {
      if (this.metricsCollector) {
        data.forEach(d => {
          this.metricsCollector.recordDataValueProcessed(
            endpointUrl,
            d.quality.isGood
          );
        });
      }
      
      this.emit('batchDataChange', data);
    });
  }

  /**
   * Get client metrics
   */
  async getMetrics() {
    if (!this.metricsCollector) {
      return null;
    }

    const summary = await this.metricsCollector.getSummaryMetrics();
    const poolMetrics = this.connectionPool.getMetrics();
    
    const subscriptionMetrics = Array.from(this.subscriptionManagers.values())
      .map(sm => sm.getMetrics())
      .reduce((acc, metrics) => ({
        activeSubscriptions: acc.activeSubscriptions + metrics.activeSubscriptions,
        totalMonitoredItems: acc.totalMonitoredItems + metrics.totalMonitoredItems,
        bufferSize: acc.bufferSize + metrics.bufferSize
      }), {
        activeSubscriptions: 0,
        totalMonitoredItems: 0,
        bufferSize: 0
      });

    return {
      ...summary,
      pool: poolMetrics,
      subscriptions: subscriptionMetrics
    };
  }

  /**
   * Get Prometheus metrics
   */
  async getPrometheusMetrics(): Promise<string> {
    if (!this.metricsCollector) {
      return '';
    }
    
    return this.metricsCollector.getMetrics();
  }

  /**
   * Ensure client is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new OPCUAError(
        'Client not initialized. Call initialize() first.',
        'NOT_INITIALIZED'
      );
    }
  }

  /**
   * Shutdown the client
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down OPC UA client');

    // Shutdown subscription managers
    const shutdownPromises = Array.from(this.subscriptionManagers.values())
      .map(sm => sm.shutdown());
    
    await Promise.allSettled(shutdownPromises);

    // Shutdown connection pool
    await this.connectionPool.shutdown();

    // Clear references
    this.subscriptionManagers.clear();
    this.equipmentMappings.clear();
    
    this.initialized = false;
    this.emit('shutdown');
    
    logger.info('OPC UA client shut down');
  }
}