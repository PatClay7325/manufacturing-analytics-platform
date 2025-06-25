/**
 * Public Dashboard API
 * Access publicly shared dashboards without authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const { uid } = params;

    // Fetch dashboard if it's public
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        uid,
        isPublic: true,
      },
      include: {
        panels: {
          orderBy: { order: 'asc' },
        },
        variables: true,
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!dashboard) {
      return NextResponse.json(
        { error: 'Dashboard not found or not public' },
        { status: 404 }
      );
    }

    // Remove sensitive information
    const publicDashboard = {
      ...dashboard,
      createdBy: undefined,
      updatedBy: undefined,
      permissions: undefined,
    };

    // Add public access headers
    const response = NextResponse.json(publicDashboard);
    
    // Allow embedding
    response.headers.set('X-Frame-Options', 'ALLOWALL');
    response.headers.set('Content-Security-Policy', "frame-ancestors *");
    
    // Cache for 5 minutes
    response.headers.set(
      'Cache-Control',
      'public, max-age=300, stale-while-revalidate=60'
    );

    return response;
  } catch (error) {
    console.error('Public dashboard fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard' },
      { status: 500 }
    );
  }
}

// Get public dashboard metadata (for previews, embeds, etc.)
export async function HEAD(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const { uid } = params;

    const dashboard = await prisma.dashboard.findFirst({
      where: {
        uid,
        isPublic: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
      },
    });

    if (!dashboard) {
      return new NextResponse(null, { status: 404 });
    }

    const response = new NextResponse(null, { status: 200 });
    
    // Add metadata headers
    response.headers.set('X-Dashboard-Title', dashboard.title);
    if (dashboard.description) {
      response.headers.set('X-Dashboard-Description', dashboard.description);
    }
    
    return response;
  } catch (error) {
    console.error('Public dashboard HEAD error:', error);
    return new NextResponse(null, { status: 500 });
  }
}