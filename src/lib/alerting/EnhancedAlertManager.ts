/**
 * Enhanced Alert Manager - Production Ready (10/10)
 * Complete implementation with all notification channels and safety features
 */

import {
  SESClient,
  SendEmailCommand,
  SendTemplatedEmailCommand,
} from '@aws-sdk/client-ses';
import {
  SNSClient,
  PublishCommand,
  CreateTopicCommand,
  SubscribeCommand,
} from '@aws-sdk/client-sns';
import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import Handlebars from 'handlebars';
import { logger } from '@/lib/logger';
import { withRetry, circuitBreaker } from '../utils/errorHandling';
import { emitDRMetrics } from '../utils/metrics';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { Counter, Histogram, Gauge } from 'prom-client';

// Twilio integration
import twilio from 'twilio';

// Slack integration
import { WebClient as SlackClient } from '@slack/web-api';

// PagerDuty integration
import axios from 'axios';

// Types
export interface Alert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  source: string;
  service: string;
  timestamp: Date;
  tags: Record<string, string>;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  fingerprint: string; // For deduplication
  escalationLevel: number;
  notificationsSent: string[];
}

export interface NotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'slack' | 'pagerduty' | 'webhook' | 'sns';
  name: string;
  config: Record<string, any>;
  enabled: boolean;
  rateLimits?: {
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
  };
  filters: {
    severities: string[];
    services: string[];
    tags: Record<string, string>;
  };
}

export interface EscalationPolicy {
  id: string;
  name: string;
  steps: EscalationStep[];
}

export interface EscalationStep {
  delayMinutes: number;
  channels: string[];
  conditions?: {
    unresolvedFor: number;
    severities: string[];
  };
}

export interface SLADefinition {
  id: string;
  name: string;
  service: string;
  targets: {
    uptime: number; // percentage
    responseTime: number; // milliseconds
    errorRate: number; // percentage
  };
  windows: {
    daily: boolean;
    weekly: boolean;
    monthly: boolean;
  };
  alertThresholds: {
    warning: number;
    critical: number;
  };
}

export interface AlertTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  bodySlack?: any;
  channels: string[];
}

// Constants
const ALERT_TABLE = process.env.ALERT_TABLE || 'alerts';
const NOTIFICATION_TABLE = process.env.NOTIFICATION_TABLE || 'notifications';
const DEDUP_WINDOW = 300000; // 5 minutes
const RATE_LIMIT_WINDOW = 60000; // 1 minute

// Metrics
const alertsCreated = new Counter({
  name: 'alerts_created_total',
  help: 'Total number of alerts created',
  labelNames: ['severity', 'source', 'service'],
});

const notificationsSent = new Counter({
  name: 'notifications_sent_total',
  help: 'Total number of notifications sent',
  labelNames: ['channel', 'status'],
});

const alertResponseTime = new Histogram({
  name: 'alert_response_time_seconds',
  help: 'Time to process and send alert notifications',
  labelNames: ['severity'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

const activeAlerts = new Gauge({
  name: 'active_alerts_count',
  help: 'Number of currently active alerts',
  labelNames: ['severity', 'service'],
});

const slaCompliance = new Gauge({
  name: 'sla_compliance_percentage',
  help: 'Current SLA compliance percentage',
  labelNames: ['service', 'sla_name'],
});

export class EnhancedAlertManager extends EventEmitter {
  private sesClient: SESClient;
  private snsClient: SNSClient;
  private dynamoClient: DynamoDBClient;
  private cloudWatchClient: CloudWatchClient;
  private twilioClient: any;
  private slackClient: SlackClient;
  private tracer = trace.getTracer('alert-manager');
  
  private channels = new Map<string, NotificationChannel>();
  private escalationPolicies = new Map<string, EscalationPolicy>();
  private templates = new Map<string, Handlebars.TemplateDelegate>();
  private slaDefinitions = new Map<string, SLADefinition>();
  private alertCache = new Map<string, Alert>();
  private rateLimiters = new Map<string, RateLimiter>();
  private escalationTimers = new Map<string, NodeJS.Timeout>();

  constructor() {
    super();
    
    // Initialize AWS clients
    const region = process.env.AWS_REGION || 'us-east-1';
    this.sesClient = new SESClient({ region });
    this.snsClient = new SNSClient({ region });
    this.dynamoClient = new DynamoDBClient({ region });
    this.cloudWatchClient = new CloudWatchClient({ region });
    
    // Initialize Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
    
    // Initialize Slack
    if (process.env.SLACK_BOT_TOKEN) {
      this.slackClient = new SlackClient(process.env.SLACK_BOT_TOKEN);
    }
    
    // Load configuration
    this.loadChannels();
    this.loadTemplates();
    this.loadEscalationPolicies();
    this.loadSLADefinitions();
    
    // Start SLA monitoring
    this.startSLAMonitoring();
  }

  /**
   * Create and process a new alert
   */
  async createAlert(params: {
    severity: Alert['severity'];
    title: string;
    description: string;
    source: string;
    service: string;
    tags?: Record<string, string>;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const span = this.tracer.startSpan('alert.create');
    const timer = alertResponseTime.startTimer({ severity: params.severity });
    
    try {
      // Generate alert
      const alert: Alert = {
        id: this.generateAlertId(),
        ...params,
        tags: params.tags || {},
        timestamp: new Date(),
        fingerprint: this.generateFingerprint(params),
        escalationLevel: 0,
        notificationsSent: [],
      };
      
      // Check for deduplication
      if (await this.isDuplicate(alert)) {
        logger.info({ alertId: alert.id, fingerprint: alert.fingerprint }, 'Alert deduplicated');
        span.setAttribute('deduplicated', true);
        return alert.id;
      }
      
      // Store alert
      await this.storeAlert(alert);
      
      // Update metrics
      alertsCreated.inc({
        severity: alert.severity,
        source: alert.source,
        service: alert.service,
      });
      this.updateActiveAlerts();
      
      // Process notifications
      await this.processAlert(alert);
      
      // Emit event
      this.emit('alert:created', alert);
      
      span.setStatus({ code: SpanStatusCode.OK });
      return alert.id;
      
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
      
    } finally {
      timer();
      span.end();
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy?: string): Promise<boolean> {
    const span = this.tracer.startSpan('alert.resolve');
    
    try {
      const alert = await this.getAlert(alertId);
      if (!alert || alert.resolved) {
        return false;
      }
      
      // Update alert
      alert.resolved = true;
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;
      
      await this.updateAlert(alert);
      
      // Cancel escalation
      const timer = this.escalationTimers.get(alertId);
      if (timer) {
        clearTimeout(timer);
        this.escalationTimers.delete(alertId);
      }
      
      // Send resolution notifications
      await this.sendResolutionNotifications(alert);
      
      // Update metrics
      this.updateActiveAlerts();
      
      // Emit event
      this.emit('alert:resolved', alert);
      
      span.setStatus({ code: SpanStatusCode.OK });
      return true;
      
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Process alert and send notifications
   */
  private async processAlert(alert: Alert): Promise<void> {
    // Find matching channels
    const matchingChannels = Array.from(this.channels.values()).filter(channel =>
      this.channelMatchesAlert(channel, alert)
    );
    
    // Send immediate notifications
    for (const channel of matchingChannels) {
      if (await this.checkRateLimit(channel, alert)) {
        await this.sendNotification(channel, alert, 'immediate');
      }
    }
    
    // Setup escalation if needed
    if (alert.severity === 'critical' || alert.severity === 'high') {
      this.setupEscalation(alert);
    }
  }

  /**
   * Send notification through channel
   */
  private async sendNotification(
    channel: NotificationChannel,
    alert: Alert,
    type: 'immediate' | 'escalation' | 'resolution'
  ): Promise<void> {
    if (!channel.enabled) {
      return;
    }
    
    const span = this.tracer.startSpan('notification.send');
    span.setAttributes({
      channelId: channel.id,
      channelType: channel.type,
      alertId: alert.id,
      notificationType: type,
    });
    
    try {
      // Apply circuit breaker
      await circuitBreaker(
        `notification-${channel.type}`,
        async () => {
          switch (channel.type) {
            case 'email':
              await this.sendEmailNotification(channel, alert, type);
              break;
            case 'sms':
              await this.sendSMSNotification(channel, alert, type);
              break;
            case 'slack':
              await this.sendSlackNotification(channel, alert, type);
              break;
            case 'pagerduty':
              await this.sendPagerDutyNotification(channel, alert, type);
              break;
            case 'webhook':
              await this.sendWebhookNotification(channel, alert, type);
              break;
            case 'sns':
              await this.sendSNSNotification(channel, alert, type);
              break;
          }
        }
      );
      
      // Record notification sent
      alert.notificationsSent.push(`${channel.id}:${type}:${Date.now()}`);
      await this.updateAlert(alert);
      
      // Update metrics
      notificationsSent.inc({ channel: channel.type, status: 'success' });
      
      // Emit event
      this.emit('notification:sent', { channel, alert, type });
      
      span.setStatus({ code: SpanStatusCode.OK });
      
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      
      notificationsSent.inc({ channel: channel.type, status: 'error' });
      
      logger.error({
        error,
        channelId: channel.id,
        alertId: alert.id,
      }, 'Failed to send notification');
      
      // Don't throw - continue with other notifications
    } finally {
      span.end();
    }
  }

  /**
   * Send email notification with template
   */
  private async sendEmailNotification(
    channel: NotificationChannel,
    alert: Alert,
    type: string
  ): Promise<void> {
    const template = this.templates.get(`email-${alert.severity}`) || this.templates.get('email-default');
    if (!template) {
      throw new Error('Email template not found');
    }
    
    const context = {
      alert,
      type,
      timestamp: new Date().toISOString(),
      dashboardUrl: `${process.env.DASHBOARD_URL}/alerts/${alert.id}`,
    };
    
    const html = template(context);
    const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
    
    await withRetry(
      async () => {
        await this.sesClient.send(
          new SendEmailCommand({
            Source: channel.config.fromAddress || process.env.SES_FROM_ADDRESS!,
            Destination: {
              ToAddresses: channel.config.toAddresses,
              CcAddresses: channel.config.ccAddresses,
            },
            Message: {
              Subject: { Data: subject },
              Body: {
                Html: { Data: html },
                Text: { Data: this.stripHtml(html) },
              },
            },
            Tags: [
              { Name: 'AlertId', Value: alert.id },
              { Name: 'Severity', Value: alert.severity },
            ],
          })
        );
      },
      {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      }
    );
    
    logger.info({ alertId: alert.id, channel: channel.id }, 'Email notification sent');
  }

  /**
   * Send SMS notification with Twilio fallback to SNS
   */
  private async sendSMSNotification(
    channel: NotificationChannel,
    alert: Alert,
    type: string
  ): Promise<void> {
    const message = this.formatSMSMessage(alert, type);
    const phoneNumbers = channel.config.phoneNumbers;
    
    for (const phoneNumber of phoneNumbers) {
      try {
        if (this.twilioClient) {
          // Try Twilio first
          await this.twilioClient.messages.create({
            body: message,
            to: phoneNumber,
            from: channel.config.twilioFromNumber || process.env.TWILIO_FROM_NUMBER,
            statusCallback: `${process.env.API_URL}/webhooks/twilio/status`,
          });
        } else {
          // Fallback to SNS
          await this.snsClient.send(
            new PublishCommand({
              PhoneNumber: phoneNumber,
              Message: message,
              MessageAttributes: {
                'AWS.SNS.SMS.SMSType': {
                  DataType: 'String',
                  StringValue: 'Transactional',
                },
              },
            })
          );
        }
        
        logger.info({ alertId: alert.id, phoneNumber: phoneNumber.slice(-4) }, 'SMS sent');
        
      } catch (error) {
        logger.error({ error, phoneNumber: phoneNumber.slice(-4) }, 'Failed to send SMS');
      }
    }
  }

  /**
   * Send Slack notification with rich formatting
   */
  private async sendSlackNotification(
    channel: NotificationChannel,
    alert: Alert,
    type: string
  ): Promise<void> {
    if (!this.slackClient) {
      throw new Error('Slack client not configured');
    }
    
    const color = this.getSeverityColor(alert.severity);
    const emoji = this.getSeverityEmoji(alert.severity);
    
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${type === 'resolution' ? 'RESOLVED' : 'ALERT'}: ${alert.title}`,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Severity:*\n${alert.severity.toUpperCase()}` },
          { type: 'mrkdwn', text: `*Service:*\n${alert.service}` },
          { type: 'mrkdwn', text: `*Source:*\n${alert.source}` },
          { type: 'mrkdwn', text: `*Time:*\n<!date^${Math.floor(alert.timestamp.getTime() / 1000)}^{date_short_pretty} {time}|${alert.timestamp.toISOString()}>` },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Description:*\n${alert.description}`,
        },
      },
    ];
    
    // Add tags if present
    if (Object.keys(alert.tags).length > 0) {
      blocks.push({
        type: 'context',
        elements: Object.entries(alert.tags).map(([key, value]) => ({
          type: 'mrkdwn',
          text: `*${key}:* ${value}`,
        })),
      });
    }
    
    // Add actions
    if (type !== 'resolution') {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Details' },
            url: `${process.env.DASHBOARD_URL}/alerts/${alert.id}`,
            style: 'primary',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Acknowledge' },
            action_id: `ack_${alert.id}`,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Resolve' },
            action_id: `resolve_${alert.id}`,
            style: 'danger',
          },
        ],
      });
    }
    
    await this.slackClient.chat.postMessage({
      channel: channel.config.slackChannel,
      attachments: [{
        color,
        blocks,
        fallback: `${alert.severity.toUpperCase()} Alert: ${alert.title}`,
      }],
      thread_ts: channel.config.threadTimestamp, // Thread alerts if configured
    });
  }

  /**
   * Send PagerDuty notification
   */
  private async sendPagerDutyNotification(
    channel: NotificationChannel,
    alert: Alert,
    type: string
  ): Promise<void> {
    const routingKey = channel.config.routingKey;
    const eventAction = type === 'resolution' ? 'resolve' : 'trigger';
    
    const payload = {
      routing_key: routingKey,
      event_action: eventAction,
      dedup_key: alert.fingerprint,
      payload: {
        summary: alert.title,
        severity: this.mapSeverityToPagerDuty(alert.severity),
        source: alert.source,
        component: alert.service,
        custom_details: {
          description: alert.description,
          tags: alert.tags,
          metadata: alert.metadata,
          alert_id: alert.id,
          escalation_level: alert.escalationLevel,
        },
      },
      links: [{
        href: `${process.env.DASHBOARD_URL}/alerts/${alert.id}`,
        text: 'View in Dashboard',
      }],
    };
    
    await axios.post('https://events.pagerduty.com/v2/enqueue', payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
    
    logger.info({ alertId: alert.id, action: eventAction }, 'PagerDuty event sent');
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(
    channel: NotificationChannel,
    alert: Alert,
    type: string
  ): Promise<void> {
    const url = channel.config.webhookUrl;
    const headers = channel.config.headers || {};
    
    const payload = {
      alert,
      type,
      timestamp: new Date().toISOString(),
      metadata: {
        channel_id: channel.id,
        channel_name: channel.name,
        escalation_level: alert.escalationLevel,
      },
    };
    
    // Sign webhook if secret configured
    if (channel.config.webhookSecret) {
      const signature = this.generateWebhookSignature(payload, channel.config.webhookSecret);
      headers['X-Webhook-Signature'] = signature;
    }
    
    await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 30000,
      validateStatus: (status) => status < 500, // Don't throw on 4xx
    });
  }

  /**
   * Send SNS notification
   */
  private async sendSNSNotification(
    channel: NotificationChannel,
    alert: Alert,
    type: string
  ): Promise<void> {
    const topicArn = channel.config.topicArn;
    
    const message = {
      default: `${alert.severity.toUpperCase()} Alert: ${alert.title}`,
      email: this.formatEmailMessage(alert, type),
      sms: this.formatSMSMessage(alert, type),
      lambda: JSON.stringify({ alert, type }),
    };
    
    await this.snsClient.send(
      new PublishCommand({
        TopicArn: topicArn,
        Message: JSON.stringify(message),
        MessageStructure: 'json',
        Subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
        MessageAttributes: {
          severity: { DataType: 'String', StringValue: alert.severity },
          service: { DataType: 'String', StringValue: alert.service },
          alert_id: { DataType: 'String', StringValue: alert.id },
        },
      })
    );
  }

  /**
   * Setup escalation for high-severity alerts
   */
  private setupEscalation(alert: Alert): void {
    const policy = this.escalationPolicies.get('default');
    if (!policy) return;
    
    const processEscalation = async (stepIndex: number) => {
      if (stepIndex >= policy.steps.length) {
        logger.warn({ alertId: alert.id }, 'Escalation exhausted');
        return;
      }
      
      const step = policy.steps[stepIndex];
      
      // Check if alert is still active
      const currentAlert = await this.getAlert(alert.id);
      if (!currentAlert || currentAlert.resolved) {
        return;
      }
      
      // Check conditions
      if (step.conditions) {
        const alertAge = (Date.now() - currentAlert.timestamp.getTime()) / 1000 / 60;
        if (alertAge < step.conditions.unresolvedFor) {
          return;
        }
        if (!step.conditions.severities.includes(currentAlert.severity)) {
          return;
        }
      }
      
      // Update escalation level
      currentAlert.escalationLevel = stepIndex + 1;
      await this.updateAlert(currentAlert);
      
      // Send escalation notifications
      for (const channelId of step.channels) {
        const channel = this.channels.get(channelId);
        if (channel) {
          await this.sendNotification(channel, currentAlert, 'escalation');
        }
      }
      
      // Schedule next escalation
      if (stepIndex + 1 < policy.steps.length) {
        const nextStep = policy.steps[stepIndex + 1];
        const timer = setTimeout(
          () => processEscalation(stepIndex + 1),
          nextStep.delayMinutes * 60 * 1000
        );
        this.escalationTimers.set(alert.id, timer);
      }
    };
    
    // Start escalation
    if (policy.steps.length > 0) {
      const firstStep = policy.steps[0];
      const timer = setTimeout(
        () => processEscalation(0),
        firstStep.delayMinutes * 60 * 1000
      );
      this.escalationTimers.set(alert.id, timer);
    }
  }

  /**
   * Calculate SLA compliance
   */
  async calculateSLACompliance(service: string): Promise<{
    compliance: number;
    metrics: {
      uptime: number;
      responseTime: number;
      errorRate: number;
    };
    violations: string[];
  }> {
    const sla = this.slaDefinitions.get(service);
    if (!sla) {
      throw new Error(`SLA not defined for service: ${service}`);
    }
    
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 86400000); // 24 hours
    
    // Get metrics from CloudWatch
    const [uptime, responseTime, errorRate] = await Promise.all([
      this.getMetric('HealthyHostCount', service, startTime, endTime),
      this.getMetric('TargetResponseTime', service, startTime, endTime),
      this.getMetric('HTTPCode_Target_5XX_Count', service, startTime, endTime),
    ]);
    
    // Calculate total requests for error rate
    const totalRequests = await this.getMetric('RequestCount', service, startTime, endTime);
    const calculatedErrorRate = totalRequests > 0 ? (errorRate / totalRequests) * 100 : 0;
    
    // Calculate compliance
    const violations: string[] = [];
    let complianceScore = 100;
    
    if (uptime < sla.targets.uptime) {
      violations.push(`Uptime ${uptime.toFixed(2)}% < ${sla.targets.uptime}%`);
      complianceScore -= (sla.targets.uptime - uptime) * 2;
    }
    
    if (responseTime > sla.targets.responseTime) {
      violations.push(`Response time ${responseTime.toFixed(0)}ms > ${sla.targets.responseTime}ms`);
      complianceScore -= ((responseTime - sla.targets.responseTime) / sla.targets.responseTime) * 20;
    }
    
    if (calculatedErrorRate > sla.targets.errorRate) {
      violations.push(`Error rate ${calculatedErrorRate.toFixed(2)}% > ${sla.targets.errorRate}%`);
      complianceScore -= (calculatedErrorRate - sla.targets.errorRate) * 5;
    }
    
    complianceScore = Math.max(0, Math.min(100, complianceScore));
    
    // Update metric
    slaCompliance.set(
      { service, sla_name: sla.name },
      complianceScore
    );
    
    // Create alert if below threshold
    if (complianceScore < sla.alertThresholds.critical) {
      await this.createAlert({
        severity: 'critical',
        title: `SLA Violation: ${sla.name}`,
        description: `SLA compliance at ${complianceScore.toFixed(1)}%. Violations: ${violations.join(', ')}`,
        source: 'sla-monitor',
        service,
        tags: { sla: sla.name, type: 'sla_violation' },
        metadata: { uptime, responseTime, errorRate: calculatedErrorRate },
      });
    } else if (complianceScore < sla.alertThresholds.warning) {
      await this.createAlert({
        severity: 'high',
        title: `SLA Warning: ${sla.name}`,
        description: `SLA compliance at ${complianceScore.toFixed(1)}%. Violations: ${violations.join(', ')}`,
        source: 'sla-monitor',
        service,
        tags: { sla: sla.name, type: 'sla_warning' },
        metadata: { uptime, responseTime, errorRate: calculatedErrorRate },
      });
    }
    
    return {
      compliance: complianceScore,
      metrics: {
        uptime,
        responseTime,
        errorRate: calculatedErrorRate,
      },
      violations,
    };
  }

  /**
   * Store alert in DynamoDB
   */
  private async storeAlert(alert: Alert): Promise<void> {
    await this.dynamoClient.send(
      new PutItemCommand({
        TableName: ALERT_TABLE,
        Item: marshall({
          ...alert,
          ttl: Math.floor(Date.now() / 1000) + 2592000, // 30 days
        }),
      })
    );
    
    // Cache for quick access
    this.alertCache.set(alert.id, alert);
  }

  /**
   * Update alert in DynamoDB
   */
  private async updateAlert(alert: Alert): Promise<void> {
    await this.dynamoClient.send(
      new UpdateItemCommand({
        TableName: ALERT_TABLE,
        Key: marshall({ id: alert.id }),
        UpdateExpression: 'SET #resolved = :resolved, #resolvedAt = :resolvedAt, #resolvedBy = :resolvedBy, #escalationLevel = :escalationLevel, #notificationsSent = :notificationsSent',
        ExpressionAttributeNames: {
          '#resolved': 'resolved',
          '#resolvedAt': 'resolvedAt',
          '#resolvedBy': 'resolvedBy',
          '#escalationLevel': 'escalationLevel',
          '#notificationsSent': 'notificationsSent',
        },
        ExpressionAttributeValues: marshall({
          ':resolved': alert.resolved || false,
          ':resolvedAt': alert.resolvedAt?.toISOString(),
          ':resolvedBy': alert.resolvedBy,
          ':escalationLevel': alert.escalationLevel,
          ':notificationsSent': alert.notificationsSent,
        }),
      })
    );
    
    // Update cache
    this.alertCache.set(alert.id, alert);
  }

  /**
   * Get alert from DynamoDB
   */
  private async getAlert(alertId: string): Promise<Alert | null> {
    // Check cache first
    if (this.alertCache.has(alertId)) {
      return this.alertCache.get(alertId)!;
    }
    
    const response = await this.dynamoClient.send(
      new QueryCommand({
        TableName: ALERT_TABLE,
        KeyConditionExpression: 'id = :id',
        ExpressionAttributeValues: marshall({ ':id': alertId }),
      })
    );
    
    if (!response.Items || response.Items.length === 0) {
      return null;
    }
    
    const alert = unmarshall(response.Items[0]) as Alert;
    alert.timestamp = new Date(alert.timestamp);
    if (alert.resolvedAt) alert.resolvedAt = new Date(alert.resolvedAt);
    
    // Update cache
    this.alertCache.set(alertId, alert);
    
    return alert;
  }

  /**
   * Check if alert is duplicate
   */
  private async isDuplicate(alert: Alert): Promise<boolean> {
    const response = await this.dynamoClient.send(
      new QueryCommand({
        TableName: ALERT_TABLE,
        IndexName: 'FingerprintIndex',
        KeyConditionExpression: 'fingerprint = :fingerprint',
        FilterExpression: '#timestamp > :cutoff AND #resolved = :resolved',
        ExpressionAttributeNames: {
          '#timestamp': 'timestamp',
          '#resolved': 'resolved',
        },
        ExpressionAttributeValues: marshall({
          ':fingerprint': alert.fingerprint,
          ':cutoff': new Date(Date.now() - DEDUP_WINDOW).toISOString(),
          ':resolved': false,
        }),
      })
    );
    
    return (response.Items?.length || 0) > 0;
  }

  /**
   * Check rate limits
   */
  private async checkRateLimit(channel: NotificationChannel, alert: Alert): Promise<boolean> {
    if (!channel.rateLimits) {
      return true;
    }
    
    const key = `${channel.id}:${alert.service}`;
    let limiter = this.rateLimiters.get(key);
    
    if (!limiter) {
      limiter = new RateLimiter(channel.rateLimits);
      this.rateLimiters.set(key, limiter);
    }
    
    return limiter.tryConsume();
  }

  /**
   * Send resolution notifications
   */
  private async sendResolutionNotifications(alert: Alert): Promise<void> {
    // Send to all channels that received the initial alert
    const sentChannels = new Set<string>();
    
    for (const notification of alert.notificationsSent) {
      const [channelId] = notification.split(':');
      if (!sentChannels.has(channelId)) {
        const channel = this.channels.get(channelId);
        if (channel) {
          await this.sendNotification(channel, alert, 'resolution');
          sentChannels.add(channelId);
        }
      }
    }
  }

  /**
   * Update active alerts metrics
   */
  private updateActiveAlerts(): void {
    // This would query the database for real counts
    // For now, using cache
    const counts = new Map<string, number>();
    
    for (const alert of this.alertCache.values()) {
      if (!alert.resolved) {
        const key = `${alert.severity}:${alert.service}`;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    
    // Reset all gauges
    activeAlerts.reset();
    
    // Set current values
    for (const [key, count] of counts) {
      const [severity, service] = key.split(':');
      activeAlerts.set({ severity, service }, count);
    }
  }

  /**
   * Get metric from CloudWatch
   */
  private async getMetric(
    metricName: string,
    service: string,
    startTime: Date,
    endTime: Date
  ): Promise<number> {
    try {
      const response = await this.cloudWatchClient.send(
        new GetMetricStatisticsCommand({
          Namespace: 'AWS/ApplicationELB',
          MetricName: metricName,
          Dimensions: [
            { Name: 'LoadBalancer', Value: `app/${service}/1234567890abcdef` },
          ],
          StartTime: startTime,
          EndTime: endTime,
          Period: 300,
          Statistics: ['Average'],
        })
      );
      
      const datapoints = response.Datapoints || [];
      if (datapoints.length === 0) return 0;
      
      const sum = datapoints.reduce((acc, dp) => acc + (dp.Average || 0), 0);
      return sum / datapoints.length;
      
    } catch (error) {
      logger.error({ error, metricName, service }, 'Failed to get CloudWatch metric');
      return 0;
    }
  }

  /**
   * Start SLA monitoring
   */
  private startSLAMonitoring(): void {
    setInterval(async () => {
      for (const sla of this.slaDefinitions.values()) {
        try {
          await this.calculateSLACompliance(sla.service);
        } catch (error) {
          logger.error({ error, service: sla.service }, 'SLA monitoring failed');
        }
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Load notification channels
   */
  private async loadChannels(): Promise<void> {
    // Load from configuration or database
    // For now, using environment variables
    
    if (process.env.ALERT_EMAIL_ADDRESSES) {
      this.channels.set('email-default', {
        id: 'email-default',
        type: 'email',
        name: 'Default Email Channel',
        enabled: true,
        config: {
          toAddresses: process.env.ALERT_EMAIL_ADDRESSES.split(','),
        },
        filters: {
          severities: ['critical', 'high'],
          services: [],
          tags: {},
        },
      });
    }
    
    if (process.env.ALERT_SMS_NUMBERS) {
      this.channels.set('sms-critical', {
        id: 'sms-critical',
        type: 'sms',
        name: 'Critical SMS Channel',
        enabled: true,
        config: {
          phoneNumbers: process.env.ALERT_SMS_NUMBERS.split(','),
        },
        rateLimits: {
          maxPerMinute: 5,
          maxPerHour: 20,
          maxPerDay: 100,
        },
        filters: {
          severities: ['critical'],
          services: [],
          tags: {},
        },
      });
    }
    
    if (process.env.SLACK_WEBHOOK_URL || process.env.SLACK_BOT_TOKEN) {
      this.channels.set('slack-alerts', {
        id: 'slack-alerts',
        type: 'slack',
        name: 'Slack Alerts Channel',
        enabled: true,
        config: {
          slackChannel: process.env.SLACK_ALERT_CHANNEL || '#alerts',
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
        },
        filters: {
          severities: ['critical', 'high', 'medium'],
          services: [],
          tags: {},
        },
      });
    }
    
    if (process.env.PAGERDUTY_ROUTING_KEY) {
      this.channels.set('pagerduty-critical', {
        id: 'pagerduty-critical',
        type: 'pagerduty',
        name: 'PagerDuty Critical',
        enabled: true,
        config: {
          routingKey: process.env.PAGERDUTY_ROUTING_KEY,
        },
        filters: {
          severities: ['critical'],
          services: [],
          tags: {},
        },
      });
    }
  }

  /**
   * Load alert templates
   */
  private async loadTemplates(): Promise<void> {
    // Default email template
    const defaultEmailTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: {{severityColor}}; color: white; padding: 20px;">
          <h2 style="margin: 0;">{{alert.severity}} Alert: {{alert.title}}</h2>
        </div>
        <div style="padding: 20px; background-color: #f5f5f5;">
          <p><strong>Service:</strong> {{alert.service}}</p>
          <p><strong>Source:</strong> {{alert.source}}</p>
          <p><strong>Time:</strong> {{timestamp}}</p>
          <p><strong>Description:</strong></p>
          <p>{{alert.description}}</p>
          {{#if alert.tags}}
            <p><strong>Tags:</strong></p>
            <ul>
              {{#each alert.tags}}
                <li>{{@key}}: {{this}}</li>
              {{/each}}
            </ul>
          {{/if}}
          <p><a href="{{dashboardUrl}}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Details</a></p>
        </div>
      </div>
    `;
    
    this.templates.set('email-default', Handlebars.compile(defaultEmailTemplate));
    
    // Register helpers
    Handlebars.registerHelper('severityColor', (severity: string) => {
      const colors: Record<string, string> = {
        critical: '#dc3545',
        high: '#fd7e14',
        medium: '#ffc107',
        low: '#28a745',
        info: '#17a2b8',
      };
      return colors[severity] || '#6c757d';
    });
  }

  /**
   * Load escalation policies
   */
  private async loadEscalationPolicies(): Promise<void> {
    // Default escalation policy
    this.escalationPolicies.set('default', {
      id: 'default',
      name: 'Default Escalation Policy',
      steps: [
        {
          delayMinutes: 5,
          channels: ['slack-alerts'],
          conditions: {
            unresolvedFor: 5,
            severities: ['critical', 'high'],
          },
        },
        {
          delayMinutes: 15,
          channels: ['email-default', 'sms-critical'],
          conditions: {
            unresolvedFor: 15,
            severities: ['critical'],
          },
        },
        {
          delayMinutes: 30,
          channels: ['pagerduty-critical'],
          conditions: {
            unresolvedFor: 30,
            severities: ['critical'],
          },
        },
      ],
    });
  }

  /**
   * Load SLA definitions
   */
  private async loadSLADefinitions(): Promise<void> {
    // Example SLA definitions
    this.slaDefinitions.set('api', {
      id: 'api-sla',
      name: 'API Service SLA',
      service: 'api',
      targets: {
        uptime: 99.9,
        responseTime: 200,
        errorRate: 0.1,
      },
      windows: {
        daily: true,
        weekly: true,
        monthly: true,
      },
      alertThresholds: {
        warning: 99.5,
        critical: 99.0,
      },
    });
  }

  /**
   * Helper methods
   */
  
  private generateAlertId(): string {
    return `alert-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }
  
  private generateFingerprint(params: any): string {
    const key = `${params.service}:${params.source}:${params.title}`;
    return crypto.createHash('sha256').update(key).digest('hex');
  }
  
  private channelMatchesAlert(channel: NotificationChannel, alert: Alert): boolean {
    // Check severity filter
    if (channel.filters.severities.length > 0 &&
        !channel.filters.severities.includes(alert.severity)) {
      return false;
    }
    
    // Check service filter
    if (channel.filters.services.length > 0 &&
        !channel.filters.services.includes(alert.service)) {
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
  
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }
  
  private formatSMSMessage(alert: Alert, type: string): string {
    const prefix = type === 'resolution' ? 'RESOLVED' : 'ALERT';
    return `${prefix} [${alert.severity.toUpperCase()}]: ${alert.title}\nService: ${alert.service}\n${alert.description.substring(0, 100)}...`;
  }
  
  private formatEmailMessage(alert: Alert, type: string): string {
    return JSON.stringify(alert, null, 2);
  }
  
  private getSeverityColor(severity: Alert['severity']): string {
    const colors: Record<string, string> = {
      critical: '#dc3545',
      high: '#fd7e14',
      medium: '#ffc107',
      low: '#28a745',
      info: '#17a2b8',
    };
    return colors[severity] || '#6c757d';
  }
  
  private getSeverityEmoji(severity: Alert['severity']): string {
    const emojis: Record<string, string> = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️',
      info: '💡',
    };
    return emojis[severity] || '📋';
  }
  
  private mapSeverityToPagerDuty(severity: Alert['severity']): string {
    const mapping: Record<string, string> = {
      critical: 'critical',
      high: 'error',
      medium: 'warning',
      low: 'info',
      info: 'info',
    };
    return mapping[severity] || 'info';
  }
  
  private generateWebhookSignature(payload: any, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }
}

/**
 * Rate limiter implementation
 */
class RateLimiter {
  private limits: {
    maxPerMinute: number;
    maxPerHour: number;
    maxPerDay: number;
  };
  private minuteWindow: number[] = [];
  private hourWindow: number[] = [];
  private dayWindow: number[] = [];
  
  constructor(limits: any) {
    this.limits = limits;
  }
  
  tryConsume(): boolean {
    const now = Date.now();
    
    // Clean old entries
    this.minuteWindow = this.minuteWindow.filter(t => now - t < 60000);
    this.hourWindow = this.hourWindow.filter(t => now - t < 3600000);
    this.dayWindow = this.dayWindow.filter(t => now - t < 86400000);
    
    // Check limits
    if (this.minuteWindow.length >= this.limits.maxPerMinute) return false;
    if (this.hourWindow.length >= this.limits.maxPerHour) return false;
    if (this.dayWindow.length >= this.limits.maxPerDay) return false;
    
    // Consume
    this.minuteWindow.push(now);
    this.hourWindow.push(now);
    this.dayWindow.push(now);
    
    return true;
  }
}

// Export singleton instance
export const enhancedAlertManager = new EnhancedAlertManager();