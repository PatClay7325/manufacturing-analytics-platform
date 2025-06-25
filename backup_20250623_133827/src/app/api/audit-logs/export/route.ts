import { NextRequest, NextResponse } from 'next/server';
import { auditService } from '@/services/auditService';
import { z } from 'zod';

const exportSchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  eventTypes: z.array(z.string()).optional(),
  eventCategories: z.array(z.string()).optional(),
  eventStatuses: z.array(z.string()).optional(),
  eventSeverities: z.array(z.string()).optional(),
  userId: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional()
});

export async function POST(request: NextRequest) {
  try {
    // Check permissions
    const userRole = request.headers.get('x-user-role');
    if (!userRole || !['admin', 'manager'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to export audit logs' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Parse array parameters if they're strings
    if (typeof body.eventTypes === 'string') body.eventTypes = body.eventTypes.split(',');
    if (typeof body.eventCategories === 'string') body.eventCategories = body.eventCategories.split(',');
    if (typeof body.eventStatuses === 'string') body.eventStatuses = body.eventStatuses.split(',');
    if (typeof body.eventSeverities === 'string') body.eventSeverities = body.eventSeverities.split(',');
    if (typeof body.tags === 'string') body.tags = body.tags.split(',');

    // Validate parameters
    const validated = exportSchema.parse(body);

    // Convert date strings to Date objects
    const filters = {
      ...validated,
      startDate: validated.startDate ? new Date(validated.startDate) : undefined,
      endDate: validated.endDate ? new Date(validated.endDate) : undefined
    };

    // Export audit logs
    const result = await auditService.export({
      format: validated.format,
      filters
    });

    // Log the export action
    await auditService.log({
      eventType: 'export',
      eventCategory: 'system',
      eventAction: 'audit_logs.export',
      eventStatus: 'success',
      eventSeverity: 'info',
      metadata: {
        format: validated.format,
        filters: body
      }
    }, {
      userId: request.headers.get('x-user-id') || undefined,
      userEmail: request.headers.get('x-user-email') || undefined,
      userRole: request.headers.get('x-user-role') || undefined,
      requestId: request.headers.get('x-request-id') || undefined
    });

    // Return the file
    return new NextResponse(result.data, {
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Failed to export audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to export audit logs' },
      { status: 500 }
    );
  }
}