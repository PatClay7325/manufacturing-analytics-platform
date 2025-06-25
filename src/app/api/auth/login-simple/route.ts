import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Force Node.js runtime to avoid Edge Runtime issues with jsonwebtoken
export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, remember } = body;

    console.log('Login attempt for:', email);

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('User not found:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    console.log('User found:', user.email, 'Role:', user.role);

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      console.log('Invalid password for:', email);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    console.log('Password valid for:', email);

    // Generate JWT token
    const expiresIn = remember ? '30d' : '24h';
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn }
    );

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

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

    console.log('Login successful for:', email);

    // Create response with token in cookie
    const response = NextResponse.json({
      user: userResponse,
      token,
      expiresAt: Date.now() + (remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000),
    });

    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: remember ? 30 * 24 * 60 * 60 : 24 * 60 * 60, // seconds
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}