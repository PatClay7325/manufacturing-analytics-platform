/**
 * Integration Registry
 * 
 * Central registry for managing integration adapters in the Manufacturing Analytics Platform.
 * Provides functions for registering, retrieving, and categorizing adapters.
 * Supports multi-tenancy with tenant-specific adapters.
 */

import { LoggerService } from './architecture/interfaces';
import { IntegrationAdapter } from './interfaces/IntegrationAdapter';
import { ConnectionStatus, IntegrationSystemType } from './types';
import { TenantContext } from './multi-tenancy/interfaces/TenantContext';

/**
 * Adapter metadata interface
 * Additional information about registered adapters
 */
export interface AdapterMetadata {
  /**
   * Adapter ID
   */
  id: string;
  
  /**
   * Adapter display name
   */
  name: string;
  
  /**
   * System type
   */
  type: IntegrationSystemType;
  
  /**
   * Adapter version
   */
  version: string;
  
  /**
   * Adapter protocol (e.g., MQTT 3.1.1, OPC UA 1.04)
   */
  protocol?: string;
  
  /**
   * System vendor or manufacturer
   */
  vendor?: string;
  
  /**
   * System model or product name
   */
  model?: string;
  
  /**
   * Tags for categorization
   */
  tags?: string[];
  
  /**
   * Capabilities provided by this adapter
   */
  capabilities?: string[];
  
  /**
   * Registration timestamp
   */
  registeredAt: Date;
  
  /**
   * Last updated timestamp
   */
  updatedAt: Date;
  
  /**
   * Tenant ID if this is a tenant-specific adapter
   */
  tenantId?: string;
  
  /**
   * Whether this adapter is tenant-specific
   */
  isTenantSpecific?: boolean;
}

/**
 * Registry for managing integration adapters
 */
export class IntegrationRegistry {
  /**
   * Map of registered adapters by ID
   */
  private adapters: Map<string, IntegrationAdapter> = new Map();
  
  /**
   * Map of tenant-specific adapters by tenant ID and adapter ID
   */
  private tenantAdapters: Map<string, Map<string, IntegrationAdapter>> = new Map();
  
  /**
   * Map of adapter metadata by ID
   */
  private adapterMetadata: Map<string, AdapterMetadata> = new Map();
  
  /**
   * Map of adapters by system type
   */
  private adaptersByType: Map<IntegrationSystemType, Set<string>> = new Map();
  
  /**
   * Map of adapters by protocol
   */
  private adaptersByProtocol: Map<string, Set<string>> = new Map();
  
  /**
   * Map of adapters by vendor
   */
  private adaptersByVendor: Map<string, Set<string>> = new Map();
  
  /**
   * Map of adapters by tag
   */
  private adaptersByTag: Map<string, Set<string>> = new Map();
  
  /**
   * Map of adapters by capability
   */
  private adaptersByCapability: Map<string, Set<string>> = new Map();
  
  /**
   * Map of adapters by tenant
   */
  private adaptersByTenant: Map<string, Set<string>> = new Map();
  
  /**
   * Tenant context
   */
  private tenantContext?: TenantContext;
  
  /**
   * Constructor
   * @param logger Logger service
   * @param tenantContext Optional tenant context
   */
  constructor(
    private readonly logger: LoggerService,
    tenantContext?: TenantContext
  ) {
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
   * Initialize the registry
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing Integration Registry');
    
    // Clear any existing state
    this.clear();
    
    this.logger.info('Integration Registry initialized');
  }
  
  /**
   * Register an integration adapter
   * @param adapter The adapter to register
   * @param metadata Optional additional metadata
   * @param tenantId Optional tenant ID for tenant-specific adapters
   */
  async registerAdapter(
    adapter: IntegrationAdapter,
    metadata?: Partial<AdapterMetadata>,
    tenantId?: string
  ): Promise<void> {
    // Determine if this is a tenant-specific adapter
    const isTenantSpecific = !!tenantId || adapter.config.tenantId !== undefined;
    
    // Get tenant ID from parameter, adapter config, or current context
    const actualTenantId = tenantId || 
                          adapter.config.tenantId as string || 
                          (isTenantSpecific && this.tenantContext?.getCurrentTenantId()) || 
                          undefined;
    
    // For tenant-specific adapters
    if (isTenantSpecific && actualTenantId) {
      // Check if adapter already exists for this tenant
      if (this.tenantAdapters.has(actualTenantId) && 
          this.tenantAdapters.get(actualTenantId)!.has(adapter.id)) {
        throw new Error(`Tenant-specific integration adapter with ID ${adapter.id} is already registered for tenant ${actualTenantId}`);
      }
      
      this.logger.info(`Registering tenant-specific integration adapter: ${adapter.name}`, {
        integrationId: adapter.id,
        integrationType: adapter.config.type,
        tenantId: actualTenantId
      });
      
      // Initialize tenant adapter map if needed
      if (!this.tenantAdapters.has(actualTenantId)) {
        this.tenantAdapters.set(actualTenantId, new Map());
      }
      
      // Register the adapter for this tenant
      this.tenantAdapters.get(actualTenantId)!.set(adapter.id, adapter);
      
      // Create and store metadata
      const now = new Date();
      const adapterMetadata: AdapterMetadata = {
        id: adapter.id,
        name: adapter.name,
        type: adapter.config.type,
        version: adapter.version,
        protocol: metadata.protocol || adapter.config.connectionParams.protocol as string,
        vendor: metadata.vendor || adapter.config.connectionParams.vendor as string,
        model: metadata.model || adapter.config.connectionParams.model as string,
        tags: metadata.tags || adapter.config.connectionParams.tags as string[] || [],
        capabilities: metadata.capabilities || adapter.config.connectionParams.capabilities as string[] || [],
        registeredAt: now,
        updatedAt: now,
        tenantId: actualTenantId,
        isTenantSpecific: true
      };
      
      this.adapterMetadata.set(adapter.id, adapterMetadata);
      
      // Index the adapter
      this.indexAdapter(adapter.id, adapterMetadata);
      
      // Index by tenant
      if (!this.adaptersByTenant.has(actualTenantId)) {
        this.adaptersByTenant.set(actualTenantId, new Set<string>());
      }
      this.adaptersByTenant.get(actualTenantId)!.add(adapter.id);
      
      this.logger.info(`Tenant-specific integration adapter registered: ${adapter.name}`, {
        integrationId: adapter.id,
        tenantId: actualTenantId
      });
    } else {
      // For global adapters
      if (this.adapters.has(adapter.id)) {
        throw new Error(`Integration adapter with ID ${adapter.id} is already registered`);
      }
      
      this.logger.info(`Registering integration adapter: ${adapter.name}`, {
        integrationId: adapter.id,
        integrationType: adapter.config.type
      });
      
      // Register the adapter
      this.adapters.set(adapter.id, adapter);
      
      // Create and store metadata
      const now = new Date();
      const adapterMetadata: AdapterMetadata = {
        id: adapter.id,
        name: adapter.name,
        type: adapter.config.type,
        version: adapter.version,
        protocol: metadata.protocol || adapter.config.connectionParams.protocol as string,
        vendor: metadata.vendor || adapter.config.connectionParams.vendor as string,
        model: metadata.model || adapter.config.connectionParams.model as string,
        tags: metadata.tags || adapter.config.connectionParams.tags as string[] || [],
        capabilities: metadata.capabilities || adapter.config.connectionParams.capabilities as string[] || [],
        registeredAt: now,
        updatedAt: now,
        isTenantSpecific: false
      };
      
      this.adapterMetadata.set(adapter.id, adapterMetadata);
      
      // Index the adapter
      this.indexAdapter(adapter.id, adapterMetadata);
      
      this.logger.info(`Integration adapter registered: ${adapter.name}`, {
        integrationId: adapter.id
      });
    }
  }
  
  /**
   * Deregister an integration adapter
   * @param adapterId The ID of the adapter to deregister
   * @param tenantId Optional tenant ID for tenant-specific adapters
   */
  async deregisterAdapter(adapterId: string, tenantId?: string): Promise<void> {
    // First check if this is a tenant-specific adapter
    const metadata = this.adapterMetadata.get(adapterId);
    
    if (metadata?.isTenantSpecific) {
      // Get tenant ID from parameter, metadata, or current context
      const actualTenantId = tenantId || 
                            metadata.tenantId || 
                            this.tenantContext?.getCurrentTenantId();
      
      if (!actualTenantId) {
        throw new Error(`Tenant ID is required for tenant-specific adapter ${adapterId}`);
      }
      
      // Check if adapter exists for this tenant
      if (!this.tenantAdapters.has(actualTenantId) || 
          !this.tenantAdapters.get(actualTenantId)!.has(adapterId)) {
        throw new Error(`Tenant-specific integration adapter with ID ${adapterId} is not registered for tenant ${actualTenantId}`);
      }
      
      const adapter = this.tenantAdapters.get(actualTenantId)!.get(adapterId)!;
      
      this.logger.info(`Deregistering tenant-specific integration adapter: ${adapter.name}`, {
        integrationId: adapter.id,
        tenantId: actualTenantId
      });
      
      // Remove from indexes
      this.removeFromIndexes(adapterId);
      
      // Remove from tenant index
      const tenantSet = this.adaptersByTenant.get(actualTenantId);
      if (tenantSet) {
        tenantSet.delete(adapterId);
        if (tenantSet.size === 0) {
          this.adaptersByTenant.delete(actualTenantId);
        }
      }
      
      // Remove metadata
      this.adapterMetadata.delete(adapterId);
      
      // Remove the adapter
      this.tenantAdapters.get(actualTenantId)!.delete(adapterId);
      
      // Remove tenant map if empty
      if (this.tenantAdapters.get(actualTenantId)!.size === 0) {
        this.tenantAdapters.delete(actualTenantId);
      }
      
      this.logger.info(`Tenant-specific integration adapter deregistered: ${adapter.name}`, {
        integrationId: adapter.id,
        tenantId: actualTenantId
      });
    } else {
      // Global adapter
      const adapter = this.adapters.get(adapterId);
      
      if (!adapter) {
        throw new Error(`Integration adapter with ID ${adapterId} is not registered`);
      }
      
      this.logger.info(`Deregistering integration adapter: ${adapter.name}`, {
        integrationId: adapter.id
      });
      
      // Remove from indexes
      this.removeFromIndexes(adapterId);
      
      // Remove metadata
      this.adapterMetadata.delete(adapterId);
      
      // Remove the adapter
      this.adapters.delete(adapterId);
      
      this.logger.info(`Integration adapter deregistered: ${adapter.name}`, {
        integrationId: adapter.id
      });
    }
  }
  
  /**
   * Update adapter metadata
   * @param adapterId The ID of the adapter to update
   * @param metadata New metadata values
   */
  updateAdapterMetadata(
    adapterId: string,
    metadata: Partial<AdapterMetadata>
  ): void {
    const adapter = this.adapters.get(adapterId);
    
    if (!adapter) {
      throw new Error(`Integration adapter with ID ${adapterId} is not registered`);
    }
    
    const existingMetadata = this.adapterMetadata.get(adapterId);
    
    if (!existingMetadata) {
      throw new Error(`Metadata for adapter with ID ${adapterId} not found`);
    }
    
    // Remove from indexes first
    this.removeFromIndexes(adapterId);
    
    // Update metadata
    const updatedMetadata: AdapterMetadata = {
      ...existingMetadata,
      ...metadata,
      id: adapterId, // Ensure ID cannot be changed
      updatedAt: new Date()
    };
    
    this.adapterMetadata.set(adapterId, updatedMetadata);
    
    // Re-index with updated metadata
    this.indexAdapter(adapterId, updatedMetadata);
    
    this.logger.debug(`Updated metadata for adapter: ${adapter.name}`, {
      integrationId: adapterId
    });
  }
  
  /**
   * Get an adapter by ID
   * @param adapterId The ID of the adapter to retrieve
   * @param tenantId Optional tenant ID for tenant-specific adapters
   * @returns The adapter or null if not found
   */
  getAdapter(adapterId: string, tenantId?: string): IntegrationAdapter | null {
    // First check if this is a tenant-specific adapter
    const metadata = this.adapterMetadata.get(adapterId);
    
    if (metadata?.isTenantSpecific) {
      // Get tenant ID from parameter, metadata, or current context
      const actualTenantId = tenantId || 
                           metadata.tenantId || 
                           this.tenantContext?.getCurrentTenantId();
      
      if (!actualTenantId) {
        return null;
      }
      
      // Check if adapter exists for this tenant
      if (!this.tenantAdapters.has(actualTenantId) || 
          !this.tenantAdapters.get(actualTenantId)!.has(adapterId)) {
        return null;
      }
      
      return this.tenantAdapters.get(actualTenantId)!.get(adapterId) || null;
    }
    
    // Try global adapters
    return this.adapters.get(adapterId) || null;
  }
  
  /**
   * Get adapter metadata by ID
   * @param adapterId The ID of the adapter to retrieve metadata for
   * @returns The adapter metadata or null if not found
   */
  getAdapterMetadata(adapterId: string): AdapterMetadata | null {
    return this.adapterMetadata.get(adapterId) || null;
  }
  
  /**
   * Get all registered adapters
   * @param includeGlobal Whether to include global adapters
   * @param tenantId Optional tenant ID to filter by, if not provided uses current context
   * @returns Array of all registered adapters matching the criteria
   */
  getAllAdapters(includeGlobal: boolean = true, tenantId?: string): IntegrationAdapter[] {
    const result: IntegrationAdapter[] = [];
    
    // Add global adapters if requested
    if (includeGlobal) {
      result.push(...Array.from(this.adapters.values()));
    }
    
    // Add tenant-specific adapters if tenant ID provided
    if (tenantId) {
      if (this.tenantAdapters.has(tenantId)) {
        result.push(...Array.from(this.tenantAdapters.get(tenantId)!.values()));
      }
    } 
    // Otherwise, use current tenant context if available
    else if (this.tenantContext?.getCurrentTenantId()) {
      const currentTenantId = this.tenantContext.getCurrentTenantId()!;
      if (this.tenantAdapters.has(currentTenantId)) {
        result.push(...Array.from(this.tenantAdapters.get(currentTenantId)!.values()));
      }
    }
    
    return result;
  }
  
  /**
   * Get all adapter metadata
   * @returns Array of all adapter metadata
   */
  getAllAdapterMetadata(): AdapterMetadata[] {
    return Array.from(this.adapterMetadata.values());
  }
  
  /**
   * Get the number of registered adapters
   * @returns The number of adapters
   */
  getAdapterCount(): number {
    return this.adapters.size;
  }
  
  /**
   * Get all adapters of a specific type
   * @param type The system type to filter by
   * @returns Array of adapters of the specified type
   */
  getAdaptersByType(type: IntegrationSystemType): IntegrationAdapter[] {
    const adapterIds = this.adaptersByType.get(type) || new Set<string>();
    return Array.from(adapterIds).map(id => this.adapters.get(id)).filter(Boolean) as IntegrationAdapter[];
  }
  
  /**
   * Get all adapters using a specific protocol
   * @param protocol The protocol to filter by
   * @returns Array of adapters using the specified protocol
   */
  getAdaptersByProtocol(protocol: string): IntegrationAdapter[] {
    const adapterIds = this.adaptersByProtocol.get(protocol) || new Set<string>();
    return Array.from(adapterIds).map(id => this.adapters.get(id)).filter(Boolean) as IntegrationAdapter[];
  }
  
  /**
   * Get all adapters from a specific vendor
   * @param vendor The vendor to filter by
   * @returns Array of adapters from the specified vendor
   */
  getAdaptersByVendor(vendor: string): IntegrationAdapter[] {
    const adapterIds = this.adaptersByVendor.get(vendor) || new Set<string>();
    return Array.from(adapterIds).map(id => this.adapters.get(id)).filter(Boolean) as IntegrationAdapter[];
  }
  
  /**
   * Get all adapters with a specific tag
   * @param tag The tag to filter by
   * @returns Array of adapters with the specified tag
   */
  getAdaptersByTag(tag: string): IntegrationAdapter[] {
    const adapterIds = this.adaptersByTag.get(tag) || new Set<string>();
    return Array.from(adapterIds).map(id => this.adapters.get(id)).filter(Boolean) as IntegrationAdapter[];
  }
  
  /**
   * Get all adapters with a specific capability
   * @param capability The capability to filter by
   * @returns Array of adapters with the specified capability
   */
  getAdaptersByCapability(capability: string): IntegrationAdapter[] {
    const adapterIds = this.adaptersByCapability.get(capability) || new Set<string>();
    return Array.from(adapterIds).map(id => this.adapters.get(id)).filter(Boolean) as IntegrationAdapter[];
  }
  
  /**
   * Get all connected adapters
   * @returns Array of connected adapters
   */
  getConnectedAdapters(): IntegrationAdapter[] {
    return Array.from(this.adapters.values()).filter(
      adapter => adapter.connectionStatus === ConnectionStatus.CONNECTED
    );
  }
  
  /**
   * Find adapters matching specific criteria
   * @param criteria The search criteria
   * @returns Array of adapters matching the criteria
   */
  findAdapters(criteria: {
    type?: IntegrationSystemType;
    protocol?: string;
    vendor?: string;
    tags?: string[];
    capabilities?: string[];
  }): IntegrationAdapter[] {
    let result = this.getAllAdapters();
    
    if (criteria.type) {
      result = result.filter(adapter => adapter.config.type === criteria.type);
    }
    
    if (criteria.protocol) {
      const metadata = Array.from(this.adapterMetadata.values());
      const matchingIds = metadata
        .filter(meta => meta.protocol === criteria.protocol)
        .map(meta => meta.id);
      
      result = result.filter(adapter => matchingIds.includes(adapter.id));
    }
    
    if (criteria.vendor) {
      const metadata = Array.from(this.adapterMetadata.values());
      const matchingIds = metadata
        .filter(meta => meta.vendor === criteria.vendor)
        .map(meta => meta.id);
      
      result = result.filter(adapter => matchingIds.includes(adapter.id));
    }
    
    if (criteria.tags && criteria.tags.length > 0) {
      const metadata = Array.from(this.adapterMetadata.values());
      const matchingIds = metadata
        .filter(meta => criteria.tags!.every(tag => meta.tags?.includes(tag)))
        .map(meta => meta.id);
      
      result = result.filter(adapter => matchingIds.includes(adapter.id));
    }
    
    if (criteria.capabilities && criteria.capabilities.length > 0) {
      const metadata = Array.from(this.adapterMetadata.values());
      const matchingIds = metadata
        .filter(meta => criteria.capabilities!.every(cap => meta.capabilities?.includes(cap)))
        .map(meta => meta.id);
      
      result = result.filter(adapter => matchingIds.includes(adapter.id));
    }
    
    return result;
  }
  
  /**
   * Check if an adapter with the given ID is registered
   * @param adapterId The adapter ID to check
   * @returns True if the adapter is registered, false otherwise
   */
  hasAdapter(adapterId: string): boolean {
    return this.adapters.has(adapterId);
  }
  
  /**
   * Clear the registry
   */
  clear(): void {
    this.adapters.clear();
    this.tenantAdapters.clear();
    this.adapterMetadata.clear();
    this.adaptersByType.clear();
    this.adaptersByProtocol.clear();
    this.adaptersByVendor.clear();
    this.adaptersByTag.clear();
    this.adaptersByCapability.clear();
    this.adaptersByTenant.clear();
  }
  
  /**
   * Get tenant-specific adapters
   * @param tenantId Tenant ID
   * @returns Array of adapters for the specified tenant
   */
  getTenantAdapters(tenantId: string): IntegrationAdapter[] {
    if (!this.tenantAdapters.has(tenantId)) {
      return [];
    }
    
    return Array.from(this.tenantAdapters.get(tenantId)!.values());
  }
  
  /**
   * Get tenant IDs with registered adapters
   * @returns Array of tenant IDs
   */
  getTenantIds(): string[] {
    return Array.from(this.tenantAdapters.keys());
  }
  
  /**
   * Index an adapter in the lookup maps
   * @param adapterId The adapter ID
   * @param metadata The adapter metadata
   */
  private indexAdapter(adapterId: string, metadata: AdapterMetadata): void {
    // Index by type
    if (!this.adaptersByType.has(metadata.type)) {
      this.adaptersByType.set(metadata.type, new Set<string>());
    }
    this.adaptersByType.get(metadata.type)!.add(adapterId);
    
    // Index by protocol
    if (metadata.protocol) {
      if (!this.adaptersByProtocol.has(metadata.protocol)) {
        this.adaptersByProtocol.set(metadata.protocol, new Set<string>());
      }
      this.adaptersByProtocol.get(metadata.protocol)!.add(adapterId);
    }
    
    // Index by vendor
    if (metadata.vendor) {
      if (!this.adaptersByVendor.has(metadata.vendor)) {
        this.adaptersByVendor.set(metadata.vendor, new Set<string>());
      }
      this.adaptersByVendor.get(metadata.vendor)!.add(adapterId);
    }
    
    // Index by tags
    if (metadata.tags) {
      for (const tag of metadata.tags) {
        if (!this.adaptersByTag.has(tag)) {
          this.adaptersByTag.set(tag, new Set<string>());
        }
        this.adaptersByTag.get(tag)!.add(adapterId);
      }
    }
    
    // Index by capabilities
    if (metadata.capabilities) {
      for (const capability of metadata.capabilities) {
        if (!this.adaptersByCapability.has(capability)) {
          this.adaptersByCapability.set(capability, new Set<string>());
        }
        this.adaptersByCapability.get(capability)!.add(adapterId);
      }
    }
  }
  
  /**
   * Remove an adapter from all indexes
   * @param adapterId The adapter ID
   */
  private removeFromIndexes(adapterId: string): void {
    const metadata = this.adapterMetadata.get(adapterId);
    
    if (!metadata) {
      return;
    }
    
    // Remove from type index
    const typeSet = this.adaptersByType.get(metadata.type);
    if (typeSet) {
      typeSet.delete(adapterId);
    }
    
    // Remove from protocol index
    if (metadata.protocol) {
      const protocolSet = this.adaptersByProtocol.get(metadata.protocol);
      if (protocolSet) {
        protocolSet.delete(adapterId);
      }
    }
    
    // Remove from vendor index
    if (metadata.vendor) {
      const vendorSet = this.adaptersByVendor.get(metadata.vendor);
      if (vendorSet) {
        vendorSet.delete(adapterId);
      }
    }
    
    // Remove from tag indexes
    if (metadata.tags) {
      for (const tag of metadata.tags) {
        const tagSet = this.adaptersByTag.get(tag);
        if (tagSet) {
          tagSet.delete(adapterId);
        }
      }
    }
    
    // Remove from capability indexes
    if (metadata.capabilities) {
      for (const capability of metadata.capabilities) {
        const capabilitySet = this.adaptersByCapability.get(capability);
        if (capabilitySet) {
          capabilitySet.delete(adapterId);
        }
      }
    }
  }
}