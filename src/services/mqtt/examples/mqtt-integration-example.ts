/**
 * MQTT Integration Example
 * 
 * This example demonstrates how to use the MQTT integration
 * for collecting IoT sensor data in a manufacturing environment
 */

import { MqttService, MqttConfig } from '../MqttService';
import { MqttMonitor } from '../MqttMonitor';
import { sensorDataTransformer } from '../transformers/SensorDataTransformer';
import { logger } from '@/lib/logger';

// Example 1: Basic MQTT Setup
async function basicMqttSetup() {
  // Configuration for local MQTT broker
  const config: MqttConfig = {
    brokerUrl: 'mqtt://localhost:1883',
    clientId: 'manufacturing-platform-001',
    topics: {
      sensors: [
        'factory/+/sensors/+/data',      // All sensors in all factories
        'factory/main/temperature/+',     // All temperature sensors in main factory
        'factory/main/pressure/+',        // All pressure sensors in main factory
        'factory/main/vibration/+',       // All vibration sensors in main factory
        'factory/main/production/+/status' // Production line status
      ],
      commands: 'factory/+/commands/+',
      status: 'factory/+/status',
      deadLetter: 'factory/deadletter'
    },
    buffer: {
      maxSize: 5000,
      flushInterval: 2000 // Flush every 2 seconds
    }
  };

  // Create and connect service
  const mqttService = new MqttService(config);
  
  // Set up event handlers
  mqttService.on('connected', () => {
    logger.info('Connected to MQTT broker');
  });

  mqttService.on('message', ({ topic, data }) => {
    logger.info(`Received message on topic ${topic}:`, data);
  });

  mqttService.on('error', (error) => {
    logger.error('MQTT error:', error);
  });

  // Connect to broker
  await mqttService.connect();
  
  // Subscribe to sensor topics
  await mqttService.subscribeSensorTopics();

  return mqttService;
}

// Example 2: Secure MQTT Connection
async function secureMqttSetup() {
  const config: MqttConfig = {
    brokerUrl: 'mqtts://secure-broker.example.com:8883',
    clientId: 'manufacturing-platform-secure',
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    tls: {
      enabled: true,
      rejectUnauthorized: true,
      // In production, load these from files or environment
      ca: process.env.MQTT_CA_CERT,
      cert: process.env.MQTT_CLIENT_CERT,
      key: process.env.MQTT_CLIENT_KEY
    },
    will: {
      topic: 'factory/main/status',
      payload: JSON.stringify({
        status: 'offline',
        timestamp: new Date().toISOString(),
        clientId: 'manufacturing-platform-secure'
      }),
      qos: 1,
      retain: true
    }
  };

  const mqttService = new MqttService(config);
  await mqttService.connect();
  
  // Publish online status
  await mqttService.publish('factory/main/status', {
    status: 'online',
    timestamp: new Date().toISOString(),
    clientId: 'manufacturing-platform-secure'
  }, { retain: true });

  return mqttService;
}

// Example 3: Custom Data Transformation
async function customTransformationExample() {
  // Register custom transformer for proprietary sensor format
  sensorDataTransformer.registerTransformer('custom-modbus', (data) => {
    // Example: Transform ModBus-style register data
    const registers = data.registers as number[];
    const sensorId = `modbus-${data.deviceId}-${data.registerId}`;
    
    // Combine two 16-bit registers into a 32-bit float
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeUInt16BE(registers[0], 0);
    buffer.writeUInt16BE(registers[1], 2);
    const value = buffer.readFloatBE(0);
    
    return {
      sensorId,
      timestamp: new Date(),
      value,
      unit: data.unit || 'raw',
      quality: data.status === 0 ? 100 : 50,
      metadata: {
        deviceId: data.deviceId,
        registerId: data.registerId,
        rawRegisters: registers
      }
    };
  });

  // Use the transformer
  const mqttService = await basicMqttSetup();
  
  // The transformer will be automatically applied when receiving data
  mqttService.on('message', ({ topic, data }) => {
    if (data.type === 'modbus') {
      // Data will be automatically transformed
      logger.info('Transformed ModBus data:', data);
    }
  });

  return mqttService;
}

// Example 4: Monitoring and Alerting
async function monitoringExample() {
  const mqttService = await basicMqttSetup();
  
  // Create monitor with custom thresholds
  const monitor = new MqttMonitor(mqttService, {
    checkInterval: 5000, // Check every 5 seconds
    thresholds: {
      messageRate: 500,     // Alert if > 500 msgs/sec
      errorRate: 2,         // Alert if error rate > 2%
      bufferSize: 3000,     // Alert if buffer > 3000
      deadLetterSize: 50,   // Alert if DLQ > 50
      latency: 500         // Alert if latency > 500ms
    },
    alerting: {
      enabled: true,
      channels: ['log', 'database']
    }
  });

  // Set up alert handlers
  monitor.on('alert', (alert) => {
    logger.warn('MQTT Alert:', alert);
    
    // Send to external monitoring system
    // await sendToMonitoringSystem(alert);
  });

  monitor.on('health', (health) => {
    if (health.status !== 'healthy') {
      logger.warn('MQTT health degraded:', health.issues);
    }
  });

  // Start monitoring
  monitor.start();

  return { mqttService, monitor };
}

// Example 5: Publishing Sensor Commands
async function publishingExample() {
  const mqttService = await basicMqttSetup();
  
  // Publish calibration command to a sensor
  await mqttService.publish('factory/main/commands/temp-001', {
    command: 'calibrate',
    parameters: {
      offset: 0.5,
      scale: 1.0
    },
    timestamp: new Date().toISOString()
  }, { qos: 2 }); // Use QoS 2 for critical commands

  // Publish configuration update
  await mqttService.publish('factory/main/commands/all', {
    command: 'update_config',
    config: {
      sampleRate: 1000,  // 1 Hz
      reportingInterval: 60000  // Report every minute
    }
  }, { qos: 1, retain: true });

  // Publish production order
  await mqttService.publish('factory/main/production/line-1/order', {
    orderId: 'ORD-2024-001',
    product: 'WIDGET-A',
    quantity: 1000,
    priority: 'high',
    startTime: new Date().toISOString()
  }, { qos: 2 });

  return mqttService;
}

// Example 6: Handling Different Sensor Types
async function sensorTypesExample() {
  const mqttService = await basicMqttSetup();
  
  // Temperature sensor data
  mqttService.on('message', ({ topic, data }) => {
    if (topic.includes('/temperature/')) {
      // Process temperature data
      const temp = {
        celsius: data.value,
        fahrenheit: (data.value * 9/5) + 32,
        kelvin: data.value + 273.15
      };
      logger.info('Temperature reading:', temp);
    }
    
    if (topic.includes('/pressure/')) {
      // Process pressure data
      const pressure = {
        value: data.value,
        unit: data.unit || 'bar',
        psi: data.unit === 'bar' ? data.value * 14.5038 : data.value
      };
      logger.info('Pressure reading:', pressure);
    }
    
    if (topic.includes('/vibration/')) {
      // Process vibration data
      const vibration = {
        amplitude: data.value,
        frequency: data.frequency || 0,
        axis: data.axis || 'unknown',
        severity: data.value > 10 ? 'high' : data.value > 5 ? 'medium' : 'low'
      };
      logger.info('Vibration reading:', vibration);
    }
  });

  return mqttService;
}

// Example 7: Error Handling and Recovery
async function errorHandlingExample() {
  const mqttService = await basicMqttSetup();
  
  // Handle connection errors
  mqttService.on('error', async (error) => {
    logger.error('MQTT error:', error);
    
    // Implement custom recovery logic
    if (error.message.includes('connection refused')) {
      logger.info('Attempting to switch to backup broker...');
      // Disconnect and reconnect to backup
      await mqttService.disconnect();
      
      // Update configuration with backup broker
      const backupConfig: MqttConfig = {
        ...mqttService['config'],
        brokerUrl: 'mqtt://backup-broker:1883'
      };
      
      // Reconnect with new config
      // const backupService = new MqttService(backupConfig);
      // await backupService.connect();
    }
  });

  // Monitor dead letter queue
  setInterval(async () => {
    const dlq = mqttService.getDeadLetterQueue();
    if (dlq.length > 10) {
      logger.warn(`Dead letter queue has ${dlq.length} messages`);
      
      // Analyze failed messages
      const errorTypes = dlq.reduce((acc, msg) => {
        acc[msg.error || 'unknown'] = (acc[msg.error || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      logger.info('Error distribution:', errorTypes);
      
      // Retry specific error types
      if (errorTypes['validation error'] > 5) {
        logger.info('Retrying validation errors...');
        await mqttService.retryDeadLetterQueue();
      }
    }
  }, 60000); // Check every minute

  return mqttService;
}

// Example 8: Integration with Manufacturing Systems
async function manufacturingIntegration() {
  const mqttService = await secureMqttSetup();
  
  // Subscribe to production line sensors
  const productionTopics = [
    'factory/main/production/+/sensors/+',
    'factory/main/production/+/plc/+',
    'factory/main/production/+/scada/+'
  ];
  
  // Override default topics
  for (const topic of productionTopics) {
    await mqttService['client']?.subscribe(topic, { qos: 1 });
  }

  // Process production metrics
  mqttService.on('message', async ({ topic, data }) => {
    const topicParts = topic.split('/');
    const lineId = topicParts[3];
    const sensorType = topicParts[5];
    
    // Calculate OEE (Overall Equipment Effectiveness)
    if (sensorType === 'production-count') {
      const oee = {
        availability: data.runTime / data.plannedTime,
        performance: data.actualOutput / data.theoreticalOutput,
        quality: data.goodUnits / data.totalUnits,
        oeeScore: 0
      };
      oee.oeeScore = oee.availability * oee.performance * oee.quality;
      
      // Publish OEE metrics
      await mqttService.publish(`factory/main/metrics/oee/${lineId}`, oee);
    }
    
    // Process PLC data
    if (topic.includes('/plc/')) {
      // Handle PLC-specific data formats
      logger.info(`PLC data from ${lineId}:`, data);
    }
    
    // Process SCADA data
    if (topic.includes('/scada/')) {
      // Handle SCADA-specific data formats
      logger.info(`SCADA data from ${lineId}:`, data);
    }
  });

  return mqttService;
}

// Main function to run examples
async function main() {
  try {
    // Run basic example
    logger.info('Starting basic MQTT example...');
    const basicService = await basicMqttSetup();
    
    // Run monitoring example
    logger.info('Starting monitoring example...');
    const { monitor } = await monitoringExample();
    
    // Let it run for a while
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    // Cleanup
    monitor.stop();
    await basicService.disconnect();
    
  } catch (error) {
    logger.error('Example failed:', error);
  }
}

// Export examples for use in other modules
export {
  basicMqttSetup,
  secureMqttSetup,
  customTransformationExample,
  monitoringExample,
  publishingExample,
  sensorTypesExample,
  errorHandlingExample,
  manufacturingIntegration
};

// Run if executed directly
if (require.main === module) {
  main();
}