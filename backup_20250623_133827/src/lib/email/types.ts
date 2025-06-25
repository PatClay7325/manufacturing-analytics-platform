// Email system types and interfaces

export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'ses' | 'mailgun';
  from: {
    email: string;
    name: string;
  };
  replyTo?: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
  };
  sendgrid?: {
    apiKey: string;
  };
  ses?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  mailgun?: {
    apiKey: string;
    domain: string;
    region?: 'us' | 'eu';
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html: string;
  text?: string;
  variables: string[];
  category: EmailCategory;
  createdAt: Date;
  updatedAt: Date;
  customizable: boolean;
}

export type EmailCategory = 
  | 'alert'
  | 'welcome'
  | 'password-reset'
  | 'report'
  | 'invitation'
  | 'system'
  | 'custom';

export interface EmailMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
  metadata?: Record<string, any>;
  scheduledAt?: Date;
  priority?: 'high' | 'normal' | 'low';
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
  cid?: string; // for inline attachments
}

export interface EmailQueueItem {
  id: string;
  message: EmailMessage;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processedAt?: Date;
  sentAt?: Date;
  failedAt?: Date;
  error?: string;
  messageId?: string; // provider message ID
  metadata?: Record<string, any>;
}

export interface EmailHistory {
  id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  from: string;
  subject: string;
  templateId?: string;
  templateData?: Record<string, any>;
  status: 'sent' | 'failed' | 'bounced' | 'opened' | 'clicked' | 'unsubscribed';
  sentAt: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  unsubscribedAt?: Date;
  messageId?: string;
  error?: string;
  events: EmailEvent[];
  metadata?: Record<string, any>;
}

export interface EmailEvent {
  type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed' | 'unsubscribed';
  timestamp: Date;
  data?: Record<string, any>;
}

export interface EmailProvider {
  name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
  verify(): Promise<boolean>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: Record<string, any>;
}

export interface BulkEmailOptions {
  recipients: Array<{
    to: string;
    templateData?: Record<string, any>;
    metadata?: Record<string, any>;
  }>;
  templateId: string;
  subject?: string;
  throttle?: {
    perSecond?: number;
    perMinute?: number;
    perHour?: number;
  };
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface EmailNotificationPreferences {
  userId: string;
  email: string;
  enabled: boolean;
  categories: {
    alerts: boolean;
    reports: boolean;
    system: boolean;
    marketing: boolean;
  };
  frequency?: {
    immediate: boolean;
    daily?: boolean;
    weekly?: boolean;
  };
  unsubscribeToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailRateLimit {
  key: string;
  limit: number;
  window: number; // in seconds
  count: number;
  resetAt: Date;
}

export interface EmailTemplateVariable {
  name: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  format?: string; // for dates
}

export interface EmailMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  unsubscribed: number;
  period: 'hour' | 'day' | 'week' | 'month';
  timestamp: Date;
}