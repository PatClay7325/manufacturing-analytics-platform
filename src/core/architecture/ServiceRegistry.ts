/**
 * Service Registry for the Hybrid Manufacturing Intelligence Platform
 * 
 * This class implements the ServiceDiscovery interface and provides
 * service registration and discovery capabilities.
 * It is tenant-aware to support multi-tenancy.
 */

import { BaseService, ServiceDiscovery } from './interfaces';
import { ServiceStatus, ServiceInfo } from './types';
import { IntegrationService } from './integration/service/IntegrationService';
import { TenantContext } from './multi-tenancy/interfaces/TenantContext';

/**
 * In-memory implementation of the service registry
 */
export class ServiceRegistry implements ServiceDiscovery {
  /**
   * Singleton instance
   */
  private static instance: ServiceRegistry;
  
  /**
   * Map of registered services by tenant ID and service ID
   */
  private tenantServices: Map<string, Map<string, ServiceInfo>> = new Map();
  
  /**
   * Map of registered services (shared/global services)
   */
  private services: Map<string, ServiceInfo> = new Map();
  
  /**
   * Service type to service ID mapping
   */
  private serviceTypeMap: Map<string, Set<string>> = new Map();
  
  /**
   * Tenant context
   */
  private tenantContext?: TenantContext;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Get the singleton instance
   * @param tenantContext Optional tenant context to use
   */
  public static getInstance(tenantContext?: TenantContext): ServiceRegistry {
    if (!ServiceRegistry.instance) {
      ServiceRegistry.instance = new ServiceRegistry();
    }
    
    if (tenantContext) {
      ServiceRegistry.instance.setTenantContext(tenantContext);
    }
    
    return ServiceRegistry.instance;
  }
  
  /**
   * Set the tenant context
   * @param tenantContext Tenant context
   */
  public setTenantContext(tenantContext: TenantContext): void {
    this.tenantContext = tenantContext;
  }
  
  /**
   * Register a service with the registry
   * @param service Service to register
   * @param isTenantSpecific Whether the service is tenant-specific
   */
  public async register(service: BaseService, isTenantSpecific: boolean = false): Promise<void> {
    // Create service info from the service
    const serviceInfo: ServiceInfo = {
      id: service.id,
      name: service.name,
      version: service.version,
      status: service.status,
      endpoints: [], // Will be populated later when the service exposes endpoints
      healthEndpoint: `/api/health/${service.id}`,
      dependencies: [],
      lastHeartbeat: new Date(),
      tenantSpecific: isTenantSpecific
    };
    
    if (isTenantSpecific && this.tenantContext?.getCurrentTenantId()) {
      // Get the current tenant ID
      const tenantId = this.tenantContext.getCurrentTenantId()!;
      
      // Initialize tenant services map if needed
      if (!this.tenantServices.has(tenantId)) {
        this.tenantServices.set(tenantId, new Map());
      }
      
      // Register the service for this tenant
      const tenantServicesMap = this.tenantServices.get(tenantId)!;
      tenantServicesMap.set(service.id, serviceInfo);
      
      console.log(`Tenant-specific service registered: ${service.name} (${service.id}) for tenant ${tenantId}`);
    } else {
      // Register the service globally
      this.services.set(service.id, serviceInfo);
      
      console.log(`Service registered: ${service.name} (${service.id})`);
    }
    
    // Update the service type map
    const serviceType = service.constructor.name;
    if (!this.serviceTypeMap.has(serviceType)) {
      this.serviceTypeMap.set(serviceType, new Set());
    }
    this.serviceTypeMap.get(serviceType)?.add(service.id);
  }
  
  /**
   * Deregister a service from the registry
   * @param serviceId ID of service to deregister
   * @param tenantId Optional tenant ID for tenant-specific services
   */
  public async deregister(serviceId: string, tenantId?: string): Promise<void> {
    // If tenantId is provided, try to deregister from tenant-specific services
    if (tenantId && this.tenantServices.has(tenantId)) {
      const tenantServicesMap = this.tenantServices.get(tenantId)!;
      const serviceInfo = tenantServicesMap.get(serviceId);
      
      if (serviceInfo) {
        // Remove from tenant services map
        tenantServicesMap.delete(serviceId);
        
        // Remove from service type map
        for (const [type, serviceIds] of this.serviceTypeMap.entries()) {
          if (serviceIds.has(serviceId)) {
            serviceIds.delete(serviceId);
            if (serviceIds.size === 0) {
              this.serviceTypeMap.delete(type);
            }
          }
        }
        
        console.log(`Tenant-specific service deregistered: ${serviceInfo.name} (${serviceId}) for tenant ${tenantId}`);
        return;
      }
    }
    
    // If tenantId is not provided or the service was not found in tenant services,
    // try to deregister from global services
    const serviceInfo = this.services.get(serviceId);
    if (!serviceInfo) {
      // If tenantId is provided, try to get it from the current context
      if (!tenantId && this.tenantContext?.getCurrentTenantId()) {
        tenantId = this.tenantContext.getCurrentTenantId()!;
        
        // Try again with the current tenant ID
        if (this.tenantServices.has(tenantId)) {
          const tenantServicesMap = this.tenantServices.get(tenantId)!;
          const serviceInfo = tenantServicesMap.get(serviceId);
          
          if (serviceInfo) {
            // Remove from tenant services map
            tenantServicesMap.delete(serviceId);
            
            // Remove from service type map
            for (const [type, serviceIds] of this.serviceTypeMap.entries()) {
              if (serviceIds.has(serviceId)) {
                serviceIds.delete(serviceId);
                if (serviceIds.size === 0) {
                  this.serviceTypeMap.delete(type);
                }
              }
            }
            
            console.log(`Tenant-specific service deregistered: ${serviceInfo.name} (${serviceId}) for tenant ${tenantId}`);
            return;
          }
        }
      }
      
      throw new Error(`Service not found: ${serviceId}`);
    }
    
    // Remove from service type map
    for (const [type, serviceIds] of this.serviceTypeMap.entries()) {
      if (serviceIds.has(serviceId)) {
        serviceIds.delete(serviceId);
        if (serviceIds.size === 0) {
          this.serviceTypeMap.delete(type);
        }
      }
    }
    
    // Remove from services map
    this.services.delete(serviceId);
    
    console.log(`Service deregistered: ${serviceInfo.name} (${serviceId})`);
  }
  
  /**
   * Discover a service by ID
   * @param serviceId ID of service to discover
   * @param tenantId Optional tenant ID for tenant-specific services
   */
  public async discover(serviceId: string, tenantId?: string): Promise<BaseService | null> {
    // If tenantId is provided, try to find in tenant-specific services
    if (tenantId && this.tenantServices.has(tenantId)) {
      const tenantServicesMap = this.tenantServices.get(tenantId)!;
      if (tenantServicesMap.has(serviceId)) {
        // In a real implementation, this would return a proxy to the service or connection details
        return null;
      }
    }
    
    // If no tenantId is provided but we have a tenant context, try with current tenant
    if (!tenantId && this.tenantContext?.getCurrentTenantId()) {
      const currentTenantId = this.tenantContext.getCurrentTenantId()!;
      if (this.tenantServices.has(currentTenantId)) {
        const tenantServicesMap = this.tenantServices.get(currentTenantId)!;
        if (tenantServicesMap.has(serviceId)) {
          // In a real implementation, this would return a proxy to the service or connection details
          return null;
        }
      }
    }
    
    // If not found in tenant services, try in global services
    if (this.services.has(serviceId)) {
      // In a real implementation, this would return a proxy to the service or connection details
      return null;
    }
    
    // Service not found
    return null;
  }
  
  /**
   * Discover all services of a specific type
   * @param serviceType Type of services to discover
   * @param tenantId Optional tenant ID for tenant-specific services
   * @param includeShared Whether to include shared/global services
   */
  public async discoverAll(
    serviceType: string, 
    tenantId?: string, 
    includeShared: boolean = true
  ): Promise<BaseService[]> {
    const serviceIds = this.serviceTypeMap.get(serviceType);
    if (!serviceIds || serviceIds.size === 0) {
      return [];
    }
    
    const result: BaseService[] = [];
    
    // If tenantId is provided, get tenant-specific services
    if (tenantId) {
      if (this.tenantServices.has(tenantId)) {
        const tenantServicesMap = this.tenantServices.get(tenantId)!;
        
        for (const serviceId of serviceIds) {
          if (tenantServicesMap.has(serviceId)) {
            // In a real implementation, this would be a proxy to the service
            // For now, just add a placeholder
            result.push({
              id: serviceId,
              name: tenantServicesMap.get(serviceId)!.name,
              version: tenantServicesMap.get(serviceId)!.version,
              status: tenantServicesMap.get(serviceId)!.status
            } as BaseService);
          }
        }
      }
    } else if (this.tenantContext?.getCurrentTenantId()) {
      // If no tenantId is provided but we have a tenant context, use the current tenant
      const currentTenantId = this.tenantContext.getCurrentTenantId()!;
      
      if (this.tenantServices.has(currentTenantId)) {
        const tenantServicesMap = this.tenantServices.get(currentTenantId)!;
        
        for (const serviceId of serviceIds) {
          if (tenantServicesMap.has(serviceId)) {
            // In a real implementation, this would be a proxy to the service
            // For now, just add a placeholder
            result.push({
              id: serviceId,
              name: tenantServicesMap.get(serviceId)!.name,
              version: tenantServicesMap.get(serviceId)!.version,
              status: tenantServicesMap.get(serviceId)!.status
            } as BaseService);
          }
        }
      }
    }
    
    // If includeShared is true, add global services
    if (includeShared) {
      for (const serviceId of serviceIds) {
        if (this.services.has(serviceId)) {
          // In a real implementation, this would be a proxy to the service
          // For now, just add a placeholder
          result.push({
            id: serviceId,
            name: this.services.get(serviceId)!.name,
            version: this.services.get(serviceId)!.version,
            status: this.services.get(serviceId)!.status
          } as BaseService);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Update service status
   * @param serviceId ID of service to update
   * @param status New service status
   * @param tenantId Optional tenant ID for tenant-specific services
   */
  public async updateStatus(
    serviceId: string, 
    status: ServiceStatus, 
    tenantId?: string
  ): Promise<void> {
    // Try to find the service in tenant-specific services first
    if (tenantId && this.tenantServices.has(tenantId)) {
      const tenantServicesMap = this.tenantServices.get(tenantId)!;
      const serviceInfo = tenantServicesMap.get(serviceId);
      
      if (serviceInfo) {
        serviceInfo.status = status;
        serviceInfo.lastHeartbeat = new Date();
        
        console.log(`Tenant-specific service status updated: ${serviceInfo.name} (${serviceId}) for tenant ${tenantId} -> ${status}`);
        return;
      }
    }
    
    // If no tenantId is provided but we have a tenant context, try with current tenant
    if (!tenantId && this.tenantContext?.getCurrentTenantId()) {
      const currentTenantId = this.tenantContext.getCurrentTenantId()!;
      
      if (this.tenantServices.has(currentTenantId)) {
        const tenantServicesMap = this.tenantServices.get(currentTenantId)!;
        const serviceInfo = tenantServicesMap.get(serviceId);
        
        if (serviceInfo) {
          serviceInfo.status = status;
          serviceInfo.lastHeartbeat = new Date();
          
          console.log(`Tenant-specific service status updated: ${serviceInfo.name} (${serviceId}) for tenant ${currentTenantId} -> ${status}`);
          return;
        }
      }
    }
    
    // If not found in tenant services, try in global services
    const serviceInfo = this.services.get(serviceId);
    if (!serviceInfo) {
      throw new Error(`Service not found: ${serviceId}`);
    }
    
    serviceInfo.status = status;
    serviceInfo.lastHeartbeat = new Date();
    
    console.log(`Service status updated: ${serviceInfo.name} (${serviceId}) -> ${status}`);
  }
  
  /**
   * Get all registered services
   * @param tenantId Optional tenant ID to filter by
   * @param includeShared Whether to include shared/global services
   */
  public getAll(tenantId?: string, includeShared: boolean = true): ServiceInfo[] {
    const result: ServiceInfo[] = [];
    
    // If tenantId is provided, get tenant-specific services
    if (tenantId && this.tenantServices.has(tenantId)) {
      const tenantServicesMap = this.tenantServices.get(tenantId)!;
      result.push(...Array.from(tenantServicesMap.values()));
    } else if (!tenantId && this.tenantContext?.getCurrentTenantId()) {
      // If no tenantId is provided but we have a tenant context, use the current tenant
      const currentTenantId = this.tenantContext.getCurrentTenantId()!;
      
      if (this.tenantServices.has(currentTenantId)) {
        const tenantServicesMap = this.tenantServices.get(currentTenantId)!;
        result.push(...Array.from(tenantServicesMap.values()));
      }
    }
    
    // If includeShared is true, add global services
    if (includeShared) {
      result.push(...Array.from(this.services.values()));
    }
    
    return result;
  }
  
  /**
   * Get service info by ID
   * @param serviceId Service ID
   * @param tenantId Optional tenant ID for tenant-specific services
   */
  public getServiceInfo(serviceId: string, tenantId?: string): ServiceInfo | undefined {
    // Try to find the service in tenant-specific services first
    if (tenantId && this.tenantServices.has(tenantId)) {
      const tenantServicesMap = this.tenantServices.get(tenantId)!;
      const serviceInfo = tenantServicesMap.get(serviceId);
      
      if (serviceInfo) {
        return serviceInfo;
      }
    }
    
    // If no tenantId is provided but we have a tenant context, try with current tenant
    if (!tenantId && this.tenantContext?.getCurrentTenantId()) {
      const currentTenantId = this.tenantContext.getCurrentTenantId()!;
      
      if (this.tenantServices.has(currentTenantId)) {
        const tenantServicesMap = this.tenantServices.get(currentTenantId)!;
        const serviceInfo = tenantServicesMap.get(serviceId);
        
        if (serviceInfo) {
          return serviceInfo;
        }
      }
    }
    
    // If not found in tenant services, try in global services
    return this.services.get(serviceId);
  }
  
  /**
   * Get all services of a specific type
   * @param serviceType Service type
   * @param tenantId Optional tenant ID to filter by
   * @param includeShared Whether to include shared/global services
   */
  public getServicesByType(
    serviceType: string, 
    tenantId?: string,
    includeShared: boolean = true
  ): ServiceInfo[] {
    const serviceIds = this.serviceTypeMap.get(serviceType);
    if (!serviceIds) {
      return [];
    }
    
    const result: ServiceInfo[] = [];
    
    // If tenantId is provided, get tenant-specific services
    if (tenantId && this.tenantServices.has(tenantId)) {
      const tenantServicesMap = this.tenantServices.get(tenantId)!;
      
      for (const serviceId of serviceIds) {
        const serviceInfo = tenantServicesMap.get(serviceId);
        if (serviceInfo) {
          result.push(serviceInfo);
        }
      }
    } else if (!tenantId && this.tenantContext?.getCurrentTenantId()) {
      // If no tenantId is provided but we have a tenant context, use the current tenant
      const currentTenantId = this.tenantContext.getCurrentTenantId()!;
      
      if (this.tenantServices.has(currentTenantId)) {
        const tenantServicesMap = this.tenantServices.get(currentTenantId)!;
        
        for (const serviceId of serviceIds) {
          const serviceInfo = tenantServicesMap.get(serviceId);
          if (serviceInfo) {
            result.push(serviceInfo);
          }
        }
      }
    }
    
    // If includeShared is true, add global services
    if (includeShared) {
      for (const serviceId of serviceIds) {
        const serviceInfo = this.services.get(serviceId);
        if (serviceInfo) {
          result.push(serviceInfo);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Update a service's endpoints
   * @param serviceId Service ID
   * @param endpoints Service endpoints
   * @param tenantId Optional tenant ID for tenant-specific services
   */
  public updateEndpoints(
    serviceId: string, 
    endpoints: string[], 
    tenantId?: string
  ): void {
    // Try to find the service in tenant-specific services first
    if (tenantId && this.tenantServices.has(tenantId)) {
      const tenantServicesMap = this.tenantServices.get(tenantId)!;
      const serviceInfo = tenantServicesMap.get(serviceId);
      
      if (serviceInfo) {
        serviceInfo.endpoints = endpoints;
        return;
      }
    }
    
    // If no tenantId is provided but we have a tenant context, try with current tenant
    if (!tenantId && this.tenantContext?.getCurrentTenantId()) {
      const currentTenantId = this.tenantContext.getCurrentTenantId()!;
      
      if (this.tenantServices.has(currentTenantId)) {
        const tenantServicesMap = this.tenantServices.get(currentTenantId)!;
        const serviceInfo = tenantServicesMap.get(serviceId);
        
        if (serviceInfo) {
          serviceInfo.endpoints = endpoints;
          return;
        }
      }
    }
    
    // If not found in tenant services, try in global services
    const serviceInfo = this.services.get(serviceId);
    if (!serviceInfo) {
      throw new Error(`Service not found: ${serviceId}`);
    }
    
    serviceInfo.endpoints = endpoints;
  }
  
  /**
   * Update a service's dependencies
   * @param serviceId Service ID
   * @param dependencies Service dependencies
   * @param tenantId Optional tenant ID for tenant-specific services
   */
  public updateDependencies(
    serviceId: string, 
    dependencies: string[], 
    tenantId?: string
  ): void {
    // Try to find the service in tenant-specific services first
    if (tenantId && this.tenantServices.has(tenantId)) {
      const tenantServicesMap = this.tenantServices.get(tenantId)!;
      const serviceInfo = tenantServicesMap.get(serviceId);
      
      if (serviceInfo) {
        serviceInfo.dependencies = dependencies;
        return;
      }
    }
    
    // If no tenantId is provided but we have a tenant context, try with current tenant
    if (!tenantId && this.tenantContext?.getCurrentTenantId()) {
      const currentTenantId = this.tenantContext.getCurrentTenantId()!;
      
      if (this.tenantServices.has(currentTenantId)) {
        const tenantServicesMap = this.tenantServices.get(currentTenantId)!;
        const serviceInfo = tenantServicesMap.get(serviceId);
        
        if (serviceInfo) {
          serviceInfo.dependencies = dependencies;
          return;
        }
      }
    }
    
    // If not found in tenant services, try in global services
    const serviceInfo = this.services.get(serviceId);
    if (!serviceInfo) {
      throw new Error(`Service not found: ${serviceId}`);
    }
    
    serviceInfo.dependencies = dependencies;
  }
  
  /**
   * Get all tenant IDs that have registered services
   */
  public getTenantIds(): string[] {
    return Array.from(this.tenantServices.keys());
  }
  
  /**
   * Check if a service is tenant-specific
   * @param serviceId Service ID
   */
  public isTenantSpecific(serviceId: string): boolean {
    // Check in global services first
    const globalService = this.services.get(serviceId);
    if (globalService) {
      return !!globalService.tenantSpecific;
    }
    
    // Check in tenant services
    for (const tenantServicesMap of this.tenantServices.values()) {
      if (tenantServicesMap.has(serviceId)) {
        return true;
      }
    }
    
    return false;
  }
}