/**
 * Dashboard Star API Route
 * POST /api/dashboards/[id]/star - Star/unstar dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { dashboardPersistenceService } from '@/services/dashboardPersistenceService';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { starred } = body;

    if (typeof starred !== 'boolean') {
      return NextResponse.json(
        { error: 'starred field must be a boolean' },
        { status: 400 }
      );
    }

    // TODO: Get user ID from authentication
    const userId = 'system'; // Placeholder

    await dashboardPersistenceService.starDashboard(id, starred, userId);

    return NextResponse.json({ 
      message: starred ? 'Dashboard starred' : 'Dashboard unstarred',
      starred 
    });
  } catch (error) {
    console.error('Dashboard star error:', error);
    return NextResponse.json(
      { error: 'Failed to update dashboard star status' },
      { status: 500 }
    );
  }
}