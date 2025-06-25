#!/usr/bin/env ts-node
/**
 * Phase 3: Real-Time Data Pipeline
 * Implements MQTT broker, OPC-UA gateway, and data validation pipeline
 */

import * as mqtt from 'mqtt';
import { open as opcua } from 'node-opcua';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import Bull from 'bull';
import Redis from 'ioredis';

// =====================================================
// DATA VALIDATION SCHEMAS
// =====================================================

const SensorDataSchema = z.object({
  equipmentId: z.string().uuid(),
  sensorId: z.string(),
  timestamp: z.string().datetime(),
  value: z.number(),
  unit: z.string(),
  quality: z.enum(['GOOD', 'BAD', 'UNCERTAIN']).default('GOOD')
});

const ProductionEventSchema = z.object({
  equipmentId: z.string().uuid(),
  eventType: z.enum(['START', 'STOP', 'CHANGEOVER', 'MAINTENANCE']),
  timestamp: z.string().datetime(),
  productCode: z.string().optional(),
  operatorId: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const QualityEventSchema = z.object({
  equipmentId: z.string().uuid(),
  productCode: z.string(),
  timestamp: z.string().datetime(),
  defectCode: z.string(),
  quantity: z.number().int().positive(),
  severity: z.number().int().min(1).max(5),
  isRework: z.boolean().default(false)
});

// =====================================================
// CIRCULAR BUFFER FOR BATCH PROCESSING
// =====================================================

class CircularBuffer<T> {
  private buffer: T[] = [];
  private maxSize: number;
  private flushCallback: (items: T[]) => Promise<void>;
  private flushInterval: NodeJS.Timeout;

  constructor(
    maxSize: number,
    flushIntervalMs: number,
    flushCallback: (items: T[]) => Promise<void>
  ) {
    this.maxSize = maxSize;
    this.flushCallback = flushCallback;
    
    // Auto-flush on interval
    this.flushInterval = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, flushIntervalMs);
  }

  push(item: T) {
    this.buffer.push(item);
    if (this.buffer.length >= this.maxSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;
    
    const items = [...this.buffer];
    this.buffer = [];
    
    try {
      await this.flushCallback(items);
    } catch (error) {
      console.error('Flush failed, returning items to buffer:', error);
      this.buffer.unshift(...items);
    }
  }

  drain(): T[] {
    const items = [...this.buffer];
    this.buffer = [];
    return items;
  }

  destroy() {
    clearInterval(this.flushInterval);
  }
}

// =====================================================
// DATA VALIDATION ENGINE
// =====================================================

interface ValidationRule {
  name: string;
  check: (data: any) => boolean;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

class DataValidator {
  private rules: Map<string, ValidationRule[]> = new Map();

  constructor() {
    this.initializeRules();
  }

  private initializeRules() {
    // OEE validation rules
    this.rules.set('oee', [
      {
        name: 'oee_bounds',
        check: (data) => data.value >= 0 && data.value <= 1,
        severity: 'critical',
        message: 'OEE must be between 0 and 1'
      },
      {
        name: 'oee_realistic',
        check: (data) => data.value <= 0.85,
        severity: 'warning',
        message: 'OEE above 85% is unusually high'
      }
    ]);

    // Temperature validation rules
    this.rules.set('temperature', [
      {
        name: 'temperature_range',
        check: (data) => data.value >= -50 && data.value <= 500,
        severity: 'critical',
        message: 'Temperature out of realistic range'
      },
      {
        name: 'temperature_spike',
        check: (data) => Math.abs(data.value - (data.previousValue || data.value)) < 50,
        severity: 'warning',
        message: 'Large temperature change detected'
      }
    ]);

    // Pressure validation rules
    this.rules.set('pressure', [
      {
        name: 'pressure_positive',
        check: (data) => data.value >= 0,
        severity: 'critical',
        message: 'Pressure cannot be negative'
      },
      {
        name: 'pressure_max',
        check: (data) => data.value <= 1000,
        severity: 'warning',
        message: 'Pressure exceeds normal operating range'
      }
    ]);

    // Production count validation
    this.rules.set('production', [
      {
        name: 'production_positive',
        check: (data) => data.goodParts >= 0 && data.totalParts >= 0,
        severity: 'critical',
        message: 'Production counts must be positive'
      },
      {
        name: 'production_consistency',
        check: (data) => data.goodParts <= data.totalParts,
        severity: 'critical',
        message: 'Good parts cannot exceed total parts'
      },
      {
        name: 'production_rate',
        check: (data) => {
          const rate = data.totalParts / (data.duration || 1);
          return rate <= 1000; // Max 1000 parts per time unit
        },
        severity: 'warning',
        message: 'Production rate unusually high'
      }
    ]);
  }

  async validate(dataType: string, data: any): Promise<{
    valid: boolean;
    errors: Array<{ rule: string; message: string; severity: string }>;
  }> {
    const rules = this.rules.get(dataType) || [];
    const errors = [];

    for (const rule of rules) {
      if (!rule.check(data)) {
        errors.push({
          rule: rule.name,
          message: rule.message,
          severity: rule.severity
        });
      }
    }

    // Critical errors make data invalid
    const valid = !errors.some(e => e.severity === 'critical');

    return { valid, errors };
  }
}

// =====================================================
// REAL-TIME DATA INGESTION SERVICE
// =====================================================

class RealtimeIngestionService {
  private mqttClient: mqtt.MqttClient;
  private sensorBuffer: CircularBuffer<any>;
  private eventBuffer: CircularBuffer<any>;
  private validator: DataValidator;
  private deadLetterQueue: Bull.Queue;
  private redis: Redis;
  private previousValues: Map<string, number> = new Map();

  constructor() {
    this.validator = new DataValidator();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    });

    // Initialize dead letter queue
    this.deadLetterQueue = new Bull('dead-letter', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });

    // Initialize buffers
    this.sensorBuffer = new CircularBuffer(
      1000, // Max 1000 items
      5000, // Flush every 5 seconds
      this.flushSensorData.bind(this)
    );

    this.eventBuffer = new CircularBuffer(
      100, // Max 100 events
      1000, // Flush every second
      this.flushEventData.bind(this)
    );

    // Initialize MQTT client
    this.mqttClient = mqtt.connect(process.env.MQTT_BROKER || 'mqtt://localhost:1883', {
      clientId: `ingestion-service-${Date.now()}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    });

    this.setupMqttHandlers();
  }

  private setupMqttHandlers() {
    this.mqttClient.on('connect', () => {
      console.log('✅ Connected to MQTT broker');
      
      // Subscribe to topics
      this.mqttClient.subscribe([
        'sensors/+/+/data',        // sensors/{equipment_id}/{sensor_id}/data
        'production/+/events',      // production/{equipment_id}/events
        'quality/+/inspections'     // quality/{equipment_id}/inspections
      ]);
    });

    this.mqttClient.on('message', async (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        await this.processMessage(topic, data);
      } catch (error) {
        console.error(`Failed to process message on ${topic}:`, error);
        await this.deadLetterQueue.add('invalid-message', {
          topic,
          message: message.toString(),
          error: error.message,
          timestamp: new Date()
        });
      }
    });

    this.mqttClient.on('error', (error) => {
      console.error('MQTT error:', error);
    });
  }

  private async processMessage(topic: string, data: any) {
    const topicParts = topic.split('/');
    const dataType = topicParts[0];

    switch (dataType) {
      case 'sensors':
        await this.processSensorData(topicParts, data);
        break;
      case 'production':
        await this.processProductionEvent(topicParts, data);
        break;
      case 'quality':
        await this.processQualityEvent(topicParts, data);
        break;
      default:
        console.warn(`Unknown topic type: ${dataType}`);
    }
  }

  private async processSensorData(topicParts: string[], data: any) {
    const equipmentId = topicParts[1];
    const sensorId = topicParts[2];

    try {
      // Validate schema
      const validated = SensorDataSchema.parse({
        ...data,
        equipmentId,
        sensorId,
        timestamp: data.timestamp || new Date().toISOString()
      });

      // Get sensor type from metadata
      const sensorType = await this.getSensorType(sensorId);
      
      // Add previous value for delta checks
      const previousKey = `${equipmentId}:${sensorId}`;
      validated['previousValue'] = this.previousValues.get(previousKey);

      // Validate data quality
      const validation = await this.validator.validate(sensorType, validated);
      
      if (!validation.valid) {
        console.warn(`Invalid ${sensorType} data:`, validation.errors);
        await this.deadLetterQueue.add('invalid-sensor-data', {
          data: validated,
          errors: validation.errors,
          timestamp: new Date()
        });
        return;
      }

      // Store current value for next comparison
      this.previousValues.set(previousKey, validated.value);

      // Add to buffer
      this.sensorBuffer.push({
        ...validated,
        validationWarnings: validation.errors.filter(e => e.severity === 'warning')
      });

    } catch (error) {
      console.error('Sensor data validation failed:', error);
      await this.deadLetterQueue.add('schema-validation-failed', {
        topic: topicParts.join('/'),
        data,
        error: error.message
      });
    }
  }

  private async processProductionEvent(topicParts: string[], data: any) {
    const equipmentId = topicParts[1];

    try {
      const validated = ProductionEventSchema.parse({
        ...data,
        equipmentId,
        timestamp: data.timestamp || new Date().toISOString()
      });

      // Additional business logic validation
      if (validated.eventType === 'CHANGEOVER' && !validated.productCode) {
        throw new Error('Product code required for changeover events');
      }

      this.eventBuffer.push(validated);

    } catch (error) {
      console.error('Production event validation failed:', error);
      await this.deadLetterQueue.add('invalid-production-event', {
        topic: topicParts.join('/'),
        data,
        error: error.message
      });
    }
  }

  private async processQualityEvent(topicParts: string[], data: any) {
    const equipmentId = topicParts[1];

    try {
      const validated = QualityEventSchema.parse({
        ...data,
        equipmentId,
        timestamp: data.timestamp || new Date().toISOString()
      });

      // Validate against product specifications
      const isValid = await this.validateQualitySpec(
        validated.productCode,
        validated.defectCode
      );

      if (!isValid) {
        throw new Error(`Invalid defect code ${validated.defectCode} for product ${validated.productCode}`);
      }

      this.eventBuffer.push({
        type: 'quality',
        ...validated
      });

    } catch (error) {
      console.error('Quality event validation failed:', error);
      await this.deadLetterQueue.add('invalid-quality-event', {
        topic: topicParts.join('/'),
        data,
        error: error.message
      });
    }
  }

  private async flushSensorData(items: any[]) {
    console.log(`💾 Flushing ${items.length} sensor readings...`);
    
    try {
      // Batch insert into TimescaleDB
      const values = items.map(item => [
        item.timestamp,
        item.equipmentId,
        item.sensorId,
        item.value,
        item.unit,
        item.quality
      ]);

      await prisma.$executeRaw`
        INSERT INTO sensor_data (time, equipment_id, sensor_id, value, unit, quality_flag)
        SELECT * FROM UNNEST(${values}::sensor_data[])
        ON CONFLICT DO NOTHING
      `;

      console.log(`✅ Inserted ${items.length} sensor readings`);

      // Update metrics
      await this.updateIngestionMetrics('sensor', items.length);

    } catch (error) {
      console.error('Failed to flush sensor data:', error);
      throw error; // Will return items to buffer
    }
  }

  private async flushEventData(items: any[]) {
    console.log(`💾 Flushing ${items.length} events...`);
    
    try {
      const productionEvents = items.filter(i => i.eventType);
      const qualityEvents = items.filter(i => i.type === 'quality');

      // Process production events
      if (productionEvents.length > 0) {
        await this.processProductionMetrics(productionEvents);
      }

      // Process quality events
      if (qualityEvents.length > 0) {
        await this.processQualityMetrics(qualityEvents);
      }

      console.log(`✅ Processed ${items.length} events`);

      // Update metrics
      await this.updateIngestionMetrics('event', items.length);

    } catch (error) {
      console.error('Failed to flush event data:', error);
      throw error;
    }
  }

  private async processProductionMetrics(events: any[]) {
    // Group by equipment and calculate metrics
    const equipmentGroups = this.groupBy(events, 'equipmentId');

    for (const [equipmentId, equipmentEvents] of Object.entries(equipmentGroups)) {
      // Calculate time buckets
      const now = new Date();
      const hourBucket = new Date(now);
      hourBucket.setMinutes(0, 0, 0);
      
      const dayBucket = new Date(now);
      dayBucket.setHours(0, 0, 0, 0);

      // Calculate production time
      let runtime = 0;
      let downtime = 0;
      let plannedDowntime = 0;

      const sortedEvents = (equipmentEvents as any[]).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      for (let i = 0; i < sortedEvents.length - 1; i++) {
        const current = sortedEvents[i];
        const next = sortedEvents[i + 1];
        const duration = new Date(next.timestamp).getTime() - new Date(current.timestamp).getTime();

        switch (current.eventType) {
          case 'START':
            runtime += duration / 1000; // Convert to seconds
            break;
          case 'STOP':
            downtime += duration / 1000;
            break;
          case 'MAINTENANCE':
          case 'CHANGEOVER':
            plannedDowntime += duration / 1000;
            break;
        }
      }

      // Get equipment details
      const equipment = await prisma.equipment.findUnique({
        where: { id: equipmentId }
      });

      if (!equipment) continue;

      // Insert production metrics
      await prisma.$executeRaw`
        INSERT INTO production_metrics (
          time, equipment_id, equipment_code, equipment_name,
          site_code, area_code, hour_bucket, day_bucket,
          week_bucket, month_bucket, runtime, downtime,
          planned_downtime, planned_production_time,
          units_produced, units_good, units_scrap,
          performance, shift_code
        ) VALUES (
          ${now}, ${equipmentId}, ${equipment.code}, ${equipment.name},
          ${equipment.site_code}, ${equipment.area_code},
          ${hourBucket}, ${dayBucket},
          date_trunc('week', ${now}),
          date_trunc('month', ${now}),
          ${runtime}, ${downtime}, ${plannedDowntime},
          480 * 60, -- 8 hour shift in seconds
          0, 0, 0, -- Will be updated by production counts
          1.0, -- Will be calculated
          ${await this.getCurrentShift()}
        )
        ON CONFLICT (equipment_id, time) DO UPDATE SET
          runtime = EXCLUDED.runtime,
          downtime = EXCLUDED.downtime,
          planned_downtime = EXCLUDED.planned_downtime
      `;
    }
  }

  private async processQualityMetrics(events: any[]) {
    // Batch insert quality events
    const values = events.map(event => [
      event.timestamp,
      event.equipmentId,
      event.productCode,
      event.defectCode,
      event.defectCode, // category - will be looked up
      event.severity,
      event.quantity,
      event.isRework,
      0, // cost impact - will be calculated
      event.operatorId
    ]);

    await prisma.$executeRaw`
      INSERT INTO quality_events (
        time, equipment_id, product_code, defect_code,
        defect_category, severity, quantity, is_rework,
        cost_impact, operator_id
      )
      SELECT * FROM UNNEST(${values}::quality_events[])
    `;
  }

  // Helper methods
  private async getSensorType(sensorId: string): Promise<string> {
    // Cache sensor types in Redis
    const cached = await this.redis.get(`sensor:type:${sensorId}`);
    if (cached) return cached;

    // Determine from sensor ID pattern
    let type = 'generic';
    if (sensorId.includes('TEMP')) type = 'temperature';
    else if (sensorId.includes('PRES')) type = 'pressure';
    else if (sensorId.includes('VIB')) type = 'vibration';
    else if (sensorId.includes('FLOW')) type = 'flow';

    await this.redis.set(`sensor:type:${sensorId}`, type, 'EX', 3600);
    return type;
  }

  private async validateQualitySpec(productCode: string, defectCode: string): Promise<boolean> {
    // Check if defect code is valid for product
    const defectType = await prisma.defect_type.findFirst({
      where: { code: defectCode }
    });

    return !!defectType;
  }

  private async getCurrentShift(): Promise<string> {
    // This would call the get_current_shift() function from the database
    const result = await prisma.$queryRaw<Array<{ shift: string }>>`
      SELECT get_current_shift() as shift
    `;
    return result[0]?.shift || 'UNKNOWN';
  }

  private async updateIngestionMetrics(type: string, count: number) {
    const key = `metrics:ingestion:${type}:${new Date().toISOString().slice(0, 10)}`;
    await this.redis.incrby(key, count);
    await this.redis.expire(key, 86400 * 7); // Keep for 7 days
  }

  private groupBy(array: any[], key: string): Record<string, any[]> {
    return array.reduce((groups, item) => {
      const group = item[key];
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  async start() {
    console.log('🚀 Starting Real-time Ingestion Service...');
    
    // Process dead letter queue periodically
    setInterval(async () => {
      const jobs = await this.deadLetterQueue.getJobs(['failed']);
      console.log(`📬 Dead letter queue has ${jobs.length} failed messages`);
    }, 60000); // Check every minute
  }

  async stop() {
    console.log('🛑 Stopping Real-time Ingestion Service...');
    this.mqttClient.end();
    this.sensorBuffer.destroy();
    this.eventBuffer.destroy();
    await this.redis.disconnect();
    await this.deadLetterQueue.close();
  }
}

// =====================================================
// OPC-UA GATEWAY
// =====================================================

class OpcUaGateway {
  private opcuaClient: any;
  private mqttClient: mqtt.MqttClient;
  private subscriptions: Map<string, any> = new Map();

  constructor() {
    this.mqttClient = mqtt.connect(process.env.MQTT_BROKER || 'mqtt://localhost:1883', {
      clientId: `opcua-gateway-${Date.now()}`
    });
  }

  async connectToServer(endpoint: string) {
    console.log(`🔌 Connecting to OPC-UA server: ${endpoint}`);
    
    // Initialize OPC-UA client
    const { OPCUAClient, SecurityPolicy, MessageSecurityMode } = await import('node-opcua');
    
    this.opcuaClient = OPCUAClient.create({
      applicationName: "ManufacturingAnalyticsPlatform",
      connectionStrategy: {
        initialDelay: 1000,
        maxRetry: 10
      },
      securityMode: MessageSecurityMode.None,
      securityPolicy: SecurityPolicy.None,
      endpointMustExist: false
    });

    await this.opcuaClient.connect(endpoint);
    console.log('✅ Connected to OPC-UA server');

    // Create session
    const session = await this.opcuaClient.createSession();
    await this.browseAndSubscribe(session);
  }

  private async browseAndSubscribe(session: any) {
    // Browse for equipment nodes
    const browseResult = await session.browse("RootFolder");
    
    for (const reference of browseResult.references) {
      if (reference.browseName.toString().includes("Equipment")) {
        await this.subscribeToEquipment(session, reference.nodeId);
      }
    }
  }

  private async subscribeToEquipment(session: any, nodeId: any) {
    const subscription = await session.createSubscription2({
      requestedPublishingInterval: 1000,
      requestedLifetimeCount: 100,
      requestedMaxKeepAliveCount: 10,
      maxNotificationsPerPublish: 100,
      publishingEnabled: true,
      priority: 10
    });

    const itemToMonitor = {
      nodeId: nodeId,
      attributeId: 13 // Value attribute
    };

    const parameters = {
      samplingInterval: 100,
      discardOldest: true,
      queueSize: 10
    };

    const monitoredItem = await subscription.monitor(
      itemToMonitor,
      parameters,
      1 // TimestampsToReturn.Both
    );

    monitoredItem.on("changed", (dataValue: any) => {
      this.publishToMqtt(nodeId.toString(), dataValue);
    });

    this.subscriptions.set(nodeId.toString(), subscription);
  }

  private publishToMqtt(nodeId: string, dataValue: any) {
    // Parse node ID to determine equipment and sensor
    const parts = nodeId.split('.');
    const equipmentId = parts[1] || 'unknown';
    const sensorId = parts[2] || 'unknown';

    const topic = `sensors/${equipmentId}/${sensorId}/data`;
    const payload = {
      value: dataValue.value.value,
      timestamp: dataValue.serverTimestamp,
      quality: dataValue.statusCode.isGood() ? 'GOOD' : 'BAD',
      unit: this.inferUnit(sensorId)
    };

    this.mqttClient.publish(topic, JSON.stringify(payload));
  }

  private inferUnit(sensorId: string): string {
    if (sensorId.includes('TEMP')) return '°C';
    if (sensorId.includes('PRES')) return 'bar';
    if (sensorId.includes('FLOW')) return 'L/min';
    if (sensorId.includes('VIB')) return 'mm/s';
    return 'units';
  }

  async stop() {
    for (const subscription of this.subscriptions.values()) {
      await subscription.terminate();
    }
    await this.opcuaClient?.disconnect();
    this.mqttClient.end();
  }
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function main() {
  console.log('🏭 Manufacturing Analytics Platform - Real-time Pipeline Setup\n');

  // Start ingestion service
  const ingestionService = new RealtimeIngestionService();
  await ingestionService.start();

  // Start OPC-UA gateway if endpoints configured
  if (process.env.OPCUA_ENDPOINTS) {
    const opcuaGateway = new OpcUaGateway();
    const endpoints = process.env.OPCUA_ENDPOINTS.split(',');
    
    for (const endpoint of endpoints) {
      try {
        await opcuaGateway.connectToServer(endpoint.trim());
      } catch (error) {
        console.error(`Failed to connect to OPC-UA endpoint ${endpoint}:`, error);
      }
    }
  }

  console.log('\n✅ Real-time data pipeline is running!');
  console.log('📊 Monitor ingestion metrics in Redis');
  console.log('🔍 Check dead letter queue for failed messages');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down...');
    await ingestionService.stop();
    process.exit(0);
  });
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { RealtimeIngestionService, OpcUaGateway, DataValidator };