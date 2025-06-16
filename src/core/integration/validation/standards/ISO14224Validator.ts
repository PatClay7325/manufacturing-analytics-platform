import { 
  ValidationError, 
  ValidationOptions, 
  ValidationResult, 
  ValidationWarning 
} from '../BaseValidator';
import { Schema, SchemaValidator, SchemaValidationOptions } from '../SchemaValidator';

/**
 * ISO14224 data categories
 */
export enum ISO14224DataCategory {
  EQUIPMENT = 'equipment',
  FAILURE = 'failure',
  MAINTENANCE = 'maintenance',
  RELIABILITY = 'reliability'
}

/**
 * ISO14224 taxonomy levels for equipment
 */
export enum ISO14224TaxonomyLevel {
  INDUSTRY = 1,
  BUSINESS_CATEGORY = 2,
  INSTALLATION = 3,
  PLANT_UNIT = 4,
  SECTION_SYSTEM = 5,
  EQUIPMENT_UNIT = 6,
  SUBUNIT = 7,
  MAINTAINABLE_ITEM = 8,
  PART = 9
}

/**
 * ISO14224 validation options
 */
export interface ISO14224ValidationOptions extends SchemaValidationOptions {
  validateTaxonomy?: boolean;
  validateFailureModes?: boolean;
  validateMaintenanceActivities?: boolean;
}

/**
 * ISO14224 validator for reliability and maintenance data
 * Implements the ISO 14224 standard for reliability and maintenance data collection
 */
export class ISO14224Validator extends SchemaValidator {
  private static readonly EQUIPMENT_SCHEMA: Schema = {
    type: 'object',
    properties: {
      equipmentId: { type: 'string' },
      taxonomyLevel: { 
        type: 'integer', 
        minimum: 1, 
        maximum: 9,
        description: 'ISO 14224 taxonomy level (1-9)'
      },
      industryCode: { type: 'string' },
      businessCategory: { type: 'string' },
      installation: { type: 'string' },
      plantUnit: { type: 'string' },
      sectionSystem: { type: 'string' },
      equipmentUnit: { type: 'string' },
      subunit: { type: 'string' },
      maintainableItem: { type: 'string' },
      partCode: { type: 'string' },
      manufacturer: { type: 'string' },
      modelNumber: { type: 'string' },
      serialNumber: { type: 'string' },
      installationDate: { type: 'string', format: 'date' },
      operatingContext: {
        type: 'object',
        properties: {
          phase: { type: 'string' },
          mode: { type: 'string' },
          environment: { type: 'string' }
        }
      }
    },
    required: ['equipmentId', 'taxonomyLevel'],
    additionalProperties: false
  };

  private static readonly FAILURE_SCHEMA: Schema = {
    type: 'object',
    properties: {
      failureId: { type: 'string' },
      equipmentId: { type: 'string' },
      failureDate: { type: 'string', format: 'date-time' },
      detectionDate: { type: 'string', format: 'date-time' },
      failureMode: { type: 'string' },
      failureMechanism: { type: 'string' },
      failureCause: { type: 'string' },
      failureImpact: { 
        type: 'string',
        enum: ['critical', 'degraded', 'incipient', 'none']
      },
      downtime: { 
        type: 'object',
        properties: {
          value: { type: 'number', minimum: 0 },
          unit: { 
            type: 'string',
            enum: ['minutes', 'hours', 'days']
          }
        },
        required: ['value', 'unit']
      },
      description: { type: 'string' }
    },
    required: ['failureId', 'equipmentId', 'failureDate', 'failureMode'],
    additionalProperties: false
  };

  private static readonly MAINTENANCE_SCHEMA: Schema = {
    type: 'object',
    properties: {
      maintenanceId: { type: 'string' },
      equipmentId: { type: 'string' },
      maintenanceDate: { type: 'string', format: 'date-time' },
      completionDate: { type: 'string', format: 'date-time' },
      maintenanceType: { 
        type: 'string',
        enum: ['corrective', 'preventive', 'condition-based', 'predictive']
      },
      activityType: { type: 'string' },
      maintenanceProcedure: { type: 'string' },
      resources: {
        type: 'object',
        properties: {
          labor: {
            type: 'object',
            properties: {
              hours: { type: 'number', minimum: 0 },
              personnel: { type: 'integer', minimum: 0 }
            }
          },
          materials: { type: 'array', items: { type: 'string' } },
          cost: { type: 'number', minimum: 0 }
        }
      },
      relatedFailureId: { type: 'string' }
    },
    required: ['maintenanceId', 'equipmentId', 'maintenanceDate', 'maintenanceType'],
    additionalProperties: false
  };

  // Maps data category to schema
  private schemaMap: Map<ISO14224DataCategory, Schema>;
  
  // Reference data for validation
  private failureModes: Set<string>;
  private maintenanceActivities: Set<string>;

  /**
   * Create a new ISO14224 validator
   */
  constructor() {
    // Call parent constructor with the equipment schema as default
    super(
      'ISO14224Validator', 
      '2016', // ISO 14224:2016 is the current version
      ISO14224Validator.EQUIPMENT_SCHEMA,
      [
        ISO14224DataCategory.EQUIPMENT, 
        ISO14224DataCategory.FAILURE,
        ISO14224DataCategory.MAINTENANCE,
        ISO14224DataCategory.RELIABILITY
      ]
    );
    
    // Initialize schema map
    this.schemaMap = new Map();
    this.schemaMap.set(ISO14224DataCategory.EQUIPMENT, ISO14224Validator.EQUIPMENT_SCHEMA);
    this.schemaMap.set(ISO14224DataCategory.FAILURE, ISO14224Validator.FAILURE_SCHEMA);
    this.schemaMap.set(ISO14224DataCategory.MAINTENANCE, ISO14224Validator.MAINTENANCE_SCHEMA);
    
    // Initialize reference data
    this.failureModes = new Set([
      'mechanical_failure', 'electrical_failure', 'structural_failure',
      'control_system_failure', 'instrumentation_failure', 'external_damage',
      'material_failure', 'process_related', 'design_related', 'manufacturing_defect',
      'installation_error', 'operational_error', 'maintenance_error'
    ]);
    
    this.maintenanceActivities = new Set([
      'inspection', 'testing', 'servicing', 'calibration', 'adjustment',
      'repair', 'replacement', 'overhaul', 'modification', 'cleaning',
      'lubrication', 'alignment', 'condition_monitoring'
    ]);
  }

  /**
   * Validate data against ISO 14224 standard
   * 
   * @param data - Data to validate
   * @param options - Validation options
   * @returns Validation result
   */
  validate(data: any, options?: ISO14224ValidationOptions): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Set default options
    const opts: ISO14224ValidationOptions = {
      strictMode: true,
      validateTaxonomy: true,
      validateFailureModes: true,
      validateMaintenanceActivities: true,
      validateRelationships: true,
      validateCompleteness: true,
      ...options
    };
    
    // Determine data category and use appropriate schema
    const category = this.determineDataCategory(data);
    if (category) {
      const schema = this.schemaMap.get(category);
      if (schema) {
        // Call schema validator with the appropriate schema
        const schemaValidator = new SchemaValidator(
          `ISO14224_${category}`, 
          this.getVersion(), 
          schema
        );
        const schemaResult = schemaValidator.validate(data, opts);
        
        // Add schema validation errors
        errors.push(...schemaResult.errors);
        if (schemaResult.warnings) {
          warnings.push(...schemaResult.warnings);
        }
      } else {
        errors.push(this.createError(
          'iso14224.unknownSchema',
          `No schema found for ISO 14224 data category: ${category}`,
          '/'
        ));
      }
    } else {
      errors.push(this.createError(
        'iso14224.unknownCategory',
        'Could not determine ISO 14224 data category',
        '/'
      ));
      return this.createResult(false, errors, warnings);
    }
    
    // Perform additional validations based on data category
    switch (category) {
      case ISO14224DataCategory.EQUIPMENT:
        if (opts.validateTaxonomy) {
          this.validateTaxonomyConsistency(data, errors, warnings);
        }
        break;
        
      case ISO14224DataCategory.FAILURE:
        if (opts.validateFailureModes) {
          this.validateFailureMode(data, errors, warnings);
        }
        break;
        
      case ISO14224DataCategory.MAINTENANCE:
        if (opts.validateMaintenanceActivities) {
          this.validateMaintenanceActivity(data, errors, warnings);
        }
        break;
    }
    
    // Validate relationships if needed
    if (opts.validateRelationships) {
      this.validateRelationships(data, category, errors, warnings);
    }
    
    return this.createResult(errors.length === 0, errors, warnings);
  }
  
  /**
   * Determine the data category based on the data structure
   */
  private determineDataCategory(data: any): ISO14224DataCategory | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    
    if (data.equipmentId && data.taxonomyLevel) {
      return ISO14224DataCategory.EQUIPMENT;
    } else if (data.failureId && data.failureMode) {
      return ISO14224DataCategory.FAILURE;
    } else if (data.maintenanceId && data.maintenanceType) {
      return ISO14224DataCategory.MAINTENANCE;
    }
    
    return null;
  }
  
  /**
   * Validate taxonomy consistency (hierarchy relationships)
   */
  private validateTaxonomyConsistency(data: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!data || typeof data !== 'object' || !data.taxonomyLevel) {
      return;
    }
    
    const level = data.taxonomyLevel as number;
    
    // Validate taxonomy level is valid
    if (level < ISO14224TaxonomyLevel.INDUSTRY || level > ISO14224TaxonomyLevel.PART) {
      errors.push(this.createError(
        'iso14224.invalidTaxonomyLevel',
        `Invalid taxonomy level: ${level}. Must be between 1 and 9.`,
        '/taxonomyLevel',
        level
      ));
      return;
    }
    
    // Check required fields based on taxonomy level
    const requiredFields: { [key: number]: string[] } = {
      [ISO14224TaxonomyLevel.INDUSTRY]: ['industryCode'],
      [ISO14224TaxonomyLevel.BUSINESS_CATEGORY]: ['industryCode', 'businessCategory'],
      [ISO14224TaxonomyLevel.INSTALLATION]: ['industryCode', 'businessCategory', 'installation'],
      [ISO14224TaxonomyLevel.PLANT_UNIT]: ['industryCode', 'businessCategory', 'installation', 'plantUnit'],
      [ISO14224TaxonomyLevel.SECTION_SYSTEM]: ['industryCode', 'businessCategory', 'installation', 'plantUnit', 'sectionSystem'],
      [ISO14224TaxonomyLevel.EQUIPMENT_UNIT]: ['industryCode', 'businessCategory', 'installation', 'plantUnit', 'sectionSystem', 'equipmentUnit'],
      [ISO14224TaxonomyLevel.SUBUNIT]: ['industryCode', 'businessCategory', 'installation', 'plantUnit', 'sectionSystem', 'equipmentUnit', 'subunit'],
      [ISO14224TaxonomyLevel.MAINTAINABLE_ITEM]: ['industryCode', 'businessCategory', 'installation', 'plantUnit', 'sectionSystem', 'equipmentUnit', 'subunit', 'maintainableItem'],
      [ISO14224TaxonomyLevel.PART]: ['industryCode', 'businessCategory', 'installation', 'plantUnit', 'sectionSystem', 'equipmentUnit', 'subunit', 'maintainableItem', 'partCode']
    };
    
    const requiredForLevel = requiredFields[level] || [];
    
    // Check if all required fields for the level are present
    for (const field of requiredForLevel) {
      if (!data[field]) {
        errors.push(this.createError(
          'iso14224.missingTaxonomyField',
          `Field '${field}' is required for taxonomy level ${level}`,
          `/${field}`
        ));
      }
    }
    
    // Check for inconsistencies in higher levels than specified
    Object.keys(data).forEach(key => {
      const fieldLevelMap: { [key: string]: number } = {
        'industryCode': ISO14224TaxonomyLevel.INDUSTRY,
        'businessCategory': ISO14224TaxonomyLevel.BUSINESS_CATEGORY,
        'installation': ISO14224TaxonomyLevel.INSTALLATION,
        'plantUnit': ISO14224TaxonomyLevel.PLANT_UNIT,
        'sectionSystem': ISO14224TaxonomyLevel.SECTION_SYSTEM,
        'equipmentUnit': ISO14224TaxonomyLevel.EQUIPMENT_UNIT,
        'subunit': ISO14224TaxonomyLevel.SUBUNIT,
        'maintainableItem': ISO14224TaxonomyLevel.MAINTAINABLE_ITEM,
        'partCode': ISO14224TaxonomyLevel.PART
      };
      
      if (fieldLevelMap[key] && fieldLevelMap[key] > level && data[key]) {
        warnings.push(this.createWarning(
          'iso14224.unnecessaryTaxonomyField',
          `Field '${key}' is not expected for taxonomy level ${level}`,
          `/${key}`,
          data[key]
        ));
      }
    });
  }
  
  /**
   * Validate failure mode against reference data
   */
  private validateFailureMode(data: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!data || typeof data !== 'object' || !data.failureMode) {
      return;
    }
    
    const failureMode = data.failureMode.toLowerCase().replace(/\s+/g, '_');
    
    if (!this.failureModes.has(failureMode)) {
      warnings.push(this.createWarning(
        'iso14224.unknownFailureMode',
        `Failure mode '${data.failureMode}' is not in the standard ISO 14224 reference data`,
        '/failureMode',
        data.failureMode
      ));
    }
    
    // Validate consistency between failure mode and mechanism
    if (data.failureMode && data.failureMechanism) {
      // In a real implementation, we would have a mapping of valid combinations
      // For this example, we'll just demonstrate the concept
      const invalidCombinations: [string, string][] = [
        ['electrical_failure', 'corrosion'],
        ['structural_failure', 'short_circuit']
      ];
      
      for (const [mode, mechanism] of invalidCombinations) {
        if (failureMode === mode && data.failureMechanism.toLowerCase().includes(mechanism)) {
          errors.push(this.createError(
            'iso14224.incompatibleFailureMechanism',
            `Failure mechanism '${data.failureMechanism}' is not compatible with failure mode '${data.failureMode}'`,
            '/failureMechanism',
            data.failureMechanism
          ));
        }
      }
    }
  }
  
  /**
   * Validate maintenance activity against reference data
   */
  private validateMaintenanceActivity(data: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!data || typeof data !== 'object' || !data.activityType) {
      return;
    }
    
    const activityType = data.activityType.toLowerCase().replace(/\s+/g, '_');
    
    if (!this.maintenanceActivities.has(activityType)) {
      warnings.push(this.createWarning(
        'iso14224.unknownMaintenanceActivity',
        `Maintenance activity '${data.activityType}' is not in the standard ISO 14224 reference data`,
        '/activityType',
        data.activityType
      ));
    }
    
    // Validate consistency between maintenance type and activity
    if (data.maintenanceType && data.activityType) {
      // Maintenance activities that don't make sense for certain maintenance types
      const invalidCombinations: { [key: string]: string[] } = {
        'corrective': ['condition_monitoring', 'calibration'],
        'preventive': ['repair', 'replacement'],
        'condition-based': ['overhaul', 'inspection']
      };
      
      const invalidActivities = invalidCombinations[data.maintenanceType] || [];
      if (invalidActivities.includes(activityType)) {
        warnings.push(this.createWarning(
          'iso14224.unlikelyMaintenanceActivity',
          `Maintenance activity '${data.activityType}' is unusual for maintenance type '${data.maintenanceType}'`,
          '/activityType',
          data.activityType
        ));
      }
    }
  }
  
  /**
   * Validate relationships between different data categories
   */
  private validateRelationships(
    data: any, 
    category: ISO14224DataCategory,
    errors: ValidationError[], 
    warnings: ValidationWarning[]
  ): void {
    if (!data || typeof data !== 'object') {
      return;
    }
    
    // Example validation: check if maintenance refers to valid failure
    if (category === ISO14224DataCategory.MAINTENANCE && data.relatedFailureId) {
      // In a real implementation, we would check if the failure exists in the database
      // For this example, we'll just demonstrate the concept with a warning
      warnings.push(this.createWarning(
        'iso14224.relationshipValidation',
        `Relationship to failure '${data.relatedFailureId}' should be verified`,
        '/relatedFailureId',
        data.relatedFailureId
      ));
    }
    
    // Validate date relationships
    if (category === ISO14224DataCategory.FAILURE) {
      if (data.failureDate && data.detectionDate) {
        const failureDate = new Date(data.failureDate);
        const detectionDate = new Date(data.detectionDate);
        
        if (detectionDate < failureDate) {
          errors.push(this.createError(
            'iso14224.invalidDateRelationship',
            'Detection date cannot be earlier than failure date',
            '/detectionDate',
            data.detectionDate
          ));
        }
      }
    }
    
    if (category === ISO14224DataCategory.MAINTENANCE) {
      if (data.maintenanceDate && data.completionDate) {
        const maintenanceDate = new Date(data.maintenanceDate);
        const completionDate = new Date(data.completionDate);
        
        if (completionDate < maintenanceDate) {
          errors.push(this.createError(
            'iso14224.invalidDateRelationship',
            'Completion date cannot be earlier than maintenance start date',
            '/completionDate',
            data.completionDate
          ));
        }
      }
    }
  }
}