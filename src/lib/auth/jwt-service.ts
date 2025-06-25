/**
 * JWT Authentication Service
 * Production-ready JWT implementation with refresh tokens
 */

import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { Redis } from 'ioredis';
import { User } from '@prisma/client';

interface TokenPayload {
  sub: string; // User ID
  email: string;
  tenantId?: string;
  permissions: string[];
  sessionId: string;
  type: 'access' | 'refresh';
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class JWTService {
  private static instance: JWTService;
  private redis: Redis;
  
  private readonly ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
  private readonly REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly TOKEN_ISSUER = 'manufacturing-platform';
  private readonly TOKEN_AUDIENCE = 'manufacturing-api';

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: 1, // Use separate DB for sessions
      keyPrefix: 'jwt:',
    });
  }

  static getInstance(): JWTService {
    if (!JWTService.instance) {
      JWTService.instance = new JWTService();
    }
    return JWTService.instance;
  }

  /**
   * Generate token pair for user
   */
  async generateTokenPair(user: User & { tenantId?: string; permissions?: string[] }): Promise<TokenPair> {
    const sessionId = randomBytes(32).toString('hex');
    const now = Date.now();

    // Create payload
    const basePayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      permissions: user.permissions || [],
      sessionId,
      iat: Math.floor(now / 1000),
      iss: this.TOKEN_ISSUER,
      aud: this.TOKEN_AUDIENCE,
    };

    // Generate access token
    const accessToken = jwt.sign(
      { ...basePayload, type: 'access' },
      this.ACCESS_TOKEN_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );

    // Generate refresh token
    const refreshToken = jwt.sign(
      { ...basePayload, type: 'refresh' },
      this.REFRESH_TOKEN_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    );

    // Store session in Redis
    const sessionData = {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      permissions: user.permissions,
      createdAt: now,
      lastActivity: now,
      userAgent: null,
      ipAddress: null,
    };

    await this.redis.setex(
      `session:${sessionId}`,
      7 * 24 * 60 * 60, // 7 days
      JSON.stringify(sessionData)
    );

    // Store refresh token
    await this.redis.setex(
      `refresh:${user.id}:${sessionId}`,
      7 * 24 * 60 * 60,
      refreshToken
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  /**
   * Verify and decode access token
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.ACCESS_TOKEN_SECRET, {
        issuer: this.TOKEN_ISSUER,
        audience: this.TOKEN_AUDIENCE,
      }) as TokenPayload;

      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      // Check if session exists
      const session = await this.redis.get(`session:${payload.sessionId}`);
      if (!session) {
        throw new Error('Session expired or invalid');
      }

      // Update last activity
      const sessionData = JSON.parse(session);
      sessionData.lastActivity = Date.now();
      await this.redis.setex(
        `session:${payload.sessionId}`,
        7 * 24 * 60 * 60,
        JSON.stringify(sessionData)
      );

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = jwt.verify(refreshToken, this.REFRESH_TOKEN_SECRET, {
        issuer: this.TOKEN_ISSUER,
        audience: this.TOKEN_AUDIENCE,
      }) as TokenPayload;

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token exists in Redis
      const storedToken = await this.redis.get(`refresh:${payload.sub}:${payload.sessionId}`);
      if (storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Get session data
      const session = await this.redis.get(`session:${payload.sessionId}`);
      if (!session) {
        throw new Error('Session expired');
      }

      const sessionData = JSON.parse(session);

      // Generate new token pair
      return this.generateTokenPair({
        id: payload.sub,
        email: payload.email,
        tenantId: sessionData.tenantId,
        permissions: sessionData.permissions,
      } as any);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeUserTokens(userId: string): Promise<void> {
    const keys = await this.redis.keys(`refresh:${userId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    // Also remove sessions
    const sessionKeys = await this.redis.keys(`session:*`);
    for (const key of sessionKeys) {
      const session = await this.redis.get(key);
      if (session) {
        const data = JSON.parse(session);
        if (data.userId === userId) {
          await this.redis.del(key);
        }
      }
    }
  }

  /**
   * Validate user permissions
   */
  hasPermission(payload: TokenPayload, requiredPermission: string): boolean {
    return payload.permissions.includes(requiredPermission) || 
           payload.permissions.includes('*'); // Superadmin
  }

  /**
   * Check tenant access
   */
  hasTenantAccess(payload: TokenPayload, tenantId: string): boolean {
    return payload.tenantId === tenantId || 
           payload.permissions.includes('tenant:*'); // Cross-tenant admin
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    const sessionKeys = await this.redis.keys('session:*');
    const now = Date.now();
    const maxInactivity = 24 * 60 * 60 * 1000; // 24 hours

    for (const key of sessionKeys) {
      const session = await this.redis.get(key);
      if (session) {
        const data = JSON.parse(session);
        if (now - data.lastActivity > maxInactivity) {
          await this.redis.del(key);
        }
      }
    }
  }
}

// Export singleton instance
export const jwtService = JWTService.getInstance();