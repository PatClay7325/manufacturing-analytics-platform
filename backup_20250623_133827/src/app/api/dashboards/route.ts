/**
 * Dashboard API Routes - List and Create dashboards
 * GET /api/dashboards - List dashboards with filtering
 * POST /api/dashboards - Create new dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '@/services/dashboardService';
import { auditService } from '@/services/auditService';
import { verifyAuth } from '@/lib/auth';

const dashboardService = DashboardService.getInstance();

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify authentication (optional for listing)
    const auth = await verifyAuth(request);
    
    const { searchParams } = new URL(request.url);
    
    const options = {
      query: searchParams.get('query') || undefined,
      tags: searchParams.getAll('tags'),
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const result = await dashboardService.listDashboards(options);
    
    // Log dashboard list access (only if authenticated)
    if (auth.authenticated && auth.user) {
      await auditService.logDataAccess(
        {
          type: 'dashboard',
          name: 'Dashboard List'
        },
        'query',
        {
          userId: auth.user.userId,
          userName: auth.user.email,
          userEmail: auth.user.email,
          userRole: auth.user.role
        },
        {
          method: request.method,
          path: request.url,
          query: Object.fromEntries(searchParams.entries()),
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || undefined
        },
        {
          responseTime: Date.now() - startTime,
          totalDuration: Date.now() - startTime
        }
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Dashboard list error:', error);
    
    // Log error
    await auditService.logSystem(
      'dashboard_list_error',
      'error',
      'error',
      {
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    );
    
    return NextResponse.json(
      { error: 'Failed to list dashboards', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify authentication (required for creation)
    const auth = await verifyAuth(request);
    
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const dashboard = await request.json();

    if (!dashboard || !dashboard.title) {
      return NextResponse.json(
        { error: 'Dashboard title is required' },
        { status: 400 }
      );
    }

    const result = await dashboardService.createDashboard(dashboard);

    // Log dashboard creation
    await auditService.logDataModification(
      {
        type: 'dashboard',
        id: result.uid,
        name: result.title,
        newValue: result
      },
      'create',
      'success',
      {
        userId: auth.user.userId,
        userName: auth.user.email,
        userEmail: auth.user.email,
        userRole: auth.user.role
      },
      {
        method: request.method,
        path: request.url,
        body: { title: dashboard.title, tags: dashboard.tags }, // Don't log full dashboard content
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Dashboard create error:', error);
    
    // Log error
    const auth = await verifyAuth(request);
    if (auth.authenticated && auth.user) {
      await auditService.logDataModification(
        {
          type: 'dashboard',
          name: 'Dashboard Creation Failed'
        },
        'create',
        'error',
        {
          userId: auth.user.userId,
          userName: auth.user.email,
          userEmail: auth.user.email,
          userRole: auth.user.role
        },
        {
          method: request.method,
          path: request.url,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || undefined
        },
        {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'CREATE_FAILED'
        }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create dashboard', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}