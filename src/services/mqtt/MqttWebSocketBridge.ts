/**
 * MQTT WebSocket Bridge
 * 
 * Bridges MQTT messages to the existing WebSocket service
 */

import { getMqttService, MqttService } from './MqttService';
import { MqttMonitor } from './MqttMonitor';
import { websocketService } from '@/services/websocketService';
import { logger } from '@/lib/logger';

export class MqttWebSocketBridge {
  private mqttService: MqttService | null = null;
  private mqttMonitor: MqttMonitor | null = null;
  private isInitialized = false;

  /**
   * Initialize the bridge with MQTT service and monitor
   */
  async initialize(mqttService: MqttService, monitor?: MqttMonitor): Promise<void> {
    if (this.isInitialized) {
      logger.warn('MQTT WebSocket bridge already initialized');
      return;
    }

    this.mqttService = mqttService;
    this.mqttMonitor = monitor || null;

    // Set up MQTT event listeners
    this.setupMqttListeners();

    // Set up monitor event listeners if available
    if (this.mqttMonitor) {
      this.setupMonitorListeners();
    }

    this.isInitialized = true;
    logger.info('MQTT WebSocket bridge initialized');
  }

  /**
   * Set up MQTT service event listeners
   */
  private setupMqttListeners(): void {
    if (!this.mqttService) return;

    // Forward MQTT messages to WebSocket
    this.mqttService.on('message', ({ topic, data }) => {
      this.forwardToWebSocket('metric', topic, data);
    });

    // Forward status changes
    this.mqttService.on('status', (status) => {
      this.forwardToWebSocket('status', 'mqtt/status', { status });
    });

    // Forward errors
    this.mqttService.on('error', (error) => {
      this.forwardToWebSocket('error', 'mqtt/error', { 
        error: error.message,
        stack: error.stack 
      });
    });

    // Forward data stored events
    this.mqttService.on('dataStored', ({ count, sensorData }) => {
      this.forwardToWebSocket('metric', 'mqtt/stored', { 
        count,
        sensors: sensorData.map(d => d.sensorId) 
      });
    });
  }

  /**
   * Set up monitor event listeners
   */
  private setupMonitorListeners(): void {
    if (!this.mqttMonitor) return;

    // Forward health status
    this.mqttMonitor.on('health', (health) => {
      this.forwardToWebSocket('status', 'mqtt/health', health);
    });

    // Forward alerts
    this.mqttMonitor.on('alert', (alert) => {
      this.forwardToWebSocket('alert', 'mqtt/alert', alert);
    });
  }

  /**
   * Forward message to WebSocket service
   */
  private forwardToWebSocket(type: 'metric' | 'alert' | 'status' | 'error', topic: string, data: any): void {
    if (!websocketService || !websocketService.isConnected) {
      return;
    }

    // Determine the channel based on topic
    const channel = this.getChannelForTopic(topic);

    // Send via WebSocket service
    websocketService.send(type, {
      channel,
      topic,
      payload: data,
      source: 'mqtt'
    });
  }

  /**
   * Get WebSocket channel for MQTT topic
   */
  private getChannelForTopic(topic: string): string {
    // Check for exact matches first
    if (topic.startsWith('mqtt/')) {
      return topic; // Use as-is for internal MQTT events
    }

    // Map sensor topics
    if (topic.match(/^sensors\/[\w-]+\/data$/)) {
      const sensorId = topic.split('/')[1];
      return `metric:${sensorId}`;
    }

    if (topic.match(/^sensors\/[\w-]+\/telemetry$/)) {
      const sensorId = topic.split('/')[1];
      return `telemetry:${sensorId}`;
    }

    // Map factory topics
    if (topic.match(/^factory\/[\w-]+\/sensors\/[\w-]+\/data$/)) {
      const parts = topic.split('/');
      const factoryId = parts[1];
      const sensorId = parts[3];
      return `metric:${factoryId}:${sensorId}`;
    }

    if (topic.match(/^factory\/[\w-]+\/production\/[\w-]+\/status$/)) {
      const parts = topic.split('/');
      const factoryId = parts[1];
      const lineId = parts[3];
      return `status:production:${factoryId}:${lineId}`;
    }

    if (topic.match(/^factory\/[\w-]+\/alerts$/)) {
      const factoryId = topic.split('/')[1];
      return `alerts:${factoryId}`;
    }

    // Default channel
    return `mqtt:${topic.replace(/\//g, ':')}`;
  }

  /**
   * Subscribe to MQTT topics via WebSocket
   */
  subscribeToMqttTopic(topic: string): void {
    if (!this.mqttService) {
      logger.error('MQTT service not initialized');
      return;
    }

    // Subscribe to the MQTT topic
    this.mqttService['client']?.subscribe(topic, { qos: 1 }, (err) => {
      if (err) {
        logger.error(`Failed to subscribe to MQTT topic ${topic}:`, err);
      } else {
        logger.info(`Subscribed to MQTT topic: ${topic}`);
      }
    });
  }

  /**
   * Publish to MQTT topic via WebSocket request
   */
  async publishToMqttTopic(topic: string, payload: any, options?: any): Promise<void> {
    if (!this.mqttService) {
      throw new Error('MQTT service not initialized');
    }

    await this.mqttService.publish(topic, payload, options);
  }

  /**
   * Get bridge status
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      mqttConnected: this.mqttService?.getMetrics().status || 'disconnected',
      websocketConnected: websocketService.isConnected || false
    };
  }
}

// Export singleton instance
export const mqttWebSocketBridge = new MqttWebSocketBridge();