import { EventEmitter } from 'events';
import {
  EmailConfig,
  EmailMessage,
  EmailProvider,
  EmailSendResult,
  EmailTemplate,
  BulkEmailOptions,
  EmailHistory,
  EmailEvent,
  EmailNotificationPreferences,
} from './types';
// Temporarily use stub providers for testing
import { SmtpProvider, SendGridProvider, SesProvider, TemplateEngine } from './providers/stub-providers';
// import { SmtpProvider } from './providers/SmtpProvider';
// import { SendGridProvider } from './providers/SendGridProvider';
// import { SesProvider } from './providers/SesProvider';
// import { TemplateEngine } from './TemplateEngine';
import { EmailQueue } from './EmailQueue';
import { InMemoryQueueStorage } from './storage/InMemoryQueueStorage';
import { PrismaQueueStorage } from './storage/PrismaQueueStorage';
import { defaultTemplates, templateVariables } from './templates';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export class EmailService extends EventEmitter {
  private provider: EmailProvider;
  private templateEngine: TemplateEngine;
  private queue: EmailQueue;
  private config: EmailConfig;
  private templates: Map<string, EmailTemplate> = new Map();
  private rateLimits: Map<string, { count: number; resetAt: Date }> = new Map();

  constructor(config: EmailConfig, options?: {
    useDatabase?: boolean;
    queueEnabled?: boolean;
  }) {
    super();
    this.config = config;
    this.templateEngine = new TemplateEngine();

    // Initialize provider
    this.provider = this.createProvider(config);

    // Initialize queue
    const storage = options?.useDatabase 
      ? new PrismaQueueStorage() 
      : new InMemoryQueueStorage();
    
    this.queue = new EmailQueue(storage);
    
    if (options?.queueEnabled !== false) {
      this.setupQueueHandlers();
      this.queue.startProcessing();
    }

    // Load default templates
    this.loadDefaultTemplates();
  }

  private createProvider(config: EmailConfig): EmailProvider {
    switch (config.provider) {
      case 'smtp':
        return new SmtpProvider(config);
      case 'sendgrid':
        return new SendGridProvider(config);
      case 'ses':
        return new SesProvider(config);
      default:
        throw new Error(`Unsupported email provider: ${config.provider}`);
    }
  }

  private loadDefaultTemplates() {
    for (const template of defaultTemplates) {
      this.templates.set(template.id, template);
    }
  }

  private setupQueueHandlers() {
    this.queue.on('processing', async (item) => {
      try {
        const result = await this.sendDirect(item.message);
        if (result.success) {
          await this.queue.markAsSent(item.id, result.messageId);
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        // Error will be handled by the queue
        throw error;
      }
    });

    this.queue.on('sent', (item) => {
      this.emit('sent', item);
    });

    this.queue.on('failed', (item, error, isFinal) => {
      this.emit('failed', item, error, isFinal);
    });

    this.queue.on('maxAttemptsReached', (item) => {
      this.emit('maxAttemptsReached', item);
      // Could trigger an alert or notification here
    });
  }

  // Send email directly (bypassing queue)
  private async sendDirect(message: EmailMessage): Promise<EmailSendResult> {
    try {
      // Apply rate limiting
      if (!await this.checkRateLimit(message.to)) {
        return {
          success: false,
          error: 'Rate limit exceeded',
        };
      }

      // Process template if needed
      let finalMessage = { ...message };
      if (message.templateId && message.templateData) {
        const template = await this.getTemplate(message.templateId);
        if (!template) {
          throw new Error(`Template ${message.templateId} not found`);
        }

        // Validate template data
        const variables = templateVariables[template.id] || [];
        const validation = this.templateEngine.validateTemplateData(variables, message.templateData);
        if (!validation.valid) {
          throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
        }

        // Add common template data
        const templateData = {
          ...message.templateData,
          dashboardUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
          unsubscribeUrl: `${process.env.NEXT_PUBLIC_API_URL}/unsubscribe/${uuidv4()}`,
          timestamp: new Date(),
        };

        finalMessage.subject = this.templateEngine.renderText(template.subject, templateData);
        finalMessage.html = this.templateEngine.render(template, templateData);
        if (template.text) {
          finalMessage.text = this.templateEngine.renderText(template.text, templateData);
        }
      }

      // Check unsubscribe status
      const recipients = Array.isArray(finalMessage.to) ? finalMessage.to : [finalMessage.to];
      const activeRecipients = await this.filterUnsubscribed(recipients);
      
      if (activeRecipients.length === 0) {
        return {
          success: false,
          error: 'All recipients have unsubscribed',
        };
      }

      finalMessage.to = activeRecipients.length === 1 ? activeRecipients[0] : activeRecipients;

      // Send email
      const result = await this.provider.send(finalMessage);

      // Record history
      if (result.success) {
        await this.recordHistory({
          to: recipients,
          from: this.config.from.email,
          subject: finalMessage.subject,
          templateId: message.templateId,
          templateData: message.templateData,
          status: 'sent',
          sentAt: new Date(),
          messageId: result.messageId,
        });
      }

      return result;
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Public send method (uses queue by default)
  async send(message: EmailMessage, options?: {
    immediate?: boolean;
    maxAttempts?: number;
  }): Promise<string | EmailSendResult> {
    if (options?.immediate) {
      return this.sendDirect(message);
    }

    const queueId = await this.queue.enqueue(message, {
      maxAttempts: options?.maxAttempts,
    });

    return queueId;
  }

  // Send bulk emails
  async sendBulk(options: BulkEmailOptions): Promise<{
    queued: number;
    failed: number;
    errors: Array<{ recipient: string; error: string }>;
  }> {
    const template = await this.getTemplate(options.templateId);
    if (!template) {
      throw new Error(`Template ${options.templateId} not found`);
    }

    let queued = 0;
    let failed = 0;
    const errors: Array<{ recipient: string; error: string }> = [];

    // Process in batches to respect rate limits
    const batchSize = options.throttle?.perSecond || 10;
    const batches = [];
    
    for (let i = 0; i < options.recipients.length; i += batchSize) {
      batches.push(options.recipients.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const promises = batch.map(async (recipient) => {
        try {
          const message: EmailMessage = {
            to: recipient.to,
            subject: options.subject || template.subject,
            templateId: options.templateId,
            templateData: {
              ...recipient.templateData,
              trackOpens: options.trackOpens,
              trackClicks: options.trackClicks,
            },
            metadata: recipient.metadata,
          };

          await this.send(message);
          queued++;
        } catch (error) {
          failed++;
          errors.push({
            recipient: recipient.to,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });

      await Promise.all(promises);

      // Rate limiting between batches
      if (options.throttle?.perSecond) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { queued, failed, errors };
  }

  // Template management
  async getTemplate(id: string): Promise<EmailTemplate | null> {
    // Check in-memory cache first
    const cached = this.templates.get(id);
    if (cached) return cached;

    // Load from database
    try {
      const dbTemplate = await prisma.emailTemplate.findUnique({
        where: { id },
      });

      if (!dbTemplate) return null;

      const template: EmailTemplate = {
        id: dbTemplate.id,
        name: dbTemplate.name,
        subject: dbTemplate.subject,
        html: dbTemplate.html,
        text: dbTemplate.text || undefined,
        variables: dbTemplate.variables as string[],
        category: dbTemplate.category as EmailTemplate['category'],
        createdAt: dbTemplate.createdAt,
        updatedAt: dbTemplate.updatedAt,
        customizable: dbTemplate.customizable,
      };

      this.templates.set(id, template);
      return template;
    } catch (error) {
      console.error('Error loading template:', error);
      return null;
    }
  }

  async updateTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const existing = await this.getTemplate(id);
    if (!existing) {
      throw new Error(`Template ${id} not found`);
    }

    if (!existing.customizable) {
      throw new Error(`Template ${id} is not customizable`);
    }

    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: {
        subject: updates.subject,
        html: updates.html,
        text: updates.text,
        variables: updates.variables,
        updatedAt: new Date(),
      },
    });

    const template: EmailTemplate = {
      id: updated.id,
      name: updated.name,
      subject: updated.subject,
      html: updated.html,
      text: updated.text || undefined,
      variables: updated.variables as string[],
      category: updated.category as EmailTemplate['category'],
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      customizable: updated.customizable,
    };

    this.templates.set(id, template);
    return template;
  }

  async listTemplates(category?: EmailTemplate['category']): Promise<EmailTemplate[]> {
    const templates = Array.from(this.templates.values());
    
    if (category) {
      return templates.filter(t => t.category === category);
    }
    
    return templates;
  }

  // Notification preferences
  async getNotificationPreferences(userId: string): Promise<EmailNotificationPreferences | null> {
    try {
      const prefs = await prisma.emailPreferences.findUnique({
        where: { userId },
      });

      if (!prefs) return null;

      return {
        userId: prefs.userId,
        email: prefs.email,
        enabled: prefs.enabled,
        categories: prefs.categories as any,
        frequency: prefs.frequency as any,
        unsubscribeToken: prefs.unsubscribeToken || undefined,
        createdAt: prefs.createdAt,
        updatedAt: prefs.updatedAt,
      };
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      return null;
    }
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<EmailNotificationPreferences>
  ): Promise<EmailNotificationPreferences> {
    const updated = await prisma.emailPreferences.upsert({
      where: { userId },
      update: {
        enabled: preferences.enabled,
        categories: preferences.categories,
        frequency: preferences.frequency,
        updatedAt: new Date(),
      },
      create: {
        userId,
        email: preferences.email!,
        enabled: preferences.enabled ?? true,
        categories: preferences.categories ?? {
          alerts: true,
          reports: true,
          system: true,
          marketing: false,
        },
        frequency: preferences.frequency,
        unsubscribeToken: uuidv4(),
      },
    });

    return {
      userId: updated.userId,
      email: updated.email,
      enabled: updated.enabled,
      categories: updated.categories as any,
      frequency: updated.frequency as any,
      unsubscribeToken: updated.unsubscribeToken || undefined,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  // Rate limiting
  private async checkRateLimit(recipient: string | string[]): Promise<boolean> {
    const key = Array.isArray(recipient) ? recipient.join(',') : recipient;
    const now = new Date();
    
    const limit = this.rateLimits.get(key);
    if (!limit || limit.resetAt < now) {
      this.rateLimits.set(key, {
        count: 1,
        resetAt: new Date(now.getTime() + 60000), // 1 minute window
      });
      return true;
    }

    if (limit.count >= 10) { // 10 emails per minute per recipient
      return false;
    }

    limit.count++;
    return true;
  }

  // Unsubscribe handling
  private async filterUnsubscribed(recipients: string[]): Promise<string[]> {
    try {
      const preferences = await prisma.emailPreferences.findMany({
        where: {
          email: { in: recipients },
          enabled: false,
        },
        select: { email: true },
      });

      const unsubscribed = new Set(preferences.map(p => p.email));
      return recipients.filter(r => !unsubscribed.has(r));
    } catch (error) {
      console.error('Error filtering unsubscribed:', error);
      return recipients; // Fail open
    }
  }

  // History tracking
  private async recordHistory(history: Omit<EmailHistory, 'id' | 'events'>): Promise<void> {
    try {
      await prisma.emailHistory.create({
        data: {
          to: history.to,
          cc: history.cc,
          bcc: history.bcc,
          from: history.from,
          subject: history.subject,
          templateId: history.templateId,
          templateData: history.templateData,
          status: history.status,
          sentAt: history.sentAt,
          messageId: history.messageId,
          error: history.error,
          events: [{
            type: 'sent',
            timestamp: new Date(),
          }],
          metadata: history.metadata,
        },
      });
    } catch (error) {
      console.error('Error recording email history:', error);
    }
  }

  async getHistory(filters?: {
    to?: string;
    from?: Date;
    to_date?: Date;
    status?: EmailHistory['status'];
    limit?: number;
  }): Promise<EmailHistory[]> {
    try {
      const where: any = {};
      
      if (filters?.to) {
        where.to = { has: filters.to };
      }
      
      if (filters?.from || filters?.to_date) {
        where.sentAt = {};
        if (filters.from) where.sentAt.gte = filters.from;
        if (filters.to_date) where.sentAt.lte = filters.to_date;
      }
      
      if (filters?.status) {
        where.status = filters.status;
      }

      const results = await prisma.emailHistory.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        take: filters?.limit || 100,
      });

      return results.map(r => ({
        id: r.id,
        to: r.to,
        cc: r.cc || undefined,
        bcc: r.bcc || undefined,
        from: r.from,
        subject: r.subject,
        templateId: r.templateId || undefined,
        templateData: r.templateData as any,
        status: r.status as EmailHistory['status'],
        sentAt: r.sentAt,
        openedAt: r.openedAt || undefined,
        clickedAt: r.clickedAt || undefined,
        bouncedAt: r.bouncedAt || undefined,
        unsubscribedAt: r.unsubscribedAt || undefined,
        messageId: r.messageId || undefined,
        error: r.error || undefined,
        events: r.events as EmailEvent[],
        metadata: r.metadata as any,
      }));
    } catch (error) {
      console.error('Error getting email history:', error);
      return [];
    }
  }

  // Webhook handling for email events (opens, clicks, bounces)
  async handleWebhook(provider: string, data: any): Promise<void> {
    // Implementation depends on the provider
    // This is a placeholder for webhook processing
    console.log(`Processing ${provider} webhook:`, data);
  }

  // Test email configuration
  async testConfiguration(): Promise<{
    success: boolean;
    error?: string;
    details?: any;
  }> {
    try {
      const verified = await this.provider.verify();
      if (!verified) {
        return {
          success: false,
          error: 'Provider verification failed',
        };
      }

      // Send a test email
      const result = await this.sendDirect({
        to: this.config.from.email,
        subject: 'Test Email - Manufacturing AnalyticsPlatform',
        html: '<p>This is a test email to verify your email configuration.</p>',
        text: 'This is a test email to verify your email configuration.',
      });

      return {
        success: result.success,
        error: result.error,
        details: result.details,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Cleanup
  async shutdown(): Promise<void> {
    this.queue.stopProcessing();
    this.removeAllListeners();
  }
}