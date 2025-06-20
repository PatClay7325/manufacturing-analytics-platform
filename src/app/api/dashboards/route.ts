/**
 * Dashboard API Routes - CRUD operations for dashboards
 * GET /api/dashboards - Search dashboards
 * POST /api/dashboards - Save dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { dashboardPersistenceService } from '@/services/dashboardPersistenceService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const searchRequest = {
      query: searchParams.get('query') || undefined,
      tag: searchParams.getAll('tag'),
      starred: searchParams.get('starred') === 'true' ? true : undefined,
      folderId: searchParams.get('folderId') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      page: parseInt(searchParams.get('page') || '1'),
    };

    const dashboards = await dashboardPersistenceService.searchDashboards(searchRequest);
    
    return NextResponse.json(dashboards);
  } catch (error) {
    console.error('Dashboard search error:', error);
    return NextResponse.json(
      { error: 'Failed to search dashboards' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dashboard, message, overwrite, folderId } = body;

    if (!dashboard || !dashboard.title) {
      return NextResponse.json(
        { error: 'Dashboard title is required' },
        { status: 400 }
      );
    }

    // TODO: Get user ID from authentication
    const userId = 'system'; // Placeholder

    const result = await dashboardPersistenceService.saveDashboard({
      dashboard,
      message,
      overwrite,
      userId,
      folderId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Dashboard save error:', error);
    return NextResponse.json(
      { error: 'Failed to save dashboard' },
      { status: 500 }
    );
  }
}