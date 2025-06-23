import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/reset-password',
  '/api/health',
  '/api/manufacturing-metrics',
  '/api/quality-metrics',
  '/api/diagnostics',
  '/login',
  '/register',
  '/reset-password',
  '/privacy-policy',
  '/terms-of-service',
  '/cookie-policy',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Generate request ID for tracking
  const requestId = crypto.randomUUID();
  
  // Add request ID to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);

  // Allow public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Get authentication credentials
  const cookieToken = request.cookies.get('auth-token')?.value;
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

  // For Edge Runtime, we can't do full JWT verification here
  // Just check if token exists and has basic format
  // Full verification happens in API routes
  if (token && token.length > 10) {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Invalid token format
  if (!pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.json(
    { error: 'Invalid authentication token' },
    { status: 401 }
  );
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};