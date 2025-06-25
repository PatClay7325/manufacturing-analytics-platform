import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { recordMetric } from '@/lib/observability/tracing';

// In-memory rate limit store (in production, use Redis)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configuration
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
}

/**
 * Default key generator using IP address and user ID
 */
function defaultKeyGenerator(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  
  // Try to extract user ID from auth header or session
  const authHeader = req.headers.get('authorization');
  const userId = authHeader ? `user:${authHeader.substring(0, 10)}` : 'anonymous';
  
  return `${ip}:${userId}`;
}

/**
 * Rate limiter middleware factory
 */
export function createRateLimiter(config?: Partial<RateLimitConfig>) {
  const finalConfig: RateLimitConfig = {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    keyGenerator: defaultKeyGenerator,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    message: 'Too many requests, please try again later',
    ...config,
  };

  return async function rateLimiter(
    req: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const key = finalConfig.keyGenerator!(req);
    const now = Date.now();
    
    // Clean up expired entries periodically
    if (Math.random() < 0.01) { // 1% chance
      cleanupExpiredEntries(now);
    }

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetAt <= now) {
      entry = {
        count: 0,
        resetAt: now + finalConfig.windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    // Check if limit exceeded
    if (entry.count >= finalConfig.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      
      logger.warn({
        key,
        count: entry.count,
        limit: finalConfig.maxRequests,
        retryAfter,
      }, 'Rate limit exceeded');

      recordMetric('rate_limit_exceeded', 1, 'count', { key });

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: finalConfig.message,
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': finalConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetAt).toISOString(),
          },
        }
      );
    }

    // Increment counter
    entry.count++;

    // Process request
    const response = await next();

    // Skip counting based on response status
    if (
      (finalConfig.skipSuccessfulRequests && response.status < 400) ||
      (finalConfig.skipFailedRequests && response.status >= 400)
    ) {
      entry.count--;
    }

    // Add rate limit headers
    const remaining = Math.max(0, finalConfig.maxRequests - entry.count);
    response.headers.set('X-RateLimit-Limit', finalConfig.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(entry.resetAt).toISOString());

    return response;
  };
}

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(now: number): void {
  let cleaned = 0;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.debug({ cleaned }, 'Cleaned up expired rate limit entries');
  }
}

/**
 * Rate limiter for API routes
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100, // 100 requests per minute
});

/**
 * Stricter rate limiter for auth endpoints
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 900000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again later',
});

/**
 * Rate limiter for AI/embedding endpoints
 */
export const aiRateLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 20, // 20 requests per minute
  message: 'AI service rate limit exceeded, please slow down',
});

/**
 * Get current rate limit status for a key
 */
export function getRateLimitStatus(key: string): {
  count: number;
  remaining: number;
  resetAt: Date;
} | null {
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.resetAt <= Date.now()) {
    return null;
  }

  return {
    count: entry.count,
    remaining: Math.max(0, env.RATE_LIMIT_MAX_REQUESTS - entry.count),
    resetAt: new Date(entry.resetAt),
  };
}

/**
 * Reset rate limit for a specific key
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
  logger.info({ key }, 'Rate limit reset');
}