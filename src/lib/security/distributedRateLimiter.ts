import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis/redisClient';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { recordMetric } from '@/lib/observability/metrics';
import crypto from 'crypto';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

/**
 * Generate rate limit key with proper hashing for privacy
 */
function defaultKeyGenerator(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  
  // Extract user ID from auth header or session
  const authHeader = req.headers.get('authorization');
  const userId = authHeader 
    ? crypto.createHash('sha256').update(authHeader).digest('hex').substring(0, 16)
    : 'anonymous';
  
  // Create a hashed key for privacy
  const rawKey = `${ip}:${userId}:${req.nextUrl.pathname}`;
  return `ratelimit:${crypto.createHash('sha256').update(rawKey).digest('hex')}`;
}

/**
 * Distributed rate limiter using Redis with sliding window
 */
export function createDistributedRateLimiter(config?: Partial<RateLimitConfig>) {
  const finalConfig: RateLimitConfig = {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    keyGenerator: defaultKeyGenerator,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: true,
    ...config,
  };

  return async function rateLimiter(
    req: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const redis = getRedisClient();
    const key = finalConfig.keyGenerator!(req);
    const now = Date.now();
    const windowStart = now - finalConfig.windowMs;

    try {
      // Use Redis sorted set for sliding window
      const pipe = redis.pipeline();
      
      // Remove old entries outside the window
      pipe.zremrangebyscore(key, '-inf', windowStart);
      
      // Count requests in current window
      pipe.zcard(key);
      
      // Add current request with timestamp as score
      const requestId = `${now}:${crypto.randomBytes(4).toString('hex')}`;
      pipe.zadd(key, now, requestId);
      
      // Set expiry on the key
      pipe.expire(key, Math.ceil(finalConfig.windowMs / 1000));
      
      const results = await pipe.exec();
      
      if (!results) {
        throw new Error('Redis pipeline execution failed');
      }

      // Extract count from pipeline results
      const count = (results[1][1] as number) || 0;

      // Check if limit exceeded
      if (count >= finalConfig.maxRequests) {
        const oldestRequest = await redis.zrange(key, 0, 0, 'WITHSCORES');
        const oldestTimestamp = oldestRequest[1] ? parseInt(oldestRequest[1]) : now;
        const resetTime = oldestTimestamp + finalConfig.windowMs;
        const retryAfter = Math.ceil((resetTime - now) / 1000);

        recordMetric('rate_limit_exceeded', 1, {
          path: req.nextUrl.pathname,
          method: req.method,
        });

        logger.warn({
          key: key.substring(0, 20) + '...',
          count,
          limit: finalConfig.maxRequests,
          retryAfter,
          path: req.nextUrl.pathname,
        }, 'Rate limit exceeded');

        const response = NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: finalConfig.message,
            retryAfter,
          },
          {
            status: 429,
          }
        );

        // Add rate limit headers
        if (finalConfig.standardHeaders) {
          response.headers.set('RateLimit-Policy', `${finalConfig.maxRequests};w=${finalConfig.windowMs / 1000}`);
          response.headers.set('RateLimit-Limit', finalConfig.maxRequests.toString());
          response.headers.set('RateLimit-Remaining', '0');
          response.headers.set('RateLimit-Reset', new Date(resetTime).toISOString());
        }

        if (finalConfig.legacyHeaders) {
          response.headers.set('Retry-After', retryAfter.toString());
          response.headers.set('X-RateLimit-Limit', finalConfig.maxRequests.toString());
          response.headers.set('X-RateLimit-Remaining', '0');
          response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
        }

        return response;
      }

      // Process request
      const response = await next();

      // Optionally remove the request from the window based on response
      if (
        (finalConfig.skipSuccessfulRequests && response.status < 400) ||
        (finalConfig.skipFailedRequests && response.status >= 400)
      ) {
        await redis.zrem(key, requestId);
      }

      // Add rate limit headers to successful responses
      const remaining = Math.max(0, finalConfig.maxRequests - count - 1);
      const resetTime = now + finalConfig.windowMs;

      if (finalConfig.standardHeaders) {
        response.headers.set('RateLimit-Policy', `${finalConfig.maxRequests};w=${finalConfig.windowMs / 1000}`);
        response.headers.set('RateLimit-Limit', finalConfig.maxRequests.toString());
        response.headers.set('RateLimit-Remaining', remaining.toString());
        response.headers.set('RateLimit-Reset', new Date(resetTime).toISOString());
      }

      if (finalConfig.legacyHeaders) {
        response.headers.set('X-RateLimit-Limit', finalConfig.maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', remaining.toString());
        response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
      }

      return response;
    } catch (error) {
      logger.error({ error, key }, 'Rate limiter error');
      
      // Fail open - allow request if Redis is down
      recordMetric('rate_limit_error', 1, {
        path: req.nextUrl.pathname,
      });
      
      return next();
    }
  };
}

/**
 * Distributed rate limiter presets
 */
export const apiRateLimiter = createDistributedRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100,
});

export const authRateLimiter = createDistributedRateLimiter({
  windowMs: 900000, // 15 minutes
  maxRequests: 5,
  message: 'Too many authentication attempts',
});

export const aiRateLimiter = createDistributedRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 20,
  message: 'AI service rate limit exceeded',
});

export const uploadRateLimiter = createDistributedRateLimiter({
  windowMs: 3600000, // 1 hour
  maxRequests: 10,
  message: 'Upload rate limit exceeded',
});

/**
 * Get current rate limit status from Redis
 */
export async function getRateLimitStatus(key: string): Promise<{
  count: number;
  remaining: number;
  resetAt: Date;
} | null> {
  const redis = getRedisClient();
  const now = Date.now();
  const windowStart = now - env.RATE_LIMIT_WINDOW_MS;

  try {
    // Clean old entries and get count
    await redis.zremrangebyscore(key, '-inf', windowStart);
    const count = await redis.zcard(key);
    
    if (count === 0) {
      return null;
    }

    const remaining = Math.max(0, env.RATE_LIMIT_MAX_REQUESTS - count);
    const oldestRequest = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const oldestTimestamp = oldestRequest[1] ? parseInt(oldestRequest[1]) : now;
    const resetAt = new Date(oldestTimestamp + env.RATE_LIMIT_WINDOW_MS);

    return {
      count,
      remaining,
      resetAt,
    };
  } catch (error) {
    logger.error({ error, key }, 'Failed to get rate limit status');
    return null;
  }
}

/**
 * Reset rate limit for a specific key
 */
export async function resetRateLimit(key: string): Promise<void> {
  const redis = getRedisClient();
  
  try {
    await redis.del(key);
    logger.info({ key }, 'Rate limit reset');
  } catch (error) {
    logger.error({ error, key }, 'Failed to reset rate limit');
  }
}