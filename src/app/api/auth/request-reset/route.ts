import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/database';
import { z } from 'zod';

// Force Node.js runtime
export const runtime = 'nodejs';

// Request schema
const RequestResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    const validatedData = RequestResetSchema.parse(body);
    const email = validatedData.email.toLowerCase();

    // Find user (but don't reveal if they exist)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token in Setting table (temporary solution)
      const tokenKey = `reset_token_${user.id}`;
      
      // Delete any existing token
      await prisma.setting.deleteMany({
        where: { 
          key: tokenKey,
          category: 'password_reset',
        },
      });

      // Create new token
      await prisma.setting.create({
        data: {
          id: `setting_${Date.now()}`,
          key: tokenKey,
          value: JSON.stringify({
            token: hashedToken,
            userId: user.id,
            email: user.email,
            expiresAt: resetTokenExpiry.toISOString(),
          }),
          category: 'password_reset',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          id: `audit_${Date.now()}`,
          eventType: 'password.reset_requested',
          eventCategory: 'authentication',
          eventAction: 'request_reset',
          eventStatus: 'success',
          userId: user.id,
          userEmail: user.email,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          timestamp: new Date(),
          updatedAt: new Date(),
        },
      });

      // In production, send email with reset link
      // For development, log the token
      if (process.env.NODE_ENV === 'development') {
        console.log('Password reset token for', email, ':', resetToken);
        console.log('Reset link:', `http://localhost:3000/reset-password?token=${resetToken}`);
      } else {
        // TODO: Send email with reset link
        // await sendPasswordResetEmail(user.email, resetToken);
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      message: 'If a user with that email exists, a password reset link has been sent.',
      success: true,
    });
  } catch (error) {
    console.error('Request reset error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}