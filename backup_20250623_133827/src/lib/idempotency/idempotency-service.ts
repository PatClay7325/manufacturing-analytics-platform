/**
 * Idempotency Service
 * Production-ready request deduplication and idempotent operations
 */

import { Redis } from 'ioredis';
import crypto from 'crypto';
import { z } from 'zod';

interface IdempotencyRecord {
  key: string;
  requestHash: string;
  response?: any;
  status: 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  version: number;
  metadata?: Record<string, any>;
}

interface IdempotencyOptions {
  ttl?: number; // Time to live in seconds
  retryAfter?: number; // Seconds before allowing retry
  maxRetries?: number;
  includeHeaders?: string[]; // Headers to include in request hash
  version?: number; // API version for backwards compatibility
}

const DEFAULT_OPTIONS: Required<IdempotencyOptions> = {
  ttl: 86400, // 24 hours
  retryAfter: 60, // 1 minute
  maxRetries: 3,
  includeHeaders: ['content-type', 'x-api-version'],
  version: 1,
};

export class IdempotencyService {
  private static instance: IdempotencyService;
  private redis: Redis;
  private keyPrefix = 'idempotency:';

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_IDEMPOTENCY_DB || '5'),
      keyPrefix: this.keyPrefix,
    });
  }

  static getInstance(): IdempotencyService {
    if (!IdempotencyService.instance) {
      IdempotencyService.instance = new IdempotencyService();
    }
    return IdempotencyService.instance;
  }

  /**
   * Generate idempotency key from request
   */
  generateKey(
    method: string,
    path: string,
    userId: string,
    clientKey?: string
  ): string {
    if (clientKey) {
      // Use client-provided key with namespace
      return `${method}:${path}:${userId}:${clientKey}`;
    }
    
    // Generate key from request attributes
    const timestamp = Math.floor(Date.now() / 1000);
    const random = crypto.randomBytes(8).toString('hex');
    return `${method}:${path}:${userId}:${timestamp}:${random}`;
  }

  /**
   * Calculate request hash for comparison
   */
  calculateRequestHash(
    body: any,
    headers: Record<string, string>,
    includeHeaders: string[]
  ): string {
    const hashData = {
      body: this.normalizeBody(body),
      headers: this.extractHeaders(headers, includeHeaders),
    };
    
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  /**
   * Check if request is duplicate
   */
  async checkIdempotency(
    key: string,
    requestHash: string,
    options: IdempotencyOptions = {}
  ): Promise<{
    isDuplicate: boolean;
    record?: IdempotencyRecord;
    shouldRetry?: boolean;
  }> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const recordKey = this.getRecordKey(key);
    
    // Try to get existing record
    const existing = await this.redis.get(recordKey);
    if (!existing) {
      return { isDuplicate: false };
    }
    
    const record: IdempotencyRecord = JSON.parse(existing);
    
    // Check if request matches
    if (record.requestHash !== requestHash) {
      // Different request with same key
      throw new Error('Idempotency key conflict: different request body');
    }
    
    // Check version compatibility
    if (opts.version !== record.version) {
      throw new Error(`Version mismatch: expected ${opts.version}, got ${record.version}`);
    }
    
    // Check status
    switch (record.status) {
      case 'completed':
        return { isDuplicate: true, record };
      
      case 'failed':
        // Check if retry is allowed
        const failedAt = new Date(record.completedAt || record.createdAt);
        const secondsSinceFail = (Date.now() - failedAt.getTime()) / 1000;
        
        if (secondsSinceFail > opts.retryAfter && record.retryCount < opts.maxRetries) {
          return { isDuplicate: false, record, shouldRetry: true };
        }
        
        return { isDuplicate: true, record };
      
      case 'processing':
        // Check if request is stuck
        const processingTime = (Date.now() - new Date(record.createdAt).getTime()) / 1000;
        
        if (processingTime > opts.retryAfter * 10) {
          // Likely stuck, allow retry
          return { isDuplicate: false, record, shouldRetry: true };
        }
        
        return { isDuplicate: true, record };
      
      default:
        return { isDuplicate: false };
    }
  }

  /**
   * Start idempotent operation
   */
  async startOperation(
    key: string,
    requestHash: string,
    options: IdempotencyOptions = {}
  ): Promise<IdempotencyRecord> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const recordKey = this.getRecordKey(key);
    
    const record: IdempotencyRecord = {
      key,
      requestHash,
      status: 'processing',
      createdAt: new Date(),
      retryCount: 0,
      version: opts.version,
      metadata: options.metadata,
    };
    
    // Use SET NX to ensure atomicity
    const set = await this.redis.set(
      recordKey,
      JSON.stringify(record),
      'EX',
      opts.ttl,
      'NX'
    );
    
    if (!set) {
      // Key already exists, check for race condition
      const existing = await this.checkIdempotency(key, requestHash, options);
      if (existing.record) {
        return existing.record;
      }
      throw new Error('Failed to acquire idempotency lock');
    }
    
    return record;
  }

  /**
   * Complete idempotent operation
   */
  async completeOperation(
    key: string,
    response: any,
    options: IdempotencyOptions = {}
  ): Promise<void> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const recordKey = this.getRecordKey(key);
    
    const existing = await this.redis.get(recordKey);
    if (!existing) {
      throw new Error('Idempotency record not found');
    }
    
    const record: IdempotencyRecord = JSON.parse(existing);
    record.status = 'completed';
    record.completedAt = new Date();
    record.response = response;
    
    await this.redis.set(
      recordKey,
      JSON.stringify(record),
      'EX',
      opts.ttl
    );
  }

  /**
   * Fail idempotent operation
   */
  async failOperation(
    key: string,
    error: Error,
    options: IdempotencyOptions = {}
  ): Promise<void> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const recordKey = this.getRecordKey(key);
    
    const existing = await this.redis.get(recordKey);
    if (!existing) {
      throw new Error('Idempotency record not found');
    }
    
    const record: IdempotencyRecord = JSON.parse(existing);
    record.status = 'failed';
    record.completedAt = new Date();
    record.error = error.message;
    record.retryCount += 1;
    
    await this.redis.set(
      recordKey,
      JSON.stringify(record),
      'EX',
      opts.ttl
    );
  }

  /**
   * Get idempotency record
   */
  async getRecord(key: string): Promise<IdempotencyRecord | null> {
    const recordKey = this.getRecordKey(key);
    const data = await this.redis.get(recordKey);
    
    if (!data) return null;
    
    return JSON.parse(data);
  }

  /**
   * Delete idempotency record
   */
  async deleteRecord(key: string): Promise<boolean> {
    const recordKey = this.getRecordKey(key);
    const deleted = await this.redis.del(recordKey);
    return deleted > 0;
  }

  /**
   * Cleanup expired records
   */
  async cleanup(pattern?: string): Promise<number> {
    const searchPattern = pattern || '*';
    const keys = await this.redis.keys(searchPattern);
    
    let cleaned = 0;
    for (const key of keys) {
      // Redis handles TTL automatically, but we can force cleanup
      const ttl = await this.redis.ttl(key);
      if (ttl === -1) {
        // No TTL set, remove
        await this.redis.del(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * Get record key with prefix
   */
  private getRecordKey(key: string): string {
    // Key prefix is already added by Redis client
    return key;
  }

  /**
   * Normalize request body for hashing
   */
  private normalizeBody(body: any): any {
    if (!body) return null;
    
    // Sort object keys for consistent hashing
    if (typeof body === 'object' && !Array.isArray(body)) {
      const sorted: any = {};
      Object.keys(body).sort().forEach(key => {
        sorted[key] = this.normalizeBody(body[key]);
      });
      return sorted;
    }
    
    if (Array.isArray(body)) {
      return body.map(item => this.normalizeBody(item));
    }
    
    return body;
  }

  /**
   * Extract relevant headers
   */
  private extractHeaders(
    headers: Record<string, string>,
    includeHeaders: string[]
  ): Record<string, string> {
    const extracted: Record<string, string> = {};
    
    for (const header of includeHeaders) {
      const value = headers[header.toLowerCase()];
      if (value) {
        extracted[header] = value;
      }
    }
    
    return extracted;
  }
}

/**
 * Idempotency middleware for Next.js
 */
export function withIdempotency(
  handler: (req: Request, context: any) => Promise<Response>,
  options?: IdempotencyOptions
) {
  return async (req: Request, context: any) => {
    const idempotencyService = IdempotencyService.getInstance();
    
    // Extract idempotency key
    const idempotencyKey = req.headers.get('idempotency-key');
    if (!idempotencyKey) {
      // No idempotency key, proceed normally
      return handler(req, context);
    }
    
    // Get user context (assumes auth middleware has run)
    const userId = (req as any).user?.id || 'anonymous';
    
    // Generate full key
    const method = req.method;
    const path = new URL(req.url).pathname;
    const key = idempotencyService.generateKey(method, path, userId, idempotencyKey);
    
    // Calculate request hash
    const body = await req.clone().text();
    const headers = Object.fromEntries(req.headers.entries());
    const requestHash = idempotencyService.calculateRequestHash(
      body ? JSON.parse(body) : null,
      headers,
      options?.includeHeaders || DEFAULT_OPTIONS.includeHeaders
    );
    
    try {
      // Check for duplicate
      const check = await idempotencyService.checkIdempotency(key, requestHash, options);
      
      if (check.isDuplicate && check.record) {
        // Return cached response
        if (check.record.status === 'completed') {
          return new Response(
            JSON.stringify(check.record.response),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'X-Idempotent-Replayed': 'true',
                'X-Idempotency-Key': idempotencyKey,
              },
            }
          );
        }
        
        // Still processing
        if (check.record.status === 'processing') {
          return new Response(
            JSON.stringify({
              status: 'processing',
              message: 'Request is still being processed',
              retryAfter: options?.retryAfter || DEFAULT_OPTIONS.retryAfter,
            }),
            {
              status: 409,
              headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(options?.retryAfter || DEFAULT_OPTIONS.retryAfter),
                'X-Idempotency-Key': idempotencyKey,
              },
            }
          );
        }
        
        // Failed
        if (check.record.status === 'failed') {
          return new Response(
            JSON.stringify({
              error: check.record.error,
              retryCount: check.record.retryCount,
            }),
            {
              status: 500,
              headers: {
                'Content-Type': 'application/json',
                'X-Idempotent-Replayed': 'true',
                'X-Idempotency-Key': idempotencyKey,
              },
            }
          );
        }
      }
      
      // Start new operation
      await idempotencyService.startOperation(key, requestHash, options);
      
      try {
        // Execute handler
        const response = await handler(req, context);
        const responseBody = await response.clone().json();
        
        // Store successful response
        await idempotencyService.completeOperation(key, responseBody, options);
        
        // Add idempotency headers
        const headers = new Headers(response.headers);
        headers.set('X-Idempotency-Key', idempotencyKey);
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      } catch (error) {
        // Store failure
        await idempotencyService.failOperation(
          key,
          error as Error,
          options
        );
        throw error;
      }
    } catch (error) {
      // Idempotency check failed
      return new Response(
        JSON.stringify({
          error: 'Idempotency error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  };
}

// Export singleton
export const idempotencyService = IdempotencyService.getInstance();