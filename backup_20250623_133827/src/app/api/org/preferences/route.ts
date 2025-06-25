import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for organization defaults
const organizationDefaultsSchema = z.object({
  // Default UI Settings
  defaultTheme: z.enum(['light', 'dark']).optional(),
  defaultLanguage: z.string().optional(),
  defaultTimezone: z.string().optional(),
  weekStart: z.enum(['sunday', 'monday']).optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  
  // Default Dashboard Settings
  defaultHomeDashboardId: z.string().nullable().optional(),
  defaultTimeRange: z.string().optional(),
  defaultRefreshInterval: z.string().nullable().optional(),
  
  // Default Editor Settings
  defaultDatasourceId: z.string().nullable().optional(),
  queryTimeout: z.number().min(10).max(3600).optional(),
  maxDataPoints: z.number().min(100).max(10000).optional(),
  
  // Default Notification Settings
  emailNotificationsEnabled: z.boolean().optional(),
  browserNotificationsEnabled: z.boolean().optional(),
  
  // Feature Flags
  publicDashboardsEnabled: z.boolean().optional(),
  snapshotsEnabled: z.boolean().optional(),
  annotationsEnabled: z.boolean().optional(),
  alertingEnabled: z.boolean().optional(),
  exploreEnabled: z.boolean().optional(),
  
  // Security Settings
  enforcePasswordPolicy: z.boolean().optional(),
  passwordMinLength: z.number().min(6).max(32).optional(),
  requirePasswordChange: z.boolean().optional(),
  sessionTimeout: z.number().min(300).max(604800).optional(), // 5 mins to 7 days
  
  // Data Retention
  dashboardVersionRetention: z.number().min(1).max(100).optional(),
  queryHistoryRetention: z.number().min(1).max(365).optional(),
  
  // Resource Limits
  maxDashboardsPerUser: z.number().min(1).max(1000).nullable().optional(),
  maxQueriesPerMinute: z.number().min(1).max(1000).nullable().optional(),
  maxAlertsPerUser: z.number().min(1).max(1000).nullable().optional(),
  
  // Branding
  loginMessage: z.string().nullable().optional(),
  footerMessage: z.string().nullable().optional(),
  customLogoUrl: z.string().url().nullable().optional(),
  
  // Custom Defaults
  customDefaults: z.record(z.any()).optional(),
});

// Helper function to check if user is admin
async function isUserAdmin(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });
  
  return user?.role === 'admin' || user?.role === 'superadmin';
}

// GET /api/org/preferences - Get organization defaults
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'User not part of any organization' },
        { status: 404 }
      );
    }

    // Get organization defaults
    const defaults = await prisma.organizationDefaults.findUnique({
      where: { organizationId: user.organizationId },
    });

    // If no defaults exist, create them
    if (!defaults) {
      const newDefaults = await prisma.organizationDefaults.create({
        data: {
          organizationId: user.organizationId,
        },
      });
      
      return NextResponse.json(newDefaults);
    }

    return NextResponse.json(defaults);
  } catch (error) {
    console.error('Error fetching organization defaults:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/org/preferences - Update organization defaults (admin only)
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = organizationDefaultsSchema.parse(body);

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'User not part of any organization' },
        { status: 404 }
      );
    }

    // Get existing defaults for comparison
    const existingDefaults = await prisma.organizationDefaults.findUnique({
      where: { organizationId: user.organizationId },
    });

    // Track changes for audit
    const changes: Array<{
      fieldChanged: string;
      oldValue: any;
      newValue: any;
    }> = [];

    // Compare and track changes
    if (existingDefaults) {
      for (const [key, value] of Object.entries(validatedData)) {
        const oldValue = (existingDefaults as any)[key];
        if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
          changes.push({
            fieldChanged: key,
            oldValue,
            newValue: value,
          });
        }
      }
    }

    // Update or create defaults
    const defaults = await prisma.organizationDefaults.upsert({
      where: { organizationId: user.organizationId },
      update: validatedData,
      create: {
        organizationId: user.organizationId,
        ...validatedData,
      },
    });

    // Log changes to history
    if (changes.length > 0) {
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
      const userAgent = request.headers.get('user-agent');

      await prisma.preferenceChangeHistory.createMany({
        data: changes.map(change => ({
          userId: user.id,
          preferenceType: 'organization',
          preferenceId: defaults.id,
          fieldChanged: change.fieldChanged,
          oldValue: JSON.stringify(change.oldValue),
          newValue: JSON.stringify(change.newValue),
          changedBy: user.id,
          changeSource: 'web',
          ipAddress: ipAddress || undefined,
          userAgent: userAgent || undefined,
        })),
      });
    }

    return NextResponse.json(defaults);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error updating organization defaults:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/org/preferences - Partial update organization defaults (admin only)
export async function PATCH(request: NextRequest) {
  // This is the same as PUT but explicitly for partial updates
  return PUT(request);
}