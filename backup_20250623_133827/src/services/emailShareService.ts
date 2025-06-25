/**
 * Email Share Service
 * Implements Phase 2.2: Email/share functionality for reports
 */

import { auditLogService, AuditAction } from './auditLogService';

export interface EmailShareOptions {
  recipients: string[];
  subject: string;
  message: string;
  attachments?: {
    filename: string;
    content: Blob | string;
    type: 'pdf' | 'excel' | 'csv' | 'image';
  }[];
  priority: 'low' | 'normal' | 'high';
  includeRawData?: boolean;
  accessLevel?: 'view' | 'edit';
  expiresAt?: Date;
}

export interface ShareLinkOptions {
  dashboardId: string;
  accessLevel: 'view' | 'edit';
  expiresAt?: Date;
  password?: string;
  allowedEmails?: string[];
  includeAnnotations?: boolean;
  timeRange?: {
    start: Date;
    end: Date;
    label: string;
  };
}

export interface ShareLink {
  id: string;
  url: string;
  accessLevel: 'view' | 'edit';
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  accessCount: number;
  maxAccess?: number;
  isActive: boolean;
}

export class EmailShareService {
  private static instance: EmailShareService;
  
  static getInstance(): EmailShareService {
    if (!EmailShareService.instance) {
      EmailShareService.instance = new EmailShareService();
    }
    return EmailShareService.instance;
  }

  /**
   * Send dashboard report via email
   */
  async sendDashboardReport(
    options: EmailShareOptions,
    userId: string
  ): Promise<void> {
    try {
      // Validate recipients
      this.validateEmailAddresses(options.recipients);

      // In a real implementation, this would integrate with an email service
      // For now, we'll simulate the email sending process
      await this.simulateEmailSending(options);

      // Log email sharing action
      await auditLogService.logRequest(
        { headers: { get: () => null } } as any,
        AuditAction.EMAIL_SHARE,
        {
          resource: 'dashboard_report',
          details: {
            recipients: options.recipients,
            subject: options.subject,
            attachmentCount: options.attachments?.length || 0,
            priority: options.priority,
            includeRawData: options.includeRawData
          }
        }
      );

    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create shareable link for dashboard
   */
  async createShareLink(
    options: ShareLinkOptions,
    userId: string
  ): Promise<ShareLink> {
    try {
      const shareLink: ShareLink = {
        id: this.generateShareId(),
        url: this.generateShareUrl(options.dashboardId),
        accessLevel: options.accessLevel,
        createdBy: userId,
        createdAt: new Date(),
        expiresAt: options.expiresAt,
        accessCount: 0,
        isActive: true
      };

      // Store share link (in real implementation, save to database)
      await this.saveShareLink(shareLink, options);

      // Log share link creation
      await auditLogService.logRequest(
        { headers: { get: () => null } } as any,
        AuditAction.SHARE_LINK_CREATE,
        {
          resource: 'dashboard_share',
          details: {
            shareId: shareLink.id,
            dashboardId: options.dashboardId,
            accessLevel: options.accessLevel,
            expiresAt: options.expiresAt?.toISOString()
          }
        }
      );

      return shareLink;

    } catch (error) {
      console.error('Failed to create share link:', error);
      throw new Error(`Failed to create share link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get active share links for user
   */
  async getUserShareLinks(userId: string): Promise<ShareLink[]> {
    try {
      // In real implementation, query database
      const shareLinks = await this.loadShareLinksForUser(userId);
      
      return shareLinks
        .filter(link => link.isActive)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    } catch (error) {
      console.error('Failed to get share links:', error);
      throw new Error(`Failed to retrieve share links: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Revoke share link
   */
  async revokeShareLink(shareId: string, userId: string): Promise<void> {
    try {
      const shareLink = await this.getShareLink(shareId);
      
      if (!shareLink) {
        throw new Error('Share link not found');
      }

      if (shareLink.createdBy !== userId) {
        throw new Error('Not authorized to revoke this share link');
      }

      // Deactivate share link
      await this.deactivateShareLink(shareId);

      // Log revocation
      await auditLogService.logRequest(
        { headers: { get: () => null } } as any,
        AuditAction.SHARE_LINK_REVOKE,
        {
          resource: 'dashboard_share',
          details: {
            shareId,
            revokedBy: userId
          }
        }
      );

    } catch (error) {
      console.error('Failed to revoke share link:', error);
      throw new Error(`Failed to revoke share link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Track share link access
   */
  async trackShareLinkAccess(
    shareId: string,
    accessorInfo: {
      ipAddress?: string;
      userAgent?: string;
      userId?: string;
    }
  ): Promise<boolean> {
    try {
      const shareLink = await this.getShareLink(shareId);
      
      if (!shareLink || !shareLink.isActive) {
        return false;
      }

      // Check expiration
      if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
        await this.deactivateShareLink(shareId);
        return false;
      }

      // Check access count limit
      if (shareLink.maxAccess && shareLink.accessCount >= shareLink.maxAccess) {
        return false;
      }

      // Increment access count
      await this.incrementAccessCount(shareId);

      // Log access
      await auditLogService.logRequest(
        { headers: { get: () => null } } as any,
        AuditAction.SHARE_LINK_ACCESS,
        {
          resource: 'dashboard_share',
          details: {
            shareId,
            accessorInfo,
            accessCount: shareLink.accessCount + 1
          }
        }
      );

      return true;

    } catch (error) {
      console.error('Failed to track share link access:', error);
      return false;
    }
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(
    to: string[],
    subject: string,
    content: string,
    type: 'alert' | 'report' | 'share' = 'report'
  ): Promise<void> {
    try {
      const emailOptions: EmailShareOptions = {
        recipients: to,
        subject,
        message: content,
        priority: type === 'alert' ? 'high' : 'normal'
      };

      await this.simulateEmailSending(emailOptions);

      // Log notification
      await auditLogService.logRequest(
        { headers: { get: () => null } } as any,
        AuditAction.EMAIL_NOTIFICATION,
        {
          resource: 'notification',
          details: {
            recipients: to,
            type,
            subject
          }
        }
      );

    } catch (error) {
      console.error('Failed to send notification:', error);
      throw new Error(`Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods

  private validateEmailAddresses(emails: string[]): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    for (const email of emails) {
      if (!emailRegex.test(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
    }

    if (emails.length === 0) {
      throw new Error('At least one recipient is required');
    }

    if (emails.length > 50) {
      throw new Error('Maximum 50 recipients allowed');
    }
  }

  private async simulateEmailSending(options: EmailShareOptions): Promise<void> {
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // In a real implementation, this would:
    // 1. Connect to email service (SendGrid, SES, etc.)
    // 2. Compose email with attachments
    // 3. Send to recipients
    // 4. Handle delivery status and bounces

    console.log('Email simulation:', {
      to: options.recipients,
      subject: options.subject,
      attachments: options.attachments?.length || 0,
      timestamp: new Date().toISOString()
    });

    // Simulate random email failure for testing
    if (Math.random() < 0.05) {
      throw new Error('Email service temporarily unavailable');
    }
  }

  private generateShareId(): string {
    return `share_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }

  private generateShareUrl(dashboardId: string): string {
    // In real implementation, use proper domain and routing
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com';
    return `${baseUrl}/shared/dashboard/${dashboardId}`;
  }

  private async saveShareLink(shareLink: ShareLink, options: ShareLinkOptions): Promise<void> {
    // Store in localStorage for demo (use database in real implementation)
    const key = `share_link_${shareLink.id}`;
    const data = {
      ...shareLink,
      options
    };
    localStorage.setItem(key, JSON.stringify(data));
  }

  private async loadShareLinksForUser(userId: string): Promise<ShareLink[]> {
    const shareLinks: ShareLink[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('share_link_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          // Convert date strings back to Date objects
          data.createdAt = new Date(data.createdAt);
          if (data.expiresAt) {
            data.expiresAt = new Date(data.expiresAt);
          }
          
          if (data.createdBy === userId) {
            shareLinks.push(data);
          }
        } catch (error) {
          console.warn('Failed to parse share link:', key, error);
        }
      }
    }
    
    return shareLinks;
  }

  private async getShareLink(shareId: string): Promise<ShareLink | null> {
    try {
      const stored = localStorage.getItem(`share_link_${shareId}`);
      if (!stored) return null;
      
      const data = JSON.parse(stored);
      // Convert date strings back to Date objects
      data.createdAt = new Date(data.createdAt);
      if (data.expiresAt) {
        data.expiresAt = new Date(data.expiresAt);
      }
      
      return data;
    } catch (error) {
      console.error('Failed to get share link:', error);
      return null;
    }
  }

  private async deactivateShareLink(shareId: string): Promise<void> {
    const shareLink = await this.getShareLink(shareId);
    if (shareLink) {
      shareLink.isActive = false;
      localStorage.setItem(`share_link_${shareId}`, JSON.stringify(shareLink));
    }
  }

  private async incrementAccessCount(shareId: string): Promise<void> {
    const shareLink = await this.getShareLink(shareId);
    if (shareLink) {
      shareLink.accessCount += 1;
      localStorage.setItem(`share_link_${shareId}`, JSON.stringify(shareLink));
    }
  }
}

export const emailShareService = EmailShareService.getInstance();