import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verifyAuth, hasPermission } from '@/lib/auth';
import type { UpdateTeamRequest } from '@/types/user-management';

// GET /api/teams/[id] - Get team by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication and permissions
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(auth.user.role, 'view:teams')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const team = await prisma.team.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        description: true,
        siteId: true,
        createdAt: true,
        updatedAt: true,
        Site: {
          select: {
            id: true,
            name: true,
            code: true,
            location: true,
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
                email: true,
                name: true,
                role: true,
                department: true,
                lastLogin: true,
                isActive: true,
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
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    return NextResponse.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team' },
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
    // Verify authentication and permissions
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(auth.user.role, 'edit:teams')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const teamData: UpdateTeamRequest = await request.json();

    // Check if team exists
    const existingTeam = await prisma.team.findUnique({
      where: { id: params.id },
    });

    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if new name conflicts with existing team
    if (teamData.name && teamData.name !== existingTeam.name) {
      const nameConflict = await prisma.team.findFirst({
        where: {
          name: teamData.name,
          NOT: { id: params.id },
        },
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Team with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (teamData.name !== undefined) updateData.name = teamData.name;
    if (teamData.description !== undefined) updateData.description = teamData.description || null;
    if (teamData.siteId !== undefined) updateData.siteId = teamData.siteId || null;

    // Update team
    const updatedTeam = await prisma.team.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        description: true,
        siteId: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedTeam);
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json(
      { error: 'Failed to update team' },
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
    // Verify authentication and permissions
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(auth.user.role, 'delete:teams')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: params.id },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Delete team (cascade will handle related records)
    await prisma.team.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}