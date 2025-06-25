import { NextRequest, NextResponse } from 'next/server';

// Mock dashboard data for demo purposes (no database dependencies)
const mockDashboards = {
  'server-side-demo': {
    uid: 'server-side-demo',
    id: 'server-side-demo',
    title: 'Server-Side Manufacturing Demo',
    description: 'A dashboard created and managed entirely server-side',
    tags: ['server-side', 'manufacturing', 'demo'],
    panels: [
      {
        id: 1,
        title: 'Equipment Status',
        type: 'stat',
        gridPos: { x: 0, y: 0, w: 6, h: 8 },
        targets: [{ refId: 'A', metric: 'equipment_status' }],
        fieldConfig: { defaults: {}, overrides: [] },
        options: {},
        transparent: false,
        links: [],
        transformations: []
      },
      {
        id: 2,
        title: 'Production Rate Trend',
        type: 'timeseries',
        gridPos: { x: 6, y: 0, w: 18, h: 8 },
        targets: [{ refId: 'A', metric: 'production_rate' }],
        fieldConfig: { defaults: {}, overrides: [] },
        options: {},
        transparent: false,
        links: [],
        transformations: []
      }
    ],
    templating: { list: [] },
    annotations: [],
    links: [],
    time: { from: 'now-6h', to: 'now' },
    timepicker: {},
    refresh: '30s',
    schemaVersion: 30,
    version: 1,
    timezone: 'browser',
    fiscalYearStartMonth: 0,
    liveNow: false,
    weekStart: 'monday',
    style: 'dark',
    editable: true,
    hideControls: false,
    graphTooltip: 1,
    preload: false,
    meta: {
      canEdit: true,
      canSave: true,
      canStar: true
    }
  }
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get('uid');
  
  try {
    if (uid && mockDashboards[uid as keyof typeof mockDashboards]) {
      return NextResponse.json(mockDashboards[uid as keyof typeof mockDashboards]);
    }
    
    // Return all demo dashboards
    return NextResponse.json(Object.values(mockDashboards));
  } catch (error) {
    console.error('Failed to fetch demo dashboards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboards' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const dashboard = await request.json();
    
    // For demo purposes, just acknowledge the save
    return NextResponse.json({
      ...dashboard,
      id: dashboard.uid || `demo-${Date.now()}`,
      version: (dashboard.version || 0) + 1,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to save demo dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to save dashboard' },
      { status: 500 }
    );
  }
}