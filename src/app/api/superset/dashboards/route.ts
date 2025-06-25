import { NextRequest, NextResponse } from 'next/server';
import { createSupersetClient } from '@/lib/superset/SupersetClient';

export async function GET(request: NextRequest) {
  try {
    const supersetClient = createSupersetClient();
    
    // Login to Superset
    await supersetClient.login();
    
    // Get dashboards
    const dashboards = await supersetClient.getDashboards();
    
    return NextResponse.json({ dashboards });
  } catch (error) {
    console.error('Failed to fetch dashboards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboards' },
      { status: 500 }
    );
  }
}