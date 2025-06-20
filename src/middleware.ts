import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-password',
  '/api/health',
  '/login',
  '/register',
  '/reset-password',
  '/privacy-policy',
  '/terms-of-service',
  '/cookie-policy',
];

// Routes that require specific permissions
const protectedRoutes: Record<string, string> = {
  '/api/users': 'view:users',
  '/api/users/create': 'manage:users',
  '/api/teams': 'view:team',
  '/api/settings': 'manage:settings',
  '/api/dashboards/create': 'create:dashboards',
  '/api/alerts/create': 'create:alerts',
  '/api/equipment/edit': 'edit:equipment',
  '/admin': 'view:admin',
  '/users': 'view:users',
  '/teams': 'view:team',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next();
  }

  // Get authentication credentials
  const cookieToken = request.cookies.get('access_token')?.value;
  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-api-key');
  
  // Check for API key
  const hasApiKey = apiKeyHeader || authHeader?.startsWith('Bearer mfg_');
  const apiKey = apiKeyHeader || (authHeader?.startsWith('Bearer mfg_') ? authHeader.substring(7) : null);
  
  // Check for JWT token
  const jwtToken = cookieToken || (authHeader?.startsWith('Bearer ') && !authHeader.startsWith('Bearer mfg_') ? authHeader.substring(7) : null);
  
  const token = apiKey || jwtToken;

  if (!token) {
    // Redirect to login for web requests
    if (!pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Return 401 for API requests
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Check route-specific permissions
    const requiredPermission = Object.entries(protectedRoutes).find(
      ([route]) => pathname.startsWith(route)
    )?.[1];

    if (requiredPermission) {
      // Check if user has required permission
      const hasPermission = checkUserPermission(decoded.role, requiredPermission);
      
      if (!hasPermission) {
        if (!pathname.startsWith('/api')) {
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    // Add user info to request headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId);
    requestHeaders.set('x-user-email', decoded.email);
    requestHeaders.set('x-user-role', decoded.role);
    requestHeaders.set('x-site-id', decoded.siteId || '');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Middleware auth error:', error);
    
    if (!pathname.startsWith('/api')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    return NextResponse.json(
      { error: 'Invalid authentication' },
      { status: 401 }
    );
  }
}

function checkUserPermission(userRole: string, requiredPermission: string): boolean {
  // Implementation of permission checking logic
  // This should match the logic in lib/auth.ts
  const rolePermissions: Record<string, string[]> = {
    admin: ['view:all', 'edit:all', 'delete:all', 'manage:users', 'manage:teams', 'manage:settings'],
    manager: ['view:all', 'edit:dashboards', 'edit:alerts', 'view:users', 'manage:team'],
    supervisor: ['view:dashboards', 'view:alerts', 'view:equipment', 'edit:alerts', 'view:team'],
    operator: ['view:dashboards', 'view:equipment', 'view:alerts'],
    technician: ['view:equipment', 'view:maintenance', 'edit:maintenance'],
    engineer: ['view:all', 'edit:equipment', 'edit:maintenance', 'create:dashboards'],
    quality_analyst: ['view:quality', 'edit:quality', 'view:dashboards'],
    viewer: ['view:dashboards', 'view:equipment', 'view:alerts'],
    user: ['view:dashboards', 'view:own'],
  };

  const userPermissions = rolePermissions[userRole] || [];
  return userPermissions.includes(requiredPermission) || userPermissions.includes('view:all');
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};