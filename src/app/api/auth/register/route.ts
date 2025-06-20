import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, department, siteId, inviteCode } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: hashedPassword,
        role: 'viewer', // Default role for new users
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Map role to permissions
    const rolePermissions: Record<string, string[]> = {
      admin: ['admin', 'read', 'write', 'manage_users', 'manage_teams', 'manage_alerts', 'manage_datasources'],
      operator: ['read', 'write', 'manage_alerts'],
      analyst: ['read', 'write'],
      viewer: ['read'],
    };

    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: rolePermissions[user.role] || ['read'],
    };

    // Create response with token in cookie
    const response = NextResponse.json({
      user: userResponse,
      token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}