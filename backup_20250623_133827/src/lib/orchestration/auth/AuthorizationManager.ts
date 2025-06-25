/**
 * Role-based authorization manager for workflow orchestration
 * Provides fine-grained access control with hierarchical permissions
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { AuditTrail } from '../audit/AuditTrail';

export enum Permission {
  // Workflow Definition Permissions
  WORKFLOW_CREATE = 'workflow.create',
  WORKFLOW_READ = 'workflow.read',
  WORKFLOW_UPDATE = 'workflow.update',
  WORKFLOW_DELETE = 'workflow.delete',
  WORKFLOW_EXECUTE = 'workflow.execute',
  
  // Execution Permissions
  EXECUTION_VIEW = 'execution.view',
  EXECUTION_CANCEL = 'execution.cancel',
  EXECUTION_RETRY = 'execution.retry',
  
  // Administrative Permissions
  ADMIN_MANAGE_USERS = 'admin.manage_users',
  ADMIN_MANAGE_ROLES = 'admin.manage_roles',
  ADMIN_VIEW_AUDIT = 'admin.view_audit',
  ADMIN_SYSTEM_CONFIG = 'admin.system_config',
  
  // Data Permissions
  DATA_READ_SENSITIVE = 'data.read_sensitive',
  DATA_EXPORT = 'data.export',
  
  // Agent Permissions
  AGENT_EXECUTE = 'agent.execute',
  AGENT_CONFIGURE = 'agent.configure',
}

export enum Role {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  WORKFLOW_DESIGNER = 'workflow_designer',
  WORKFLOW_OPERATOR = 'workflow_operator',
  VIEWER = 'viewer',
  GUEST = 'guest',
}

export interface User {
  id: string;
  username: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
  organizationId?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

export interface AuthorizationContext {
  userId: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  organizationId?: string;
  resourceContext?: {
    workflowId?: string;
    executionId?: string;
    ownerId?: string;
  };
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: Permission[];
  missingPermissions?: Permission[];
}

export class AuthorizationManager {
  private static instance: AuthorizationManager;
  private auditTrail: AuditTrail;
  private rolePermissions: Map<Role, Permission[]>;
  
  constructor() {
    this.auditTrail = AuditTrail.getInstance();
    this.rolePermissions = new Map();
    this.initializeRolePermissions();
  }

  static getInstance(): AuthorizationManager {
    if (!AuthorizationManager.instance) {
      AuthorizationManager.instance = new AuthorizationManager();
    }
    return AuthorizationManager.instance;
  }

  /**
   * Check if user has permission to perform action
   */
  async authorize(
    context: AuthorizationContext,
    requiredPermissions: Permission | Permission[],
    resource?: string
  ): Promise<AuthorizationResult> {
    const permissions = Array.isArray(requiredPermissions) 
      ? requiredPermissions 
      : [requiredPermissions];

    try {
      // Get user with roles and permissions
      const user = await this.getUser(context.userId);
      if (!user) {
        await this.auditTrail.logAuthorizationDenied(
          context.userId,
          permissions.join(','),
          resource || 'unknown',
          'User not found',
          context.ipAddress
        );
        return {
          allowed: false,
          reason: 'User not found',
          requiredPermissions: permissions,
          missingPermissions: permissions,
        };
      }

      // Check if user is active
      if (!user.isActive) {
        await this.auditTrail.logAuthorizationDenied(
          context.userId,
          permissions.join(','),
          resource || 'unknown',
          'User account is inactive',
          context.ipAddress
        );
        return {
          allowed: false,
          reason: 'User account is inactive',
          requiredPermissions: permissions,
          missingPermissions: permissions,
        };
      }

      // Get all user permissions (role-based + direct)
      const userPermissions = await this.getUserPermissions(user);

      // Check required permissions
      const missingPermissions = permissions.filter(
        permission => !userPermissions.includes(permission)
      );

      if (missingPermissions.length > 0) {
        await this.auditTrail.logAuthorizationDenied(
          context.userId,
          permissions.join(','),
          resource || 'unknown',
          `Missing permissions: ${missingPermissions.join(', ')}`,
          context.ipAddress
        );
        return {
          allowed: false,
          reason: `Missing permissions: ${missingPermissions.join(', ')}`,
          requiredPermissions: permissions,
          missingPermissions,
        };
      }

      // Check resource-specific access
      if (context.resourceContext) {
        const resourceAccess = await this.checkResourceAccess(user, context.resourceContext);
        if (!resourceAccess.allowed) {
          await this.auditTrail.logAuthorizationDenied(
            context.userId,
            permissions.join(','),
            resource || 'unknown',
            resourceAccess.reason || 'Resource access denied',
            context.ipAddress
          );
          return resourceAccess;
        }
      }

      // Log successful authorization for sensitive operations
      if (this.isSensitiveOperation(permissions)) {
        await this.auditTrail.logDataAccess(
          context.userId,
          'authorization',
          resource || 'system',
          permissions.join(','),
          true
        );
      }

      return {
        allowed: true,
        requiredPermissions: permissions,
      };

    } catch (error) {
      logger.error({
        error,
        userId: context.userId,
        permissions,
        resource,
      }, 'Authorization check failed');

      await this.auditTrail.logAuthorizationDenied(
        context.userId,
        permissions.join(','),
        resource || 'unknown',
        'Authorization system error',
        context.ipAddress
      );

      return {
        allowed: false,
        reason: 'Authorization system error',
        requiredPermissions: permissions,
        missingPermissions: permissions,
      };
    }
  }

  /**
   * Check authorization and throw error if denied
   */
  async requirePermission(
    context: AuthorizationContext,
    requiredPermissions: Permission | Permission[],
    resource?: string
  ): Promise<void> {
    const result = await this.authorize(context, requiredPermissions, resource);
    if (!result.allowed) {
      throw new Error(`Access denied: ${result.reason}`);
    }
  }

  /**
   * Check if user can access workflow
   */
  async canAccessWorkflow(
    userId: string,
    workflowId: string,
    action: 'read' | 'execute' | 'update' | 'delete'
  ): Promise<boolean> {
    const permissionMap = {
      read: Permission.WORKFLOW_READ,
      execute: Permission.WORKFLOW_EXECUTE,
      update: Permission.WORKFLOW_UPDATE,
      delete: Permission.WORKFLOW_DELETE,
    };

    const result = await this.authorize(
      { userId, resourceContext: { workflowId } },
      permissionMap[action],
      `workflow:${workflowId}`
    );

    return result.allowed;
  }

  /**
   * Check if user can access execution
   */
  async canAccessExecution(
    userId: string,
    executionId: string,
    action: 'view' | 'cancel' | 'retry'
  ): Promise<boolean> {
    const permissionMap = {
      view: Permission.EXECUTION_VIEW,
      cancel: Permission.EXECUTION_CANCEL,
      retry: Permission.EXECUTION_RETRY,
    };

    const result = await this.authorize(
      { userId, resourceContext: { executionId } },
      permissionMap[action],
      `execution:${executionId}`
    );

    return result.allowed;
  }

  /**
   * Get user with roles and permissions
   */
  async getUser(userId: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        username: user.username || '',
        email: user.email || '',
        roles: user.roles.map(ur => ur.role.name as Role),
        permissions: user.permissions.map(up => up.permission.name as Permission),
        organizationId: user.organizationId || undefined,
        isActive: user.isActive || false,
        lastLoginAt: user.lastLoginAt || undefined,
        createdAt: user.createdAt,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get user');
      return null;
    }
  }

  /**
   * Get all permissions for user (role-based + direct)
   */
  async getUserPermissions(user: User): Promise<Permission[]> {
    const rolePermissions = user.roles.flatMap(
      role => this.rolePermissions.get(role) || []
    );
    
    const allPermissions = new Set([
      ...rolePermissions,
      ...user.permissions,
    ]);

    return Array.from(allPermissions);
  }

  /**
   * Assign role to user
   */
  async assignRole(
    adminUserId: string,
    targetUserId: string,
    role: Role
  ): Promise<void> {
    // Check admin permissions
    await this.requirePermission(
      { userId: adminUserId },
      Permission.ADMIN_MANAGE_USERS
    );

    try {
      await prisma.userRole.create({
        data: {
          userId: targetUserId,
          roleId: role,
        },
      });

      logger.info({
        adminUserId,
        targetUserId,
        role,
      }, 'Role assigned to user');

    } catch (error) {
      logger.error({
        error,
        adminUserId,
        targetUserId,
        role,
      }, 'Failed to assign role');
      throw error;
    }
  }

  /**
   * Remove role from user
   */
  async removeRole(
    adminUserId: string,
    targetUserId: string,
    role: Role
  ): Promise<void> {
    // Check admin permissions
    await this.requirePermission(
      { userId: adminUserId },
      Permission.ADMIN_MANAGE_USERS
    );

    try {
      await prisma.userRole.delete({
        where: {
          userId_roleId: {
            userId: targetUserId,
            roleId: role,
          },
        },
      });

      logger.info({
        adminUserId,
        targetUserId,
        role,
      }, 'Role removed from user');

    } catch (error) {
      logger.error({
        error,
        adminUserId,
        targetUserId,
        role,
      }, 'Failed to remove role');
      throw error;
    }
  }

  /**
   * Grant direct permission to user
   */
  async grantPermission(
    adminUserId: string,
    targetUserId: string,
    permission: Permission
  ): Promise<void> {
    // Check admin permissions
    await this.requirePermission(
      { userId: adminUserId },
      Permission.ADMIN_MANAGE_USERS
    );

    try {
      await prisma.userPermission.create({
        data: {
          userId: targetUserId,
          permissionId: permission,
        },
      });

      logger.info({
        adminUserId,
        targetUserId,
        permission,
      }, 'Permission granted to user');

    } catch (error) {
      logger.error({
        error,
        adminUserId,
        targetUserId,
        permission,
      }, 'Failed to grant permission');
      throw error;
    }
  }

  /**
   * Revoke direct permission from user
   */
  async revokePermission(
    adminUserId: string,
    targetUserId: string,
    permission: Permission
  ): Promise<void> {
    // Check admin permissions
    await this.requirePermission(
      { userId: adminUserId },
      Permission.ADMIN_MANAGE_USERS
    );

    try {
      await prisma.userPermission.delete({
        where: {
          userId_permissionId: {
            userId: targetUserId,
            permissionId: permission,
          },
        },
      });

      logger.info({
        adminUserId,
        targetUserId,
        permission,
      }, 'Permission revoked from user');

    } catch (error) {
      logger.error({
        error,
        adminUserId,
        targetUserId,
        permission,
      }, 'Failed to revoke permission');
      throw error;
    }
  }

  /**
   * Check resource-specific access
   */
  private async checkResourceAccess(
    user: User,
    resourceContext: NonNullable<AuthorizationContext['resourceContext']>
  ): Promise<AuthorizationResult> {
    // Check workflow ownership/organization access
    if (resourceContext.workflowId) {
      const workflow = await prisma.workflowDefinition.findUnique({
        where: { id: resourceContext.workflowId },
        select: { 
          createdBy: true,
          organizationId: true,
        },
      });

      if (workflow) {
        // Owner always has access
        if (workflow.createdBy === user.id) {
          return { allowed: true };
        }

        // Organization members have access if same organization
        if (workflow.organizationId && workflow.organizationId === user.organizationId) {
          return { allowed: true };
        }

        // Super admins always have access
        if (user.roles.includes(Role.SUPER_ADMIN)) {
          return { allowed: true };
        }

        return {
          allowed: false,
          reason: 'Insufficient access to workflow resource',
        };
      }
    }

    // Check execution ownership/organization access
    if (resourceContext.executionId) {
      const execution = await prisma.workflowExecution.findUnique({
        where: { id: resourceContext.executionId },
        include: {
          workflow: {
            select: {
              createdBy: true,
              organizationId: true,
            },
          },
        },
      });

      if (execution?.workflow) {
        // Owner or execution initiator has access
        if (execution.workflow.createdBy === user.id || 
            execution.context?.userId === user.id) {
          return { allowed: true };
        }

        // Organization members have access if same organization
        if (execution.workflow.organizationId && 
            execution.workflow.organizationId === user.organizationId) {
          return { allowed: true };
        }

        // Super admins always have access
        if (user.roles.includes(Role.SUPER_ADMIN)) {
          return { allowed: true };
        }

        return {
          allowed: false,
          reason: 'Insufficient access to execution resource',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if operation is considered sensitive
   */
  private isSensitiveOperation(permissions: Permission[]): boolean {
    const sensitivePermissions = [
      Permission.ADMIN_MANAGE_USERS,
      Permission.ADMIN_MANAGE_ROLES,
      Permission.ADMIN_VIEW_AUDIT,
      Permission.ADMIN_SYSTEM_CONFIG,
      Permission.DATA_READ_SENSITIVE,
      Permission.DATA_EXPORT,
      Permission.WORKFLOW_DELETE,
    ];

    return permissions.some(permission => 
      sensitivePermissions.includes(permission)
    );
  }

  /**
   * Initialize role-permission mappings
   */
  private initializeRolePermissions(): void {
    this.rolePermissions.set(Role.SUPER_ADMIN, [
      ...Object.values(Permission), // All permissions
    ]);

    this.rolePermissions.set(Role.ADMIN, [
      Permission.WORKFLOW_CREATE,
      Permission.WORKFLOW_READ,
      Permission.WORKFLOW_UPDATE,
      Permission.WORKFLOW_DELETE,
      Permission.WORKFLOW_EXECUTE,
      Permission.EXECUTION_VIEW,
      Permission.EXECUTION_CANCEL,
      Permission.EXECUTION_RETRY,
      Permission.ADMIN_MANAGE_USERS,
      Permission.ADMIN_VIEW_AUDIT,
      Permission.DATA_EXPORT,
      Permission.AGENT_EXECUTE,
      Permission.AGENT_CONFIGURE,
    ]);

    this.rolePermissions.set(Role.WORKFLOW_DESIGNER, [
      Permission.WORKFLOW_CREATE,
      Permission.WORKFLOW_READ,
      Permission.WORKFLOW_UPDATE,
      Permission.WORKFLOW_EXECUTE,
      Permission.EXECUTION_VIEW,
      Permission.EXECUTION_CANCEL,
      Permission.EXECUTION_RETRY,
      Permission.AGENT_EXECUTE,
    ]);

    this.rolePermissions.set(Role.WORKFLOW_OPERATOR, [
      Permission.WORKFLOW_READ,
      Permission.WORKFLOW_EXECUTE,
      Permission.EXECUTION_VIEW,
      Permission.EXECUTION_CANCEL,
      Permission.AGENT_EXECUTE,
    ]);

    this.rolePermissions.set(Role.VIEWER, [
      Permission.WORKFLOW_READ,
      Permission.EXECUTION_VIEW,
    ]);

    this.rolePermissions.set(Role.GUEST, [
      // No permissions by default
    ]);
  }
}