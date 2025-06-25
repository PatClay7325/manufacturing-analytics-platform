import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import jwt from 'jsonwebtoken';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { prisma } from '@/lib/database';
import { z } from 'zod';
import crypto from 'crypto';

// JWT payload schema
const jwtPayloadSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  role: z.string(),
  permissions: z.array(z.string()).optional(),
  exp: z.number(),
  iat: z.number(),
});

export type JWTPayload = z.infer<typeof jwtPayloadSchema>;

// Permission levels
export const PERMISSIONS = {
  // Agent permissions
  AGENT_EXECUTE: 'agent:execute',
  AGENT_VIEW: 'agent:view',
  AGENT_ADMIN: 'agent:admin',
  
  // Data permissions
  DATA_READ: 'data:read',
  DATA_WRITE: 'data:write',
  DATA_DELETE: 'data:delete',
  
  // System permissions
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_AUDIT: 'system:audit',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Verify JWT token
 */
async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const decoded = jwt.verify(token, env.AUTH_TOKEN_SALT) as any;
    const payload = jwtPayloadSchema.parse(decoded);
    
    // Check if token is expired
    if (payload.exp < Date.now() / 1000) {
      logger.warn({ userId: payload.userId }, 'Token expired');
      return null;
    }
    
    return payload;
  } catch (error) {
    logger.error({ error }, 'Token verification failed');
    return null;
  }
}

/**
 * Extract bearer token from authorization header
 */
function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Verify API key
 */
async function verifyApiKey(apiKey: string): Promise<{
  userId: string;
  permissions: string[];
} | null> {
  try {
    // Hash the API key for comparison
    const hashedKey = crypto
      .createHash('sha256')
      .update(apiKey)
      .digest('hex');
    
    const key = await prisma.apiKey.findFirst({
      where: {
        key: hashedKey,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        User: true,
      },
    });
    
    if (!key) {
      return null;
    }
    
    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: key.id },
      data: { lastUsedAt: new Date() },
    });
    
    return {
      userId: key.userId,
      permissions: key.permissions,
    };
  } catch (error) {
    logger.error({ error }, 'API key verification failed');
    return null;
  }
}

/**
 * Authentication middleware
 */
export function requireAuth(requiredPermissions: Permission[] = []) {
  return async function authMiddleware(
    req: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      // Check for API key first
      const apiKey = req.headers.get('x-api-key');
      if (apiKey) {
        const apiKeyData = await verifyApiKey(apiKey);
        if (apiKeyData) {
          // Check permissions
          if (requiredPermissions.length > 0) {
            const hasPermissions = requiredPermissions.every(
              perm => apiKeyData.permissions.includes(perm)
            );
            
            if (!hasPermissions) {
              return NextResponse.json(
                { error: 'Insufficient permissions' },
                { status: 403 }
              );
            }
          }
          
          // Add user context to request
          (req as any).user = {
            id: apiKeyData.userId,
            permissions: apiKeyData.permissions,
            authMethod: 'api-key',
          };
          
          return next();
        }
      }
      
      // Check for JWT token
      const authHeader = req.headers.get('authorization');
      const token = extractBearerToken(authHeader);
      
      if (token) {
        const payload = await verifyToken(token);
        if (payload) {
          // Check permissions
          if (requiredPermissions.length > 0) {
            const hasPermissions = requiredPermissions.every(
              perm => payload.permissions?.includes(perm)
            );
            
            if (!hasPermissions) {
              return NextResponse.json(
                { error: 'Insufficient permissions' },
                { status: 403 }
              );
            }
          }
          
          // Add user context to request
          (req as any).user = {
            id: payload.userId,
            email: payload.email,
            role: payload.role,
            permissions: payload.permissions,
            authMethod: 'jwt',
          };
          
          return next();
        }
      }
      
      // Check for session (NextAuth)
      const session = await getServerSession();
      if (session?.user) {
        // Load user permissions from database
        const user = await prisma.user.findUnique({
          where: { email: session.user.email! },
          select: { id: true, role: true },
        });
        
        if (user) {
          // Map role to permissions (simplified)
          const rolePermissions = getRolePermissions(user.role);
          
          // Check permissions
          if (requiredPermissions.length > 0) {
            const hasPermissions = requiredPermissions.every(
              perm => rolePermissions.includes(perm)
            );
            
            if (!hasPermissions) {
              return NextResponse.json(
                { error: 'Insufficient permissions' },
                { status: 403 }
              );
            }
          }
          
          // Add user context to request
          (req as any).user = {
            id: user.id,
            email: session.user.email,
            role: user.role,
            permissions: rolePermissions,
            authMethod: 'session',
          };
          
          return next();
        }
      }
      
      // No valid authentication found
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    } catch (error) {
      logger.error({ error }, 'Authentication middleware error');
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

/**
 * Get permissions for a role
 */
function getRolePermissions(role: string): Permission[] {
  const rolePermissionsMap: Record<string, Permission[]> = {
    admin: Object.values(PERMISSIONS),
    manager: [
      PERMISSIONS.AGENT_EXECUTE,
      PERMISSIONS.AGENT_VIEW,
      PERMISSIONS.DATA_READ,
      PERMISSIONS.DATA_WRITE,
      PERMISSIONS.SYSTEM_AUDIT,
    ],
    operator: [
      PERMISSIONS.AGENT_EXECUTE,
      PERMISSIONS.AGENT_VIEW,
      PERMISSIONS.DATA_READ,
    ],
    viewer: [
      PERMISSIONS.AGENT_VIEW,
      PERMISSIONS.DATA_READ,
    ],
  };
  
  return rolePermissionsMap[role] || [];
}

/**
 * Generate JWT token
 */
export function generateToken(
  userId: string,
  email: string,
  role: string,
  permissions?: string[]
): string {
  const payload: JWTPayload = {
    userId,
    email,
    role,
    permissions: permissions || getRolePermissions(role),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
    iat: Math.floor(Date.now() / 1000),
  };
  
  return jwt.sign(payload, env.AUTH_TOKEN_SALT);
}

/**
 * Generate API key
 */
export function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash API key for storage
 */
export function hashApiKey(apiKey: string): string {
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Redact sensitive information from logs
 */
export function redactSensitive(obj: any): any {
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  const redacted = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (const key in redacted) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitive(redacted[key]);
    }
  }
  
  return redacted;
}