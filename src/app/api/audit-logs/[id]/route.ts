import { NextRequest, NextResponse } from 'next/server';
import { auditService } from '@/services/auditService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permissions
    const userRole = request.headers.get('x-user-role');
    if (!userRole || !['admin', 'manager'].includes(userRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view audit logs' },
        { status: 403 }
      );
    }

    const auditLog = await auditService.getById(params.id);

    if (!auditLog) {
      return NextResponse.json(
        { error: 'Audit log not found' },
        { status: 404 }
      );
    }

    // Log the audit log access
    await auditService.logDataAccess(
      { type: 'audit-log', id: params.id },
      'read',
      {
        userId: request.headers.get('x-user-id') || undefined,
        userEmail: request.headers.get('x-user-email') || undefined,
        userRole: request.headers.get('x-user-role') || undefined,
        requestId: request.headers.get('x-request-id') || undefined
      },
      {
        method: 'GET',
        path: `/api/audit-logs/${params.id}`
      }
    );

    return NextResponse.json(auditLog);
  } catch (error) {
    console.error('Failed to get audit log:', error);
    return NextResponse.json(
      { error: 'Failed to get audit log' },
      { status: 500 }
    );
  }
}