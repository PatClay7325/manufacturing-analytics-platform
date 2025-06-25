import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    // Build where clause
    const where: any = {
      OR: [
        { createdBy: auth.userId }, // User's own folders
        { permission: 'public' }, // Public folders
        // TODO: Add team-based permissions when teams are implemented
      ]
    };

    if (search) {
      where.AND = [
        where.OR ? { OR: where.OR } : {},
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ]
        }
      ];
      delete where.OR;
    }

    // Get total count
    const total = await prisma.dashboardFolder.count({ where });

    // Get folders
    const folders = await prisma.dashboardFolder.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: { dashboards: true }
        },
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform the response
    const foldersWithCount = folders.map(folder => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      permission: folder.permission,
      tags: folder.tags,
      dashboardCount: folder._count.dashboards,
      createdBy: folder.User,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    }));

    return NextResponse.json({
      folders: foldersWithCount,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, permission, tags } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    // Create folder
    const folder = await prisma.dashboardFolder.create({
      data: {
        name,
        description: description || '',
        permission: permission || 'private',
        tags: tags || [],
        createdBy: auth.userId,
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json(folder);
  } catch (error) {
    console.error('Error creating folder:', error);
    if ((error as any).code === 'P2002') {
      return NextResponse.json(
        { error: 'A folder with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}