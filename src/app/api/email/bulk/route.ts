import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/EmailService';
import { BulkEmailOptions } from '@/lib/email/types';
import { prisma } from '@/lib/database';
import { getServerSession } from 'next-auth';

// Initialize email service
const emailService = new EmailService({
  provider: (process.env.EMAIL_PROVIDER as 'smtp' | 'sendgrid' | 'ses') || 'smtp',
  from: {
    email: process.env.EMAIL_FROM || 'noreply@manufacturinganalytics.com',
    name: process.env.EMAIL_FROM_NAME || 'Manufacturing AnalyticsPlatform',
  },
  replyTo: process.env.EMAIL_REPLY_TO,
  smtp: process.env.EMAIL_PROVIDER === 'smtp' ? {
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER!,
    password: process.env.SMTP_PASSWORD!,
  } : undefined,
  sendgrid: process.env.EMAIL_PROVIDER === 'sendgrid' ? {
    apiKey: process.env.SENDGRID_API_KEY!,
  } : undefined,
  ses: process.env.EMAIL_PROVIDER === 'ses' ? {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  } : undefined,
}, {
  useDatabase: true,
  queueEnabled: true,
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions - only admins can send bulk emails
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can send bulk emails' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const options: BulkEmailOptions = {
      recipients: body.recipients,
      templateId: body.templateId,
      subject: body.subject,
      throttle: body.throttle || {
        perSecond: 10,
        perMinute: 100,
        perHour: 1000,
      },
      trackOpens: body.trackOpens,
      trackClicks: body.trackClicks,
    };

    // Validate
    if (!options.recipients || !Array.isArray(options.recipients) || options.recipients.length === 0) {
      return NextResponse.json(
        { error: 'Recipients array is required' },
        { status: 400 }
      );
    }

    if (!options.templateId) {
      return NextResponse.json(
        { error: 'Template ID is required for bulk emails' },
        { status: 400 }
      );
    }

    // Limit bulk sends
    if (options.recipients.length > 1000) {
      return NextResponse.json(
        { error: 'Maximum 1000 recipients allowed per bulk send' },
        { status: 400 }
      );
    }

    // Send bulk emails
    const result = await emailService.sendBulk(options);

    // Log bulk email operation
    await prisma.auditLog.create({
      data: {
        action: 'bulk_email_sent',
        userId: user.id,
        metadata: {
          templateId: options.templateId,
          recipientCount: options.recipients.length,
          queued: result.queued,
          failed: result.failed,
        },
      },
    });

    return NextResponse.json({
      success: true,
      queued: result.queued,
      failed: result.failed,
      errors: result.errors,
      summary: {
        total: options.recipients.length,
        successRate: (result.queued / options.recipients.length) * 100,
      },
    });
  } catch (error) {
    console.error('Bulk email error:', error);
    return NextResponse.json(
      { error: 'Failed to send bulk emails' },
      { status: 500 }
    );
  }
}