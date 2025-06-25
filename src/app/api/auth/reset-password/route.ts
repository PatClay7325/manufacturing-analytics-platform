import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/database';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Force Node.js runtime
export const runtime = 'nodejs';

// POST /api/auth/reset-password - Reset password with token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = resetPasswordSchema.parse(body);
    const { token, password } = validatedData;
    
    // Hash the provided token to match stored version
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find the reset token in settings
    const resetTokens = await prisma.setting.findMany({
      where: {
        category: 'password_reset',
        key: {
          startsWith: 'reset_token_',
        },
      },
    });
    
    // Find matching token
    let validToken = null;
    let tokenData = null;
    
    for (const rt of resetTokens) {
      try {
        const data = JSON.parse(rt.value);
        if (data.token === hashedToken) {
          // Check if token is expired
          if (new Date(data.expiresAt) > new Date()) {
            validToken = rt;
            tokenData = data;
            break;
          }
        }
      } catch (e) {
        // Invalid token data, skip
      }
    }
    
    if (!validToken || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Update user password
    const user = await prisma.user.update({
      where: { id: tokenData.userId },
      data: { 
        passwordHash,
        updatedAt: new Date(),
      },
    });
    
    // Delete the used token
    await prisma.setting.delete({
      where: { id: validToken.id },
    });
    
    // Generate new auth token for immediate login
    const authToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Log audit event
    await prisma.auditLog.create({
      data: {
        id: `audit_${Date.now()}`,
        eventType: 'password.reset_completed',
        eventCategory: 'authentication',
        eventAction: 'reset_password',
        eventStatus: 'success',
        userId: user.id,
        userEmail: user.email,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date(),
        updatedAt: new Date(),
      },
    });
    
    // Map role to permissions
    const rolePermissions: Record<string, string[]> = {
      admin: ['admin', 'read', 'write', 'manage_users', 'manage_teams', 'manage_alerts', 'manage_datasources'],
      operator: ['read', 'write', 'manage_alerts'],
      analyst: ['read', 'write'],
      viewer: ['read'],
    };
    
    const response = NextResponse.json({
      message: 'Password reset successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: rolePermissions[user.role] || ['read'],
      },
    });
    
    // Set auth cookie for immediate login
    response.cookies.set('auth-token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
    });
    
    return response;
  } catch (error) {
    console.error('Reset password error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}