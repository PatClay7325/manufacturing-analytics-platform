import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/permissions/audit - Get permission audit logs
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'view:users');
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const where: any = {};
    
    if (action) {
      where.action = action;
    }
    
    if (userId) {
      where.OR = [
        { userId },
        { targetId: userId },
      ];
    }
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    // For now, return mock data since AuditLog model doesn't exist yet
    // In production, this would query the actual audit log table
    const mockAuditLogs = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        action: 'PERMISSION_GRANTED',
        userId: authResult.userId,
        userEmail: 'admin@factory.com',
        targetId: '2',
        targetEmail: 'sarah.j@factory.com',
        changes: { permission: 'view:financial:reports', granted: true },
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: request.headers.get('user-agent'),
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        action: 'ROLE_CHANGED',
        userId: authResult.userId,
        userEmail: 'admin@factory.com',
        targetId: '3',
        targetEmail: 'mike.chen@factory.com',
        changes: { from: 'technician', to: 'engineer' },
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: request.headers.get('user-agent'),
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        action: 'PERMISSION_REVOKED',
        userId: authResult.userId,
        userEmail: 'admin@factory.com',
        targetId: '4',
        targetEmail: 'john.doe@factory.com',
        changes: { permission: 'delete:all', revoked: true },
        ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1',
        userAgent: request.headers.get('user-agent'),
      },
    ];

    // Filter based on query parameters
    let filteredLogs = mockAuditLogs;
    
    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action === action);
    }
    
    if (userId) {
      filteredLogs = filteredLogs.filter(log => 
        log.userId === userId || log.targetId === userId
      );
    }
    
    // Apply pagination
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    return NextResponse.json({
      logs: paginatedLogs,
      total: filteredLogs.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}

// POST /api/permissions/audit - Create an audit log entry
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const {
      action,
      targetId,
      targetEmail,
      changes,
      metadata,
    } = await request.json();

    // Validate required fields
    if (!action || !targetId) {
      return NextResponse.json(
        { error: 'Action and targetId are required' },
        { status: 400 }
      );
    }

    // In production, this would create an actual audit log entry
    const auditLog = {
      id: String(Date.now()),
      timestamp: new Date().toISOString(),
      action,
      userId: authResult.userId,
      userEmail: authResult.user?.email,
      targetId,
      targetEmail,
      changes,
      metadata,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 '127.0.0.1',
      userAgent: request.headers.get('user-agent'),
    };

    // TODO: Save to database when AuditLog model is added
    console.log('Audit log entry:', auditLog);

    return NextResponse.json({
      success: true,
      auditLog,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log' },
      { status: 500 }
    );
  }
}