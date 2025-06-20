/**
 * Implementation of the TenantResolver interface for resolving tenant information
 * from 
 */
import { Tenant } from './interfaces/TenantManager';
import {
  TenantIdentificationContext,
  TenantResolutionResult,
  TenantResolver
} from './interfaces/TenantResolver';

export class TenantResolverImpl implements TenantResolver {
  private defaultTenantId: string | null = null;
  
  constructor(
    private tenantManager: any, // Replace with actual TenantManager interface
    private tokenService: any, // Replace with actual token service interface
    private configService: any, // Replace with actual config service interface
  ) {
    // Initialize default tenant ID from configuration
    this.defaultTenantId = this.configService.get('defaultTenant', null);
  }

  async resolveTenant(context: TenantIdentificationContext): Promise<TenantResolutionResult> {
    let tenantId: string | null = null;
    let source: TenantResolutionResult['source'] = 'unknown';
    
    // Try to resolve from path
    if (context.path) {
      tenantId = await this.resolveFromPath(context.path);
      if (tenantId) {
        source = 'path';
      }
    }
    
    // If not found, try to resolve from subdomain
    if (!tenantId && context.subdomain) {
      tenantId = await this.resolveFromSubdomain(context.subdomain);
      if (tenantId) {
        source = 'subdomain';
      }
    }
    
    // If not found, try to resolve from headers
    if (!tenantId && context.headers) {
      tenantId = await this.resolveFromHeaders(context.headers);
      if (tenantId) {
        source = 'header';
      }
    }
    
    // If not found, try to resolve from token
    if (!tenantId && context.authToken) {
      tenantId = await this.resolveFromToken(context.authToken);
      if (tenantId) {
        source = 'token';
      }
    }
    
    // If not found, try to resolve from environment variables
    if (!tenantId && context.environmentVariables) {
      tenantId = await this.resolveFromEnvironment(context.environmentVariables);
      if (tenantId) {
        source = 'environment';
      }
    }
    
    // If still not found, use default tenant
    if (!tenantId) {
      tenantId = await this.getDefaultTenant();
      if (tenantId) {
        source = 'default';
      }
    }
    
    // Determine if authenticated
    const isAuthenticated = !!context.authToken;
    
    // If we have a tenant ID, validate it and fetch the tenant
    let tenant: Tenant | undefined;
    let error: string | undefined;
    
    if (tenantId) {
      const isValid = await this.validateTenant(tenantId);
      
      if (isValid) {
        const fetchedTenant = await this.tenantManager.getTenantById(tenantId);
        if (fetchedTenant) {
          tenant = fetchedTenant;
        } else {
          error = `Tenant with ID ${tenantId} not found`;
        }
      } else {
        error = `Tenant with ID ${tenantId} is not valid or active`;
      }
    } else {
      error = 'No tenant could be resolved';
    }
    
    return {
      tenantId,
      source,
      isAuthenticated,
      tenant,
      error
    };
  }

  async resolveFromPath(path: string): Promise<string | null> {
    // Extract tenant ID from path using regex
    // Example pattern: /tenants/{tenantId}/resources
    const tenantPathRegex = /\/tenants\/([^/]+)/;
    const match = path.match(tenantPathRegex);
    
    if (match && match[1]) {
      return match[1];
    }
    
    return null;
  }

  async resolveFromSubdomain(host: string): Promise<string | null> {
    // Extract tenant ID from subdomain
    // Example pattern: {tenantId}.example.com
    const baseHostname = this.configService.get('baseHostname', '');
    
    if (!baseHostname || !host.includes('.')) {
      return null;
    }
    
    if (host === baseHostname) {
      return null; // No subdomain
    }
    
    if (host.endsWith(`.${baseHostname}`)) {
      return host.substring(0, host.length - baseHostname.length - 1);
    }
    
    return null;
  }

  async resolveFromHeaders(headers: Record<string, string>): Promise<string | null> {
    // Check for tenant ID in headers
    const tenantHeader = this.configService.get('tenantHeader', 'X-Tenant-ID');
    
    if (headers[tenantHeader]) {
      return headers[tenantHeader];
    }
    
    return null;
  }

  async resolveFromToken(token: string): Promise<string | null> {
    try {
      // Verify and decode the token
      const decoded = await this.tokenService.verifyToken(token);
      
      // Extract tenant ID from token payload
      if (decoded && decoded.tenantId) {
        return decoded.tenantId;
      }
      
      return null;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  async resolveFromEnvironment(env: Record<string, string>): Promise<string | null> {
    // Check for tenant ID in environment variables
    const tenantEnvVar = this.configService.get('tenantEnvironmentVariable', 'TENANT_ID');
    
    if (env[tenantEnvVar]) {
      return env[tenantEnvVar];
    }
    
    return null;
  }

  async getDefaultTenant(): Promise<string | null> {
    return this.defaultTenantId;
  }

  async validateTenant(tenantId: string): Promise<boolean> {
    try {
      const tenant = await this.tenantManager.getTenantById(tenantId);
      
      // Check if tenant exists and is active
      return !!tenant && tenant.status === 'active';
    } catch (error) {
      console.error(`Error validating tenant ${tenantId}:`, error);
      return false;
    }
  }
}