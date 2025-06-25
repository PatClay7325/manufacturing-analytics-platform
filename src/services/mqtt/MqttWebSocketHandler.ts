/**
 * MQTT WebSocket Handler
 * 
 * Provides real-time streaming of MQTT data to web clients
 * Integrates with the existing WebSocket service
 */

import { getMqttService, MqttService } from './MqttService';
import { MqttMonitor } from './MqttMonitor';
import { logger } from '@/lib/logger';
import type { WebSocketMessage as WSMessage } from '@/services/websocketService';

export interface MqttWebSocketMessage extends WSMessage {
  type: 'metric' | 'alert' | 'status' | 'error';
  channel?: string;
  data: {
    topic?: string;
    payload: any;
    source: 'mqtt';
  };
}

export class MqttWebSocketHandler {
  private mqttService: MqttService | null = null;
  private mqttMonitor: MqttMonitor | null = null;
  private wsHandlers: Map<string, (message: MqttWebSocketMessage) => void> = new Map();
  private topicMappings: Map<string, string> = new Map(); // MQTT topic -> WS channel

  constructor() {
    // Initialize topic to channel mappings
    this.setupTopicMappings();
  }

  /**
   * Set up topic to channel mappings
   */
  private setupTopicMappings(): void {
    // Map MQTT topics to WebSocket channels
    this.topicMappings.set('sensors/+/data', 'metric:sensors');
    this.topicMappings.set('sensors/+/telemetry', 'metric:telemetry');
    this.topicMappings.set('factory/+/sensors/+/data', 'metric:factory');
    this.topicMappings.set('factory/+/production/+/status', 'status:production');
    this.topicMappings.set('factory/+/alerts', 'alert:factory');
  }

  /**
   * Initialize MQTT service connection
   */
  async initializeMqttService(mqttService: MqttService, monitor?: MqttMonitor): Promise<void> {
    this.mqttService = mqttService;
    this.mqttMonitor = monitor || null;

    // Set up MQTT event listeners
    this.mqttService.on('message', ({ topic, data }) => {
      this.broadcastMessage('data', topic, data);
    });

    this.mqttService.on('status', (status) => {
      this.broadcastMessage('status', undefined, { status });
    });

    this.mqttService.on('error', (error) => {
      this.broadcastMessage('error', undefined, { 
        error: error.message,
        stack: error.stack 
      });
    });

    this.mqttService.on('dataStored', ({ count, sensorData }) => {
      this.broadcastMessage('data', 'stored', { 
        count,
        sensors: sensorData.map(d => d.sensorId) 
      });
    });

    // Set up monitor event listeners if available
    if (this.mqttMonitor) {
      this.mqttMonitor.on('health', (health) => {
        this.broadcastMessage('health', undefined, health);
      });

      this.mqttMonitor.on('alert', (alert) => {
        this.broadcastMessage('status', 'alert', alert);
      });
    }
  }

  /**
   * Handle topic subscription
   */
  private handleSubscribe(clientId: string, topics: string[]): void {
    const socket = this.connectedClients.get(clientId);
    if (!socket) return;

    topics.forEach(topic => {
      if (!this.topicSubscriptions.has(topic)) {
        this.topicSubscriptions.set(topic, new Set());
      }
      this.topicSubscriptions.get(topic)!.add(clientId);
    });

    socket.emit('subscribed', { topics });
    logger.info(`Client ${clientId} subscribed to topics:`, topics);
  }

  /**
   * Handle topic unsubscription
   */
  private handleUnsubscribe(clientId: string, topics: string[]): void {
    const socket = this.connectedClients.get(clientId);
    if (!socket) return;

    topics.forEach(topic => {
      const subscribers = this.topicSubscriptions.get(topic);
      if (subscribers) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          this.topicSubscriptions.delete(topic);
        }
      }
    });

    socket.emit('unsubscribed', { topics });
    logger.info(`Client ${clientId} unsubscribed from topics:`, topics);
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(clientId: string): void {
    // Remove from connected clients
    this.connectedClients.delete(clientId);

    // Remove from all topic subscriptions
    this.topicSubscriptions.forEach(subscribers => {
      subscribers.delete(clientId);
    });
  }

  /**
   * Send status to a specific client
   */
  private async sendStatus(socket: Socket): Promise<void> {
    if (!this.mqttService) {
      socket.emit('status', {
        type: 'status',
        payload: { status: 'not_initialized' },
        timestamp: new Date()
      });
      return;
    }

    const metrics = this.mqttService.getMetrics();
    let health = null;

    if (this.mqttMonitor) {
      health = await this.mqttMonitor.getHealthStatus();
    }

    socket.emit('status', {
      type: 'status',
      payload: {
        metrics,
        health
      },
      timestamp: new Date()
    });
  }

  /**
   * Broadcast message to subscribed clients
   */
  private broadcastMessage(type: WebSocketMessage['type'], topic?: string, payload?: any): void {
    const message: WebSocketMessage = {
      type,
      topic,
      payload,
      timestamp: new Date()
    };

    if (topic) {
      // Send to clients subscribed to this topic
      const subscribers = this.getTopicSubscribers(topic);
      subscribers.forEach(clientId => {
        const socket = this.connectedClients.get(clientId);
        if (socket) {
          socket.emit('message', message);
        }
      });
    } else {
      // Broadcast to all connected clients
      this.io.emit('message', message);
    }
  }

  /**
   * Get subscribers for a topic (supports wildcards)
   */
  private getTopicSubscribers(topic: string): Set<string> {
    const subscribers = new Set<string>();

    this.topicSubscriptions.forEach((clientIds, pattern) => {
      if (this.topicMatches(topic, pattern)) {
        clientIds.forEach(id => subscribers.add(id));
      }
    });

    return subscribers;
  }

  /**
   * Check if a topic matches a pattern (supports MQTT wildcards)
   */
  private topicMatches(topic: string, pattern: string): boolean {
    const topicParts = topic.split('/');
    const patternParts = pattern.split('/');

    // Handle multi-level wildcard (#)
    if (pattern.includes('#')) {
      const hashIndex = patternParts.indexOf('#');
      if (hashIndex !== patternParts.length - 1) {
        return false; // # must be at the end
      }

      // Check all parts before #
      for (let i = 0; i < hashIndex; i++) {
        if (patternParts[i] !== '+' && patternParts[i] !== topicParts[i]) {
          return false;
        }
      }
      return true;
    }

    // Different lengths without #
    if (topicParts.length !== patternParts.length) {
      return false;
    }

    // Check each part
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] !== '+' && patternParts[i] !== topicParts[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get topic subscription summary
   */
  getSubscriptionSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    this.topicSubscriptions.forEach((subscribers, topic) => {
      summary[topic] = subscribers.size;
    });
    return summary;
  }
}