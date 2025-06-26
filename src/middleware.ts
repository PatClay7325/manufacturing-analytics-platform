import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimitMiddleware, getRateLimiterForRoute, addRateLimitHeaders } from '@/lib/middleware/rateLimiter';
// import { auditLogService, AuditAction } from '@/services/auditLogService';

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/api/auth/login',
  '/api/auth/login-simple',
  '/api/auth/register',
  '/api/auth/reset-password',
  '/api/health',
  '/api/test-db-simple',
  '/api/quick-login',
  '/api/auth/test-login',
  '/api/chat/test',
  '/api/chat/test-simple',
  '/api/chat/conversational',
  '/api/chat/conversational-simple',
  '/api/test-simple',
  '/api/chat/intelligent',
  '/api/chat/true-intelligent',
  '/login',
  '/register',
  '/reset-password',
  '/privacy-policy',
  '/terms-of-service',
  '/cookie-policy',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Generate request ID for tracking
  const requestId = crypto.randomUUID();
  
  // Add request ID to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', requestId);
  
  // DEVELOPMENT AUTO-AUTH
  if (process.env.NODE_ENV === 'development') {
    // Add dev token to headers for API routes
    if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth')) {
      requestHeaders.set('x-dev-auth', 'true');
      requestHeaders.set('x-dev-user-id', 'dev-admin');
      requestHeaders.set('x-dev-user-role', 'admin');
    }
  }
  
  // Apply rate limiting for API routes
  if (pathname.startsWith('/api')) {
    const limiterType = getRateLimiterForRoute(pathname);
    const rateLimitResult = await rateLimitMiddleware(request, limiterType);
    
    if (rateLimitResult) {
      // Rate limit exceeded - log and return error
      try {
        // await auditLogService.logRequest(request, AuditAction.RATE_LIMIT_EXCEEDED, {
        //   resource: pathname,
        //   details: { limiterType },
        //   success: false,
        // });
      } catch (e) {
        // Don't block on audit log failures
        console.error('Failed to log rate limit violation:', e);
      }
      return rateLimitResult;
    }
  }

  // Allow public routes
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
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
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    
    // Add rate limit headers for API routes
    if (pathname.startsWith('/api')) {
      const limiterType = getRateLimiterForRoute(pathname);
      addRateLimitHeaders(response, request, limiterType);
    }
    
    return response;
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