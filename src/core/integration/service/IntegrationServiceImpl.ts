/**
 * Integration Service Implementation
 * 
 * This class implements the IntegrationService interface and provides
 * a service wrapper around the IntegrationManager.
 */

import { LoggerService } from '../../architecture/interfaces';
import { ConfigService } from '../../architecture/ConfigService';
import { BaseModularService } from '../../services/BaseModularService';
import { ServiceCapability, ServiceDependencies, ServiceResult } from '../../services/types';
import { EventBus, EventProducer } from '../../events/interfaces';
import { IntegrationService } from './IntegrationService';
import { IntegrationAdapter } from '../interfaces/IntegrationAdapter';
import { IntegrationDataPacket, IntegrationSystemType, IntegrationConfig } from '../types';
import { IntegrationManager, AdapterHealthStatus, IntegrationManagerConfig } from '../IntegrationManager';
import { IntegrationPipeline } from '../pipeline/IntegrationPipeline';

/**
 * Implementation of the Integration Service
 */
export class IntegrationServiceImpl extends BaseModularService implements IntegrationService {
  /**
   * Integration manager instance
   */
  private integrationManager: IntegrationManager;
  
  /**
   * Constructor
   * @param logger Logger service
   * @param configService Configuration service
   * @param eventBus Event bus
   * @param eventProducer Event producer
   */
  constructor(
    private logger: LoggerService,
    configService: ConfigService,
    private eventBus: EventBus,
    private eventProducer: EventProducer
  ) {
    // Define service capabilities
    const capabilities: ServiceCapability[] = [
      {
        name: 'mqtt-integration',
        version: '1.0.0',
        description: 'MQTT integration capability',
        enabled: true
      },
      {
        name: 'opcua-integration',
        version: '1.0.0',
        description: 'OPC UA integration capability',
        enabled: true
      },
      {
        name: 'rest-integration',
        version: '1.0.0',
        description: 'REST API integration capability',
        enabled: true
      },
      {
        name: 'data-transformation',
        version: '1.0.0',
        description: 'Data transformation capability',
        enabled: true
      },
      {
        name: 'data-validation',
        version: '1.0.0',
        description: 'Data validation capability',
        enabled: true
      },
      {
        name: 'integration-pipeline',
        version: '1.0.0',
        description: 'Integration pipeline capability',
        enabled: true
      }
    ];
    
    // Define service dependencies
    const dependencies: ServiceDependencies = {
      required: ['EventBus', 'ConfigService'],
      optional: ['MetricsService', 'AlertsService']
    };
    
    super('IntegrationService', '1.0.0', dependencies, capabilities);
    
    // Create the integration manager
    this.integrationManager = new IntegrationManager(
      logger,
      configService,
      eventBus,
      eventProducer
    );
  }
  
  /**
   * Initialize the service
   * @param config Service configuration
   */
  protected async doInitialize(config: IntegrationManagerConfig): Promise<void> {
    this.logger.info('Initializing Integration Service');
    
    // Initialize the integration manager
    await this.integrationManager.initialize(config);
    
    this.logger.info('Integration Service initialized successfully');
  }
  
  /**
   * Start the service
   */
  protected async doStart(): Promise<void> {
    this.logger.info('Starting Integration Service');
    
    // Start the integration manager
    await this.integrationManager.start();
    
    this.logger.info('Integration Service started successfully');
  }
  
  /**
   * Stop the service
   */
  protected async doStop(): Promise<void> {
    this.logger.info('Stopping Integration Service');
    
    // Stop the integration manager
    await this.integrationManager.stop();
    
    this.logger.info('Integration Service stopped successfully');
  }
  
  /**
   * Shutdown the service
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Integration Service');
    
    // Shutdown the integration manager
    await this.integrationManager.shutdown();
    
    this.logger.info('Integration Service shutdown complete');
  }
  
  /**
   * Register a new integration adapter
   * @param adapter Integration adapter to register
   */
  public async registerAdapter(adapter: IntegrationAdapter): Promise<ServiceResult<void>> {
    try {
      const startTime = Date.now();
      
      await this.integrationManager.registerAdapter(adapter);
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: `Integration adapter ${adapter.name} registered successfully`
      };
    } catch (error) {
      this.logger.error(`Failed to register integration adapter: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to register integration adapter: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Register a new integration from configuration
   * @param config Integration configuration
   * @returns The registered adapter
   */
  public async registerIntegrationConfig(config: IntegrationConfig): Promise<ServiceResult<IntegrationAdapter>> {
    try {
      const startTime = Date.now();
      
      const adapter = await this.integrationManager.registerIntegrationConfig(config);
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: `Integration ${config.name} registered successfully`,
        data: adapter
      };
    } catch (error) {
      this.logger.error(`Failed to register integration config: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to register integration config: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Deregister an integration adapter
   * @param integrationId Integration ID to deregister
   */
  public async deregisterAdapter(integrationId: string): Promise<ServiceResult<void>> {
    try {
      const startTime = Date.now();
      
      await this.integrationManager.deregisterAdapter(integrationId);
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: `Integration adapter ${integrationId} deregistered successfully`
      };
    } catch (error) {
      this.logger.error(`Failed to deregister integration adapter: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to deregister integration adapter: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Get an integration adapter by ID
   * @param integrationId Integration ID
   * @returns The integration adapter or null if not found
   */
  public async getAdapter(integrationId: string): Promise<ServiceResult<IntegrationAdapter | null>> {
    try {
      const startTime = Date.now();
      
      const adapter = this.integrationManager.getAdapter(integrationId);
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: adapter ? `Integration adapter ${integrationId} found` : `Integration adapter ${integrationId} not found`,
        data: adapter
      };
    } catch (error) {
      this.logger.error(`Failed to get integration adapter: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to get integration adapter: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Get all registered integration adapters
   * @returns Array of registered adapters
   */
  public async getAllAdapters(): Promise<ServiceResult<IntegrationAdapter[]>> {
    try {
      const startTime = Date.now();
      
      const adapters = this.integrationManager.getAllAdapters();
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: `Retrieved ${adapters.length} integration adapters`,
        data: adapters
      };
    } catch (error) {
      this.logger.error(`Failed to get all integration adapters: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to get all integration adapters: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Get all adapters of a specific type
   * @param type Integration system type
   * @returns Array of adapters of the specified type
   */
  public async getAdaptersByType(type: IntegrationSystemType): Promise<ServiceResult<IntegrationAdapter[]>> {
    try {
      const startTime = Date.now();
      
      const adapters = this.integrationManager.getAdaptersByType(type);
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: `Retrieved ${adapters.length} ${type} integration adapters`,
        data: adapters
      };
    } catch (error) {
      this.logger.error(`Failed to get integration adapters by type: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to get integration adapters by type: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Get all connected adapters
   * @returns Array of connected adapters
   */
  public async getConnectedAdapters(): Promise<ServiceResult<IntegrationAdapter[]>> {
    try {
      const startTime = Date.now();
      
      const adapters = this.integrationManager.getConnectedAdapters();
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: `Retrieved ${adapters.length} connected integration adapters`,
        data: adapters
      };
    } catch (error) {
      this.logger.error(`Failed to get connected integration adapters: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to get connected integration adapters: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Send data to a specific integration
   * @param integrationId Integration ID
   * @param data Data to send
   * @param options Optional sending options
   */
  public async sendData<T>(
    integrationId: string,
    data: IntegrationDataPacket<T>,
    options?: Record<string, unknown>
  ): Promise<ServiceResult<void>> {
    try {
      const startTime = Date.now();
      
      await this.integrationManager.sendData(integrationId, data, options);
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: `Data sent successfully to integration ${integrationId}`
      };
    } catch (error) {
      this.logger.error(`Failed to send data to integration: ${error.message}`, error);
      
      this.trackRequest(Date.now(), false);
      
      return {
        success: false,
        message: `Failed to send data to integration: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Receive data from a specific integration
   * @param integrationId Integration ID
   * @param callback Function to call when data is received
   * @param options Optional receiving options
   * @returns Subscription ID
   */
  public async receiveData<T>(
    integrationId: string,
    callback: (data: IntegrationDataPacket<T>) => void | Promise<void>,
    options?: Record<string, unknown>
  ): Promise<ServiceResult<string>> {
    try {
      const startTime = Date.now();
      
      const subscriptionId = await this.integrationManager.receiveData(integrationId, callback, options);
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: `Data subscription set up successfully for integration ${integrationId}`,
        data: subscriptionId
      };
    } catch (error) {
      this.logger.error(`Failed to set up data subscription: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to set up data subscription: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Connect to a specific integration
   * @param integrationId Integration ID
   */
  public async connect(integrationId: string): Promise<ServiceResult<void>> {
    try {
      const startTime = Date.now();
      
      await this.integrationManager.connect(integrationId);
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: `Connected successfully to integration ${integrationId}`
      };
    } catch (error) {
      this.logger.error(`Failed to connect to integration: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to connect to integration: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Disconnect from a specific integration
   * @param integrationId Integration ID
   */
  public async disconnect(integrationId: string): Promise<ServiceResult<void>> {
    try {
      const startTime = Date.now();
      
      await this.integrationManager.disconnect(integrationId);
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: `Disconnected successfully from integration ${integrationId}`
      };
    } catch (error) {
      this.logger.error(`Failed to disconnect from integration: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to disconnect from integration: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Reconnect to a specific integration
   * @param integrationId Integration ID
   */
  public async reconnect(integrationId: string): Promise<ServiceResult<void>> {
    try {
      const startTime = Date.now();
      
      await this.integrationManager.reconnect(integrationId);
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: `Reconnected successfully to integration ${integrationId}`
      };
    } catch (error) {
      this.logger.error(`Failed to reconnect to integration: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to reconnect to integration: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Create a new integration pipeline
   * @param id Pipeline ID
   * @param name Pipeline name
   * @param config Pipeline configuration
   * @returns The created pipeline
   */
  public async createPipeline(
    id: string,
    name: string,
    config: Record<string, unknown>
  ): Promise<ServiceResult<IntegrationPipeline>> {
    try {
      const startTime = Date.now();
      
      const pipeline = this.integrationManager.createPipeline(id, name, config);
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: `Integration pipeline ${name} created successfully`,
        data: pipeline
      };
    } catch (error) {
      this.logger.error(`Failed to create integration pipeline: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to create integration pipeline: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Get a pipeline by ID
   * @param pipelineId Pipeline ID
   * @returns The pipeline or null if not found
   */
  public async getPipeline(pipelineId: string): Promise<ServiceResult<IntegrationPipeline | null>> {
    try {
      const startTime = Date.now();
      
      const pipeline = this.integrationManager.getPipeline(pipelineId);
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: pipeline ? `Integration pipeline ${pipelineId} found` : `Integration pipeline ${pipelineId} not found`,
        data: pipeline
      };
    } catch (error) {
      this.logger.error(`Failed to get integration pipeline: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to get integration pipeline: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Delete a pipeline
   * @param pipelineId Pipeline ID
   */
  public async deletePipeline(pipelineId: string): Promise<ServiceResult<void>> {
    try {
      const startTime = Date.now();
      
      await this.integrationManager.deletePipeline(pipelineId);
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: `Integration pipeline ${pipelineId} deleted successfully`
      };
    } catch (error) {
      this.logger.error(`Failed to delete integration pipeline: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to delete integration pipeline: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Get all pipelines
   * @returns Array of all pipelines
   */
  public async getAllPipelines(): Promise<ServiceResult<IntegrationPipeline[]>> {
    try {
      const startTime = Date.now();
      
      const pipelines = this.integrationManager.getAllPipelines();
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: `Retrieved ${pipelines.length} integration pipelines`,
        data: pipelines
      };
    } catch (error) {
      this.logger.error(`Failed to get all integration pipelines: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to get all integration pipelines: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Get health status for a specific adapter
   * @param integrationId Integration ID
   * @returns The health status or null if not found
   */
  public async getAdapterHealthStatus(integrationId: string): Promise<ServiceResult<AdapterHealthStatus | null>> {
    try {
      const startTime = Date.now();
      
      const healthStatus = this.integrationManager.getAdapterHealthStatus(integrationId);
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: healthStatus ? `Health status for integration ${integrationId} found` : `Health status for integration ${integrationId} not found`,
        data: healthStatus
      };
    } catch (error) {
      this.logger.error(`Failed to get adapter health status: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to get adapter health status: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Reset circuit breaker for an adapter
   * @param integrationId Integration ID
   */
  public async resetCircuitBreaker(integrationId: string): Promise<ServiceResult<void>> {
    try {
      const startTime = Date.now();
      
      this.integrationManager.resetCircuitBreaker(integrationId);
      
      this.trackRequest(startTime, true);
      
      return {
        success: true,
        message: `Circuit breaker for integration ${integrationId} reset successfully`
      };
    } catch (error) {
      this.logger.error(`Failed to reset circuit breaker: ${error.message}`, error);
      
      return {
        success: false,
        message: `Failed to reset circuit breaker: ${error.message}`,
        error
      };
    }
  }
  
  /**
   * Get service-specific description
   */
  protected async getServiceDescription(): Promise<string> {
    return `
    The Integration Service provides capabilities for connecting with external manufacturing systems
    such as MQTT brokers, OPC UA servers, REST APIs, and other data sources. It manages the lifecycle
    of these integrations and provides tools for data transformation, validation, and integration pipelines.
    `;
  }
  
  /**
   * Get API documentation
   */
  protected async getApiDocumentation(): Promise<string> {
    return `
    ## Integration Service API

    ### Adapter Management
    - registerAdapter(adapter: IntegrationAdapter): Register a new integration adapter
    - registerIntegrationConfig(config: IntegrationConfig): Register a new integration from configuration
    - deregisterAdapter(integrationId: string): Deregister an integration adapter
    - getAdapter(integrationId: string): Get an integration adapter by ID
    - getAllAdapters(): Get all registered integration adapters
    - getAdaptersByType(type: IntegrationSystemType): Get all adapters of a specific type
    - getConnectedAdapters(): Get all connected adapters

    ### Data Exchange
    - sendData(integrationId: string, data: IntegrationDataPacket, options?: Record<string, unknown>): Send data to a specific integration
    - receiveData(integrationId: string, callback: Function, options?: Record<string, unknown>): Receive data from a specific integration

    ### Connection Management
    - connect(integrationId: string): Connect to a specific integration
    - disconnect(integrationId: string): Disconnect from a specific integration
    - reconnect(integrationId: string): Reconnect to a specific integration

    ### Pipeline Management
    - createPipeline(id: string, name: string, config: Record<string, unknown>): Create a new integration pipeline
    - getPipeline(pipelineId: string): Get a pipeline by ID
    - deletePipeline(pipelineId: string): Delete a pipeline
    - getAllPipelines(): Get all pipelines

    ### Health & Monitoring
    - getAdapterHealthStatus(integrationId: string): Get health status for a specific adapter
    - resetCircuitBreaker(integrationId: string): Reset circuit breaker for an adapter
    `;
  }
  
  /**
   * Get custom metrics
   */
  protected async getCustomMetrics(): Promise<Record<string, unknown>> {
    const adapters = this.integrationManager.getAllAdapters();
    const pipelines = this.integrationManager.getAllPipelines();
    
    return {
      totalAdapters: adapters.length,
      connectedAdapters: this.integrationManager.getConnectedAdapters().length,
      totalPipelines: pipelines.length,
      activePipelines: pipelines.filter(p => p.status === 'RUNNING').length,
      adaptersByType: Object.values(IntegrationSystemType).reduce((acc, type) => {
        acc[type] = this.integrationManager.getAdaptersByType(type as IntegrationSystemType).length;
        return acc;
      }, {})
    };
  }
}