import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { Redis } from 'ioredis';
import { z } from 'zod';

/**
 * Security Configuration
 */
const securityConfig = {
  jwt: {
    secret: new TextEncoder().encode(process.env.JWT_SECRET || 'manufacturing-secret-key'),
    issuer: 'manufacturing-analytics-platform',
    audience: 'manufacturing-users',
    algorithm: 'HS256' as const,
    expiresIn: '24h',
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  },
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  },
};

/**
 * Encryption Service for PII and sensitive data
 */
export class EncryptionService {
  private masterKey: Buffer;
  
  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    this.masterKey = Buffer.from(key, 'hex');
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(securityConfig.encryption.ivLength);
    const cipher = crypto.createCipher(securityConfig.encryption.algorithm, this.masterKey);
    cipher.setAAD(Buffer.from('manufacturing-analytics', 'utf8'));
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine iv + tag + encrypted data
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipher(securityConfig.encryption.algorithm, this.masterKey);
    decipher.setAAD(Buffer.from('manufacturing-analytics', 'utf8'));
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Hash password
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}

/**
 * JWT Service for authentication
 */
export class JWTService {
  /**
   * Create JWT token
   */
  static async createToken(payload: {
    userId: string;
    username: string;
    roles: string[];
    permissions: string[];
  }): Promise<string> {
    return new SignJWT(payload)
      .setProtectedHeader({ alg: securityConfig.jwt.algorithm })
      .setIssuer(securityConfig.jwt.issuer)
      .setAudience(securityConfig.jwt.audience)
      .setIssuedAt()
      .setExpirationTime(securityConfig.jwt.expiresIn)
      .sign(securityConfig.jwt.secret);
  }

  /**
   * Verify JWT token
   */
  static async verifyToken(token: string): Promise<{
    userId: string;
    username: string;
    roles: string[];
    permissions: string[];
  }> {
    try {
      const { payload } = await jwtVerify(token, securityConfig.jwt.secret, {
        issuer: securityConfig.jwt.issuer,
        audience: securityConfig.jwt.audience,
      });

      return payload as any;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Extract token from request
   */
  static extractToken(request: NextRequest): string | null {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    
    // Fallback to cookie
    return request.cookies.get('auth-token')?.value || null;
  }
}

/**
 * Rate Limiting Service
 */
export class RateLimitService {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  /**
   * Check rate limit for IP
   */
  async checkRateLimit(
    identifier: string,
    windowMs: number = securityConfig.rateLimit.windowMs,
    maxRequests: number = securityConfig.rateLimit.max
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const windowKey = `${key}:${window}`;

    try {
      const current = await this.redis.incr(windowKey);
      
      if (current === 1) {
        await this.redis.expire(windowKey, Math.ceil(windowMs / 1000));
      }

      const remaining = Math.max(0, maxRequests - current);
      const resetTime = (window + 1) * windowMs;

      return {
        allowed: current <= maxRequests,
        remaining,
        resetTime,
      };
    } catch (error) {
      console.error('[RateLimit] Redis error:', error);
      // On Redis failure, allow the request (fail open)
      return {
        allowed: true,
        remaining: maxRequests,
        resetTime: now + windowMs,
      };
    }
  }

  /**
   * Check API key rate limit (different limits for different tiers)
   */
  async checkApiKeyLimit(
    apiKey: string,
    tier: 'basic' | 'premium' | 'enterprise' = 'basic'
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const limits = {
      basic: { windowMs: 60 * 60 * 1000, max: 1000 }, // 1000 per hour
      premium: { windowMs: 60 * 60 * 1000, max: 10000 }, // 10k per hour
      enterprise: { windowMs: 60 * 60 * 1000, max: 100000 }, // 100k per hour
    };

    const { windowMs, max } = limits[tier];
    return this.checkRateLimit(`api_key:${apiKey}`, windowMs, max);
  }
}

/**
 * Permission Service
 */
export class PermissionService {
  private static permissions = {
    // Equipment permissions
    'equipment:read': 'Read equipment data',
    'equipment:write': 'Create and update equipment',
    'equipment:delete': 'Delete equipment',
    
    // Production permissions
    'production:read': 'Read production data',
    'production:write': 'Create and update production runs',
    'production:start': 'Start production runs',
    'production:complete': 'Complete production runs',
    
    // OEE permissions
    'oee:read': 'Read OEE calculations',
    'oee:calculate': 'Perform OEE calculations',
    
    // Analytics permissions
    'analytics:read': 'Read analytics and reports',
    'analytics:export': 'Export analytics data',
    
    // Admin permissions
    'admin:users': 'Manage users',
    'admin:roles': 'Manage roles and permissions',
    'admin:system': 'System administration',
  };

  static hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    return userPermissions.includes(requiredPermission) || userPermissions.includes('admin:system');
  }

  static hasAnyPermission(userPermissions: string[], requiredPermissions: string[]): boolean {
    return requiredPermissions.some(permission => this.hasPermission(userPermissions, permission));
  }
}

/**
 * Input Validation Schemas
 */
export const validationSchemas = {
  login: z.object({
    username: z.string().min(3).max(50),
    password: z.string().min(8).max(128),
  }),
  
  oeeCalculation: z.object({
    equipmentId: z.number().int().positive(),
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  
  productionStart: z.object({
    equipmentId: z.number().int().positive(),
    productId: z.number().int().positive(),
    shiftId: z.number().int().positive(),
    plannedQuantity: z.number().int().positive(),
    operatorId: z.string().optional(),
  }),
};

/**
 * Security Middleware
 */
export class SecurityMiddleware {
  private static rateLimitService = new RateLimitService();
  private static encryptionService = new EncryptionService();

  /**
   * Main security middleware
   */
  static async middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    
    // Skip security for public endpoints
    if (this.isPublicEndpoint(pathname)) {
      return NextResponse.next();
    }

    try {
      // Apply rate limiting
      const rateLimitResult = await this.applyRateLimit(request);
      if (!rateLimitResult.allowed) {
        return this.createRateLimitResponse(rateLimitResult);
      }

      // Apply authentication
      const authResult = await this.applyAuthentication(request);
      if (!authResult.success) {
        return this.createUnauthorizedResponse(authResult.error);
      }

      // Apply authorization
      const authzResult = this.applyAuthorization(pathname, authResult.user);
      if (!authzResult.allowed) {
        return this.createForbiddenResponse(authzResult.error);
      }

      // Add security headers
      const response = NextResponse.next();
      this.addSecurityHeaders(response);
      
      // Add user context to headers for downstream processing
      response.headers.set('X-User-ID', authResult.user.userId);
      response.headers.set('X-User-Roles', authResult.user.roles.join(','));

      return response;
    } catch (error) {
      console.error('[Security] Middleware error:', error);
      return this.createServerErrorResponse();
    }
  }

  /**
   * Check if endpoint is public
   */
  private static isPublicEndpoint(pathname: string): boolean {
    const publicPaths = [
      '/api/health',
      '/api/auth/login',
      '/api/auth/register',
      '/api/public/',
    ];
    
    return publicPaths.some(path => pathname.startsWith(path));
  }

  /**
   * Apply rate limiting
   */
  private static async applyRateLimit(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    
    return this.rateLimitService.checkRateLimit(ip);
  }

  /**
   * Apply authentication
   */
  private static async applyAuthentication(request: NextRequest) {
    const token = JWTService.extractToken(request);
    
    if (!token) {
      return { success: false, error: 'No authentication token provided' };
    }

    try {
      const user = await JWTService.verifyToken(token);
      return { success: true, user };
    } catch (error) {
      return { success: false, error: 'Invalid authentication token' };
    }
  }

  /**
   * Apply authorization
   */
  private static applyAuthorization(pathname: string, user: any) {
    // Map endpoints to required permissions
    const endpointPermissions: Record<string, string[]> = {
      '/api/v2/oee': ['oee:read'],
      '/api/v2/equipment': ['equipment:read'],
      '/api/v2/production': ['production:read'],
      '/api/v2/analytics': ['analytics:read'],
      '/api/admin': ['admin:system'],
    };

    // Find matching endpoint
    const matchingEndpoint = Object.keys(endpointPermissions).find(endpoint =>
      pathname.startsWith(endpoint)
    );

    if (!matchingEndpoint) {
      // No specific permissions required
      return { allowed: true };
    }

    const requiredPermissions = endpointPermissions[matchingEndpoint];
    const hasPermission = PermissionService.hasAnyPermission(user.permissions, requiredPermissions);

    return {
      allowed: hasPermission,
      error: hasPermission ? null : `Insufficient permissions. Required: ${requiredPermissions.join(' or ')}`,
    };
  }

  /**
   * Add security headers
   */
  private static addSecurityHeaders(response: NextResponse) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  }

  /**
   * Create rate limit response
   */
  private static createRateLimitResponse(rateLimitResult: any) {
    return new NextResponse(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  /**
   * Create unauthorized response
   */
  private static createUnauthorizedResponse(error: string) {
    return new NextResponse(
      JSON.stringify({ error }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Create forbidden response
   */
  private static createForbiddenResponse(error: string) {
    return new NextResponse(
      JSON.stringify({ error }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  /**
   * Create server error response
   */
  private static createServerErrorResponse() {
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Export singleton instances
export const encryptionService = new EncryptionService();
export const rateLimitService = new RateLimitService();

// Export middleware function for Next.js
export function securityMiddleware(request: NextRequest) {
  return SecurityMiddleware.middleware(request);
}