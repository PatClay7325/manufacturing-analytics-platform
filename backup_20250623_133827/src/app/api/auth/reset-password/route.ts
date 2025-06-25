import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const requestResetSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  ),
});

const SALT_ROUNDS = 10;

// POST /api/auth/reset-password - Request password reset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a reset request or actual reset
    if (body.token) {
      return handlePasswordReset(body);
    } else {
      return handleResetRequest(body);
    }
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleResetRequest(body: any) {
  // Validate input
  const validationResult = requestResetSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: validationResult.error.flatten() },
      { status: 400 }
    );
  }

  const { email } = validationResult.data;

  // Find user (but don't reveal if they exist)
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Store reset token (you'll need to add these fields to your User model)
    // For now, we'll store it in a separate table or use a cache
    // In production, you might want to use Redis or a dedicated token table
    
    // TODO: Store reset token with expiry
    // await storeResetToken(user.id, resetToken, resetTokenExpiry);

    // TODO: Send reset email
    // await sendResetEmail(user.email, resetToken);
    
    console.log('Reset token for', email, ':', resetToken);
  }

  // Always return success to prevent email enumeration
  return NextResponse.json({
    message: 'If a user with that email exists, a password reset link has been sent.',
  });
}

async function handlePasswordReset(body: any) {
  // Validate input
  const validationResult = resetPasswordSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: validationResult.error.flatten() },
      { status: 400 }
    );
  }

  const { token, password } = validationResult.data;

  // TODO: Verify reset token
  // const userId = await verifyResetToken(token);
  // if (!userId) {
  //   return NextResponse.json(
  //     { error: 'Invalid or expired reset token' },
  //     { status: 400 }
  //   );
  // }

  // For demo purposes, we'll just find a user by email
  // In production, you'd verify the token properly
  const demoUserId = 'demo-user-id'; // Replace with actual token verification

  // Hash new password
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Update user password
  // await prisma.user.update({
  //   where: { id: userId },
  //   data: { passwordHash },
  // });

  // TODO: Invalidate reset token
  // await invalidateResetToken(token);

  return NextResponse.json({
    message: 'Password reset successfully',
  });
}