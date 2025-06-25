/**
 * Tenant Resolution Interfaces
 */

export interface TenantIdentificationContext {
  url: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  authToken?: string;
  subdomain?: string;
}

export interface TenantResolutionResult {
  tenantId?: string;
  tenant?: Tenant;
  error?: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  settings: Record<string, any>;
}

export interface TenantResolver {
  resolveTenant(context: TenantIdentificationContext): Promise<TenantResolutionResult>;
}