import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }
  
  const mockUser = {
    id: 'dev-admin',
    email: 'admin@manufacturing.com',
    name: 'Development Admin',
    role: 'admin',
    permissions: ['admin', 'read', 'write', 'manage_users', 'manage_teams', 'manage_alerts', 'manage_datasources']
  };
  
  // Generate token
  const token = jwt.sign(
    { 
      userId: mockUser.id, 
      email: mockUser.email, 
      role: mockUser.role,
      name: mockUser.name 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  // Create response
  const response = NextResponse.json({
    user: mockUser,
    token,
    message: '🎉 Development auto-login successful!'
  });
  
  // Set cookie
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 604800 // 7 days
  });
  
  return response;
}