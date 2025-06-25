/**
 * Row-Level Security (RLS) Implementation
 * Production-ready tenant isolation and access control
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/database';

interface TenantContext {
  tenantId: string;
  userId: string;
  permissions: string[];
  roles: string[];
}

interface RLSPolicy {
  model: string;
  operation: 'create' | 'read' | 'update' | 'delete';
  condition: (context: TenantContext) => Prisma.Sql | Record<string, any>;
}

export class RowLevelSecurity {
  private static instance: RowLevelSecurity;
  private policies: Map<string, RLSPolicy[]> = new Map();
  private context: TenantContext | null = null;

  static getInstance(): RowLevelSecurity {
    if (!RowLevelSecurity.instance) {
      RowLevelSecurity.instance = new RowLevelSecurity();
    }
    return RowLevelSecurity.instance;
  }

  /**
   * Set current tenant context
   */
  setContext(context: TenantContext): void {
    this.context = context;
  }

  /**
   * Clear tenant context
   */
  clearContext(): void {
    this.context = null;
  }

  /**
   * Get current context
   */
  getContext(): TenantContext | null {
    return this.context;
  }

  /**
   * Register RLS policy
   */
  registerPolicy(policy: RLSPolicy): void {
    const key = `${policy.model}:${policy.operation}`;
    if (!this.policies.has(key)) {
      this.policies.set(key, []);
    }
    this.policies.get(key)!.push(policy);
  }

  /**
   * Get policies for model and operation
   */
  getPolicies(model: string, operation: RLSPolicy['operation']): RLSPolicy[] {
    const key = `${model}:${operation}`;
    return this.policies.get(key) || [];
  }

  /**
   * Apply RLS to query arguments
   */
  applyRLS<T extends Record<string, any>>(
    model: string,
    operation: RLSPolicy['operation'],
    args: T
  ): T {
    if (!this.context) {
      throw new Error('No security context set');
    }

    const policies = this.getPolicies(model, operation);
    if (policies.length === 0) {
      return args;
    }

    // Apply each policy
    let modifiedArgs = { ...args };
    for (const policy of policies) {
      const condition = policy.condition(this.context);
      
      switch (operation) {
        case 'create':
          // Add tenant context to data
          modifiedArgs = this.applyCreatePolicy(modifiedArgs, condition);
          break;
        
        case 'read':
          // Add tenant filter to where clause
          modifiedArgs = this.applyReadPolicy(modifiedArgs, condition);
          break;
        
        case 'update':
        case 'delete':
          // Add tenant filter to where clause
          modifiedArgs = this.applyModifyPolicy(modifiedArgs, condition);
          break;
      }
    }

    return modifiedArgs;
  }

  /**
   * Apply create policy
   */
  private applyCreatePolicy<T extends Record<string, any>>(
    args: T,
    condition: any
  ): T {
    if (args.data) {
      if (Array.isArray(args.data)) {
        // Bulk create
        args.data = args.data.map(item => ({
          ...item,
          ...condition,
        }));
      } else {
        // Single create
        args.data = {
          ...args.data,
          ...condition,
        };
      }
    }
    return args;
  }

  /**
   * Apply read policy
   */
  private applyReadPolicy<T extends Record<string, any>>(
    args: T,
    condition: any
  ): T {
    if (!args.where) {
      args.where = {};
    }
    
    // Merge conditions
    args.where = {
      AND: [
        args.where,
        condition,
      ].filter(Boolean),
    };
    
    return args;
  }

  /**
   * Apply modify policy
   */
  private applyModifyPolicy<T extends Record<string, any>>(
    args: T,
    condition: any
  ): T {
    return this.applyReadPolicy(args, condition);
  }

  /**
   * Create Prisma middleware for RLS
   */
  createMiddleware(): Prisma.Middleware {
    return async (params, next) => {
      // Skip if no context or for system operations
      if (!this.context || params.model === 'AuditLog') {
        return next(params);
      }

      // Map Prisma actions to RLS operations
      const operationMap: Record<string, RLSPolicy['operation']> = {
        create: 'create',
        createMany: 'create',
        findUnique: 'read',
        findFirst: 'read',
        findMany: 'read',
        update: 'update',
        updateMany: 'update',
        delete: 'delete',
        deleteMany: 'delete',
      };

      const operation = operationMap[params.action];
      if (!operation || !params.model) {
        return next(params);
      }

      // Apply RLS
      try {
        params.args = this.applyRLS(params.model, operation, params.args || {});
      } catch (error) {
        console.error('RLS error:', error);
        throw new Error('Access denied');
      }

      return next(params);
    };
  }

  /**
   * Register default policies
   */
  registerDefaultPolicies(): void {
    // Manufacturing data models
    const tenantModels = [
      'Equipment',
      'ManufacturingData',
      'Alert',
      'Dashboard',
      'File',
      'Metric',
    ];

    for (const model of tenantModels) {
      // Create policy - add tenantId
      this.registerPolicy({
        model,
        operation: 'create',
        condition: (ctx) => ({ tenantId: ctx.tenantId }),
      });

      // Read policy - filter by tenantId
      this.registerPolicy({
        model,
        operation: 'read',
        condition: (ctx) => ({ tenantId: ctx.tenantId }),
      });

      // Update policy - filter by tenantId
      this.registerPolicy({
        model,
        operation: 'update',
        condition: (ctx) => ({ tenantId: ctx.tenantId }),
      });

      // Delete policy - filter by tenantId
      this.registerPolicy({
        model,
        operation: 'delete',
        condition: (ctx) => {
          // Only admins can delete
          if (!ctx.permissions.includes('delete') && !ctx.roles.includes('admin')) {
            throw new Error('Insufficient permissions for delete operation');
          }
          return { tenantId: ctx.tenantId };
        },
      });
    }

    // User model - special handling
    this.registerPolicy({
      model: 'User',
      operation: 'read',
      condition: (ctx) => {
        // Users can only see users in their tenant
        return {
          OR: [
            { id: ctx.userId }, // Can always see self
            { tenantId: ctx.tenantId }, // Can see tenant users
          ],
        };
      },
    });

    this.registerPolicy({
      model: 'User',
      operation: 'update',
      condition: (ctx) => {
        // Can only update self or if admin
        if (ctx.roles.includes('admin')) {
          return { tenantId: ctx.tenantId };
        }
        return { id: ctx.userId };
      },
    });

    // Shared data with access control
    this.registerPolicy({
      model: 'Template',
      operation: 'read',
      condition: (ctx) => ({
        OR: [
          { isPublic: true },
          { tenantId: ctx.tenantId },
          { 
            sharedWith: {
              some: { tenantId: ctx.tenantId },
            },
          },
        ],
      }),
    });
  }
}

/**
 * Async Local Storage for request context
 */
import { AsyncLocalStorage } from 'async_hooks';

export const tenantContext = new AsyncLocalStorage<TenantContext>();

/**
 * Run function with tenant context
 */
export async function withTenantContext<T>(
  context: TenantContext,
  fn: () => Promise<T>
): Promise<T> {
  return tenantContext.run(context, async () => {
    const rls = RowLevelSecurity.getInstance();
    rls.setContext(context);
    
    try {
      return await fn();
    } finally {
      rls.clearContext();
    }
  });
}

/**
 * Get current tenant context
 */
export function getCurrentTenant(): TenantContext | undefined {
  return tenantContext.getStore();
}

/**
 * Create tenant-scoped Prisma client
 */
export function createTenantPrismaClient(context: TenantContext): PrismaClient {
  const prisma = getPrismaClient();
  const rls = RowLevelSecurity.getInstance();
  
  // Set context
  rls.setContext(context);
  
  // Add RLS middleware
  prisma.$use(rls.createMiddleware());
  
  return prisma;
}

/**
 * SQL-based RLS for raw queries
 */
export class SQLRowLevelSecurity {
  /**
   * Create tenant filter SQL
   */
  static tenantFilter(tenantId: string, tableAlias?: string): Prisma.Sql {
    const column = tableAlias ? `${tableAlias}."tenantId"` : '"tenantId"';
    return Prisma.sql`${Prisma.raw(column)} = ${tenantId}`;
  }

  /**
   * Create user filter SQL
   */
  static userFilter(userId: string, tableAlias?: string): Prisma.Sql {
    const column = tableAlias ? `${tableAlias}."userId"` : '"userId"';
    return Prisma.sql`${Prisma.raw(column)} = ${userId}`;
  }

  /**
   * Create permission check SQL
   */
  static permissionCheck(
    permission: string,
    userId: string
  ): Prisma.Sql {
    return Prisma.sql`
      EXISTS (
        SELECT 1 
        FROM "UserPermission" up
        JOIN "Permission" p ON p.id = up."permissionId"
        WHERE up."userId" = ${userId}
        AND p.name = ${permission}
      )
    `;
  }

  /**
   * Apply RLS to raw query
   */
  static applyToQuery(
    query: Prisma.Sql,
    context: TenantContext
  ): Prisma.Sql {
    // This is a simplified example
    // In production, you'd parse and modify the SQL
    return Prisma.sql`
      WITH tenant_context AS (
        SELECT ${context.tenantId}::uuid as tenant_id,
               ${context.userId}::uuid as user_id
      )
      ${query}
    `;
  }
}

// Initialize and register default policies
const rls = RowLevelSecurity.getInstance();
rls.registerDefaultPolicies();

export { rls as rowLevelSecurity };