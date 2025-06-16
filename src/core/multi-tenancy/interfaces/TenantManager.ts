/**
 * TenantManager interface defines the contract for managing tenants in the system.
 * It provides methods for tenant lifecycle management and configuration.
 */
export interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'provisioning' | 'decommissioning';
  isolationModel: 'database' | 'schema' | 'shared' | 'hybrid';
  createdAt: Date;
  updatedAt: Date;
  config: TenantConfiguration;
}

export interface TenantConfiguration {
  databaseConfig?: DatabaseConfig;
  schemaConfig?: SchemaConfig;
  sharedConfig?: SharedConfig;
  customSettings: Record<string, any>;
  featureFlags: Record<string, boolean>;
}

export interface DatabaseConfig {
  connectionString: string;
  username: string;
  password: string;
}

export interface SchemaConfig {
  schemaName: string;
}

export interface SharedConfig {
  tenantIdentifier: string;
}

export interface TenantManager {
  /**
   * Creates a new tenant in the system
   * @param tenantData The data needed to create a tenant
   * @returns The created tenant
   */
  createTenant(tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant>;

  /**
   * Retrieves a tenant by ID
   * @param tenantId The ID of the tenant to retrieve
   * @returns The tenant, or null if not found
   */
  getTenantById(tenantId: string): Promise<Tenant | null>;

  /**
   * Updates an existing tenant
   * @param tenantId The ID of the tenant to update
   * @param tenantData The data to update the tenant with
   * @returns The updated tenant
   */
  updateTenant(tenantId: string, tenantData: Partial<Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Tenant>;

  /**
   * Deactivates a tenant
   * @param tenantId The ID of the tenant to deactivate
   * @returns True if successful, false otherwise
   */
  deactivateTenant(tenantId: string): Promise<boolean>;

  /**
   * Activates a tenant
   * @param tenantId The ID of the tenant to activate
   * @returns True if successful, false otherwise
   */
  activateTenant(tenantId: string): Promise<boolean>;

  /**
   * Permanently removes a tenant and all associated data
   * @param tenantId The ID of the tenant to delete
   * @returns True if successful, false otherwise
   */
  deleteTenant(tenantId: string): Promise<boolean>;

  /**
   * Lists all tenants in the system
   * @param filter Optional filter criteria
   * @returns Array of tenants
   */
  listTenants(filter?: Partial<Tenant>): Promise<Tenant[]>;

  /**
   * Updates tenant configuration
   * @param tenantId The ID of the tenant
   * @param config The configuration to update
   * @returns The updated tenant
   */
  updateTenantConfiguration(tenantId: string, config: Partial<TenantConfiguration>): Promise<Tenant>;

  /**
   * Provisions resources for a tenant
   * @param tenantId The ID of the tenant to provision
   * @returns True if successful, false otherwise
   */
  provisionTenantResources(tenantId: string): Promise<boolean>;

  /**
   * Deprovisions resources for a tenant
   * @param tenantId The ID of the tenant to deprovision
   * @returns True if successful, false otherwise
   */
  deprovisionTenantResources(tenantId: string): Promise<boolean>;
}