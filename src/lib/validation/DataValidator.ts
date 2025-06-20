/**
 * Data Validation System - Comprehensive input/output validation
 * Production-ready validation with sanitization and type checking
 */

import { z } from 'zod';
import { ApplicationError, ErrorCode, ErrorSeverity } from '../error/ErrorHandler';

// Common validation schemas
export const CommonSchemas = {
  // Basic types
  nonEmptyString: z.string().min(1, 'Field cannot be empty'),
  email: z.string().email('Invalid email format'),
  url: z.string().url('Invalid URL format'),
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Numeric ranges
  percentage: z.number().min(0).max(100),
  positiveNumber: z.number().positive('Must be a positive number'),
  nonNegativeNumber: z.number().min(0, 'Must be non-negative'),
  
  // Dates
  futureDate: z.date().refine(date => date > new Date(), 'Date must be in the future'),
  pastDate: z.date().refine(date => date < new Date(), 'Date must be in the past'),
  
  // Manufacturing-specific
  oeeValue: z.number().min(0).max(100, 'OEE must be between 0 and 100'),
  temperature: z.number().min(-273.15, 'Temperature cannot be below absolute zero'),
  pressure: z.number().min(0, 'Pressure cannot be negative'),
  vibration: z.number().min(0, 'Vibration cannot be negative'),
  
  // String patterns
  equipmentId: z.string().regex(/^[A-Z0-9_-]+$/, 'Equipment ID must contain only uppercase letters, numbers, hyphens, and underscores'),
  workOrderNumber: z.string().regex(/^WO\d{6}$/, 'Work order must be in format WO123456'),
  partNumber: z.string().regex(/^[A-Z0-9-]+$/, 'Part number must contain only uppercase letters, numbers, and hyphens'),
  
  // File validation
  csvFile: z.object({
    type: z.literal('text/csv'),
    size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB')
  }),
  
  // Pagination
  pagination: z.object({
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(1000).default(50),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc')
  })
};

// Authentication schemas
export const AuthSchemas = {
  login: z.object({
    email: CommonSchemas.email,
    password: z.string().min(8, 'Password must be at least 8 characters'),
    rememberMe: z.boolean().optional()
  }),
  
  register: z.object({
    email: CommonSchemas.email,
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 
        'Password must contain uppercase, lowercase, number, and special character'),
    name: CommonSchemas.nonEmptyString.max(100, 'Name cannot exceed 100 characters'),
    role: z.enum(['admin', 'manager', 'operator', 'viewer', 'maintenance', 'quality']).optional(),
    department: z.string().max(50).optional(),
    teamId: CommonSchemas.uuid.optional(),
    siteId: CommonSchemas.uuid.optional()
  }),
  
  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password required'),
    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 
        'Password must contain uppercase, lowercase, number, and special character')
  }).refine(data => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword']
  }),
  
  refreshToken: z.object({
    refreshToken: z.string().min(1, 'Refresh token required')
  })
};

// Manufacturing data schemas
export const ManufacturingSchemas = {
  equipment: z.object({
    id: CommonSchemas.equipmentId.optional(),
    name: CommonSchemas.nonEmptyString.max(100),
    code: CommonSchemas.equipmentId,
    equipmentType: z.string().min(1).max(50),
    model: z.string().max(100),
    serialNumber: z.string().max(100),
    manufacturerCode: z.string().max(50),
    installationDate: z.date(),
    status: z.enum(['operational', 'maintenance', 'offline', 'error']),
    location: z.string().max(200).optional(),
    description: z.string().max(500).optional(),
    workCenterId: CommonSchemas.uuid
  }),
  
  performanceMetric: z.object({
    timestamp: z.date().default(() => new Date()),
    availability: CommonSchemas.percentage.optional(),
    performance: CommonSchemas.percentage.optional(),
    quality: CommonSchemas.percentage.optional(),
    oeeScore: CommonSchemas.oeeValue.optional(),
    plannedProductionTime: CommonSchemas.nonNegativeNumber.optional(),
    operatingTime: CommonSchemas.nonNegativeNumber.optional(),
    totalParts: z.number().int().min(0).optional(),
    goodParts: z.number().int().min(0).optional(),
    rejectedParts: z.number().int().min(0).optional(),
    shift: z.string().max(10).optional(),
    operator: z.string().max(100).optional(),
    productType: z.string().max(100).optional(),
    workUnitId: CommonSchemas.uuid
  }).refine(data => {
    // Validate that goodParts + rejectedParts <= totalParts
    if (data.totalParts && data.goodParts && data.rejectedParts) {
      return data.goodParts + data.rejectedParts <= data.totalParts;
    }
    return true;
  }, {
    message: 'Good parts + rejected parts cannot exceed total parts',
    path: ['totalParts']
  }),
  
  qualityMetric: z.object({
    timestamp: z.date().default(() => new Date()),
    parameter: CommonSchemas.nonEmptyString.max(100),
    value: z.number(),
    uom: z.string().max(20),
    lowerLimit: z.number().optional(),
    upperLimit: z.number().optional(),
    nominal: z.number().optional(),
    isWithinSpec: z.boolean(),
    isInControl: z.boolean().default(true),
    qualityGrade: z.string().max(10).optional(),
    defectType: z.string().max(100).optional(),
    batchNumber: z.string().max(50).optional(),
    inspector: z.string().max(100).optional(),
    shift: z.string().max(10).optional(),
    workUnitId: CommonSchemas.uuid
  }).refine(data => {
    // Validate that value is within limits if specified
    if (data.lowerLimit !== undefined && data.value < data.lowerLimit) {
      return false;
    }
    if (data.upperLimit !== undefined && data.value > data.upperLimit) {
      return false;
    }
    return true;
  }, {
    message: 'Value must be within specified limits'
  }),
  
  alert: z.object({
    alertType: z.enum(['quality', 'equipment', 'production', 'safety', 'maintenance']),
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
    priority: z.enum(['urgent', 'high', 'medium', 'low']).default('medium'),
    title: z.string().max(200).optional(),
    message: CommonSchemas.nonEmptyString.max(1000),
    metricName: z.string().max(100).optional(),
    currentValue: z.number().optional(),
    thresholdValue: z.number().optional(),
    unit: z.string().max(20).optional(),
    workUnitId: CommonSchemas.uuid.optional()
  }),
  
  maintenanceRecord: z.object({
    maintenanceType: z.enum(['preventive', 'corrective', 'predictive', 'emergency']),
    subType: z.enum(['planned', 'unplanned', 'condition-based', 'calendar-based']).optional(),
    description: CommonSchemas.nonEmptyString.max(1000),
    workOrderNumber: CommonSchemas.workOrderNumber.optional(),
    priority: z.enum(['critical', 'high', 'medium', 'low']).default('medium'),
    technician: CommonSchemas.nonEmptyString.max(100),
    supervisor: z.string().max(100).optional(),
    startTime: z.date(),
    endTime: z.date().optional(),
    plannedDuration: CommonSchemas.nonNegativeNumber.optional(),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).default('scheduled'),
    parts: z.array(z.string()).default([]),
    partsCost: CommonSchemas.nonNegativeNumber.optional(),
    laborCost: CommonSchemas.nonNegativeNumber.optional(),
    totalCost: CommonSchemas.nonNegativeNumber.optional(),
    effectiveness: z.enum(['successful', 'partially_successful', 'unsuccessful']).optional(),
    workUnitId: CommonSchemas.uuid
  }).refine(data => {
    // Validate that endTime is after startTime
    if (data.endTime && data.endTime <= data.startTime) {
      return false;
    }
    return true;
  }, {
    message: 'End time must be after start time',
    path: ['endTime']
  })
};

// Dashboard schemas
export const DashboardSchemas = {
  dashboard: z.object({
    uid: z.string().optional(),
    title: CommonSchemas.nonEmptyString.max(200),
    slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
    description: z.string().max(500).optional(),
    tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags allowed'),
    panels: z.array(z.any()).max(50, 'Maximum 50 panels allowed'),
    variables: z.array(z.any()).optional(),
    time: z.object({
      from: z.string(),
      to: z.string()
    }).optional(),
    refresh: z.string().optional(),
    isPublic: z.boolean().default(false),
    folderId: CommonSchemas.uuid.optional()
  }),
  
  panel: z.object({
    id: z.number().int().positive(),
    title: CommonSchemas.nonEmptyString.max(100),
    type: z.string().min(1).max(50),
    gridPos: z.object({
      x: z.number().int().min(0).max(24),
      y: z.number().int().min(0),
      w: z.number().int().min(1).max(24),
      h: z.number().int().min(1).max(50)
    }),
    targets: z.array(z.object({
      expr: z.string().min(1),
      refId: z.string().min(1).max(10),
      legendFormat: z.string().optional()
    })).min(1, 'At least one target required'),
    options: z.record(z.any()).optional(),
    fieldConfig: z.record(z.any()).optional()
  }),
  
  folder: z.object({
    name: CommonSchemas.nonEmptyString.max(100),
    description: z.string().max(500).optional(),
    permission: z.enum(['private', 'team', 'public']).default('private'),
    tags: z.array(z.string().max(50)).max(10)
  })
};

// Query schemas
const timeRangeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1)
});

export const QuerySchemas = {
  timeRange: timeRangeSchema,
  
  prometheusQuery: z.object({
    query: z.string().min(1, 'Query cannot be empty'),
    start: z.number().optional(),
    end: z.number().optional(),
    step: z.string().optional()
  }),
  
  dataSourceQuery: z.object({
    datasourceId: CommonSchemas.nonEmptyString,
    query: CommonSchemas.nonEmptyString,
    timeRange: timeRangeSchema,
    variables: z.record(z.any()).optional(),
    maxDataPoints: z.number().int().min(1).max(10000).optional(),
    interval: z.string().optional()
  })
};

/**
 * Data Validator class with comprehensive validation capabilities
 */
export class DataValidator {
  /**
   * Validate data against a schema
   */
  static validate<T>(data: unknown, schema: z.ZodSchema<T>): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        throw new ApplicationError(
          'Validation failed',
          ErrorCode.VALIDATION_FAILED,
          ErrorSeverity.LOW,
          400,
          {
            context: { validationErrors },
            userMessage: `Validation failed: ${validationErrors.map(e => e.message).join(', ')}`
          }
        );
      }
      throw error;
    }
  }

  /**
   * Validate and sanitize data
   */
  static validateAndSanitize<T>(data: unknown, schema: z.ZodSchema<T>): T {
    // First sanitize the data
    const sanitized = this.sanitizeInput(data);
    
    // Then validate
    return this.validate(sanitized, schema);
  }

  /**
   * Sanitize input data to prevent XSS and injection attacks
   */
  static sanitizeInput(data: any): any {
    if (typeof data === 'string') {
      return data
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocols
        .replace(/on\w+\s*=\s*["']?[^"']*["']?/gi, '') // Remove event handlers
        .replace(/[<>]/g, (match) => match === '<' ? '&lt;' : '&gt;') // Escape HTML
        .trim();
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const sanitizedKey = this.sanitizeInput(key);
        sanitized[sanitizedKey] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return data;
  }

  /**
   * Validate manufacturing sensor data
   */
  static validateSensorData(data: any): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    sanitizedData?: any;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic structure validation
      if (!data || typeof data !== 'object') {
        errors.push('Data must be an object');
        return { valid: false, errors, warnings };
      }

      // Required fields
      const requiredFields = ['timestamp', 'value', 'sensorId'];
      for (const field of requiredFields) {
        if (!(field in data)) {
          errors.push(`Missing required field: ${field}`);
        }
      }

      // Timestamp validation
      if (data.timestamp) {
        const timestamp = new Date(data.timestamp);
        if (isNaN(timestamp.getTime())) {
          errors.push('Invalid timestamp format');
        } else {
          const now = new Date();
          const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
          const hourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
          
          if (timestamp < hourAgo) {
            warnings.push('Timestamp is more than 1 hour old');
          }
          if (timestamp > hourFromNow) {
            warnings.push('Timestamp is in the future');
          }
        }
      }

      // Value validation
      if (data.value !== undefined) {
        if (typeof data.value !== 'number' || !isFinite(data.value)) {
          errors.push('Value must be a finite number');
        } else {
          // Range checks based on sensor type
          if (data.sensorType === 'temperature' && (data.value < -50 || data.value > 200)) {
            warnings.push('Temperature value seems out of normal range (-50°C to 200°C)');
          }
          if (data.sensorType === 'pressure' && (data.value < 0 || data.value > 1000)) {
            warnings.push('Pressure value seems out of normal range (0 to 1000 bar)');
          }
          if (data.sensorType === 'vibration' && (data.value < 0 || data.value > 100)) {
            warnings.push('Vibration value seems out of normal range (0 to 100 mm/s)');
          }
        }
      }

      // Sanitize the data
      const sanitizedData = this.sanitizeInput(data);

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        sanitizedData: errors.length === 0 ? sanitizedData : undefined
      };

    } catch (error) {
      errors.push('Validation failed due to unexpected error');
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Validate file upload
   */
  static validateFileUpload(file: any, options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['text/csv', 'application/json', 'text/plain'],
      allowedExtensions = ['.csv', '.json', '.txt']
    } = options;

    if (!file) {
      errors.push('File is required');
      return { valid: false, errors };
    }

    // Size validation
    if (file.size > maxSize) {
      errors.push(`File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(maxSize / 1024 / 1024)}MB)`);
    }

    // Type validation
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type '${file.type}' is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Extension validation
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      errors.push(`File extension '${extension}' is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }

    // Filename validation
    if (file.name.length > 255) {
      errors.push('Filename is too long (maximum 255 characters)');
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
      errors.push('Filename contains invalid characters. Only letters, numbers, dots, hyphens, and underscores are allowed');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Create custom validation middleware for Express/Next.js
   */
  static createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
    return (data: unknown): T => {
      return this.validateAndSanitize(data, schema);
    };
  }
}

// Export common validation functions
export const validateAuth = (data: unknown) => DataValidator.validate(data, AuthSchemas.login);
export const validateEquipment = (data: unknown) => DataValidator.validate(data, ManufacturingSchemas.equipment);
export const validateDashboard = (data: unknown) => DataValidator.validate(data, DashboardSchemas.dashboard);
export const validateSensorData = (data: unknown) => DataValidator.validateSensorData(data);

export default DataValidator;