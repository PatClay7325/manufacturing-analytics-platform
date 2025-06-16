/**
 * Schema Mapper
 * 
 * Provides a flexible system for mapping between different data schemas.
 * Supports simple field mappings, nested mappings, array mappings,
 * and custom transformation functions.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Field mapping type
 * Represents the different types of field mappings
 */
export enum FieldMappingType {
  /**
   * Direct 1:1 mapping between source and target fields
   */
  DIRECT = 'direct',
  
  /**
   * Computed field based on multiple source fields
   */
  COMPUTED = 'computed',
  
  /**
   * Constant value field
   */
  CONSTANT = 'constant',
  
  /**
   * Field that is not mapped
   */
  IGNORED = 'ignored',
  
  /**
   * Array mapping with item transformation
   */
  ARRAY = 'array',
  
  /**
   * Nested object mapping
   */
  NESTED = 'nested'
}

/**
 * Base field mapping interface
 */
export interface BaseFieldMapping {
  /**
   * Unique identifier for this mapping
   */
  id: string;
  
  /**
   * Type of mapping
   */
  type: FieldMappingType;
  
  /**
   * Target field path in dot notation (e.g., 'user.address.city')
   */
  targetPath: string;
  
  /**
   * Description of this mapping
   */
  description?: string;
  
  /**
   * Condition function to determine if mapping should be applied
   */
  condition?: (source: Record<string, unknown>) => boolean;
}

/**
 * Direct field mapping
 * Maps a source field directly to a target field
 */
export interface DirectFieldMapping extends BaseFieldMapping {
  type: FieldMappingType.DIRECT;
  
  /**
   * Source field path in dot notation (e.g., 'customer.address.city')
   */
  sourcePath: string;
  
  /**
   * Optional value transformation function
   */
  transform?: (value: unknown) => unknown;
  
  /**
   * Default value if source field is missing or null
   */
  defaultValue?: unknown;
}

/**
 * Computed field mapping
 * Computes a target field based on multiple source fields
 */
export interface ComputedFieldMapping extends BaseFieldMapping {
  type: FieldMappingType.COMPUTED;
  
  /**
   * Computation function that takes the source object and returns a value
   */
  compute: (source: Record<string, unknown>) => unknown;
}

/**
 * Constant field mapping
 * Sets a target field to a constant value
 */
export interface ConstantFieldMapping extends BaseFieldMapping {
  type: FieldMappingType.CONSTANT;
  
  /**
   * Constant value to set
   */
  value: unknown;
}

/**
 * Ignored field mapping
 * Explicitly marks a field as not mapped
 */
export interface IgnoredFieldMapping extends BaseFieldMapping {
  type: FieldMappingType.IGNORED;
}

/**
 * Array field mapping
 * Maps an array with item transformations
 */
export interface ArrayFieldMapping extends BaseFieldMapping {
  type: FieldMappingType.ARRAY;
  
  /**
   * Source array path in dot notation
   */
  sourcePath: string;
  
  /**
   * Mapping to apply to each array item
   */
  itemMapping: FieldMapping[];
  
  /**
   * Optional filter function for array items
   */
  filter?: (item: unknown) => boolean;
  
  /**
   * Default value if source field is missing or null
   */
  defaultValue?: unknown[];
}

/**
 * Nested object mapping
 * Maps a nested object using its own field mappings
 */
export interface NestedFieldMapping extends BaseFieldMapping {
  type: FieldMappingType.NESTED;
  
  /**
   * Source object path in dot notation
   */
  sourcePath: string;
  
  /**
   * Mappings to apply to the nested object
   */
  mappings: FieldMapping[];
  
  /**
   * Default value if source field is missing or null
   */
  defaultValue?: Record<string, unknown>;
}

/**
 * Union type for all field mappings
 */
export type FieldMapping = 
  | DirectFieldMapping
  | ComputedFieldMapping
  | ConstantFieldMapping
  | IgnoredFieldMapping
  | ArrayFieldMapping
  | NestedFieldMapping;

/**
 * Schema mapping interface
 * Defines a complete mapping between two schemas
 */
export interface SchemaMapping {
  /**
   * Unique identifier for this schema mapping
   */
  id: string;
  
  /**
   * Name of the schema mapping
   */
  name: string;
  
  /**
   * Description of the schema mapping
   */
  description?: string;
  
  /**
   * Source schema name/identifier
   */
  sourceSchema: string;
  
  /**
   * Target schema name/identifier
   */
  targetSchema: string;
  
  /**
   * Version of this mapping
   */
  version: string;
  
  /**
   * Field mappings
   */
  fieldMappings: FieldMapping[];
  
  /**
   * Custom metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Mapping result interface
 */
export interface MappingResult<T = unknown> {
  /**
   * Whether the mapping was successful
   */
  success: boolean;
  
  /**
   * The mapped data if successful
   */
  data?: T;
  
  /**
   * Error information if mapping failed
   */
  error?: {
    message: string;
    path?: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Schema Mapper class
 * Handles the application of schema mappings to data
 */
export class SchemaMapper {
  /**
   * Apply a schema mapping to source data
   * @param source Source data object
   * @param mapping Schema mapping to apply
   * @returns Mapping result with the transformed data
   */
  applyMapping<T = Record<string, unknown>>(
    source: Record<string, unknown>,
    mapping: SchemaMapping
  ): MappingResult<T> {
    try {
      // Validate inputs
      if (!source || typeof source !== 'object') {
        return this.createErrorResult('Invalid source data: expected object');
      }
      
      if (!mapping || !mapping.fieldMappings) {
        return this.createErrorResult('Invalid mapping: missing field mappings');
      }
      
      // Create target object
      const target: Record<string, unknown> = {};
      
      // Apply each field mapping
      for (const fieldMapping of mapping.fieldMappings) {
        // Check mapping condition if present
        if (fieldMapping.condition && !fieldMapping.condition(source)) {
          continue;
        }
        
        try {
          this.applyFieldMapping(source, target, fieldMapping);
        } catch (error) {
          return this.createErrorResult(
            `Error mapping field '${fieldMapping.targetPath}': ${(error as Error).message}`,
            fieldMapping.targetPath
          );
        }
      }
      
      return {
        success: true,
        data: target as unknown as T
      };
    } catch (error) {
      return this.createErrorResult(`Mapping error: ${(error as Error).message}`);
    }
  }

  /**
   * Apply a field mapping to the source data
   * @param source Source data object
   * @param target Target data object being built
   * @param mapping Field mapping to apply
   */
  private applyFieldMapping(
    source: Record<string, unknown>,
    target: Record<string, unknown>,
    mapping: FieldMapping
  ): void {
    switch (mapping.type) {
      case FieldMappingType.DIRECT:
        this.applyDirectMapping(source, target, mapping);
        break;
        
      case FieldMappingType.COMPUTED:
        this.applyComputedMapping(source, target, mapping);
        break;
        
      case FieldMappingType.CONSTANT:
        this.applyConstantMapping(target, mapping);
        break;
        
      case FieldMappingType.IGNORED:
        // Do nothing for ignored fields
        break;
        
      case FieldMappingType.ARRAY:
        this.applyArrayMapping(source, target, mapping);
        break;
        
      case FieldMappingType.NESTED:
        this.applyNestedMapping(source, target, mapping);
        break;
        
      default:
        throw new Error(`Unknown mapping type: ${(mapping as any).type}`);
    }
  }

  /**
   * Apply a direct field mapping
   * @param source Source data object
   * @param target Target data object
   * @param mapping Direct field mapping
   */
  private applyDirectMapping(
    source: Record<string, unknown>,
    target: Record<string, unknown>,
    mapping: DirectFieldMapping
  ): void {
    // Get source value using path
    const sourceValue = this.getValueByPath(source, mapping.sourcePath);
    
    // Apply default value if needed
    let value = sourceValue !== undefined && sourceValue !== null
      ? sourceValue
      : mapping.defaultValue;
    
    // Apply transformation if provided
    if (mapping.transform && value !== undefined) {
      value = mapping.transform(value);
    }
    
    // Set target value
    if (value !== undefined) {
      this.setValueByPath(target, mapping.targetPath, value);
    }
  }

  /**
   * Apply a computed field mapping
   * @param source Source data object
   * @param target Target data object
   * @param mapping Computed field mapping
   */
  private applyComputedMapping(
    source: Record<string, unknown>,
    target: Record<string, unknown>,
    mapping: ComputedFieldMapping
  ): void {
    // Compute value
    const value = mapping.compute(source);
    
    // Set target value if not undefined
    if (value !== undefined) {
      this.setValueByPath(target, mapping.targetPath, value);
    }
  }

  /**
   * Apply a constant field mapping
   * @param target Target data object
   * @param mapping Constant field mapping
   */
  private applyConstantMapping(
    target: Record<string, unknown>,
    mapping: ConstantFieldMapping
  ): void {
    // Set constant value
    this.setValueByPath(target, mapping.targetPath, mapping.value);
  }

  /**
   * Apply an array field mapping
   * @param source Source data object
   * @param target Target data object
   * @param mapping Array field mapping
   */
  private applyArrayMapping(
    source: Record<string, unknown>,
    target: Record<string, unknown>,
    mapping: ArrayFieldMapping
  ): void {
    // Get source array
    const sourceArray = this.getValueByPath(source, mapping.sourcePath);
    
    // Handle undefined or non-array source
    if (sourceArray === undefined || sourceArray === null) {
      if (mapping.defaultValue !== undefined) {
        this.setValueByPath(target, mapping.targetPath, mapping.defaultValue);
      }
      return;
    }
    
    if (!Array.isArray(sourceArray)) {
      throw new Error(`Expected array at path '${mapping.sourcePath}' but got ${typeof sourceArray}`);
    }
    
    // Map each array item
    let targetArray = sourceArray
      .filter(item => !mapping.filter || mapping.filter(item))
      .map(item => {
        const itemSource = typeof item === 'object' ? item : { value: item };
        const itemTarget: Record<string, unknown> = {};
        
        // Apply each field mapping to the item
        for (const itemMapping of mapping.itemMapping) {
          this.applyFieldMapping(
            itemSource as Record<string, unknown>, 
            itemTarget, 
            itemMapping
          );
        }
        
        return itemTarget;
      });
    
    // Set target array
    this.setValueByPath(target, mapping.targetPath, targetArray);
  }

  /**
   * Apply a nested object mapping
   * @param source Source data object
   * @param target Target data object
   * @param mapping Nested field mapping
   */
  private applyNestedMapping(
    source: Record<string, unknown>,
    target: Record<string, unknown>,
    mapping: NestedFieldMapping
  ): void {
    // Get source nested object
    const sourceNested = this.getValueByPath(source, mapping.sourcePath);
    
    // Handle undefined or non-object source
    if (sourceNested === undefined || sourceNested === null) {
      if (mapping.defaultValue !== undefined) {
        this.setValueByPath(target, mapping.targetPath, mapping.defaultValue);
      }
      return;
    }
    
    if (typeof sourceNested !== 'object' || Array.isArray(sourceNested)) {
      throw new Error(`Expected object at path '${mapping.sourcePath}' but got ${typeof sourceNested}`);
    }
    
    // Create nested target object
    const nestedTarget: Record<string, unknown> = {};
    
    // Apply each field mapping to the nested object
    for (const nestedMapping of mapping.mappings) {
      this.applyFieldMapping(
        sourceNested as Record<string, unknown>, 
        nestedTarget, 
        nestedMapping
      );
    }
    
    // Set nested target object
    this.setValueByPath(target, mapping.targetPath, nestedTarget);
  }

  /**
   * Get a value from an object using dot notation path
   * @param obj Source object
   * @param path Path in dot notation (e.g., 'user.address.city')
   * @returns Value at the path or undefined if not found
   */
  getValueByPath(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      if (typeof current !== 'object') {
        return undefined;
      }
      
      current = (current as Record<string, unknown>)[part];
    }
    
    return current;
  }

  /**
   * Set a value in an object using dot notation path
   * Creates intermediate objects if they don't exist
   * @param obj Target object
   * @param path Path in dot notation (e.g., 'user.address.city')
   * @param value Value to set
   */
  setValueByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj;
    
    // Create intermediate objects
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (!(part in current) || current[part] === null || typeof current[part] !== 'object') {
        current[part] = {};
      }
      
      current = current[part] as Record<string, unknown>;
    }
    
    // Set the value
    current[parts[parts.length - 1]] = value;
  }

  /**
   * Create a new field mapping with a generated ID
   * @param mapping Field mapping without ID
   * @returns Complete field mapping with ID
   */
  createFieldMapping<T extends Omit<FieldMapping, 'id'>>(mapping: T): T & { id: string } {
    return {
      ...mapping,
      id: uuidv4()
    };
  }

  /**
   * Create a new schema mapping with a generated ID
   * @param mapping Schema mapping without ID
   * @returns Complete schema mapping with ID
   */
  createSchemaMapping(mapping: Omit<SchemaMapping, 'id'>): SchemaMapping {
    return {
      ...mapping,
      id: uuidv4()
    };
  }

  /**
   * Create error mapping result
   * @param message Error message
   * @param path Optional path where the error occurred
   * @param details Additional error details
   * @returns Error mapping result
   */
  private createErrorResult<T>(
    message: string,
    path?: string,
    details?: Record<string, unknown>
  ): MappingResult<T> {
    return {
      success: false,
      error: {
        message,
        path,
        details
      }
    };
  }
}