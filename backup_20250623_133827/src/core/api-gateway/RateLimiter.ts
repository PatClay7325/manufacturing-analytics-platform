/**
 * Rate Limiter Implementation
 * 
 * This class implements the RateLimiter interface and provides
 * functionality for API rate limiting.
 */

import { AbstractBaseService } from './architecture/BaseService';
import { RateLimiter } from './interfaces';
import { ApiRequest } from './types';

/**
 * Rate limiter entry
 */
interface RateLimiterEntry {
  /**
   * Number of requests made in the current window
   */
  count: number;
  
  /**
   * Reset time for the window
   */
  reset: Date;
  
  /**
   * Rate limit
   */
  limit: number;
}

/**
 * Rate limiter implementation
 */
export class RateLimiterImpl extends AbstractBaseService implements RateLimiter {
  /**
   * Rate limit entries by client ID
   */
  private entries: Map<string, RateLimiterEntry> = new Map();
  
  /**
   * Default window size in milliseconds
   */
  private windowMs: number = 60000; // 1 minute
  
  /**
   * Default rate limit
   */
  private defaultLimit: number = 60; // 60 requests per minute
  
  /**
   * Create a new rate limiter
   */
  constructor() {
    super('RateLimiter', '1.0.0');
  }
  
  /**
   * Initialize the rate limiter
   */
  protected async doInitialize(): Promise<void> {
    // Get window size from environment
    if (process.env.RATE_LIMIT_WINDOW_MS) {
      this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10);
    }
    
    // Get default limit from environment
    if (process.env.RATE_LIMIT_DEFAULT) {
      this.defaultLimit = parseInt(process.env.RATE_LIMIT_DEFAULT, 10);
    }
    
    // Clear entries
    this.entries.clear();
    
    console.log('Rate limiter initialized');
  }
  
  /**
   * Start the rate limiter
   */
  protected async doStart(): Promise<void> {
    // Start cleanup task
    setInterval(() => this.cleanupExpiredEntries(), 60000); // Every minute
    
    console.log('Rate limiter started');
  }
  
  /**
   * Stop the rate limiter
   */
  protected async doStop(): Promise<void> {
    console.log('Rate limiter stopped');
  }
  
  /**
   * Check if a request exceeds the rate limit
   * @param req API request
   * @param limit Rate limit
   */
  public async checkLimit(req: ApiRequest, limit?: number): Promise<boolean> {
    // Get client ID from request
    const clientId = this.getClientId(req);
    
    // Get or create entry
    let entry = this.entries.get(clientId);
    
    // Use provided limit or default
    const rateLimit = limit || this.defaultLimit;
    
    // If no entry, create one
    if (!entry) {
      entry = this.createEntry(clientId, rateLimit);
    }
    
    // Check if window has expired
    if (entry.reset < new Date()) {
      // Reset entry
      entry = this.createEntry(clientId, rateLimit);
    }
    
    // Update entry
    entry.count++;
    
    // Check if limit exceeded
    return entry.count <= entry.limit;
  }
  
  /**
   * Reset rate limits for a client
   * @param clientId Client identifier
   */
  public async resetLimits(clientId: string): Promise<void> {
    this.entries.delete(clientId);
  }
  
  /**
   * Get current rate limit status for a client
   * @param clientId Client identifier
   */
  public async getLimitStatus(clientId: string): Promise<{
    remaining: number;
    reset: Date;
    limit: number;
  }> {
    // Get entry
    const entry = this.entries.get(clientId);
    
    // If no entry, return default
    if (!entry) {
      const reset = new Date();
      reset.setTime(reset.getTime() + this.windowMs);
      
      return {
        remaining: this.defaultLimit,
        reset,
        limit: this.defaultLimit,
      };
    }
    
    // Calculate remaining
    const remaining = Math.max(0, entry.limit - entry.count);
    
    return {
      remaining,
      reset: entry.reset,
      limit: entry.limit,
    };
  }
  
  /**
   * Get client ID from request
   * @param req API request
   */
  private getClientId(req: ApiRequest): string {
    // Use IP address as client ID if available
    if (req.ip) {
      return req.ip;
    }
    
    // Fallback to user ID if authenticated
    if (req.user && req.user.id) {
      return req.user.id;
    }
    
    // Last resort: use request ID
    return req.id;
  }
  
  /**
   * Create a new rate limiter entry
   * @param clientId Client identifier
   * @param limit Rate limit
   */
  private createEntry(clientId: string, limit: number): RateLimiterEntry {
    // Calculate reset time
    const reset = new Date();
    reset.setTime(reset.getTime() + this.windowMs);
    
    // Create entry
    const entry: RateLimiterEntry = {
      count: 0,
      reset,
      limit,
    };
    
    // Store entry
    this.entries.set(clientId, entry);
    
    return entry;
  }
  
  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = new Date();
    
    // Find expired entries
    const expiredIds: string[] = [];
    
    this.entries.forEach((entry, clientId) => {
      if (entry.reset < now) {
        expiredIds.push(clientId);
      }
    });
    
    // Remove expired entries
    expiredIds.forEach(clientId => {
      this.entries.delete(clientId);
    });
    
    if (expiredIds.length > 0) {
      console.log(`Cleaned up ${expiredIds.length} expired rate limit entries`);
    }
  }
}