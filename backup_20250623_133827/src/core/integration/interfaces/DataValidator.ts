/**
 * Data Validator Interface
 * 
 * Defines the contract for data validation components in the integration framework.
 * Data validators ensure that incoming and outgoing data meets expected standards
 * and formats before processing or transmission.
 */

import { IntegrationDataPacket, IntegrationErrorType } from './types';

/**
 * Validation result interface
 */
export interface ValidationResult {
  /**
   * Whether the validation was successful
   */
  valid: boolean;
  
  /**
   * Array of validation errors if validation failed
   */
  errors?: Array<{
    type: IntegrationErrorType;
    field?: string;
    message: string;
    details?: Record<string, unknown>;
  }>;
}

/**
 * Validation rule interface
 */
export interface ValidationRule<T = unknown> {
  /**
   * Unique identifier for the rule
   */
  id: string;
  
  /**
   * Human-readable name of the rule
   */
  name: string;
  
  /**
   * Description of what the rule validates
   */
  description?: string;
  
  /**
   * Function to validate the data
   * @param data Data to validate
   * @param context Additional context for validation
   * @returns Validation result
   */
  validate(data: T, context?: Record<string, unknown>): ValidationResult;
  
  /**
   * Severity level of validation failures
   */
  severity: 'error' | 'warning' | 'info';
  
  /**
   * Whether to continue validation if this rule fails
   */
  failFast?: boolean;
  
  /**
   * Condition to determine if this rule should be applied
   * @param data Data to validate
   * @param context Additional context
   * @returns Whether the rule should be applied
   */
  condition?(data: T, context?: Record<string, unknown>): boolean;
}

/**
 * Schema definition for validation
 */
export interface ValidationSchema {
  /**
   * Schema identifier
   */
  id: string;
  
  /**
   * Schema version
   */
  version: string;
  
  /**
   * Schema format (e.g., 'json-schema', 'yup', 'zod', 'custom')
   */
  format: string;
  
  /**
   * Actual schema definition
   */
  definition: unknown;
  
  /**
   * Additional options for validation
   */
  options?: Record<string, unknown>;
}

/**
 * Data validator interface
 * Responsible for validating data integrity and format
 */
export interface DataValidator {
  /**
   * Validate incoming data from external systems
   * @param data Data to validate
   * @param context Additional context information
   * @returns Validation result
   */
  validateInbound<T>(
    data: T,
    context?: Record<string, unknown>
  ): Promise<ValidationResult>;
  
  /**
   * Validate outgoing data to external systems
   * @param dataPacket Data packet to validate
   * @param context Additional context information
   * @returns Validation result
   */
  validateOutbound<T>(
    dataPacket: IntegrationDataPacket<T>,
    context?: Record<string, unknown>
  ): Promise<ValidationResult>;
  
  /**
   * Register a new validation rule
   * @param rule Validation rule to register
   */
  registerRule<T>(rule: ValidationRule<T>): void;
  
  /**
   * Deregister a validation rule
   * @param ruleId ID of the rule to deregister
   */
  deregisterRule(ruleId: string): void;
  
  /**
   * Register a validation schema
   * @param schema Validation schema to register
   */
  registerSchema(schema: ValidationSchema): void;
  
  /**
   * Deregister a validation schema
   * @param schemaId ID of the schema to deregister
   */
  deregisterSchema(schemaId: string): void;
  
  /**
   * Get all registered validation rules
   * @returns Array of registered rules
   */
  getRules(): ValidationRule[];
  
  /**
   * Get all registered validation schemas
   * @returns Array of registered schemas
   */
  getSchemas(): ValidationSchema[];
  
  /**
   * Clear all validation rules and schemas
   */
  clear(): void;
}