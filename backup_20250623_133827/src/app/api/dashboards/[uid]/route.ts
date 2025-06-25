/**
 * Dashboard API Route - Individual dashboard operations
 * GET, PUT, DELETE operations for dashboard management
 */

import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '@/services/dashboardService';
import { auditService } from '@/services/auditService';
import { verifyAuth } from '@/lib/auth';

const dashboardService = DashboardService.getInstance();

interface RouteParams {
  params: {
    uid: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    
    const dashboard = await dashboardService.getDashboard(params.uid);
    
    if (!dashboard) {
      // Log failed access attempt
      if (auth.authenticated && auth.user) {
        await auditService.logDataAccess(
          {
            type: 'dashboard',
            id: params.uid,
            name: 'Unknown Dashboard'
          },
          'read',
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
          }
        );
      }
      
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    // Log successful dashboard view
    if (auth.authenticated && auth.user) {
      await auditService.logDataAccess(
        {
          type: 'dashboard',
          id: dashboard.uid,
          name: dashboard.title
        },
        'read',
        {
          userId: auth.user.userId,
          userName: auth.user.email,
          userEmail: auth.user.email,
          userRole: auth.user.role,
          siteId: auth.user.siteId || undefined
        },
        {
          method: request.method,
          path: request.url,
          ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || undefined,
          referer: request.headers.get('referer') || undefined
        },
        {
          responseTime: Date.now() - startTime
        }
      );
    }

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    
    // Log error
    if (error instanceof Error) {
      await auditService.logSystem(
        'dashboard_fetch_error',
        'error',
        'error',
        {
          dashboardUid: params.uid,
          error: error.message
        },
        {
          message: error.message,
          stack: error.stack
        }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch dashboard', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const updates = await request.json();
    
    // Get existing dashboard for audit trail
    const existingDashboard = await dashboardService.getDashboard(params.uid);
    
    const dashboard = await dashboardService.updateDashboard(params.uid, updates);
    
    // Log dashboard update
    await auditService.logDataModification(
      {
        type: 'dashboard',
        id: dashboard.uid,
        name: dashboard.title,
        previousValue: existingDashboard,
        newValue: dashboard
      },
      'update',
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
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined
      }
    );
    
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Error updating dashboard:', error);
    
    // Log error
    const auth = await verifyAuth(request);
    if (auth.authenticated && auth.user) {
      await auditService.logDataModification(
        {
          type: 'dashboard',
          id: params.uid,
          name: 'Dashboard Update Failed'
        },
        'update',
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
          code: 'UPDATE_FAILED'
        }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update dashboard', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get dashboard info before deletion for audit
    const dashboard = await dashboardService.getDashboard(params.uid);
    
    await dashboardService.deleteDashboard(params.uid);
    
    // Log dashboard deletion
    await auditService.logDataModification(
      {
        type: 'dashboard',
        id: params.uid,
        name: dashboard?.title || 'Unknown Dashboard',
        previousValue: dashboard
      },
      'delete',
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
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined
      }
    );
    
    return NextResponse.json({ message: 'Dashboard deleted successfully' });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    
    // Log error
    const auth = await verifyAuth(request);
    if (auth.authenticated && auth.user) {
      await auditService.logDataModification(
        {
          type: 'dashboard',
          id: params.uid,
          name: 'Dashboard Deletion Failed'
        },
        'delete',
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
          code: 'DELETE_FAILED'
        }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete dashboard', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}