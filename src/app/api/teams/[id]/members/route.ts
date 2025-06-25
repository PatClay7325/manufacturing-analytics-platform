import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const addMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(['admin', 'member']).default('member'),
});

const updateMemberSchema = z.object({
  role: z.enum(['admin', 'member']),
});

// POST /api/teams/[id]/members - Add member to team
export async function POST(
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
    const validationResult = addMemberSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, role } = validationResult.data;

    // Check if team exists and user has permission
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        TeamMembers: {
          where: { userId: auth.userId },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user is team admin or system admin
    const isTeamAdmin = team.TeamMembers.some(tm => tm.role === 'admin');
    if (auth.user?.role !== 'admin' && !isTeamAdmin) {
      return NextResponse.json(
        { error: 'Only team admins can add members' },
        { status: 403 }
      );
    }

    // Check if user exists
    const userToAdd = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userToAdd) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId: params.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a team member' },
        { status: 409 }
      );
    }

    // Add member
    const teamMember = await prisma.teamMember.create({
      data: {
        userId,
        teamId: params.id,
        role,
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            department: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...teamMember.User,
      teamRole: teamMember.role,
      joinedAt: teamMember.joinedAt,
    }, { status: 201 });
  } catch (error) {
    console.error('Add team member error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/teams/[id]/members/[userId] - Update member role
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
    const { userId } = body;
    
    // Validate input
    const validationResult = updateMemberSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { role } = validationResult.data;

    // Check if team exists and user has permission
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        TeamMembers: {
          where: { userId: auth.userId },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user is team admin or system admin
    const isTeamAdmin = team.TeamMembers.some(tm => tm.role === 'admin');
    if (auth.user?.role !== 'admin' && !isTeamAdmin) {
      return NextResponse.json(
        { error: 'Only team admins can update member roles' },
        { status: 403 }
      );
    }

    // Update member role
    const updatedMember = await prisma.teamMember.update({
      where: {
        userId_teamId: {
          userId,
          teamId: params.id,
        },
      },
      data: { role },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...updatedMember.User,
      teamRole: updatedMember.role,
      joinedAt: updatedMember.joinedAt,
    });
  } catch (error) {
    console.error('Update team member error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/teams/[id]/members/[userId] - Remove member from team
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

    // Get userId from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if team exists and user has permission
    const team = await prisma.team.findUnique({
      where: { id: params.id },
      include: {
        TeamMembers: true,
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user is team admin or system admin
    const currentUserMember = team.TeamMembers.find(tm => tm.userId === auth.userId);
    const isTeamAdmin = currentUserMember?.role === 'admin';
    
    if (auth.user?.role !== 'admin' && !isTeamAdmin) {
      return NextResponse.json(
        { error: 'Only team admins can remove members' },
        { status: 403 }
      );
    }

    // Prevent removing the last admin
    const adminCount = team.TeamMembers.filter(tm => tm.role === 'admin').length;
    const memberToRemove = team.TeamMembers.find(tm => tm.userId === userId);
    
    if (memberToRemove?.role === 'admin' && adminCount === 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last admin from the team' },
        { status: 400 }
      );
    }

    // Remove member
    await prisma.teamMember.delete({
      where: {
        userId_teamId: {
          userId,
          teamId: params.id,
        },
      },
    });

    return NextResponse.json({
      message: 'Member removed successfully',
    });
  } catch (error) {
    console.error('Remove team member error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}