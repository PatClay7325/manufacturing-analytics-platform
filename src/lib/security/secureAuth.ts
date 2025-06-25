import { NextRequest, NextResponse } from 'next/server';
// Argon2 stub for now - to be replaced when argon2 is available
const argon2 = { 
  hash: async (password: string): Promise<string> => {
    // Simple hash stub - replace with real argon2 when available
    return Buffer.from(password).toString('base64');
  }, 
  verify: async (hash: string, password: string): Promise<boolean> => {
    return hash === Buffer.from(password).toString('base64');
  }
};
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '@/lib/database';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { z } from 'zod';
import { getRedisClient } from '@/lib/redis/redisClient';

// JWT configuration with key rotation
const JWT_ALGORITHM = 'RS256';
const KEY_ROTATION_INTERVAL = 30 * 24 * 60 * 60 * 1000; // 30 days
const TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '7d';

// Schemas
const jwtPayloadSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  role: z.string(),
  permissions: z.array(z.string()),
  sessionId: z.string(),
  tokenVersion: z.number(),
  exp: z.number(),
  iat: z.number(),
  iss: z.string(),
  aud: z.string(),
});

export type JWTPayload = z.infer<typeof jwtPayloadSchema>;

// Key management
interface SigningKey {
  kid: string;
  privateKey: string;
  publicKey: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Generate RSA key pair for JWT signing
 */
async function generateKeyPair(): Promise<{
  privateKey: string;
  publicKey: string;
}> {
  const { generateKeyPairSync } = await import('crypto');
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return { privateKey, publicKey };
}

/**
 * Get or create current signing key with rotation
 */
async function getCurrentSigningKey(): Promise<SigningKey> {
  const redis = getRedisClient();
  const CURRENT_KEY = 'auth:signing:current';
  
  try {
    // Check Redis cache first
    const cached = await redis.get(CURRENT_KEY);
    if (cached) {
      const key = JSON.parse(cached) as SigningKey;
      if (new Date(key.expiresAt) > new Date()) {
        return key;
      }
    }

    // Generate new key pair
    const { privateKey, publicKey } = await generateKeyPair();
    const kid = crypto.randomBytes(16).toString('hex');
    
    const signingKey: SigningKey = {
      kid,
      privateKey,
      publicKey,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + KEY_ROTATION_INTERVAL),
    };

    // Store in Redis with expiry
    await redis.setex(
      CURRENT_KEY,
      Math.floor(KEY_ROTATION_INTERVAL / 1000),
      JSON.stringify(signingKey)
    );

    // Also store public key for verification
    await redis.setex(
      `auth:publickey:${kid}`,
      Math.floor(KEY_ROTATION_INTERVAL * 2 / 1000), // Keep old keys longer for verification
      publicKey
    );

    logger.info({ kid }, 'Generated new signing key');
    return signingKey;
  } catch (error) {
    logger.error({ error }, 'Failed to get signing key');
    throw new Error('Key management error');
  }
}

/**
 * Generate secure JWT token with proper claims
 */
export async function generateSecureToken(
  userId: string,
  email: string,
  role: string,
  permissions: string[]
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const signingKey = await getCurrentSigningKey();
  const sessionId = crypto.randomUUID();
  const redis = getRedisClient();

  // Create token payload
  const payload: Omit<JWTPayload, 'exp' | 'iat'> = {
    userId,
    email,
    role,
    permissions,
    sessionId,
    tokenVersion: 1,
    iss: 'manufacturing-analytics',
    aud: 'manufacturing-analytics-api',
  };

  // Generate access token
  const accessToken = jwt.sign(payload, signingKey.privateKey, {
    algorithm: JWT_ALGORITHM,
    expiresIn: TOKEN_EXPIRY,
    keyid: signingKey.kid,
  });

  // Generate refresh token
  const refreshToken = jwt.sign(
    { ...payload, type: 'refresh' },
    signingKey.privateKey,
    {
      algorithm: JWT_ALGORITHM,
      expiresIn: REFRESH_TOKEN_EXPIRY,
      keyid: signingKey.kid,
    }
  );

  // Store session in Redis
  await redis.setex(
    `auth:session:${sessionId}`,
    7 * 24 * 60 * 60, // 7 days
    JSON.stringify({
      userId,
      email,
      role,
      permissions,
      tokenVersion: 1,
      createdAt: new Date(),
    })
  );

  return {
    accessToken,
    refreshToken,
    expiresIn: 24 * 60 * 60, // 24 hours in seconds
  };
}

/**
 * Verify JWT token with key rotation support
 */
export async function verifySecureToken(token: string): Promise<JWTPayload | null> {
  try {
    // Decode token header to get kid
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      return null;
    }

    const kid = decoded.header.kid;
    if (!kid) {
      logger.warn('Token missing kid header');
      return null;
    }

    // Get public key from Redis
    const redis = getRedisClient();
    const publicKey = await redis.get(`auth:publickey:${kid}`);
    
    if (!publicKey) {
      logger.warn({ kid }, 'Public key not found');
      return null;
    }

    // Verify token
    const payload = jwt.verify(token, publicKey, {
      algorithms: [JWT_ALGORITHM],
      issuer: 'manufacturing-analytics',
      audience: 'manufacturing-analytics-api',
    }) as any;

    // Validate payload schema
    const validated = jwtPayloadSchema.parse(payload);

    // Check session validity
    const session = await redis.get(`auth:session:${validated.sessionId}`);
    if (!session) {
      logger.warn({ sessionId: validated.sessionId }, 'Session not found');
      return null;
    }

    const sessionData = JSON.parse(session);
    if (sessionData.tokenVersion !== validated.tokenVersion) {
      logger.warn('Token version mismatch');
      return null;
    }

    return validated;
  } catch (error) {
    logger.error({ error }, 'Token verification failed');
    return null;
  }
}

/**
 * Hash API key using Argon2
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  return argon2.hash(apiKey, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Verify API key against hash
 */
export async function verifyApiKey(apiKey: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, apiKey);
  } catch (error) {
    logger.error({ error }, 'API key verification failed');
    return false;
  }
}

/**
 * Generate secure API key with prefix
 */
export function generateApiKey(): {
  key: string;
  prefix: string;
} {
  const keyBytes = crypto.randomBytes(32);
  const key = `mfg_${keyBytes.toString('base64url')}`;
  const prefix = key.substring(0, 8);
  
  return { key, prefix };
}

/**
 * Rotate API key
 */
export async function rotateApiKey(
  userId: string,
  oldKeyId: string
): Promise<{
  key: string;
  keyId: string;
}> {
  const { key, prefix } = generateApiKey();
  const hashedKey = await hashApiKey(key);

  // Create new key
  const newKey = await prisma.apiKeyHash.create({
    data: {
      name: 'Rotated Key',
      keyPrefix: prefix,
      hashedKey,
      userId,
      permissions: [], // Copy from old key
      rotatedFrom: oldKeyId,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    },
  });

  // Mark old key as rotated
  await prisma.apiKeyHash.update({
    where: { id: oldKeyId },
    data: {
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Give 7 days grace period
    },
  });

  logger.info({ userId, oldKeyId, newKeyId: newKey.id }, 'API key rotated');

  return {
    key,
    keyId: newKey.id,
  };
}

/**
 * Revoke all tokens for a user
 */
export async function revokeUserTokens(userId: string): Promise<void> {
  const redis = getRedisClient();
  
  // Increment token version for all user sessions
  const sessions = await redis.keys(`auth:session:*`);
  
  for (const sessionKey of sessions) {
    const session = await redis.get(sessionKey);
    if (session) {
      const sessionData = JSON.parse(session);
      if (sessionData.userId === userId) {
        sessionData.tokenVersion++;
        await redis.setex(sessionKey, 7 * 24 * 60 * 60, JSON.stringify(sessionData));
      }
    }
  }

  logger.info({ userId }, 'User tokens revoked');
}

/**
 * Authenticate API key
 */
export async function authenticateApiKey(key: string): Promise<{ authenticated: boolean; user?: any; error?: string }> {
  try {
    if (!key) {
      return { authenticated: false, error: 'API key required' };
    }

    // Extract prefix from key
    const parts = key.split('.');
    if (parts.length !== 2) {
      return { authenticated: false, error: 'Invalid API key format' };
    }

    const [prefix, keyPart] = parts;
    
    // Find key by prefix
    const apiKey = await prisma.apiKeyHash.findFirst({
      where: {
        keyPrefix: prefix,
        expiresAt: { gt: new Date() },
        revokedAt: null
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!apiKey) {
      return { authenticated: false, error: 'Invalid API key' };
    }

    // Verify key
    const isValid = await argon2.verify(apiKey.hashedKey, keyPart);
    if (!isValid) {
      return { authenticated: false, error: 'Invalid API key' };
    }

    // Update last used
    await prisma.apiKeyHash.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() }
    });

    return {
      authenticated: true,
      user: {
        userId: apiKey.User.id,
        ...apiKey.User,
        permissions: apiKey.permissions
      }
    };

  } catch (error) {
    logger.error({ error }, 'API key authentication error');
    return { authenticated: false, error: 'Authentication failed' };
  }
}

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400, // 24 hours
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
};