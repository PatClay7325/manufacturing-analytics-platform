/**
 * TenantResolver interface defines the contract for resolving tenant information
 * from various sources like HTTP requests, authentication tokens, or environment variables.
 */
import { Tenant } from './TenantManager';

export interface TenantIdentificationContext {
  url?: string;
  path?: string;
  subdomain?: string;
  headers?: Record<string, string>;
  authToken?: string;
  environmentVariables?: Record<string, string>;
  userId?: string;
}

export interface TenantResolutionResult {
  tenantId: string | null;
  source: 'url' | 'path' | 'subdomain' | 'header' | 'token' | 'environment' | 'default' | 'unknown';
  isAuthenticated: boolean;
  tenant?: Tenant;
  error?: string;
}

export interface TenantResolver {
  /**
   * Resolves tenant information from the provided context
   * @param context The context containing potential tenant identifiers
   * @returns Tenant resolution result with identified tenant information
   */
  resolveTenant(context: TenantIdentificationContext): Promise<TenantResolutionResult>;

  /**
   * Resolves tenant from URL path pattern (e.g., /tenants/{tenantId}/resources)
   * @param path The URL path to parse
   * @returns Tenant ID if found, null otherwise
   */
  resolveFromPath(path: string): Promise<string | null>;

  /**
   * Resolves tenant from subdomain (e.g., {tenantId}.example.com)
   * @param host The host string from the request
   * @returns Tenant ID if found, null otherwise
   */
  resolveFromSubdomain(host: string): Promise<string | null>;

  /**
   * Resolves tenant from request headers (e.g., X-Tenant-ID)
   * @param headers The request headers
   * @returns Tenant ID if found, null otherwise
   */
  resolveFromHeaders(headers: Record<string, string>): Promise<string | null>;

  /**
   * Resolves tenant from authentication token
   * @param token The authentication token
   * @returns Tenant ID if found, null otherwise
   */
  resolveFromToken(token: string): Promise<string | null>;

  /**
   * Resolves tenant from environment variables
   * @param env The environment variables
   * @returns Tenant ID if found, null otherwise
   */
  resolveFromEnvironment(env: Record<string, string>): Promise<string | null>;

  /**
   * Gets the default tenant for the system
   * @returns Default tenant ID if available, null otherwise
   */
  getDefaultTenant(): Promise<string | null>;

  /**
   * Validates if a tenant ID exists and is active
   * @param tenantId The tenant ID to validate
   * @returns True if valid, false otherwise
   */
  validateTenant(tenantId: string): Promise<boolean>;
}