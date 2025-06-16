/**
 * Compliance Registry Implementation
 * 
 * This class implements the ComplianceRegistry interface and provides
 * functionality for managing standards, requirements, and profiles.
 * Supports multi-tenancy with tenant-specific compliance profiles.
 */

import { v4 as uuidv4 } from 'uuid';
import { AbstractBaseService } from '../architecture/BaseService';
import { ComplianceRegistry } from './interfaces';
import {
  ComplianceStandard,
  ComplianceRequirement,
  ComplianceProfile,
} from './types';
import { TenantContext } from '../multi-tenancy/interfaces/TenantContext';

/**
 * Compliance registry implementation
 */
export class ComplianceRegistryImpl extends AbstractBaseService implements ComplianceRegistry {
  /**
   * Map of standards by ID
   */
  private standards: Map<string, ComplianceStandard> = new Map();
  
  /**
   * Map of requirements by ID
   */
  private requirements: Map<string, ComplianceRequirement> = new Map();
  
  /**
   * Map of requirements by standard ID
   */
  private requirementsByStandard: Map<string, Set<string>> = new Map();
  
  /**
   * Map of profiles by ID
   */
  private profiles: Map<string, ComplianceProfile> = new Map();
  
  /**
   * Create a new compliance registry
   */
  constructor() {
    super('ComplianceRegistry', '1.0.0');
  }
  
  /**
   * Initialize the registry
   */
  protected async doInitialize(): Promise<void> {
    // Clear maps
    this.standards.clear();
    this.requirements.clear();
    this.requirementsByStandard.clear();
    this.profiles.clear();
    
    console.log('Compliance registry initialized');
  }
  
  /**
   * Start the registry
   */
  protected async doStart(): Promise<void> {
    console.log('Compliance registry started');
  }
  
  /**
   * Stop the registry
   */
  protected async doStop(): Promise<void> {
    console.log('Compliance registry stopped');
  }
  
  /**
   * Register a standard
   * @param standard Standard to register
   */
  public async registerStandard(standard: ComplianceStandard): Promise<void> {
    // Ensure standard has an ID
    if (!standard.id) {
      standard.id = uuidv4();
    }
    
    // Check if standard already exists
    if (this.standards.has(standard.id)) {
      throw new Error(`Standard with ID ${standard.id} already exists`);
    }
    
    // Store standard
    this.standards.set(standard.id, { ...standard });
    
    // Initialize requirements set for this standard
    this.requirementsByStandard.set(standard.id, new Set());
    
    console.log(`Standard registered: ${standard.name} (${standard.id})`);
  }
  
  /**
   * Get a standard by ID
   * @param standardId Standard ID
   */
  public async getStandard(standardId: string): Promise<ComplianceStandard | null> {
    const standard = this.standards.get(standardId);
    return standard ? { ...standard } : null;
  }
  
  /**
   * Get all standards
   * @param filter Optional filter criteria
   */
  public async getStandards(filter?: Record<string, unknown>): Promise<ComplianceStandard[]> {
    let standards = Array.from(this.standards.values()).map(standard => ({ ...standard }));
    
    // Apply filters if provided
    if (filter) {
      standards = standards.filter(standard => {
        // Filter by type
        if (filter.type && standard.type !== filter.type) {
          return false;
        }
        
        // Filter by name
        if (filter.name && !standard.name.toLowerCase().includes((filter.name as string).toLowerCase())) {
          return false;
        }
        
        // Filter by category
        if (filter.category && !standard.categories.includes(filter.category as string)) {
          return false;
        }
        
        return true;
      });
    }
    
    return standards;
  }
  
  /**
   * Register a requirement
   * @param requirement Requirement to register
   */
  public async registerRequirement(requirement: ComplianceRequirement): Promise<void> {
    // Ensure requirement has an ID
    if (!requirement.id) {
      requirement.id = uuidv4();
    }
    
    // Check if requirement already exists
    if (this.requirements.has(requirement.id)) {
      throw new Error(`Requirement with ID ${requirement.id} already exists`);
    }
    
    // Check if standard exists
    if (!this.standards.has(requirement.standardId)) {
      throw new Error(`Standard with ID ${requirement.standardId} does not exist`);
    }
    
    // Store requirement
    this.requirements.set(requirement.id, { ...requirement });
    
    // Add to requirements by standard map
    const standardRequirements = this.requirementsByStandard.get(requirement.standardId);
    if (standardRequirements) {
      standardRequirements.add(requirement.id);
    }
    
    console.log(`Requirement registered: ${requirement.name} (${requirement.id}) for standard ${requirement.standardId}`);
  }
  
  /**
   * Get a requirement by ID
   * @param requirementId Requirement ID
   */
  public async getRequirement(requirementId: string): Promise<ComplianceRequirement | null> {
    const requirement = this.requirements.get(requirementId);
    return requirement ? { ...requirement } : null;
  }
  
  /**
   * Get requirements by standard ID
   * @param standardId Standard ID
   * @param filter Optional filter criteria
   */
  public async getRequirementsByStandard(
    standardId: string,
    filter?: Record<string, unknown>
  ): Promise<ComplianceRequirement[]> {
    // Check if standard exists
    if (!this.standards.has(standardId)) {
      throw new Error(`Standard with ID ${standardId} does not exist`);
    }
    
    // Get requirement IDs for this standard
    const requirementIds = this.requirementsByStandard.get(standardId) || new Set();
    
    // Get requirements
    let requirements = Array.from(requirementIds)
      .map(id => this.requirements.get(id))
      .filter((req): req is ComplianceRequirement => !!req)
      .map(req => ({ ...req }));
    
    // Apply filters if provided
    if (filter) {
      requirements = requirements.filter(requirement => {
        // Filter by level
        if (filter.level && requirement.level !== filter.level) {
          return false;
        }
        
        // Filter by category
        if (filter.category && requirement.category !== filter.category) {
          return false;
        }
        
        // Filter by tag
        if (filter.tag && !requirement.tags.includes(filter.tag as string)) {
          return false;
        }
        
        return true;
      });
    }
    
    return requirements;
  }
  
  /**
   * Tenant context for multi-tenancy support
   */
  private tenantContext?: TenantContext;
  
  /**
   * Tenant-specific profiles by tenant ID and profile ID
   */
  private tenantProfiles: Map<string, Map<string, ComplianceProfile>> = new Map();
  
  /**
   * Set the tenant context
   * @param context Tenant context
   */
  public setTenantContext(context: TenantContext): void {
    this.tenantContext = context;
  }
  
  /**
   * Create a compliance profile
   * @param profile Profile to create
   * @param tenantId Optional tenant ID for tenant-specific profiles
   */
  public async createProfile(profile: ComplianceProfile, tenantId?: string): Promise<void> {
    // Ensure profile has an ID
    if (!profile.id) {
      profile.id = uuidv4();
    }
    
    // Set creation and update dates if not provided
    if (!profile.createdAt) {
      profile.createdAt = new Date();
    }
    if (!profile.updatedAt) {
      profile.updatedAt = new Date();
    }
    
    // Determine if this is a tenant-specific profile
    const isTenantSpecific = !!tenantId || profile.tenantId !== undefined;
    
    // Get tenant ID from parameter, profile, or current context
    const actualTenantId = tenantId || 
                          profile.tenantId || 
                          (isTenantSpecific && this.tenantContext?.getCurrentTenantId()) || 
                          undefined;
    
    // Validate standards
    for (const standardId of profile.standardIds) {
      if (!this.standards.has(standardId)) {
        throw new Error(`Standard with ID ${standardId} does not exist`);
      }
    }
    
    // Validate requirements
    for (const requirementId of profile.requirementIds) {
      if (!this.requirements.has(requirementId)) {
        throw new Error(`Requirement with ID ${requirementId} does not exist`);
      }
    }
    
    // For tenant-specific profiles
    if (isTenantSpecific && actualTenantId) {
      // Initialize tenant profiles map if needed
      if (!this.tenantProfiles.has(actualTenantId)) {
        this.tenantProfiles.set(actualTenantId, new Map());
      }
      
      const tenantProfileMap = this.tenantProfiles.get(actualTenantId)!;
      
      // Check if profile already exists for this tenant
      if (tenantProfileMap.has(profile.id)) {
        throw new Error(`Profile with ID ${profile.id} already exists for tenant ${actualTenantId}`);
      }
      
      // Store tenant-specific profile
      tenantProfileMap.set(profile.id, { 
        ...profile, 
        tenantId: actualTenantId,
        isTenantSpecific: true 
      });
      
      console.log(`Tenant-specific profile created: ${profile.name} (${profile.id}) for tenant ${actualTenantId}`);
    } else {
      // Check if profile already exists
      if (this.profiles.has(profile.id)) {
        throw new Error(`Profile with ID ${profile.id} already exists`);
      }
      
      // Store global profile
      this.profiles.set(profile.id, { 
        ...profile,
        isTenantSpecific: false
      });
      
      console.log(`Profile created: ${profile.name} (${profile.id})`);
    }
  }
  
  /**
   * Get a profile by ID
   * @param profileId Profile ID
   * @param tenantId Optional tenant ID for tenant-specific profiles
   */
  public async getProfile(profileId: string, tenantId?: string): Promise<ComplianceProfile | null> {
    // First check tenant-specific profiles if tenant ID is provided
    if (tenantId) {
      if (this.tenantProfiles.has(tenantId)) {
        const tenantProfileMap = this.tenantProfiles.get(tenantId)!;
        const profile = tenantProfileMap.get(profileId);
        
        if (profile) {
          return { ...profile };
        }
      }
    } 
    // If no tenant ID is provided but we have a tenant context, check current tenant profiles
    else if (this.tenantContext?.getCurrentTenantId()) {
      const currentTenantId = this.tenantContext.getCurrentTenantId()!;
      
      if (this.tenantProfiles.has(currentTenantId)) {
        const tenantProfileMap = this.tenantProfiles.get(currentTenantId)!;
        const profile = tenantProfileMap.get(profileId);
        
        if (profile) {
          return { ...profile };
        }
      }
    }
    
    // Fall back to global profiles
    const profile = this.profiles.get(profileId);
    return profile ? { ...profile } : null;
  }
  
  /**
   * Get all profiles
   * @param filter Optional filter criteria
   * @param tenantId Optional tenant ID to filter by
   * @param includeGlobal Whether to include global profiles (default: true)
   */
  public async getProfiles(
    filter?: Record<string, unknown>,
    tenantId?: string,
    includeGlobal: boolean = true
  ): Promise<ComplianceProfile[]> {
    const result: ComplianceProfile[] = [];
    
    // Add tenant-specific profiles if tenant ID is provided
    if (tenantId) {
      if (this.tenantProfiles.has(tenantId)) {
        const tenantProfileMap = this.tenantProfiles.get(tenantId)!;
        result.push(...Array.from(tenantProfileMap.values()).map(profile => ({ ...profile })));
      }
    }
    // If no tenant ID is provided but we have a tenant context, add current tenant profiles
    else if (this.tenantContext?.getCurrentTenantId()) {
      const currentTenantId = this.tenantContext.getCurrentTenantId()!;
      
      if (this.tenantProfiles.has(currentTenantId)) {
        const tenantProfileMap = this.tenantProfiles.get(currentTenantId)!;
        result.push(...Array.from(tenantProfileMap.values()).map(profile => ({ ...profile })));
      }
    }
    
    // Add global profiles if requested
    if (includeGlobal) {
      result.push(...Array.from(this.profiles.values()).map(profile => ({ ...profile })));
    }
    
    // Apply filters if provided
    let filteredProfiles = result;
    if (filter) {
      filteredProfiles = result.filter(profile => {
        // Filter by name
        if (filter.name && !profile.name.toLowerCase().includes((filter.name as string).toLowerCase())) {
          return false;
        }
        
        // Filter by standard
        if (filter.standardId && !profile.standardIds.includes(filter.standardId as string)) {
          return false;
        }
        
        // Filter by tag
        if (filter.tag && !profile.tags.includes(filter.tag as string)) {
          return false;
        }
        
        // Filter by tenant ID
        if (filter.tenantId && profile.tenantId !== filter.tenantId) {
          return false;
        }
        
        // Filter by tenant-specific flag
        if (filter.isTenantSpecific !== undefined && profile.isTenantSpecific !== filter.isTenantSpecific) {
          return false;
        }
        
        return true;
      });
    }
    
    return filteredProfiles;
  }
  
  /**
   * Get tenant IDs with registered profiles
   * @returns Array of tenant IDs
   */
  public getTenantIds(): string[] {
    return Array.from(this.tenantProfiles.keys());
  }
}