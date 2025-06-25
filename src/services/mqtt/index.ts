/**
 * MQTT Integration Module
 * 
 * Production-ready MQTT integration for IoT sensor data collection
 */

// Core services
export { MqttService, getMqttService, ServiceStatus } from './MqttService';
export type { MqttConfig } from './MqttService';

export { MqttMonitor } from './MqttMonitor';
export type { MonitoringConfig, HealthStatus } from './MqttMonitor';

// WebSocket integration
export { mqttWebSocketBridge } from './MqttWebSocketBridge';

// Data transformation
export { sensorDataTransformer, SensorDataTransformer } from './transformers/SensorDataTransformer';
export type { UnifiedSensorData } from './transformers/SensorDataTransformer';

// Initialization and management
export {
  initializeMqttIntegration,
  shutdownMqttIntegration,
  getCurrentMqttService,
  getCurrentMqttMonitor,
  isMqttInitialized,
  mqttHealthCheck
} from './mqtt-init';

// Configuration
export { mqttConfig, mqttMonitoringConfig, sensorTopicPatterns } from '@/config/mqtt.config';