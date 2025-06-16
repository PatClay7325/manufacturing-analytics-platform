/**
 * OPC UA Adapter Implementation
 * 
 * Implements integration with manufacturing systems using the OPC UA protocol.
 * Handles connection, subscription, reading, and writing to OPC UA servers.
 */

import {
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
  ClientSession,
  ClientSubscription,
  AttributeIds,
  TimestampsToReturn,
  MonitoringParametersOptions,
  ClientMonitoredItem,
  DataValue,
  Variant,
  UserIdentityToken,
  UserNameIdentityToken,
  X509IdentityToken,
  NodeId,
  StatusCode,
  ClientMonitoredItemGroup
} from 'node-opcua';
import { v4 as uuidv4 } from 'uuid';
import { AbstractIntegrationAdapter } from '../../abstract/AbstractIntegrationAdapter';
import { DataTransformer } from '../../interfaces/DataTransformer';
import { DataValidator } from '../../interfaces/DataValidator';
import { LoggerService } from '../../../architecture/interfaces';
import { BaseConfig } from '../../../architecture/types';
import { 
  IntegrationConfig, 
  IntegrationDataPacket, 
  ConnectionStatus,
  IntegrationErrorType
} from '../../types';

/**
 * OPC UA connection parameters
 */
export interface OpcUaConnectionParams {
  /**
   * OPC UA server endpoint URL
   */
  endpointUrl: string;
  
  /**
   * Application name
   */
  applicationName?: string;
  
  /**
   * Application URI
   */
  applicationUri?: string;
  
  /**
   * Product URI
   */
  productUri?: string;
  
  /**
   * Connection timeout in milliseconds
   */
  connectionTimeout?: number;
  
  /**
   * Request timeout in milliseconds
   */
  requestTimeout?: number;
  
  /**
   * Session timeout in milliseconds
   */
  sessionTimeout?: number;
  
  /**
   * Maximum number of keep alive requests before resetting connection
   */
  keepaliveFailuresAllowed?: number;
  
  /**
   * Security mode
   */
  securityMode?: 'None' | 'Sign' | 'SignAndEncrypt';
  
  /**
   * Security policy
   */
  securityPolicy?: 
    'None' | 
    'Basic128' | 
    'Basic192' | 
    'Basic256' | 
    'Basic256Sha256' | 
    'Aes128_Sha256_RsaOaep' | 
    'Aes256_Sha256_RsaPss';
  
  /**
   * Endpoint must be available
   */
  endpointMustExist?: boolean;
  
  /**
   * Default subscription settings
   */
  defaultSubscription?: {
    /**
     * Publishing interval in milliseconds
     */
    publishingInterval: number;
    
    /**
     * Lifetime count
     */
    lifetimeCount?: number;
    
    /**
     * Maximum number of notifications per publish
     */
    maxNotificationsPerPublish?: number;
    
    /**
     * Priority
     */
    priority?: number;
    
    /**
     * Publishing enabled
     */
    publishingEnabled?: boolean;
  };
}

/**
 * OPC UA authentication parameters
 */
export interface OpcUaAuthParams {
  /**
   * Authentication type
   */
  type: 'anonymous' | 'username' | 'certificate';
  
  /**
   * Username for username authentication
   */
  username?: string;
  
  /**
   * Password for username authentication
   */
  password?: string;
  
  /**
   * Certificate path for certificate authentication
   */
  certificatePath?: string;
  
  /**
   * Private key path for certificate authentication
   */
  privateKeyPath?: string;
  
  /**
   * Private key password for certificate authentication
   */
  privateKeyPassword?: string;
}

/**
 * OPC UA subscription information
 */
interface OpcUaSubscription {
  /**
   * Node ID to monitor
   */
  nodeId: string;
  
  /**
   * Monitored item object
   */
  monitoredItem?: ClientMonitoredItem;
  
  /**
   * Subscription group
   */
  subscriptionGroup?: ClientMonitoredItemGroup;
  
  /**
   * Callback function to be called when a value changes
   */
  callback: (data: IntegrationDataPacket<unknown>) => void | Promise<void>;
}

/**
 * OPC UA adapter for manufacturing systems integration
 */
export class OpcUaAdapter extends AbstractIntegrationAdapter {
  /**
   * OPC UA client instance
   */
  private client: OPCUAClient | null = null;
  
  /**
   * OPC UA session instance
   */
  private session: ClientSession | null = null;
  
  /**
   * OPC UA subscription instance
   */
  private mainSubscription: ClientSubscription | null = null;
  
  /**
   * Last measured latency in milliseconds
   */
  private latencyValue: number = 0;
  
  /**
   * Connection parameters
   */
  private opcuaParams: OpcUaConnectionParams;
  
  /**
   * Authentication parameters
   */
  private opcuaAuth: OpcUaAuthParams;
  
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
    super(config, transformer, validator, logger);
    
    // Extract OPC UA-specific connection parameters
    this.opcuaParams = config.connectionParams as OpcUaConnectionParams;
    
    // Extract authentication parameters if available
    this.opcuaAuth = (config.authParams || { type: 'anonymous' }) as OpcUaAuthParams;
    
    // Validate required parameters
    if (!this.opcuaParams.endpointUrl) {
      throw new Error('OPC UA endpoint URL is required');
    }
  }
  
  /**
   * Initialize the OPC UA adapter
   * @param baseConfig Base configuration
   */
  protected async initializeAdapter(baseConfig: BaseConfig): Promise<void> {
    this.logger.debug('Initializing OPC UA adapter', {
      endpointUrl: this.opcuaParams.endpointUrl,
      applicationName: this.opcuaParams.applicationName || this.name
    });
  }
  
  /**
   * Connect to the OPC UA server
   */
  public async connect(): Promise<void> {
    if (this.session && this.connectionStatus === ConnectionStatus.CONNECTED) {
      this.logger.debug('Already connected to OPC UA server');
      return;
    }
    
    try {
      this.setConnectionStatus(ConnectionStatus.CONNECTING);
      
      // Build OPC UA client options
      const options = {
        applicationName: this.opcuaParams.applicationName || this.name,
        applicationUri: this.opcuaParams.applicationUri || `urn:${this.id}:${this.name}`,
        productUri: this.opcuaParams.productUri || `urn:${this.id}:product`,
        connectionStrategy: {
          initialDelay: 1000,
          maxRetry: 0 // We handle reconnection ourselves
        },
        securityMode: this.getSecurityMode(),
        securityPolicy: this.getSecurityPolicy(),
        endpointMustExist: this.opcuaParams.endpointMustExist !== false,
        keepSessionAlive: true,
        requestedSessionTimeout: this.opcuaParams.sessionTimeout || 60000,
        keepaliveInterval: 10000,
        keepaliveFailuresAllowed: this.opcuaParams.keepaliveFailuresAllowed || 3,
        timeout: this.opcuaParams.connectionTimeout || 30000,
        connectionTimeout: this.opcuaParams.connectionTimeout || 30000
      };
      
      // Create OPC UA client
      this.logger.info(`Creating OPC UA client for endpoint ${this.opcuaParams.endpointUrl}`);
      this.client = OPCUAClient.create(options);
      
      // Set up event handlers
      this.client.on('backoff', (retry, delay) => {
        this.logger.debug(`OPC UA client backoff: retry=${retry} delay=${delay}ms`);
      });
      
      this.client.on('connection_failed', (err) => {
        this.logger.error('OPC UA connection failed', err);
        this.setConnectionStatus(ConnectionStatus.ERROR);
      });
      
      this.client.on('connection_lost', () => {
        this.logger.warn('OPC UA connection lost');
        this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
        
        // Attempt to reconnect if configured
        if (this.config.retry && this.config.retry.maxRetries !== 0) {
          this.reconnect().catch(err => {
            this.logger.error(`Failed to reconnect to OPC UA server: ${err.message}`, err);
          });
        }
      });
      
      this.client.on('connection_reestablished', () => {
        this.logger.info('OPC UA connection reestablished');
        this.recreateSession().catch(err => {
          this.logger.error(`Failed to recreate session: ${err.message}`, err);
        });
      });
      
      this.client.on('start_reconnection', () => {
        this.logger.info('OPC UA client starting reconnection');
        this.setConnectionStatus(ConnectionStatus.RECONNECTING);
      });
      
      this.client.on('after_reconnection', (err) => {
        if (err) {
          this.logger.error(`OPC UA reconnection failed: ${err.message}`, err);
          this.setConnectionStatus(ConnectionStatus.ERROR);
        } else {
          this.logger.info('OPC UA client reconnected');
        }
      });
      
      // Connect to the server
      this.logger.info(`Connecting to OPC UA server at ${this.opcuaParams.endpointUrl}`);
      await this.client.connect(this.opcuaParams.endpointUrl);
      
      // Create session
      this.logger.info('Creating OPC UA session');
      this.session = await this.createSession();
      
      // Create main subscription if default subscription is configured
      if (this.opcuaParams.defaultSubscription) {
        await this.createMainSubscription();
      }
      
      // Update connection status
      this.setConnectionStatus(ConnectionStatus.CONNECTED);
      this.clearLastError();
      this.retryCount = 0;
      
      // Test the connection
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new Error('Connection test failed after connecting to OPC UA server');
      }
      
      this.logger.info('Successfully connected to OPC UA server');
      
    } catch (error) {
      this.setConnectionStatus(ConnectionStatus.ERROR);
      this.setLastError(
        IntegrationErrorType.CONNECTION,
        `Failed to connect to OPC UA server: ${error.message}`,
        error
      );
      
      // Cleanup failed connection attempt
      await this.cleanup();
      
      throw error;
    }
  }
  
  /**
   * Disconnect from the OPC UA server
   */
  public async disconnect(): Promise<void> {
    if (!this.client) {
      this.logger.debug('No active OPC UA connection to disconnect');
      this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
      return;
    }
    
    try {
      this.logger.info('Disconnecting from OPC UA server');
      
      // Cleanup resources
      await this.cleanup();
      
      this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
      this.logger.info('Disconnected from OPC UA server');
    } catch (error) {
      this.setLastError(
        IntegrationErrorType.CONNECTION,
        `Failed to disconnect from OPC UA server: ${error.message}`,
        error
      );
      throw error;
    }
  }
  
  /**
   * Clean up OPC UA resources
   */
  private async cleanup(): Promise<void> {
    try {
      // Close main subscription
      if (this.mainSubscription) {
        try {
          this.logger.debug('Terminating OPC UA subscription');
          await this.mainSubscription.terminate();
        } catch (err) {
          this.logger.warn(`Error terminating subscription: ${err.message}`);
        }
        this.mainSubscription = null;
      }
      
      // Close session
      if (this.session) {
        try {
          this.logger.debug('Closing OPC UA session');
          await this.session.close();
        } catch (err) {
          this.logger.warn(`Error closing session: ${err.message}`);
        }
        this.session = null;
      }
      
      // Disconnect client
      if (this.client) {
        try {
          this.logger.debug('Disconnecting OPC UA client');
          await this.client.disconnect();
        } catch (err) {
          this.logger.warn(`Error disconnecting client: ${err.message}`);
        }
        this.client = null;
      }
    } catch (error) {
      this.logger.error(`Error during OPC UA cleanup: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Send data to the OPC UA server by writing to a node
   * @param data The data to send
   * @param options Optional sending options
   */
  public async sendData<T>(
    data: IntegrationDataPacket<T>,
    options?: Record<string, unknown>
  ): Promise<void> {
    if (!this.session || this.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new Error('Cannot write data: Not connected to OPC UA server');
    }
    
    try {
      // Extract node ID from options
      const nodeId = options?.nodeId as string;
      if (!nodeId) {
        throw new Error('Node ID is required for OPC UA write operation');
      }
      
      // Transform data if needed
      const transformedData = await this.transformer.transform(data);
      
      // Validate the data
      await this.validator.validate(transformedData);
      
      this.logger.debug(`Writing value to OPC UA node ${nodeId}`, {
        nodeId,
        dataId: data.id
      });
      
      // Create the data value
      const dataValue = new DataValue({
        value: new Variant({
          value: transformedData.payload,
          // Use dataType from options if provided
          dataType: options?.dataType as number
        })
      });
      
      // Write the value
      const statusCode = await this.session.write({
        nodeId: nodeId,
        attributeId: AttributeIds.Value,
        value: dataValue
      });
      
      // Check write status
      if (statusCode.isGood()) {
        this.logger.debug(`Successfully wrote value to OPC UA node ${nodeId}`);
      } else {
        throw new Error(`Write operation failed with status: ${statusCode.toString()}`);
      }
    } catch (error) {
      this.setLastError(
        IntegrationErrorType.COMMUNICATION,
        `Failed to write data: ${error.message}`,
        error
      );
      throw error;
    }
  }
  
  /**
   * Receive data from the OPC UA server by subscribing to a node
   * @param callback Function to call when data is received
   * @param options Optional receiving options
   * @returns Subscription ID that can be used to unsubscribe
   */
  public async receiveData<T>(
    callback: (data: IntegrationDataPacket<T>) => void | Promise<void>,
    options?: Record<string, unknown>
  ): Promise<string> {
    if (!this.session || this.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new Error('Cannot subscribe: Not connected to OPC UA server');
    }
    
    try {
      // Extract node ID from options
      const nodeId = options?.nodeId as string;
      if (!nodeId) {
        throw new Error('Node ID is required for OPC UA subscription');
      }
      
      // Create subscription if main subscription doesn't exist
      if (!this.mainSubscription) {
        await this.createMainSubscription();
      }
      
      if (!this.mainSubscription) {
        throw new Error('Failed to create OPC UA subscription');
      }
      
      // Generate subscription ID
      const subscriptionId = `${this.id}-${uuidv4()}`;
      
      // Create monitoring parameters
      const monitoringParameters: MonitoringParametersOptions = {
        samplingInterval: (options?.samplingInterval as number) || 1000,
        discardOldest: (options?.discardOldest as boolean) || true,
        queueSize: (options?.queueSize as number) || 10
      };
      
      this.logger.debug(`Subscribing to OPC UA node: ${nodeId}`, {
        nodeId,
        samplingInterval: monitoringParameters.samplingInterval
      });
      
      // Create monitored item
      const itemToMonitor = {
        nodeId: nodeId,
        attributeId: AttributeIds.Value
      };
      
      // Setup the monitored item
      const monitoredItem = ClientMonitoredItem.create(
        this.mainSubscription,
        itemToMonitor,
        monitoringParameters,
        TimestampsToReturn.Both
      );
      
      // Store subscription information
      const subscription: OpcUaSubscription = {
        nodeId,
        monitoredItem,
        callback: callback as (data: IntegrationDataPacket<unknown>) => void | Promise<void>
      };
      
      // Add to subscriptions map
      this.subscriptions.set(subscriptionId, subscription);
      
      // Set up value change handler
      monitoredItem.on('changed', (dataValue: DataValue) => {
        this.handleValueChange(nodeId, dataValue, subscriptionId);
      });
      
      return subscriptionId;
    } catch (error) {
      this.setLastError(
        IntegrationErrorType.COMMUNICATION,
        `Failed to subscribe: ${error.message}`,
        error
      );
      throw error;
    }
  }
  
  /**
   * Unsubscribe from a node
   * @param subscriptionId The subscription ID to unsubscribe
   */
  public async unsubscribe(subscriptionId: string): Promise<void> {
    // Get subscription information
    const subscription = this.subscriptions.get(subscriptionId) as OpcUaSubscription;
    if (!subscription) {
      this.logger.warn(`Subscription not found: ${subscriptionId}`);
      return;
    }
    
    try {
      this.logger.debug(`Unsubscribing from OPC UA node: ${subscription.nodeId}`);
      
      // Terminate monitored item if exists
      if (subscription.monitoredItem) {
        try {
          await subscription.monitoredItem.terminate();
        } catch (err) {
          this.logger.warn(`Error terminating monitored item: ${err.message}`);
        }
      }
      
      // Remove from subscriptions map
      this.subscriptions.delete(subscriptionId);
      
      this.logger.info(`Successfully unsubscribed from OPC UA node: ${subscription.nodeId}`);
    } catch (error) {
      this.setLastError(
        IntegrationErrorType.COMMUNICATION,
        `Failed to unsubscribe: ${error.message}`,
        error
      );
      throw error;
    }
  }
  
  /**
   * Test the connection to the OPC UA server
   */
  public async testConnection(): Promise<boolean> {
    if (!this.client || !this.session) {
      return false;
    }
    
    try {
      // Check if session is active
      const response = await this.session.readVariableValue('ns=0;i=2258'); // CurrentTime node
      
      // Measure latency
      await this.measureLatency();
      
      return response.statusCode.isGood();
    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`, error);
      return false;
    }
  }
  
  /**
   * Get the connection latency in milliseconds
   */
  public async getLatency(): Promise<number> {
    if (!this.client || !this.session || this.connectionStatus !== ConnectionStatus.CONNECTED) {
      return -1;
    }
    
    try {
      await this.measureLatency();
      return this.latencyValue;
    } catch (error) {
      this.logger.error(`Failed to measure latency: ${error.message}`, error);
      return -1;
    }
  }
  
  /**
   * Measure the latency to the OPC UA server
   */
  private async measureLatency(): Promise<void> {
    if (!this.session || this.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new Error('Cannot measure latency: Not connected to OPC UA server');
    }
    
    try {
      // Measure time to read the current server time
      const startTime = Date.now();
      
      // Read the current server time
      const response = await this.session.readVariableValue('ns=0;i=2258'); // CurrentTime
      
      // Calculate latency
      const endTime = Date.now();
      this.latencyValue = endTime - startTime;
      
      // If reading failed, set a high latency value
      if (!response.statusCode.isGood()) {
        this.latencyValue = 5000;
      }
    } catch (error) {
      this.logger.error(`Error measuring latency: ${error.message}`, error);
      this.latencyValue = 5000; // Set a high latency value on error
      throw error;
    }
  }
  
  /**
   * Create an OPC UA session
   */
  private async createSession(): Promise<ClientSession> {
    if (!this.client) {
      throw new Error('OPC UA client is not initialized');
    }
    
    try {
      // Create user identity token based on authentication type
      const userIdentity = this.createUserIdentity();
      
      // Create session
      const session = await this.client.createSession(userIdentity);
      
      this.logger.info('OPC UA session created successfully');
      return session;
    } catch (error) {
      this.logger.error(`Failed to create OPC UA session: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Create user identity token based on authentication settings
   */
  private createUserIdentity(): UserIdentityToken {
    switch (this.opcuaAuth.type) {
      case 'username':
        if (!this.opcuaAuth.username) {
          throw new Error('Username is required for username authentication');
        }
        
        return {
          type: UserNameIdentityToken,
          userName: this.opcuaAuth.username,
          password: this.opcuaAuth.password || ''
        };
      
      case 'certificate':
        if (!this.opcuaAuth.certificatePath || !this.opcuaAuth.privateKeyPath) {
          throw new Error('Certificate and private key paths are required for certificate authentication');
        }
        
        return {
          type: X509IdentityToken,
          certificateData: this.opcuaAuth.certificatePath,
          privateKey: this.opcuaAuth.privateKeyPath,
          privateKeyPassword: this.opcuaAuth.privateKeyPassword
        };
      
      case 'anonymous':
      default:
        return { type: 'anonymous' };
    }
  }
  
  /**
   * Create the main subscription for monitored items
   */
  private async createMainSubscription(): Promise<void> {
    if (!this.session) {
      throw new Error('Cannot create subscription: No active session');
    }
    
    try {
      const defaultSettings = this.opcuaParams.defaultSubscription || {
        publishingInterval: 1000,
        lifetimeCount: 100,
        maxNotificationsPerPublish: 1000,
        priority: 1,
        publishingEnabled: true
      };
      
      this.logger.debug('Creating OPC UA subscription', {
        publishingInterval: defaultSettings.publishingInterval
      });
      
      // Create the subscription
      this.mainSubscription = ClientSubscription.create(this.session, {
        requestedPublishingInterval: defaultSettings.publishingInterval,
        requestedLifetimeCount: defaultSettings.lifetimeCount || 100,
        requestedMaxKeepAliveCount: Math.floor((defaultSettings.lifetimeCount || 100) / 3),
        maxNotificationsPerPublish: defaultSettings.maxNotificationsPerPublish || 1000,
        publishingEnabled: defaultSettings.publishingEnabled !== false,
        priority: defaultSettings.priority || 1
      });
      
      // Set up event handlers
      this.mainSubscription.on('started', () => {
        this.logger.debug(`OPC UA subscription started with publishing interval ${this.mainSubscription?.publishingInterval}ms`);
      });
      
      this.mainSubscription.on('terminated', () => {
        this.logger.debug('OPC UA subscription terminated');
      });
      
      this.mainSubscription.on('keepalive', () => {
        this.logger.trace('OPC UA subscription keepalive');
      });
      
      this.mainSubscription.on('error', (err) => {
        this.logger.error(`OPC UA subscription error: ${err.message}`, err);
      });
      
      this.logger.info('OPC UA subscription created successfully');
    } catch (error) {
      this.logger.error(`Failed to create OPC UA subscription: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Recreate session after reconnection
   */
  private async recreateSession(): Promise<void> {
    try {
      this.logger.info('Recreating OPC UA session after reconnection');
      
      // Close existing session if it exists
      if (this.session) {
        try {
          await this.session.close();
        } catch (err) {
          this.logger.warn(`Error closing existing session: ${err.message}`);
        }
      }
      
      // Create new session
      this.session = await this.createSession();
      
      // Recreate subscription
      if (this.opcuaParams.defaultSubscription) {
        await this.createMainSubscription();
        
        // Resubscribe to all nodes
        await this.resubscribeAll();
      }
      
      this.setConnectionStatus(ConnectionStatus.CONNECTED);
      this.logger.info('OPC UA session and subscriptions recreated successfully');
    } catch (error) {
      this.setLastError(
        IntegrationErrorType.CONNECTION,
        `Failed to recreate session: ${error.message}`,
        error
      );
      this.setConnectionStatus(ConnectionStatus.ERROR);
      throw error;
    }
  }
  
  /**
   * Resubscribe to all nodes after session recreation
   */
  private async resubscribeAll(): Promise<void> {
    if (!this.mainSubscription || !this.session) {
      throw new Error('Cannot resubscribe: No active subscription or session');
    }
    
    try {
      this.logger.info(`Resubscribing to ${this.subscriptions.size} OPC UA nodes`);
      
      const resubscribePromises: Promise<void>[] = [];
      
      // Recreate all monitored items
      for (const [subscriptionId, subscription] of this.subscriptions.entries()) {
        const opcuaSubscription = subscription as OpcUaSubscription;
        
        // Skip if already recreated
        if (opcuaSubscription.monitoredItem) continue;
        
        resubscribePromises.push(
          (async () => {
            try {
              // Create monitoring parameters
              const monitoringParameters: MonitoringParametersOptions = {
                samplingInterval: 1000,
                discardOldest: true,
                queueSize: 10
              };
              
              // Create monitored item
              const itemToMonitor = {
                nodeId: opcuaSubscription.nodeId,
                attributeId: AttributeIds.Value
              };
              
              // Setup the monitored item
              const monitoredItem = ClientMonitoredItem.create(
                this.mainSubscription!,
                itemToMonitor,
                monitoringParameters,
                TimestampsToReturn.Both
              );
              
              // Update subscription
              opcuaSubscription.monitoredItem = monitoredItem;
              
              // Set up value change handler
              monitoredItem.on('changed', (dataValue: DataValue) => {
                this.handleValueChange(opcuaSubscription.nodeId, dataValue, subscriptionId);
              });
              
              this.logger.debug(`Resubscribed to OPC UA node: ${opcuaSubscription.nodeId}`);
            } catch (err) {
              this.logger.error(`Failed to resubscribe to node ${opcuaSubscription.nodeId}: ${err.message}`, err);
            }
          })()
        );
      }
      
      // Wait for all resubscriptions to complete
      await Promise.all(resubscribePromises);
      
      this.logger.info('OPC UA node resubscriptions completed');
    } catch (error) {
      this.logger.error(`Failed to resubscribe to nodes: ${error.message}`, error);
      throw error;
    }
  }
  
  /**
   * Handle value change from OPC UA server
   * @param nodeId The node ID that changed
   * @param dataValue The new data value
   * @param subscriptionId The subscription ID
   */
  private handleValueChange(nodeId: string, dataValue: DataValue, subscriptionId: string): void {
    try {
      this.logger.debug(`Received value change for OPC UA node: ${nodeId}`);
      
      // Get subscription information
      const subscription = this.subscriptions.get(subscriptionId) as OpcUaSubscription;
      if (!subscription) {
        this.logger.warn(`Received value change for unknown subscription: ${subscriptionId}`);
        return;
      }
      
      // Create data packet
      const dataPacket: IntegrationDataPacket<unknown> = {
        id: uuidv4(),
        source: nodeId,
        timestamp: dataValue.sourceTimestamp || new Date(),
        payload: dataValue.value.value,
        quality: {
          reliable: dataValue.statusCode.isGood(),
          status: dataValue.statusCode.toString()
        },
        metadata: {
          nodeId,
          serverTimestamp: dataValue.serverTimestamp,
          serverPicoseconds: dataValue.serverPicoseconds,
          sourcePicoseconds: dataValue.sourcePicoseconds,
          statusCode: dataValue.statusCode.toString(),
          dataType: dataValue.value.dataType,
          arrayType: dataValue.value.arrayType
        }
      };
      
      // Invoke the callback
      try {
        subscription.callback(dataPacket);
      } catch (error) {
        this.logger.error(`Error in OPC UA subscription callback: ${error.message}`, error, {
          subscriptionId,
          nodeId
        });
      }
    } catch (error) {
      this.logger.error(`Error processing OPC UA value change: ${error.message}`, error, {
        nodeId
      });
    }
  }
  
  /**
   * Get security mode for OPC UA connection
   */
  private getSecurityMode(): MessageSecurityMode {
    const securityMode = this.opcuaParams.securityMode || 'None';
    
    switch (securityMode) {
      case 'Sign':
        return MessageSecurityMode.Sign;
      case 'SignAndEncrypt':
        return MessageSecurityMode.SignAndEncrypt;
      case 'None':
      default:
        return MessageSecurityMode.None;
    }
  }
  
  /**
   * Get security policy for OPC UA connection
   */
  private getSecurityPolicy(): SecurityPolicy {
    const securityPolicy = this.opcuaParams.securityPolicy || 'None';
    
    switch (securityPolicy) {
      case 'Basic128':
        return SecurityPolicy.Basic128;
      case 'Basic192':
        return SecurityPolicy.Basic192;
      case 'Basic256':
        return SecurityPolicy.Basic256;
      case 'Basic256Sha256':
        return SecurityPolicy.Basic256Sha256;
      case 'Aes128_Sha256_RsaOaep':
        return SecurityPolicy.Aes128_Sha256_RsaOaep;
      case 'Aes256_Sha256_RsaPss':
        return SecurityPolicy.Aes256_Sha256_RsaPss;
      case 'None':
      default:
        return SecurityPolicy.None;
    }
  }
}