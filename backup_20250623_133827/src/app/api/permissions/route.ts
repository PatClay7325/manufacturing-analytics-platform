import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, hasPermission } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/permissions - Get all permissions and roles
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'view:users');
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all users with their roles
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        siteId: true,
        Site: {
          select: {
            name: true,
            Enterprise: {
              select: {
                name: true,
              },
            },
          },
        },
        updatedAt: true,
      },
      orderBy: {
        email: 'asc',
      },
    });

    // Count users by role
    const roleCounts = users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Define all available permissions
    const permissions = {
      'manage:users': ['admin'],
      'manage:teams': ['admin', 'manager'],
      'manage:settings': ['admin'],
      'manage:dashboards': ['admin', 'manager', 'engineer'],
      'manage:alerts': ['admin', 'manager', 'supervisor'],
      'manage:equipment': ['admin', 'manager', 'engineer'],
      'manage:integrations': ['admin'],
      'edit:all': ['admin'],
      'edit:dashboards': ['admin', 'manager', 'engineer'],
      'edit:alerts': ['admin', 'manager', 'supervisor'],
      'edit:equipment': ['admin', 'manager', 'engineer', 'technician'],
      'edit:maintenance': ['admin', 'manager', 'engineer', 'technician'],
      'edit:quality': ['admin', 'manager', 'quality_analyst'],
      'create:dashboards': ['admin', 'manager', 'engineer'],
      'create:alerts': ['admin', 'manager', 'supervisor', 'engineer'],
      'create:maintenance': ['admin', 'manager', 'engineer', 'technician'],
      'create:quality:reports': ['admin', 'manager', 'quality_analyst'],
      'delete:all': ['admin'],
      'delete:own': ['admin', 'manager', 'engineer'],
      'view:all': ['admin', 'manager', 'engineer'],
      'view:users': ['admin', 'manager'],
      'view:team': ['admin', 'manager', 'supervisor'],
      'view:dashboards': ['admin', 'manager', 'engineer', 'supervisor', 'operator', 'quality_analyst', 'viewer'],
      'view:equipment': ['admin', 'manager', 'engineer', 'supervisor', 'operator', 'technician', 'quality_analyst'],
      'view:alerts': ['admin', 'manager', 'engineer', 'supervisor', 'operator', 'technician'],
      'view:maintenance': ['admin', 'manager', 'engineer', 'technician'],
      'view:quality': ['admin', 'manager', 'engineer', 'quality_analyst'],
      'view:analytics': ['admin', 'manager', 'engineer'],
      'view:own': ['user'],
      'acknowledge:alerts': ['admin', 'manager', 'supervisor', 'operator'],
      'update:equipment:status': ['admin', 'manager', 'engineer', 'supervisor', 'operator'],
    };

    // Define role hierarchy
    const roleHierarchy = {
      admin: { level: 100, description: 'Full system access' },
      manager: { level: 80, description: 'Manage teams and resources' },
      engineer: { level: 70, description: 'Technical operations and analysis' },
      supervisor: { level: 60, description: 'Supervise operations and staff' },
      quality_analyst: { level: 50, description: 'Quality control and reporting' },
      technician: { level: 40, description: 'Equipment maintenance and repairs' },
      operator: { level: 30, description: 'Operate equipment and systems' },
      viewer: { level: 20, description: 'View-only access' },
      user: { level: 10, description: 'Basic user access' },
    };

    // Build roles with user counts
    const roles = Object.entries(roleHierarchy).map(([name, info]) => ({
      name,
      ...info,
      userCount: roleCounts[name] || 0,
      isSystem: true,
    }));

    // Transform users data for frontend
    const userPermissions = users.map(user => {
      // Get permissions for user's role
      const rolePermissions = Object.entries(permissions)
        .filter(([_, allowedRoles]) => allowedRoles.includes(user.role))
        .map(([permission]) => permission);

      return {
        userId: user.id,
        userName: user.name || user.email,
        email: user.email,
        role: user.role,
        department: user.department,
        site: user.Site?.name,
        enterprise: user.Site?.Enterprise?.name,
        permissions: rolePermissions,
        customPermissions: [], // To be implemented with proper permission model
        lastModified: user.updatedAt,
      };
    });

    return NextResponse.json({
      permissions,
      roles,
      users: userPermissions,
      categories: {
        'System Management': ['manage:users', 'manage:teams', 'manage:settings', 'manage:integrations'],
        'Content Management': ['manage:dashboards', 'manage:alerts', 'manage:equipment'],
        'Editing': ['edit:all', 'edit:dashboards', 'edit:alerts', 'edit:equipment', 'edit:maintenance', 'edit:quality'],
        'Creation': ['create:dashboards', 'create:alerts', 'create:maintenance', 'create:quality:reports'],
        'Deletion': ['delete:all', 'delete:own'],
        'Viewing': ['view:all', 'view:users', 'view:team', 'view:dashboards', 'view:equipment', 'view:alerts', 'view:maintenance', 'view:quality', 'view:analytics', 'view:own'],
        'Operations': ['acknowledge:alerts', 'update:equipment:status'],
      },
    });
  } catch (error) {
    console.error('Failed to fetch permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}

// PATCH /api/permissions - Update user permissions or role
export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'manage:users');
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId, role, permissions: customPermissions } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        updatedAt: true,
      },
    });

    // TODO: Implement custom permissions when permission model is added to schema

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Failed to update permissions:', error);
    return NextResponse.json(
      { error: 'Failed to update permissions' },
      { status: 500 }
    );
  }
}