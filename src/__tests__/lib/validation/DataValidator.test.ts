// Jest test - using global test functions
/**
 * Data Validation Tests
 * Comprehensive test suite for data validation and sanitization
 */

import { 
  DataValidator, 
  CommonSchemas, 
  AuthSchemas, 
  ManufacturingSchemas, 
  DashboardSchemas,
  QuerySchemas,
  validateAuth,
  validateEquipment,
  validateDashboard,
  validateSensorData
} from '@/lib/validation/DataValidator';
import { ApplicationError, ErrorCode } from '@/lib/error/ErrorHandler';

describe('DataValidator', () => {
  describe('validate', () => {
    test('should validate correct data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Test123!@#'
      };

      const result = DataValidator.validate(validData, AuthSchemas.login);
      expect(result).toEqual(validData);
    });

    test('should throw ApplicationError for invalid data', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'weak'
      };

      expect(() => DataValidator.validate(invalidData, AuthSchemas.login))
        .toThrow(ApplicationError);

      try {
        DataValidator.validate(invalidData, AuthSchemas.login);
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).code).toBe(ErrorCode.VALIDATION_FAILED);
        expect(Array.isArray((error as ApplicationError).context?.validationErrors)).toBe(true);
      }
    });

    test('should include detailed validation errors', () => {
      const invalidData = {
        email: 'invalid',
        password: '123'
      };

      try {
        DataValidator.validate(invalidData, AuthSchemas.login);
      } catch (error) {
        const appError = error as ApplicationError;
        const validationErrors = appError.context?.validationErrors;
        
        expect(validationErrors).toHaveLength(2);
        expect(validationErrors[0].field).toBe('email');
        expect(validationErrors[0].message).toContain('Invalid email format');
        expect(validationErrors[1].field).toBe('password');
        expect(validationErrors[1].message).toContain('at least 8 characters');
      }
    });
  });

  describe('sanitizeInput', () => {
    test('should remove script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = DataValidator.sanitizeInput(maliciousInput);
      expect(sanitized).toBe('Hello World');
    });

    test('should remove javascript protocols', () => {
      const maliciousInput = 'javascript:alert("xss")';
      const sanitized = DataValidator.sanitizeInput(maliciousInput);
      expect(sanitized).toBe('alert("xss")');
    });

    test('should remove event handlers', () => {
      const maliciousInput = 'text onclick=alert("xss") more text';
      const sanitized = DataValidator.sanitizeInput(maliciousInput);
      expect(sanitized).toBe('text  more text');
    });

    test('should escape HTML entities', () => {
      const htmlInput = '<div>Hello</div>';
      const sanitized = DataValidator.sanitizeInput(htmlInput);
      expect(sanitized).toBe('&lt;div&gt;Hello&lt;/div&gt;');
    });

    test('should handle nested objects', () => {
      const nestedInput = {
        name: '<script>alert("xss")</script>John',
        details: {
          description: 'onclick=alert("xss")',
          tags: ['<script>', 'safe-tag']
        }
      };

      const sanitized = DataValidator.sanitizeInput(nestedInput);
      expect(sanitized.name).toBe('John');
      expect(sanitized.details.description).toBe(''); // onclick and its value are removed
      expect(sanitized.details.tags).toEqual(['&lt;script&gt;', 'safe-tag']); // HTML escaped, not removed
    });

    test('should handle arrays', () => {
      const arrayInput = ['<script>alert("xss")</script>', 'safe-string', 'javascript:void(0)'];
      const sanitized = DataValidator.sanitizeInput(arrayInput);
      expect(sanitized).toEqual(['', 'safe-string', 'void(0)']);
    });
  });

  describe('validateAndSanitize', () => {
    test('should sanitize and validate data', () => {
      const dirtyData = {
        email: 'test@example.com',
        password: 'Test123!', // Valid password format
        name: 'John<script>alert("xss")</script>'
      };

      const result = DataValidator.validateAndSanitize(dirtyData, AuthSchemas.register);
      expect(result.password).toBe('Test123!');
      expect(result.name).toBe('John');
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('validateSensorData', () => {
    test('should validate correct sensor data', () => {
      const validSensorData = {
        timestamp: new Date().toISOString(),
        value: 25.5,
        sensorId: 'TEMP_001',
        sensorType: 'temperature',
        unit: '°C'
      };

      const result = DataValidator.validateSensorData(validSensorData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedData).toBeDefined();
    });

    test('should detect missing required fields', () => {
      const invalidSensorData = {
        value: 25.5
      };

      const result = DataValidator.validateSensorData(invalidSensorData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: timestamp');
      expect(result.errors).toContain('Missing required field: sensorId');
    });

    test('should validate timestamp format', () => {
      const invalidSensorData = {
        timestamp: 'invalid-date',
        value: 25.5,
        sensorId: 'TEMP_001'
      };

      const result = DataValidator.validateSensorData(invalidSensorData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid timestamp format');
    });

    test('should warn about old timestamps', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const oldSensorData = {
        timestamp: twoHoursAgo.toISOString(),
        value: 25.5,
        sensorId: 'TEMP_001'
      };

      const result = DataValidator.validateSensorData(oldSensorData);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Timestamp is more than 1 hour old');
    });

    test('should warn about future timestamps', () => {
      const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const futureSensorData = {
        timestamp: twoHoursFromNow.toISOString(),
        value: 25.5,
        sensorId: 'TEMP_001'
      };

      const result = DataValidator.validateSensorData(futureSensorData);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Timestamp is in the future');
    });

    test('should validate value is a finite number', () => {
      const invalidSensorData = {
        timestamp: new Date().toISOString(),
        value: 'not-a-number',
        sensorId: 'TEMP_001'
      };

      const result = DataValidator.validateSensorData(invalidSensorData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Value must be a finite number');
    });

    test('should warn about out-of-range temperature values', () => {
      const extremeTempData = {
        timestamp: new Date().toISOString(),
        value: 300,
        sensorId: 'TEMP_001',
        sensorType: 'temperature'
      };

      const result = DataValidator.validateSensorData(extremeTempData);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Temperature value seems out of normal range (-50°C to 200°C)');
    });

    test('should warn about out-of-range pressure values', () => {
      const extremePressureData = {
        timestamp: new Date().toISOString(),
        value: 1500,
        sensorId: 'PRESS_001',
        sensorType: 'pressure'
      };

      const result = DataValidator.validateSensorData(extremePressureData);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Pressure value seems out of normal range (0 to 1000 bar)');
    });
  });

  describe('validateFileUpload', () => {
    test('should validate correct file', () => {
      const validFile = {
        name: 'data.csv',
        type: 'text/csv',
        size: 1024 * 1024 // 1MB
      };

      const result = DataValidator.validateFileUpload(validFile);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject oversized files', () => {
      const largeFile = {
        name: 'large.csv',
        type: 'text/csv',
        size: 20 * 1024 * 1024 // 20MB
      };

      const result = DataValidator.validateFileUpload(largeFile);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('exceeds maximum allowed size');
    });

    test('should reject invalid file types', () => {
      const invalidFile = {
        name: 'malicious.exe',
        type: 'application/x-executable',
        size: 1024
      };

      const result = DataValidator.validateFileUpload(invalidFile);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('File type');
      expect(result.errors[0]).toContain('not allowed');
    });

    test('should reject invalid file extensions', () => {
      const invalidFile = {
        name: 'script.js',
        type: 'text/csv', // Type is valid but extension is not
        size: 1024
      };

      const result = DataValidator.validateFileUpload(invalidFile);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('File extension');
      expect(result.errors[0]).toContain('not allowed');
    });

    test('should reject files with invalid characters in filename', () => {
      const invalidFile = {
        name: 'file<script>.csv',
        type: 'text/csv',
        size: 1024
      };

      const result = DataValidator.validateFileUpload(invalidFile);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('invalid characters');
    });
  });
});

describe('Common Schemas', () => {
  test('should validate email format', () => {
    expect(() => CommonSchemas.email.parse('test@example.com')).not.toThrow();
    expect(() => CommonSchemas.email.parse('invalid-email')).toThrow();
  });

  test('should validate UUID format', () => {
    expect(() => CommonSchemas.uuid.parse('123e4567-e89b-12d3-a456-426614174000')).not.toThrow();
    expect(() => CommonSchemas.uuid.parse('invalid-uuid')).toThrow();
  });

  test('should validate percentage values', () => {
    expect(() => CommonSchemas.percentage.parse(50)).not.toThrow();
    expect(() => CommonSchemas.percentage.parse(101)).toThrow();
    expect(() => CommonSchemas.percentage.parse(-1)).toThrow();
  });

  test('should validate equipment ID format', () => {
    expect(() => CommonSchemas.equipmentId.parse('EQ-001')).not.toThrow();
    expect(() => CommonSchemas.equipmentId.parse('MACHINE_A')).not.toThrow();
    expect(() => CommonSchemas.equipmentId.parse('invalid id')).toThrow();
  });

  test('should validate work order number format', () => {
    expect(() => CommonSchemas.workOrderNumber.parse('WO123456')).not.toThrow();
    expect(() => CommonSchemas.workOrderNumber.parse('WO12345')).toThrow();
    expect(() => CommonSchemas.workOrderNumber.parse('WO1234567')).toThrow();
  });
});

describe('Authentication Schemas', () => {
  test('should validate login credentials', () => {
    const validLogin = {
      email: 'test@example.com',
      password: 'Test123!@#'
    };

    expect(() => AuthSchemas.login.parse(validLogin)).not.toThrow();
  });

  test('should validate registration data', () => {
    const validRegistration = {
      email: 'test@example.com',
      password: 'Test123!',
      name: 'Test User',
      role: 'operator',
      department: 'Production'
    };

    expect(() => AuthSchemas.register.parse(validRegistration)).not.toThrow();
  });

  test('should enforce password complexity', () => {
    const weakPasswords = [
      'weakpass', // No uppercase, number, special char
      'WEAKPASS1', // No lowercase
      'WeakPass!', // No number
      'WeakPass1', // No special char
      'Weak1!' // Too short
    ];

    weakPasswords.forEach(password => {
      expect(() => AuthSchemas.register.parse({
        email: 'test@example.com',
        password,
        name: 'Test User'
      })).toThrow();
    });
  });

  test('should validate password change requirements', () => {
    const validChange = {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass123!'
    };

    expect(() => AuthSchemas.changePassword.parse(validChange)).not.toThrow();

    // Should fail if passwords are the same
    expect(() => AuthSchemas.changePassword.parse({
      currentPassword: 'SamePass123!',
      newPassword: 'SamePass123!'
    })).toThrow('New password must be different from current password');
  });
});

describe('Manufacturing Schemas', () => {
  test('should validate equipment data', () => {
    const validEquipment = {
      name: 'CNC Machine A',
      code: 'CNC-001',
      equipmentType: 'CNC',
      model: 'XYZ-2000',
      serialNumber: 'SN123456',
      manufacturerCode: 'ACME',
      installationDate: new Date('2023-01-01'),
      status: 'operational',
      workCenterId: '123e4567-e89b-12d3-a456-426614174000'
    };

    expect(() => ManufacturingSchemas.equipment.parse(validEquipment)).not.toThrow();
  });

  test('should validate performance metrics', () => {
    const validMetrics = {
      availability: 95,
      performance: 88,
      quality: 92,
      oeeScore: 77,
      totalParts: 100,
      goodParts: 92,
      rejectedParts: 8,
      workUnitId: '123e4567-e89b-12d3-a456-426614174000'
    };

    expect(() => ManufacturingSchemas.performanceMetric.parse(validMetrics)).not.toThrow();
  });

  test('should validate part count relationships', () => {
    const invalidMetrics = {
      totalParts: 100,
      goodParts: 80,
      rejectedParts: 30, // Total > 100
      workUnitId: '123e4567-e89b-12d3-a456-426614174000'
    };

    expect(() => ManufacturingSchemas.performanceMetric.parse(invalidMetrics)).toThrow();
  });

  test('should validate quality metrics', () => {
    const validQuality = {
      parameter: 'Diameter',
      value: 25.4,
      uom: 'mm',
      lowerLimit: 25.0,
      upperLimit: 25.8,
      nominal: 25.4,
      isWithinSpec: true,
      workUnitId: '123e4567-e89b-12d3-a456-426614174000'
    };

    expect(() => ManufacturingSchemas.qualityMetric.parse(validQuality)).not.toThrow();
  });

  test('should validate maintenance records', () => {
    const validMaintenance = {
      maintenanceType: 'preventive',
      description: 'Routine maintenance check',
      priority: 'medium',
      technician: 'John Doe',
      startTime: new Date('2024-01-01T08:00:00Z'),
      endTime: new Date('2024-01-01T10:00:00Z'),
      status: 'completed',
      workUnitId: '123e4567-e89b-12d3-a456-426614174000'
    };

    expect(() => ManufacturingSchemas.maintenanceRecord.parse(validMaintenance)).not.toThrow();
  });

  test('should validate maintenance time constraints', () => {
    const invalidMaintenance = {
      maintenanceType: 'preventive',
      description: 'Routine maintenance check',
      technician: 'John Doe',
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: new Date('2024-01-01T08:00:00Z'), // End before start
      workUnitId: '123e4567-e89b-12d3-a456-426614174000'
    };

    expect(() => ManufacturingSchemas.maintenanceRecord.parse(invalidMaintenance)).toThrow();
  });
});

describe('Dashboard Schemas', () => {
  test('should validate dashboard structure', () => {
    const validDashboard = {
      title: 'Production Overview',
      description: 'Main production dashboard',
      tags: ['production', 'oee'],
      panels: [],
      time: {
        from: 'now-6h',
        to: 'now'
      }
    };

    expect(() => DashboardSchemas.dashboard.parse(validDashboard)).not.toThrow();
  });

  test('should validate panel configuration', () => {
    const validPanel = {
      id: 1,
      title: 'OEE Chart',
      type: 'timeseries',
      gridPos: { x: 0, y: 0, w: 12, h: 8 },
      targets: [
        { expr: 'rate(production_total[5m])', refId: 'A' }
      ]
    };

    expect(() => DashboardSchemas.panel.parse(validPanel)).not.toThrow();
  });

  test('should validate grid position constraints', () => {
    const invalidPanel = {
      id: 1,
      title: 'Invalid Panel',
      type: 'timeseries',
      gridPos: { x: 0, y: 0, w: 25, h: 8 }, // Width > 24
      targets: [{ expr: 'test', refId: 'A' }]
    };

    expect(() => DashboardSchemas.panel.parse(invalidPanel)).toThrow();
  });
});

describe('Convenience validation functions', () => {
  test('validateAuth should work correctly', () => {
    const validAuth = { email: 'test@example.com', password: 'Test123!@#' };
    expect(() => validateAuth(validAuth)).not.toThrow();
    
    const invalidAuth = { email: 'invalid', password: 'weak' };
    expect(() => validateAuth(invalidAuth)).toThrow();
  });

  test('validateEquipment should work correctly', () => {
    const validEquipment = {
      name: 'Test Machine',
      code: 'TM-001',
      equipmentType: 'CNC',
      model: 'XYZ',
      serialNumber: 'SN123',
      manufacturerCode: 'ACME',
      installationDate: new Date(),
      status: 'operational',
      workCenterId: '123e4567-e89b-12d3-a456-426614174000'
    };
    
    expect(() => validateEquipment(validEquipment)).not.toThrow();
  });

  test('validateSensorData should work correctly', () => {
    const validSensor = {
      timestamp: new Date().toISOString(),
      value: 25.5,
      sensorId: 'TEMP_001'
    };
    
    const result = validateSensorData(validSensor);
    expect(result.valid).toBe(true);
  });
});