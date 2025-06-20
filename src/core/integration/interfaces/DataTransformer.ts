/**
 * Data Transformer Interface
 * 
 * Defines the contract for data transformation components in the integration framework.
 * Data transformers are responsible for converting data between external system formats
 * and the internal standardized format used by the Manufacturing Analytics Platform.
 */

import { IntegrationDataPacket, IntegrationErrorType } from './types';

/**
 * Transformation result interface
 */
export interface TransformationResult<T = unknown> {
  /**
   * Whether the transformation was successful
   */
  success: boolean;
  
  /**
   * The transformed data if successful
   */
  data?: T;
  
  /**
   * Error information if transformation failed
   */
  error?: {
    type: IntegrationErrorType;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Transformation rule interface
 */
export interface TransformationRule<SourceType = unknown, TargetType = unknown> {
  /**
   * Unique identifier for the rule
   */
  id: string;
  
  /**
   * Human-readable name of the rule
   */
  name: string;
  
  /**
   * Description of what the rule does
   */
  description?: string;
  
  /**
   * Source data schema
   */
  sourceSchema?: Record<string, unknown>;
  
  /**
   * Target data schema
   */
  targetSchema?: Record<string, unknown>;
  
  /**
   * Function to transform data from source to target format
   * @param data Source data
   * @param context Additional context for transformation
   * @returns Transformed data
   */
  transform(data: SourceType, context?: Record<string, unknown>): TargetType;
  
  /**
   * Condition to determine if this rule should be applied
   * @param data Source data
   * @param context Additional context
   * @returns Whether the rule should be applied
   */
  condition?(data: SourceType, context?: Record<string, unknown>): boolean;
}

/**
 * Data transformer interface
 * Responsible for converting data between formats
 */
export interface DataTransformer {
  /**
   * Transform raw external system data to internal data packet format
   * @param sourceData Raw data from external system
   * @param context Additional context information
   * @returns Transformation result containing the standardized data packet
   */
  transformInbound<SourceType, TargetType = unknown>(
    sourceData: SourceType,
    context?: Record<string, unknown>
  ): Promise<TransformationResult<IntegrationDataPacket<TargetType>>>;
  
  /**
   * Transform internal data packet to format expected by external system
   * @param dataPacket Internal standardized data packet
   * @param context Additional context information
   * @returns Transformation result containing the external system format
   */
  transformOutbound<TargetType, SourceType = unknown>(
    dataPacket: IntegrationDataPacket<SourceType>,
    context?: Record<string, unknown>
  ): Promise<TransformationResult<TargetType>>;
  
  /**
   * Register a new transformation rule
   * @param rule Transformation rule to register
   */
  registerRule<S, T>(rule: TransformationRule<S, T>): void;
  
  /**
   * Deregister a transformation rule
   * @param ruleId ID of the rule to deregister
   */
  deregisterRule(ruleId: string): void;
  
  /**
   * Get all registered transformation rules
   * @returns Array of registered rules
   */
  getRules(): TransformationRule[];
  
  /**
   * Clear all transformation rules
   */
  clearRules(): void;
}