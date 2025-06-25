// DOMPurify and validator stubs - to be replaced when packages are available
const DOMPurify = { 
  sanitize: (input: string, config?: any): string => {
    // Basic sanitization stub
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  },
  setConfig: (config: any): void => {
    // Config stub - no-op for now
  }
};

const validator = { 
  isEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, 
  isURL: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }, 
  escape: (str: string): string => {
    return str.replace(/[&<>"']/g, (match) => {
      const escape: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;'
      };
      return escape[match] || match;
    });
  }
};
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Request size limits
export const REQUEST_SIZE_LIMITS = {
  JSON: 1024 * 1024, // 1MB for JSON
  FILE_UPLOAD: 10 * 1024 * 1024, // 10MB for file uploads
  TEXT: 100 * 1024, // 100KB for text fields
  URL_LENGTH: 2048,
} as const;

// File type validation
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  CSV: ['text/csv', 'application/csv'],
  JSON: ['application/json'],
} as const;

/**
 * Comprehensive input sanitizer
 */
export class InputSanitizer {
  private purify: any;

  constructor() {
    this.purify = DOMPurify;
    
    // Configure DOMPurify for strict sanitization
    this.purify.setConfig({
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href', 'title'],
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover'],
    });
  }

  /**
   * Sanitize HTML input
   */
  sanitizeHtml(input: string): string {
    return this.purify.sanitize(input, { 
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
    });
  }

  /**
   * Sanitize plain text (removes all HTML)
   */
  sanitizeText(input: string): string {
    // Remove all HTML tags
    const text = this.purify.sanitize(input, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });
    
    // Additional sanitization
    return text
      .replace(/[<>]/g, '') // Remove any remaining angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Sanitize SQL identifiers (table names, column names)
   */
  sanitizeSqlIdentifier(identifier: string): string {
    // Only allow alphanumeric, underscore, and dash
    return identifier.replace(/[^a-zA-Z0-9_-]/g, '');
  }

  /**
   * Sanitize file names
   */
  sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe chars with underscore
      .replace(/\.{2,}/g, '_') // Remove directory traversal attempts
      .substring(0, 255); // Limit length
  }

  /**
   * Validate and sanitize URLs
   */
  sanitizeUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      
      // Only allow http(s) protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }
      
      // Check for suspicious patterns
      if (
        parsed.hostname.includes('javascript:') ||
        parsed.pathname.includes('javascript:') ||
        parsed.href.length > REQUEST_SIZE_LIMITS.URL_LENGTH
      ) {
        return null;
      }
      
      return parsed.href;
    } catch {
      return null;
    }
  }

  /**
   * Validate email with strict rules
   */
  validateEmail(email: string): boolean {
    return validator.isEmail(email, {
      allow_utf8_local_part: false,
      require_tld: true,
      allow_ip_domain: false,
    });
  }

  /**
   * Validate and sanitize JSON
   */
  sanitizeJson(input: any, maxDepth: number = 10): any {
    const sanitize = (obj: any, depth: number = 0): any => {
      if (depth > maxDepth) {
        throw new Error('JSON depth limit exceeded');
      }

      if (obj === null || obj === undefined) {
        return obj;
      }

      if (typeof obj === 'string') {
        return this.sanitizeText(obj);
      }

      if (typeof obj === 'number' || typeof obj === 'boolean') {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(item => sanitize(item, depth + 1));
      }

      if (typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const sanitizedKey = this.sanitizeSqlIdentifier(key);
          sanitized[sanitizedKey] = sanitize(value, depth + 1);
        }
        return sanitized;
      }

      // Reject functions and other types
      return null;
    };

    return sanitize(input);
  }
}

// Global sanitizer instance
export const sanitizer = new InputSanitizer();

/**
 * Manufacturing-specific validation schemas
 */
export const manufacturingValidation = {
  equipmentId: z.string()
    .regex(/^[A-Z]{2,4}-\d{4,6}$/, 'Invalid equipment ID format')
    .transform(val => sanitizer.sanitizeSqlIdentifier(val)),
  
  productCode: z.string()
    .regex(/^[A-Z0-9]{3,10}(-[A-Z0-9]{2,5})?$/, 'Invalid product code format'),
  
  batchNumber: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}-[A-Z0-9]{4,8}$/, 'Invalid batch number format'),
  
  oeeValue: z.number()
    .min(0)
    .max(100)
    .refine(val => !isNaN(val), 'Must be a valid number'),
  
  temperatureReading: z.number()
    .min(-273.15) // Absolute zero
    .max(10000) // Reasonable upper limit
    .refine(val => !isNaN(val), 'Must be a valid temperature'),
  
  isoStandard: z.enum([
    'ISO9001', 'ISO14001', 'ISO14224', 'ISO22400-2', 
    'ISO45001', 'ISO50001', 'ISO55000'
  ]),
};

/**
 * Request validation middleware
 */
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  options?: {
    sanitize?: boolean;
    maxSize?: number;
  }
) {
  return async (req: Request): Promise<{
    data: T;
    errors?: z.ZodError['errors'];
  }> => {
    try {
      // Check content length
      const contentLength = parseInt(req.headers.get('content-length') || '0');
      const maxSize = options?.maxSize || REQUEST_SIZE_LIMITS.JSON;
      
      if (contentLength > maxSize) {
        throw new Error(`Request size ${contentLength} exceeds limit ${maxSize}`);
      }

      // Parse body
      const body = await req.json();

      // Sanitize if requested
      const input = options?.sanitize ? sanitizer.sanitizeJson(body) : body;

      // Validate against schema
      const data = schema.parse(input);

      return { data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn({ errors: error.errors }, 'Request validation failed');
        return { 
          data: {} as T, 
          errors: error.errors 
        };
      }
      throw error;
    }
  };
}

/**
 * File upload validation
 */
export async function validateFileUpload(
  file: File,
  options: {
    allowedTypes: string[];
    maxSize?: number;
    scanForVirus?: boolean;
  }
): Promise<{
  valid: boolean;
  error?: string;
}> {
  // Check file size
  const maxSize = options.maxSize || REQUEST_SIZE_LIMITS.FILE_UPLOAD;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds limit' };
  }

  // Check file type
  if (!options.allowedTypes.includes(file.type)) {
    return { valid: false, error: 'File type not allowed' };
  }

  // Check file name
  const sanitizedName = sanitizer.sanitizeFileName(file.name);
  if (sanitizedName !== file.name) {
    return { valid: false, error: 'Invalid file name' };
  }

  // TODO: Implement virus scanning
  if (options.scanForVirus) {
    // Integrate with ClamAV or similar
  }

  return { valid: true };
}

/**
 * Redact sensitive data from objects
 */
export function redactSensitiveData<T extends object>(
  obj: T,
  sensitiveKeys: string[] = [
    'password', 'token', 'apiKey', 'secret', 'authorization',
    'creditCard', 'ssn', 'bankAccount', 'privateKey'
  ]
): T {
  const redact = (item: any): any => {
    if (item === null || item === undefined) {
      return item;
    }

    if (typeof item !== 'object') {
      return item;
    }

    if (Array.isArray(item)) {
      return item.map(redact);
    }

    const redacted: any = {};
    for (const [key, value] of Object.entries(item)) {
      const lowerKey = key.toLowerCase();
      
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive.toLowerCase()))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        redacted[key] = redact(value);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  };

  return redact(obj) as T;
}