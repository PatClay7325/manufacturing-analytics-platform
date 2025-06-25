/**
 * Development-Only Auto Authentication Middleware
 * WARNING: This bypasses all security - NEVER use in production!
 */

import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Development user that will be automatically logged in
const DEV_USER = {
  id: 'dev-user-123',
  email: 'dev@manufacturing.local',
  name: 'Development User',
  role: 'admin'
};

export function createDevAuthToken() {
  // Only in development
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Dev auth token can only be created in development mode');
  }

  // Simple base64 encoded token for dev (no JWT in Edge Runtime)
  const payload = JSON.stringify({
    userId: DEV_USER.id,
    email: DEV_USER.email,
    role: DEV_USER.role,
    exp: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
  });

  return btoa(payload);
}

export function injectDevAuth(request: NextRequest): NextResponse {
  // Only in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  
  // Check if user already has a token
  const existingToken = request.cookies.get('auth-token');
  if (!existingToken) {
    // Create and set dev token
    const devToken = createDevAuthToken();
    response.cookies.set('auth-token', devToken, {
      httpOnly: true,
      secure: false, // Not secure in dev
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    });
  }

  return response;
}

// Mock user data for development
export function getDevUser() {
  return DEV_USER;
}