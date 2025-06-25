/**
 * Safe data transformation engine for workflows
 * Provides secure, predefined transformation functions
 */

import { logger } from '@/lib/logger';
import { SecurityValidator } from './SecurityValidator';

export interface TransformationResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class TransformationEngine {
  private static readonly TRANSFORMERS = new Map<string, (input: any, config?: any) => any>([
    ['identity', (input) => input],
    ['to-string', (input) => String(input)],
    ['to-number', (input) => Number(input)],
    ['to-boolean', (input) => Boolean(input)],
    ['json-stringify', (input) => JSON.stringify(input)],
    ['json-parse', (input) => {
      if (typeof input === 'string') {
        return JSON.parse(input);
      }
      return input;
    }],
    ['array-length', (input) => Array.isArray(input) ? input.length : 0],
    ['object-keys', (input) => typeof input === 'object' && input !== null ? Object.keys(input) : []],
    ['trim-string', (input) => typeof input === 'string' ? input.trim() : input],
    ['to-uppercase', (input) => typeof input === 'string' ? input.toUpperCase() : input],
    ['to-lowercase', (input) => typeof input === 'string' ? input.toLowerCase() : input],
    ['round-number', (input, config) => {
      const num = Number(input);
      const decimals = config?.decimals || 0;
      return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }],
    ['filter-array', (input, config) => {
      if (!Array.isArray(input) || !config?.condition) {
        return input;
      }
      return input.filter(item => {
        const evaluation = SecurityValidator.safeEvaluate(config.condition, item, {});
        return evaluation.success ? evaluation.result : false;
      });
    }],
    ['map-array', (input, config) => {
      if (!Array.isArray(input) || !config?.expression) {
        return input;
      }
      return input.map(item => {
        const evaluation = SecurityValidator.safeEvaluate(config.expression, item, {});
        return evaluation.success ? evaluation.result : item;
      });
    }],
    ['merge-objects', (input, config) => {
      if (typeof input !== 'object' || input === null) {
        return input;
      }
      if (config?.mergeWith && typeof config.mergeWith === 'object') {
        return { ...input, ...config.mergeWith };
      }
      return input;
    }],
    ['extract-property', (input, config) => {
      if (typeof input !== 'object' || input === null || !config?.property) {
        return input;
      }
      return input[config.property];
    }],
    ['group-by', (input, config) => {
      if (!Array.isArray(input) || !config?.property) {
        return input;
      }
      return input.reduce((groups, item) => {
        const key = item[config.property];
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(item);
        return groups;
      }, {});
    }],
    ['sort-array', (input, config) => {
      if (!Array.isArray(input)) {
        return input;
      }
      const property = config?.property;
      const order = config?.order || 'asc';
      
      return [...input].sort((a, b) => {
        let aVal = property ? a[property] : a;
        let bVal = property ? b[property] : b;
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (order === 'desc') {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        } else {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        }
      });
    }],
    ['calculate-statistics', (input) => {
      if (!Array.isArray(input)) {
        return { error: 'Input must be an array' };
      }
      
      const numbers = input.filter(item => typeof item === 'number' && !isNaN(item));
      if (numbers.length === 0) {
        return { count: 0, sum: 0, mean: 0, min: 0, max: 0, stdDev: 0 };
      }
      
      const sum = numbers.reduce((acc, val) => acc + val, 0);
      const mean = sum / numbers.length;
      const min = Math.min(...numbers);
      const max = Math.max(...numbers);
      
      const variance = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numbers.length;
      const stdDev = Math.sqrt(variance);
      
      return {
        count: numbers.length,
        sum: Math.round(sum * 1000) / 1000,
        mean: Math.round(mean * 1000) / 1000,
        min,
        max,
        stdDev: Math.round(stdDev * 1000) / 1000,
      };
    }],
    ['merge-time-series', (input, config) => {
      if (!Array.isArray(input) || input.length === 0) {
        return input;
      }
      
      const timeField = config?.timeField || 'timestamp';
      const toleranceMs = config?.toleranceMs || 1000;
      
      // Sort by time
      const sorted = [...input].sort((a, b) => {
        const timeA = new Date(a[timeField] || 0).getTime();
        const timeB = new Date(b[timeField] || 0).getTime();
        return timeA - timeB;
      });
      
      // Merge nearby records
      const merged: any[] = [];
      let current = sorted[0];
      
      for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];
        const currentTime = new Date(current[timeField] || 0).getTime();
        const nextTime = new Date(next[timeField] || 0).getTime();
        
        if (nextTime - currentTime <= toleranceMs) {
          // Merge records
          current = { ...current, ...next };
        } else {
          merged.push(current);
          current = next;
        }
      }
      
      merged.push(current);
      return merged;
    }],
    ['maintenance-priority-calculator', (input, config) => {
      if (typeof input !== 'object' || input === null) {
        return input;
      }
      
      const factors = config?.factors || ['failure-probability', 'criticality', 'cost', 'availability'];
      const weights = config?.weights || [0.25, 0.25, 0.25, 0.25];
      
      let totalScore = 0;
      let totalWeight = 0;
      
      factors.forEach((factor, index) => {
        const value = input[factor];
        const weight = weights[index] || 0.25;
        
        if (typeof value === 'number' && !isNaN(value)) {
          totalScore += value * weight;
          totalWeight += weight;
        }
      });
      
      const priority = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 10) / 10 : 0;
      
      return {
        ...input,
        priority,
        calculatedAt: new Date().toISOString(),
        factors: factors.reduce((acc, factor, index) => {
          acc[factor] = {
            value: input[factor],
            weight: weights[index],
          };
          return acc;
        }, {} as any),
      };
    }],
  ]);

  /**
   * Execute a transformation safely
   */
  static transform(
    transformerName: string,
    input: any,
    config?: any
  ): TransformationResult {
    try {
      // Validate transformer name
      if (!this.TRANSFORMERS.has(transformerName)) {
        return {
          success: false,
          error: `Unknown transformer: ${transformerName}`,
        };
      }

      // Validate and sanitize input
      const inputValidation = SecurityValidator.validateExecutionInput(input);
      if (!inputValidation.valid) {
        return {
          success: false,
          error: `Invalid input: ${inputValidation.errors.join(', ')}`,
        };
      }

      // Validate and sanitize config
      let sanitizedConfig = config;
      if (config) {
        const configValidation = SecurityValidator.validateExecutionInput(config);
        if (!configValidation.valid) {
          return {
            success: false,
            error: `Invalid config: ${configValidation.errors.join(', ')}`,
          };
        }
        sanitizedConfig = configValidation.sanitized;
      }

      // Execute transformer
      const transformer = this.TRANSFORMERS.get(transformerName)!;
      const result = transformer(inputValidation.sanitized, sanitizedConfig);

      logger.debug({
        transformer: transformerName,
        inputType: typeof input,
        outputType: typeof result,
      }, 'Transformation executed');

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      logger.error({
        error,
        transformer: transformerName,
        input: typeof input,
      }, 'Transformation failed');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transformation error',
      };
    }
  }

  /**
   * Get list of available transformers
   */
  static getAvailableTransformers(): string[] {
    return Array.from(this.TRANSFORMERS.keys());
  }

  /**
   * Register a custom transformer (with security validation)
   */
  static registerTransformer(
    name: string,
    transformer: (input: any, config?: any) => any,
    overwrite = false
  ): boolean {
    try {
      // Validate name
      if (typeof name !== 'string' || name.length === 0) {
        return false;
      }

      // Check if already exists
      if (this.TRANSFORMERS.has(name) && !overwrite) {
        return false;
      }

      // Validate transformer function
      if (typeof transformer !== 'function') {
        return false;
      }

      // Test the transformer with safe inputs
      try {
        transformer(null);
        transformer('test');
        transformer(123);
        transformer({});
        transformer([]);
      } catch (error) {
        logger.error({ error, name }, 'Transformer validation failed');
        return false;
      }

      this.TRANSFORMERS.set(name, transformer);
      
      logger.info({ transformerName: name }, 'Custom transformer registered');
      return true;
    } catch (error) {
      logger.error({ error, name }, 'Failed to register transformer');
      return false;
    }
  }

  /**
   * Validate transformer configuration
   */
  static validateTransformerConfig(
    transformerName: string,
    config: any
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.TRANSFORMERS.has(transformerName)) {
      errors.push(`Unknown transformer: ${transformerName}`);
      return { valid: false, errors };
    }

    // Specific validation for different transformers
    switch (transformerName) {
      case 'filter-array':
      case 'map-array':
        if (config?.condition || config?.expression) {
          const expression = config.condition || config.expression;
          const validation = SecurityValidator.validateExpression(expression);
          if (!validation.valid) {
            errors.push(`Invalid expression: ${validation.error}`);
          }
        }
        break;

      case 'round-number':
        if (config?.decimals !== undefined) {
          if (typeof config.decimals !== 'number' || config.decimals < 0 || config.decimals > 10) {
            errors.push('Invalid decimals value (must be 0-10)');
          }
        }
        break;

      case 'extract-property':
        if (!config?.property || typeof config.property !== 'string') {
          errors.push('Property name is required');
        }
        break;

      case 'sort-array':
        if (config?.order && !['asc', 'desc'].includes(config.order)) {
          errors.push('Invalid sort order (must be "asc" or "desc")');
        }
        break;

      case 'merge-time-series':
        if (config?.toleranceMs !== undefined) {
          if (typeof config.toleranceMs !== 'number' || config.toleranceMs < 0) {
            errors.push('Invalid tolerance value');
          }
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  }
}