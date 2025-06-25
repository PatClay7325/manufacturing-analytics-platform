#!/usr/bin/env ts-node
/**
 * Phase 5: Intelligent Alert Management System
 * Implements alert correlation, escalation, suppression, and notification routing
 */

import { prisma } from '@/lib/prisma';
import Bull from 'bull';
import Redis from 'ioredis';
import { EventEmitter } from 'events';
import nodemailer from 'nodemailer';
import { WebClient } from '@slack/web-api';
import twilio from 'twilio';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface Alert {
  id: string;
  equipmentId: string;
  equipmentCode: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value?: number;
  threshold?: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface Incident {
  id: string;
  alerts: Alert[];
  equipmentId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'acknowledged' | 'escalated' | 'resolved';
  assignee?: string;
  createdAt: Date;
  updatedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  correlationKey: string;
  escalationLevel: number;
  notifications: NotificationRecord[];
}

interface NotificationRecord {
  id: string;
  channel: 'email' | 'sms' | 'slack' | 'teams' | 'pagerduty';
  recipient: string;
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  error?: string;
}

interface EscalationPolicy {
  id: string;
  name: string;
  levels: EscalationLevel[];
  conditions: {
    severity?: string[];
    equipmentType?: string[];
    alertType?: string[];
    shift?: string[];
  };
}

interface EscalationLevel {
  level: number;
  delayMinutes: number;
  contacts: Contact[];
  channels: NotificationChannel[];
  repeat: boolean;
  repeatInterval?: number;
}

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  slackUserId?: string;
  role: string;
  shifts?: string[];
}

type NotificationChannel = 'email' | 'sms' | 'slack' | 'teams' | 'pagerduty';

// =====================================================
// ALERT CORRELATION ENGINE
// =====================================================

export class AlertCorrelationEngine {
  private correlationRules: Map<string, CorrelationRule> = new Map();
  private correlationWindow = 5 * 60 * 1000; // 5 minutes
  private activeIncidents: Map<string, Incident> = new Map();

  constructor(private redis: Redis) {
    this.initializeRules();
  }

  private initializeRules() {
    // Equipment-based correlation
    this.correlationRules.set('equipment', {
      name: 'Equipment Correlation',
      correlate: (alert1, alert2) => 
        alert1.equipmentId === alert2.equipmentId &&
        Math.abs(alert1.timestamp.getTime() - alert2.timestamp.getTime()) < this.correlationWindow,
      key: (alert) => `equipment:${alert.equipmentId}`
    });

    // Related equipment correlation (same area)
    this.correlationRules.set('area', {
      name: 'Area Correlation',
      correlate: async (alert1, alert2) => {
        if (alert1.equipmentId === alert2.equipmentId) return false;
        
        const [equip1, equip2] = await Promise.all([
          this.getEquipmentArea(alert1.equipmentId),
          this.getEquipmentArea(alert2.equipmentId)
        ]);
        
        return equip1 === equip2 && 
               Math.abs(alert1.timestamp.getTime() - alert2.timestamp.getTime()) < this.correlationWindow;
      },
      key: async (alert) => {
        const area = await this.getEquipmentArea(alert.equipmentId);
        return `area:${area}`;
      }
    });

    // Cascade failure correlation
    this.correlationRules.set('cascade', {
      name: 'Cascade Failure',
      correlate: (alert1, alert2) => {
        // Temperature spike followed by pressure issue
        if (alert1.type === 'TEMP_HIGH' && alert2.type === 'PRESSURE_ABNORMAL') {
          return alert2.timestamp.getTime() - alert1.timestamp.getTime() > 0 &&
                 alert2.timestamp.getTime() - alert1.timestamp.getTime() < 60000; // Within 1 minute
        }
        
        // Vibration followed by temperature
        if (alert1.type === 'VIBRATION_HIGH' && alert2.type === 'TEMP_HIGH') {
          return alert2.timestamp.getTime() - alert1.timestamp.getTime() > 0 &&
                 alert2.timestamp.getTime() - alert1.timestamp.getTime() < 120000; // Within 2 minutes
        }
        
        return false;
      },
      key: (alert) => `cascade:${alert.equipmentId}:${alert.type}`
    });

    // Performance degradation correlation
    this.correlationRules.set('performance', {
      name: 'Performance Degradation',
      correlate: (alert1, alert2) => {
        const perfTypes = ['OEE_LOW', 'SPEED_LOSS', 'QUALITY_ISSUE', 'AVAILABILITY_LOW'];
        return perfTypes.includes(alert1.type) && 
               perfTypes.includes(alert2.type) &&
               alert1.equipmentId === alert2.equipmentId &&
               Math.abs(alert1.timestamp.getTime() - alert2.timestamp.getTime()) < this.correlationWindow;
      },
      key: (alert) => `performance:${alert.equipmentId}`
    });
  }

  async correlate(alert: Alert): Promise<Incident | null> {
    // Check each correlation rule
    for (const [ruleId, rule] of this.correlationRules) {
      const correlationKey = typeof rule.key === 'function' 
        ? await rule.key(alert)
        : rule.key(alert);

      // Check for existing incident
      const existingIncident = await this.findActiveIncident(correlationKey);
      
      if (existingIncident) {
        // Check if alert should be correlated
        const shouldCorrelate = await Promise.all(
          existingIncident.alerts.map(async (existingAlert) => {
            const result = typeof rule.correlate === 'function'
              ? await rule.correlate(existingAlert, alert)
              : rule.correlate(existingAlert, alert);
            return result;
          })
        );

        if (shouldCorrelate.some(result => result)) {
          // Add alert to existing incident
          existingIncident.alerts.push(alert);
          existingIncident.updatedAt = new Date();
          
          // Update severity if needed
          if (this.getSeverityScore(alert.severity) > this.getSeverityScore(existingIncident.severity)) {
            existingIncident.severity = alert.severity;
          }
          
          await this.updateIncident(existingIncident);
          return existingIncident;
        }
      }
    }

    return null;
  }

  private async findActiveIncident(correlationKey: string): Promise<Incident | null> {
    // Check in-memory cache first
    const cached = this.activeIncidents.get(correlationKey);
    if (cached) return cached;

    // Check Redis
    const stored = await this.redis.get(`incident:${correlationKey}`);
    if (stored) {
      const incident = JSON.parse(stored) as Incident;
      this.activeIncidents.set(correlationKey, incident);
      return incident;
    }

    return null;
  }

  private async updateIncident(incident: Incident): Promise<void> {
    this.activeIncidents.set(incident.correlationKey, incident);
    await this.redis.setex(
      `incident:${incident.correlationKey}`,
      300, // 5 minute TTL
      JSON.stringify(incident)
    );
  }

  private async getEquipmentArea(equipmentId: string): Promise<string> {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: { area_code: true }
    });
    return equipment?.area_code || 'unknown';
  }

  private getSeverityScore(severity: string): number {
    const scores = { low: 1, medium: 2, high: 3, critical: 4 };
    return scores[severity] || 0;
  }
}

interface CorrelationRule {
  name: string;
  correlate: (alert1: Alert, alert2: Alert) => boolean | Promise<boolean>;
  key: (alert: Alert) => string | Promise<string>;
}

// =====================================================
// ALERT SUPPRESSION MANAGER
// =====================================================

export class AlertSuppressionManager {
  private suppressionRules: Map<string, SuppressionRule> = new Map();
  private suppressedAlerts: Map<string, SuppressionRecord> = new Map();

  constructor(private redis: Redis) {
    this.initializeRules();
  }

  private initializeRules() {
    // Maintenance window suppression
    this.suppressionRules.set('maintenance', {
      name: 'Maintenance Window',
      shouldSuppress: async (alert) => {
        const maintenanceWindow = await this.getMaintenanceWindow(alert.equipmentId);
        if (!maintenanceWindow) return false;
        
        const now = new Date();
        return now >= maintenanceWindow.start && now <= maintenanceWindow.end;
      },
      reason: 'Equipment under scheduled maintenance'
    });

    // Flapping suppression (too many state changes)
    this.suppressionRules.set('flapping', {
      name: 'Flapping Detection',
      shouldSuppress: async (alert) => {
        const recentAlerts = await this.getRecentAlerts(
          alert.equipmentId,
          alert.type,
          15 * 60 * 1000 // 15 minutes
        );
        
        // If more than 5 alerts in 15 minutes, it's flapping
        return recentAlerts.length > 5;
      },
      reason: 'Alert is flapping - too many state changes'
    });

    // Duplicate suppression
    this.suppressionRules.set('duplicate', {
      name: 'Duplicate Detection',
      shouldSuppress: async (alert) => {
        const key = `${alert.equipmentId}:${alert.type}:${alert.message}`;
        const lastAlert = await this.redis.get(`last_alert:${key}`);
        
        if (lastAlert) {
          const lastTimestamp = parseInt(lastAlert);
          const timeSinceLast = Date.now() - lastTimestamp;
          
          // Suppress if same alert within 5 minutes
          if (timeSinceLast < 5 * 60 * 1000) {
            return true;
          }
        }
        
        // Store this alert
        await this.redis.setex(`last_alert:${key}`, 300, Date.now().toString());
        return false;
      },
      reason: 'Duplicate alert within suppression window'
    });

    // Low priority during off-hours
    this.suppressionRules.set('offhours', {
      name: 'Off-Hours Low Priority',
      shouldSuppress: async (alert) => {
        if (alert.severity !== 'low') return false;
        
        const hour = new Date().getHours();
        const isWeekend = [0, 6].includes(new Date().getDay());
        
        // Suppress low priority alerts during off-hours
        return isWeekend || hour < 6 || hour > 22;
      },
      reason: 'Low priority alert during off-hours'
    });

    // Known issue suppression
    this.suppressionRules.set('known_issue', {
      name: 'Known Issue',
      shouldSuppress: async (alert) => {
        const knownIssues = await this.getKnownIssues();
        
        return knownIssues.some(issue => 
          issue.equipmentId === alert.equipmentId &&
          issue.alertTypes.includes(alert.type) &&
          (!issue.expiresAt || issue.expiresAt > new Date())
        );
      },
      reason: 'Known issue - already being addressed'
    });
  }

  async shouldSuppress(alert: Alert): Promise<{ suppress: boolean; reason?: string }> {
    for (const [ruleId, rule] of this.suppressionRules) {
      const shouldSuppress = await rule.shouldSuppress(alert);
      
      if (shouldSuppress) {
        // Log suppression
        await this.logSuppression(alert, rule);
        
        return {
          suppress: true,
          reason: rule.reason
        };
      }
    }

    return { suppress: false };
  }

  private async logSuppression(alert: Alert, rule: SuppressionRule): Promise<void> {
    const record: SuppressionRecord = {
      alertId: alert.id,
      equipmentId: alert.equipmentId,
      alertType: alert.type,
      rule: rule.name,
      reason: rule.reason,
      timestamp: new Date()
    };

    const key = `suppressed:${alert.equipmentId}:${alert.type}`;
    this.suppressedAlerts.set(key, record);

    // Store in Redis for reporting
    await this.redis.lpush(
      'suppressed_alerts',
      JSON.stringify(record)
    );
    await this.redis.ltrim('suppressed_alerts', 0, 999); // Keep last 1000
  }

  private async getMaintenanceWindow(equipmentId: string): Promise<any> {
    // Check for active maintenance windows
    const window = await prisma.$queryRaw<any[]>`
      SELECT * FROM maintenance_windows
      WHERE equipment_id = ${equipmentId}
        AND start_time <= NOW()
        AND end_time >= NOW()
        AND is_active = true
      LIMIT 1
    `;
    
    return window[0];
  }

  private async getRecentAlerts(
    equipmentId: string,
    type: string,
    windowMs: number
  ): Promise<Alert[]> {
    const since = new Date(Date.now() - windowMs);
    
    const alerts = await prisma.alert.findMany({
      where: {
        equipment_id: equipmentId,
        type,
        timestamp: { gte: since }
      },
      orderBy: { timestamp: 'desc' }
    });

    return alerts as any[];
  }

  private async getKnownIssues(): Promise<any[]> {
    // This would typically come from a database table
    const issues = await this.redis.get('known_issues');
    return issues ? JSON.parse(issues) : [];
  }

  async getSuppressionStats(): Promise<any> {
    const suppressed = await this.redis.lrange('suppressed_alerts', 0, -1);
    const records = suppressed.map(s => JSON.parse(s));

    const stats = records.reduce((acc, record) => {
      const rule = record.rule;
      if (!acc[rule]) {
        acc[rule] = { count: 0, alerts: [] };
      }
      acc[rule].count++;
      acc[rule].alerts.push(record);
      return acc;
    }, {});

    return stats;
  }
}

interface SuppressionRule {
  name: string;
  shouldSuppress: (alert: Alert) => Promise<boolean>;
  reason: string;
}

interface SuppressionRecord {
  alertId: string;
  equipmentId: string;
  alertType: string;
  rule: string;
  reason: string;
  timestamp: Date;
}

// =====================================================
// ESCALATION MANAGER
// =====================================================

export class EscalationManager extends EventEmitter {
  private escalationQueue: Bull.Queue;
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  private policies: Map<string, EscalationPolicy> = new Map();

  constructor(private redis: Redis) {
    super();
    
    this.escalationQueue = new Bull('escalation', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });

    this.setupQueueProcessing();
    this.loadPolicies();
  }

  private async loadPolicies() {
    // Default escalation policies
    this.policies.set('critical', {
      id: 'critical',
      name: 'Critical Alert Escalation',
      conditions: { severity: ['critical'] },
      levels: [
        {
          level: 1,
          delayMinutes: 0,
          contacts: [], // Will be loaded from DB
          channels: ['slack', 'email'],
          repeat: false
        },
        {
          level: 2,
          delayMinutes: 5,
          contacts: [],
          channels: ['slack', 'email', 'sms'],
          repeat: true,
          repeatInterval: 5
        },
        {
          level: 3,
          delayMinutes: 15,
          contacts: [],
          channels: ['slack', 'email', 'sms', 'pagerduty'],
          repeat: true,
          repeatInterval: 10
        }
      ]
    });

    this.policies.set('high', {
      id: 'high',
      name: 'High Alert Escalation',
      conditions: { severity: ['high'] },
      levels: [
        {
          level: 1,
          delayMinutes: 5,
          contacts: [],
          channels: ['slack', 'email'],
          repeat: false
        },
        {
          level: 2,
          delayMinutes: 30,
          contacts: [],
          channels: ['email', 'sms'],
          repeat: false
        }
      ]
    });

    this.policies.set('medium', {
      id: 'medium',
      name: 'Medium Alert Escalation',
      conditions: { severity: ['medium'] },
      levels: [
        {
          level: 1,
          delayMinutes: 15,
          contacts: [],
          channels: ['slack'],
          repeat: false
        }
      ]
    });
  }

  private setupQueueProcessing() {
    this.escalationQueue.process(async (job) => {
      const { incident, level } = job.data;
      await this.processEscalation(incident, level);
    });
  }

  async startEscalation(incident: Incident): Promise<void> {
    console.log(`🚨 Starting escalation for incident ${incident.id}`);
    
    // Find matching policy
    const policy = this.findMatchingPolicy(incident);
    if (!policy) {
      console.warn(`No escalation policy found for incident ${incident.id}`);
      return;
    }

    // Start at level 1
    await this.scheduleEscalation(incident, policy, 1);
  }

  private findMatchingPolicy(incident: Incident): EscalationPolicy | null {
    for (const policy of this.policies.values()) {
      if (policy.conditions.severity?.includes(incident.severity)) {
        return policy;
      }
    }
    return null;
  }

  private async scheduleEscalation(
    incident: Incident,
    policy: EscalationPolicy,
    levelNum: number
  ): Promise<void> {
    const level = policy.levels.find(l => l.level === levelNum);
    if (!level) return;

    // Schedule escalation
    const delay = level.delayMinutes * 60 * 1000;
    
    if (delay === 0) {
      // Immediate escalation
      await this.processEscalation(incident, level);
    } else {
      // Delayed escalation
      await this.escalationQueue.add(
        { incident, level },
        { delay }
      );
    }

    // Schedule next level if exists
    const nextLevel = policy.levels.find(l => l.level === levelNum + 1);
    if (nextLevel) {
      const timerId = setTimeout(() => {
        if (incident.status === 'open' || incident.status === 'acknowledged') {
          this.scheduleEscalation(incident, policy, levelNum + 1);
        }
      }, delay);
      
      this.escalationTimers.set(`${incident.id}:${levelNum}`, timerId);
    }

    // Handle repeat notifications
    if (level.repeat && level.repeatInterval) {
      this.scheduleRepeatNotifications(incident, level);
    }
  }

  private async processEscalation(
    incident: Incident,
    level: EscalationLevel
  ): Promise<void> {
    console.log(`📢 Processing escalation level ${level.level} for incident ${incident.id}`);
    
    // Get contacts for this escalation level
    const contacts = await this.getContactsForLevel(incident, level);
    
    // Send notifications
    for (const channel of level.channels) {
      for (const contact of contacts) {
        try {
          await this.sendNotification(incident, contact, channel);
          
          // Record notification
          incident.notifications.push({
            id: crypto.randomUUID(),
            channel,
            recipient: contact.id,
            sentAt: new Date()
          });
        } catch (error) {
          console.error(`Failed to send ${channel} notification to ${contact.name}:`, error);
        }
      }
    }

    // Update incident
    incident.escalationLevel = level.level;
    incident.updatedAt = new Date();
    this.emit('escalated', incident, level);
  }

  private async getContactsForLevel(
    incident: Incident,
    level: EscalationLevel
  ): Promise<Contact[]> {
    // Get current shift
    const currentShift = await this.getCurrentShift();
    
    // Get on-call contacts for this level
    const contacts = await prisma.$queryRaw<Contact[]>`
      SELECT DISTINCT
        u.id,
        u.name,
        u.email,
        u.phone,
        u.slack_user_id as "slackUserId",
        r.name as role
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      JOIN escalation_contacts ec ON u.id = ec.user_id
      WHERE ec.escalation_level = ${level.level}
        AND (ec.shift = ${currentShift} OR ec.shift IS NULL)
        AND u.is_active = true
      ORDER BY ec.priority
    `;

    return contacts;
  }

  private scheduleRepeatNotifications(
    incident: Incident,
    level: EscalationLevel
  ): void {
    if (!level.repeatInterval) return;

    const intervalId = setInterval(async () => {
      // Check if incident is still active
      if (incident.status === 'resolved') {
        clearInterval(intervalId);
        return;
      }

      // Re-send notifications
      await this.processEscalation(incident, level);
    }, level.repeatInterval * 60 * 1000);

    // Store interval for cleanup
    this.escalationTimers.set(`${incident.id}:repeat:${level.level}`, intervalId as any);
  }

  async acknowledge(incidentId: string, userId: string): Promise<void> {
    // Cancel escalation timers
    const timers = Array.from(this.escalationTimers.entries())
      .filter(([key]) => key.startsWith(incidentId));
    
    for (const [key, timer] of timers) {
      clearTimeout(timer);
      this.escalationTimers.delete(key);
    }

    this.emit('acknowledged', incidentId, userId);
  }

  async resolve(incidentId: string, userId: string): Promise<void> {
    // Cancel all timers
    const timers = Array.from(this.escalationTimers.entries())
      .filter(([key]) => key.startsWith(incidentId));
    
    for (const [key, timer] of timers) {
      clearTimeout(timer);
      this.escalationTimers.delete(key);
    }

    this.emit('resolved', incidentId, userId);
  }

  private async getCurrentShift(): Promise<string> {
    const result = await prisma.$queryRaw<[{ shift: string }]>`
      SELECT get_current_shift() as shift
    `;
    return result[0]?.shift || 'DEFAULT';
  }

  private async sendNotification(
    incident: Incident,
    contact: Contact,
    channel: NotificationChannel
  ): Promise<void> {
    // Delegate to NotificationRouter
    const router = new NotificationRouter();
    await router.send({
      incident,
      recipient: contact,
      channel,
      template: 'escalation'
    });
  }
}

// =====================================================
// NOTIFICATION ROUTER
// =====================================================

export class NotificationRouter {
  private emailTransporter: nodemailer.Transporter;
  private slackClient: WebClient;
  private twilioClient: twilio.Twilio;

  constructor() {
    // Initialize email
    this.emailTransporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Initialize Slack
    this.slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

    // Initialize Twilio
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  async send(notification: {
    incident: Incident;
    recipient: Contact;
    channel: NotificationChannel;
    template: string;
  }): Promise<void> {
    const { incident, recipient, channel, template } = notification;

    switch (channel) {
      case 'email':
        await this.sendEmail(incident, recipient, template);
        break;
      case 'sms':
        await this.sendSMS(incident, recipient, template);
        break;
      case 'slack':
        await this.sendSlack(incident, recipient, template);
        break;
      case 'teams':
        await this.sendTeams(incident, recipient, template);
        break;
      case 'pagerduty':
        await this.sendPagerDuty(incident, recipient, template);
        break;
    }
  }

  private async sendEmail(
    incident: Incident,
    recipient: Contact,
    template: string
  ): Promise<void> {
    if (!recipient.email) return;

    const subject = this.getSubject(incident);
    const html = this.getEmailBody(incident, template);

    await this.emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || 'alerts@manufacturing.com',
      to: recipient.email,
      subject,
      html
    });
  }

  private async sendSMS(
    incident: Incident,
    recipient: Contact,
    template: string
  ): Promise<void> {
    if (!recipient.phone) return;

    const message = this.getSMSMessage(incident);

    await this.twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: recipient.phone
    });
  }

  private async sendSlack(
    incident: Incident,
    recipient: Contact,
    template: string
  ): Promise<void> {
    if (!recipient.slackUserId) return;

    const blocks = this.getSlackBlocks(incident);

    await this.slackClient.chat.postMessage({
      channel: recipient.slackUserId,
      blocks,
      text: this.getSubject(incident) // Fallback text
    });
  }

  private async sendTeams(
    incident: Incident,
    recipient: Contact,
    template: string
  ): Promise<void> {
    // Teams webhook implementation
    const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
    if (!webhookUrl) return;

    const card = this.getTeamsCard(incident);

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card)
    });
  }

  private async sendPagerDuty(
    incident: Incident,
    recipient: Contact,
    template: string
  ): Promise<void> {
    // PagerDuty integration
    const routingKey = process.env.PAGERDUTY_ROUTING_KEY;
    if (!routingKey) return;

    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.pagerduty+json;version=2'
      },
      body: JSON.stringify({
        routing_key: routingKey,
        event_action: 'trigger',
        dedup_key: incident.id,
        payload: {
          summary: this.getSubject(incident),
          severity: incident.severity,
          source: incident.equipmentCode,
          custom_details: {
            alerts: incident.alerts,
            correlationKey: incident.correlationKey
          }
        }
      })
    });
  }

  private getSubject(incident: Incident): string {
    const emoji = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵'
    };

    return `${emoji[incident.severity]} ${incident.severity.toUpperCase()}: ${incident.type} on ${incident.equipmentId}`;
  }

  private getEmailBody(incident: Incident, template: string): string {
    return `
      <h2>Manufacturing Alert</h2>
      <p><strong>Severity:</strong> ${incident.severity.toUpperCase()}</p>
      <p><strong>Equipment:</strong> ${incident.equipmentId}</p>
      <p><strong>Type:</strong> ${incident.type}</p>
      <p><strong>Time:</strong> ${incident.createdAt.toISOString()}</p>
      
      <h3>Alerts (${incident.alerts.length})</h3>
      <ul>
        ${incident.alerts.map(a => `
          <li>${a.timestamp.toISOString()} - ${a.message}</li>
        `).join('')}
      </ul>
      
      <p>
        <a href="${process.env.APP_URL}/incidents/${incident.id}">View Incident</a> |
        <a href="${process.env.APP_URL}/incidents/${incident.id}/acknowledge">Acknowledge</a>
      </p>
    `;
  }

  private getSMSMessage(incident: Incident): string {
    return `${incident.severity.toUpperCase()} Alert: ${incident.type} on ${incident.equipmentId}. ${incident.alerts.length} alerts. Reply ACK to acknowledge.`;
  }

  private getSlackBlocks(incident: Incident): any[] {
    return [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${incident.severity.toUpperCase()} Alert`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Equipment:*\n${incident.equipmentId}`
          },
          {
            type: 'mrkdwn',
            text: `*Type:*\n${incident.type}`
          },
          {
            type: 'mrkdwn',
            text: `*Alerts:*\n${incident.alerts.length}`
          },
          {
            type: 'mrkdwn',
            text: `*Time:*\n${incident.createdAt.toISOString()}`
          }
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Details'
            },
            url: `${process.env.APP_URL}/incidents/${incident.id}`,
            style: 'primary'
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Acknowledge'
            },
            action_id: `acknowledge_${incident.id}`,
            style: 'danger'
          }
        ]
      }
    ];
  }

  private getTeamsCard(incident: Incident): any {
    return {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: this.getSubject(incident),
      themeColor: this.getSeverityColor(incident.severity),
      sections: [
        {
          activityTitle: `${incident.severity.toUpperCase()} Alert`,
          facts: [
            { name: 'Equipment', value: incident.equipmentId },
            { name: 'Type', value: incident.type },
            { name: 'Alerts', value: incident.alerts.length.toString() },
            { name: 'Time', value: incident.createdAt.toISOString() }
          ]
        }
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'View Details',
          targets: [
            {
              os: 'default',
              uri: `${process.env.APP_URL}/incidents/${incident.id}`
            }
          ]
        }
      ]
    };
  }

  private getSeverityColor(severity: string): string {
    const colors = {
      critical: 'FF0000',
      high: 'FF8800',
      medium: 'FFFF00',
      low: '0088FF'
    };
    return colors[severity] || '808080';
  }
}

// =====================================================
// MAIN ALERT ENGINE
// =====================================================

export class AlertEngine {
  private correlationEngine: AlertCorrelationEngine;
  private suppressionManager: AlertSuppressionManager;
  private escalationManager: EscalationManager;
  private incidentQueue: Bull.Queue;
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    });

    this.correlationEngine = new AlertCorrelationEngine(this.redis);
    this.suppressionManager = new AlertSuppressionManager(this.redis);
    this.escalationManager = new EscalationManager(this.redis);

    this.incidentQueue = new Bull('incidents', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    // Handle escalation events
    this.escalationManager.on('escalated', async (incident, level) => {
      await this.updateIncidentStatus(incident.id, {
        escalationLevel: level.level,
        status: 'escalated'
      });
    });

    this.escalationManager.on('acknowledged', async (incidentId, userId) => {
      await this.updateIncidentStatus(incidentId, {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        assignee: userId
      });
    });

    this.escalationManager.on('resolved', async (incidentId, userId) => {
      await this.updateIncidentStatus(incidentId, {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: userId
      });
    });
  }

  async processAlert(alert: Alert): Promise<void> {
    console.log(`🚨 Processing alert: ${alert.id}`);

    // Check suppression rules
    const suppression = await this.suppressionManager.shouldSuppress(alert);
    if (suppression.suppress) {
      console.log(`🔇 Alert suppressed: ${suppression.reason}`);
      return;
    }

    // Check for correlation
    const correlated = await this.correlationEngine.correlate(alert);
    
    if (correlated) {
      console.log(`🔗 Alert correlated to incident: ${correlated.id}`);
      // Alert was added to existing incident
      return;
    }

    // Create new incident
    const incident = await this.createIncident(alert);
    
    // Start escalation
    await this.escalationManager.startEscalation(incident);
  }

  private async createIncident(alert: Alert): Promise<Incident> {
    const incident: Incident = {
      id: crypto.randomUUID(),
      alerts: [alert],
      equipmentId: alert.equipmentId,
      type: alert.type,
      severity: alert.severity,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      correlationKey: `single:${alert.id}`,
      escalationLevel: 0,
      notifications: []
    };

    // Store incident
    await this.storeIncident(incident);
    
    // Queue for processing
    await this.incidentQueue.add('process', { incident });

    return incident;
  }

  private async storeIncident(incident: Incident): Promise<void> {
    await prisma.incident.create({
      data: {
        id: incident.id,
        equipment_id: incident.equipmentId,
        type: incident.type,
        severity: incident.severity,
        status: incident.status,
        correlation_key: incident.correlationKey,
        alert_count: incident.alerts.length,
        metadata: incident as any
      }
    });
  }

  private async updateIncidentStatus(
    incidentId: string,
    updates: Partial<Incident>
  ): Promise<void> {
    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        status: updates.status,
        acknowledged_at: updates.acknowledgedAt,
        resolved_at: updates.resolvedAt,
        assignee_id: updates.assignee,
        escalation_level: updates.escalationLevel,
        metadata: updates as any
      }
    });
  }

  async getIncidentStats(): Promise<any> {
    const [open, acknowledged, resolved, suppressed] = await Promise.all([
      prisma.incident.count({ where: { status: 'open' } }),
      prisma.incident.count({ where: { status: 'acknowledged' } }),
      prisma.incident.count({ where: { status: 'resolved' } }),
      this.suppressionManager.getSuppressionStats()
    ]);

    return {
      open,
      acknowledged,
      resolved,
      suppressed,
      total: open + acknowledged + resolved
    };
  }
}

// =====================================================
// MAIN EXECUTION
// =====================================================

async function demonstrateAlertSystem() {
  console.log('🚨 Alert Management System Demonstration\n');

  const alertEngine = new AlertEngine();

  // Simulate various alert scenarios
  const scenarios = [
    // Scenario 1: Single critical alert
    {
      name: 'Critical Temperature Alert',
      alert: {
        id: '1',
        equipmentId: 'eq-001',
        equipmentCode: 'CNC-001',
        type: 'TEMP_HIGH',
        severity: 'critical' as const,
        message: 'Temperature exceeds critical threshold',
        value: 95,
        threshold: 80,
        timestamp: new Date()
      }
    },
    
    // Scenario 2: Correlated alerts (cascade failure)
    {
      name: 'Cascade Failure',
      alerts: [
        {
          id: '2',
          equipmentId: 'eq-002',
          equipmentCode: 'WELD-001',
          type: 'VIBRATION_HIGH',
          severity: 'high' as const,
          message: 'Abnormal vibration detected',
          value: 15,
          threshold: 10,
          timestamp: new Date()
        },
        {
          id: '3',
          equipmentId: 'eq-002',
          equipmentCode: 'WELD-001',
          type: 'TEMP_HIGH',
          severity: 'high' as const,
          message: 'Temperature rising',
          value: 75,
          threshold: 70,
          timestamp: new Date(Date.now() + 30000) // 30 seconds later
        }
      ]
    },
    
    // Scenario 3: Flapping alert (will be suppressed)
    {
      name: 'Flapping Sensor',
      generateAlerts: () => {
        const alerts = [];
        for (let i = 0; i < 10; i++) {
          alerts.push({
            id: `flap-${i}`,
            equipmentId: 'eq-003',
            equipmentCode: 'PUMP-001',
            type: 'PRESSURE_ABNORMAL',
            severity: 'medium' as const,
            message: 'Pressure fluctuation',
            value: 50 + Math.random() * 10,
            threshold: 55,
            timestamp: new Date(Date.now() + i * 30000) // Every 30 seconds
          });
        }
        return alerts;
      }
    }
  ];

  // Process scenarios
  for (const scenario of scenarios) {
    console.log(`\n📋 Scenario: ${scenario.name}`);
    
    if ('alert' in scenario) {
      await alertEngine.processAlert(scenario.alert);
    } else if ('alerts' in scenario) {
      for (const alert of scenario.alerts) {
        await alertEngine.processAlert(alert);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between alerts
      }
    } else if ('generateAlerts' in scenario) {
      const alerts = scenario.generateAlerts();
      for (const alert of alerts) {
        await alertEngine.processAlert(alert);
      }
    }
  }

  // Show statistics
  console.log('\n📊 Alert System Statistics:');
  const stats = await alertEngine.getIncidentStats();
  console.table(stats);

  console.log('\n✅ Alert management demonstration complete!');
}

// Run if executed directly
if (require.main === module) {
  demonstrateAlertSystem()
    .catch(console.error)
    .finally(() => process.exit(0));
}

export {
  AlertEngine,
  AlertCorrelationEngine,
  AlertSuppressionManager,
  EscalationManager,
  NotificationRouter
};