import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, hasPermission } from '@/lib/auth';
import bcrypt from 'bcrypt';
import type { UpdateUserRequest } from '@/types/user-management';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify authentication and permissions
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Users can view their own profile, or need view:users permission
    if (auth.user.userId !== params.id && !hasPermission(auth.user.role, 'view:users')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        department: true,
        lastLogin: true,
        lastLoginAt: true,
        isActive: true,
        organizationId: true,
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
            teamId: true,
            role: true,
            joinedAt: true,
            Team: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        ApiKeys: {
          select: {
            id: true,
            name: true,
            permissions: true,
            lastUsedAt: true,
            expiresAt: true,
            createdAt: true,
          },
        },
        roles: {
          select: {
            assignedAt: true,
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        permissions: {
          select: {
            grantedAt: true,
            permission: {
              select: {
                id: true,
                name: true,
                description: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify authentication and permissions
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Users can edit their own profile (limited fields), or need edit:users permission
    const canEditOthers = hasPermission(auth.user.role, 'edit:users');
    const isOwnProfile = auth.user.userId === params.id;
    
    if (!isOwnProfile && !canEditOthers) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const userData: UpdateUserRequest = await request.json();

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate email if provided
    if (userData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userData.email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }

      // Check if email is already taken by another user
      const emailTaken = await prisma.user.findFirst({
        where: {
          email: userData.email.toLowerCase(),
          NOT: { id: params.id },
        },
      });

      if (emailTaken) {
        return NextResponse.json(
          { error: 'Email already taken by another user' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    
    // Fields that users can edit on their own profile
    if (userData.name !== undefined) updateData.name = userData.name || null;
    if (userData.username !== undefined) updateData.username = userData.username || null;
    if (userData.department !== undefined) updateData.department = userData.department || null;
    
    // Fields only admins can edit
    if (canEditOthers) {
      if (userData.email !== undefined) updateData.email = userData.email.toLowerCase();
      if (userData.role !== undefined) updateData.role = userData.role;
      if (userData.siteId !== undefined) updateData.siteId = userData.siteId || null;
      if (userData.isActive !== undefined) updateData.isActive = userData.isActive;
    }

    const user = await prisma.$transaction(async (tx) => {
      // Update user
      const updatedUser = await tx.user.update({
        where: { id: params.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          department: true,
          isActive: true,
          siteId: true,
          updatedAt: true,
        },
      });

      // Update team memberships if provided and user has permission
      if (userData.teamIds !== undefined && canEditOthers) {
        // Remove existing team memberships
        await tx.teamMember.deleteMany({
          where: { userId: params.id },
        });

        // Add new team memberships
        if (userData.teamIds.length > 0) {
          await tx.teamMember.createMany({
            data: userData.teamIds.map(teamId => ({
              userId: params.id,
              teamId,
              role: 'member',
            })),
          });
        }
      }

      return updatedUser;
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify authentication and permissions
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(auth.user.role, 'delete:users')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Prevent users from deleting themselves
    if (auth.user.userId === params.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}