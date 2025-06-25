/**
 * Authentication Middleware - Request authentication and authorization
 * Protects API routes and validates permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { authService, Permission, User } from './AuthService';

export interface AuthenticatedRequest extends NextRequest {
  user?: User;
}

export interface AuthMiddlewareOptions {
  permissions?: Permission[];
  requireAllPermissions?: boolean;
  allowAnonymous?: boolean;
  skipAuth?: boolean;
}

/**
 * Middleware to authenticate and authorize requests
 */
export async function requireAuth(
  request: NextRequest,
  requiredPermissions?: Permission | Permission[],
  options: AuthMiddlewareOptions = {}
): Promise<{
  authenticated: boolean;
  user?: User;
  error?: string;
}> {
  const {
    requireAllPermissions = false,
    allowAnonymous = false,
    skipAuth = false
  } = options;

  // Skip authentication if configured
  if (skipAuth || allowAnonymous) {
    return { authenticated: true };
  }

  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return {
        authenticated: false,
        error: 'Authorization header missing'
      };
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return {
        authenticated: false,
        error: 'Invalid authorization format. Use: Bearer <token>'
      };
    }

    // Verify token and get user
    const user = await authService.verifyAccessToken(token);
    
    // Check permissions if required
    if (requiredPermissions) {
      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
      
      const hasPermission = requireAllPermissions
        ? authService.hasAllPermissions(user, permissions)
        : authService.hasAnyPermission(user, permissions);

      if (!hasPermission) {
        return {
          authenticated: false,
          error: 'Insufficient permissions'
        };
      }
    }

    return {
      authenticated: true,
      user
    };
  } catch (error) {
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : 'Authentication failed'
    };
  }
}

/**
 * Create authentication middleware for API routes
 */
export function createAuthMiddleware(
  requiredPermissions?: Permission | Permission[],
  options: AuthMiddlewareOptions = {}
) {
  return async (
    request: NextRequest,
    handler: (req: AuthenticatedRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const authResult = await requireAuth(request, requiredPermissions, options);
    
    if (!authResult.authenticated) {
      return NextResponse.json(
        { 
          error: authResult.error || 'Unauthorized',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    // Add user to request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = authResult.user;

    return handler(authenticatedRequest);
  };
}

/**
 * Rate limiting middleware
 */
interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (request: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
}

class RateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>();

  constructor(private options: RateLimitOptions) {}

  isAllowed(key: string): { allowed: boolean; resetTime: number; remaining: number } {
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      // New window
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.options.windowMs
      });
      
      return {
        allowed: true,
        resetTime: now + this.options.windowMs,
        remaining: this.options.max - 1
      };
    }

    // Existing window
    if (record.count >= this.options.max) {
      return {
        allowed: false,
        resetTime: record.resetTime,
        remaining: 0
      };
    }

    record.count++;
    return {
      allowed: true,
      resetTime: record.resetTime,
      remaining: this.options.max - record.count
    };
  }

  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Rate limiters for different endpoints
const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  keyGenerator: (req) => req.ip || 'unknown'
});

const apiLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  keyGenerator: (req) => req.ip || 'unknown'
});

// Cleanup old entries every 5 minutes
setInterval(() => {
  authLimiter.cleanup();
  apiLimiter.cleanup();
}, 5 * 60 * 1000);

export function createRateLimitMiddleware(limiter: RateLimiter) {
  return (request: NextRequest): NextResponse | null => {
    const key = request.ip || 'unknown';
    const result = limiter.isAllowed(key);

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          code: 'RATE_LIMIT_EXCEEDED',
          resetTime: result.resetTime
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limiter['options'].max.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString()
          }
        }
      );
    }

    return null; // Allow request to continue
  };
}

// Export rate limiters
export const authRateLimit = createRateLimitMiddleware(authLimiter);
export const apiRateLimit = createRateLimitMiddleware(apiLimiter);

/**
 * CORS middleware for API security
 */
export function createCORSMiddleware(options: {
  origin?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
  credentials?: boolean;
} = {}) {
  const {
    origin = process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    credentials = true
  } = options;

  return (request: NextRequest): NextResponse | null => {
    const response = NextResponse.next();
    
    // Set CORS headers
    if (Array.isArray(origin)) {
      const requestOrigin = request.headers.get('origin');
      if (requestOrigin && origin.includes(requestOrigin)) {
        response.headers.set('Access-Control-Allow-Origin', requestOrigin);
      }
    } else {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
    
    response.headers.set('Access-Control-Allow-Methods', methods.join(', '));
    response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    
    if (credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }

    return null; // Continue with request
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders(request: NextRequest): NextResponse | null {
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), location=()');
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return null; // Continue with request
}

/**
 * Input sanitization middleware
 */
export function sanitizeInput(data: any): any {
  if (typeof data === 'string') {
    // Remove potentially dangerous characters
    return data
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Complete script tags
      .replace(/<script\b[^>]*>/gi, '') // Opening script tags
      .replace(/<\/script>/gi, '') // Closing script tags
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeInput);
  }
  
  if (typeof data === 'object' && data !== null) {
    // Preserve special object types
    if (data instanceof Date || data instanceof RegExp) {
      return data;
    }
    
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[sanitizeInput(key)] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return data;
}

export default {
  requireAuth,
  createAuthMiddleware,
  createRateLimitMiddleware,
  createCORSMiddleware,
  securityHeaders,
  sanitizeInput,
  authRateLimit,
  apiRateLimit
};