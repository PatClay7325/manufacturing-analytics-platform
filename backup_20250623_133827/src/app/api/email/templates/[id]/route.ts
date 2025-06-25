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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const template = await emailService.getTemplate(params.id);
    
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Template get error:', error);
    return NextResponse.json(
      { error: 'Failed to get template' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions - only admins can update templates
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can update templates' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Extract variables if HTML is being updated
    let variables = body.variables;
    if (body.html && !variables) {
      const templateEngine = (emailService as any).templateEngine;
      variables = templateEngine.extractVariables(body.html);
      if (body.subject) {
        const subjectVars = templateEngine.extractVariables(body.subject);
        variables.push(...subjectVars.filter((v: string) => !variables.includes(v)));
      }
    }

    const updated = await emailService.updateTemplate(params.id, {
      subject: body.subject,
      html: body.html,
      text: body.text,
      variables,
    });

    return NextResponse.json({
      success: true,
      template: updated,
    });
  } catch (error: any) {
    console.error('Template update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update template' },
      { status: error.message?.includes('not found') ? 404 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions - only admins can delete templates
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can delete templates' },
        { status: 403 }
      );
    }

    // Check if template exists and is customizable
    const template = await prisma.emailTemplate.findUnique({
      where: { id: params.id },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    if (!template.customizable) {
      return NextResponse.json(
        { error: 'System templates cannot be deleted' },
        { status: 400 }
      );
    }

    // Delete template
    await prisma.emailTemplate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Template delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}