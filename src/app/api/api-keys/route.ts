import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).optional().default([]),
  expiresAt: z.string().datetime().optional(),
});

// Generate a secure API key
function generateApiKey(): string {
  // Format: mfg_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  const prefix = 'mfg_live_';
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}${randomBytes}`;
}

// Hash API key for storage
function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// GET /api/api-keys - List user's API keys
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's API keys (without exposing the actual key)
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: auth.userId },
      select: {
        id: true,
        name: true,
        permissions: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
        // Show only last 4 characters of the key
        key: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Mask the keys, showing only last 4 characters
    const maskedKeys = apiKeys.map(key => ({
      ...key,
      key: `mfg_live_${'*'.repeat(60)}${key.key.slice(-4)}`,
      isExpired: key.expiresAt ? new Date(key.expiresAt) < new Date() : false,
    }));

    return NextResponse.json({
      apiKeys: maskedKeys,
    });
  } catch (error) {
    console.error('List API keys error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/api-keys - Create new API key
export async function POST(request: NextRequest) {
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
    const validationResult = createApiKeySchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, permissions, expiresAt } = validationResult.data;

    // Check API key limit (e.g., max 10 keys per user)
    const keyCount = await prisma.apiKey.count({
      where: { userId: auth.userId },
    });

    if (keyCount >= 10) {
      return NextResponse.json(
        { error: 'API key limit reached. Please delete unused keys.' },
        { status: 400 }
      );
    }

    // Generate new API key
    const apiKey = generateApiKey();
    const hashedKey = hashApiKey(apiKey);

    // Filter permissions based on user's role
    const userPermissions = getPermissionsByRole(auth.user?.role || 'user');
    const filteredPermissions = permissions.filter(p => userPermissions.includes(p));

    // Create API key record
    const createdKey = await prisma.apiKey.create({
      data: {
        name,
        key: hashedKey,
        userId: auth.userId!,
        permissions: filteredPermissions,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        permissions: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Return the actual key only once (user must save it)
    return NextResponse.json({
      apiKey: {
        ...createdKey,
        key: apiKey, // Return full key only on creation
      },
      message: 'Save this API key securely. You won\'t be able to see it again.',
    }, { status: 201 });
  } catch (error) {
    console.error('Create API key error:', error);
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