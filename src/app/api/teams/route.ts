import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    // Build where clause
    const where: any = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    // Get total count
    const total = await prisma.team.count({ where });

    // Get teams with member count
    const teams = await prisma.team.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: { TeamMembers: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform the response
    const teamsWithCount = teams.map(team => ({
      id: team.id,
      name: team.name,
      description: team.description,
      permissions: team.permissions || [],
      memberCount: team._count.TeamMembers,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    }));

    return NextResponse.json({
      teams: teamsWithCount,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin permissions
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, permissions, members } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      );
    }

    // Create team
    const team = await prisma.team.create({
      data: {
        name,
        description,
        permissions: permissions || [],
      },
    });

    // Add members if provided
    if (members && members.length > 0) {
      // Find users by email
      const users = await prisma.user.findMany({
        where: {
          email: { in: members }
        },
        select: { id: true }
      });

      // Create team member relationships
      if (users.length > 0) {
        await prisma.teamMember.createMany({
          data: users.map(user => ({
            teamId: team.id,
            userId: user.id,
            role: 'member',
          })),
        });
      }
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}