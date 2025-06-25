import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
// import { prisma } from '@/lib/database';
import { PrismaClient } from '@prisma/client';

// Create a fresh Prisma client with the correct DATABASE_URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://analytics:development_password@localhost:5433/manufacturing?schema=public'
    }
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

// Security constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const TOKEN_BLACKLIST = new Set<string>();

export class AuthenticationError extends Error {
  constructor(message: string, public code: string = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string, public code: string = 'AUTHZ_ERROR') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginAttempt {
  email: string;
  ipAddress: string;
  successful: boolean;
  timestamp: Date;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
  siteId?: string | null;
  siteName?: string;
  enterpriseId?: string;
  enterpriseName?: string;
}

export interface AuthResult {
  authenticated: boolean;
  user?: AuthUser;
  userId?: string;
  error?: string;
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Check for API key first
    const authHeader = request.headers.get('authorization');
    const apiKeyHeader = request.headers.get('x-api-key');
    
    // Check if it's an API key authentication
    if (apiKeyHeader || authHeader?.startsWith('Bearer mfg_')) {
      const apiKey = apiKeyHeader || authHeader?.substring(7);
      if (apiKey) {
        return verifyApiKey(apiKey);
      }
    }
    
    // Check for JWT token in cookies
    const cookieToken = request.cookies.get('auth-token')?.value;
    
    // Check for Bearer token (JWT)
    const headerToken = authHeader?.startsWith('Bearer ') && !authHeader.startsWith('Bearer mfg_')
      ? authHeader.substring(7) 
      : null;
    
    const token = cookieToken || headerToken;
    
    if (!token) {
      return { authenticated: false, error: 'No token provided' };
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    
    // Optionally verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return { authenticated: false, error: 'User not found' };
    }

    return {
      authenticated: true,
      user: decoded,
      userId: decoded.userId,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { authenticated: false, error: 'Token expired' };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { authenticated: false, error: 'Invalid token' };
    }
    console.error('Auth verification error:', error);
    return { authenticated: false, error: 'Authentication failed' };
  }
}

async function verifyApiKey(apiKey: string): Promise<AuthResult> {
  try {
    // Hash the provided API key
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Find the API key in database
    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: { key: hashedKey },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            role: true,
            siteId: true,
            Site: {
              select: {
                id: true,
                name: true,
                Enterprise: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!apiKeyRecord) {
      return { authenticated: false, error: 'Invalid API key' };
    }

    // Check if key is expired
    if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) < new Date()) {
      return { authenticated: false, error: 'API key expired' };
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    // Create auth user object
    const authUser: AuthUser = {
      userId: apiKeyRecord.User.id,
      email: apiKeyRecord.User.email,
      role: apiKeyRecord.User.role,
      siteId: apiKeyRecord.User.siteId,
      siteName: apiKeyRecord.User.Site?.name,
      enterpriseId: apiKeyRecord.User.Site?.Enterprise?.id,
      enterpriseName: apiKeyRecord.User.Site?.Enterprise?.name,
    };

    return {
      authenticated: true,
      user: authUser,
      userId: apiKeyRecord.User.id,
    };
  } catch (error) {
    console.error('API key verification error:', error);
    return { authenticated: false, error: 'API key verification failed' };
  }
}

export function hasPermission(
  userRole: string,
  requiredPermission: string
): boolean {
  const roleHierarchy: Record<string, number> = {
    admin: 100,
    manager: 80,
    engineer: 70,
    supervisor: 60,
    quality_analyst: 50,
    technician: 40,
    operator: 30,
    viewer: 20,
    user: 10,
  };

  const permissionRoles: Record<string, string[]> = {
    'manage:users': ['admin'],
    'manage:teams': ['admin', 'manager'],
    'manage:settings': ['admin'],
    'manage:dashboards': ['admin', 'manager', 'engineer'],
    'manage:alerts': ['admin', 'manager', 'supervisor'],
    'manage:equipment': ['admin', 'manager', 'engineer'],
    'manage:integrations': ['admin'],
    'edit:all': ['admin'],
    'edit:dashboards': ['admin', 'manager', 'engineer'],
    'edit:alerts': ['admin', 'manager', 'supervisor'],
    'edit:equipment': ['admin', 'manager', 'engineer', 'technician'],
    'edit:maintenance': ['admin', 'manager', 'engineer', 'technician'],
    'edit:quality': ['admin', 'manager', 'quality_analyst'],
    'create:dashboards': ['admin', 'manager', 'engineer'],
    'create:alerts': ['admin', 'manager', 'supervisor', 'engineer'],
    'create:maintenance': ['admin', 'manager', 'engineer', 'technician'],
    'create:quality:reports': ['admin', 'manager', 'quality_analyst'],
    'delete:all': ['admin'],
    'delete:own': ['admin', 'manager', 'engineer'],
    'view:all': ['admin', 'manager', 'engineer'],
    'view:users': ['admin', 'manager'],
    'view:team': ['admin', 'manager', 'supervisor'],
    'view:dashboards': ['admin', 'manager', 'engineer', 'supervisor', 'operator', 'quality_analyst', 'viewer'],
    'view:equipment': ['admin', 'manager', 'engineer', 'supervisor', 'operator', 'technician', 'quality_analyst'],
    'view:alerts': ['admin', 'manager', 'engineer', 'supervisor', 'operator', 'technician'],
    'view:maintenance': ['admin', 'manager', 'engineer', 'technician'],
    'view:quality': ['admin', 'manager', 'engineer', 'quality_analyst'],
    'view:analytics': ['admin', 'manager', 'engineer'],
    'view:own': ['user'],
    'acknowledge:alerts': ['admin', 'manager', 'supervisor', 'operator'],
    'update:equipment:status': ['admin', 'manager', 'engineer', 'supervisor', 'operator'],
  };

  // Check if user has specific permission
  const allowedRoles = permissionRoles[requiredPermission];
  if (allowedRoles && allowedRoles.includes(userRole)) {
    return true;
  }

  // Check if user has a higher role in hierarchy
  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = Math.max(
    ...(allowedRoles || []).map(role => roleHierarchy[role] || 0)
  );

  return userLevel >= requiredLevel;
}

// Track login attempts in memory (in production, use Redis or database)
const loginAttempts = new Map<string, { count: number; lastAttempt: Date; lockedUntil?: Date }>();

export async function authenticateUser(credentials: LoginCredentials): Promise<{ success: boolean; tokens?: AuthTokens; error?: string; user?: AuthUser }> {
  const { email, password, remember = false, ipAddress = '', userAgent = '' } = credentials;
  
  try {
    // Check for account lockout
    const attemptKey = `${email}:${ipAddress}`;
    const attempts = loginAttempts.get(attemptKey);
    
    if (attempts?.lockedUntil && attempts.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((attempts.lockedUntil.getTime() - Date.now()) / 1000 / 60);
      return {
        success: false,
        error: `Account locked. Try again in ${remainingTime} minutes.`
      };
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        Site: {
          include: {
            Enterprise: true
          }
        }
      }
    });

    if (!user) {
      await trackFailedLogin(attemptKey);
      return {
        success: false,
        error: 'Invalid email or password'
      };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      await trackFailedLogin(attemptKey);
      return {
        success: false,
        error: 'Invalid email or password'
      };
    }

    // Clear failed attempts on successful login
    loginAttempts.delete(attemptKey);

    // Generate tokens
    const authUser: AuthUser = {
      userId: user.id,
      email: user.email,
      role: user.role,
      siteId: user.siteId,
      siteName: user.Site?.name,
      enterpriseId: user.Site?.Enterprise?.id,
      enterpriseName: user.Site?.Enterprise?.name
    };

    const accessToken = jwt.sign(
      authUser,
      JWT_SECRET,
      { expiresIn: remember ? '30d' : '24h' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    const expiresAt = Date.now() + (remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000);

    // Log successful login attempt
    await logLoginAttempt({
      email,
      ipAddress,
      successful: true,
      timestamp: new Date()
    });

    return {
      success: true,
      tokens: {
        accessToken,
        refreshToken,
        expiresAt
      },
      user: authUser
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication service unavailable'
    };
  }
}

export async function refreshAuthToken(refreshToken: string): Promise<{ success: boolean; tokens?: AuthTokens; error?: string }> {
  try {
    // Check if token is blacklisted
    if (TOKEN_BLACKLIST.has(refreshToken)) {
      return {
        success: false,
        error: 'Token has been revoked'
      };
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string; type: string };
    
    if (decoded.type !== 'refresh') {
      return {
        success: false,
        error: 'Invalid token type'
      };
    }

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        Site: {
          include: {
            Enterprise: true
          }
        }
      }
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Generate new tokens
    const authUser: AuthUser = {
      userId: user.id,
      email: user.email,
      role: user.role,
      siteId: user.siteId,
      siteName: user.Site?.name,
      enterpriseId: user.Site?.Enterprise?.id,
      enterpriseName: user.Site?.Enterprise?.name
    };

    const newAccessToken = jwt.sign(
      authUser,
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const newRefreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    // Blacklist old refresh token
    TOKEN_BLACKLIST.add(refreshToken);
    
    // Clean up blacklist periodically (in production, use a better strategy)
    if (TOKEN_BLACKLIST.size > 10000) {
      TOKEN_BLACKLIST.clear();
    }

    return {
      success: true,
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000)
      }
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return {
        success: false,
        error: 'Refresh token expired'
      };
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        success: false,
        error: 'Invalid refresh token'
      };
    }
    console.error('Token refresh error:', error);
    return {
      success: false,
      error: 'Token refresh failed'
    };
  }
}

export async function revokeToken(token: string): Promise<void> {
  TOKEN_BLACKLIST.add(token);
}

export async function createUser(userData: {
  email: string;
  password: string;
  role: string;
  siteId?: string;
}): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email.toLowerCase() }
    });

    if (existingUser) {
      return {
        success: false,
        error: 'User already exists'
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email.toLowerCase(),
        passwordHash: hashedPassword,
        role: userData.role,
        siteId: userData.siteId || null
      },
      select: {
        id: true,
        email: true,
        role: true,
        siteId: true,
        createdAt: true
      }
    });

    return {
      success: true,
      user
    };
  } catch (error) {
    console.error('User creation error:', error);
    return {
      success: false,
      error: 'Failed to create user'
    };
  }
}

async function trackFailedLogin(attemptKey: string): Promise<void> {
  const current = loginAttempts.get(attemptKey) || { count: 0, lastAttempt: new Date() };
  
  current.count++;
  current.lastAttempt = new Date();
  
  // Lock account after max attempts
  if (current.count >= MAX_LOGIN_ATTEMPTS) {
    current.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION);
  }
  
  loginAttempts.set(attemptKey, current);
}

async function logLoginAttempt(attempt: LoginAttempt): Promise<void> {
  // In production, store in database
  console.log('Login attempt:', {
    email: attempt.email,
    ipAddress: attempt.ipAddress,
    successful: attempt.successful,
    timestamp: attempt.timestamp
  });
}

export async function requireAuth(
  request: NextRequest,
  requiredPermission?: string
): Promise<AuthResult> {
  const authResult = await verifyAuth(request);
  
  if (!authResult.authenticated) {
    return authResult;
  }

  if (requiredPermission && authResult.user) {
    const hasRequiredPermission = hasPermission(
      authResult.user.role,
      requiredPermission
    );
    
    if (!hasRequiredPermission) {
      return {
        authenticated: false,
        error: 'Insufficient permissions',
      };
    }
  }

  return authResult;
}

export async function getSession(request: NextRequest): Promise<AuthUser | null> {
  const authResult = await verifyAuth(request);
  return authResult.authenticated ? authResult.user || null : null;
}
