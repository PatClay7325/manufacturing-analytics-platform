/**
 * Enterprise Alerting & Notification System
 * PagerDuty, Slack, email integration with escalation policies
 */

import { EventEmitter } from 'events';
import { logger } from '@/lib/logger';
import { Counter, Histogram, Gauge, register } from 'prom-client';
import fetch from 'node-fetch';

export interface Alert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  source: string;
  timestamp: Date;
  tags: Record<string, string>;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface NotificationChannel {
  id: string;
  type: 'slack' | 'email' | 'pagerduty' | 'webhook' | 'sms';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
  filters: {
    severities: string[];
    sources: string[];
    tags: Record<string, string>;
  };
}

export interface EscalationPolicy {
  id: string;
  name: string;
  rules: EscalationRule[];
}

export interface EscalationRule {
  delayMinutes: number;
  channels: string[];
  conditions?: {
    unresolvedFor: number;
    severities: string[];
  };
}

export interface SLA {
  name: string;
  description: string;
  target: number; // percentage
  window: number; // hours
  metrics: {
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
  thresholds: {
    warning: number;
    critical: number;
  };
}

// Alerting metrics
const alertsGenerated = new Counter({
  name: 'alerts_generated_total',
  help: 'Total number of alerts generated',
  labelNames: ['severity', 'source'],
});

const notificationsSent = new Counter({
  name: 'notifications_sent_total',
  help: 'Total number of notifications sent',
  labelNames: ['channel', 'status'],
});

const alertResolutionTime = new Histogram({
  name: 'alert_resolution_time_seconds',
  help: 'Time taken to resolve alerts',
  labelNames: ['severity', 'source'],
  buckets: [60, 300, 900, 1800, 3600, 7200, 14400], // 1m to 4h
});

const activeAlerts = new Gauge({
  name: 'active_alerts_count',
  help: 'Number of currently active alerts',
  labelNames: ['severity'],
});

const slaCompliance = new Gauge({
  name: 'sla_compliance_percentage',
  help: 'SLA compliance percentage',
  labelNames: ['sla_name'],
});

register.registerMetric(alertsGenerated);
register.registerMetric(notificationsSent);
register.registerMetric(alertResolutionTime);
register.registerMetric(activeAlerts);
register.registerMetric(slaCompliance);

export class AlertManager extends EventEmitter {
  private static instance: AlertManager;
  private alerts = new Map<string, Alert>();
  private channels = new Map<string, NotificationChannel>();
  private escalationPolicies = new Map<string, EscalationPolicy>();
  private slas = new Map<string, SLA>();
  private escalationTimers = new Map<string, NodeJS.Timeout>();
  private slaMonitorInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.setupDefaultChannels();
    this.setupDefaultEscalationPolicies();
    this.setupDefaultSLAs();
    this.startSLAMonitoring();
  }

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  /**
   * Create and process a new alert
   */
  async createAlert(alert: Omit<Alert, 'id' | 'timestamp'>): Promise<string> {
    const fullAlert: Alert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date(),
    };

    // Store alert
    this.alerts.set(fullAlert.id, fullAlert);

    // Update metrics
    alertsGenerated.inc({ severity: fullAlert.severity, source: fullAlert.source });
    this.updateActiveAlertsMetrics();

    logger.info({
      alertId: fullAlert.id,
      severity: fullAlert.severity,
      title: fullAlert.title,
      source: fullAlert.source,
    }, 'Alert created');

    // Emit alert event
    this.emit('alert:created', fullAlert);

    // Process notifications
    await this.processAlert(fullAlert);

    return fullAlert.id;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy?: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) {
      return false;
    }

    const resolvedAt = new Date();
    const resolutionTime = (resolvedAt.getTime() - alert.timestamp.getTime()) / 1000;

    // Update alert
    alert.resolved = true;
    alert.resolvedAt = resolvedAt;
    alert.resolvedBy = resolvedBy;

    // Record resolution time
    alertResolutionTime.observe(
      { severity: alert.severity, source: alert.source },
      resolutionTime
    );

    // Update metrics
    this.updateActiveAlertsMetrics();

    // Clear escalation timer
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    logger.info({
      alertId,
      resolutionTime,
      resolvedBy,
    }, 'Alert resolved');

    // Emit resolution event
    this.emit('alert:resolved', alert);

    // Send resolution notifications
    await this.sendResolutionNotifications(alert);

    return true;
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(filters?: {
    severity?: string[];
    source?: string[];
    tags?: Record<string, string>;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values()).filter(alert => !alert.resolved);

    if (filters) {
      if (filters.severity) {
        alerts = alerts.filter(alert => filters.severity!.includes(alert.severity));
      }
      if (filters.source) {
        alerts = alerts.filter(alert => filters.source!.includes(alert.source));
      }
      if (filters.tags) {
        alerts = alerts.filter(alert => {
          return Object.entries(filters.tags!).every(([key, value]) => 
            alert.tags[key] === value
          );
        });
      }
    }

    return alerts.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Add notification channel
   */
  addNotificationChannel(channel: NotificationChannel): void {
    this.channels.set(channel.id, channel);
    logger.info({ channelId: channel.id, type: channel.type }, 'Notification channel added');
  }

  /**
   * Add escalation policy
   */
  addEscalationPolicy(policy: EscalationPolicy): void {
    this.escalationPolicies.set(policy.id, policy);
    logger.info({ policyId: policy.id }, 'Escalation policy added');
  }

  /**
   * Add SLA definition
   */
  addSLA(sla: SLA): void {
    this.slas.set(sla.name, sla);
    logger.info({ slaName: sla.name, target: sla.target }, 'SLA added');
  }

  /**
   * Get SLA status
   */
  getSLAStatus(): Array<SLA & { currentCompliance: number; status: 'ok' | 'warning' | 'critical' }> {
    return Array.from(this.slas.values()).map(sla => {
      // Calculate current compliance based on recent metrics
      const currentCompliance = this.calculateSLACompliance(sla);
      
      let status: 'ok' | 'warning' | 'critical' = 'ok';
      if (currentCompliance < sla.thresholds.critical) {
        status = 'critical';
      } else if (currentCompliance < sla.thresholds.warning) {
        status = 'warning';
      }

      return {
        ...sla,
        currentCompliance,
        status,
      };
    });
  }

  /**
   * Get alerting statistics
   */
  getStatistics(): {
    totalAlerts: number;
    activeAlerts: number;
    resolvedAlerts: number;
    averageResolutionTime: number;
    alertsBySeverity: Record<string, number>;
    alertsBySource: Record<string, number>;
  } {
    const allAlerts = Array.from(this.alerts.values());
    const activeAlerts = allAlerts.filter(alert => !alert.resolved);
    const resolvedAlerts = allAlerts.filter(alert => alert.resolved);

    const resolutionTimes = resolvedAlerts
      .filter(alert => alert.resolvedAt)
      .map(alert => alert.resolvedAt!.getTime() - alert.timestamp.getTime());

    const averageResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length / 1000
      : 0;

    const alertsBySeverity = allAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const alertsBySource = allAlerts.reduce((acc, alert) => {
      acc[alert.source] = (acc[alert.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAlerts: allAlerts.length,
      activeAlerts: activeAlerts.length,
      resolvedAlerts: resolvedAlerts.length,
      averageResolutionTime,
      alertsBySeverity,
      alertsBySource,
    };
  }

  /**
   * Process alert and send notifications
   */
  private async processAlert(alert: Alert): Promise<void> {
    // Find matching channels based on filters
    const matchingChannels = Array.from(this.channels.values()).filter(channel => 
      this.channelMatchesAlert(channel, alert)
    );

    // Send immediate notifications
    for (const channel of matchingChannels) {
      await this.sendNotification(channel, alert, 'immediate');
    }

    // Setup escalation if needed
    if (alert.severity === 'critical' || alert.severity === 'high') {
      this.setupEscalation(alert);
    }
  }

  /**
   * Setup escalation timer for alert
   */
  private setupEscalation(alert: Alert): void {
    const policy = this.escalationPolicies.get('default');
    if (!policy) return;

    const processEscalation = async (ruleIndex: number) => {
      if (ruleIndex >= policy.rules.length) {
        logger.warn({ alertId: alert.id }, 'Alert escalation exhausted');
        return;
      }

      const rule = policy.rules[ruleIndex];
      
      // Check if alert is still active and meets conditions
      const currentAlert = this.alerts.get(alert.id);
      if (!currentAlert || currentAlert.resolved) {
        return;
      }

      // Check conditions if specified
      if (rule.conditions) {
        const alertAge = (Date.now() - currentAlert.timestamp.getTime()) / 1000 / 60;
        if (alertAge < rule.conditions.unresolvedFor) {
          return;
        }
        if (!rule.conditions.severities.includes(currentAlert.severity)) {
          return;
        }
      }

      logger.info({
        alertId: alert.id,
        escalationLevel: ruleIndex + 1,
        channels: rule.channels,
      }, 'Escalating alert');

      // Send escalation notifications
      for (const channelId of rule.channels) {
        const channel = this.channels.get(channelId);
        if (channel) {
          await this.sendNotification(channel, currentAlert, 'escalation', ruleIndex + 1);
        }
      }

      // Setup next escalation if available
      if (ruleIndex + 1 < policy.rules.length) {
        const nextRule = policy.rules[ruleIndex + 1];
        const timer = setTimeout(() => {
          processEscalation(ruleIndex + 1);
        }, nextRule.delayMinutes * 60 * 1000);
        
        this.escalationTimers.set(alert.id, timer);
      }
    };

    // Start escalation with first rule
    if (policy.rules.length > 0) {
      const firstRule = policy.rules[0];
      const timer = setTimeout(() => {
        processEscalation(0);
      }, firstRule.delayMinutes * 60 * 1000);
      
      this.escalationTimers.set(alert.id, timer);
    }
  }

  /**
   * Send notification through channel
   */
  private async sendNotification(
    channel: NotificationChannel,
    alert: Alert,
    type: 'immediate' | 'escalation' | 'resolution',
    escalationLevel?: number
  ): Promise<void> {
    if (!channel.enabled) {
      return;
    }

    try {
      switch (channel.type) {
        case 'slack':
          await this.sendSlackNotification(channel, alert, type, escalationLevel);
          break;
        case 'email':
          await this.sendEmailNotification(channel, alert, type, escalationLevel);
          break;
        case 'pagerduty':
          await this.sendPagerDutyNotification(channel, alert, type, escalationLevel);
          break;
        case 'webhook':
          await this.sendWebhookNotification(channel, alert, type, escalationLevel);
          break;
        case 'sms':
          await this.sendSMSNotification(channel, alert, type, escalationLevel);
          break;
      }

      notificationsSent.inc({ channel: channel.type, status: 'success' });
      
      logger.info({
        channelId: channel.id,
        channelType: channel.type,
        alertId: alert.id,
        type,
        escalationLevel,
      }, 'Notification sent successfully');
    } catch (error) {
      notificationsSent.inc({ channel: channel.type, status: 'error' });
      
      logger.error({
        error,
        channelId: channel.id,
        alertId: alert.id,
      }, 'Failed to send notification');
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(
    channel: NotificationChannel,
    alert: Alert,
    type: string,
    escalationLevel?: number
  ): Promise<void> {
    const { webhookUrl } = channel.config;
    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const color = {
      critical: '#ff0000',
      high: '#ff8800',
      medium: '#ffaa00',
      low: '#00aa00',
      info: '#0088aa',
    }[alert.severity];

    const escalationText = escalationLevel ? ` (Escalation Level ${escalationLevel})` : '';
    const typeText = type === 'resolution' ? 'RESOLVED' : 'ALERT';

    const payload = {
      text: `${typeText}${escalationText}: ${alert.title}`,
      attachments: [
        {
          color,
          fields: [
            { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
            { title: 'Source', value: alert.source, short: true },
            { title: 'Description', value: alert.description, short: false },
            { title: 'Time', value: alert.timestamp.toISOString(), short: true },
          ],
        },
      ],
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send PagerDuty notification
   */
  private async sendPagerDutyNotification(
    channel: NotificationChannel,
    alert: Alert,
    type: string,
    escalationLevel?: number
  ): Promise<void> {
    const { routingKey, apiUrl } = channel.config;
    if (!routingKey) {
      throw new Error('PagerDuty routing key not configured');
    }

    const eventAction = type === 'resolution' ? 'resolve' : 'trigger';
    
    const payload = {
      routing_key: routingKey,
      event_action: eventAction,
      dedup_key: alert.id,
      payload: {
        summary: `${alert.title} (${alert.severity})`,
        source: alert.source,
        severity: alert.severity,
        timestamp: alert.timestamp.toISOString(),
        custom_details: {
          description: alert.description,
          tags: alert.tags,
          escalation_level: escalationLevel,
        },
      },
    };

    const url = apiUrl || 'https://events.pagerduty.com/v2/enqueue';
    
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    channel: NotificationChannel,
    alert: Alert,
    type: string,
    escalationLevel?: number
  ): Promise<void> {
    // Email implementation would depend on your email service (SendGrid, SES, etc.)
    logger.info({
      channel: channel.id,
      alertId: alert.id,
      type,
      recipients: channel.config.recipients,
    }, 'Email notification would be sent here');
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(
    channel: NotificationChannel,
    alert: Alert,
    type: string,
    escalationLevel?: number
  ): Promise<void> {
    const { url, headers } = channel.config;
    if (!url) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      alert,
      type,
      escalationLevel,
      timestamp: new Date().toISOString(),
    };

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    channel: NotificationChannel,
    alert: Alert,
    type: string,
    escalationLevel?: number
  ): Promise<void> {
    // SMS implementation would depend on your SMS service (Twilio, AWS SNS, etc.)
    logger.info({
      channel: channel.id,
      alertId: alert.id,
      type,
      phoneNumbers: channel.config.phoneNumbers,
    }, 'SMS notification would be sent here');
  }

  /**
   * Send resolution notifications
   */
  private async sendResolutionNotifications(alert: Alert): Promise<void> {
    const matchingChannels = Array.from(this.channels.values()).filter(channel => 
      this.channelMatchesAlert(channel, alert)
    );

    for (const channel of matchingChannels) {
      await this.sendNotification(channel, alert, 'resolution');
    }
  }

  /**
   * Check if channel matches alert based on filters
   */
  private channelMatchesAlert(channel: NotificationChannel, alert: Alert): boolean {
    // Check severity filter
    if (channel.filters.severities.length > 0 && 
        !channel.filters.severities.includes(alert.severity)) {
      return false;
    }

    // Check source filter
    if (channel.filters.sources.length > 0 && 
        !channel.filters.sources.includes(alert.source)) {
      return false;
    }

    // Check tag filters
    for (const [key, value] of Object.entries(channel.filters.tags)) {
      if (alert.tags[key] !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Update active alerts metrics
   */
  private updateActiveAlertsMetrics(): void {
    const activeAlerts = this.getActiveAlerts();
    
    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const alert of activeAlerts) {
      counts[alert.severity]++;
    }

    for (const [severity, count] of Object.entries(counts)) {
      activeAlerts.set({ severity }, count);
    }
  }

  /**
   * Calculate SLA compliance
   */
  private calculateSLACompliance(sla: SLA): number {
    // This would integrate with your metrics system to calculate actual compliance
    // For now, return a simulated value
    const baseCompliance = 95;
    const variation = Math.random() * 10 - 5; // ±5%
    return Math.max(0, Math.min(100, baseCompliance + variation));
  }

  /**
   * Start SLA monitoring
   */
  private startSLAMonitoring(): void {
    this.slaMonitorInterval = setInterval(() => {
      for (const sla of this.slas.values()) {
        const compliance = this.calculateSLACompliance(sla);
        slaCompliance.set({ sla_name: sla.name }, compliance);
        
        // Check for SLA violations
        if (compliance < sla.thresholds.critical) {
          this.createAlert({
            severity: 'critical',
            title: `SLA Violation: ${sla.name}`,
            description: `SLA compliance (${compliance.toFixed(1)}%) is below critical threshold (${sla.thresholds.critical}%)`,
            source: 'sla-monitor',
            tags: { sla: sla.name, type: 'sla_violation' },
          });
        } else if (compliance < sla.thresholds.warning) {
          this.createAlert({
            severity: 'high',
            title: `SLA Warning: ${sla.name}`,
            description: `SLA compliance (${compliance.toFixed(1)}%) is below warning threshold (${sla.thresholds.warning}%)`,
            source: 'sla-monitor',
            tags: { sla: sla.name, type: 'sla_warning' },
          });
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Setup default notification channels
   */
  private setupDefaultChannels(): void {
    // Slack channel
    if (process.env.SLACK_WEBHOOK_URL) {
      this.addNotificationChannel({
        id: 'slack-critical',
        type: 'slack',
        name: 'Slack Critical Alerts',
        enabled: true,
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
        },
        filters: {
          severities: ['critical', 'high'],
          sources: [],
          tags: {},
        },
      });
    }

    // PagerDuty channel
    if (process.env.PAGERDUTY_ROUTING_KEY) {
      this.addNotificationChannel({
        id: 'pagerduty-critical',
        type: 'pagerduty',
        name: 'PagerDuty Critical',
        enabled: true,
        config: {
          routingKey: process.env.PAGERDUTY_ROUTING_KEY,
        },
        filters: {
          severities: ['critical'],
          sources: [],
          tags: {},
        },
      });
    }
  }

  /**
   * Setup default escalation policies
   */
  private setupDefaultEscalationPolicies(): void {
    this.addEscalationPolicy({
      id: 'default',
      name: 'Default Escalation Policy',
      rules: [
        {
          delayMinutes: 5,
          channels: ['slack-critical'],
          conditions: {
            unresolvedFor: 5,
            severities: ['critical', 'high'],
          },
        },
        {
          delayMinutes: 15,
          channels: ['pagerduty-critical'],
          conditions: {
            unresolvedFor: 15,
            severities: ['critical'],
          },
        },
      ],
    });
  }

  /**
   * Setup default SLAs
   */
  private setupDefaultSLAs(): void {
    this.addSLA({
      name: 'System Uptime',
      description: 'Overall system availability',
      target: 99.9,
      window: 24,
      metrics: { uptime: 0, responseTime: 0, errorRate: 0 },
      thresholds: { warning: 99.5, critical: 99.0 },
    });

    this.addSLA({
      name: 'API Response Time',
      description: 'API response time under 500ms',
      target: 95.0,
      window: 24,
      metrics: { uptime: 0, responseTime: 0, errorRate: 0 },
      thresholds: { warning: 90.0, critical: 85.0 },
    });
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear all escalation timers
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }
    this.escalationTimers.clear();

    // Clear SLA monitoring
    if (this.slaMonitorInterval) {
      clearInterval(this.slaMonitorInterval);
    }
  }
}

// Export singleton instance
export const alertManager = AlertManager.getInstance();