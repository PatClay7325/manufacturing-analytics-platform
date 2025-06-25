import { NextRequest, NextResponse } from 'next/server';
import { auditService } from '@/services/auditService';
import { z } from 'zod';

// Validation schema for search parameters
const searchSchema = z.object({
  eventTypes: z.array(z.string()).optional(),
  eventCategories: z.array(z.string()).optional(),
  eventStatuses: z.array(z.string()).optional(),
  eventSeverities: z.array(z.string()).optional(),
  userId: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  ipAddress: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  searchTerm: z.string().optional(),
  page: z.coerce.number().positive().default(1),
  pageSize: z.coerce.number().positive().max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export async function GET(request: NextRequest) {
  try {
    // Check permissions
    const userRole = request.headers.get('x-user-role');
    if (!userRole || !['admin', 'manager'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view audit logs' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    
    // Parse array parameters
    if (searchParams.eventTypes) searchParams.eventTypes = searchParams.eventTypes.split(',');
    if (searchParams.eventCategories) searchParams.eventCategories = searchParams.eventCategories.split(',');
    if (searchParams.eventStatuses) searchParams.eventStatuses = searchParams.eventStatuses.split(',');
    if (searchParams.eventSeverities) searchParams.eventSeverities = searchParams.eventSeverities.split(',');
    if (searchParams.tags) searchParams.tags = searchParams.tags.split(',');

    // Validate parameters
    const validated = searchSchema.parse(searchParams);

    // Convert date strings to Date objects
    const params = {
      ...validated,
      startDate: validated.startDate ? new Date(validated.startDate) : undefined,
      endDate: validated.endDate ? new Date(validated.endDate) : undefined,
      sortBy: validated.sortBy as any
    };

    // Search audit logs
    const result = await auditService.search(params);

    // Log the audit log access
    await auditService.logDataAccess(
      { type: 'audit-logs', id: 'search' },
      'query',
      {
        userId: request.headers.get('x-user-id') || undefined,
        userEmail: request.headers.get('x-user-email') || undefined,
        userRole: request.headers.get('x-user-role') || undefined,
        requestId: request.headers.get('x-request-id') || undefined
      },
      {
        method: 'GET',
        path: '/api/audit-logs',
        query: searchParams
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Failed to search audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to search audit logs' },
      { status: 500 }
    );
  }
}

// DELETE endpoint for purging old logs (admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Check admin permissions
    const userRole = request.headers.get('x-user-role');
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can purge audit logs' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { olderThan, dryRun = true } = body;

    if (!olderThan) {
      return NextResponse.json(
        { error: 'olderThan parameter is required' },
        { status: 400 }
      );
    }

    const olderThanDate = new Date(olderThan);
    if (isNaN(olderThanDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Prevent accidental deletion of recent logs
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (olderThanDate > thirtyDaysAgo) {
      return NextResponse.json(
        { error: 'Cannot delete logs newer than 30 days' },
        { status: 400 }
      );
    }

    const result = await auditService.purge({
      olderThan: olderThanDate,
      dryRun
    });

    // Log the purge action
    await auditService.log({
      eventType: 'delete',
      eventCategory: 'system',
      eventAction: 'audit_logs.purge',
      eventStatus: 'success',
      eventSeverity: 'warning',
      metadata: {
        olderThan: olderThanDate.toISOString(),
        dryRun,
        count: result.count
      }
    }, {
      userId: request.headers.get('x-user-id') || undefined,
      userEmail: request.headers.get('x-user-email') || undefined,
      userRole: request.headers.get('x-user-role') || undefined,
      requestId: request.headers.get('x-request-id') || undefined
    });

    return NextResponse.json({
      success: true,
      ...result,
      dryRun
    });
  } catch (error) {
    console.error('Failed to purge audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to purge audit logs' },
      { status: 500 }
    );
  }
}