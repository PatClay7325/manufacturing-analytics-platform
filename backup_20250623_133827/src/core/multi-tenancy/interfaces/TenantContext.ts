/**
 * TenantContext interface defines the contract for accessing and managing
 * tenant context information within the application.
 */
import { Tenant, TenantConfiguration } from './TenantManager';

export interface TenantContextData {
  tenant: Tenant;
  userId?: string;
  sessionId?: string;
  timestamp: Date;
  permissions?: string[];
  isSystemAdmin?: boolean;
}

export interface TenantContext {
  /**
   * Gets the current tenant context
   * @returns The current tenant context or null if not set
   */
  getCurrentContext(): TenantContextData | null;

  /**
   * Sets the current tenant context
   * @param context The tenant context to set
   */
  setCurrentContext(context: TenantContextData): void;

  /**
   * Gets the current tenant
   * @returns The current tenant or null if not set
   */
  getCurrentTenant(): Tenant | null;

  /**
   * Gets the ID of the current tenant
   * @returns The current tenant ID or null if not set
   */
  getCurrentTenantId(): string | null;

  /**
   * Gets configuration for the current tenant
   * @returns The current tenant configuration or null if not set
   */
  getCurrentTenantConfiguration(): TenantConfiguration | null;

  /**
   * Gets a specific configuration value for the current tenant
   * @param key The configuration key
   * @param defaultValue The default value to return if the key is not found
   * @returns The configuration value or the default value
   */
  getConfigValue<T>(key: string, defaultValue?: T): T | undefined;

  /**
   * Checks if a feature is enabled for the current tenant
   * @param featureFlag The feature flag to check
   * @returns True if the feature is enabled, false otherwise
   */
  isFeatureEnabled(featureFlag: string): boolean;

  /**
   * Clears the current tenant context
   */
  clearContext(): void;

  /**
   * Checks if a tenant context is set
   * @returns True if a tenant context is set, false otherwise
   */
  hasContext(): boolean;

  /**
   * Validates if the current user has a specific permission
   * @param permission The permission to check
   * @returns True if the user has the permission, false otherwise
   */
  hasPermission(permission: string): boolean;
}