// Simple in-memory rate limiter (use Redis in production)
import { RateLimitError } from './error-handler';

interface RateLimitStore {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitStore> = new Map();
  private cleanupInterval: NodeJS.Timeout;
  
  constructor(
    private windowMs: number = 15 * 60 * 1000, // 15 minutes
    private maxRequests: number = 100
  ) {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
  }
  
  async checkLimit(identifier: string): Promise<void> {
    const now = Date.now();
    const record = this.store.get(identifier);
    
    if (!record || now > record.resetTime) {
      // Create new window
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return;
    }
    
    if (record.count >= this.maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      throw new RateLimitError(retryAfter);
    }
    
    record.count++;
  }
  
  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
  
  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

// Rate limiter instances for different endpoints
const limiters = {
  api: new RateLimiter(15 * 60 * 1000, 100), // 100 requests per 15 min
  auth: new RateLimiter(15 * 60 * 1000, 5),   // 5 auth attempts per 15 min
  chat: new RateLimiter(60 * 1000, 20),       // 20 chat messages per minute
};

// Middleware factory
export function createRateLimitMiddleware(
  limiterType: keyof typeof limiters = 'api',
  identifierFn?: (req: Request) => string
) {
  return async function rateLimitMiddleware(req: Request): Promise<void> {
    const limiter = limiters[limiterType];
    
    // Default identifier is IP address or 'anonymous'
    const identifier = identifierFn?.(req) || 
      req.headers.get('x-forwarded-for')?.split(',')[0] || 
      req.headers.get('x-real-ip') ||
      'anonymous';
    
    await limiter.checkLimit(identifier);
  };
}

// Specific rate limiters for different use cases
export const apiRateLimit = createRateLimitMiddleware('api');
export const authRateLimit = createRateLimitMiddleware('auth');
export const chatRateLimit = createRateLimitMiddleware('chat');

// Helper to get rate limit headers
export function getRateLimitHeaders(
  limit: number,
  remaining: number,
  resetTime: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetTime.toString(),
    'X-RateLimit-Reset-After': Math.max(0, resetTime - Date.now()).toString()
  };
}