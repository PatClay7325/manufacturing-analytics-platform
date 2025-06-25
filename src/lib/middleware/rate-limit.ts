import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Default configuration
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  message: 'Too many requests, please try again later.'
};

function getClientKey(request: NextRequest): string {
  // Use IP address and user agent for client identification
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `${ip}:${userAgent.substring(0, 50)}`;
}

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

export async function rateLimit(
  request: NextRequest,
  config: Partial<RateLimitConfig> = {}
): Promise<NextResponse | null> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const clientKey = getClientKey(request);
  const now = Date.now();
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to cleanup
    cleanupExpiredEntries();
  }
  
  let entry = rateLimitStore.get(clientKey);
  
  if (!entry) {
    // First request from this client
    entry = {
      count: 1,
      resetTime: now + finalConfig.windowMs
    };
    rateLimitStore.set(clientKey, entry);
    return null; // Allow request
  }
  
  if (now > entry.resetTime) {
    // Window has expired, reset
    entry.count = 1;
    entry.resetTime = now + finalConfig.windowMs;
    rateLimitStore.set(clientKey, entry);
    return null; // Allow request
  }
  
  if (entry.count >= finalConfig.maxRequests) {
    // Rate limit exceeded
    logger.warn('Rate limit exceeded', {
      clientKey: clientKey.split(':')[0], // Log only IP, not full key
      count: entry.count,
      maxRequests: finalConfig.maxRequests,
      path: request.nextUrl.pathname
    });
    
    const timeUntilReset = Math.ceil((entry.resetTime - now) / 1000);
    
    return NextResponse.json(
      { 
        error: finalConfig.message,
        retryAfter: timeUntilReset
      },
      { 
        status: 429,
        headers: {
          'Retry-After': timeUntilReset.toString(),
          'X-RateLimit-Limit': finalConfig.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': entry.resetTime.toString()
        }
      }
    );
  }
  
  // Increment counter
  entry.count++;
  rateLimitStore.set(clientKey, entry);
  
  return null; // Allow request
}

// Specific rate limit configurations for different endpoints
export const RATE_LIMIT_CONFIGS = {
  GRAFANA_PROXY: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute for Grafana proxy
    message: 'Too many Grafana requests, please slow down.'
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later.'
  },
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 API requests per minute
    message: 'Too many API requests, please try again later.'
  }
};

export function createRateLimiter(config: Partial<RateLimitConfig>) {
  return (request: NextRequest) => rateLimit(request, config);
}