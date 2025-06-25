import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// Force Node.js runtime to avoid Edge Runtime issues with jsonwebtoken
export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Registration schema
const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['viewer', 'analyst', 'operator', 'admin']).default('viewer').optional(),
  siteId: z.string().optional(),
  teamId: z.string().optional(),
  department: z.string().optional(),
  inviteCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request data
    const validatedData = RegisterSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        id: `user_${Date.now()}`,
        email: validatedData.email.toLowerCase(),
        name: validatedData.name,
        passwordHash: hashedPassword,
        role: validatedData.role || 'viewer',
        siteId: validatedData.siteId,
        teamId: validatedData.teamId,
        department: validatedData.department,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create user preferences
    await prisma.user_preferences.create({
      data: {
        id: `pref_${user.id}`,
        userId: user.id,
        theme: 'system',
        language: 'en',
        timezone: 'browser',
        emailNotifications: true,
        browserNotifications: true,
        createdAt: new Date(),
        updatedAt: new Date(),
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
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}