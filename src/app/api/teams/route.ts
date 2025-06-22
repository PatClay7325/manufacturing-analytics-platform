import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, hasPermission } from '@/lib/auth';
import type { TeamSearchFilters, CreateTeamRequest, TeamsResponse } from '@/types/user-management';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(auth.user.role, 'view:teams')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters: TeamSearchFilters = {
      search: searchParams.get('search') || undefined,
      siteId: searchParams.get('siteId') || undefined,
      hasMembers: searchParams.get('hasMembers') ? searchParams.get('hasMembers') === 'true' : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') as any || 'name',
      sortOrder: searchParams.get('sortOrder') as any || 'asc',
    };

    // Build where clause
    const where: any = {};
    
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    
    if (filters.siteId) {
      where.siteId = filters.siteId;
    }
    
    if (filters.hasMembers !== undefined) {
      if (filters.hasMembers) {
        where.TeamMembers = {
          some: {}
        };
      } else {
        where.TeamMembers = {
          none: {}
        };
      }
    }

    // Build order by clause
    const orderBy: any = {};
    if (filters.sortBy === 'name') {
      orderBy.name = filters.sortOrder;
    } else if (filters.sortBy === 'memberCount') {
      // Note: Prisma doesn't support ordering by count directly, so we'll order by createdAt
      orderBy.createdAt = filters.sortOrder;
    } else if (filters.sortBy === 'createdAt') {
      orderBy.createdAt = filters.sortOrder;
    }

    // Get total count
    const total = await prisma.team.count({ where });

    // Get teams with members
    const teams = await prisma.team.findMany({
      where,
      skip: (filters.page! - 1) * filters.limit!,
      take: filters.limit!,
      include: {
        Site: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        TeamMembers: {
          select: {
            userId: true,
            role: true,
            joinedAt: true,
            User: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: { TeamMembers: true }
        }
      },
      orderBy,
    });

    // Transform the response
    const teamsWithMembers = teams.map(team => ({
      id: team.id,
      name: team.name,
      description: team.description,
      siteId: team.siteId,
      permissions: [], // Will be implemented with proper permissions system
      memberCount: team._count.TeamMembers,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      Site: team.Site,
      TeamMembers: team.TeamMembers,
    }));

    const response: TeamsResponse = {
      teams: teamsWithMembers,
      total,
      page: filters.page!,
      limit: filters.limit!,
      totalPages: Math.ceil(total / filters.limit!),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(auth.user.role, 'create:teams')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const teamData: CreateTeamRequest = await request.json();

    // Validate required fields
    if (!teamData.name) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      );
    }

    // Check if team with same name already exists
    const existingTeam = await prisma.team.findFirst({
      where: { name: teamData.name },
    });

    if (existingTeam) {
      return NextResponse.json(
        { error: 'Team with this name already exists' },
        { status: 409 }
      );
    }

    const team = await prisma.$transaction(async (tx) => {
      // Create team
      const newTeam = await tx.team.create({
        data: {
          name: teamData.name,
          description: teamData.description || null,
          siteId: teamData.siteId || null,
        },
        select: {
          id: true,
          name: true,
          description: true,
          siteId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Add members if provided
      if (teamData.memberEmails && teamData.memberEmails.length > 0) {
        // Find users by email
        const users = await tx.user.findMany({
          where: {
            email: { in: teamData.memberEmails.map(email => email.toLowerCase()) }
          },
          select: { id: true, email: true }
        });

        // Create team member relationships
        if (users.length > 0) {
          await tx.teamMember.createMany({
            data: users.map(user => ({
              teamId: newTeam.id,
              userId: user.id,
              role: 'member',
            })),
          });
        }
      }

      return newTeam;
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}