/**
 * Security validator for workflow orchestration
 * Prevents injection attacks and validates expressions safely
 */

import { logger } from '@/lib/logger';
import { ServerSideSanitizer } from './ServerSideSanitizer';
import { SecureExpressionEvaluator } from './SecureExpressionEvaluator';

export class SecurityValidator {
  private static readonly ALLOWED_FUNCTIONS = new Set([
    'Math.abs', 'Math.ceil', 'Math.floor', 'Math.round', 'Math.max', 'Math.min',
    'Math.pow', 'Math.sqrt', 'Date.now', 'parseInt', 'parseFloat',
    'String', 'Number', 'Boolean', 'Array.isArray'
  ]);

  private static readonly DANGEROUS_PATTERNS = [
    /eval\s*\(/gi,
    /function\s*\(/gi,
    /new\s+Function/gi,
    /setTimeout/gi,
    /setInterval/gi,
    /require\s*\(/gi,
    /import\s*\(/gi,
    /process\./gi,
    /global\./gi,
    /window\./gi,
    /document\./gi,
    /__proto__/gi,
    /constructor/gi,
    /prototype/gi,
    /exec\s*\(/gi,
    /spawn\s*\(/gi,
  ];

  /**
   * Validate a JavaScript expression for safe evaluation
   */
  static validateExpression(expression: string): { valid: boolean; error?: string } {
    try {
      // Use server-side complexity validation
      const complexityCheck = ServerSideSanitizer.validateExpressionComplexity(expression);
      if (!complexityCheck.valid) {
        return complexityCheck;
      }

      // Check for dangerous patterns
      for (const pattern of this.DANGEROUS_PATTERNS) {
        if (pattern.test(expression)) {
          return { 
            valid: false, 
            error: `Dangerous pattern detected: ${pattern.source}` 
          };
        }
      }

      // Use server-side sanitization instead of DOMPurify
      const sanitized = ServerSideSanitizer.sanitizeString(expression);
      if (sanitized !== expression) {
        return { valid: false, error: 'Expression contains unsafe content' };
      }

      return { valid: true };
    } catch (error) {
      logger.error({ error, expression }, 'Expression validation failed');
      return { valid: false, error: 'Validation error' };
    }
  }

  /**
   * Safely evaluate a JavaScript expression with limited context
   */
  static safeEvaluate(expression: string, data: any, context: any): { 
    success: boolean; 
    result?: any; 
    error?: string; 
  } {
    // Use the secure expression evaluator instead of Function constructor
    return SecureExpressionEvaluator.evaluate(expression, data, context);
  }

  /**
   * Sanitize an object to remove dangerous properties
   */
  private static sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'function') {
      return '[Function]';
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip dangerous properties
      if (key.startsWith('__') || key === 'constructor' || key === 'prototype') {
        continue;
      }

      sanitized[key] = this.sanitizeObject(value);
    }

    return sanitized;
  }

  /**
   * Validate workflow definition for security issues
   */
  static validateWorkflowDefinition(definition: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      // Validate basic structure
      if (!definition.id || typeof definition.id !== 'string') {
        errors.push('Invalid workflow ID');
      }

      if (!definition.name || typeof definition.name !== 'string') {
        errors.push('Invalid workflow name');
      }

      if (!definition.steps || !Array.isArray(definition.steps)) {
        errors.push('Invalid workflow steps');
      }

      // Validate steps
      if (definition.steps) {
        for (let i = 0; i < definition.steps.length; i++) {
          const step = definition.steps[i];
          
          if (!step.id || typeof step.id !== 'string') {
            errors.push(`Invalid step ID at index ${i}`);
          }

          // Validate conditions
          if (step.condition && step.condition.expression) {
            const validation = this.validateExpression(step.condition.expression);
            if (!validation.valid) {
              errors.push(`Invalid condition in step ${step.id}: ${validation.error}`);
            }
          }

          // Validate transformer expressions
          if (step.type === 'transform' && step.config?.transformer) {
            if (typeof step.config.transformer !== 'string') {
              errors.push(`Invalid transformer in step ${step.id}`);
            }
          }

          // Validate webhook URLs
          if (step.type === 'webhook' && step.config?.url) {
            try {
              const url = new URL(step.config.url);
              if (!['http:', 'https:'].includes(url.protocol)) {
                errors.push(`Invalid webhook URL protocol in step ${step.id}`);
              }
            } catch {
              errors.push(`Invalid webhook URL in step ${step.id}`);
            }
          }
        }
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      logger.error({ error, definition }, 'Workflow validation failed');
      return { valid: false, errors: ['Validation error'] };
    }
  }

  /**
   * Validate execution input
   */
  static validateExecutionInput(input: any): { valid: boolean; sanitized: any; errors: string[] } {
    // Use server-side sanitizer for comprehensive validation
    return ServerSideSanitizer.validateInput(input);
  }
}