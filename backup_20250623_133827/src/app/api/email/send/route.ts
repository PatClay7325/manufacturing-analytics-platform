import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/EmailService';
import { EmailMessage } from '@/lib/email/types';
import { prisma } from '@/lib/prisma';
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

    // Check permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
    });

    if (!user || !['admin', 'operator'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const message: EmailMessage = {
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      html: body.html,
      text: body.text,
      templateId: body.templateId,
      templateData: body.templateData,
      attachments: body.attachments,
      headers: body.headers,
      tags: body.tags,
      metadata: {
        ...body.metadata,
        sentBy: user.id,
        sentByEmail: user.email,
      },
      priority: body.priority,
    };

    // Validate required fields
    if (!message.to) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      );
    }

    if (!message.templateId && !message.subject) {
      return NextResponse.json(
        { error: 'Either templateId or subject is required' },
        { status: 400 }
      );
    }

    if (!message.templateId && !message.html && !message.text) {
      return NextResponse.json(
        { error: 'Either templateId or email content (html/text) is required' },
        { status: 400 }
      );
    }

    // Send email (queued by default)
    const result = await emailService.send(message, {
      immediate: body.immediate === true,
      maxAttempts: body.maxAttempts,
    });

    if (typeof result === 'string') {
      // Queued
      return NextResponse.json({
        success: true,
        queued: true,
        queueId: result,
      });
    } else {
      // Sent immediately
      return NextResponse.json({
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        details: result.details,
      });
    }
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}