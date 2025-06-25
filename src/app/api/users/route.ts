import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { verifyAuth, hasPermission, createUser } from '@/lib/auth';
import bcrypt from 'bcrypt';
import type { UserSearchFilters, CreateUserRequest, UsersResponse } from '@/types/user-management';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and permissions
    const auth = await verifyAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(auth.user.role, 'view:users')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const filters: UserSearchFilters = {
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') as any || undefined,
      department: searchParams.get('department') || undefined,
      siteId: searchParams.get('siteId') || undefined,
      teamId: searchParams.get('teamId') || undefined,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
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
        { email: { contains: filters.search, mode: 'insensitive' } },
        { username: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    
    if (filters.role) {
      where.role = filters.role;
    }
    
    if (filters.department) {
      where.department = { contains: filters.department, mode: 'insensitive' };
    }
    
    if (filters.siteId) {
      where.siteId = filters.siteId;
    }
    
    if (filters.teamId) {
      where.TeamMembers = {
        some: {
          teamId: filters.teamId
        }
      };
    }
    
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Build order by clause
    const orderBy: any = {};
    if (filters.sortBy === 'name') {
      orderBy.name = filters.sortOrder;
    } else if (filters.sortBy === 'email') {
      orderBy.email = filters.sortOrder;
    } else if (filters.sortBy === 'role') {
      orderBy.role = filters.sortOrder;
    } else if (filters.sortBy === 'createdAt') {
      orderBy.createdAt = filters.sortOrder;
    } else if (filters.sortBy === 'lastLogin') {
      orderBy.lastLogin = filters.sortOrder;
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users
    const users = await prisma.user.findMany({
      where,
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
          },
        },
        TeamMembers: {
          select: {
            teamId: true,
            role: true,
            Team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      skip: (filters.page! - 1) * filters.limit!,
      take: filters.limit!,
      orderBy,
    });

    const response: UsersResponse = {
      users,
      total,
      page: filters.page!,
      limit: filters.limit!,
      totalPages: Math.ceil(total / filters.limit!),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
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

    if (!hasPermission(auth.user.role, 'create:users')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const userData: CreateUserRequest = await request.json();

    // Validate required fields
    if (!userData.email || !userData.password || !userData.role) {
      return NextResponse.json(
        { error: 'Email, password, and role are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(userData.password, 12);

    // Create user
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: userData.email.toLowerCase(),
          name: userData.name || null,
          username: userData.username || null,
          passwordHash,
          role: userData.role,
          department: userData.department || null,
          siteId: userData.siteId || null,
          isActive: userData.isActive ?? true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          role: true,
          department: true,
          isActive: true,
          siteId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Add user to teams if specified
      if (userData.teamIds && userData.teamIds.length > 0) {
        await tx.teamMember.createMany({
          data: userData.teamIds.map(teamId => ({
            userId: newUser.id,
            teamId,
            role: 'member',
          })),
        });
      }

      return newUser;
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}