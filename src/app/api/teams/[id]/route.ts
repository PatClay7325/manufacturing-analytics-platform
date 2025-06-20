import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const updateTeamSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().optional(),
  siteId: z.string().nullable().optional(),
});

// GET /api/teams/[id] - Get team by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await requireAuth(request, 'view:team');
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        Site: {
          select: {
            id: true,
            name: true,
            code: true,
            Enterprise: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        TeamMembers: {
          include: {
            User: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                department: true,
                lastLogin: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this team
    if (auth.user?.role !== 'admin' && auth.user?.siteId !== team.siteId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: team.id,
      name: team.name,
      description: team.description,
      site: team.Site,
      members: team.TeamMembers.map(tm => ({
        ...tm.User,
        teamRole: tm.role,
        joinedAt: tm.joinedAt,
      })),
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    });
  } catch (error) {
    console.error('Get team error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/teams/[id] - Update team
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await requireAuth(request, 'manage:teams');
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = updateTeamSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, siteId } = validationResult.data;

    // Check if team exists and user has access
    const existingTeam = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        TeamMembers: {
          where: { userId: auth.userId },
        },
      },
    });

    if (!existingTeam) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isTeamAdmin = existingTeam.TeamMembers.some(tm => tm.role === 'admin');
    if (auth.user?.role !== 'admin' && !isTeamAdmin) {
      return NextResponse.json(
        { error: 'Only team admins can update team details' },
        { status: 403 }
      );
    }

    // Update team
    const updatedTeam = await prisma.team.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(siteId !== undefined && auth.user?.role === 'admin' && { siteId }),
      },
      include: {
        Site: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: updatedTeam.id,
      name: updatedTeam.name,
      description: updatedTeam.description,
      site: updatedTeam.Site,
      updatedAt: updatedTeam.updatedAt,
    });
  } catch (error) {
    console.error('Update team error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id] - Delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await requireAuth(request, 'manage:teams');
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            TeamMembers: true,
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Only admins can delete teams
    if (auth.user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can delete teams' },
        { status: 403 }
      );
    }

    // Delete team (cascading deletes will remove TeamMembers)
    await prisma.team.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: 'Team deleted successfully',
    });
  } catch (error) {
    console.error('Delete team error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}