/**
 * Implementation of the TenantService interface.
 */
import { Tenant, TenantConfiguration, TenantManager } from '../interfaces/TenantManager';
import {
  TenantIdentificationContext,
  TenantResolutionResult,
  TenantResolver
} from '../interfaces/TenantResolver';
import { TenantContext, TenantContextData } from '../interfaces/TenantContext';
import {
  TenantRegistrationData,
  TenantService,
  TenantServiceResult
} from './TenantService';

export class TenantServiceImpl implements TenantService {
  constructor(
    private tenantManager: TenantManager,
    private tenantResolver: TenantResolver,
    private tenantContext: TenantContext,
    private userService: any, // Replace with actual user service interface
    private auditLogger: any, // Replace with actual audit logging service
  ) {}

  async registerTenant(data: TenantRegistrationData): Promise<TenantServiceResult<Tenant>> {
    try {
      // Validate registration data
      if (!data.name || !data.isolationModel || !data.adminEmail) {
        return {
          success: false,
          error: 'Missing required tenant registration data',
          code: 'TENANT_REGISTRATION_INVALID'
        };
      }

      // Create the tenant
      const tenant = await this.tenantManager.createTenant({
        name: data.name,
        status: 'provisioning',
        isolationModel: data.isolationModel,
        config: {
          customSettings: {
            adminEmail: data.adminEmail,
            adminName: data.adminName
          },
          featureFlags: {},
          ...(data.initialConfig || {})
        }
      });

      // Provision resources for the tenant
      const provisioned = await this.tenantManager.provisionTenantResources(tenant.id);
      if (!provisioned) {
        return {
          success: false,
          error: 'Failed to provision resources for tenant',
          code: 'TENANT_PROVISIONING_FAILED'
        };
      }

      // Create admin user for the tenant
      await this.createTenantAdminUser(tenant.id, data.adminEmail, data.adminName);

      // Log the tenant creation
      this.auditLogger.logEvent({
        eventType: 'TENANT_CREATED',
        tenantId: tenant.id,
        data: {
          name: tenant.name,
          isolationModel: tenant.isolationModel
        }
      });

      return {
        success: true,
        data: tenant
      };
    } catch (error) {
      console.error('Error registering tenant:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'TENANT_REGISTRATION_FAILED'
      };
    }
  }

  async updateTenant(tenantId: string, data: Partial<Tenant>): Promise<TenantServiceResult<Tenant>> {
    try {
      // Ensure the tenant exists
      const existingTenant = await this.tenantManager.getTenantById(tenantId);
      if (!existingTenant) {
        return {
          success: false,
          error: `Tenant with ID ${tenantId} not found`,
          code: 'TENANT_NOT_FOUND'
        };
      }

      // Update the tenant
      const updatedTenant = await this.tenantManager.updateTenant(tenantId, data);

      // Log the tenant update
      this.auditLogger.logEvent({
        eventType: 'TENANT_UPDATED',
        tenantId,
        data: {
          updatedFields: Object.keys(data)
        }
      });

      return {
        success: true,
        data: updatedTenant
      };
    } catch (error) {
      console.error(`Error updating tenant ${tenantId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'TENANT_UPDATE_FAILED'
      };
    }
  }

  async resolveTenant(context: TenantIdentificationContext): Promise<TenantServiceResult<TenantResolutionResult>> {
    try {
      const result = await this.tenantResolver.resolveTenant(context);

      if (!result.tenantId) {
        return {
          success: false,
          data: result,
          error: 'No tenant could be resolved',
          code: 'TENANT_RESOLUTION_FAILED'
        };
      }

      if (result.error) {
        return {
          success: false,
          data: result,
          error: result.error,
          code: 'TENANT_RESOLUTION_ERROR'
        };
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error resolving tenant:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'TENANT_RESOLUTION_EXCEPTION'
      };
    }
  }

  async setCurrentTenant(tenantId: string, userId?: string): Promise<TenantServiceResult<TenantContextData>> {
    try {
      // Get the tenant
      const tenant = await this.tenantManager.getTenantById(tenantId);
      if (!tenant) {
        return {
          success: false,
          error: `Tenant with ID ${tenantId} not found`,
          code: 'TENANT_NOT_FOUND'
        };
      }

      // Check if tenant is active
      if (tenant.status !== 'active') {
        return {
          success: false,
          error: `Tenant with ID ${tenantId} is not active`,
          code: 'TENANT_INACTIVE'
        };
      }

      // Get user permissions if a user ID is provided
      let permissions: string[] = [];
      let isSystemAdmin = false;
      if (userId) {
        const userInfo = await this.userService.getUserInfo(userId, tenantId);
        permissions = userInfo?.permissions || [];
        isSystemAdmin = userInfo?.isSystemAdmin || false;
      }

      // Create the tenant context
      const contextData: TenantContextData = {
        tenant,
        userId,
        sessionId: `session-${Date.now()}`,
        timestamp: new Date(),
        permissions,
        isSystemAdmin
      };

      // Set the current context
      this.tenantContext.setCurrentContext(contextData);

      return {
        success: true,
        data: contextData
      };
    } catch (error) {
      console.error(`Error setting current tenant ${tenantId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'SET_CURRENT_TENANT_FAILED'
      };
    }
  }

  async getCurrentTenant(): Promise<TenantServiceResult<TenantContextData>> {
    try {
      const context = this.tenantContext.getCurrentContext();

      if (!context) {
        return {
          success: false,
          error: 'No tenant context is currently set',
          code: 'NO_CURRENT_TENANT'
        };
      }

      return {
        success: true,
        data: context
      };
    } catch (error) {
      console.error('Error getting current tenant:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'GET_CURRENT_TENANT_FAILED'
      };
    }
  }

  async clearCurrentTenant(): Promise<TenantServiceResult<void>> {
    try {
      this.tenantContext.clearContext();
      return {
        success: true
      };
    } catch (error) {
      console.error('Error clearing current tenant:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'CLEAR_CURRENT_TENANT_FAILED'
      };
    }
  }

  async isFeatureEnabled(tenantId: string, featureFlag: string): Promise<TenantServiceResult<boolean>> {
    try {
      // Get the tenant
      const tenant = await this.tenantManager.getTenantById(tenantId);
      if (!tenant) {
        return {
          success: false,
          error: `Tenant with ID ${tenantId} not found`,
          code: 'TENANT_NOT_FOUND'
        };
      }

      // Check if the feature is enabled
      const isEnabled = tenant.config.featureFlags[featureFlag] === true;

      return {
        success: true,
        data: isEnabled
      };
    } catch (error) {
      console.error(`Error checking feature ${featureFlag} for tenant ${tenantId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'FEATURE_CHECK_FAILED'
      };
    }
  }

  async updateTenantConfiguration(
    tenantId: string,
    config: Partial<TenantConfiguration>
  ): Promise<TenantServiceResult<Tenant>> {
    try {
      // Ensure the tenant exists
      const existingTenant = await this.tenantManager.getTenantById(tenantId);
      if (!existingTenant) {
        return {
          success: false,
          error: `Tenant with ID ${tenantId} not found`,
          code: 'TENANT_NOT_FOUND'
        };
      }

      // Update the tenant configuration
      const updatedTenant = await this.tenantManager.updateTenantConfiguration(tenantId, config);

      // Log the configuration update
      this.auditLogger.logEvent({
        eventType: 'TENANT_CONFIG_UPDATED',
        tenantId,
        data: {
          updatedConfigKeys: Object.keys(config)
        }
      });

      return {
        success: true,
        data: updatedTenant
      };
    } catch (error) {
      console.error(`Error updating configuration for tenant ${tenantId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'TENANT_CONFIG_UPDATE_FAILED'
      };
    }
  }

  async deactivateTenant(tenantId: string): Promise<TenantServiceResult<boolean>> {
    try {
      // Ensure the tenant exists
      const existingTenant = await this.tenantManager.getTenantById(tenantId);
      if (!existingTenant) {
        return {
          success: false,
          error: `Tenant with ID ${tenantId} not found`,
          code: 'TENANT_NOT_FOUND'
        };
      }

      // Deactivate the tenant
      const deactivated = await this.tenantManager.deactivateTenant(tenantId);

      // Log the deactivation
      this.auditLogger.logEvent({
        eventType: 'TENANT_DEACTIVATED',
        tenantId
      });

      return {
        success: true,
        data: deactivated
      };
    } catch (error) {
      console.error(`Error deactivating tenant ${tenantId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'TENANT_DEACTIVATION_FAILED'
      };
    }
  }

  async activateTenant(tenantId: string): Promise<TenantServiceResult<boolean>> {
    try {
      // Ensure the tenant exists
      const existingTenant = await this.tenantManager.getTenantById(tenantId);
      if (!existingTenant) {
        return {
          success: false,
          error: `Tenant with ID ${tenantId} not found`,
          code: 'TENANT_NOT_FOUND'
        };
      }

      // Activate the tenant
      const activated = await this.tenantManager.activateTenant(tenantId);

      // Log the activation
      this.auditLogger.logEvent({
        eventType: 'TENANT_ACTIVATED',
        tenantId
      });

      return {
        success: true,
        data: activated
      };
    } catch (error) {
      console.error(`Error activating tenant ${tenantId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'TENANT_ACTIVATION_FAILED'
      };
    }
  }

  async listTenants(includeInactive: boolean = false): Promise<TenantServiceResult<Tenant[]>> {
    try {
      // Get all tenants
      const allTenants = await this.tenantManager.listTenants();

      // Filter inactive tenants if needed
      const tenants = includeInactive
        ? allTenants
        : allTenants.filter(tenant => tenant.status === 'active');

      return {
        success: true,
        data: tenants
      };
    } catch (error) {
      console.error('Error listing tenants:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'TENANT_LIST_FAILED'
      };
    }
  }

  async getTenantById(tenantId: string): Promise<TenantServiceResult<Tenant>> {
    try {
      // Get the tenant
      const tenant = await this.tenantManager.getTenantById(tenantId);
      if (!tenant) {
        return {
          success: false,
          error: `Tenant with ID ${tenantId} not found`,
          code: 'TENANT_NOT_FOUND'
        };
      }

      return {
        success: true,
        data: tenant
      };
    } catch (error) {
      console.error(`Error getting tenant ${tenantId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'TENANT_GET_FAILED'
      };
    }
  }

  async provisionTenantResources(tenantId: string): Promise<TenantServiceResult<boolean>> {
    try {
      // Ensure the tenant exists
      const existingTenant = await this.tenantManager.getTenantById(tenantId);
      if (!existingTenant) {
        return {
          success: false,
          error: `Tenant with ID ${tenantId} not found`,
          code: 'TENANT_NOT_FOUND'
        };
      }

      // Provision resources for the tenant
      const provisioned = await this.tenantManager.provisionTenantResources(tenantId);

      // Log the provisioning
      this.auditLogger.logEvent({
        eventType: 'TENANT_RESOURCES_PROVISIONED',
        tenantId,
        data: {
          isolationModel: existingTenant.isolationModel
        }
      });

      return {
        success: true,
        data: provisioned
      };
    } catch (error) {
      console.error(`Error provisioning resources for tenant ${tenantId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'TENANT_PROVISIONING_FAILED'
      };
    }
  }

  async deprovisionTenantResources(tenantId: string): Promise<TenantServiceResult<boolean>> {
    try {
      // Ensure the tenant exists
      const existingTenant = await this.tenantManager.getTenantById(tenantId);
      if (!existingTenant) {
        return {
          success: false,
          error: `Tenant with ID ${tenantId} not found`,
          code: 'TENANT_NOT_FOUND'
        };
      }

      // Deprovision resources for the tenant
      const deprovisioned = await this.tenantManager.deprovisionTenantResources(tenantId);

      // Log the deprovisioning
      this.auditLogger.logEvent({
        eventType: 'TENANT_RESOURCES_DEPROVISIONED',
        tenantId,
        data: {
          isolationModel: existingTenant.isolationModel
        }
      });

      return {
        success: true,
        data: deprovisioned
      };
    } catch (error) {
      console.error(`Error deprovisioning resources for tenant ${tenantId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'TENANT_DEPROVISIONING_FAILED'
      };
    }
  }

  async deleteTenant(tenantId: string): Promise<TenantServiceResult<boolean>> {
    try {
      // Ensure the tenant exists
      const existingTenant = await this.tenantManager.getTenantById(tenantId);
      if (!existingTenant) {
        return {
          success: false,
          error: `Tenant with ID ${tenantId} not found`,
          code: 'TENANT_NOT_FOUND'
        };
      }

      // Deprovision resources first
      await this.tenantManager.deprovisionTenantResources(tenantId);

      // Delete the tenant
      const deleted = await this.tenantManager.deleteTenant(tenantId);

      // Log the deletion
      this.auditLogger.logEvent({
        eventType: 'TENANT_DELETED',
        tenantId,
        data: {
          name: existingTenant.name
        }
      });

      return {
        success: true,
        data: deleted
      };
    } catch (error) {
      console.error(`Error deleting tenant ${tenantId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        code: 'TENANT_DELETION_FAILED'
      };
    }
  }

  // Private helper methods
  private async createTenantAdminUser(tenantId: string, email: string, name: string): Promise<void> {
    // Implementation to create an admin user for the tenant
    await this.userService.createUser({
      tenantId,
      email,
      name,
      role: 'admin',
      isActive: true
    });
  }
}