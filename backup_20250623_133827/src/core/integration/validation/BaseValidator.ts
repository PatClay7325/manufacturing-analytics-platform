/**
 * ValidationResult interface to standardize validation response
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

/**
 * ValidationError interface for detailed error reporting
 */
export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  value?: any;
  severity: 'error';
}

/**
 * ValidationWarning interface for non-critical issues
 */
export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  value?: any;
  severity: 'warning';
}

/**
 * ValidationOptions for configuring validation behavior
 */
export interface ValidationOptions {
  strictMode?: boolean;
  ignoreWarnings?: boolean;
  validateRelationships?: boolean;
  validateUnits?: boolean;
  validateCompleteness?: boolean;
}

/**
 * DataValidator interface that all validators must implement
 */
export interface DataValidator {
  /**
   * Validate data against the standard or schema
   * 
   * @param data - The data to validate
   * @param options - Optional configuration for validation behavior
   * @returns ValidationResult with errors and validity status
   */
  validate(data: any, options?: ValidationOptions): Promise<ValidationResult> | ValidationResult;
  
  /**
   * Get the name of the validator
   */
  getName(): string;
  
  /**
   * Get the version of the standard or schema
   */
  getVersion(): string;
  
  /**
   * Get supported data types for this validator
   */
  getSupportedDataTypes(): string[];
}

/**
 * Abstract base class for validators
 */
export abstract class BaseValidator implements DataValidator {
  protected name: string;
  protected version: string;
  protected supportedDataTypes: string[];
  
  constructor(name: string, version: string, supportedDataTypes: string[] = []) {
    this.name = name;
    this.version = version;
    this.supportedDataTypes = supportedDataTypes;
  }
  
  /**
   * Abstract validate method that must be implemented by concrete validators
   */
  abstract validate(data: any, options?: ValidationOptions): Promise<ValidationResult> | ValidationResult;
  
  /**
   * Get the name of the validator
   */
  getName(): string {
    return this.name;
  }
  
  /**
   * Get the version of the standard or schema
   */
  getVersion(): string {
    return this.version;
  }
  
  /**
   * Get supported data types for this validator
   */
  getSupportedDataTypes(): string[] {
    return this.supportedDataTypes;
  }
  
  /**
   * Helper method to create a validation result
   */
  protected createResult(isValid: boolean, errors: ValidationError[] = [], warnings: ValidationWarning[] = []): ValidationResult {
    return {
      isValid,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
  
  /**
   * Helper method to create an error
   */
  protected createError(code: string, message: string, path?: string, value?: any): ValidationError {
    return {
      code,
      message,
      path,
      value,
      severity: 'error'
    };
  }
  
  /**
   * Helper method to create a warning
   */
  protected createWarning(code: string, message: string, path?: string, value?: any): ValidationWarning {
    return {
      code,
      message,
      path,
      value,
      severity: 'warning'
    };
  }
}