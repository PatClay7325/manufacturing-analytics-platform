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
}, {
  useDatabase: true,
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

    // Get user and check permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const to = searchParams.get('to');
    const from = searchParams.get('from');
    const to_date = searchParams.get('to_date');
    const status = searchParams.get('status') as any;
    const limit = parseInt(searchParams.get('limit') || '100');

    // Regular users can only see emails sent to them
    // Admins and operators can see all emails
    const filters: any = {};
    
    if (!['admin', 'operator'].includes(user.role)) {
      filters.to = user.email;
    } else if (to) {
      filters.to = to;
    }

    if (from) {
      filters.from = new Date(from);
    }

    if (to_date) {
      filters.to_date = new Date(to_date);
    }

    if (status) {
      filters.status = status;
    }

    filters.limit = Math.min(limit, 1000); // Max 1000 records

    // Get email history
    const history = await emailService.getHistory(filters);

    // Get statistics
    const stats = await prisma.emailHistory.groupBy({
      by: ['status'],
      _count: true,
      where: filters.to ? { to: { has: filters.to } } : undefined,
    });

    return NextResponse.json({
      history,
      total: history.length,
      statistics: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error('Email history error:', error);
    return NextResponse.json(
      { error: 'Failed to get email history' },
      { status: 500 }
    );
  }
}