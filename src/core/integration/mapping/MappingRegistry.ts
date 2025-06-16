/**
 * Mapping Registry
 * 
 * Provides a centralized registry for managing schema mappings.
 * Allows registering, retrieving, and managing schema mappings
 * for different source and target schemas.
 */

import { SchemaMapping } from './SchemaMapper';

/**
 * Schema mapping query interface
 * Used to search for mappings in the registry
 */
export interface MappingQuery {
  /**
   * Source schema to match
   */
  sourceSchema?: string;
  
  /**
   * Target schema to match
   */
  targetSchema?: string;
  
  /**
   * Mapping ID to match
   */
  id?: string;
  
  /**
   * Mapping name to match
   */
  name?: string;
  
  /**
   * Mapping version to match
   */
  version?: string;
  
  /**
   * Match custom metadata fields
   */
  metadata?: Record<string, unknown>;
}

/**
 * Mapping registry class
 * Manages schema mappings for the integration framework
 */
export class MappingRegistry {
  private mappings: Map<string, SchemaMapping> = new Map();
  
  /**
   * Register a new schema mapping
   * @param mapping Schema mapping to register
   * @throws Error if a mapping with the same ID already exists
   */
  registerMapping(mapping: SchemaMapping): void {
    if (!mapping.id) {
      throw new Error('Cannot register mapping without an ID');
    }
    
    if (this.mappings.has(mapping.id)) {
      throw new Error(`Mapping with ID '${mapping.id}' already exists`);
    }
    
    this.mappings.set(mapping.id, mapping);
  }
  
  /**
   * Update an existing schema mapping
   * @param mapping Schema mapping to update
   * @throws Error if mapping doesn't exist
   */
  updateMapping(mapping: SchemaMapping): void {
    if (!mapping.id) {
      throw new Error('Cannot update mapping without an ID');
    }
    
    if (!this.mappings.has(mapping.id)) {
      throw new Error(`Mapping with ID '${mapping.id}' not found`);
    }
    
    this.mappings.set(mapping.id, mapping);
  }
  
  /**
   * Register or update a schema mapping
   * @param mapping Schema mapping to register or update
   */
  registerOrUpdateMapping(mapping: SchemaMapping): void {
    if (!mapping.id) {
      throw new Error('Cannot register or update mapping without an ID');
    }
    
    this.mappings.set(mapping.id, mapping);
  }
  
  /**
   * Get a schema mapping by ID
   * @param id Mapping ID
   * @returns Schema mapping or undefined if not found
   */
  getMappingById(id: string): SchemaMapping | undefined {
    return this.mappings.get(id);
  }
  
  /**
   * Delete a schema mapping by ID
   * @param id Mapping ID
   * @returns Whether the mapping was deleted
   */
  deleteMapping(id: string): boolean {
    return this.mappings.delete(id);
  }
  
  /**
   * Find schema mappings by source and target schema
   * @param sourceSchema Source schema name/identifier
   * @param targetSchema Target schema name/identifier
   * @returns Array of matching schema mappings
   */
  findMappings(sourceSchema: string, targetSchema: string): SchemaMapping[] {
    return Array.from(this.mappings.values()).filter(mapping => 
      mapping.sourceSchema === sourceSchema && mapping.targetSchema === targetSchema
    );
  }
  
  /**
   * Find the latest version of a schema mapping
   * @param sourceSchema Source schema name/identifier
   * @param targetSchema Target schema name/identifier
   * @returns Latest version of the schema mapping or undefined if not found
   */
  findLatestMapping(sourceSchema: string, targetSchema: string): SchemaMapping | undefined {
    const mappings = this.findMappings(sourceSchema, targetSchema);
    
    if (mappings.length === 0) {
      return undefined;
    }
    
    // Sort by version in descending order (assuming semantic versioning)
    return mappings.sort((a, b) => {
      // Simple version comparison - for semantic versions, use a proper semver library
      return b.version.localeCompare(a.version, undefined, { numeric: true });
    })[0];
  }
  
  /**
   * Search for schema mappings using a query object
   * @param query Mapping query object
   * @returns Array of matching schema mappings
   */
  searchMappings(query: MappingQuery): SchemaMapping[] {
    return Array.from(this.mappings.values()).filter(mapping => {
      // Match by ID if specified
      if (query.id && mapping.id !== query.id) {
        return false;
      }
      
      // Match by name if specified
      if (query.name && mapping.name !== query.name) {
        return false;
      }
      
      // Match by source schema if specified
      if (query.sourceSchema && mapping.sourceSchema !== query.sourceSchema) {
        return false;
      }
      
      // Match by target schema if specified
      if (query.targetSchema && mapping.targetSchema !== query.targetSchema) {
        return false;
      }
      
      // Match by version if specified
      if (query.version && mapping.version !== query.version) {
        return false;
      }
      
      // Match by metadata if specified
      if (query.metadata && mapping.metadata) {
        for (const [key, value] of Object.entries(query.metadata)) {
          if (mapping.metadata[key] !== value) {
            return false;
          }
        }
      }
      
      return true;
    });
  }
  
  /**
   * Get all registered schema mappings
   * @returns Array of all schema mappings
   */
  getAllMappings(): SchemaMapping[] {
    return Array.from(this.mappings.values());
  }
  
  /**
   * Get all source schemas
   * @returns Array of unique source schema names
   */
  getSourceSchemas(): string[] {
    const schemas = new Set<string>();
    
    for (const mapping of this.mappings.values()) {
      schemas.add(mapping.sourceSchema);
    }
    
    return Array.from(schemas);
  }
  
  /**
   * Get all target schemas
   * @returns Array of unique target schema names
   */
  getTargetSchemas(): string[] {
    const schemas = new Set<string>();
    
    for (const mapping of this.mappings.values()) {
      schemas.add(mapping.targetSchema);
    }
    
    return Array.from(schemas);
  }
  
  /**
   * Get target schemas for a given source schema
   * @param sourceSchema Source schema name/identifier
   * @returns Array of target schema names
   */
  getTargetSchemasForSource(sourceSchema: string): string[] {
    const schemas = new Set<string>();
    
    for (const mapping of this.mappings.values()) {
      if (mapping.sourceSchema === sourceSchema) {
        schemas.add(mapping.targetSchema);
      }
    }
    
    return Array.from(schemas);
  }
  
  /**
   * Get source schemas for a given target schema
   * @param targetSchema Target schema name/identifier
   * @returns Array of source schema names
   */
  getSourceSchemasForTarget(targetSchema: string): string[] {
    const schemas = new Set<string>();
    
    for (const mapping of this.mappings.values()) {
      if (mapping.targetSchema === targetSchema) {
        schemas.add(mapping.sourceSchema);
      }
    }
    
    return Array.from(schemas);
  }
  
  /**
   * Check if a mapping path exists between source and target schemas
   * @param sourceSchema Source schema name/identifier
   * @param targetSchema Target schema name/identifier
   * @returns Whether a mapping path exists
   */
  hasMappingPath(sourceSchema: string, targetSchema: string): boolean {
    return this.findMappings(sourceSchema, targetSchema).length > 0;
  }
  
  /**
   * Clear all mappings
   */
  clearMappings(): void {
    this.mappings.clear();
  }
  
  /**
   * Get the number of registered mappings
   * @returns Number of mappings
   */
  get count(): number {
    return this.mappings.size;
  }
  
  /**
   * Export all mappings to JSON
   * @returns JSON string of all mappings
   */
  exportMappings(): string {
    return JSON.stringify(Array.from(this.mappings.values()), null, 2);
  }
  
  /**
   * Import mappings from JSON
   * @param json JSON string of mappings
   * @param overwrite Whether to overwrite existing mappings
   * @returns Number of mappings imported
   */
  importMappings(json: string, overwrite = false): number {
    try {
      const mappings = JSON.parse(json) as SchemaMapping[];
      
      if (!Array.isArray(mappings)) {
        throw new Error('Invalid mappings format: expected array');
      }
      
      let imported = 0;
      
      for (const mapping of mappings) {
        if (!mapping.id) {
          continue;
        }
        
        if (overwrite || !this.mappings.has(mapping.id)) {
          this.mappings.set(mapping.id, mapping);
          imported++;
        }
      }
      
      return imported;
    } catch (error) {
      throw new Error(`Failed to import mappings: ${(error as Error).message}`);
    }
  }
}