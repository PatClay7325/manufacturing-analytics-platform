/**
 * TenantService interface defines the contract for tenant-related operations
 * that can be performed by the application.
 */
import { Tenant, TenantConfiguration } from '../interfaces/TenantManager';
import { TenantIdentificationContext, TenantResolutionResult } from '../interfaces/TenantResolver';
import { TenantContextData } from '../interfaces/TenantContext';

export interface TenantRegistrationData {
  name: string;
  isolationModel: 'database' | 'schema' | 'shared' | 'hybrid';
  adminEmail: string;
  adminName: string;
  initialConfig?: Partial<TenantConfiguration>;
}

export interface TenantServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface TenantService {
  /**
   * Registers a new tenant in the system
   * @param data The tenant registration data
   * @returns Result containing the created tenant if successful
   */
  registerTenant(data: TenantRegistrationData): Promise<TenantServiceResult<Tenant>>;

  /**
   * Updates an existing tenant
   * @param tenantId The ID of the tenant to update
   * @param data The data to update
   * @returns Result containing the updated tenant if successful
   */
  updateTenant(tenantId: string, data: Partial<Tenant>): Promise<TenantServiceResult<Tenant>>;

  /**
   * Resolves tenant information from the provided context
   * @param context The context containing potential tenant identifiers
   * @returns Result containing the resolved tenant information
   */
  resolveTenant(context: TenantIdentificationContext): Promise<TenantServiceResult<TenantResolutionResult>>;

  /**
   * Sets the current tenant context
   * @param tenantId The ID of the tenant to set as current
   * @param userId Optional user ID to include in the context
   * @returns Result indicating if the operation was successful
   */
  setCurrentTenant(tenantId: string, userId?: string): Promise<TenantServiceResult<TenantContextData>>;

  /**
   * Gets the current tenant context
   * @returns Result containing the current tenant context if set
   */
  getCurrentTenant(): Promise<TenantServiceResult<TenantContextData>>;

  /**
   * Clears the current tenant context
   * @returns Result indicating if the operation was successful
   */
  clearCurrentTenant(): Promise<TenantServiceResult<void>>;

  /**
   * Checks if a feature is enabled for a tenant
   * @param tenantId The ID of the tenant
   * @param featureFlag The feature flag to check
   * @returns Result containing whether the feature is enabled
   */
  isFeatureEnabled(tenantId: string, featureFlag: string): Promise<TenantServiceResult<boolean>>;

  /**
   * Updates configuration for a tenant
   * @param tenantId The ID of the tenant
   * @param config The configuration to update
   * @returns Result containing the updated tenant if successful
   */
  updateTenantConfiguration(tenantId: string, config: Partial<TenantConfiguration>): Promise<TenantServiceResult<Tenant>>;

  /**
   * Deactivates a tenant
   * @param tenantId The ID of the tenant to deactivate
   * @returns Result indicating if the operation was successful
   */
  deactivateTenant(tenantId: string): Promise<TenantServiceResult<boolean>>;

  /**
   * Activates a tenant
   * @param tenantId The ID of the tenant to activate
   * @returns Result indicating if the operation was successful
   */
  activateTenant(tenantId: string): Promise<TenantServiceResult<boolean>>;

  /**
   * Gets a list of all tenants
   * @param includeInactive Whether to include inactive tenants
   * @returns Result containing the list of tenants
   */
  listTenants(includeInactive?: boolean): Promise<TenantServiceResult<Tenant[]>>;

  /**
   * Gets a tenant by ID
   * @param tenantId The ID of the tenant to get
   * @returns Result containing the tenant if found
   */
  getTenantById(tenantId: string): Promise<TenantServiceResult<Tenant>>;

  /**
   * Provisions resources for a tenant
   * @param tenantId The ID of the tenant
   * @returns Result indicating if the operation was successful
   */
  provisionTenantResources(tenantId: string): Promise<TenantServiceResult<boolean>>;

  /**
   * Deprovisions resources for a tenant
   * @param tenantId The ID of the tenant
   * @returns Result indicating if the operation was successful
   */
  deprovisionTenantResources(tenantId: string): Promise<TenantServiceResult<boolean>>;

  /**
   * Deletes a tenant and all associated data
   * @param tenantId The ID of the tenant to delete
   * @returns Result indicating if the operation was successful
   */
  deleteTenant(tenantId: string): Promise<TenantServiceResult<boolean>>;
}