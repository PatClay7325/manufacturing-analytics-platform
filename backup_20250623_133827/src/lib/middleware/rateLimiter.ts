/**
 * Rate Limiting Middleware
 * Implements Phase 1.5: Security - Rate limiting (100 req/min)
 */

import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';

// Rate limiter configuration
interface RateLimiterConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max unique tokens per interval
  maxRequests: number; // Max requests per token per interval
}

// Default: 100 requests per minute
const DEFAULT_CONFIG: RateLimiterConfig = {
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Max 500 unique IPs/tokens
  maxRequests: 100, // 100 requests per minute
};

// Create rate limiter instance
export function createRateLimiter(config: Partial<RateLimiterConfig> = {}) {
  const options = { ...DEFAULT_CONFIG, ...config };
  
  const tokenCache = new LRUCache<string, number[]>({
    max: options.uniqueTokenPerInterval,
    ttl: options.interval,
  });

  return {
    check: (token: string): { success: boolean; limit: number; remaining: number; reset: number } => {
      const now = Date.now();
      const tokenRequests = tokenCache.get(token) || [];
      
      // Remove old requests outside the interval window
      const validRequests = tokenRequests.filter(
        (timestamp) => now - timestamp < options.interval
      );

      if (validRequests.length >= options.maxRequests) {
        // Rate limit exceeded
        return {
          success: false,
          limit: options.maxRequests,
          remaining: 0,
          reset: Math.min(...validRequests) + options.interval,
        };
      }

      // Add current request
      validRequests.push(now);
      tokenCache.set(token, validRequests);

      return {
        success: true,
        limit: options.maxRequests,
        remaining: options.maxRequests - validRequests.length,
        reset: now + options.interval,
      };
    },
  };
}

// Singleton rate limiter instances for different endpoints
const rateLimiters = {
  api: createRateLimiter(), // Default 100/min
  auth: createRateLimiter({ maxRequests: 10 }), // Stricter for auth
  metrics: createRateLimiter({ maxRequests: 200 }), // Higher for metrics
  websocket: createRateLimiter({ maxRequests: 1000 }), // Much higher for WebSocket
};

// Get client identifier (IP or user ID)
export function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from JWT token first (if authenticated)
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    try {
      // Extract user ID from JWT (simplified - in production, verify the token)
      const token = authHeader.replace('Bearer ', '');
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.userId) {
        return `user:${payload.userId}`;
      }
    } catch (e) {
      // Invalid token, fall back to IP
    }
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  return `ip:${ip}`;
}

// Rate limit middleware
export async function rateLimitMiddleware(
  request: NextRequest,
  limiterType: keyof typeof rateLimiters = 'api'
): Promise<NextResponse | null> {
  const limiter = rateLimiters[limiterType];
  const identifier = getClientIdentifier(request);
  const result = limiter.check(identifier);

  // Add rate limit headers
  const headers = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.reset).toISOString(),
  };

  if (!result.success) {
    // Rate limit exceeded
    return NextResponse.json(
      { 
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Please retry after ${new Date(result.reset).toISOString()}`,
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      },
      { 
        status: 429,
        headers: {
          ...headers,
          'Retry-After': Math.ceil((result.reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // Rate limit not exceeded - return null to continue
  // The calling function should add these headers to the response
  return null;
}

// Helper to add rate limit headers to a response
export function addRateLimitHeaders(
  response: NextResponse,
  request: NextRequest,
  limiterType: keyof typeof rateLimiters = 'api'
): NextResponse {
  const limiter = rateLimiters[limiterType];
  const identifier = getClientIdentifier(request);
  const result = limiter.check(identifier);

  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', Math.max(0, result.remaining - 1).toString());
  response.headers.set('X-RateLimit-Reset', new Date(result.reset).toISOString());

  return response;
}

// Rate limiter for specific routes
export const routeRateLimiters = {
  '/api/auth/login': 'auth',
  '/api/auth/register': 'auth',
  '/api/auth/reset-password': 'auth',
  '/api/metrics': 'metrics',
  '/api/ws': 'websocket',
} as const;

// Get appropriate rate limiter for a route
export function getRateLimiterForRoute(pathname: string): keyof typeof rateLimiters {
  for (const [route, limiterType] of Object.entries(routeRateLimiters)) {
    if (pathname.startsWith(route)) {
      return limiterType as keyof typeof rateLimiters;
    }
  }
  return 'api'; // Default
}