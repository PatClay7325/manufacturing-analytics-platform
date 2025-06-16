/**
 * JSON Transformer
 * 
 * Implements the DataTransformer interface for handling JSON data format.
 * Provides functionality for parsing JSON data, serializing to JSON, and
 * applying transformation rules to convert between external JSON schemas
 * and internal data structures.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  DataTransformer, 
  TransformationResult, 
  TransformationRule 
} from '../interfaces/DataTransformer';
import { 
  IntegrationDataPacket, 
  IntegrationErrorType 
} from '../types';

/**
 * JSON Transformer class for handling JSON data transformations
 */
export class JsonTransformer implements DataTransformer {
  private rules: Map<string, TransformationRule> = new Map();

  /**
   * Transform raw JSON data to internal data packet format
   * @param sourceData Raw JSON data from external system
   * @param context Additional context information
   * @returns Transformation result containing the standardized data packet
   */
  async transformInbound<SourceType, TargetType = unknown>(
    sourceData: SourceType,
    context?: Record<string, unknown>
  ): Promise<TransformationResult<IntegrationDataPacket<TargetType>>> {
    try {
      // Validate input is valid JSON data
      if (typeof sourceData !== 'object' || sourceData === null) {
        return this.createErrorResult(
          IntegrationErrorType.TRANSFORMATION,
          'Invalid JSON data: expected object'
        );
      }

      // Parse JSON if the input is a string
      let parsedData: any = sourceData;
      if (typeof sourceData === 'string') {
        try {
          parsedData = JSON.parse(sourceData);
        } catch (error) {
          return this.createErrorResult(
            IntegrationErrorType.TRANSFORMATION,
            `Failed to parse JSON: ${(error as Error).message}`
          );
        }
      }

      // Apply transformation rules
      let transformedData = parsedData;
      const applicableRules = Array.from(this.rules.values()).filter(rule => 
        !rule.condition || rule.condition(parsedData, context)
      );

      for (const rule of applicableRules) {
        transformedData = rule.transform(transformedData, context);
      }

      // Create standardized data packet
      const dataPacket: IntegrationDataPacket<TargetType> = {
        id: uuidv4(),
        source: context?.source as string || 'json-source',
        timestamp: new Date(),
        payload: transformedData as unknown as TargetType,
        schemaVersion: context?.schemaVersion as string,
        metadata: {
          originalFormat: 'json',
          ...context?.metadata as Record<string, unknown>
        }
      };

      return {
        success: true,
        data: dataPacket
      };
    } catch (error) {
      return this.createErrorResult(
        IntegrationErrorType.TRANSFORMATION,
        `JSON transformation error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Transform internal data packet to JSON format
   * @param dataPacket Internal standardized data packet
   * @param context Additional context information
   * @returns Transformation result containing the JSON data
   */
  async transformOutbound<TargetType, SourceType = unknown>(
    dataPacket: IntegrationDataPacket<SourceType>,
    context?: Record<string, unknown>
  ): Promise<TransformationResult<TargetType>> {
    try {
      // Validate data packet
      if (!dataPacket || !dataPacket.payload) {
        return this.createErrorResult(
          IntegrationErrorType.TRANSFORMATION,
          'Invalid data packet: missing payload'
        );
      }

      // Apply transformation rules
      let transformedData = dataPacket.payload;
      const applicableRules = Array.from(this.rules.values()).filter(rule => 
        !rule.condition || rule.condition(dataPacket, context)
      );

      for (const rule of applicableRules) {
        transformedData = rule.transform(transformedData, context);
      }

      // Convert to JSON string if specified in context
      const stringify = context?.stringify === true;
      const outputData = stringify 
        ? JSON.stringify(transformedData, null, context?.pretty === true ? 2 : undefined)
        : transformedData;

      return {
        success: true,
        data: outputData as unknown as TargetType
      };
    } catch (error) {
      return this.createErrorResult(
        IntegrationErrorType.TRANSFORMATION,
        `JSON transformation error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Register a new transformation rule
   * @param rule Transformation rule to register
   */
  registerRule<S, T>(rule: TransformationRule<S, T>): void {
    this.rules.set(rule.id, rule as unknown as TransformationRule);
  }

  /**
   * Deregister a transformation rule
   * @param ruleId ID of the rule to deregister
   */
  deregisterRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get all registered transformation rules
   * @returns Array of registered rules
   */
  getRules(): TransformationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Clear all transformation rules
   */
  clearRules(): void {
    this.rules.clear();
  }

  /**
   * Parse JSON string into object
   * @param jsonString JSON string to parse
   * @returns Parsed object or null if parsing fails
   */
  parseJson<T>(jsonString: string): T | null {
    try {
      return JSON.parse(jsonString) as T;
    } catch (error) {
      return null;
    }
  }

  /**
   * Serialize object to JSON string
   * @param data Object to serialize
   * @param pretty Whether to pretty-print the JSON
   * @returns JSON string or null if serialization fails
   */
  serializeToJson<T>(data: T, pretty = false): string | null {
    try {
      return JSON.stringify(data, null, pretty ? 2 : undefined);
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate if a string is valid JSON
   * @param jsonString String to validate
   * @returns Whether the string is valid JSON
   */
  isValidJson(jsonString: string): boolean {
    try {
      JSON.parse(jsonString);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create error transformation result
   * @param type Error type
   * @param message Error message
   * @param details Additional error details
   * @returns Error transformation result
   */
  private createErrorResult<T>(
    type: IntegrationErrorType,
    message: string,
    details?: Record<string, unknown>
  ): TransformationResult<T> {
    return {
      success: false,
      error: {
        type,
        message,
        details
      }
    };
  }
}