/**
 * MQTT Monitoring Service
 * 
 * Monitors MQTT service health, performance, and triggers alerts
 */

import { EventEmitter } from 'events';
import { prisma } from '@/lib/database';
import { logger } from '@/lib/logger';
import { MqttService, ServiceStatus } from './MqttService';

export interface MonitoringConfig {
  checkInterval?: number; // milliseconds
  thresholds?: {
    messageRate?: number; // messages per second
    errorRate?: number; // percentage
    bufferSize?: number; // max buffer size
    deadLetterSize?: number; // max dead letter queue size
    latency?: number; // milliseconds
  };
  alerting?: {
    enabled?: boolean;
    channels?: string[]; // email, slack, etc.
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  metrics: {
    messageRate: number;
    errorRate: number;
    bufferSize: number;
    deadLetterSize: number;
    uptime: number;
    lastMessageTime: Date | null;
  };
  issues: string[];
}

export class MqttMonitor extends EventEmitter {
  private mqttService: MqttService;
  private config: Required<MonitoringConfig>;
  private monitorTimer: NodeJS.Timeout | null = null;
  private startTime: Date;
  private lastCheck: Date;
  private messageHistory: { timestamp: Date; count: number }[] = [];
  private readonly historyWindow = 60000; // 1 minute

  constructor(mqttService: MqttService, config?: MonitoringConfig) {
    super();
    
    this.mqttService = mqttService;
    this.startTime = new Date();
    this.lastCheck = new Date();
    
    // Set default configuration
    this.config = {
      checkInterval: config.checkInterval || 10000, // 10 seconds
      thresholds: {
        messageRate: config.thresholds?.messageRate || 1000, // 1000 msgs/sec
        errorRate: config.thresholds?.errorRate || 5, // 5%
        bufferSize: config.thresholds?.bufferSize || 5000,
        deadLetterSize: config.thresholds?.deadLetterSize || 100,
        latency: config.thresholds?.latency || 1000 // 1 second
      },
      alerting: {
        enabled: config.alerting?.enabled !== false,
        channels: config.alerting?.channels || ['log']
      }
    };
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.monitorTimer) {
      return;
    }

    logger.info('Starting MQTT monitoring');
    
    // Initial check
    this.performHealthCheck();
    
    // Set up periodic checks
    this.monitorTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);

    // Monitor MQTT service events
    this.mqttService.on('status', (status) => {
      if (status === ServiceStatus.ERROR || status === ServiceStatus.DISCONNECTED) {
        this.sendAlert('critical', `MQTT service status changed to: ${status}`);
      }
    });

    this.mqttService.on('error', (error) => {
      this.sendAlert('error', `MQTT service error: ${error.message}`);
    });
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
    
    logger.info('Stopped MQTT monitoring');
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const metrics = this.mqttService.getMetrics();
      const now = new Date();
      
      // Update message history
      this.messageHistory.push({
        timestamp: now,
        count: metrics.messagesReceived
      });
      
      // Clean old history
      const cutoff = new Date(now.getTime() - this.historyWindow);
      this.messageHistory = this.messageHistory.filter(h => h.timestamp > cutoff);
      
      // Calculate metrics
      const messageRate = this.calculateMessageRate();
      const errorRate = this.calculateErrorRate(metrics);
      const uptime = now.getTime() - this.startTime.getTime();
      
      // Determine health status
      const issues: string[] = [];
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      // Check thresholds
      if (metrics.status !== ServiceStatus.CONNECTED) {
        issues.push(`Service not connected: ${metrics.status}`);
        status = 'unhealthy';
      }
      
      if (messageRate > this.config.thresholds.messageRate!) {
        issues.push(`High message rate: ${messageRate.toFixed(2)} msgs/sec`);
        status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
      }
      
      if (errorRate > this.config.thresholds.errorRate!) {
        issues.push(`High error rate: ${errorRate.toFixed(2)}%`);
        status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
      }
      
      if (metrics.bufferSize > this.config.thresholds.bufferSize!) {
        issues.push(`Large buffer size: ${metrics.bufferSize} messages`);
        status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
      }
      
      if (metrics.deadLetterQueueSize > this.config.thresholds.deadLetterSize!) {
        issues.push(`Large dead letter queue: ${metrics.deadLetterQueueSize} messages`);
        status = 'unhealthy';
      }
      
      // Check for stale data
      if (metrics.lastMessageTime) {
        const timeSinceLastMessage = now.getTime() - metrics.lastMessageTime.getTime();
        if (timeSinceLastMessage > 60000) { // 1 minute
          issues.push(`No messages received for ${Math.floor(timeSinceLastMessage / 1000)} seconds`);
          status = status === 'unhealthy' ? 'unhealthy' : 'degraded';
        }
      }
      
      // Create health status
      const healthStatus: HealthStatus = {
        status,
        timestamp: now,
        metrics: {
          messageRate,
          errorRate,
          bufferSize: metrics.bufferSize,
          deadLetterSize: metrics.deadLetterQueueSize,
          uptime,
          lastMessageTime: metrics.lastMessageTime
        },
        issues
      };
      
      // Store health status
      await this.storeHealthStatus(healthStatus);
      
      // Emit health status
      this.emit('health', healthStatus);
      
      // Send alerts if needed
      if (status === 'unhealthy') {
        this.sendAlert('critical', `MQTT service unhealthy: ${issues.join(', ')}`);
      } else if (status === 'degraded') {
        this.sendAlert('warning', `MQTT service degraded: ${issues.join(', ')}`);
      }
      
      this.lastCheck = now;
      
    } catch (error) {
      logger.error('Error performing health check:', error);
      this.sendAlert('error', `Health check failed: ${error.message}`);
    }
  }

  /**
   * Calculate message rate (messages per second)
   */
  private calculateMessageRate(): number {
    if (this.messageHistory.length < 2) {
      return 0;
    }
    
    const oldest = this.messageHistory[0];
    const newest = this.messageHistory[this.messageHistory.length - 1];
    const timeDiff = (newest.timestamp.getTime() - oldest.timestamp.getTime()) / 1000;
    const messageDiff = newest.count - oldest.count;
    
    return timeDiff > 0 ? messageDiff / timeDiff : 0;
  }

  /**
   * Calculate error rate (percentage)
   */
  private calculateErrorRate(metrics: any): number {
    const total = metrics.messagesReceived;
    if (total === 0) return 0;
    
    return (metrics.messagesFailed / total) * 100;
  }

  /**
   * Store health status in database
   */
  private async storeHealthStatus(status: HealthStatus): Promise<void> {
    try {
      await prisma.metric.create({
        data: {
          id: `mqtt-health-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          workUnitId: 'mqtt-monitor',
          name: 'mqtt.health.status',
          value: status.status === 'healthy' ? 1 : status.status === 'degraded' ? 0.5 : 0,
          timestamp: status.timestamp,
          source: 'mqtt-monitor',
          quality: 100,
          tags: {
            messageRate: status.metrics.messageRate,
            errorRate: status.metrics.errorRate,
            bufferSize: status.metrics.bufferSize,
            deadLetterSize: status.metrics.deadLetterSize,
            issues: status.issues
          }
        }
      });
    } catch (error) {
      logger.error('Failed to store health status:', error);
    }
  }

  /**
   * Send alert
   */
  private async sendAlert(severity: 'info' | 'warning' | 'error' | 'critical', message: string): Promise<void> {
    if (!this.config.alerting.enabled) {
      return;
    }
    
    const alert = {
      service: 'mqtt',
      severity,
      message,
      timestamp: new Date()
    };
    
    // Log alert
    if (this.config.alerting.channels.includes('log')) {
      logger[severity === 'critical' ? 'error' : severity](`MQTT Alert: ${message}`);
    }
    
    // Store alert in database
    try {
      await prisma.alert.create({
        data: {
          id: `mqtt-alert-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          workUnitId: 'mqtt-monitor',
          name: `MQTT ${severity}`,
          severity: severity.toUpperCase(),
          message,
          status: 'ACTIVE',
          triggeredAt: new Date(),
          metadata: alert
        }
      });
    } catch (error) {
      logger.error('Failed to store alert:', error);
    }
    
    // Emit alert event
    this.emit('alert', alert);
  }

  /**
   * Get current health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const metrics = this.mqttService.getMetrics();
    const messageRate = this.calculateMessageRate();
    const errorRate = this.calculateErrorRate(metrics);
    const uptime = new Date().getTime() - this.startTime.getTime();
    
    return {
      status: metrics.status === ServiceStatus.CONNECTED ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      metrics: {
        messageRate,
        errorRate,
        bufferSize: metrics.bufferSize,
        deadLetterSize: metrics.deadLetterQueueSize,
        uptime,
        lastMessageTime: metrics.lastMessageTime
      },
      issues: metrics.status !== ServiceStatus.CONNECTED ? [`Service ${metrics.status}`] : []
    };
  }

  /**
   * Get monitoring metrics
   */
  getMetrics() {
    return {
      startTime: this.startTime,
      lastCheck: this.lastCheck,
      messageHistory: this.messageHistory.length,
      config: this.config
    };
  }
}