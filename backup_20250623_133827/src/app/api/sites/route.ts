import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, hasPermission } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Basic read access for site data
    if (!hasPermission(auth.user.role, 'view:equipment')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get sites with basic information
    const sites = await prisma.site.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        location: true,
        enterpriseId: true,
        Enterprise: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ sites });
  } catch (error) {
    console.error('Error fetching sites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sites' },
      { status: 500 }
    );
  }
}