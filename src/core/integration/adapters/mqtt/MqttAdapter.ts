/**
 * MQTT Adapter Implementation
 * 
 * Implements integration with manufacturing systems using the MQTT protocol.
 * Handles connection, subscription, publishing, and message handling.
 */

import mqtt, { MqttClient, IClientOptions, IClientPublishOptions, IClientSubscribeOptions } from 'mqtt';
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
 * MQTT connection parameters
 */
export interface MqttConnectionParams {
  /**
   * MQTT broker URL (e.g., mqtt://broker.example.com)
   */
  brokerUrl: string;
  
  /**
   * Optional broker port (default depends on protocol)
   */
  port?: number;
  
  /**
   * Client ID for this connection
   */
  clientId?: string;
  
  /**
   * Whether to use a clean session
   */
  clean?: boolean;
  
  /**
   * Connection timeout in milliseconds
   */
  connectTimeout?: number;
  
  /**
   * Reconnect period in milliseconds
   */
  reconnectPeriod?: number;
  
  /**
   * Keep alive interval in seconds
   */
  keepalive?: number;
  
  /**
   * Quality of Service level for messages
   * 0 = At most once
   * 1 = At least once
   * 2 = Exactly once
   */
  qos?: 0 | 1 | 2;
  
  /**
   * Whether to use a persistent connection
   */
  persistent?: boolean;
  
  /**
   * Whether to retain published messages
   */
  retain?: boolean;
  
  /**
   * Protocol version to use
   */
  protocolVersion?: 3 | 4 | 5;
  
  /**
   * Last Will and Testament configuration
   */
  will?: {
    topic: string;
    payload: string;
    qos?: 0 | 1 | 2;
    retain?: boolean;
  };
}

/**
 * MQTT authentication parameters
 */
export interface MqttAuthParams {
  /**
   * Username for authentication
   */
  username?: string;
  
  /**
   * Password for authentication
   */
  password?: string;
  
  /**
   * TLS/SSL configuration
   */
  tls?: {
    /**
     * Whether to enable TLS
     */
    enabled: boolean;
    
    /**
     * Whether to reject unauthorized certificates
     */
    rejectUnauthorized?: boolean;
    
    /**
     * Path to CA certificate file
     */
    ca?: string;
    
    /**
     * Path to client certificate file
     */
    cert?: string;
    
    /**
     * Path to client key file
     */
    key?: string;
  };
}

/**
 * MQTT subscription information
 */
interface MqttSubscription {
  /**
   * Topic pattern that was subscribed to
   */
  topic: string;
  
  /**
   * Callback function to be called when a message is received
   */
  callback: (data: IntegrationDataPacket<unknown>) => void | Promise<void>;
  
  /**
   * Subscription options
   */
  options?: IClientSubscribeOptions;
}

/**
 * MQTT adapter for manufacturing systems integration
 */
export class MqttAdapter extends AbstractIntegrationAdapter {
  /**
   * MQTT client instance
   */
  private client: MqttClient | null = null;
  
  /**
   * Ping timer for latency measurements
   */
  private pingTimer: NodeJS.Timeout | null = null;
  
  /**
   * Last ping timestamp
   */
  private lastPingTime: number = 0;
  
  /**
   * Last pong timestamp
   */
  private lastPongTime: number = 0;
  
  /**
   * Last measured latency in milliseconds
   */
  private latencyValue: number = 0;
  
  /**
   * Connection parameters
   */
  private mqttParams: MqttConnectionParams;
  
  /**
   * Authentication parameters
   */
  private mqttAuth: MqttAuthParams;
  
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
    
    // Extract MQTT-specific connection parameters
    this.mqttParams = config.connectionParams as MqttConnectionParams;
    
    // Extract authentication parameters if available
    this.mqttAuth = (config.authParams || {}) as MqttAuthParams;
    
    // Validate required parameters
    if (!this.mqttParams.brokerUrl) {
      throw new Error('MQTT broker URL is required');
    }
  }
  
  /**
   * Initialize the MQTT adapter
   * @param baseConfig Base configuration
   */
  protected async initializeAdapter(baseConfig: BaseConfig): Promise<void> {
    this.logger.debug('Initializing MQTT adapter', {
      brokerUrl: this.mqttParams.brokerUrl,
      clientId: this.mqttParams.clientId || 'not-specified'
    });
    
    // Generate client ID if not provided
    if (!this.mqttParams.clientId) {
      this.mqttParams.clientId = `map-mqtt-${this.id}-${uuidv4().substring(0, 8)}`;
      this.logger.debug(`Generated MQTT client ID: ${this.mqttParams.clientId}`);
    }
  }
  
  /**
   * Connect to the MQTT broker
   */
  public async connect(): Promise<void> {
    if (this.client && this.connectionStatus === ConnectionStatus.CONNECTED) {
      this.logger.debug('Already connected to MQTT broker');
      return;
    }
    
    try {
      this.setConnectionStatus(ConnectionStatus.CONNECTING);
      
      // Build MQTT client options
      const options: IClientOptions = {
        clientId: this.mqttParams.clientId,
        clean: this.mqttParams.clean !== false,
        connectTimeout: this.mqttParams.connectTimeout || 30000,
        reconnectPeriod: 0, // We handle reconnection ourselves
        keepalive: this.mqttParams.keepalive || 60,
        protocolVersion: this.mqttParams.protocolVersion || 4,
      };
      
      // Add authentication if provided
      if (this.mqttAuth.username) {
        options.username = this.mqttAuth.username;
        options.password = this.mqttAuth.password;
      }
      
      // Add TLS/SSL settings if enabled
      if (this.mqttAuth.tls?.enabled) {
        options.rejectUnauthorized = this.mqttAuth.tls.rejectUnauthorized !== false;
        
        // Add certificate details if provided
        if (this.mqttAuth.tls.ca) options.ca = this.mqttAuth.tls.ca;
        if (this.mqttAuth.tls.cert) options.cert = this.mqttAuth.tls.cert;
        if (this.mqttAuth.tls.key) options.key = this.mqttAuth.tls.key;
      }
      
      // Add Last Will and Testament if configured
      if (this.mqttParams.will) {
        options.will = {
          topic: this.mqttParams.will.topic,
          payload: this.mqttParams.will.payload,
          qos: this.mqttParams.will.qos || 0,
          retain: this.mqttParams.will.retain || false
        };
      }
      
      // Connect to the MQTT broker
      this.logger.info(`Connecting to MQTT broker at ${this.mqttParams.brokerUrl}`);
      
      // Create a promise that resolves when connected or rejects on error
      await new Promise<void>((resolve, reject) => {
        try {
          // Create MQTT client
          this.client = mqtt.connect(this.mqttParams.brokerUrl, options);
          
          // Set up event handlers
          this.client.on('connect', () => {
            this.logger.info(`Connected to MQTT broker at ${this.mqttParams.brokerUrl}`);
            this.setConnectionStatus(ConnectionStatus.CONNECTED);
            this.clearLastError();
            this.retryCount = 0;
            
            // Set up latency monitoring
            this.setupPingInterval();
            
            // Resolve the promise
            resolve();
          });
          
          this.client.on('error', (err) => {
            const errorMessage = `MQTT connection error: ${err.message}`;
            this.logger.error(errorMessage, err);
            
            this.setLastError(
              IntegrationErrorType.CONNECTION,
              errorMessage,
              err
            );
            
            // Reject the promise if we're still connecting
            if (this.connectionStatus === ConnectionStatus.CONNECTING) {
              reject(new Error(errorMessage));
            }
          });
          
          this.client.on('offline', () => {
            this.logger.warn('MQTT client went offline');
            this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
            
            // Attempt to reconnect if configured
            if (this.config.retry && this.config.retry.maxRetries !== 0) {
              this.reconnect().catch(err => {
                this.logger.error(`Failed to reconnect to MQTT broker: ${err.message}`, err);
              });
            }
          });
          
          this.client.on('reconnect', () => {
            this.logger.info('MQTT client attempting to reconnect');
            this.setConnectionStatus(ConnectionStatus.RECONNECTING);
          });
          
          this.client.on('close', () => {
            this.logger.info('MQTT connection closed');
            this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
            
            // Clear ping timer
            if (this.pingTimer) {
              clearInterval(this.pingTimer);
              this.pingTimer = null;
            }
          });
          
          this.client.on('message', (topic, payload, packet) => {
            this.handleMessage(topic, payload, packet);
          });
        } catch (err) {
          this.setLastError(
            IntegrationErrorType.CONNECTION,
            `Failed to create MQTT client: ${err.message}`,
            err
          );
          reject(err);
        }
      });
      
      // Test the connection
      const isConnected = await this.testConnection();
      if (!isConnected) {
        throw new Error('Connection test failed after connecting to MQTT broker');
      }
      
      this.logger.info('Successfully connected to MQTT broker');
      
    } catch (error) {
      this.setConnectionStatus(ConnectionStatus.ERROR);
      this.setLastError(
        IntegrationErrorType.CONNECTION,
        `Failed to connect to MQTT broker: ${error.message}`,
        error
      );
      
      // Cleanup failed connection attempt
      if (this.client) {
        this.client.end(true);
        this.client = null;
      }
      
      throw error;
    }
  }
  
  /**
   * Disconnect from the MQTT broker
   */
  public async disconnect(): Promise<void> {
    if (!this.client) {
      this.logger.debug('No active MQTT connection to disconnect');
      this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
      return;
    }
    
    try {
      this.logger.info('Disconnecting from MQTT broker');
      
      // Clear ping timer
      if (this.pingTimer) {
        clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      
      // End the client connection
      await new Promise<void>((resolve) => {
        if (!this.client) {
          resolve();
          return;
        }
        
        this.client.end(false, {}, () => {
          this.logger.info('Disconnected from MQTT broker');
          this.client = null;
          this.setConnectionStatus(ConnectionStatus.DISCONNECTED);
          resolve();
        });
      });
    } catch (error) {
      this.setLastError(
        IntegrationErrorType.CONNECTION,
        `Failed to disconnect from MQTT broker: ${error.message}`,
        error
      );
      throw error;
    }
  }
  
  /**
   * Send data to the MQTT broker by publishing to a topic
   * @param data The data to send
   * @param options Optional sending options
   */
  public async sendData<T>(
    data: IntegrationDataPacket<T>,
    options?: Record<string, unknown>
  ): Promise<void> {
    if (!this.client || this.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new Error('Cannot send data: Not connected to MQTT broker');
    }
    
    try {
      // Extract topic from options or use default
      const topic = (options?.topic as string) || `${this.config.id}/data/${data.source}`;
      
      // Transform data if needed
      const transformedData = await this.transformer.transform(data);
      
      // Validate the data
      await this.validator.validate(transformedData);
      
      // Create publish options
      const publishOptions: IClientPublishOptions = {
        qos: (options?.qos as 0 | 1 | 2) || this.mqttParams.qos || 0,
        retain: (options?.retain as boolean) || this.mqttParams.retain || false
      };
      
      // Convert data to JSON string
      const payload = JSON.stringify(transformedData);
      
      this.logger.debug(`Publishing MQTT message to topic ${topic}`, {
        topic,
        dataId: data.id,
        qos: publishOptions.qos
      });
      
      // Publish the message
      await new Promise<void>((resolve, reject) => {
        if (!this.client) {
          reject(new Error('MQTT client is not initialized'));
          return;
        }
        
        this.client.publish(topic, payload, publishOptions, (err) => {
          if (err) {
            this.logger.error(`Failed to publish MQTT message: ${err.message}`, err);
            reject(err);
          } else {
            this.logger.debug(`Successfully published MQTT message to ${topic}`);
            resolve();
          }
        });
      });
    } catch (error) {
      this.setLastError(
        IntegrationErrorType.COMMUNICATION,
        `Failed to send data: ${error.message}`,
        error
      );
      throw error;
    }
  }
  
  /**
   * Subscribe to data from the MQTT broker
   * @param callback Function to call when data is received
   * @param options Optional receiving options
   * @returns Subscription ID that can be used to unsubscribe
   */
  public async receiveData<T>(
    callback: (data: IntegrationDataPacket<T>) => void | Promise<void>,
    options?: Record<string, unknown>
  ): Promise<string> {
    if (!this.client || this.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new Error('Cannot subscribe: Not connected to MQTT broker');
    }
    
    try {
      // Extract topic from options
      const topic = options?.topic as string;
      if (!topic) {
        throw new Error('Topic is required for MQTT subscription');
      }
      
      // Create subscription options
      const subscribeOptions: IClientSubscribeOptions = {
        qos: (options?.qos as 0 | 1 | 2) || this.mqttParams.qos || 0
      };
      
      this.logger.debug(`Subscribing to MQTT topic: ${topic}`, {
        topic,
        qos: subscribeOptions.qos
      });
      
      // Generate subscription ID
      const subscriptionId = `${this.id}-${uuidv4()}`;
      
      // Store subscription information
      const subscription: MqttSubscription = {
        topic,
        callback: callback as (data: IntegrationDataPacket<unknown>) => void | Promise<void>,
        options: subscribeOptions
      };
      
      // Add to subscriptions map
      this.subscriptions.set(subscriptionId, subscription);
      
      // Subscribe to the topic
      await new Promise<void>((resolve, reject) => {
        if (!this.client) {
          reject(new Error('MQTT client is not initialized'));
          return;
        }
        
        this.client.subscribe(topic, subscribeOptions, (err) => {
          if (err) {
            this.logger.error(`Failed to subscribe to MQTT topic: ${err.message}`, err);
            this.subscriptions.delete(subscriptionId);
            reject(err);
          } else {
            this.logger.info(`Successfully subscribed to MQTT topic: ${topic}`);
            resolve();
          }
        });
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
   * Unsubscribe from a topic
   * @param subscriptionId The subscription ID to unsubscribe
   */
  public async unsubscribe(subscriptionId: string): Promise<void> {
    if (!this.client || this.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new Error('Cannot unsubscribe: Not connected to MQTT broker');
    }
    
    // Get subscription information
    const subscription = this.subscriptions.get(subscriptionId) as MqttSubscription;
    if (!subscription) {
      this.logger.warn(`Subscription not found: ${subscriptionId}`);
      return;
    }
    
    try {
      this.logger.debug(`Unsubscribing from MQTT topic: ${subscription.topic}`);
      
      // Unsubscribe from the topic
      await new Promise<void>((resolve, reject) => {
        if (!this.client) {
          reject(new Error('MQTT client is not initialized'));
          return;
        }
        
        this.client.unsubscribe(subscription.topic, (err) => {
          if (err) {
            this.logger.error(`Failed to unsubscribe from MQTT topic: ${err.message}`, err);
            reject(err);
          } else {
            this.logger.info(`Successfully unsubscribed from MQTT topic: ${subscription.topic}`);
            resolve();
          }
        });
      });
      
      // Remove from subscriptions map
      this.subscriptions.delete(subscriptionId);
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
   * Test the connection to the MQTT broker
   */
  public async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    
    try {
      // Check if client is connected
      const connected = this.client.connected;
      
      if (connected) {
        // Ping the broker to ensure the connection is responsive
        await this.measureLatency();
      }
      
      return connected;
    } catch (error) {
      this.logger.error(`Connection test failed: ${error.message}`, error);
      return false;
    }
  }
  
  /**
   * Get the connection latency in milliseconds
   */
  public async getLatency(): Promise<number> {
    if (!this.client || this.connectionStatus !== ConnectionStatus.CONNECTED) {
      return -1;
    }
    
    try {
      // Measure latency if we haven't done so recently
      if (Date.now() - this.lastPongTime > 5000) {
        await this.measureLatency();
      }
      
      return this.latencyValue;
    } catch (error) {
      this.logger.error(`Failed to measure latency: ${error.message}`, error);
      return -1;
    }
  }
  
  /**
   * Measure the latency to the MQTT broker
   */
  private async measureLatency(): Promise<void> {
    if (!this.client || this.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new Error('Cannot measure latency: Not connected to MQTT broker');
    }
    
    return new Promise<void>((resolve, reject) => {
      try {
        // Generate ping topic
        const pingTopic = `$SYS/${this.mqttParams.clientId}/ping/${Date.now()}`;
        const pongTopic = `$SYS/${this.mqttParams.clientId}/pong/${Date.now()}`;
        
        // Set up one-time pong handler
        const messageHandler = (topic: string, payload: Buffer) => {
          if (topic === pongTopic) {
            this.lastPongTime = Date.now();
            this.latencyValue = this.lastPongTime - this.lastPingTime;
            
            // Cleanup
            this.client?.unsubscribe(pongTopic);
            this.client?.removeListener('message', messageHandler);
            
            resolve();
          }
        };
        
        // Subscribe to pong topic
        this.client.subscribe(pongTopic, { qos: 0 }, (err) => {
          if (err) {
            reject(new Error(`Failed to subscribe to pong topic: ${err.message}`));
            return;
          }
          
          // Listen for pong message
          this.client?.on('message', messageHandler);
          
          // Send ping message
          this.lastPingTime = Date.now();
          this.client?.publish(pingTopic, 'ping', { qos: 0 }, (err) => {
            if (err) {
              // Cleanup and reject
              this.client?.unsubscribe(pongTopic);
              this.client?.removeListener('message', messageHandler);
              reject(new Error(`Failed to publish ping message: ${err.message}`));
            }
          });
          
          // Set timeout for latency measurement
          setTimeout(() => {
            // Cleanup
            this.client?.unsubscribe(pongTopic);
            this.client?.removeListener('message', messageHandler);
            
            // If we didn't get a pong, use a high latency value
            if (Date.now() - this.lastPongTime > 5000) {
              this.latencyValue = 5000;
            }
            
            resolve();
          }, 5000);
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Setup ping interval for latency monitoring
   */
  private setupPingInterval(): void {
    // Clear existing ping timer
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }
    
    // Set up ping interval (every 30 seconds)
    this.pingTimer = setInterval(() => {
      if (this.client && this.connectionStatus === ConnectionStatus.CONNECTED) {
        this.measureLatency().catch(err => {
          this.logger.warn(`Failed to measure MQTT latency: ${err.message}`);
        });
      }
    }, 30000);
  }
  
  /**
   * Handle incoming MQTT messages
   * @param topic The topic the message was received on
   * @param payload The message payload
   * @param packet The MQTT packet information
   */
  private handleMessage(topic: string, payload: Buffer, packet: mqtt.IPublishPacket): void {
    try {
      // Skip internal ping/pong messages
      if (topic.startsWith(`$SYS/${this.mqttParams.clientId}/`)) {
        return;
      }
      
      this.logger.debug(`Received MQTT message on topic: ${topic}`, {
        topic,
        qos: packet.qos,
        retain: packet.retain
      });
      
      // Parse the payload
      let data: IntegrationDataPacket<unknown>;
      try {
        data = JSON.parse(payload.toString());
      } catch (error) {
        // If payload isn't valid JSON, wrap it in a data packet
        data = {
          id: uuidv4(),
          source: topic,
          timestamp: new Date(),
          payload: payload.toString(),
          metadata: {
            topic,
            qos: packet.qos,
            retain: packet.retain
          }
        };
      }
      
      // Find all subscriptions matching this topic
      for (const [subscriptionId, subscription] of this.subscriptions.entries()) {
        const mqttSubscription = subscription as MqttSubscription;
        
        // Check if topic matches the subscription
        if (this.topicMatches(topic, mqttSubscription.topic)) {
          // Invoke the callback
          try {
            mqttSubscription.callback(data);
          } catch (error) {
            this.logger.error(`Error in MQTT subscription callback: ${error.message}`, error, {
              subscriptionId,
              topic
            });
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error processing MQTT message: ${error.message}`, error, {
        topic
      });
    }
  }
  
  /**
   * Check if a topic matches a topic pattern
   * @param actualTopic The actual topic
   * @param topicPattern The topic pattern with wildcards
   * @returns Whether the topic matches the pattern
   */
  private topicMatches(actualTopic: string, topicPattern: string): boolean {
    // Split topics into segments
    const actual = actualTopic.split('/');
    const pattern = topicPattern.split('/');
    
    // Different lengths, no match (unless pattern ends with #)
    if (actual.length !== pattern.length) {
      if (pattern[pattern.length - 1] === '#') {
        // # matches zero or more levels
        if (actual.length < pattern.length - 1) {
          return false;
        }
      } else {
        return false;
      }
    }
    
    // Compare each segment
    for (let i = 0; i < pattern.length; i++) {
      // Multi-level wildcard (#)
      if (pattern[i] === '#') {
        return true;
      }
      
      // Single-level wildcard (+) or exact match
      if (pattern[i] !== '+' && pattern[i] !== actual[i]) {
        return false;
      }
    }
    
    return true;
  }
}