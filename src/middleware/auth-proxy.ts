import { NextRequest, NextResponse } from 'next/server';
import { sessionBridge } from '@/lib/auth/SessionBridge';
import { logger } from '@/lib/logger';

/**
 * Authentication middleware for Grafana proxy integration
 * Validates sessions and adds appropriate headers for Grafana auth proxy
 */
export async function authProxyMiddleware(request: NextRequest) {
  const response = NextResponse.next();

  // Skip auth for public paths
  const publicPaths = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/health'];
  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return response;
  }

  try {
    // Extract token from various sources
    const token = extractToken(request);
    
    if (!token) {
      // No token found, check if this is a Grafana request that requires auth
      if (request.nextUrl.pathname.startsWith('/grafana/')) {
        return redirectToLogin(request);
      }
      return response;
    }

    // Validate token and get session
    const session = await sessionBridge.validateToken(token);
    
    if (!session) {
      // Invalid or expired token
      if (request.nextUrl.pathname.startsWith('/grafana/')) {
        return redirectToLogin(request);
      }
      
      // Clear invalid auth cookies
      response.cookies.delete('auth-token');
      response.cookies.delete('grafana_session');
      
      return response;
    }

    // Add auth headers for downstream services
    response.headers.set('X-Auth-User-Id', session.userId);
    response.headers.set('X-Auth-User-Email', session.user.email);
    response.headers.set('X-Auth-User-Name', session.user.name);
    response.headers.set('X-Auth-User-Role', session.user.role);
    response.headers.set('X-Auth-User-Groups', session.user.groups.join(','));
    response.headers.set('X-Auth-Session-Id', session.id);

    // For Grafana requests, add auth proxy headers
    if (request.nextUrl.pathname.startsWith('/grafana/')) {
      response.headers.set('X-WEBAUTH-USER', session.user.email);
      response.headers.set('X-WEBAUTH-EMAIL', session.user.email);
      response.headers.set('X-WEBAUTH-NAME', session.user.name);
      response.headers.set('X-WEBAUTH-GROUPS', session.user.groups.join(','));
      
      // If Grafana session exists, maintain it
      if (session.grafanaSessionId) {
        response.headers.set('X-Grafana-Session-Id', session.grafanaSessionId);
      }
    }

    // Refresh session if needed (within last 25% of TTL)
    const sessionAge = Date.now() - new Date(session.lastAccessedAt).getTime();
    const sessionTTL = new Date(session.expiresAt).getTime() - new Date(session.createdAt).getTime();
    
    if (sessionAge > sessionTTL * 0.75) {
      await sessionBridge.refreshSession(session.id);
      
      // Generate new token with extended expiration
      const { token: newToken } = await sessionBridge.createSession(session.user);
      response.cookies.set('auth-token', newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400, // 24 hours
        path: '/',
      });
    }

    return response;
  } catch (error) {
    logger.error('Auth proxy middleware error:', error);
    return response;
  }
}

/**
 * Extract authentication token from request
 */
function extractToken(request: NextRequest): string | null {
  // 1. Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. Check cookie
  const cookieToken = request.cookies.get('auth-token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  // 3. Check query parameter (for special cases like dashboard embedding)
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  if (queryToken) {
    return queryToken;
  }

  return null;
}

/**
 * Redirect to login page
 */
function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('callbackUrl', request.url);
  
  return NextResponse.redirect(loginUrl, {
    status: 302,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

/**
 * Auth validation endpoint handler
 * Used by Nginx auth_request directive
 */
export async function authValidationHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const token = extractToken(request);
    
    if (!token) {
      return new NextResponse(null, { status: 401 });
    }

    const session = await sessionBridge.validateToken(token);
    
    if (!session) {
      return new NextResponse(null, { status: 401 });
    }

    // Return success with auth headers
    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Auth-User': session.user.email,
        'X-Auth-Email': session.user.email,
        'X-Auth-Name': session.user.name,
        'X-Auth-Groups': session.user.groups.join(','),
        'X-Auth-User-Id': session.userId,
        'X-Auth-Session-Id': session.id,
      },
    });
  } catch (error) {
    logger.error('Auth validation error:', error);
    return new NextResponse(null, { status: 500 });
  }
}

/**
 * Sync Grafana session with our session
 */
export async function syncGrafanaSession(
  sessionId: string,
  grafanaSessionId: string
): Promise<void> {
  try {
    await sessionBridge.linkGrafanaSession(sessionId, grafanaSessionId);
    logger.info(`Linked Grafana session ${grafanaSessionId} to session ${sessionId}`);
  } catch (error) {
    logger.error('Error syncing Grafana session:', error);
  }
}