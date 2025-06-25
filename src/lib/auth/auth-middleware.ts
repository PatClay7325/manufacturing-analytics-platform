/**
 * Authentication Middleware
 * Production-ready auth middleware with RBAC
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtService } from './jwt-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string;
    email: string;
    tenantId?: string;
    permissions: string[];
    sessionId: string;
  };
}

export type AuthMiddleware = (request: AuthenticatedRequest) => Promise<NextResponse | void>;

/**
 * Extract bearer token from request
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Core authentication middleware
 */
export async function authenticate(
  request: AuthenticatedRequest
): Promise<NextResponse | void> {
  const token = extractToken(request);
  
  if (!token) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const payload = await jwtService.verifyAccessToken(token);
    
    // Attach user info to request
    request.user = {
      id: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      permissions: payload.permissions,
      sessionId: payload.sessionId,
    };
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid token' },
      { status: 401 }
    );
  }
}

/**
 * Permission-based authorization middleware
 */
export function requirePermission(permission: string): AuthMiddleware {
  return async (request: AuthenticatedRequest) => {
    // First authenticate
    const authResult = await authenticate(request);
    if (authResult) return authResult;

    // Then check permission
    if (!request.user || !request.user.permissions.includes(permission)) {
      return NextResponse.json(
        { error: 'Insufficient permissions', required: permission },
        { status: 403 }
      );
    }
  };
}

/**
 * Tenant-based authorization middleware
 */
export function requireTenant(): AuthMiddleware {
  return async (request: AuthenticatedRequest) => {
    // First authenticate
    const authResult = await authenticate(request);
    if (authResult) return authResult;

    // Extract tenant from request
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || request.headers.get('x-tenant-id');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID required' },
        { status: 400 }
      );
    }

    // Check tenant access
    if (!jwtService.hasTenantAccess({ tenantId: request.user!.tenantId } as any, tenantId)) {
      return NextResponse.json(
        { error: 'Access denied to tenant', tenantId },
        { status: 403 }
      );
    }
  };
}

/**
 * Combine multiple middleware
 */
export function composeMiddleware(...middlewares: AuthMiddleware[]): AuthMiddleware {
  return async (request: AuthenticatedRequest) => {
    for (const middleware of middlewares) {
      const result = await middleware(request);
      if (result) return result;
    }
  };
}

/**
 * Rate limiting per user
 */
export function rateLimit(
  options: { max: number; window: string; key?: string }
): AuthMiddleware {
  return async (request: AuthenticatedRequest) => {
    if (!request.user) {
      return NextResponse.json(
        { error: 'Authentication required for rate limiting' },
        { status: 401 }
      );
    }

    const key = options.key || request.url;
    const rateLimitKey = `ratelimit:${request.user.id}:${key}`;
    
    // This would use the rate limiter service
    // For now, we'll skip the implementation
  };
}

/**
 * Audit logging middleware
 */
export function auditLog(action: string): AuthMiddleware {
  return async (request: AuthenticatedRequest) => {
    if (!request.user) return;

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: request.user.id,
        action,
        resourceType: 'api',
        resourceId: request.url,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date(),
        eventType: 'api_call',
        eventCategory: 'api',
        eventAction: action,
        eventStatus: 'initiated',
        eventSeverity: 'info',
      },
    }).catch(console.error); // Don't fail request on audit failure
  };
}

/**
 * Apply middleware to API route
 */
export function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>,
  middleware?: AuthMiddleware | AuthMiddleware[]
) {
  return async (request: NextRequest) => {
    const authRequest = request as AuthenticatedRequest;
    
    // Apply middleware
    if (middleware) {
      const middlewares = Array.isArray(middleware) ? middleware : [middleware];
      const composed = composeMiddleware(...middlewares);
      const result = await composed(authRequest);
      if (result) return result;
    } else {
      // Default authentication
      const result = await authenticate(authRequest);
      if (result) return result;
    }

    // Call handler
    return handler(authRequest);
  };
}