import { NextRequest, NextResponse } from 'next/server';
import { auditService } from '@/services/auditService';
import { z } from 'zod';

const analyticsSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  groupBy: z.enum(['hour', 'day', 'week', 'month']).default('day')
});

export async function GET(request: NextRequest) {
  try {
    // Check permissions
    const userRole = request.headers.get('x-user-role');
    if (!userRole || !['admin', 'manager'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view audit analytics' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);

    // Validate parameters
    const validated = analyticsSchema.parse(searchParams);

    // Convert date strings to Date objects
    const params = {
      startDate: new Date(validated.startDate),
      endDate: new Date(validated.endDate),
      groupBy: validated.groupBy
    };

    // Validate date range
    const maxRange = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
    if (params.endDate.getTime() - params.startDate.getTime() > maxRange) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 90 days' },
        { status: 400 }
      );
    }

    // Get analytics
    const analytics = await auditService.getAnalytics(params);

    // Log the analytics access
    await auditService.logDataAccess(
      { type: 'audit-analytics', id: 'view' },
      'read',
      {
        userId: request.headers.get('x-user-id') || undefined,
        userEmail: request.headers.get('x-user-email') || undefined,
        userRole: request.headers.get('x-user-role') || undefined,
        requestId: request.headers.get('x-request-id') || undefined
      },
      {
        method: 'GET',
        path: '/api/audit-logs/analytics',
        query: searchParams
      }
    );

    return NextResponse.json(analytics);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Failed to get audit analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get audit analytics' },
      { status: 500 }
    );
  }
}