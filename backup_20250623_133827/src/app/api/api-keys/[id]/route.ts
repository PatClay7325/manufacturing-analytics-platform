import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  permissions: z.array(z.string()).optional(),
});

// GET /api/api-keys/[id] - Get API key details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: params.id,
        userId: auth.userId,
      },
      select: {
        id: true,
        name: true,
        permissions: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
        key: true,
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Mask the key
    const maskedKey = {
      ...apiKey,
      key: `mfg_live_${'*'.repeat(60)}${apiKey.key.slice(-4)}`,
      isExpired: apiKey.expiresAt ? new Date(apiKey.expiresAt) < new Date() : false,
    };

    return NextResponse.json(maskedKey);
  } catch (error) {
    console.error('Get API key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/api-keys/[id] - Update API key
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate input
    const validationResult = updateApiKeySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, permissions } = validationResult.data;

    // Check if API key exists and belongs to user
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        id: params.id,
        userId: auth.userId,
      },
    });

    if (!existingKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Check if key is expired
    if (existingKey.expiresAt && new Date(existingKey.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'Cannot update expired API key' },
        { status: 400 }
      );
    }

    // Filter permissions based on user's role
    let filteredPermissions = permissions;
    if (permissions) {
      const userPermissions = getPermissionsByRole(auth.user?.role || 'user');
      filteredPermissions = permissions.filter(p => userPermissions.includes(p));
    }

    // Update API key
    const updatedKey = await prisma.apiKey.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(filteredPermissions && { permissions: filteredPermissions }),
      },
      select: {
        id: true,
        name: true,
        permissions: true,
        expiresAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(updatedKey);
  } catch (error) {
    console.error('Update API key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/api-keys/[id] - Delete API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if API key exists and belongs to user
    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id: params.id,
        userId: auth.userId,
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Delete API key
    await prisma.apiKey.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: 'API key deleted successfully',
    });
  } catch (error) {
    console.error('Delete API key error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getPermissionsByRole(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    admin: [
      'read:all',
      'write:all',
      'delete:all',
      'admin:all',
    ],
    manager: [
      'read:dashboards',
      'write:dashboards',
      'read:alerts',
      'write:alerts',
      'read:equipment',
      'write:equipment',
      'read:metrics',
      'write:metrics',
      'read:users',
    ],
    engineer: [
      'read:dashboards',
      'write:dashboards',
      'read:equipment',
      'write:equipment',
      'read:metrics',
      'write:metrics',
      'read:alerts',
    ],
    operator: [
      'read:dashboards',
      'read:equipment',
      'read:alerts',
      'write:metrics',
    ],
    viewer: [
      'read:dashboards',
      'read:equipment',
      'read:alerts',
      'read:metrics',
    ],
    user: [
      'read:dashboards',
      'read:metrics',
    ],
  };

  return rolePermissions[role] || rolePermissions.user;
}