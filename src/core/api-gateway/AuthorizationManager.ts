/**
 * Authorization Manager Implementation
 * 
 * This class implements the AuthorizationManager interface and provides
 * functionality for API authorization with multi-tenant support.
 */

import { AbstractBaseService } from '../architecture/BaseService';
import { AuthorizationManager } from './interfaces';
import { ApiRequest, ApiRoute } from './types';
import { TenantContext } from '../multi-tenancy/interfaces/TenantContext';

/**
 * Authorization manager implementation
 */
export class AuthorizationManagerImpl extends AbstractBaseService implements AuthorizationManager {
  /**
   * Tenant context for multi-tenancy support
   */
  private tenantContext?: TenantContext;
  
  /**
   * Tenant-specific role mappings
   */
  private tenantRoleMappings: Map<string, Map<string, Set<string>>> = new Map();
  
  /**
   * Create a new authorization manager
   * @param tenantContext Optional tenant context
   */
  constructor(tenantContext?: TenantContext) {
    super('AuthorizationManager', '1.0.0');
    
    if (tenantContext) {
      this.tenantContext = tenantContext;
    }
  }
  
  /**
   * Set the tenant context
   * @param tenantContext Tenant context
   */
  public setTenantContext(tenantContext: TenantContext): void {
    this.tenantContext = tenantContext;
  }
  
  /**
   * Register tenant-specific role mappings
   * @param tenantId Tenant ID
   * @param roleMappings Role mappings
   */
  public registerTenantRoleMappings(
    tenantId: string, 
    roleMappings: Record<string, string[]>
  ): void {
    // Initialize tenant role mappings map if needed
    if (!this.tenantRoleMappings.has(tenantId)) {
      this.tenantRoleMappings.set(tenantId, new Map());
    }
    
    const tenantMap = this.tenantRoleMappings.get(tenantId)!;
    
    // Register each role mapping
    for (const [role, includedRoles] of Object.entries(roleMappings)) {
      const roleSet = new Set<string>(includedRoles);
      // Always include the role itself
      roleSet.add(role);
      tenantMap.set(role, roleSet);
    }
  }
  
  /**
   * Initialize the manager
   */
  protected async doInitialize(): Promise<void> {
    console.log('Authorization manager initialized');
  }
  
  /**
   * Start the manager
   */
  protected async doStart(): Promise<void> {
    console.log('Authorization manager started');
  }
  
  /**
   * Stop the manager
   */
  protected async doStop(): Promise<void> {
    console.log('Authorization manager stopped');
  }
  
  /**
   * Authorize a request
   * @param req API request
   * @param route API route
   */
  public async authorize(req: ApiRequest, route: ApiRoute): Promise<boolean> {
    // If route doesn't require authentication, allow
    if (!route.requiresAuth) {
      return true;
    }
    
    // If no user in request, deny
    if (!req.user) {
      return false;
    }
    
    // If route doesn't require specific roles, allow
    if (!route.requiredRoles || route.requiredRoles.length === 0) {
      return true;
    }
    
    // Get tenant ID from request or current context
    const tenantId = req.tenantId || 
                     req.user.tenantId || 
                     this.tenantContext?.getCurrentTenantId();
    
    // Check if user has any of the required roles
    return this.hasAnyRole(req.user, route.requiredRoles, tenantId);
  }
  
  /**
   * Check if a user has a role
   * @param user User information
   * @param role Role to check
   * @param tenantId Optional tenant ID
   */
  public hasRole(user: any, role: string, tenantId?: string): boolean {
    if (!user || !user.roles) {
      return false;
    }
    
    // If system admin, always allow
    if (user.isSystemAdmin) {
      return true;
    }
    
    // Direct role check
    if (user.roles.includes(role)) {
      return true;
    }
    
    // Check tenant-specific role mappings if tenant ID is provided
    if (tenantId && this.tenantRoleMappings.has(tenantId)) {
      const tenantMap = this.tenantRoleMappings.get(tenantId)!;
      
      // Check each user role against the mappings
      for (const userRole of user.roles) {
        if (tenantMap.has(userRole)) {
          const mappedRoles = tenantMap.get(userRole)!;
          if (mappedRoles.has(role)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * Check if a user has any of the required roles
   * @param user User information
   * @param roles Roles to check
   * @param tenantId Optional tenant ID
   */
  public hasAnyRole(user: any, roles: string[], tenantId?: string): boolean {
    if (!user || !user.roles || roles.length === 0) {
      return false;
    }
    
    // If system admin, always allow
    if (user.isSystemAdmin) {
      return true;
    }
    
    // Check each required role
    return roles.some(role => this.hasRole(user, role, tenantId));
  }
  
  /**
   * Check if a user has all of the required roles
   * @param user User information
   * @param roles Roles to check
   * @param tenantId Optional tenant ID
   */
  public hasAllRoles(user: any, roles: string[], tenantId?: string): boolean {
    if (!user || !user.roles || roles.length === 0) {
      return false;
    }
    
    // If system admin, always allow
    if (user.isSystemAdmin) {
      return true;
    }
    
    // Check each required role
    return roles.every(role => this.hasRole(user, role, tenantId));
  }
}