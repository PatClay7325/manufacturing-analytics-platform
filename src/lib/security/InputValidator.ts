/**
 * Production Input Validator - Comprehensive security validation
 */

import { logger } from '@/lib/logger';
import Joi from 'joi';
import DOMPurify from 'isomorphic-dompurify';
import sqlstring from 'sqlstring';

export interface ValidationOptions {
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
  allowedChars?: string;
  sanitize?: boolean;
  throwOnError?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  value?: any;
  errors?: string[];
  sanitized?: boolean;
}

export class InputValidator {
  private static readonly DEFAULT_MAX_LENGTH = 1024 * 1024; // 1MB
  private static readonly SECRET_MAX_LENGTH = 32 * 1024; // 32KB
  private static readonly NAME_MAX_LENGTH = 253; // DNS-1123
  private static readonly LABEL_MAX_LENGTH = 63;
  
  // Patterns for various input types
  private static readonly PATTERNS = {
    // Kubernetes naming patterns
    dnsName: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/,
    dnsLabel: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/,
    namespace: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/,
    
    // Security patterns
    alphanumeric: /^[a-zA-Z0-9]+$/,
    alphanumericDash: /^[a-zA-Z0-9-]+$/,
    alphanumericUnderscore: /^[a-zA-Z0-9_]+$/,
    base64: /^[A-Za-z0-9+/]+=*$/,
    hex: /^[0-9a-fA-F]+$/,
    
    // Common patterns
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    url: /^https?:\/\/.+$/,
    ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    ipv6: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,
    
    // Dangerous patterns to block
    sqlInjection: /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|eval)\b)|(-{2})|(\|\|)|(\/\*|\*\/)/gi,
    scriptInjection: /<script[^>]*>.*?<\/script>/gi,
    commandInjection: /[;&|`$(){}[\]<>]/g
  };

  /**
   * Validate Kubernetes resource name
   */
  static validateResourceName(name: string, type: 'name' | 'namespace' | 'label' = 'name'): ValidationResult {
    const errors: string[] = [];

    // Check if empty
    if (!name || name.trim().length === 0) {
      errors.push(`${type} cannot be empty`);
      return { valid: false, errors };
    }

    // Check length
    const maxLength = type === 'label' ? this.LABEL_MAX_LENGTH : this.NAME_MAX_LENGTH;
    if (name.length > maxLength) {
      errors.push(`${type} cannot exceed ${maxLength} characters`);
    }

    // Check pattern
    const pattern = type === 'namespace' ? this.PATTERNS.namespace : this.PATTERNS.dnsName;
    if (!pattern.test(name)) {
      errors.push(`${type} must consist of lowercase alphanumeric characters or '-', and must start and end with an alphanumeric character`);
    }

    // Additional namespace checks
    if (type === 'namespace') {
      const reserved = ['kube-system', 'kube-public', 'kube-node-lease', 'default'];
      if (reserved.includes(name)) {
        errors.push(`Cannot use reserved namespace name: ${name}`);
      }
    }

    return {
      valid: errors.length === 0,
      value: name,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate secret data
   */
  static validateSecretData(data: Record<string, string>): ValidationResult {
    const errors: string[] = [];

    // Check overall size
    const totalSize = Object.entries(data).reduce((sum, [key, value]) => {
      return sum + key.length + value.length;
    }, 0);

    if (totalSize > this.SECRET_MAX_LENGTH) {
      errors.push(`Secret data exceeds maximum size of ${this.SECRET_MAX_LENGTH} bytes`);
    }

    // Validate each key-value pair
    for (const [key, value] of Object.entries(data)) {
      // Validate key
      if (!this.PATTERNS.alphanumericUnderscore.test(key)) {
        errors.push(`Secret key '${key}' contains invalid characters`);
      }

      if (key.length > 253) {
        errors.push(`Secret key '${key}' exceeds maximum length`);
      }

      // Check for sensitive key patterns that might indicate misuse
      const suspiciousKeyPatterns = [
        /private.*key/i,
        /api.*key/i,
        /password/i,
        /secret/i,
        /token/i,
        /credential/i
      ];

      const keyLower = key.toLowerCase();
      if (suspiciousKeyPatterns.some(pattern => pattern.test(keyLower))) {
        // Just log a warning, don't block
        logger.warn({
          key: key.substring(0, 20) + '...',
          keyLength: key.length
        }, 'Potentially sensitive data detected in secret key name');
      }

      // Validate value isn't obviously dangerous
      if (this.PATTERNS.scriptInjection.test(value)) {
        errors.push(`Secret value for '${key}' contains potentially malicious script`);
      }

      // Check for base64 encoding (common for secrets)
      if (value.length > 0 && value.length % 4 === 0) {
        try {
          const decoded = Buffer.from(value, 'base64').toString();
          // Check decoded content for scripts
          if (this.PATTERNS.scriptInjection.test(decoded)) {
            errors.push(`Secret value for '${key}' contains potentially malicious content in base64`);
          }
        } catch {
          // Not base64, that's fine
        }
      }
    }

    return {
      valid: errors.length === 0,
      value: data,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate and sanitize user input
   */
  static validateUserInput(input: string, options: ValidationOptions = {}): ValidationResult {
    const errors: string[] = [];
    let value = input;

    // Check if empty
    if (!input || input.trim().length === 0) {
      if (options.minLength && options.minLength > 0) {
        errors.push('Input cannot be empty');
      }
      return { valid: errors.length === 0, value: '', errors };
    }

    // Trim whitespace
    value = input.trim();

    // Check length
    const maxLength = options.maxLength || this.DEFAULT_MAX_LENGTH;
    if (value.length > maxLength) {
      errors.push(`Input exceeds maximum length of ${maxLength} characters`);
    }

    if (options.minLength && value.length < options.minLength) {
      errors.push(`Input must be at least ${options.minLength} characters`);
    }

    // Check pattern if provided
    if (options.pattern && !options.pattern.test(value)) {
      errors.push('Input does not match required pattern');
    }

    // Check allowed characters
    if (options.allowedChars) {
      const regex = new RegExp(`^[${options.allowedChars}]+$`);
      if (!regex.test(value)) {
        errors.push('Input contains invalid characters');
      }
    }

    // Security checks
    if (this.PATTERNS.sqlInjection.test(value)) {
      errors.push('Input contains potentially dangerous SQL patterns');
    }

    if (this.PATTERNS.commandInjection.test(value)) {
      errors.push('Input contains potentially dangerous command characters');
    }

    // Sanitize if requested
    if (options.sanitize && errors.length === 0) {
      value = DOMPurify.sanitize(value, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
      });
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      value: errors.length === 0 ? value : input,
      errors: errors.length > 0 ? errors : undefined,
      sanitized: options.sanitize
    };

    if (options.throwOnError && !result.valid) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return result;
  }

  /**
   * Validate API key format
   */
  static validateApiKey(key: string): ValidationResult {
    const errors: string[] = [];

    if (!key || key.trim().length === 0) {
      errors.push('API key cannot be empty');
      return { valid: false, errors };
    }

    // Common API key formats
    const patterns = [
      /^[A-Za-z0-9]{32,}$/, // Alphanumeric, min 32 chars
      /^[A-Za-z0-9_-]{32,}$/, // With dash/underscore
      /^[A-Za-z0-9+/]+=*$/, // Base64
      /^[0-9a-f]{32,}$/ // Hex (lowercase)
    ];

    const matchesAnyPattern = patterns.some(pattern => pattern.test(key));
    
    if (!matchesAnyPattern) {
      errors.push('API key format is invalid');
    }

    if (key.length < 32) {
      errors.push('API key is too short (minimum 32 characters)');
    }

    if (key.length > 512) {
      errors.push('API key is too long (maximum 512 characters)');
    }

    return {
      valid: errors.length === 0,
      value: key,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate email address
   */
  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email || email.trim().length === 0) {
      errors.push('Email cannot be empty');
      return { valid: false, errors };
    }

    const normalized = email.trim().toLowerCase();

    if (!this.PATTERNS.email.test(normalized)) {
      errors.push('Invalid email format');
    }

    if (normalized.length > 254) {
      errors.push('Email address too long');
    }

    // Additional security checks
    if (this.PATTERNS.scriptInjection.test(normalized)) {
      errors.push('Email contains invalid content');
    }

    return {
      valid: errors.length === 0,
      value: normalized,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate URL
   */
  static validateUrl(url: string, options: { allowHttp?: boolean } = {}): ValidationResult {
    const errors: string[] = [];

    if (!url || url.trim().length === 0) {
      errors.push('URL cannot be empty');
      return { valid: false, errors };
    }

    try {
      const parsed = new URL(url);
      
      // Check protocol
      if (!options.allowHttp && parsed.protocol !== 'https:') {
        errors.push('URL must use HTTPS protocol');
      }

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        errors.push('URL must use HTTP or HTTPS protocol');
      }

      // Check for localhost/internal IPs (might be security risk)
      const hostname = parsed.hostname.toLowerCase();
      if (['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname)) {
        errors.push('URL cannot point to localhost');
      }

      // Check for private IP ranges
      if (this.isPrivateIP(hostname)) {
        errors.push('URL cannot point to private IP address');
      }

    } catch (error) {
      errors.push('Invalid URL format');
    }

    return {
      valid: errors.length === 0,
      value: url,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate IP address
   */
  static validateIPAddress(ip: string, version?: 4 | 6): ValidationResult {
    const errors: string[] = [];

    if (!ip || ip.trim().length === 0) {
      errors.push('IP address cannot be empty');
      return { valid: false, errors };
    }

    const trimmed = ip.trim();

    if (version === 4 || !version) {
      if (this.PATTERNS.ipv4.test(trimmed)) {
        return { valid: true, value: trimmed };
      } else if (version === 4) {
        errors.push('Invalid IPv4 address format');
      }
    }

    if (version === 6 || !version) {
      if (this.PATTERNS.ipv6.test(trimmed)) {
        return { valid: true, value: trimmed };
      } else if (version === 6) {
        errors.push('Invalid IPv6 address format');
      }
    }

    if (!version && errors.length === 0) {
      errors.push('Invalid IP address format');
    }

    return {
      valid: errors.length === 0,
      value: trimmed,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate port number
   */
  static validatePort(port: number | string): ValidationResult {
    const errors: string[] = [];
    const portNum = typeof port === 'string' ? parseInt(port, 10) : port;

    if (isNaN(portNum)) {
      errors.push('Port must be a number');
      return { valid: false, errors };
    }

    if (portNum < 1 || portNum > 65535) {
      errors.push('Port must be between 1 and 65535');
    }

    // Warn about privileged ports
    if (portNum < 1024) {
      logger.warn({ port: portNum }, 'Using privileged port (< 1024)');
    }

    return {
      valid: errors.length === 0,
      value: portNum,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Validate JSON string
   */
  static validateJSON(jsonString: string, schema?: Joi.Schema): ValidationResult {
    const errors: string[] = [];
    let parsed: any;

    try {
      parsed = JSON.parse(jsonString);
    } catch (error) {
      errors.push('Invalid JSON format');
      return { valid: false, errors };
    }

    // Validate against schema if provided
    if (schema) {
      const { error } = schema.validate(parsed);
      if (error) {
        errors.push(...error.details.map(d => d.message));
      }
    }

    // Check for potential security issues
    const jsonStr = JSON.stringify(parsed);
    if (jsonStr.length > this.DEFAULT_MAX_LENGTH) {
      errors.push('JSON payload too large');
    }

    return {
      valid: errors.length === 0,
      value: parsed,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Sanitize SQL input
   */
  static sanitizeSQL(input: string): string {
    return sqlstring.escape(input);
  }

  /**
   * Sanitize HTML input
   */
  static sanitizeHTML(input: string, options?: any): string {
    return DOMPurify.sanitize(input, options);
  }

  /**
   * Validate file path
   */
  static validateFilePath(path: string, options: { allowAbsolute?: boolean } = {}): ValidationResult {
    const errors: string[] = [];

    if (!path || path.trim().length === 0) {
      errors.push('File path cannot be empty');
      return { valid: false, errors };
    }

    // Check for path traversal attempts
    if (path.includes('..')) {
      errors.push('Path traversal patterns detected');
    }

    // Check for null bytes
    if (path.includes('\0')) {
      errors.push('Null bytes detected in path');
    }

    // Check absolute paths
    if (!options.allowAbsolute && (path.startsWith('/') || /^[A-Za-z]:/.test(path))) {
      errors.push('Absolute paths not allowed');
    }

    // Check for dangerous characters
    const dangerousChars = /[<>:"|?*]/;
    if (dangerousChars.test(path)) {
      errors.push('Path contains invalid characters');
    }

    return {
      valid: errors.length === 0,
      value: path,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Check if IP is in private range
   */
  private static isPrivateIP(ip: string): boolean {
    if (!this.PATTERNS.ipv4.test(ip)) {
      return false;
    }

    const parts = ip.split('.').map(p => parseInt(p, 10));
    
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    
    return false;
  }

  /**
   * Create validator schema for complex objects
   */
  static createSchema(definition: any): Joi.Schema {
    return Joi.object(definition);
  }

  /**
   * Batch validate multiple inputs
   */
  static async batchValidate(
    validations: Array<{
      value: any;
      validator: (value: any) => ValidationResult;
      name: string;
    }>
  ): Promise<{
    valid: boolean;
    results: Record<string, ValidationResult>;
    errors: Record<string, string[]>;
  }> {
    const results: Record<string, ValidationResult> = {};
    const errors: Record<string, string[]> = {};
    let allValid = true;

    for (const { value, validator, name } of validations) {
      const result = validator(value);
      results[name] = result;
      
      if (!result.valid) {
        allValid = false;
        errors[name] = result.errors || ['Validation failed'];
      }
    }

    return {
      valid: allValid,
      results,
      errors
    };
  }
}

// Export common validation schemas
export const ValidationSchemas = {
  secretData: Joi.object().pattern(
    Joi.string().pattern(/^[a-zA-Z0-9_]+$/),
    Joi.string().max(InputValidator['SECRET_MAX_LENGTH'])
  ),

  kubernetesResource: Joi.object({
    apiVersion: Joi.string().required(),
    kind: Joi.string().required(),
    metadata: Joi.object({
      name: Joi.string().pattern(InputValidator['PATTERNS'].dnsName).max(253).required(),
      namespace: Joi.string().pattern(InputValidator['PATTERNS'].namespace).max(253),
      labels: Joi.object().pattern(
        Joi.string().max(63),
        Joi.string().max(63)
      ),
      annotations: Joi.object().pattern(
        Joi.string().max(253),
        Joi.string()
      )
    }).required(),
    spec: Joi.object().required()
  }),

  deploymentConfig: Joi.object({
    name: Joi.string().pattern(InputValidator['PATTERNS'].dnsName).max(253).required(),
    namespace: Joi.string().pattern(InputValidator['PATTERNS'].namespace).max(253).required(),
    replicas: Joi.number().integer().min(0).max(1000),
    image: Joi.string().required(),
    resources: Joi.object({
      limits: Joi.object({
        cpu: Joi.string(),
        memory: Joi.string()
      }),
      requests: Joi.object({
        cpu: Joi.string(),
        memory: Joi.string()
      })
    })
  })
};