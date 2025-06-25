/**
 * MQTT Service for IoT Sensor Data Collection
 * 
 * Production-ready MQTT integration with:
 * - Automatic reconnection
 * - Message queue and buffering
 * - Data transformation and validation
 * - Security (TLS, authentication)
 * - Dead letter queue
 * - Monitoring and alerting
 */

import mqtt, { MqttClient, IClientOptions, IClientPublishOptions } from 'mqtt';
import { EventEmitter } from 'events';
import { z } from 'zod';
import { prisma } from '@/lib/database';
import { logger } from '@/lib/logger';

// Sensor data validation schema
const SensorDataSchema = z.object({
  sensorId: z.string(),
  timestamp: z.string().datetime().or(z.number()),
  value: z.number(),
  unit: z.string().optional(),
  quality: z.number().min(0).max(100).default(100),
  metadata: z.record(z.any()).optional()
});

const BatchSensorDataSchema = z.array(SensorDataSchema);

// MQTT configuration interface
export interface MqttConfig {
  brokerUrl: string;
  clientId?: string;
  username?: string;
  password?: string;
  tls?: {
    enabled: boolean;
    ca?: string;
    cert?: string;
    key?: string;
    rejectUnauthorized?: boolean;
  };
  reconnectPeriod?: number;
  connectTimeout?: number;
  keepalive?: number;
  qos?: 0 | 1 | 2;
  clean?: boolean;
  will?: {
    topic: string;
    payload: string;
    qos?: 0 | 1 | 2;
    retain?: boolean;
  };
  topics?: {
    sensors?: string[];
    commands?: string;
    status?: string;
    deadLetter?: string;
  };
  buffer?: {
    maxSize?: number;
    flushInterval?: number;
  };
}

// Message buffer item
interface BufferedMessage {
  id: string;
  topic: string;
  payload: any;
  timestamp: Date;
  retryCount: number;
  error?: string;
}

// Service status
export enum ServiceStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export class MqttService extends EventEmitter {
  private client: MqttClient | null = null;
  private config: Required<MqttConfig>;
  private status: ServiceStatus = ServiceStatus.DISCONNECTED;
  private messageBuffer: BufferedMessage[] = [];
  private deadLetterQueue: BufferedMessage[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private metrics = {
    messagesReceived: 0,
    messagesProcessed: 0,
    messagesFailed: 0,
    reconnections: 0,
    lastMessageTime: null as Date | null
  };

  constructor(config: MqttConfig) {
    super();
    
    // Set default configuration
    this.config = {
      brokerUrl: config.brokerUrl,
      clientId: config.clientId || `map-mqtt-${Date.now()}`,
      username: config.username || '',
      password: config.password || '',
      tls: config.tls || { enabled: false },
      reconnectPeriod: config.reconnectPeriod || 5000,
      connectTimeout: config.connectTimeout || 30000,
      keepalive: config.keepalive || 60,
      qos: config.qos || 1,
      clean: config.clean !== false,
      will: config.will,
      topics: {
        sensors: config.topics?.sensors || ['sensors/+/data', 'sensors/+/telemetry'],
        commands: config.topics?.commands || 'commands/+',
        status: config.topics?.status || 'status/+',
        deadLetter: config.topics?.deadLetter || 'deadletter/sensors'
      },
      buffer: {
        maxSize: config.buffer?.maxSize || 10000,
        flushInterval: config.buffer?.flushInterval || 5000
      }
    };
  }

  /**
   * Connect to MQTT broker
   */
  async connect(): Promise<void> {
    if (this.status === ServiceStatus.CONNECTED) {
      logger.info('MQTT service already connected');
      return;
    }

    this.status = ServiceStatus.CONNECTING;
    this.emit('status', this.status);

    try {
      const options: IClientOptions = {
        clientId: this.config.clientId,
        username: this.config.username,
        password: this.config.password,
        clean: this.config.clean,
        connectTimeout: this.config.connectTimeout,
        keepalive: this.config.keepalive,
        reconnectPeriod: this.config.reconnectPeriod,
        rejectUnauthorized: this.config.tls?.rejectUnauthorized !== false
      };

      // Add TLS configuration if enabled
      if (this.config.tls?.enabled) {
        if (this.config.tls.ca) options.ca = this.config.tls.ca;
        if (this.config.tls.cert) options.cert = this.config.tls.cert;
        if (this.config.tls.key) options.key = this.config.tls.key;
      }

      // Add will message if configured
      if (this.config.will) {
        options.will = this.config.will;
      }

      // Create MQTT client
      this.client = mqtt.connect(this.config.brokerUrl, options);

      // Set up event handlers
      this.setupEventHandlers();

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, this.config.connectTimeout);

        this.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Start buffer flush timer
      this.startBufferFlushTimer();

    } catch (error) {
      this.status = ServiceStatus.ERROR;
      this.emit('status', this.status);
      logger.error('Failed to connect to MQTT broker:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    // Stop buffer flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining messages
    await this.flushBuffer();

    // Disconnect client
    return new Promise((resolve) => {
      this.client?.end(false, {}, () => {
        this.client = null;
        this.status = ServiceStatus.DISCONNECTED;
        this.emit('status', this.status);
        logger.info('MQTT service disconnected');
        resolve();
      });
    });
  }

  /**
   * Subscribe to sensor topics
   */
  async subscribeSensorTopics(): Promise<void> {
    if (!this.client || this.status !== ServiceStatus.CONNECTED) {
      throw new Error('MQTT client not connected');
    }

    const topics = this.config.topics?.sensors || [];
    
    for (const topic of topics) {
      await new Promise<void>((resolve, reject) => {
        this.client?.subscribe(topic, { qos: this.config.qos }, (err) => {
          if (err) {
            logger.error(`Failed to subscribe to topic ${topic}:`, err);
            reject(err);
          } else {
            logger.info(`Subscribed to topic: ${topic}`);
            resolve();
          }
        });
      });
    }
  }

  /**
   * Publish message to topic
   */
  async publish(topic: string, payload: any, options?: IClientPublishOptions): Promise<void> {
    if (!this.client || this.status !== ServiceStatus.CONNECTED) {
      throw new Error('MQTT client not connected');
    }

    const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const pubOptions = {
      qos: this.config.qos,
      retain: false,
      ...options
    };

    return new Promise((resolve, reject) => {
      this.client?.publish(topic, message, pubOptions, (err) => {
        if (err) {
          logger.error(`Failed to publish to topic ${topic}:`, err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      status: this.status,
      bufferSize: this.messageBuffer.length,
      deadLetterQueueSize: this.deadLetterQueue.length,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  /**
   * Get dead letter queue messages
   */
  getDeadLetterQueue(): BufferedMessage[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }

  /**
   * Retry dead letter queue messages
   */
  async retryDeadLetterQueue(): Promise<void> {
    const messages = [...this.deadLetterQueue];
    this.deadLetterQueue = [];

    for (const message of messages) {
      this.messageBuffer.push({
        ...message,
        retryCount: 0,
        error: undefined
      });
    }

    await this.flushBuffer();
  }

  /**
   * Set up MQTT client event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      this.status = ServiceStatus.CONNECTED;
      this.reconnectAttempts = 0;
      this.emit('status', this.status);
      this.emit('connected');
      logger.info('Connected to MQTT broker');

      // Subscribe to topics
      this.subscribeSensorTopics().catch(err => {
        logger.error('Failed to subscribe to topics:', err);
      });
    });

    this.client.on('reconnect', () => {
      this.status = ServiceStatus.RECONNECTING;
      this.reconnectAttempts++;
      this.metrics.reconnections++;
      this.emit('status', this.status);
      logger.info(`Reconnecting to MQTT broker (attempt ${this.reconnectAttempts})`);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        logger.error('Max reconnection attempts reached');
        this.client?.end(true);
        this.status = ServiceStatus.ERROR;
        this.emit('status', this.status);
        this.emit('error', new Error('Max reconnection attempts reached'));
      }
    });

    this.client.on('disconnect', () => {
      this.status = ServiceStatus.DISCONNECTED;
      this.emit('status', this.status);
      this.emit('disconnected');
      logger.warn('Disconnected from MQTT broker');
    });

    this.client.on('error', (error) => {
      logger.error('MQTT client error:', error);
      this.emit('error', error);
    });

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload);
    });
  }

  /**
   * Handle incoming MQTT message
   */
  private async handleMessage(topic: string, payload: Buffer): Promise<void> {
    this.metrics.messagesReceived++;
    this.metrics.lastMessageTime = new Date();

    try {
      // Parse message
      const message = payload.toString();
      let data: any;

      try {
        data = JSON.parse(message);
      } catch {
        // If not JSON, wrap in object
        data = { value: message, raw: true };
      }

      // Add to buffer
      const bufferedMessage: BufferedMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
        topic,
        payload: data,
        timestamp: new Date(),
        retryCount: 0
      };

      this.messageBuffer.push(bufferedMessage);

      // Check buffer size
      if (this.messageBuffer.length >= this.config.buffer!.maxSize!) {
        await this.flushBuffer();
      }

      // Emit message event
      this.emit('message', { topic, data });

    } catch (error) {
      logger.error('Error handling MQTT message:', error);
      this.metrics.messagesFailed++;
    }
  }

  /**
   * Start buffer flush timer
   */
  private startBufferFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushBuffer().catch(err => {
        logger.error('Error flushing buffer:', err);
      });
    }, this.config.buffer!.flushInterval!);
  }

  /**
   * Flush message buffer to database
   */
  private async flushBuffer(): Promise<void> {
    if (this.messageBuffer.length === 0) {
      return;
    }

    const messages = [...this.messageBuffer];
    this.messageBuffer = [];

    const failedMessages: BufferedMessage[] = [];

    for (const message of messages) {
      try {
        await this.processMessage(message);
        this.metrics.messagesProcessed++;
      } catch (error) {
        logger.error(`Failed to process message ${message.id}:`, error);
        this.metrics.messagesFailed++;
        
        message.retryCount++;
        message.error = error instanceof Error ? error.message : 'Unknown error';

        if (message.retryCount < 3) {
          failedMessages.push(message);
        } else {
          // Move to dead letter queue
          this.deadLetterQueue.push(message);
          
          // Publish to dead letter topic if configured
          if (this.config.topics?.deadLetter && this.client && this.status === ServiceStatus.CONNECTED) {
            try {
              await this.publish(this.config.topics.deadLetter, {
                originalTopic: message.topic,
                message: message.payload,
                error: message.error,
                timestamp: message.timestamp,
                retryCount: message.retryCount
              });
            } catch (err) {
              logger.error('Failed to publish to dead letter queue:', err);
            }
          }
        }
      }
    }

    // Add failed messages back to buffer for retry
    this.messageBuffer.unshift(...failedMessages);
  }

  /**
   * Process a single message
   */
  private async processMessage(message: BufferedMessage): Promise<void> {
    // Extract sensor data based on topic pattern
    const topicParts = message.topic.split('/');
    let sensorData: any;

    // Handle different topic patterns
    if (message.topic.match(/^sensors\/[\w-]+\/data$/)) {
      // Topic format: sensors/{sensorId}/data
      const sensorId = topicParts[1];
      
      // Validate and transform data
      if (Array.isArray(message.payload)) {
        // Batch data
        const validatedData = BatchSensorDataSchema.parse(
          message.payload.map(item => ({
            ...item,
            sensorId: item.sensorId || sensorId
          }))
        );
        sensorData = validatedData;
      } else {
        // Single data point
        const validatedData = SensorDataSchema.parse({
          ...message.payload,
          sensorId: message.payload.sensorId || sensorId
        });
        sensorData = [validatedData];
      }
    } else if (message.topic.match(/^sensors\/[\w-]+\/telemetry$/)) {
      // Topic format: sensors/{sensorId}/telemetry
      const sensorId = topicParts[1];
      
      // Transform telemetry data to sensor data format
      sensorData = [{
        sensorId,
        timestamp: message.payload.timestamp || new Date().toISOString(),
        value: message.payload.value,
        unit: message.payload.unit,
        quality: message.payload.quality || 100,
        metadata: {
          ...message.payload,
          source: 'telemetry',
          topic: message.topic
        }
      }];
    } else {
      // Generic sensor data
      if (Array.isArray(message.payload)) {
        sensorData = BatchSensorDataSchema.parse(message.payload);
      } else {
        sensorData = [SensorDataSchema.parse(message.payload)];
      }
    }

    // Store in database
    await this.storeSensorData(sensorData);
  }

  /**
   * Store sensor data in database
   */
  private async storeSensorData(sensorData: z.infer<typeof SensorDataSchema>[]): Promise<void> {
    // Map sensor data to metric format
    const metrics = sensorData.map(data => ({
      id: `mqtt-${data.sensorId}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      workUnitId: data.metadata?.workUnitId || 'mqtt-sensors',
      name: `sensor.${data.sensorId}`,
      value: data.value,
      unit: data.unit,
      timestamp: typeof data.timestamp === 'number' 
        ? new Date(data.timestamp) 
        : new Date(data.timestamp),
      source: 'mqtt',
      quality: data.quality,
      tags: {
        sensorId: data.sensorId,
        ...(data.metadata || {})
      }
    }));

    // Insert metrics in batch
    await prisma.metric.createMany({
      data: metrics,
      skipDuplicates: true
    });

    // Emit data stored event
    this.emit('dataStored', { count: metrics.length, sensorData });
  }
}

// Export singleton instance
let mqttService: MqttService | null = null;

export function getMqttService(config?: MqttConfig): MqttService {
  if (!mqttService && config) {
    mqttService = new MqttService(config);
  }
  
  if (!mqttService) {
    throw new Error('MQTT service not initialized');
  }
  
  return mqttService;
}