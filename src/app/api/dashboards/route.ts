/**
 * Dashboard API Routes - List and Create dashboards
 * GET /api/dashboards - List dashboards with filtering
 * POST /api/dashboards - Create new dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { DashboardService } from '@/services/dashboardService';

const dashboardService = DashboardService.getInstance();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const options = {
      query: searchParams.get('query') || undefined,
      tags: searchParams.getAll('tags'),
      limit: parseInt(searchParams.get('limit') || '50'),
      offset: parseInt(searchParams.get('offset') || '0'),
    };

    const result = await dashboardService.listDashboards(options);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Dashboard list error:', error);
    return NextResponse.json(
      { error: 'Failed to list dashboards', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const dashboard = await request.json();

    if (!dashboard || !dashboard.title) {
      return NextResponse.json(
        { error: 'Dashboard title is required' },
        { status: 400 }
      );
    }

    const result = await dashboardService.createDashboard(dashboard);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Dashboard create error:', error);
    return NextResponse.json(
      { error: 'Failed to create dashboard', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}