import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'view:dashboards');
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all';
    const sort = searchParams.get('sort') || 'created';
    const dashboardId = searchParams.get('dashboardId');

    // Build where clause
    const where: any = {
      userId: authResult.user.userId
    };

    if (dashboardId) {
      where.dashboardId = dashboardId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (filter === 'public') {
      where.isPublic = true;
    } else if (filter === 'private') {
      where.isPublic = false;
    }

    // Build order by
    let orderBy: any = {};
    switch (sort) {
      case 'viewed':
        orderBy = { lastViewedAt: 'desc' };
        break;
      case 'name':
        orderBy = { title: 'asc' };
        break;
      case 'created':
      default:
        orderBy = { createdAt: 'desc' };
    }

    // Get total count
    const totalCount = await prisma.dashboardSnapshot.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    // Get snapshots
    const snapshots = await prisma.dashboardSnapshot.findMany({
      where,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy,
      take: limit,
      skip: (page - 1) * limit
    });

    return NextResponse.json({
      snapshots,
      page,
      totalPages,
      totalCount
    });

  } catch (error) {
    console.error('Failed to fetch snapshots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch snapshots' },
      { status: 500 }
    );
  }
}