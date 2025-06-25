import { NextRequest, NextResponse } from 'next/server';
import { createSupersetClient } from '@/lib/superset/SupersetClient';

export async function POST(request: NextRequest) {
  try {
    // For now, we'll create guest tokens without requiring authentication
    // In production, you should verify the user is authenticated
    const { dashboardId, user } = await request.json();
    
    if (!dashboardId) {
      return NextResponse.json({ error: 'Dashboard ID required' }, { status: 400 });
    }

    // Create Superset client
    const supersetClient = createSupersetClient();
    
    // Generate guest token with user info or default guest user
    const token = await supersetClient.generateGuestToken(dashboardId, user || {
      email: 'guest@manufacturing.com',
      name: 'Guest User'
    });

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Failed to generate guest token:', error);
    return NextResponse.json(
      { error: 'Failed to generate guest token' },
      { status: 500 }
    );
  }
}