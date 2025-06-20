/**
 * Dashboard by ID API Routes
 * GET /api/dashboards/[id] - Get dashboard by UID
 * PUT /api/dashboards/[id] - Update dashboard
 * DELETE /api/dashboards/[id] - Delete dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { dashboardPersistenceService } from '@/services/dashboardPersistenceService';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    const dashboard = await dashboardPersistenceService.getDashboard(id);
    
    if (!dashboard) {
      return NextResponse.json(
        { error: 'Dashboard not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ dashboard });
  } catch (error) {
    console.error('Dashboard load error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { dashboard, message, overwrite } = body;

    if (!dashboard) {
      return NextResponse.json(
        { error: 'Dashboard data is required' },
        { status: 400 }
      );
    }

    // Ensure UID matches
    dashboard.uid = id;

    // TODO: Get user ID from authentication
    const userId = 'system'; // Placeholder

    const result = await dashboardPersistenceService.saveDashboard({
      dashboard,
      message,
      overwrite: overwrite !== false,
      userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Dashboard update error:', error);
    return NextResponse.json(
      { error: 'Failed to update dashboard' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // TODO: Get user ID from authentication
    const userId = 'system'; // Placeholder

    await dashboardPersistenceService.deleteDashboard(id, userId);

    return NextResponse.json({ message: 'Dashboard deleted successfully' });
  } catch (error) {
    console.error('Dashboard delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete dashboard' },
      { status: 500 }
    );
  }
}