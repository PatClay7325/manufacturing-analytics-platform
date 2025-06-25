import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { auditService } from '@/services/auditService';
import { v4 as uuidv4 } from 'uuid';

// Force Node.js runtime to avoid Edge Runtime issues with jsonwebtoken
export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = request.headers.get('x-request-id') || uuidv4();
  const sessionId = uuidv4();
  
  try {
    const body = await request.json();
    const { email, password, remember } = body;

    // Get request context for audit logging
    const requestContext = {
      method: request.method,
      path: '/api/auth/login',
      ip: request.headers.get('x-forwarded-for') || request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      origin: request.headers.get('origin') || undefined,
      referer: request.headers.get('referer') || undefined
    };

    if (!email || !password) {
      await auditService.logAuth(
        'login_failed',
        'failure',
        { requestId },
        requestContext,
        { reason: 'Missing credentials', email }
      );
      
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
      await auditService.logAuth(
        'login_failed',
        'failure',
        { requestId },
        requestContext,
        { reason: 'User not found', email }
      );
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      await auditService.logAuth(
        'login_failed',
        'failure',
        { 
          userId: user.id,
          userEmail: user.email,
          requestId
        },
        requestContext,
        { reason: 'Invalid password' }
      );
      
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const expiresIn = remember ? '30d' : '24h';
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role,
        name: user.name,
        sessionId
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

    // Log successful login
    const duration = Date.now() - startTime;
    await auditService.logAuth(
      'login',
      'success',
      {
        userId: user.id,
        userName: user.name || undefined,
        userEmail: user.email,
        userRole: user.role,
        sessionId,
        requestId
      },
      requestContext,
      { 
        remember,
        loginMethod: 'password'
      }
    );

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
    
    // Log error
    await auditService.logAuth(
      'login_failed',
      'error',
      { requestId },
      {
        method: request.method,
        path: '/api/auth/login',
        ip: request.headers.get('x-forwarded-for') || request.ip || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      },
      { 
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    );
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}