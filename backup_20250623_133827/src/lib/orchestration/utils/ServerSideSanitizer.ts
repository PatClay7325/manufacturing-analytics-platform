/**
 * Server-side input sanitization without JSDOM
 * Lightweight, fast sanitization for production use
 */

import { logger } from '@/lib/logger';

export class ServerSideSanitizer {
  private static readonly DANGEROUS_PATTERNS = [
    // Script injection
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
    
    // HTML injection
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /<link\b[^>]*>/gi,
    /<meta\b[^>]*>/gi,
    /<style\b[^>]*>/gi,
    
    // Data exfiltration
    /data:\s*text\/html/gi,
    /data:\s*application\/javascript/gi,
    
    // Expression injection
    /\$\{.*\}/g,
    /<%.*%>/g,
    /\{\{.*\}\}/g,
  ];

  private static readonly SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(UNION\s+SELECT)/gi,
    /('|\"|;|--|\*|\bOR\b|\bAND\b)\s*(\d+\s*=\s*\d+|\w+\s*=\s*\w+)/gi,
    /(\/\*|\*\/)/g,
  ];

  private static readonly XSS_PATTERNS = [
    /&lt;script&gt;/gi,
    /&lt;\/script&gt;/gi,
    /&#x3C;script&#x3E;/gi,
    /&#60;script&#62;/gi,
    /\x3cscript\x3e/gi,
    /\u003cscript\u003e/gi,
  ];

  /**
   * Sanitize string input for safe processing
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return String(input);
    }

    let sanitized = input;

    // Remove dangerous HTML patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Remove SQL injection patterns
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Remove XSS patterns
    for (const pattern of this.XSS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Encode remaining dangerous characters
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/\\/g, '&#x5C;');

    return sanitized.trim();
  }

  /**
   * Sanitize object recursively
   */
  static sanitizeObject(obj: any, maxDepth = 10): any {
    if (maxDepth <= 0) {
      return '[MAX_DEPTH_EXCEEDED]';
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (typeof obj === 'function') {
      return '[FUNCTION_REMOVED]';
    }

    if (obj instanceof Date) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, maxDepth - 1));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        // Skip dangerous properties
        if (this.isDangerousProperty(key)) {
          continue;
        }

        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value, maxDepth - 1);
      }

      return sanitized;
    }

    return obj;
  }

  /**
   * Validate input size and structure
   */
  static validateInput(input: any): { valid: boolean; errors: string[]; sanitized?: any } {
    const errors: string[] = [];

    try {
      // Size validation
      const serialized = JSON.stringify(input);
      if (serialized.length > 1024 * 1024) { // 1MB limit
        errors.push('Input size exceeds 1MB limit');
        return { valid: false, errors };
      }

      // Depth validation
      const depth = this.calculateDepth(input);
      if (depth > 20) {
        errors.push('Input nesting depth exceeds limit');
        return { valid: false, errors };
      }

      // Property count validation
      const propertyCount = this.countProperties(input);
      if (propertyCount > 10000) {
        errors.push('Input has too many properties');
        return { valid: false, errors };
      }

      // Content validation
      const contentValidation = this.validateContent(input);
      if (!contentValidation.valid) {
        errors.push(...contentValidation.errors);
        return { valid: false, errors };
      }

      // Sanitize the input
      const sanitized = this.sanitizeObject(input);

      return { valid: true, errors: [], sanitized };

    } catch (error) {
      logger.error({ error, input: typeof input }, 'Input validation failed');
      errors.push('Input validation error');
      return { valid: false, errors };
    }
  }

  /**
   * Check if property name is dangerous
   */
  private static isDangerousProperty(key: string): boolean {
    const dangerous = [
      '__proto__',
      'constructor',
      'prototype',
      '__defineGetter__',
      '__defineSetter__',
      '__lookupGetter__',
      '__lookupSetter__',
      'hasOwnProperty',
      'isPrototypeOf',
      'propertyIsEnumerable',
      'toString',
      'valueOf',
      'toLocaleString',
    ];

    return dangerous.includes(key) || key.startsWith('__');
  }

  /**
   * Calculate object depth
   */
  private static calculateDepth(obj: any): number {
    if (obj === null || typeof obj !== 'object') {
      return 0;
    }

    if (Array.isArray(obj)) {
      return 1 + Math.max(0, ...obj.map(item => this.calculateDepth(item)));
    }

    const depths = Object.values(obj).map(value => this.calculateDepth(value));
    return 1 + Math.max(0, ...depths);
  }

  /**
   * Count total properties
   */
  private static countProperties(obj: any): number {
    if (obj === null || typeof obj !== 'object') {
      return 0;
    }

    if (Array.isArray(obj)) {
      return obj.length + obj.reduce((sum, item) => sum + this.countProperties(item), 0);
    }

    return Object.keys(obj).length + 
           Object.values(obj).reduce((sum, value) => sum + this.countProperties(value), 0);
  }

  /**
   * Validate content for malicious patterns
   */
  private static validateContent(obj: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    try {
      const serialized = JSON.stringify(obj);
      
      // Check for dangerous patterns in serialized content
      for (const pattern of this.DANGEROUS_PATTERNS) {
        if (pattern.test(serialized)) {
          errors.push(`Dangerous pattern detected: ${pattern.source}`);
        }
      }

      // Check for SQL injection patterns
      for (const pattern of this.SQL_INJECTION_PATTERNS) {
        if (pattern.test(serialized)) {
          errors.push(`SQL injection pattern detected: ${pattern.source}`);
        }
      }

      // Check for extremely long strings (potential DoS)
      const strings = this.extractStrings(obj);
      for (const str of strings) {
        if (str.length > 10000) {
          errors.push('String value too long (potential DoS)');
        }
      }

      return { valid: errors.length === 0, errors };

    } catch (error) {
      return { valid: false, errors: ['Content validation error'] };
    }
  }

  /**
   * Extract all strings from object
   */
  private static extractStrings(obj: any): string[] {
    const strings: string[] = [];

    const extract = (value: any) => {
      if (typeof value === 'string') {
        strings.push(value);
      } else if (Array.isArray(value)) {
        value.forEach(extract);
      } else if (value && typeof value === 'object') {
        Object.values(value).forEach(extract);
      }
    };

    extract(obj);
    return strings;
  }

  /**
   * Rate limit expression complexity
   */
  static validateExpressionComplexity(expression: string): { valid: boolean; error?: string } {
    // Length check
    if (expression.length > 1000) {
      return { valid: false, error: 'Expression too long' };
    }

    // Nesting depth check
    const maxDepth = 20;
    let depth = 0;
    let maxSeenDepth = 0;

    for (const char of expression) {
      if (char === '(') {
        depth++;
        maxSeenDepth = Math.max(maxSeenDepth, depth);
      } else if (char === ')') {
        depth--;
      }
    }

    if (maxSeenDepth > maxDepth) {
      return { valid: false, error: 'Expression nesting too deep' };
    }

    // Operator count check
    const operatorCount = (expression.match(/[+\-*\/%<>=!&|?:]/g) || []).length;
    if (operatorCount > 100) {
      return { valid: false, error: 'Too many operators in expression' };
    }

    // Function call count check
    const functionCalls = (expression.match(/\w+\s*\(/g) || []).length;
    if (functionCalls > 10) {
      return { valid: false, error: 'Too many function calls in expression' };
    }

    return { valid: true };
  }
}