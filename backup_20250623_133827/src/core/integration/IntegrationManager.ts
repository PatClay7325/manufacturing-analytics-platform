/**
 * Integration Manager
 * 
 * Central management service for all integration adapters in the platform.
 * Responsible for adapter lifecycle management, configuration, and monitoring.
 */

import { BaseConfig, HealthCheckResult, ServiceStatus } from './architecture/types';
import { BaseService, LoggerService, ConfigService } from './architecture/interfaces';
import { EventBus, EventProducer } from './events/interfaces';
import { IntegrationAdapter } from './interfaces/IntegrationAdapter';
import { 
  ConnectionStatus, 
  IntegrationConfig, 
  IntegrationDataPacket, 
  IntegrationSystemType,
  IntegrationError,
  IntegrationErrorType
} from './types';
import { IntegrationRegistry } from './IntegrationRegistry';
import { DataTransformer } from './interfaces/DataTransformer';
import { DataValidator } from './interfaces/DataValidator';
import { IntegrationPipeline } from './pipeline/IntegrationPipeline';

/**
 * Integration manager configuration
 */
export interface IntegrationManagerConfig extends BaseConfig {
  /**
   * Default timeout for operations (ms)
   */
  defaultTimeout?: number;
  
  /**
   * Enable/disable auto-reconnect for all adapters
   */
  enableAutoReconnect?: boolean;
  
  /**
   * Batch processing configuration
   */
  batchProcessing?: {
    enabled: boolean;
    maxBatchSize: number;
    flushInterval: number;
  };

  /**
   * Health check configuration
   */
  healthCheck?: {
    /**
     * Health check interval (ms)
     */
    interval: number;
    
    /**
     * Health check timeout (ms)
     */
    timeout: number;
    
    /**
     * Health check retry count
     */
    retries: number;
  };

  /**
   * Monitoring configuration
   */
  monitoring?: {
    /**
     * Enable/disable detailed monitoring
     */
    enabled: boolean;
    
    /**
     * Metrics collection interval (ms)
     */
    metricsInterval: number;
    
    /**
     * Enable/disable performance profiling
     */
    enableProfiling: boolean;
  };

  /**
   * Recovery configuration for auto-healing capabilities
   */
  recovery?: {
    /**
     * Maximum recovery attempts
     */
    maxAttempts: number;
    
    /**
     * Enable/disable circuit breaker pattern
     */
    enableCircuitBreaker: boolean;
    
    /**
     * Circuit breaker failure threshold
     */
    circuitBreakerThreshold: number;
    
    /**
     * Circuit breaker reset timeout (ms)
     */
    circuitBreakerResetTimeout: number;
  };
}

/**
 * Integration manager event types
 */
export enum IntegrationManagerEventType {
  ADAPTER_REGISTERED = 'integration.adapter.registered',
  ADAPTER_DEREGISTERED = 'integration.adapter.deregistered',
  ADAPTER_STARTED = 'integration.adapter.started',
  ADAPTER_STOPPED = 'integration.adapter.stopped',
  ADAPTER_CONNECTED = 'integration.adapter.connected',
  ADAPTER_DISCONNECTED = 'integration.adapter.disconnected',
  ADAPTER_ERROR = 'integration.adapter.error',
  ADAPTER_RECONNECTING = 'integration.adapter.reconnecting',
  ADAPTER_RECOVERED = 'integration.adapter.recovered',
  ADAPTER_HEALTH_CHANGED = 'integration.adapter.health_changed',
  DATA_RECEIVED = 'integration.data.received',
  DATA_SENT = 'integration.data.sent',
  DATA_PROCESSED = 'integration.data.processed',
  DATA_ERROR = 'integration.data.error',
  PIPELINE_CREATED = 'integration.pipeline.created',
  PIPELINE_STARTED = 'integration.pipeline.started',
  PIPELINE_STOPPED = 'integration.pipeline.stopped',
  PIPELINE_ERROR = 'integration.pipeline.error'
}

/**
 * Health status for an integration adapter
 */
export interface AdapterHealthStatus {
  /**
   * Adapter ID
   */
  id: string;
  
  /**
   * Adapter name
   */
  name: string;
  
  /**
   * Current connection status
   */
  connectionStatus: ConnectionStatus;
  
  /**
   * Service status
   */
  serviceStatus: ServiceStatus;
  
  /**
   * Connection latency in ms
   */
  latency?: number;
  
  /**
   * Last error if any
   */
  lastError?: IntegrationError;
  
  /**
   * Success rate (0-100%)
   */
  successRate?: number;
  
  /**
   * Timestamp of last successful operation
   */
  lastSuccessTimestamp?: Date;
  
  /**
   * Number of consecutive failures
   */
  consecutiveFailures: number;
  
  /**
   * Whether circuit breaker is tripped
   */
  circuitBreakerTripped: boolean;
  
  /**
   * Additional metrics
   */
  metrics?: Record<string, unknown>;
}

/**
 * Integration manager responsible for handling all external system connections
 */
export class IntegrationManager implements BaseService {
  /**
   * Unique identifier for the service
   */
  readonly id: string = 'integration-manager';
  
  /**
   * Human-readable name of the service
   */
  readonly name: string = 'Integration Manager';
  
  /**
   * Service version
   */
  readonly version: string = '1.0.0';
  
  /**
   * Current status of the service
   */
  status: ServiceStatus = ServiceStatus.INITIALIZING;
  
  /**
   * Integration registry for adapter management
   */
  private registry: IntegrationRegistry;
  
  /**
   * Map of health statuses for all adapters
   */
  private adapterHealthStatus: Map<string, AdapterHealthStatus> = new Map();
  
  /**
   * Map of health check intervals
   */
  private healthCheckIntervals: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Map of adapter event listeners
   */
  private adapterEventListeners: Map<string, Set<string>> = new Map();
  
  /**
   * Map of recovery attempts for adapters
   */
  private recoveryAttempts: Map<string, number> = new Map();
  
  /**
   * Map of active pipelines
   */
  private pipelines: Map<string, IntegrationPipeline> = new Map();
  
  /**
   * Integration manager configuration
   */
  private config: IntegrationManagerConfig;
  
  /**
   * Tenant context
   */
  private tenantContext?: TenantContext;
  
  /**
   * Constructor
   * @param logger Logger service
   * @param configService Configuration service
   * @param eventBus Event bus
   * @param eventProducer Event producer
   * @param tenantContext Optional tenant context
   */
  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly eventBus: EventBus,
    private readonly eventProducer: EventProducer,
    tenantContext?: TenantContext
  ) {
    // Create the integration registry
    this.registry = new IntegrationRegistry(logger);
    
    // Set tenant context if provided
    if (tenantContext) {
      this.tenantContext = tenantContext;
    }
  }
  
  /**
   * Set the tenant context
   * @param tenantContext Tenant context
   */
  public setTenantContext(tenantContext: TenantContext): void {
    this.tenantContext = tenantContext;
  }
  
  /**
   * Initialize the service
   * @param config Service configuration
   */
  async initialize(config: IntegrationManagerConfig): Promise<void> {
    try {
      this.logger.info('Initializing Integration Manager');
      
      this.config = config;
      
      // Initialize the registry
      await this.registry.initialize();
      
      // Subscribe to relevant events
      this.subscribeToEvents();
      
      // Load global integrations first
      const globalIntegrationConfigs = this.configService.get<IntegrationConfig[]>('integrations', [])
        .filter(config => !config.tenantId);
      
      // Initialize each pre-configured global integration
      for (const integrationConfig of globalIntegrationConfigs) {
        try {
          this.logger.debug(`Pre-initializing global integration: ${integrationConfig.name}`, {
            integrationId: integrationConfig.id
          });
          
          // This won't actually connect yet, just registers the adapter
          await this.registerIntegrationConfig(integrationConfig);
        } catch (error) {
          this.logger.error(`Failed to pre-initialize global integration: ${integrationConfig.name}`, error, {
            integrationId: integrationConfig.id
          });
        }
      }
      
      // If we have a tenant context, also load tenant-specific integrations
      const currentTenantId = this.tenantContext?.getCurrentTenantId();
      if (currentTenantId) {
        const tenantIntegrationConfigs = this.configService.get<IntegrationConfig[]>('integrations', [])
          .filter(config => config.tenantId === currentTenantId);
        
        // Initialize each pre-configured tenant-specific integration
        for (const integrationConfig of tenantIntegrationConfigs) {
          try {
            this.logger.debug(`Pre-initializing tenant-specific integration: ${integrationConfig.name}`, {
              integrationId: integrationConfig.id,
              tenantId: currentTenantId
            });
            
            // This won't actually connect yet, just registers the adapter
            await this.registerIntegrationConfig(integrationConfig);
          } catch (error) {
            this.logger.error(`Failed to pre-initialize tenant-specific integration: ${integrationConfig.name}`, error, {
              integrationId: integrationConfig.id,
              tenantId: currentTenantId
            });
          }
        }
      }
      
      this.status = ServiceStatus.READY;
      this.logger.info('Integration Manager initialized successfully');
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      this.logger.error('Failed to initialize Integration Manager', error);
      throw error;
    }
  }
  
  /**
   * Start the service
   */
  async start(): Promise<void> {
    try {
      if (this.status === ServiceStatus.RUNNING) {
        this.logger.warn('Integration Manager is already running');
        return;
      }
      
      this.logger.info('Starting Integration Manager');
      this.status = ServiceStatus.STARTING;
      
      // Start each registered adapter
      const startPromises = this.registry.getAllAdapters().map(async adapter => {
        try {
          this.logger.debug(`Starting integration: ${adapter.name}`, {
            integrationId: adapter.id
          });
          
          await adapter.start();
          
          // Connect if auto-connect is enabled
          if (adapter.config.connectionParams.autoConnect !== false) {
            await this.connectAdapter(adapter);
          }
          
          // Set up health checks for this adapter
          this.setupAdapterHealthCheck(adapter);
          
          // Set up event listeners for this adapter
          this.setupAdapterEventListeners(adapter);
          
          this.logger.debug(`Integration started: ${adapter.name}`, {
            integrationId: adapter.id
          });
          
          // Publish adapter started event
          await this.publishAdapterEvent(
            IntegrationManagerEventType.ADAPTER_STARTED,
            adapter
          );
        } catch (error) {
          this.logger.error(`Failed to start integration: ${adapter.name}`, error, {
            integrationId: adapter.id
          });
          
          // Update health status
          this.updateAdapterHealthStatus(adapter.id, {
            serviceStatus: ServiceStatus.ERROR,
            lastError: this.createIntegrationError(
              IntegrationErrorType.UNKNOWN,
              `Failed to start adapter: ${error.message}`,
              error,
              adapter.id
            ),
            consecutiveFailures: (this.adapterHealthStatus.get(adapter.id)?.consecutiveFailures || 0) + 1
          });
          
          // If auto-reconnect is enabled, schedule reconnect
          if (this.config.enableAutoReconnect !== false) {
            this.scheduleReconnect(adapter);
          }
        }
      });
      
      await Promise.allSettled(startPromises);
      
      // Start all auto-start pipelines
      const pipelineStartPromises = Array.from(this.pipelines.values())
        .filter(pipeline => pipeline.config.autoStart === true)
        .map(pipeline => pipeline.start());
      
      await Promise.allSettled(pipelineStartPromises);
      
      this.status = ServiceStatus.RUNNING;
      this.logger.info('Integration Manager started successfully');
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      this.logger.error('Failed to start Integration Manager', error);
      throw error;
    }
  }
  
  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    try {
      if (this.status === ServiceStatus.OFFLINE || this.status === ServiceStatus.STOPPING) {
        this.logger.warn('Integration Manager is already stopped or stopping');
        return;
      }
      
      this.logger.info('Stopping Integration Manager');
      this.status = ServiceStatus.STOPPING;
      
      // Stop all pipelines first
      const pipelineStopPromises = Array.from(this.pipelines.values()).map(async pipeline => {
        try {
          await pipeline.stop();
        } catch (error) {
          this.logger.error(`Failed to stop pipeline: ${pipeline.id}`, error);
        }
      });
      
      await Promise.allSettled(pipelineStopPromises);
      
      // Clear all health check intervals
      this.clearAllHealthChecks();
      
      // Stop each registered adapter
      const stopPromises = this.registry.getAllAdapters().map(async adapter => {
        try {
          // Remove event listeners
          this.removeAdapterEventListeners(adapter.id);
          
          this.logger.debug(`Stopping integration: ${adapter.name}`, {
            integrationId: adapter.id
          });
          
          // Disconnect if connected
          if (adapter.connectionStatus === ConnectionStatus.CONNECTED) {
            try {
              await adapter.disconnect();
            } catch (disconnectError) {
              this.logger.error(`Failed to disconnect integration: ${adapter.name}`, disconnectError, {
                integrationId: adapter.id
              });
            }
          }
          
          await adapter.stop();
          
          this.logger.debug(`Integration stopped: ${adapter.name}`, {
            integrationId: adapter.id
          });
          
          // Publish adapter stopped event
          await this.publishAdapterEvent(
            IntegrationManagerEventType.ADAPTER_STOPPED,
            adapter
          );
        } catch (error) {
          this.logger.error(`Failed to stop integration: ${adapter.name}`, error, {
            integrationId: adapter.id
          });
        }
      });
      
      await Promise.allSettled(stopPromises);
      
      this.status = ServiceStatus.OFFLINE;
      this.logger.info('Integration Manager stopped successfully');
    } catch (error) {
      this.logger.error('Failed to stop Integration Manager', error);
      throw error;
    }
  }
  
  /**
   * Get the health status of the service
   */
  async getHealth(): Promise<HealthCheckResult> {
    // Get health of all adapters
    const adapterHealthPromises = this.registry.getAllAdapters().map(async adapter => {
      try {
        const health = await adapter.getHealth();
        const adapterHealth = this.adapterHealthStatus.get(adapter.id);
        
        return {
          name: adapter.name,
          status: health.status,
          responseTime: adapterHealth.latency || 0,
          details: {
            connectionStatus: adapter.connectionStatus,
            circuitBreakerTripped: adapterHealth.circuitBreakerTripped || false,
            consecutiveFailures: adapterHealth.consecutiveFailures || 0,
            successRate: adapterHealth.successRate || 100
          }
        };
      } catch (error) {
        this.logger.error(`Failed to get health for integration: ${adapter.name}`, error, {
          integrationId: adapter.id
        });
        
        return {
          name: adapter.name,
          status: ServiceStatus.ERROR,
          responseTime: 0,
          details: {
            connectionStatus: adapter.connectionStatus,
            error: error.message
          }
        };
      }
    });
    
    const adapterHealthResults = await Promise.all(adapterHealthPromises);
    
    // Get health of all pipelines
    const pipelineHealthResults = Array.from(this.pipelines.values()).map(pipeline => {
      return {
        name: `Pipeline: ${pipeline.name}`,
        status: pipeline.status,
        details: {
          adapterCount: pipeline.getAdapterCount(),
          transformerCount: pipeline.getTransformerCount(),
          validatorCount: pipeline.getValidatorCount(),
          processedCount: pipeline.getProcessedCount(),
          errorCount: pipeline.getErrorCount()
        }
      };
    });
    
    // Determine overall status
    let overallStatus = ServiceStatus.READY;
    
    if (adapterHealthResults.some(h => h.status === ServiceStatus.ERROR)) {
      overallStatus = ServiceStatus.DEGRADED;
    }
    
    if (adapterHealthResults.length > 0 && adapterHealthResults.every(h => h.status === ServiceStatus.ERROR)) {
      overallStatus = ServiceStatus.ERROR;
    }
    
    return {
      service: this.name,
      status: overallStatus,
      version: this.version,
      timestamp: new Date(),
      details: {
        adapterCount: this.registry.getAdapterCount(),
        pipelineCount: this.pipelines.size,
        connectedAdapterCount: this.registry.getConnectedAdapters().length,
        circuitBreakerTrippedCount: Array.from(this.adapterHealthStatus.values())
          .filter(h => h.circuitBreakerTripped).length
      },
      dependencies: [...adapterHealthResults, ...pipelineHealthResults]
    };
  }
  
  /**
   * Handle graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Integration Manager');
    
    // Unsubscribe from all events
    this.unsubscribeFromEvents();
    
    // Stop service
    await this.stop();
    
    // Clean up resources
    this.pipelines.clear();
    this.adapterHealthStatus.clear();
    this.recoveryAttempts.clear();
    
    this.logger.info('Integration Manager shutdown complete');
  }
  
  /**
   * Register an integration adapter
   * @param adapter Integration adapter to register
   */
  async registerAdapter(adapter: IntegrationAdapter): Promise<void> {
    await this.registry.registerAdapter(adapter);
    
    // Initialize the adapter
    await adapter.initialize({
      ...this.config,
      // Allow override of log level for specific adapters
      logLevel: adapter.config.connectionParams.logLevel as any || this.config.logLevel
    });
    
    // Initialize health status for this adapter
    this.adapterHealthStatus.set(adapter.id, {
      id: adapter.id,
      name: adapter.name,
      connectionStatus: adapter.connectionStatus,
      serviceStatus: adapter.status,
      consecutiveFailures: 0,
      circuitBreakerTripped: false
    });
    
    // Reset recovery attempts
    this.recoveryAttempts.set(adapter.id, 0);
    
    // Publish event for adapter registration
    await this.publishAdapterEvent(
      IntegrationManagerEventType.ADAPTER_REGISTERED,
      adapter
    );
  }
  
  /**
   * Register an integration from configuration
   * @param config Integration configuration
   * @returns The registered adapter
   */
  async registerIntegrationConfig(config: IntegrationConfig): Promise<IntegrationAdapter> {
    // Create and register the adapter using the provided factory
    const adapterFactory = this.getAdapterFactory(config.type);
    const adapter = await adapterFactory(config);
    
    await this.registerAdapter(adapter);
    
    return adapter;
  }
  
  /**
   * Deregister an integration adapter
   * @param integrationId Integration ID to deregister
   */
  async deregisterAdapter(integrationId: string): Promise<void> {
    const adapter = this.registry.getAdapter(integrationId);
    
    if (!adapter) {
      throw new Error(`Integration adapter with ID ${integrationId} is not registered`);
    }
    
    // Stop the adapter if it's running
    if (adapter.status !== ServiceStatus.OFFLINE) {
      await adapter.stop();
    }
    
    // Clean up health check interval
    this.clearAdapterHealthCheck(integrationId);
    
    // Clean up event listeners
    this.removeAdapterEventListeners(integrationId);
    
    // Clean up health status
    this.adapterHealthStatus.delete(integrationId);
    
    // Clean up recovery attempts
    this.recoveryAttempts.delete(integrationId);
    
    // Publish event for adapter deregistration
    await this.publishAdapterEvent(
      IntegrationManagerEventType.ADAPTER_DEREGISTERED,
      adapter
    );
    
    // Finally, deregister from registry
    await this.registry.deregisterAdapter(integrationId);
  }
  
  /**
   * Get an integration adapter by ID
   * @param integrationId Integration ID
   * @returns The integration adapter or null if not found
   */
  getAdapter(integrationId: string): IntegrationAdapter | null {
    return this.registry.getAdapter(integrationId);
  }
  
  /**
   * Get all registered integration adapters
   * @returns Array of registered adapters
   */
  getAllAdapters(): IntegrationAdapter[] {
    return this.registry.getAllAdapters();
  }
  
  /**
   * Get all adapters of a specific type
   * @param type Integration system type
   * @returns Array of adapters of the specified type
   */
  getAdaptersByType(type: IntegrationSystemType): IntegrationAdapter[] {
    return this.registry.getAdaptersByType(type);
  }
  
  /**
   * Get all connected adapters
   * @returns Array of connected adapters
   */
  getConnectedAdapters(): IntegrationAdapter[] {
    return this.registry.getConnectedAdapters();
  }
  
  /**
   * Send data to a specific integration
   * @param integrationId Integration ID
   * @param data Data to send
   * @param options Optional sending options
   */
  async sendData<T>(
    integrationId: string,
    data: IntegrationDataPacket<T>,
    options?: Record<string, unknown>
  ): Promise<void> {
    const adapter = this.registry.getAdapter(integrationId);
    
    if (!adapter) {
      throw new Error(`Integration adapter with ID ${integrationId} is not registered`);
    }
    
    if (adapter.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new Error(`Integration adapter ${adapter.name} is not connected`);
    }
    
    try {
      await adapter.sendData(data, options);
      
      // Update health status - reset consecutive failures and update success rate
      this.updateAdapterHealthStatus(adapter.id, {
        consecutiveFailures: 0,
        successRate: this.calculateNewSuccessRate(adapter.id, true)
      });
      
      // Publish event for data sent
      await this.eventProducer.createAndPublishEvent(
        IntegrationManagerEventType.DATA_SENT,
        {
          integrationId: adapter.id,
          dataId: data.id,
          timestamp: new Date()
        }
      );
    } catch (error) {
      // Update health status
      this.updateAdapterHealthStatus(adapter.id, {
        lastError: this.createIntegrationError(
          IntegrationErrorType.COMMUNICATION,
          `Failed to send data: ${error.message}`,
          error,
          adapter.id
        ),
        consecutiveFailures: (this.adapterHealthStatus.get(adapter.id)?.consecutiveFailures || 0) + 1,
        successRate: this.calculateNewSuccessRate(adapter.id, false)
      });
      
      // Check if circuit breaker should be tripped
      this.checkCircuitBreaker(adapter.id);
      
      // Re-throw the error
      throw error;
    }
  }
  
  /**
   * Receive data from a specific integration
   * @param integrationId Integration ID
   * @param callback Function to call when data is received
   * @param options Optional receiving options
   * @returns Subscription ID
   */
  async receiveData<T>(
    integrationId: string,
    callback: (data: IntegrationDataPacket<T>) => void | Promise<void>,
    options?: Record<string, unknown>
  ): Promise<string> {
    const adapter = this.registry.getAdapter(integrationId);
    
    if (!adapter) {
      throw new Error(`Integration adapter with ID ${integrationId} is not registered`);
    }
    
    // Wrap the callback to publish events and handle errors
    const wrappedCallback = async (data: IntegrationDataPacket<T>) => {
      try {
        // Call the original callback
        await Promise.resolve(callback(data));
        
        // Update health status
        this.updateAdapterHealthStatus(adapter.id, {
          lastSuccessTimestamp: new Date(),
          consecutiveFailures: 0,
          successRate: this.calculateNewSuccessRate(adapter.id, true)
        });
        
        // Publish event for data received
        await this.eventProducer.createAndPublishEvent(
          IntegrationManagerEventType.DATA_RECEIVED,
          {
            integrationId: adapter.id,
            dataId: data.id,
            timestamp: new Date()
          }
        );
      } catch (error) {
        this.logger.error(`Error processing received data for ${adapter.name}`, error, {
          integrationId: adapter.id,
          dataId: data.id
        });
        
        // Update health status
        this.updateAdapterHealthStatus(adapter.id, {
          lastError: this.createIntegrationError(
            IntegrationErrorType.UNKNOWN,
            `Failed to process received data: ${error.message}`,
            error,
            adapter.id
          ),
          consecutiveFailures: (this.adapterHealthStatus.get(adapter.id)?.consecutiveFailures || 0) + 1,
          successRate: this.calculateNewSuccessRate(adapter.id, false)
        });
        
        // Publish event for data error
        await this.eventProducer.createAndPublishEvent(
          IntegrationManagerEventType.DATA_ERROR,
          {
            integrationId: adapter.id,
            dataId: data.id,
            error: error.message,
            timestamp: new Date()
          }
        );
      }
    };
    
    return adapter.receiveData(wrappedCallback, options);
  }
  
  /**
   * Connect to a specific integration
   * @param integrationId Integration ID
   */
  async connect(integrationId: string): Promise<void> {
    const adapter = this.registry.getAdapter(integrationId);
    
    if (!adapter) {
      throw new Error(`Integration adapter with ID ${integrationId} is not registered`);
    }
    
    await this.connectAdapter(adapter);
  }
  
  /**
   * Connect to a specific adapter
   * @param adapter The adapter to connect
   */
  private async connectAdapter(adapter: IntegrationAdapter): Promise<void> {
    try {
      // Check if circuit breaker is tripped
      const health = this.adapterHealthStatus.get(adapter.id);
      if (health?.circuitBreakerTripped) {
        throw new Error(`Circuit breaker is tripped for adapter ${adapter.name}`);
      }
      
      await adapter.connect();
      
      // Update health status
      this.updateAdapterHealthStatus(adapter.id, {
        connectionStatus: ConnectionStatus.CONNECTED,
        consecutiveFailures: 0,
        circuitBreakerTripped: false
      });
      
      // Reset recovery attempts
      this.recoveryAttempts.set(adapter.id, 0);
      
      // Publish adapter connected event
      await this.publishAdapterEvent(
        IntegrationManagerEventType.ADAPTER_CONNECTED,
        adapter
      );
    } catch (error) {
      // Update health status
      this.updateAdapterHealthStatus(adapter.id, {
        connectionStatus: ConnectionStatus.ERROR,
        lastError: this.createIntegrationError(
          IntegrationErrorType.CONNECTION,
          `Failed to connect: ${error.message}`,
          error,
          adapter.id
        ),
        consecutiveFailures: (this.adapterHealthStatus.get(adapter.id)?.consecutiveFailures || 0) + 1
      });
      
      // Check if circuit breaker should be tripped
      this.checkCircuitBreaker(adapter.id);
      
      // Publish adapter error event
      await this.publishAdapterEvent(
        IntegrationManagerEventType.ADAPTER_ERROR,
        adapter,
        {
          error: error.message,
          errorType: IntegrationErrorType.CONNECTION
        }
      );
      
      // Re-throw the error
      throw error;
    }
  }
  
  /**
   * Disconnect from a specific integration
   * @param integrationId Integration ID
   */
  async disconnect(integrationId: string): Promise<void> {
    const adapter = this.registry.getAdapter(integrationId);
    
    if (!adapter) {
      throw new Error(`Integration adapter with ID ${integrationId} is not registered`);
    }
    
    try {
      await adapter.disconnect();
      
      // Update health status
      this.updateAdapterHealthStatus(adapter.id, {
        connectionStatus: ConnectionStatus.DISCONNECTED
      });
      
      // Publish adapter disconnected event
      await this.publishAdapterEvent(
        IntegrationManagerEventType.ADAPTER_DISCONNECTED,
        adapter
      );
    } catch (error) {
      // Update health status
      this.updateAdapterHealthStatus(adapter.id, {
        lastError: this.createIntegrationError(
          IntegrationErrorType.CONNECTION,
          `Failed to disconnect: ${error.message}`,
          error,
          adapter.id
        )
      });
      
      // Publish adapter error event
      await this.publishAdapterEvent(
        IntegrationManagerEventType.ADAPTER_ERROR,
        adapter,
        {
          error: error.message,
          errorType: IntegrationErrorType.CONNECTION
        }
      );
      
      // Re-throw the error
      throw error;
    }
  }
  
  /**
   * Reconnect to a specific integration
   * @param integrationId Integration ID
   */
  async reconnect(integrationId: string): Promise<void> {
    const adapter = this.registry.getAdapter(integrationId);
    
    if (!adapter) {
      throw new Error(`Integration adapter with ID ${integrationId} is not registered`);
    }
    
    try {
      // Update health status
      this.updateAdapterHealthStatus(adapter.id, {
        connectionStatus: ConnectionStatus.RECONNECTING
      });
      
      // Publish adapter reconnecting event
      await this.publishAdapterEvent(
        IntegrationManagerEventType.ADAPTER_RECONNECTING,
        adapter
      );
      
      await adapter.reconnect();
      
      // Update health status
      this.updateAdapterHealthStatus(adapter.id, {
        connectionStatus: ConnectionStatus.CONNECTED,
        consecutiveFailures: 0
      });
      
      // Reset recovery attempts
      this.recoveryAttempts.set(adapter.id, 0);
      
      // Publish adapter recovered event
      await this.publishAdapterEvent(
        IntegrationManagerEventType.ADAPTER_RECOVERED,
        adapter
      );
    } catch (error) {
      // Update health status
      this.updateAdapterHealthStatus(adapter.id, {
        connectionStatus: ConnectionStatus.ERROR,
        lastError: this.createIntegrationError(
          IntegrationErrorType.CONNECTION,
          `Failed to reconnect: ${error.message}`,
          error,
          adapter.id
        ),
        consecutiveFailures: (this.adapterHealthStatus.get(adapter.id)?.consecutiveFailures || 0) + 1
      });
      
      // Increment recovery attempts
      const attempts = (this.recoveryAttempts.get(adapter.id) || 0) + 1;
      this.recoveryAttempts.set(adapter.id, attempts);
      
      // Check if circuit breaker should be tripped
      this.checkCircuitBreaker(adapter.id);
      
      // Publish adapter error event
      await this.publishAdapterEvent(
        IntegrationManagerEventType.ADAPTER_ERROR,
        adapter,
        {
          error: error.message,
          errorType: IntegrationErrorType.CONNECTION,
          recoveryAttempts: attempts
        }
      );
      
      // If we haven't reached max attempts, schedule another reconnect
      const maxAttempts = this.config.recovery?.maxAttempts || 5;
      if (attempts < maxAttempts && this.config.enableAutoReconnect !== false) {
        this.scheduleReconnect(adapter);
      } else {
        this.logger.error(
          `Maximum reconnection attempts (${maxAttempts}) reached for ${adapter.name}`,
          null,
          { integrationId: adapter.id }
        );
      }
      
      // Re-throw the error
      throw error;
    }
  }
  
  /**
   * Create a new integration pipeline
   * @param id Pipeline ID
   * @param name Pipeline name
   * @param config Pipeline configuration
   * @returns The created pipeline
   */
  createPipeline(
    id: string,
    name: string,
    config: Record<string, unknown>
  ): IntegrationPipeline {
    if (this.pipelines.has(id)) {
      throw new Error(`Pipeline with ID ${id} already exists`);
    }
    
    const pipeline = new IntegrationPipeline(
      id,
      name,
      this.logger,
      this.eventProducer,
      config
    );
    
    this.pipelines.set(id, pipeline);
    
    // Publish pipeline created event
    this.eventProducer.createAndPublishEvent(
      IntegrationManagerEventType.PIPELINE_CREATED,
      {
        pipelineId: id,
        pipelineName: name,
        timestamp: new Date()
      }
    );
    
    return pipeline;
  }
  
  /**
   * Get a pipeline by ID
   * @param pipelineId Pipeline ID
   * @returns The pipeline or null if not found
   */
  getPipeline(pipelineId: string): IntegrationPipeline | null {
    return this.pipelines.get(pipelineId) || null;
  }
  
  /**
   * Delete a pipeline
   * @param pipelineId Pipeline ID
   */
  async deletePipeline(pipelineId: string): Promise<void> {
    const pipeline = this.pipelines.get(pipelineId);
    
    if (!pipeline) {
      throw new Error(`Pipeline with ID ${pipelineId} does not exist`);
    }
    
    // Stop the pipeline if it's running
    if (pipeline.status === ServiceStatus.RUNNING) {
      await pipeline.stop();
    }
    
    // Remove the pipeline
    this.pipelines.delete(pipelineId);
  }
  
  /**
   * Get all pipelines
   * @returns Array of all pipelines
   */
  getAllPipelines(): IntegrationPipeline[] {
    return Array.from(this.pipelines.values());
  }
  
  /**
   * Get health status for a specific adapter
   * @param integrationId Integration ID
   * @returns The health status or null if not found
   */
  getAdapterHealthStatus(integrationId: string): AdapterHealthStatus | null {
    return this.adapterHealthStatus.get(integrationId) || null;
  }
  
  /**
   * Reset circuit breaker for an adapter
   * @param integrationId Integration ID
   */
  resetCircuitBreaker(integrationId: string): void {
    const health = this.adapterHealthStatus.get(integrationId);
    
    if (health) {
      this.updateAdapterHealthStatus(integrationId, {
        circuitBreakerTripped: false,
        consecutiveFailures: 0
      });
      
      this.logger.info(`Circuit breaker reset for adapter ${health.name}`, {
        integrationId
      });
    }
  }
  
  /**
   * Subscribe to relevant events
   */
  private subscribeToEvents(): void {
    // Subscribe to system-wide events that might affect integrations
    this.eventBus.subscribe('system.shutdown', async () => {
      await this.shutdown();
    });
    
    this.eventBus.subscribe('system.config.updated', async (data: any) => {
      if (data.section === 'integrations') {
        this.logger.info('Integration configuration updated, applying changes');
        await this.applyConfigurationChanges(data.config);
      }
    });
  }
  
  /**
   * Unsubscribe from all events
   */
  private unsubscribeFromEvents(): void {
    this.eventBus.unsubscribe('system.shutdown');
    this.eventBus.unsubscribe('system.config.updated');
    
    // Clear all adapter event listeners
    for (const adapterId of this.adapterEventListeners.keys()) {
      this.removeAdapterEventListeners(adapterId);
    }
  }
  
  /**
   * Apply configuration changes
   * @param config Updated configuration
   */
  private async applyConfigurationChanges(config: any): Promise<void> {
    // Update our local config
    this.config = {
      ...this.config,
      ...config
    };
    
    // Apply relevant changes to adapters and pipelines
    // This might involve restarting some adapters or reconfiguring them
    // The exact implementation depends on what can be updated dynamically
  }
  
  /**
   * Setup health check for an adapter
   * @param adapter The adapter to monitor
   */
  private setupAdapterHealthCheck(adapter: IntegrationAdapter): void {
    // Clear any existing health check
    this.clearAdapterHealthCheck(adapter.id);
    
    const interval = adapter.config.healthCheck?.interval || 
                     this.config.healthCheck?.interval || 
                     60000; // Default to 1 minute
    
    this.logger.debug(`Setting up health check for ${adapter.name} with interval ${interval}ms`, {
      integrationId: adapter.id
    });
    
    const checkInterval = setInterval(async () => {
      try {
        // Check connection if connected
        if (adapter.connectionStatus === ConnectionStatus.CONNECTED) {
          const isConnected = await adapter.testConnection();
          
          if (!isConnected) {
            this.logger.warn(`Health check failed for ${adapter.name}: connection test failed`, {
              integrationId: adapter.id
            });
            
            // Update health status
            this.updateAdapterHealthStatus(adapter.id, {
              connectionStatus: ConnectionStatus.ERROR,
              lastError: this.createIntegrationError(
                IntegrationErrorType.CONNECTION,
                'Connection test failed during health check',
                null,
                adapter.id
              ),
              consecutiveFailures: (this.adapterHealthStatus.get(adapter.id)?.consecutiveFailures || 0) + 1
            });
            
            // Check if circuit breaker should be tripped
            this.checkCircuitBreaker(adapter.id);
            
            // Attempt reconnect if auto-reconnect is enabled
            if (this.config.enableAutoReconnect !== false) {
              this.scheduleReconnect(adapter);
            }
            
            return;
          }
          
          // Measure latency if connected
          try {
            const latency = await adapter.getLatency();
            
            // Update health status with latency
            this.updateAdapterHealthStatus(adapter.id, {
              latency,
              lastSuccessTimestamp: new Date()
            });
          } catch (latencyError) {
            this.logger.debug(`Failed to get latency for ${adapter.name}: ${latencyError.message}`, {
              integrationId: adapter.id
            });
          }
        }
        
        // Get adapter health
        const health = await adapter.getHealth();
        
        // Update health status
        this.updateAdapterHealthStatus(adapter.id, {
          serviceStatus: health.status
        });
      } catch (error) {
        this.logger.error(`Health check failed for ${adapter.name}`, error, {
          integrationId: adapter.id
        });
        
        // Update health status
        this.updateAdapterHealthStatus(adapter.id, {
          lastError: this.createIntegrationError(
            IntegrationErrorType.UNKNOWN,
            `Health check failed: ${error.message}`,
            error,
            adapter.id
          ),
          consecutiveFailures: (this.adapterHealthStatus.get(adapter.id)?.consecutiveFailures || 0) + 1
        });
      }
    }, interval);
    
    this.healthCheckIntervals.set(adapter.id, checkInterval);
  }
  
  /**
   * Clear health check for an adapter
   * @param adapterId Adapter ID
   */
  private clearAdapterHealthCheck(adapterId: string): void {
    const interval = this.healthCheckIntervals.get(adapterId);
    
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(adapterId);
    }
  }
  
  /**
   * Clear all health checks
   */
  private clearAllHealthChecks(): void {
    for (const [adapterId, interval] of this.healthCheckIntervals.entries()) {
      clearInterval(interval);
    }
    
    this.healthCheckIntervals.clear();
  }
  
  /**
   * Set up event listeners for an adapter
   * @param adapter The adapter to listen to
   */
  private setupAdapterEventListeners(adapter: IntegrationAdapter): void {
    // Remove any existing listeners
    this.removeAdapterEventListeners(adapter.id);
    
    const listeners = new Set<string>();
    
    // Listen for connection status changes
    const connectionStatusListener = this.eventBus.subscribe(
      `integration.${adapter.id}.connection_status_changed`,
      async (data: any) => {
        this.logger.debug(`Connection status changed for ${adapter.name}: ${data.status}`, {
          integrationId: adapter.id,
          previousStatus: data.previousStatus,
          newStatus: data.status
        });
        
        // Update health status
        this.updateAdapterHealthStatus(adapter.id, {
          connectionStatus: data.status
        });
        
        // Handle connection errors
        if (data.status === ConnectionStatus.ERROR) {
          // Attempt reconnect if auto-reconnect is enabled
          if (this.config.enableAutoReconnect !== false) {
            this.scheduleReconnect(adapter);
          }
        }
      }
    );
    
    listeners.add(connectionStatusListener);
    
    // Listen for errors
    const errorListener = this.eventBus.subscribe(
      `integration.${adapter.id}.error`,
      async (data: any) => {
        this.logger.error(`Error in ${adapter.name}: ${data.message}`, data.error, {
          integrationId: adapter.id,
          errorType: data.type
        });
        
        // Update health status
        this.updateAdapterHealthStatus(adapter.id, {
          lastError: this.createIntegrationError(
            data.type || IntegrationErrorType.UNKNOWN,
            data.message,
            data.error,
            adapter.id
          ),
          consecutiveFailures: (this.adapterHealthStatus.get(adapter.id)?.consecutiveFailures || 0) + 1
        });
        
        // Check if circuit breaker should be tripped
        this.checkCircuitBreaker(adapter.id);
      }
    );
    
    listeners.add(errorListener);
    
    // Store the listeners
    this.adapterEventListeners.set(adapter.id, listeners);
  }
  
  /**
   * Remove event listeners for an adapter
   * @param adapterId Adapter ID
   */
  private removeAdapterEventListeners(adapterId: string): void {
    const listeners = this.adapterEventListeners.get(adapterId);
    
    if (listeners) {
      for (const listenerId of listeners) {
        this.eventBus.unsubscribe(listenerId);
      }
      
      this.adapterEventListeners.delete(adapterId);
    }
  }
  
  /**
   * Update health status for an adapter
   * @param adapterId Adapter ID
   * @param updates Status updates
   */
  private updateAdapterHealthStatus(
    adapterId: string,
    updates: Partial<AdapterHealthStatus>
  ): void {
    const currentStatus = this.adapterHealthStatus.get(adapterId);
    
    if (!currentStatus) {
      return;
    }
    
    const newStatus = {
      ...currentStatus,
      ...updates
    };
    
    this.adapterHealthStatus.set(adapterId, newStatus);
    
    // Publish health status changed event if significant changes
    const significantChanges = [
      'connectionStatus',
      'serviceStatus',
      'circuitBreakerTripped'
    ];
    
    if (Object.keys(updates).some(key => significantChanges.includes(key))) {
      this.eventProducer.createAndPublishEvent(
        IntegrationManagerEventType.ADAPTER_HEALTH_CHANGED,
        {
          integrationId: adapterId,
          status: newStatus,
          timestamp: new Date()
        }
      );
    }
  }
  
  /**
   * Check if circuit breaker should be tripped
   * @param adapterId Adapter ID
   */
  private checkCircuitBreaker(adapterId: string): void {
    const health = this.adapterHealthStatus.get(adapterId);
    
    if (!health) {
      return;
    }
    
    const threshold = this.config.recovery?.circuitBreakerThreshold || 5;
    
    if (health.consecutiveFailures >= threshold && !health.circuitBreakerTripped) {
      this.logger.warn(`Circuit breaker tripped for ${health.name} after ${health.consecutiveFailures} consecutive failures`, {
        integrationId: adapterId
      });
      
      // Trip the circuit breaker
      this.updateAdapterHealthStatus(adapterId, {
        circuitBreakerTripped: true
      });
      
      // Schedule circuit breaker reset
      const resetTimeout = this.config.recovery?.circuitBreakerResetTimeout || 300000; // Default 5 minutes
      
      setTimeout(() => {
        this.resetCircuitBreaker(adapterId);
      }, resetTimeout);
    }
  }
  
  /**
   * Calculate new success rate based on current rate and latest operation
   * @param adapterId Adapter ID
   * @param success Whether the latest operation was successful
   * @returns New success rate
   */
  private calculateNewSuccessRate(adapterId: string, success: boolean): number {
    const health = this.adapterHealthStatus.get(adapterId);
    const currentRate = health?.successRate ?? 100;
    const weight = 0.1; // How much to weight the new operation vs. historical data
    
    return currentRate * (1 - weight) + (success ? 100 : 0) * weight;
  }
  
  /**
   * Create an integration error object
   * @param type Error type
   * @param message Error message
   * @param originalError Original error if any
   * @param integrationId Integration ID
   * @returns Integration error object
   */
  private createIntegrationError(
    type: IntegrationErrorType,
    message: string,
    originalError: Error | null,
    integrationId: string
  ): IntegrationError {
    return {
      type,
      message,
      originalError: originalError || undefined,
      timestamp: new Date(),
      integrationId,
      context: originalError ? { stack: originalError.stack } : undefined
    };
  }
  
  /**
   * Schedule a reconnection attempt for an adapter
   * @param adapter The adapter to reconnect
   */
  private scheduleReconnect(adapter: IntegrationAdapter): void {
    const attempts = this.recoveryAttempts.get(adapter.id) || 0;
    const maxRetries = adapter.config.retry?.maxRetries ?? 5;
    
    if (attempts >= maxRetries) {
      this.logger.warn(`Maximum reconnection attempts (${maxRetries}) reached for ${adapter.name}`, {
        integrationId: adapter.id
      });
      return;
    }
    
    const initialDelay = adapter.config.retry?.initialDelay ?? 5000;
    const maxDelay = adapter.config.retry?.maxDelay ?? 60000;
    const backoffFactor = adapter.config.retry?.backoffFactor ?? 2;
    
    // Calculate delay with exponential backoff
    const delay = Math.min(initialDelay * Math.pow(backoffFactor, attempts), maxDelay);
    
    this.logger.info(`Scheduling reconnection for ${adapter.name} in ${delay}ms (attempt ${attempts + 1}/${maxRetries})`, {
      integrationId: adapter.id
    });
    
    setTimeout(() => {
      // Don't reconnect if circuit breaker is tripped
      const health = this.adapterHealthStatus.get(adapter.id);
      if (health?.circuitBreakerTripped) {
        this.logger.info(`Skipping reconnection for ${adapter.name} - circuit breaker is tripped`, {
          integrationId: adapter.id
        });
        return;
      }
      
      // Don't reconnect if manager is stopped
      if (this.status === ServiceStatus.OFFLINE || this.status === ServiceStatus.STOPPING) {
        this.logger.info(`Skipping reconnection for ${adapter.name} - manager is stopping or offline`, {
          integrationId: adapter.id
        });
        return;
      }
      
      adapter.reconnect().catch(err => {
        this.logger.error(`Scheduled reconnection failed for ${adapter.name}: ${err.message}`, err, {
          integrationId: adapter.id
        });
        
        // Increment recovery attempts and try again if needed
        const newAttempts = (this.recoveryAttempts.get(adapter.id) || 0) + 1;
        this.recoveryAttempts.set(adapter.id, newAttempts);
        
        if (newAttempts < maxRetries) {
          this.scheduleReconnect(adapter);
        }
      });
    }, delay);
  }
  
  /**
   * Publish an adapter event
   * @param eventType Event type
   * @param adapter The adapter
   * @param additionalData Additional event data
   */
  private async publishAdapterEvent(
    eventType: IntegrationManagerEventType,
    adapter: IntegrationAdapter,
    additionalData?: Record<string, unknown>
  ): Promise<void> {
    await this.eventProducer.createAndPublishEvent(eventType, {
      integrationId: adapter.id,
      name: adapter.name,
      type: adapter.config.type,
      timestamp: new Date(),
      ...additionalData
    });
  }
  
  /**
   * Get the adapter factory for a specific integration type
   * @param type Integration system type
   * @returns Factory function to create the adapter
   */
  private getAdapterFactory(
    type: IntegrationSystemType
  ): (config: IntegrationConfig) => Promise<IntegrationAdapter> {
    // This would be implemented to return the appropriate adapter factory based on type
    // For now, we're returning a placeholder that will throw an error
    return async () => {
      throw new Error(`Integration adapter factory for type ${type} is not implemented`);
    };
  }
}