/**
 * MQTT Configuration
 * 
 * Environment-based configuration for MQTT integration
 */

import { MqttConfig } from '@/services/mqtt/MqttService';

// Get environment variables with defaults
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || `map-${process.env.NODE_ENV || 'dev'}-${Date.now()}`;
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';
const MQTT_TLS_ENABLED = process.env.MQTT_TLS_ENABLED === 'true';
const MQTT_TLS_CA = process.env.MQTT_TLS_CA || '';
const MQTT_TLS_CERT = process.env.MQTT_TLS_CERT || '';
const MQTT_TLS_KEY = process.env.MQTT_TLS_KEY || '';

// Parse topic patterns from environment
const parseSensorTopics = (): string[] => {
  const topics = process.env.MQTT_SENSOR_TOPICS || 'sensors/+/data,sensors/+/telemetry';
  return topics.split(',').map(t => t.trim()).filter(t => t.length > 0);
};

// Default MQTT configuration
export const defaultMqttConfig: MqttConfig = {
  brokerUrl: MQTT_BROKER_URL,
  clientId: MQTT_CLIENT_ID,
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  tls: MQTT_TLS_ENABLED ? {
    enabled: true,
    ca: MQTT_TLS_CA,
    cert: MQTT_TLS_CERT,
    key: MQTT_TLS_KEY,
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  } : { enabled: false },
  reconnectPeriod: parseInt(process.env.MQTT_RECONNECT_PERIOD || '5000'),
  connectTimeout: parseInt(process.env.MQTT_CONNECT_TIMEOUT || '30000'),
  keepalive: parseInt(process.env.MQTT_KEEPALIVE || '60'),
  qos: (parseInt(process.env.MQTT_QOS || '1') as 0 | 1 | 2),
  clean: process.env.MQTT_CLEAN_SESSION !== 'false',
  topics: {
    sensors: parseSensorTopics(),
    commands: process.env.MQTT_COMMANDS_TOPIC || 'commands/+',
    status: process.env.MQTT_STATUS_TOPIC || 'status/+',
    deadLetter: process.env.MQTT_DEAD_LETTER_TOPIC || 'deadletter/sensors'
  },
  buffer: {
    maxSize: parseInt(process.env.MQTT_BUFFER_MAX_SIZE || '10000'),
    flushInterval: parseInt(process.env.MQTT_BUFFER_FLUSH_INTERVAL || '5000')
  }
};

// Production-specific configuration
export const productionMqttConfig: MqttConfig = {
  ...defaultMqttConfig,
  brokerUrl: process.env.MQTT_BROKER_URL || 'mqtts://mqtt.production.example.com:8883',
  tls: {
    enabled: true,
    ca: process.env.MQTT_TLS_CA || '/etc/ssl/certs/mqtt-ca.pem',
    cert: process.env.MQTT_TLS_CERT || '/etc/ssl/certs/mqtt-client.pem',
    key: process.env.MQTT_TLS_KEY || '/etc/ssl/private/mqtt-client-key.pem',
    rejectUnauthorized: true
  },
  will: {
    topic: `${MQTT_CLIENT_ID}/status`,
    payload: JSON.stringify({
      status: 'offline',
      timestamp: new Date().toISOString(),
      clientId: MQTT_CLIENT_ID
    }),
    qos: 1,
    retain: true
  }
};

// Development-specific configuration
export const developmentMqttConfig: MqttConfig = {
  ...defaultMqttConfig,
  brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  topics: {
    ...defaultMqttConfig.topics,
    sensors: [
      'test/sensors/+/data',
      'test/sensors/+/telemetry',
      ...parseSensorTopics()
    ]
  },
  buffer: {
    maxSize: 1000,
    flushInterval: 2000
  }
};

// Test-specific configuration
export const testMqttConfig: MqttConfig = {
  brokerUrl: 'mqtt://localhost:1883',
  clientId: 'map-test',
  topics: {
    sensors: ['test/+/data'],
    commands: 'test/commands/+',
    status: 'test/status/+',
    deadLetter: 'test/deadletter'
  },
  buffer: {
    maxSize: 100,
    flushInterval: 100
  }
};

// Export configuration based on environment
export const mqttConfig: MqttConfig = 
  process.env.NODE_ENV === 'production' ? productionMqttConfig :
  process.env.NODE_ENV === 'test' ? testMqttConfig :
  developmentMqttConfig;

// Configuration for different sensor types
export const sensorTopicPatterns = {
  temperature: [
    'sensors/temperature/+/data',
    'factory/+/temperature/+',
    '+/sensors/temp/+'
  ],
  pressure: [
    'sensors/pressure/+/data',
    'factory/+/pressure/+',
    '+/sensors/pressure/+'
  ],
  vibration: [
    'sensors/vibration/+/data',
    'factory/+/vibration/+',
    '+/sensors/vibration/+'
  ],
  production: [
    'factory/+/production/+/status',
    'factory/+/production/+/metrics',
    'production/+/line/+/status'
  ],
  quality: [
    'factory/+/quality/+/inspection',
    'quality/+/metrics',
    'inspection/+/results'
  ]
};

// Monitoring configuration
export const mqttMonitoringConfig = {
  checkInterval: parseInt(process.env.MQTT_MONITOR_INTERVAL || '10000'),
  thresholds: {
    messageRate: parseInt(process.env.MQTT_THRESHOLD_MESSAGE_RATE || '1000'),
    errorRate: parseInt(process.env.MQTT_THRESHOLD_ERROR_RATE || '5'),
    bufferSize: parseInt(process.env.MQTT_THRESHOLD_BUFFER_SIZE || '5000'),
    deadLetterSize: parseInt(process.env.MQTT_THRESHOLD_DLQ_SIZE || '100'),
    latency: parseInt(process.env.MQTT_THRESHOLD_LATENCY || '1000')
  },
  alerting: {
    enabled: process.env.MQTT_ALERTING_ENABLED !== 'false',
    channels: (process.env.MQTT_ALERT_CHANNELS || 'log,database').split(',')
  }
};