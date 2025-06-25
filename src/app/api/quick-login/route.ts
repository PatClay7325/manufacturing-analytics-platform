import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;
    
    // Generate a quick demo token
    const token = jwt.sign(
      { 
        userId: 'user1', 
        email: email || 'admin@example.com',
        role: 'admin',
        name: 'Demo User'
      },
      'your-secret-key',
      { expiresIn: '24h' }
    );

    const response = NextResponse.json({
      user: {
        id: 'user1',
        email: email || 'admin@example.com',
        name: 'Demo User',
        role: 'admin',
        permissions: ['admin', 'read', 'write', 'manage_users', 'manage_teams', 'manage_alerts', 'manage_datasources']
      },
      token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    // Set HTTP-only cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Quick login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Quick login endpoint ready' });
}