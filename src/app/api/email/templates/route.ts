import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/email/EmailService';
import { prisma } from '@/lib/database';
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

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') as any;

    // Get templates
    const templates = await emailService.listTemplates(category);

    return NextResponse.json({
      templates,
      total: templates.length,
    });
  } catch (error) {
    console.error('Templates list error:', error);
    return NextResponse.json(
      { error: 'Failed to list templates' },
      { status: 500 }
    );
  }
}

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

    // Check permissions - only admins can create templates
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
    });

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can create templates' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.subject || !body.html || !body.category) {
      return NextResponse.json(
        { error: 'Name, subject, html, and category are required' },
        { status: 400 }
      );
    }

    // Extract variables from template
    const templateEngine = (emailService as any).templateEngine;
    const variables = templateEngine.extractVariables(body.html);
    if (body.subject) {
      const subjectVars = templateEngine.extractVariables(body.subject);
      variables.push(...subjectVars.filter((v: string) => !variables.includes(v)));
    }

    // Create template in database
    const template = await prisma.emailTemplate.create({
      data: {
        id: body.id || body.name.toLowerCase().replace(/\s+/g, '-'),
        name: body.name,
        subject: body.subject,
        html: body.html,
        text: body.text,
        variables,
        category: body.category,
        customizable: true,
      },
    });

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        subject: template.subject,
        html: template.html,
        text: template.text,
        variables: template.variables,
        category: template.category,
        customizable: template.customizable,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
    });
  } catch (error) {
    console.error('Template create error:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}