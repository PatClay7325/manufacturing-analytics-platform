/**
 * MQTT Service Initialization
 * 
 * Initializes MQTT service, monitoring, and WebSocket bridge
 */

import { getMqttService } from './MqttService';
import { MqttMonitor } from './MqttMonitor';
import { mqttWebSocketBridge } from './MqttWebSocketBridge';
import { mqttConfig, mqttMonitoringConfig } from '@/config/mqtt.config';
import { logger } from '@/lib/logger';

let mqttService: ReturnType<typeof getMqttService> | null = null;
let mqttMonitor: MqttMonitor | null = null;
let isInitialized = false;

/**
 * Initialize MQTT integration
 */
export async function initializeMqttIntegration(): Promise<{
  service: ReturnType<typeof getMqttService>;
  monitor: MqttMonitor;
}> {
  if (isInitialized) {
    logger.info('MQTT integration already initialized');
    return { service: mqttService!, monitor: mqttMonitor! };
  }

  try {
    logger.info('Initializing MQTT integration...');

    // Create MQTT service
    mqttService = getMqttService(mqttConfig);
    logger.info('MQTT service created');

    // Connect to broker
    await mqttService.connect();
    logger.info('Connected to MQTT broker');

    // Create monitor
    mqttMonitor = new MqttMonitor(mqttService, mqttMonitoringConfig);
    
    // Set up monitor event handlers
    mqttMonitor.on('alert', (alert) => {
      logger.warn('MQTT Alert:', alert);
    });

    mqttMonitor.on('health', (health) => {
      if (health.status !== 'healthy') {
        logger.warn('MQTT health degraded:', {
          status: health.status,
          issues: health.issues
        });
      }
    });

    // Start monitoring
    mqttMonitor.start();
    logger.info('MQTT monitoring started');

    // Initialize WebSocket bridge
    await mqttWebSocketBridge.initialize(mqttService, mqttMonitor);
    logger.info('MQTT WebSocket bridge initialized');

    // Subscribe to sensor topics
    await mqttService.subscribeSensorTopics();
    logger.info('Subscribed to sensor topics');

    isInitialized = true;
    logger.info('MQTT integration initialized successfully');

    return { service: mqttService, monitor: mqttMonitor };

  } catch (error) {
    logger.error('Failed to initialize MQTT integration:', error);
    
    // Cleanup on failure
    if (mqttMonitor) {
      mqttMonitor.stop();
      mqttMonitor = null;
    }
    
    if (mqttService) {
      await mqttService.disconnect().catch(err => {
        logger.error('Error disconnecting MQTT service during cleanup:', err);
      });
      mqttService = null;
    }

    isInitialized = false;
    throw error;
  }
}

/**
 * Shutdown MQTT integration
 */
export async function shutdownMqttIntegration(): Promise<void> {
  if (!isInitialized) {
    return;
  }

  try {
    logger.info('Shutting down MQTT integration...');

    // Stop monitoring
    if (mqttMonitor) {
      mqttMonitor.stop();
      mqttMonitor = null;
      logger.info('MQTT monitoring stopped');
    }

    // Disconnect from broker
    if (mqttService) {
      await mqttService.disconnect();
      mqttService = null;
      logger.info('Disconnected from MQTT broker');
    }

    isInitialized = false;
    logger.info('MQTT integration shutdown complete');

  } catch (error) {
    logger.error('Error during MQTT integration shutdown:', error);
    throw error;
  }
}

/**
 * Get current MQTT service instance
 */
export function getCurrentMqttService() {
  return mqttService;
}

/**
 * Get current MQTT monitor instance
 */
export function getCurrentMqttMonitor() {
  return mqttMonitor;
}

/**
 * Check if MQTT integration is initialized
 */
export function isMqttInitialized(): boolean {
  return isInitialized;
}

/**
 * Health check for MQTT integration
 */
export async function mqttHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: any;
}> {
  if (!isInitialized || !mqttService) {
    return {
      status: 'unhealthy',
      details: { error: 'MQTT integration not initialized' }
    };
  }

  try {
    const serviceMetrics = mqttService.getMetrics();
    const bridgeStatus = mqttWebSocketBridge.getStatus();
    let monitorHealth = null;

    if (mqttMonitor) {
      monitorHealth = await mqttMonitor.getHealthStatus();
    }

    const overall = 
      serviceMetrics.status === 'connected' && 
      bridgeStatus.initialized &&
      (!monitorHealth || monitorHealth.status !== 'unhealthy')
        ? 'healthy' 
        : monitorHealth?.status === 'degraded' 
          ? 'degraded' 
          : 'unhealthy';

    return {
      status: overall,
      details: {
        service: serviceMetrics,
        bridge: bridgeStatus,
        monitor: monitorHealth
      }
    };

  } catch (error) {
    logger.error('Error during MQTT health check:', error);
    return {
      status: 'unhealthy',
      details: { error: error.message }
    };
  }
}

// Export for use in Next.js API routes
export {
  mqttService as currentMqttService,
  mqttMonitor as currentMqttMonitor
};