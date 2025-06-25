/**
 * Authentication Service - Comprehensive JWT-based authentication with RBAC
 * Production-ready authentication for manufacturing environments
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/database';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  permissions: Permission[];
  lastLogin?: Date;
  isActive: boolean;
  teamId?: string;
  siteId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  department?: string;
  teamId?: string;
  siteId?: string;
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
  MAINTENANCE = 'maintenance',
  QUALITY = 'quality'
}

export enum Permission {
  // Dashboard permissions
  DASHBOARD_VIEW = 'dashboard:view',
  DASHBOARD_CREATE = 'dashboard:create',
  DASHBOARD_EDIT = 'dashboard:edit',
  DASHBOARD_DELETE = 'dashboard:delete',
  DASHBOARD_SHARE = 'dashboard:share',
  
  // Data permissions
  DATA_VIEW = 'data:view',
  DATA_EXPORT = 'data:export',
  DATA_MODIFY = 'data:modify',
  
  // Equipment permissions
  EQUIPMENT_VIEW = 'equipment:view',
  EQUIPMENT_CONTROL = 'equipment:control',
  EQUIPMENT_CONFIGURE = 'equipment:configure',
  
  // User management
  USER_VIEW = 'user:view',
  USER_CREATE = 'user:create',
  USER_EDIT = 'user:edit',
  USER_DELETE = 'user:delete',
  
  // System administration
  SYSTEM_ADMIN = 'system:admin',
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_LOGS = 'system:logs',
  
  // Quality management
  QUALITY_VIEW = 'quality:view',
  QUALITY_EDIT = 'quality:edit',
  QUALITY_APPROVE = 'quality:approve',
  
  // Maintenance
  MAINTENANCE_VIEW = 'maintenance:view',
  MAINTENANCE_SCHEDULE = 'maintenance:schedule',
  MAINTENANCE_EXECUTE = 'maintenance:execute',
  
  // Alerts
  ALERT_VIEW = 'alert:view',
  ALERT_ACKNOWLEDGE = 'alert:acknowledge',
  ALERT_CONFIGURE = 'alert:configure'
}

// Role-based permission mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permission),
  [UserRole.ADMIN]: [
    Permission.DASHBOARD_VIEW, Permission.DASHBOARD_CREATE, Permission.DASHBOARD_EDIT, Permission.DASHBOARD_DELETE, Permission.DASHBOARD_SHARE,
    Permission.DATA_VIEW, Permission.DATA_EXPORT, Permission.DATA_MODIFY,
    Permission.EQUIPMENT_VIEW, Permission.EQUIPMENT_CONTROL, Permission.EQUIPMENT_CONFIGURE,
    Permission.USER_VIEW, Permission.USER_CREATE, Permission.USER_EDIT,
    Permission.SYSTEM_CONFIG, Permission.SYSTEM_LOGS,
    Permission.QUALITY_VIEW, Permission.QUALITY_EDIT, Permission.QUALITY_APPROVE,
    Permission.MAINTENANCE_VIEW, Permission.MAINTENANCE_SCHEDULE, Permission.MAINTENANCE_EXECUTE,
    Permission.ALERT_VIEW, Permission.ALERT_ACKNOWLEDGE, Permission.ALERT_CONFIGURE
  ],
  [UserRole.MANAGER]: [
    Permission.DASHBOARD_VIEW, Permission.DASHBOARD_CREATE, Permission.DASHBOARD_EDIT, Permission.DASHBOARD_SHARE,
    Permission.DATA_VIEW, Permission.DATA_EXPORT,
    Permission.EQUIPMENT_VIEW, Permission.EQUIPMENT_CONTROL,
    Permission.USER_VIEW,
    Permission.QUALITY_VIEW, Permission.QUALITY_EDIT,
    Permission.MAINTENANCE_VIEW, Permission.MAINTENANCE_SCHEDULE,
    Permission.ALERT_VIEW, Permission.ALERT_ACKNOWLEDGE, Permission.ALERT_CONFIGURE
  ],
  [UserRole.OPERATOR]: [
    Permission.DASHBOARD_VIEW,
    Permission.DATA_VIEW,
    Permission.EQUIPMENT_VIEW, Permission.EQUIPMENT_CONTROL,
    Permission.QUALITY_VIEW,
    Permission.MAINTENANCE_VIEW,
    Permission.ALERT_VIEW, Permission.ALERT_ACKNOWLEDGE
  ],
  [UserRole.VIEWER]: [
    Permission.DASHBOARD_VIEW,
    Permission.DATA_VIEW,
    Permission.EQUIPMENT_VIEW,
    Permission.QUALITY_VIEW,
    Permission.MAINTENANCE_VIEW,
    Permission.ALERT_VIEW
  ],
  [UserRole.MAINTENANCE]: [
    Permission.DASHBOARD_VIEW,
    Permission.DATA_VIEW,
    Permission.EQUIPMENT_VIEW, Permission.EQUIPMENT_CONFIGURE,
    Permission.MAINTENANCE_VIEW, Permission.MAINTENANCE_SCHEDULE, Permission.MAINTENANCE_EXECUTE,
    Permission.ALERT_VIEW, Permission.ALERT_ACKNOWLEDGE
  ],
  [UserRole.QUALITY]: [
    Permission.DASHBOARD_VIEW,
    Permission.DATA_VIEW, Permission.DATA_EXPORT,
    Permission.EQUIPMENT_VIEW,
    Permission.QUALITY_VIEW, Permission.QUALITY_EDIT, Permission.QUALITY_APPROVE,
    Permission.ALERT_VIEW, Permission.ALERT_ACKNOWLEDGE
  ]
};

interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  sessionId: string;
  iat: number;
  exp: number;
}

export class AuthService {
  private prisma: PrismaClient;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;
  private activeSessions = new Map<string, Set<string>>(); // userId -> Set<sessionId>

  constructor() {
    this.prisma = prisma;
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production';
    this.accessTokenExpiry = process.env.JWT_EXPIRY || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';

    if (process.env.NODE_ENV === 'production' && (this.jwtSecret.includes('change-this') || this.jwtRefreshSecret.includes('change-this'))) {
      throw new Error('JWT secrets must be changed in production!');
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<User> {
    // Validate email format
    if (!this.isValidEmail(data.email)) {
      throw new Error('Invalid email format');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Validate password strength
    if (!this.isValidPassword(data.password)) {
      throw new Error('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Determine role and permissions
    const role = data.role || UserRole.VIEWER;
    const permissions = ROLE_PERMISSIONS[role];

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role,
        department: data.department,
        passwordHash,
        teamId: data.teamId,
        siteId: data.siteId
      }
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: role,
      department: user.department || undefined,
      permissions,
      isActive: true,
      teamId: user.teamId || undefined,
      siteId: user.siteId || undefined
    };
  }

  /**
   * Authenticate user and return tokens
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const { email, password, rememberMe = false } = credentials;

    // Find user
    const dbUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!dbUser) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, dbUser.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Check if user is active
    if (!dbUser.isActive) {
      throw new Error('Account is deactivated');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: dbUser.id },
      data: { lastLogin: new Date() }
    });

    // Create user object
    const role = dbUser.role as UserRole;
    const permissions = ROLE_PERMISSIONS[role];
    
    const user: User = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name || '',
      role,
      department: dbUser.department || undefined,
      permissions,
      lastLogin: new Date(),
      isActive: true,
      teamId: dbUser.teamId || undefined,
      siteId: dbUser.siteId || undefined
    };

    // Generate session ID
    const sessionId = this.generateSessionId();

    // Track active session
    if (!this.activeSessions.has(user.id)) {
      this.activeSessions.set(user.id, new Set());
    }
    this.activeSessions.get(user.id)!.add(sessionId);

    // Generate tokens
    const tokens = this.generateTokens(user, sessionId, rememberMe);

    return { user, tokens };
  }

  /**
   * Verify access token and return user
   */
  async verifyAccessToken(token: string): Promise<User> {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as JWTPayload;
      
      // Check if session is still active
      const userSessions = this.activeSessions.get(payload.userId);
      if (!userSessions || !userSessions.has(payload.sessionId)) {
        throw new Error('Session expired');
      }

      // Get fresh user data
      const dbUser = await this.prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!dbUser || !dbUser.isActive) {
        throw new Error('User not found or inactive');
      }

      const role = dbUser.role as UserRole;
      const permissions = ROLE_PERMISSIONS[role];

      return {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name || '',
        role,
        department: dbUser.department || undefined,
        permissions,
        lastLogin: dbUser.lastLogin || undefined,
        isActive: true,
        teamId: dbUser.teamId || undefined,
        siteId: dbUser.siteId || undefined
      };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, this.jwtRefreshSecret) as JWTPayload;
      
      // Verify session is still active
      const userSessions = this.activeSessions.get(payload.userId);
      if (!userSessions || !userSessions.has(payload.sessionId)) {
        throw new Error('Session expired');
      }

      // Get fresh user data
      const dbUser = await this.prisma.user.findUnique({
        where: { id: payload.userId }
      });

      if (!dbUser || !dbUser.isActive) {
        throw new Error('User not found or inactive');
      }

      const role = dbUser.role as UserRole;
      const permissions = ROLE_PERMISSIONS[role];
      
      const user: User = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name || '',
        role,
        department: dbUser.department || undefined,
        permissions,
        isActive: true,
        teamId: dbUser.teamId || undefined,
        siteId: dbUser.siteId || undefined
      };

      return this.generateTokens(user, payload.sessionId);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user and invalidate session
   */
  async logout(userId: string, sessionId?: string): Promise<void> {
    const userSessions = this.activeSessions.get(userId);
    if (userSessions) {
      if (sessionId) {
        userSessions.delete(sessionId);
      } else {
        // Logout from all sessions
        userSessions.clear();
      }
      
      if (userSessions.size === 0) {
        this.activeSessions.delete(userId);
      }
    }
  }

  /**
   * Check if user has permission
   */
  hasPermission(user: User, permission: Permission): boolean {
    return user.permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified permissions
   */
  hasAnyPermission(user: User, permissions: Permission[]): boolean {
    return permissions.some(permission => user.permissions.includes(permission));
  }

  /**
   * Check if user has all specified permissions
   */
  hasAllPermissions(user: User, permissions: Permission[]): boolean {
    return permissions.every(permission => user.permissions.includes(permission));
  }

  /**
   * Update user permissions (admin only)
   */
  async updateUserRole(userId: string, newRole: UserRole, adminUserId: string): Promise<User> {
    // Verify admin has permission
    const admin = await this.prisma.user.findUnique({
      where: { id: adminUserId }
    });

    if (!admin || (admin.role !== UserRole.SUPER_ADMIN && admin.role !== UserRole.ADMIN)) {
      throw new Error('Insufficient permissions to update user role');
    }

    // Update user role
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    });

    const permissions = ROLE_PERMISSIONS[newRole];

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name || '',
      role: newRole,
      department: updatedUser.department || undefined,
      permissions,
      isActive: true,
      teamId: updatedUser.teamId || undefined,
      siteId: updatedUser.siteId || undefined
    };
  }

  // Private methods

  private generateTokens(user: User, sessionId: string, rememberMe = false): AuthTokens {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      sessionId
    };

    const accessTokenExpiry = rememberMe ? '30d' : this.accessTokenExpiry;
    const refreshTokenExpiry = rememberMe ? '90d' : this.refreshTokenExpiry;

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: accessTokenExpiry
    });

    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
      expiresIn: refreshTokenExpiry
    });

    // Parse expiry time
    const decoded = jwt.decode(accessToken) as JWTPayload;
    const expiresIn = decoded.exp - decoded.iat;

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresIn * 1000, // Convert to milliseconds
      tokenType: 'Bearer'
    };
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }
}

// Singleton instance
export const authService = new AuthService();

export default AuthService;