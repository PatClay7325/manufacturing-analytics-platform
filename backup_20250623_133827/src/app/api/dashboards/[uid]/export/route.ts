/**
 * Dashboard Export API Route
 * Export dashboard configuration for sharing
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
    
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const shareExternally = searchParams.get('shareExternally') === 'true';
    const includeVariables = searchParams.get('includeVariables') === 'true';

    const exportedDashboard = await dashboardService.exportDashboard(params.uid, {
      shareExternally,
      includeVariables
    });

    // Log dashboard export
    await auditService.logDataAccess(
      {
        type: 'dashboard',
        id: params.uid,
        name: exportedDashboard.title || 'Dashboard'
      },
      'export',
      {
        userId: auth.user.userId,
        userName: auth.user.email,
        userEmail: auth.user.email,
        userRole: auth.user.role
      },
      {
        method: request.method,
        path: request.url,
        query: { shareExternally, includeVariables },
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || undefined
      },
      {
        responseTime: Date.now() - startTime
      }
    );

    // Set appropriate headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Content-Disposition', `attachment; filename="${exportedDashboard.title || 'dashboard'}-export.json"`);

    return new NextResponse(JSON.stringify(exportedDashboard, null, 2), {
      headers
    });
  } catch (error) {
    console.error('Error exporting dashboard:', error);
    
    // Log error
    const auth = await verifyAuth(request);
    if (auth.authenticated && auth.user) {
      await auditService.log(
        {
          eventType: 'export',
          eventCategory: 'dashboard',
          eventAction: 'dashboard.export',
          eventStatus: 'error',
          eventSeverity: 'error',
          resource: {
            type: 'dashboard',
            id: params.uid,
            name: 'Dashboard Export Failed'
          },
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'EXPORT_FAILED'
          }
        },
        {
          userId: auth.user.userId,
          userName: auth.user.email,
          userEmail: auth.user.email,
          userRole: auth.user.role
        }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to export dashboard', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}