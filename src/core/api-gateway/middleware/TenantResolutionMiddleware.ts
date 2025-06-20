/**
 * Tenant Resolution Middleware
 * 
 * This middleware is responsible for resolving tenant information from
 * incoming API requests and setting the tenant context.
 */

import { TenantResolver, TenantIdentificationContext } from './multi-tenancy/interfaces/TenantResolver';
import { TenantContext } from './multi-tenancy/interfaces/TenantContext';
import { ApiRequest, ApiResponse } from './types';

/**
 * Tenant resolution middleware
 */
export class TenantResolutionMiddleware {
  /**
   * Constructor
   * @param tenantResolver Tenant resolver
   * @param tenantContext Tenant context
   */
  constructor(
    private readonly tenantResolver: TenantResolver,
    private readonly tenantContext: TenantContext
  ) {}
  
  /**
   * Middleware handler function
   * @param req API request
   * @param res API response
   * @param next Next middleware function
   */
  public async handle(
    req: ApiRequest,
    res: ApiResponse,
    next: () => Promise<void>
  ): Promise<void> {
    try {
      // Extract tenant identification context from request
      const context: TenantIdentificationContext = {
        url: req.url,
        path: req.path,
        headers: req.headers,
        authToken: req.headers['authorization']?.replace(/^Bearer\s+/, ''),
        subdomain: this.extractSubdomain(req.headers['host'] || '')
      };
      
      // Resolve tenant
      const resolution = await this.tenantResolver.resolveTenant(context);
      
      if (!resolution.tenantId || !resolution.tenant) {
        // No tenant found, respond with error
        res.error(400, 'Tenant Resolution Failed', resolution.error || 'Unable to resolve tenant');
        return;
      }
      
      // Set tenant context
      this.tenantContext.setCurrentContext({
        tenant: resolution.tenant,
        userId: req.user?.id,
        sessionId: req.id,
        timestamp: new Date(),
        permissions: req.((user?.permissions || [])),
        isSystemAdmin: req.user?.isSystemAdmin || false
      });
      
      // Attach tenant info to request for future use
      req.tenant = resolution.tenant;
      req.tenantId = resolution.tenant.id;
      
      // Continue to next middleware
      await next();
    } catch (error) {
      console.error(`Tenant resolution error: ${error instanceof Error ? error.message : String(error)}`);
      
      // Clear tenant context
      this.tenantContext.clearContext();
      
      // Respond with error
      res.error(500, 'Tenant Resolution Error', 'An error occurred while resolving tenant information');
    } finally {
      // Always clear tenant context after request completes
      // This ensures tenant context doesn't leak between requests
      this.tenantContext.clearContext();
    }
  }
  
  /**
   * Extract subdomain from host
   * @param host Host string
   */
  private extractSubdomain(host: string): string | undefined {
    if (!host || !host.includes('.')) {
      return undefined;
    }
    
    const parts = host.split('.');
    
    // Check if we have a subdomain
    if (parts.length < 3) {
      return undefined;
    }
    
    return parts[0];
  }
}