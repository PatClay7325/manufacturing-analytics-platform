import { NextRequest, NextResponse } from 'next/server';
import { sessionBridge } from '@/lib/auth/SessionBridge';
import { logger } from '@/lib/logger';

/**
 * Grafana authentication integration for middleware
 * Adds necessary headers for Grafana auth proxy
 */
export async function addGrafanaAuthHeaders(
  request: NextRequest,
  response: NextResponse,
  token: string | null
): Promise<NextResponse> {
  // Only process Grafana routes
  if (!request.nextUrl.pathname.startsWith('/grafana/')) {
    return response;
  }

  if (!token) {
    return response;
  }

  try {
    // Validate token and get session
    const session = await sessionBridge.validateToken(token);
    
    if (!session) {
      return response;
    }

    // Add Grafana auth proxy headers
    response.headers.set('X-WEBAUTH-USER', session.user.email);
    response.headers.set('X-WEBAUTH-EMAIL', session.user.email);
    response.headers.set('X-WEBAUTH-NAME', session.user.name);
    response.headers.set('X-WEBAUTH-GROUPS', session.user.groups.join(','));
    
    // Add internal auth headers for our services
    response.headers.set('X-Auth-User-Id', session.userId);
    response.headers.set('X-Auth-Session-Id', session.id);
    response.headers.set('X-Auth-User-Role', session.user.role);
    
    // If Grafana session exists, maintain it
    if (session.grafanaSessionId) {
      response.headers.set('X-Grafana-Session-Id', session.grafanaSessionId);
    }

    logger.debug(`Added Grafana auth headers for user ${session.user.email}`);
  } catch (error) {
    logger.error('Error adding Grafana auth headers:', error);
  }

  return response;
}

/**
 * Extract Grafana session from response and link it
 */
export async function extractAndLinkGrafanaSession(
  request: NextRequest,
  response: NextResponse,
  sessionId: string
): Promise<void> {
  try {
    // Check if this is a Grafana response with a session cookie
    const setCookieHeader = response.headers.get('set-cookie');
    if (!setCookieHeader) {
      return;
    }

    // Parse Grafana session cookie
    const grafanaSessionMatch = setCookieHeader.match(/grafana_session=([^;]+)/);
    if (grafanaSessionMatch && grafanaSessionMatch[1]) {
      const grafanaSessionId = grafanaSessionMatch[1];
      await sessionBridge.linkGrafanaSession(sessionId, grafanaSessionId);
      logger.info(`Linked Grafana session ${grafanaSessionId} to session ${sessionId}`);
    }
  } catch (error) {
    logger.error('Error extracting Grafana session:', error);
  }
}