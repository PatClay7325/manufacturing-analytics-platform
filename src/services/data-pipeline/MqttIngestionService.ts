import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { Pool } from 'pg';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { circuitBreakers, RetryManager, RetryStrategy } from '@/lib/resilience';
import { EnhancedError, ErrorCategory, ErrorSeverity } from '@/lib/enhanced-error/EnhancedError';

// Data schemas
const SensorDataSchema = z.object({
  equipmentId: z.string().uuid(),
  sensorName: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  quality: z.enum(['good', 'uncertain', 'bad']).default('good'),
  timestamp: z.string().datetime().optional(),
});

const MetricDataSchema = z.object({
  equipmentId: z.string().uuid(),
  metrics: z.object({
    oee: z.number().min(0).max(100).optional(),
    availability: z.number().min(0).max(100).optional(),
    performance: z.number().min(0).max(100).optional(),
    quality: z.number().min(0).max(100).optional(),
    productionCount: z.number().min(0).optional(),
    goodCount: z.number().min(0).optional(),
    rejectCount: z.number().min(0).optional(),
  }),
  tags: z.record(z.string()).optional(),
  timestamp: z.string().datetime().optional(),
});

const StatusUpdateSchema = z.object({
  equipmentId: z.string().uuid(),
  status: z.enum(['running', 'stopped', 'maintenance', 'error']),
  reason: z.string().optional(),
  timestamp: z.string().datetime().optional(),
});

const DowntimeEventSchema = z.object({
  equipmentId: z.string().uuid(),
  eventType: z.enum(['start', 'end']),
  reason: z.string(),
  category: z.string(),
  timestamp: z.string().datetime().optional(),
});

export interface MqttIngestionConfig {
  mqttUrl: string;
  mqttUsername?: string;
  mqttPassword?: string;
  postgresUrl: string;
  topics: {
    sensors: string;
    metrics: string;
    status: string;
    downtime: string;
  };
  batchSize: number;
  flushInterval: number;
}

export class MqttIngestionService {
  private mqttClient: MqttClient | null = null;
  private pgPool: Pool;
  private config: MqttIngestionConfig;
  private buffer: Map<string, any[]> = new Map();
  private flushTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private readonly RECONNECT_INTERVAL = 5000;
  private retryManager: RetryManager;
  private metrics = {
    messagesReceived: 0,
    messagesProcessed: 0,
    messagesFailed: 0,
    batchesInserted: 0,
    lastFlush: new Date(),
    circuitBreakerTrips: 0,
    retriesAttempted: 0,
    totalErrors: 0,
  };

  constructor(config: MqttIngestionConfig) {
    this.config = config;
    
    // Initialize PostgreSQL connection pool
    this.pgPool = new Pool({
      connectionString: config.postgresUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Initialize retry manager
    this.retryManager = new RetryManager({
      maxAttempts: 3,
      strategy: RetryStrategy.EXPONENTIAL,
      baseDelay: 1000,
      maxDelay: 10000,
      retryableErrors: ['ConnectionError', 'TimeoutError', 'NetworkError'],
      name: 'MqttIngestion',
      onRetry: (attempt, error) => {
        this.metrics.retriesAttempted++;
        logger.warn('Retrying MQTT ingestion operation', {
          attempt,
          error: error.message,
          component: 'MqttIngestionService',
        });
      },
    });

    // Initialize buffers for each data type
    this.buffer.set('sensors', []);
    this.buffer.set('metrics', []);
    this.buffer.set('status', []);
    this.buffer.set('downtime', []);
  }

  /**
   * Start the MQTT ingestion service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('MQTT ingestion service is already running');
      return;
    }

    try {
      // Test database connection with circuit breaker
      await circuitBreakers.database.execute(async () => {
        await this.pgPool.query('SELECT 1');
      });
      logger.info('Database connection established');

      // Connect to MQTT broker with retry logic
      await this.retryManager.execute(async () => {
        await this.connectMqtt();
      });

      // Start periodic flush
      this.startPeriodicFlush();

      this.isRunning = true;
      logger.info('MQTT ingestion service started successfully');
    } catch (error) {
      const enhancedError = EnhancedError.system(
        'Failed to start MQTT ingestion service',
        ErrorSeverity.CRITICAL,
        {
          component: 'MqttIngestionService',
          operation: 'start',
        },
        error as Error
      );
      
      this.metrics.totalErrors++;
      throw enhancedError;
    }
  }

  /**
   * Stop the MQTT ingestion service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping MQTT ingestion service...');

    // Stop periodic flush
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining data
    await this.flushAllBuffers();

    // Disconnect MQTT
    if (this.mqttClient) {
      this.mqttClient.end();
      this.mqttClient = null;
    }

    // Close database pool
    await this.pgPool.end();

    this.isRunning = false;
    logger.info('MQTT ingestion service stopped');
  }

  /**
   * Connect to MQTT broker
   */
  private async connectMqtt(): Promise<void> {
    const options: IClientOptions = {
      clean: true,
      connectTimeout: 30000,
      clientId: `manufacturing-ingestion-${Date.now()}`,
      username: this.config.mqttUsername,
      password: this.config.mqttPassword,
      reconnectPeriod: this.RECONNECT_INTERVAL,
      will: {
        topic: 'manufacturing/ingestion/status',
        payload: JSON.stringify({
          status: 'offline',
          timestamp: new Date().toISOString(),
        }),
        qos: 1,
        retain: true,
      },
    };

    return new Promise((resolve, reject) => {
      this.mqttClient = mqtt.connect(this.config.mqttUrl, options);

      this.mqttClient.on('connect', () => {
        logger.info('Connected to MQTT broker');
        this.reconnectAttempts = 0;
        
        // Subscribe to topics
        const topics = Object.values(this.config.topics);
        this.mqttClient!.subscribe(topics, { qos: 1 }, (err) => {
          if (err) {
            logger.error('Failed to subscribe to topics:', err);
            reject(err);
          } else {
            logger.info('Subscribed to topics:', topics);
            
            // Publish online status
            this.mqttClient!.publish(
              'manufacturing/ingestion/status',
              JSON.stringify({
                status: 'online',
                timestamp: new Date().toISOString(),
              }),
              { qos: 1, retain: true }
            );
            
            resolve();
          }
        });
      });

      this.mqttClient.on('message', this.handleMessage.bind(this));

      this.mqttClient.on('error', (error) => {
        logger.error('MQTT error:', error);
      });

      this.mqttClient.on('offline', () => {
        logger.warn('MQTT client offline');
      });

      this.mqttClient.on('reconnect', () => {
        this.reconnectAttempts++;
        if (this.reconnectAttempts > this.MAX_RECONNECT_ATTEMPTS) {
          logger.error('Max reconnection attempts reached');
          this.mqttClient!.end();
          reject(new Error('Failed to connect to MQTT broker'));
        } else {
          logger.info(`Reconnecting to MQTT broker (attempt ${this.reconnectAttempts})`);
        }
      });
    });
  }

  /**
   * Handle incoming MQTT messages
   */
  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    this.metrics.messagesReceived++;

    try {
      const payload = JSON.parse(message.toString());
      
      // Route message based on topic
      if (topic.includes('sensors')) {
        await this.handleSensorData(payload);
      } else if (topic.includes('metrics')) {
        await this.handleMetricData(payload);
      } else if (topic.includes('status')) {
        await this.handleStatusUpdate(payload);
      } else if (topic.includes('downtime')) {
        await this.handleDowntimeEvent(payload);
      } else {
        logger.warn(`Unknown topic: ${topic}`);
      }

      this.metrics.messagesProcessed++;
    } catch (error) {
      this.metrics.messagesFailed++;
      logger.error(`Error processing message from ${topic}:`, error);
    }
  }

  /**
   * Handle sensor data
   */
  private async handleSensorData(data: unknown): Promise<void> {
    try {
      const validated = SensorDataSchema.parse(data);
      const timestamp = validated.timestamp ? new Date(validated.timestamp) : new Date();
      
      this.buffer.get('sensors')!.push({
        timestamp,
        equipment_id: validated.equipmentId,
        sensor_name: validated.sensorName,
        sensor_value: validated.value,
        unit: validated.unit,
        quality: validated.quality,
      });

      // Check if buffer should be flushed
      if (this.buffer.get('sensors')!.length >= this.config.batchSize) {
        await this.flushBuffer('sensors');
      }
    } catch (error) {
      logger.error('Invalid sensor data:', error);
    }
  }

  /**
   * Handle metric data
   */
  private async handleMetricData(data: unknown): Promise<void> {
    try {
      const validated = MetricDataSchema.parse(data);
      const timestamp = validated.timestamp ? new Date(validated.timestamp) : new Date();
      const tags = JSON.stringify(validated.tags || {});

      // Create individual metric records
      const metricRecords: any[] = [];
      
      for (const [metricName, value] of Object.entries(validated.metrics)) {
        if (value !== undefined && value !== null) {
          metricRecords.push({
            timestamp,
            equipment_id: validated.equipmentId,
            metric_name: metricName.replace(/([A-Z])/g, '_$1').toLowerCase(), // camelCase to snake_case
            metric_value: value,
            tags,
          });
        }
      }

      this.buffer.get('metrics')!.push(...metricRecords);

      // Check if buffer should be flushed
      if (this.buffer.get('metrics')!.length >= this.config.batchSize) {
        await this.flushBuffer('metrics');
      }
    } catch (error) {
      logger.error('Invalid metric data:', error);
    }
  }

  /**
   * Handle status updates
   */
  private async handleStatusUpdate(data: unknown): Promise<void> {
    try {
      const validated = StatusUpdateSchema.parse(data);
      const timestamp = validated.timestamp ? new Date(validated.timestamp) : new Date();
      
      this.buffer.get('status')!.push({
        timestamp,
        equipment_id: validated.equipmentId,
        status: validated.status,
        reason: validated.reason,
      });

      // Status updates are more critical, flush immediately
      await this.flushBuffer('status');
    } catch (error) {
      logger.error('Invalid status update:', error);
    }
  }

  /**
   * Handle downtime events
   */
  private async handleDowntimeEvent(data: unknown): Promise<void> {
    try {
      const validated = DowntimeEventSchema.parse(data);
      const timestamp = validated.timestamp ? new Date(validated.timestamp) : new Date();
      
      if (validated.eventType === 'start') {
        // Insert new downtime event
        await this.pgPool.query(
          `INSERT INTO downtime_events (equipment_id, start_time, reason_category, reason_detail)
           VALUES ($1, $2, $3, $4)`,
          [validated.equipmentId, timestamp, validated.category, validated.reason]
        );
      } else {
        // Update end time for most recent downtime event
        await this.pgPool.query(
          `UPDATE downtime_events 
           SET end_time = $1, updated_at = NOW()
           WHERE equipment_id = $2 AND end_time IS NULL
           ORDER BY start_time DESC
           LIMIT 1`,
          [timestamp, validated.equipmentId]
        );
      }
    } catch (error) {
      logger.error('Error handling downtime event:', error);
    }
  }

  /**
   * Flush a specific buffer to database
   */
  private async flushBuffer(bufferType: string): Promise<void> {
    const buffer = this.buffer.get(bufferType);
    if (!buffer || buffer.length === 0) {
      return;
    }

    const records = [...buffer];
    buffer.length = 0; // Clear buffer

    try {
      // Use circuit breaker for database operations
      await circuitBreakers.database.execute(async () => {
        switch (bufferType) {
          case 'sensors':
            await this.insertSensorData(records);
            break;
          case 'metrics':
            await this.insertMetricData(records);
            break;
          case 'status':
            await this.insertStatusData(records);
            break;
        }
      });

      this.metrics.batchesInserted++;
      this.metrics.lastFlush = new Date();
      
      logger.debug(`Successfully flushed ${records.length} ${bufferType} records`);
    } catch (error) {
      this.metrics.totalErrors++;
      
      // Check if circuit breaker is open
      const circuitBreakerMetrics = circuitBreakers.database.getMetrics();
      if (circuitBreakerMetrics.state === 'OPEN') {
        this.metrics.circuitBreakerTrips++;
        logger.error(`Database circuit breaker is open, cannot flush ${bufferType} buffer`, {
          bufferType,
          recordCount: records.length,
          circuitBreakerState: circuitBreakerMetrics.state,
        });
      }

      const enhancedError = EnhancedError.database(
        `Error flushing ${bufferType} buffer`,
        {
          component: 'MqttIngestionService',
          operation: 'flushBuffer',
          additionalData: {
            bufferType,
            recordCount: records.length,
            circuitBreakerState: circuitBreakerMetrics.state,
          },
        },
        error as Error
      );

      logger.error('Buffer flush failed', enhancedError.metadata);

      // Put records back in buffer for retry, but limit buffer size to prevent memory issues
      const maxBufferSize = this.config.batchSize * 10; // Allow 10x batch size
      if (buffer.length + records.length <= maxBufferSize) {
        buffer.push(...records);
        logger.warn(`Records returned to buffer for retry`, {
          bufferType,
          recordsReturned: records.length,
          currentBufferSize: buffer.length,
        });
      } else {
        logger.error(`Buffer overflow detected, dropping ${records.length} records`, {
          bufferType,
          recordsDropped: records.length,
          maxBufferSize,
        });
      }
    }
  }

  /**
   * Insert sensor data in batch
   */
  private async insertSensorData(records: any[]): Promise<void> {
    if (records.length === 0) return;

    const query = `
      INSERT INTO sensor_readings (timestamp, equipment_id, sensor_name, sensor_value, unit, quality)
      VALUES ${records.map((_, i) => `($${i * 6 + 1}, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6})`).join(', ')}
      ON CONFLICT DO NOTHING
    `;

    const values = records.flatMap(r => [
      r.timestamp,
      r.equipment_id,
      r.sensor_name,
      r.sensor_value,
      r.unit,
      r.quality,
    ]);

    await this.pgPool.query(query, values);
    logger.debug(`Inserted ${records.length} sensor readings`);
  }

  /**
   * Insert metric data in batch
   */
  private async insertMetricData(records: any[]): Promise<void> {
    if (records.length === 0) return;

    const query = `
      INSERT INTO manufacturing_metrics (timestamp, equipment_id, metric_name, metric_value, tags)
      VALUES ${records.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(', ')}
      ON CONFLICT DO NOTHING
    `;

    const values = records.flatMap(r => [
      r.timestamp,
      r.equipment_id,
      r.metric_name,
      r.metric_value,
      r.tags,
    ]);

    await this.pgPool.query(query, values);
    logger.debug(`Inserted ${records.length} metrics`);
  }

  /**
   * Insert status data in batch
   */
  private async insertStatusData(records: any[]): Promise<void> {
    if (records.length === 0) return;

    const query = `
      INSERT INTO equipment_status (timestamp, equipment_id, status, reason)
      VALUES ${records.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', ')}
      ON CONFLICT DO NOTHING
    `;

    const values = records.flatMap(r => [
      r.timestamp,
      r.equipment_id,
      r.status,
      r.reason,
    ]);

    await this.pgPool.query(query, values);
    logger.debug(`Inserted ${records.length} status updates`);
  }

  /**
   * Flush all buffers
   */
  private async flushAllBuffers(): Promise<void> {
    const bufferTypes = ['sensors', 'metrics', 'status'];
    await Promise.all(bufferTypes.map(type => this.flushBuffer(type)));
  }

  /**
   * Start periodic buffer flush
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushAllBuffers();
    }, this.config.flushInterval);
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      bufferSizes: {
        sensors: this.buffer.get('sensors')?.length || 0,
        metrics: this.buffer.get('metrics')?.length || 0,
        status: this.buffer.get('status')?.length || 0,
        downtime: this.buffer.get('downtime')?.length || 0,
      },
      isRunning: this.isRunning,
      mqttConnected: this.mqttClient?.connected || false,
    };
  }
}

// Export singleton instance with default configuration
export const mqttIngestionService = new MqttIngestionService({
  mqttUrl: process.env.MQTT_URL || 'mqtt://localhost:1883',
  mqttUsername: process.env.MQTT_USERNAME,
  mqttPassword: process.env.MQTT_PASSWORD,
  postgresUrl: process.env.DATABASE_URL || 'postgresql://analytics:development_password@localhost:5433/manufacturing',
  topics: {
    sensors: 'manufacturing/+/sensors/+',
    metrics: 'manufacturing/+/metrics',
    status: 'manufacturing/+/status',
    downtime: 'manufacturing/+/downtime',
  },
  batchSize: 100,
  flushInterval: 5000, // 5 seconds
});