import Ajv, { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { 
  BaseValidator, 
  ValidationError, 
  ValidationOptions, 
  ValidationResult, 
  ValidationWarning 
} from './BaseValidator';

/**
 * Schema interface for defining JSON schemas
 */
export interface Schema {
  $id?: string;
  $schema?: string;
  title?: string;
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
  [key: string]: any;
}

/**
 * SchemaValidationOptions extends ValidationOptions with schema-specific options
 */
export interface SchemaValidationOptions extends ValidationOptions {
  additionalPropertiesWarning?: boolean;
  skipMissingProperties?: boolean;
}

/**
 * Schema validator for validating data against JSON schemas
 */
export class SchemaValidator extends BaseValidator {
  private schema: Schema;
  private ajv: Ajv;

  /**
   * Create a new schema validator
   * 
   * @param name - Name of the validator
   * @param version - Version of the schema
   * @param schema - JSON Schema definition
   * @param supportedDataTypes - Data types this validator supports
   */
  constructor(name: string, version: string, schema: Schema, supportedDataTypes: string[] = []) {
    super(name, version, supportedDataTypes);
    this.schema = schema;
    
    // Initialize AJV with strict mode and all errors
    this.ajv = new Ajv({ 
      allErrors: true, 
      strict: true,
      validateFormats: true
    });
    
    // Add formats like date, email, etc.
    addFormats(this.ajv);
    
    // Compile the schema
    this.ajv.compile(schema);
  }

  /**
   * Validate data against the schema
   * 
   * @param data - Data to validate
   * @param options - Validation options
   * @returns Validation result
   */
  validate(data: any, options?: SchemaValidationOptions): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    
    // Set default options
    const opts: SchemaValidationOptions = {
      strictMode: true,
      ignoreWarnings: false,
      additionalPropertiesWarning: true,
      skipMissingProperties: false,
      validateCompleteness: true,
      ...options
    };
    
    // Run AJV validation
    const validate = this.ajv.compile(this.schema);
    const valid = validate(data);
    
    if (!valid && validate.errors) {
      // Process validation errors
      for (const err of validate.errors) {
        errors.push(this.mapAjvError(err));
      }
    }
    
    // Additional validations beyond basic schema
    if (opts.validateCompleteness) {
      this.validateCompleteness(data, errors, warnings);
    }
    
    // Check for additional properties if configured
    if (opts.additionalPropertiesWarning) {
      this.checkAdditionalProperties(data, warnings);
    }
    
    return this.createResult(errors.length === 0, errors, warnings);
  }
  
  /**
   * Map AJV error to our ValidationError format
   */
  private mapAjvError(error: ErrorObject): ValidationError {
    const path = error.instancePath || '/';
    let message = error.message || 'Unknown validation error';
    
    // Enhance message based on error keyword
    switch (error.keyword) {
      case 'required':
        const missingProp = error.params.missingProperty;
        message = `Required property '${missingProp}' is missing`;
        break;
      case 'type':
        message = `Expected ${error.params.type} but got ${typeof error.data}`;
        break;
      case 'format':
        message = `Value does not match ${error.params.format} format`;
        break;
      case 'enum':
        message = `Value must be one of: ${error.params.allowedValues.join(', ')}`;
        break;
    }
    
    return this.createError(
      `schema.${error.keyword}`,
      message,
      path,
      error.data
    );
  }
  
  /**
   * Check for completeness of required fields and nested objects
   */
  private validateCompleteness(data: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!data || typeof data !== 'object') {
      return;
    }
    
    // Check required properties from schema
    if (this.schema.required) {
      for (const requiredProp of this.schema.required) {
        if (data[requiredProp] === undefined) {
          errors.push(this.createError(
            'completeness.required',
            `Required property '${requiredProp}' is missing`,
            `/${requiredProp}`
          ));
        }
      }
    }
    
    // Check nested objects if they have required properties
    if (this.schema.properties) {
      Object.entries(this.schema.properties).forEach(([propName, propSchema]) => {
        if (
          data[propName] !== undefined && 
          typeof data[propName] === 'object' &&
          propSchema.type === 'object' &&
          propSchema.required
        ) {
          for (const requiredNestedProp of propSchema.required) {
            if (data[propName][requiredNestedProp] === undefined) {
              errors.push(this.createError(
                'completeness.nestedRequired',
                `Required nested property '${requiredNestedProp}' is missing in '${propName}'`,
                `/${propName}/${requiredNestedProp}`
              ));
            }
          }
        }
      });
    }
  }
  
  /**
   * Check for additional properties not defined in the schema
   */
  private checkAdditionalProperties(data: any, warnings: ValidationWarning[]): void {
    if (!data || typeof data !== 'object' || !this.schema.properties) {
      return;
    }
    
    // Get all defined properties from schema
    const definedProps = Object.keys(this.schema.properties);
    
    // Check for properties in data not defined in schema
    Object.keys(data).forEach(prop => {
      if (!definedProps.includes(prop)) {
        warnings.push(this.createWarning(
          'schema.additionalProperty',
          `Property '${prop}' is not defined in the schema`,
          `/${prop}`,
          data[prop]
        ));
      }
    });
  }
  
  /**
   * Get the schema used by this validator
   */
  getSchema(): Schema {
    return this.schema;
  }
}