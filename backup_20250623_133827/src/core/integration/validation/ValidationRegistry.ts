import { DataValidator } from './BaseValidator';

/**
 * ValidatorRegistryKey uniquely identifies a validator in the registry
 */
export interface ValidatorRegistryKey {
  standard: string;
  version?: string;
  dataType?: string;
}

/**
 * ValidatorFactory creates validator instances
 */
export interface ValidatorFactory {
  createValidator(): DataValidator;
}

/**
 * ValidationRegistry manages validators for different standards and data types
 */
export class ValidationRegistry {
  private static instance: ValidationRegistry;
  private validators: Map<string, DataValidator>;
  private factories: Map<string, ValidatorFactory>;
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.validators = new Map();
    this.factories = new Map();
  }
  
  /**
   * Get the singleton instance of the registry
   */
  public static getInstance(): ValidationRegistry {
    if (!ValidationRegistry.instance) {
      ValidationRegistry.instance = new ValidationRegistry();
    }
    return ValidationRegistry.instance;
  }
  
  /**
   * Register a validator instance
   * 
   * @param key - The key to register the validator under
   * @param validator - The validator instance
   */
  public registerValidator(key: ValidatorRegistryKey, validator: DataValidator): void {
    const registryKey = this.createRegistryKey(key);
    this.validators.set(registryKey, validator);
  }
  
  /**
   * Register a validator factory
   * 
   * @param key - The key to register the factory under
   * @param factory - The factory that creates validator instances
   */
  public registerFactory(key: ValidatorRegistryKey, factory: ValidatorFactory): void {
    const registryKey = this.createRegistryKey(key);
    this.factories.set(registryKey, factory);
  }
  
  /**
   * Get a validator by key
   * 
   * @param key - The key to look up
   * @returns The validator instance or null if not found
   */
  public getValidator(key: ValidatorRegistryKey): DataValidator | null {
    const registryKey = this.createRegistryKey(key);
    
    // Check if we have a cached validator instance
    const validator = this.validators.get(registryKey);
    if (validator) {
      return validator;
    }
    
    // Try to create one from a factory
    const factory = this.factories.get(registryKey);
    if (factory) {
      const newValidator = factory.createValidator();
      this.validators.set(registryKey, newValidator);
      return newValidator;
    }
    
    // Try to find a validator by standard only if dataType and version weren't specified
    if (key.dataType || key.version) {
      const generalKey = { standard: key.standard };
      return this.getValidator(generalKey);
    }
    
    return null;
  }
  
  /**
   * Check if a validator exists for the given key
   * 
   * @param key - The key to check
   * @returns True if a validator or factory exists for the key
   */
  public hasValidator(key: ValidatorRegistryKey): boolean {
    const registryKey = this.createRegistryKey(key);
    return this.validators.has(registryKey) || this.factories.has(registryKey);
  }
  
  /**
   * Remove a validator from the registry
   * 
   * @param key - The key to remove
   * @returns True if a validator was removed
   */
  public removeValidator(key: ValidatorRegistryKey): boolean {
    const registryKey = this.createRegistryKey(key);
    return this.validators.delete(registryKey);
  }
  
  /**
   * Remove a factory from the registry
   * 
   * @param key - The key to remove
   * @returns True if a factory was removed
   */
  public removeFactory(key: ValidatorRegistryKey): boolean {
    const registryKey = this.createRegistryKey(key);
    return this.factories.delete(registryKey);
  }
  
  /**
   * Get all registered validators
   * 
   * @returns Array of all registered validators
   */
  public getAllValidators(): DataValidator[] {
    return Array.from(this.validators.values());
  }
  
  /**
   * Get all validators for a specific standard
   * 
   * @param standard - The standard to filter by
   * @returns Array of validators for the standard
   */
  public getValidatorsByStandard(standard: string): DataValidator[] {
    return this.getAllValidators().filter(validator => 
      validator.getName().toLowerCase().includes(standard.toLowerCase())
    );
  }
  
  /**
   * Clear all registered validators and factories
   */
  public clear(): void {
    this.validators.clear();
    this.factories.clear();
  }
  
  /**
   * Create a string key for the registry maps
   * 
   * @param key - The validator key
   * @returns String representation of the key
   */
  private createRegistryKey(key: ValidatorRegistryKey): string {
    return [
      key.standard.toLowerCase(),
      key.version || '*',
      key.dataType || '*'
    ].join(':');
  }
}

/**
 * Factory implementations for standard validators
 */

import { ISO14224Validator, ISO14224DataCategory } from './standards/ISO14224Validator';
import { ISO22400Validator, ISO22400KPICategory } from './standards/ISO22400Validator';

/**
 * Factory for ISO14224 validators
 */
export class ISO14224ValidatorFactory implements ValidatorFactory {
  createValidator(): DataValidator {
    return new ISO14224Validator();
  }
}

/**
 * Factory for ISO22400 validators
 */
export class ISO22400ValidatorFactory implements ValidatorFactory {
  createValidator(): DataValidator {
    return new ISO22400Validator();
  }
}

/**
 * Initialize the registry with standard validators
 */
export function initializeValidationRegistry(): ValidationRegistry {
  const registry = ValidationRegistry.getInstance();
  
  // Register ISO14224 validator factory
  registry.registerFactory(
    { standard: 'ISO14224', version: '2016' },
    new ISO14224ValidatorFactory()
  );
  
  // Register specific ISO14224 validator factories for each data category
  Object.values(ISO14224DataCategory).forEach(dataType => {
    registry.registerFactory(
      { standard: 'ISO14224', version: '2016', dataType },
      new ISO14224ValidatorFactory()
    );
  });
  
  // Register ISO22400 validator factory
  registry.registerFactory(
    { standard: 'ISO22400', version: '2014' },
    new ISO22400ValidatorFactory()
  );
  
  // Register specific ISO22400 validator factories for each KPI category
  Object.values(ISO22400KPICategory).forEach(dataType => {
    registry.registerFactory(
      { standard: 'ISO22400', version: '2014', dataType },
      new ISO22400ValidatorFactory()
    );
  });
  
  return registry;
}

// Export a pre-initialized registry instance for convenience
export const validationRegistry = initializeValidationRegistry();