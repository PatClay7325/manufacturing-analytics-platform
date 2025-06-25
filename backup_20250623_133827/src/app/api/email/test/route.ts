import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/EmailService';
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

    // Check permissions - only admins can test email configuration
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can test email configuration' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const testEmail = body.email || user.email;

    // Test configuration
    const configTest = await emailService.testConfiguration();
    
    if (!configTest.success) {
      return NextResponse.json({
        success: false,
        error: configTest.error,
        details: configTest.details,
        phase: 'configuration',
      });
    }

    // Send test email to specified address
    const testResult = await emailService.send({
      to: testEmail,
      subject: 'Test Email - Manufacturing AnalyticsPlatform',
      html: `
        <h2>Test Email Successful</h2>
        <p>This is a test email from your Manufacturing AnalyticsPlatform.</p>
        <p><strong>Configuration Details:</strong></p>
        <ul>
          <li>Provider: ${process.env.EMAIL_PROVIDER || 'smtp'}</li>
          <li>From: ${process.env.EMAIL_FROM}</li>
          <li>Sent to: ${testEmail}</li>
          <li>Timestamp: ${new Date().toISOString()}</li>
        </ul>
        <p>If you received this email, your email configuration is working correctly.</p>
      `,
      text: `Test Email Successful

This is a test email from your Manufacturing AnalyticsPlatform.

Configuration Details:
- Provider: ${process.env.EMAIL_PROVIDER || 'smtp'}
- From: ${process.env.EMAIL_FROM}
- Sent to: ${testEmail}
- Timestamp: ${new Date().toISOString()}

If you received this email, your email configuration is working correctly.`,
      priority: 'high',
    }, {
      immediate: true, // Send immediately, don't queue
    });

    // Log test
    await prisma.auditLog.create({
      data: {
        action: 'email_test',
        userId: user.id,
        metadata: {
          testEmail,
          provider: process.env.EMAIL_PROVIDER || 'smtp',
          success: typeof testResult !== 'string' && testResult.success,
        },
      },
    });

    if (typeof testResult === 'string') {
      return NextResponse.json({
        success: true,
        message: 'Test email queued',
        queueId: testResult,
      });
    }

    return NextResponse.json({
      success: testResult.success,
      message: testResult.success 
        ? `Test email sent successfully to ${testEmail}` 
        : 'Failed to send test email',
      error: testResult.error,
      details: testResult.details,
      phase: 'sending',
    });
  } catch (error) {
    console.error('Email test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test email configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
        phase: 'error',
      },
      { status: 500 }
    );
  }
}