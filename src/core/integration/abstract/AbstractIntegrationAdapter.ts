/**
 * Abstract Integration Adapter
 * 
 * Base implementation of the IntegrationAdapter interface that provides
 * common functionality for all integration adapters.
 */

import { BaseConfig, HealthCheckResult, ServiceStatus } from '../../architecture/types';
import { LoggerService } from '../../architecture/interfaces';
import { IntegrationAdapter } from '../interfaces/IntegrationAdapter';
import { DataTransformer } from '../interfaces/DataTransformer';
import { DataValidator } from '../interfaces/DataValidator';
import { 
  ConnectionStatus, 
  IntegrationConfig, 
  IntegrationDataPacket, 
  IntegrationError,
  IntegrationErrorType
} from '../types';

/**
 * Abstract integration adapter implementation
 * Provides common functionality for all integration adapters
 */
export abstract class AbstractIntegrationAdapter implements IntegrationAdapter {
  /**
   * Unique identifier for the service
   */
  readonly id: string;
  
  /**
   * Human-readable name of the service
   */
  readonly name: string;
  
  /**
   * Service version
   */
  readonly version: string = '1.0.0';
  
  /**
   * Current status of the service
   */
  status: ServiceStatus = ServiceStatus.INITIALIZING;
  
  /**
   * The integration configuration
   */
  readonly config: IntegrationConfig;
  
  /**
   * Current connection status
   */
  protected _connectionStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
  
  /**
   * Last error encountered
   */
  protected lastError: IntegrationError | null = null;
  
  /**
   * Data transformer instance
   */
  protected transformer: DataTransformer;
  
  /**
   * Data validator instance
   */
  protected validator: DataValidator;
  
  /**
   * Logger service
   */
  protected logger: LoggerService;
  
  /**
   * Active subscriptions
   */
  protected subscriptions: Map<string, unknown> = new Map();
  
  /**
   * Connection retry count
   */
  protected retryCount: number = 0;
  
  /**
   * Connection retry timeout
   */
  protected retryTimeout: NodeJS.Timeout | null = null;
  
  /**
   * Health check interval
   */
  protected healthCheckInterval: NodeJS.Timeout | null = null;
  
  /**
   * Constructor
   * @param config Integration configuration
   * @param transformer Data transformer
   * @param validator Data validator
   * @param logger Logger service
   */
  constructor(
    config: IntegrationConfig,
    transformer: DataTransformer,
    validator: DataValidator,
    logger: LoggerService
  ) {
    this.id = config.id;
    this.name = config.name;
    this.config = config;
    this.transformer = transformer;
    this.validator = validator;
    this.logger = logger;
  }
  
  /**
   * Get current connection status
   */
  get connectionStatus(): ConnectionStatus {
    return this._connectionStatus;
  }
  
  /**
   * Set connection status and log the change
   */
  protected setConnectionStatus(status: ConnectionStatus): void {
    const previousStatus = this._connectionStatus;
    this._connectionStatus = status;
    
    // Update service status based on connection status
    switch (status) {
      case ConnectionStatus.CONNECTED:
        this.status = ServiceStatus.READY;
        break;
      case ConnectionStatus.CONNECTING:
      case ConnectionStatus.RECONNECTING:
        this.status = ServiceStatus.INITIALIZING;
        break;
      case ConnectionStatus.ERROR:
        this.status = ServiceStatus.ERROR;
        break;
      case ConnectionStatus.DISCONNECTED:
        this.status = ServiceStatus.OFFLINE;
        break;
    }
    
    this.logger.info(`Integration '${this.name}' connection status changed from ${previousStatus} to ${status}`, {
      integrationId: this.id,
      previousStatus,
      currentStatus: status
    });
  }
  
  /**
   * Initialize the service
   * @param baseConfig Service configuration
   */
  async initialize(baseConfig: BaseConfig): Promise<void> {
    try {
      this.logger.info(`Initializing integration adapter: ${this.name}`, {
        integrationId: this.id,
        integrationType: this.config.type
      });
      
      // Perform adapter-specific initialization
      await this.initializeAdapter(baseConfig);
      
      // Setup health check if configured
      if (this.config.healthCheck?.interval) {
        this.setupHealthCheck();
      }
      
      this.status = ServiceStatus.READY;
      this.logger.info(`Integration adapter initialized: ${this.name}`, { integrationId: this.id });
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      this.setLastError(IntegrationErrorType.CONFIGURATION, `Failed to initialize adapter: ${error.message}`, error);
      this.logger.error(`Failed to initialize integration adapter: ${this.name}`, error, { integrationId: this.id });
      throw error;
    }
  }
  
  /**
   * Start the service
   */
  async start(): Promise<void> {
    try {
      this.logger.info(`Starting integration adapter: ${this.name}`, { integrationId: this.id });
      
      // Connect to the external system
      await this.connect();
      
      this.logger.info(`Integration adapter started: ${this.name}`, { integrationId: this.id });
    } catch (error) {
      this.setLastError(IntegrationErrorType.CONNECTION, `Failed to start adapter: ${error.message}`, error);
      this.logger.error(`Failed to start integration adapter: ${this.name}`, error, { integrationId: this.id });
      throw error;
    }
  }
  
  /**
   * Stop the service
   */
  async stop(): Promise<void> {
    try {
      this.logger.info(`Stopping integration adapter: ${this.name}`, { integrationId: this.id });
      
      // Clear any pending retry attempts
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }
      
      // Clear health check interval
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }
      
      // Disconnect from the external system
      await this.disconnect();
      
      this.status = ServiceStatus.OFFLINE;
      this.logger.info(`Integration adapter stopped: ${this.name}`, { integrationId: this.id });
    } catch (error) {
      this.setLastError(IntegrationErrorType.CONNECTION, `Failed to stop adapter: ${error.message}`, error);
      this.logger.error(`Failed to stop integration adapter: ${this.name}`, error, { integrationId: this.id });
      throw error;
    }
  }
  
  /**
   * Get the health status of the service
   */
  async getHealth(): Promise<HealthCheckResult> {
    const isConnected = await this.testConnection().catch(() => false);
    
    const status = isConnected ? ServiceStatus.READY : ServiceStatus.DEGRADED;
    
    const latency = isConnected ? await this.getLatency().catch(() => -1) : -1;
    
    return {
      service: this.name,
      status,
      version: this.version,
      timestamp: new Date(),
      details: {
        integrationId: this.id,
        integrationType: this.config.type,
        connectionStatus: this.connectionStatus,
        latency,
        lastError: this.lastError
      },
      dependencies: []
    };
  }
  
  /**
   * Handle graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info(`Shutting down integration adapter: ${this.name}`, { integrationId: this.id });
    await this.stop();
  }
  
  /**
   * Get the last error if any
   */
  getLastError(): IntegrationError | null {
    return this.lastError;
  }
  
  /**
   * Set the last error
   * @param type Error type
   * @param message Error message
   * @param originalError Original error if available
   * @param context Additional context
   */
  protected setLastError(
    type: IntegrationErrorType,
    message: string,
    originalError?: Error,
    context?: Record<string, unknown>
  ): void {
    this.lastError = {
      type,
      message,
      originalError,
      timestamp: new Date(),
      integrationId: this.id,
      context
    };
    
    // Log the error
    this.logger.error(`Integration error: ${message}`, originalError || new Error(message), {
      integrationId: this.id,
      errorType: type,
      ...context
    });
    
    // Update connection status if it's a connection error
    if (type === IntegrationErrorType.CONNECTION) {
      this.setConnectionStatus(ConnectionStatus.ERROR);
    }
  }
  
  /**
   * Clear the last error
   */
  protected clearLastError(): void {
    this.lastError = null;
  }
  
  /**
   * Handle reconnection logic
   */
  async reconnect(): Promise<void> {
    if (
      this.connectionStatus === ConnectionStatus.CONNECTING ||
      this.connectionStatus === ConnectionStatus.RECONNECTING
    ) {
      this.logger.debug(`Already attempting to reconnect: ${this.name}`, { integrationId: this.id });
      return;
    }
    
    try {
      this.setConnectionStatus(ConnectionStatus.RECONNECTING);
      
      // Clear any existing retry timeout
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }
      
      // Increment retry count
      this.retryCount++;
      
      const maxRetries = this.config.retry?.maxRetries ?? 5;
      const initialDelay = this.config.retry?.initialDelay ?? 1000;
      const maxDelay = this.config.retry?.maxDelay ?? 30000;
      const backoffFactor = this.config.retry?.backoffFactor ?? 2;
      
      // Check if we've exceeded max retries
      if (maxRetries > 0 && this.retryCount > maxRetries) {
        throw new Error(`Exceeded maximum reconnection attempts (${maxRetries})`);
      }
      
      // Calculate backoff delay
      const delay = Math.min(
        initialDelay * Math.pow(backoffFactor, this.retryCount - 1),
        maxDelay
      );
      
      this.logger.info(`Reconnecting to ${this.name} in ${delay}ms (attempt ${this.retryCount})`, { 
        integrationId: this.id 
      });
      
      // Wait for backoff delay
      await new Promise(resolve => {
        this.retryTimeout = setTimeout(resolve, delay);
      });
      
      // Attempt to disconnect if we're in an error state
      if (this.connectionStatus === ConnectionStatus.ERROR) {
        await this.disconnect().catch(err => {
          this.logger.warn(`Error disconnecting during reconnect: ${err.message}`, { 
            integrationId: this.id 
          });
        });
      }
      
      // Attempt to connect
      await this.connect();
      
      // Reset retry count on successful connection
      this.retryCount = 0;
      
      this.logger.info(`Successfully reconnected to ${this.name}`, { integrationId: this.id });
    } catch (error) {
      this.setLastError(
        IntegrationErrorType.CONNECTION,
        `Failed to reconnect: ${error.message}`,
        error
      );
      
      // Schedule another reconnection attempt
      const maxRetries = this.config.retry?.maxRetries ?? 5;
      if (maxRetries <= 0 || this.retryCount < maxRetries) {
        const nextDelay = this.config.retry?.initialDelay ?? 5000;
        this.logger.info(`Scheduling next reconnection attempt in ${nextDelay}ms`, { 
          integrationId: this.id 
        });
        
        this.retryTimeout = setTimeout(() => {
          this.reconnect().catch(err => {
            this.logger.error(`Reconnection attempt failed: ${err.message}`, err, { 
              integrationId: this.id 
            });
          });
        }, nextDelay);
      } else {
        this.logger.error(`Exceeded maximum reconnection attempts (${maxRetries})`, error, {
          integrationId: this.id
        });
      }
    }
  }
  
  /**
   * Set up health check interval
   */
  private setupHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    const interval = this.config.healthCheck?.interval ?? 60000;
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        const isConnected = await this.testConnection();
        
        if (!isConnected && this.connectionStatus === ConnectionStatus.CONNECTED) {
          this.logger.warn(`Health check failed for ${this.name}, attempting to reconnect`, {
            integrationId: this.id
          });
          
          this.reconnect().catch(err => {
            this.logger.error(`Failed to reconnect after health check: ${err.message}`, err, {
              integrationId: this.id
            });
          });
        }
      } catch (error) {
        this.logger.error(`Health check error for ${this.name}: ${error.message}`, error, {
          integrationId: this.id
        });
      }
    }, interval);
  }
  
  /**
   * Adapter-specific initialization
   * Implement in concrete adapter classes
   * @param baseConfig Base configuration
   */
  protected abstract initializeAdapter(baseConfig: BaseConfig): Promise<void>;
  
  /**
   * Connect to the external system
   * Implement in concrete adapter classes
   */
  public abstract connect(): Promise<void>;
  
  /**
   * Disconnect from the external system
   * Implement in concrete adapter classes
   */
  public abstract disconnect(): Promise<void>;
  
  /**
   * Send data to the external system
   * Implement in concrete adapter classes
   * @param data The data to send
   * @param options Optional sending options
   */
  public abstract sendData<T>(
    data: IntegrationDataPacket<T>, 
    options?: Record<string, unknown>
  ): Promise<void>;
  
  /**
   * Receive data from the external system
   * Implement in concrete adapter classes
   * @param callback Function to call when data is received
   * @param options Optional receiving options
   */
  public abstract receiveData<T>(
    callback: (data: IntegrationDataPacket<T>) => void | Promise<void>,
    options?: Record<string, unknown>
  ): Promise<string>;
  
  /**
   * Stop receiving data for a specific subscription
   * Implement in concrete adapter classes
   * @param subscriptionId The subscription ID to unsubscribe
   */
  public abstract unsubscribe(subscriptionId: string): Promise<void>;
  
  /**
   * Test the connection to the external system
   * Implement in concrete adapter classes
   */
  public abstract testConnection(): Promise<boolean>;
  
  /**
   * Get the connection latency in milliseconds
   * Implement in concrete adapter classes
   */
  public abstract getLatency(): Promise<number>;
}