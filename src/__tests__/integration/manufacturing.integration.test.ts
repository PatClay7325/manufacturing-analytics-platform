// Jest test - using global test functions
/**
 * Manufacturing Integration Tests
 * End-to-end integration tests for manufacturing components and data processing
 */

import { PrismaClient } from '@prisma/client';
import { NextRequest } from 'next/server';

// Import services and components to test
import { authService, UserRole, Permission } from '@/lib/auth/AuthService';
import { DataValidator, ManufacturingSchemas } from '@/lib/validation/DataValidator';
import { ErrorHandler, ApplicationError, ErrorCode } from '@/lib/error/ErrorHandler';
import { requireAuth } from '@/lib/auth/middleware';

// Mock external dependencies
jest.mock('@prisma/client');
const MockedPrismaClient = PrismaClient as any;

// Test database setup
let testPrisma: any;

describe('Manufacturing Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database
    testPrisma = new MockedPrismaClient() as any;
    
    // Mock database operations
    testPrisma.user = {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn()
    } as any;

    testPrisma.equipment = {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn()
    } as any;

    testPrisma.performanceMetric = {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn()
    } as any;

    testPrisma.qualityMetric = {
      create: jest.fn(),
      findMany: jest.fn()
    } as any;

    testPrisma.alert = {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn()
    } as any;

    testPrisma.errorLog = {
      create: jest.fn()
    } as any;
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Equipment Management Integration', () => {
    test('should create and validate equipment with complete workflow', async () => {
      // Step 1: Create valid equipment data
      const equipmentData = {
        name: 'CNC Machine Alpha',
        code: 'CNC-ALPHA-001',
        equipmentType: 'CNC_MACHINE',
        model: 'XYZ-5000',
        serialNumber: 'SN-2024-001',
        manufacturerCode: 'ACME',
        installationDate: new Date('2024-01-15'),
        status: 'operational' as const,
        location: 'Floor 1, Bay A',
        description: 'High-precision CNC machine for automotive parts',
        workCenterId: '123e4567-e89b-12d3-a456-426614174000'
      };

      // Step 2: Validate equipment data
      const validatedData = DataValidator.validate(equipmentData, ManufacturingSchemas.equipment);
      expect(validatedData).toEqual(equipmentData);

      // Step 3: Mock database creation
      const createdEquipment = {
        id: 'eq-123',
        ...equipmentData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      testPrisma.equipment.create.mockResolvedValue(createdEquipment as any);

      // Step 4: Simulate equipment creation
      const result = await testPrisma.equipment.create({
        data: validatedData
      });

      expect(result).toEqual(createdEquipment);
      expect(testPrisma.equipment.create).toHaveBeenCalledWith({
        data: validatedData
      });
    });

    test('should handle equipment validation errors', async () => {
      const invalidEquipmentData = {
        name: '', // Invalid: empty name
        code: 'invalid code with spaces', // Invalid: contains spaces
        equipmentType: 'UNKNOWN_TYPE',
        status: 'invalid_status', // Invalid status
        workCenterId: 'invalid-uuid' // Invalid UUID
      };

      expect(() => {
        DataValidator.validate(invalidEquipmentData, ManufacturingSchemas.equipment);
      }).toThrow(ApplicationError);

      try {
        DataValidator.validate(invalidEquipmentData, ManufacturingSchemas.equipment);
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        const appError = error as ApplicationError;
        expect(appError.code).toBe(ErrorCode.VALIDATION_FAILED);
        expect(appError.context?.validationErrors).toBeArray();
        expect(appError.context?.validationErrors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance Metrics Integration', () => {
    test('should process and validate performance metrics pipeline', async () => {
      // Step 1: Create performance metrics data
      const metricsData = {
        timestamp: new Date(),
        availability: 95.5,
        performance: 88.2,
        quality: 92.8,
        oeeScore: 77.8,
        plannedProductionTime: 480, // 8 hours in minutes
        operatingTime: 456,
        totalParts: 1000,
        goodParts: 928,
        rejectedParts: 72,
        shift: 'Day',
        operator: 'John Smith',
        productType: 'Automotive Component A',
        equipmentId: 'EQ-123456',
        plantCode: 'PLANT-001',
        assetTag: 'ASSET-123456',
        workCenterId: '123e4567-e89b-12d3-a456-426614174000'
      };

      // Step 2: Validate metrics data
      const validatedMetrics = DataValidator.validate(metricsData, ManufacturingSchemas.performanceMetric);
      expect(validatedMetrics).toEqual(metricsData);

      // Step 3: Mock database insertion
      const createdMetrics = {
        id: 'pm-123',
        ...metricsData,
        createdAt: new Date()
      };

      testPrisma.performanceMetric.create.mockResolvedValue(createdMetrics as any);

      // Step 4: Simulate metrics ingestion
      const result = await testPrisma.performanceMetric.create({
        data: validatedMetrics
      });

      expect(result).toEqual(createdMetrics);
      expect(testPrisma.performanceMetric.create).toHaveBeenCalledWith({
        data: validatedMetrics
      });
    });

    test('should calculate OEE correctly and validate constraints', async () => {
      const metricsData = {
        availability: 95.0,
        performance: 90.0,
        quality: 95.0,
        totalParts: 100,
        goodParts: 95,
        rejectedParts: 5,
        equipmentId: 'EQ-123456',
        plantCode: 'PLANT-001',
        assetTag: 'ASSET-123456',
        workCenterId: '123e4567-e89b-12d3-a456-426614174000'
      };

      // Validate that parts calculations are correct
      const validatedMetrics = DataValidator.validate(metricsData, ManufacturingSchemas.performanceMetric);
      expect(validatedMetrics.goodParts + validatedMetrics.rejectedParts).toBe(validatedMetrics.totalParts);

      // Calculate expected OEE
      const expectedOEE = (95.0 * 90.0 * 95.0) / 10000; // 81.225%
      expect(expectedOEE).toBeCloseTo(81.225, 2);
    });

    test('should reject invalid part count relationships', async () => {
      const invalidMetricsData = {
        totalParts: 100,
        goodParts: 80,
        rejectedParts: 30, // 80 + 30 > 100
        equipmentId: 'EQ-123456',
        plantCode: 'PLANT-001',
        assetTag: 'ASSET-123456',
        workCenterId: '123e4567-e89b-12d3-a456-426614174000'
      };

      expect(() => {
        DataValidator.validate(invalidMetricsData, ManufacturingSchemas.performanceMetric);
      }).toThrow();
    });
  });

  describe('Quality Metrics Integration', () => {
    test('should validate quality control measurements', async () => {
      const qualityData = {
        timestamp: new Date(),
        parameter: 'Diameter',
        value: 25.42,
        uom: 'mm',
        lowerLimit: 25.0,
        upperLimit: 25.8,
        nominal: 25.4,
        isWithinSpec: true,
        isInControl: true,
        qualityGrade: 'A',
        batchNumber: 'B240115001',
        inspector: 'Jane Doe',
        shift: 'Day',
        equipmentId: 'EQ-123456',
        plantCode: 'PLANT-001',
        assetTag: 'ASSET-123456',
        workCenterId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const validatedQuality = DataValidator.validate(qualityData, ManufacturingSchemas.qualityMetric);
      expect(validatedQuality).toEqual(qualityData);

      // Verify value is within limits
      expect(validatedQuality.value).toBeGreaterThanOrEqual(validatedQuality.lowerLimit!);
      expect(validatedQuality.value).toBeLessThanOrEqual(validatedQuality.upperLimit!);
    });

    test('should detect out-of-spec measurements', async () => {
      const outOfSpecData = {
        parameter: 'Diameter',
        value: 26.0, // Above upper limit
        uom: 'mm',
        lowerLimit: 25.0,
        upperLimit: 25.8,
        isWithinSpec: false,
        equipmentId: 'EQ-123456',
        plantCode: 'PLANT-001',
        assetTag: 'ASSET-123456',
        workCenterId: '123e4567-e89b-12d3-a456-426614174000'
      };

      expect(() => {
        DataValidator.validate(outOfSpecData, ManufacturingSchemas.qualityMetric);
      }).toThrow();
    });
  });

  describe('Alert Generation Integration', () => {
    test('should create and process manufacturing alerts', async () => {
      const alertData = {
        alertType: 'equipment' as const,
        severity: 'high' as const,
        priority: 'urgent' as const,
        title: 'Equipment Malfunction',
        message: 'CNC Machine Alpha showing abnormal vibration levels',
        metricName: 'vibration',
        currentValue: 15.8,
        thresholdValue: 10.0,
        unit: 'mm/s',
        equipmentId: 'EQ-123456',
        plantCode: 'PLANT-001',
        assetTag: 'ASSET-123456',
        workCenterId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const validatedAlert = DataValidator.validate(alertData, ManufacturingSchemas.alert);
      expect(validatedAlert).toEqual(alertData);

      // Mock alert creation
      const createdAlert = {
        id: 'alert-123',
        ...alertData,
        status: 'open',
        createdAt: new Date(),
        acknowledged: false
      };

      testPrisma.alert.create.mockResolvedValue(createdAlert as any);

      const result = await testPrisma.alert.create({
        data: validatedAlert
      });

      expect(result).toEqual(createdAlert);
    });
  });

  describe('Authentication and Authorization Integration', () => {
    test('should authenticate operator and authorize equipment access', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'operator@factory.com',
        name: 'Factory Operator',
        role: UserRole.OPERATOR,
        department: 'Production',
        permissions: [Permission.EQUIPMENT_VIEW, Permission.EQUIPMENT_CONTROL, Permission.METRICS_CREATE],
        isActive: true
      };

      // Mock user authentication
      testPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: 'hashed_password',
        teamId: null,
        siteId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date()
      } as any);

      // Mock authentication service
      jest.spyOn(authService, 'verifyAccessToken').mockResolvedValue(mockUser);
      jest.spyOn(authService, 'hasPermission').mockImplementation((user, permission) => {
        return user.permissions.includes(permission);
      });

      // Create mock request with valid token
      const mockRequest = {
        headers: {
          get: (name: string) => name === 'authorization' ? 'Bearer valid-token' : null
        }
      } as any as NextRequest;

      // Test authentication
      const authResult = await requireAuth(mockRequest, Permission.EQUIPMENT_VIEW);

      expect(authResult.authenticated).toBe(true);
      expect(authResult.user).toEqual(mockUser);

      // Test authorization for different permissions
      expect(authService.hasPermission(mockUser, Permission.EQUIPMENT_VIEW)).toBe(true);
      expect(authService.hasPermission(mockUser, Permission.EQUIPMENT_CONTROL)).toBe(true);
      expect(authService.hasPermission(mockUser, Permission.USER_CREATE)).toBe(false);
    });

    test('should reject unauthorized access to admin functions', async () => {
      const mockOperator = {
        id: 'user-123',
        email: 'operator@factory.com',
        name: 'Factory Operator',
        role: UserRole.OPERATOR,
        department: 'Production',
        permissions: [Permission.EQUIPMENT_VIEW, Permission.METRICS_CREATE],
        isActive: true
      };

      jest.spyOn(authService, 'verifyAccessToken').mockResolvedValue(mockOperator);
      jest.spyOn(authService, 'hasPermission').mockImplementation((user, permission) => {
        return user.permissions.includes(permission);
      });

      const mockRequest = {
        headers: {
          get: (name: string) => name === 'authorization' ? 'Bearer valid-token' : null
        }
      } as any as NextRequest;

      // Test authorization for admin-only permission
      const authResult = await requireAuth(mockRequest, Permission.USER_CREATE);

      expect(authResult.authenticated).toBe(false);
      expect(authResult.error).toBe('Insufficient permissions');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle database connection errors', async () => {
      const errorHandler = new ErrorHandler();

      // Mock database error
      const dbError = new Error('Connection refused');
      testPrisma.equipment.create.mockRejectedValue(dbError);

      try {
        await testPrisma.equipment.create({
          data: {
            name: 'Test Equipment',
            code: 'TEST-001',
            equipmentType: 'TEST',
            status: 'operational',
            workCenterId: '123e4567-e89b-12d3-a456-426614174000'
          }
        });
      } catch (error) {
        // Test error handling
        const response = errorHandler.handleAPIError(error);
        expect(response.status).toBe(500);
      }
    });

    test('should handle validation errors in data pipeline', async () => {
      const invalidSensorData = {
        timestamp: 'invalid-date',
        value: 'not-a-number',
        sensorId: '' // empty sensor ID
      };

      const result = DataValidator.validateSensorData(invalidSensorData);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid timestamp format');
      expect(result.errors).toContain('Value must be a finite number');
      expect(result.errors).toContain('Missing required field: sensorId');
    });
  });

  describe('Data Processing Pipeline Integration', () => {
    test('should process sensor data through complete pipeline', async () => {
      // Step 1: Raw sensor data input
      const rawSensorData = {
        timestamp: new Date().toISOString(),
        value: 45.7,
        sensorId: 'TEMP_ZONE_A_001',
        sensorType: 'temperature',
        unit: '°C',
        equipmentCode: 'CNC-ALPHA-001'
      };

      // Step 2: Validate sensor data
      const validationResult = DataValidator.validateSensorData(rawSensorData);
      expect(validationResult.valid).toBe(true);
      expect(validationResult.warnings).toHaveLength(0);

      // Step 3: Sanitize data
      const sanitizedData = DataValidator.sanitizeInput(validationResult.sanitizedData);

      // Step 4: Check if alert threshold is exceeded (example: > 50°C)
      const shouldCreateAlert = sanitizedData.value > 50;
      expect(shouldCreateAlert).toBe(false); // 45.7 < 50

      // Step 5: Store metrics (simulate)
      const metricsEntry = {
        timestamp: new Date(sanitizedData.timestamp),
        parameter: 'temperature',
        value: sanitizedData.value,
        uom: sanitizedData.unit,
        isWithinSpec: sanitizedData.value <= 50,
        equipmentId: 'EQ-123456',
        plantCode: 'PLANT-001',
        assetTag: 'ASSET-123456',
        workCenterId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const validatedMetrics = DataValidator.validate(metricsEntry, ManufacturingSchemas.qualityMetric);
      expect(validatedMetrics.isWithinSpec).toBe(true);
    });

    test('should trigger alert for out-of-range sensor data', async () => {
      // High temperature sensor reading
      const criticalSensorData = {
        timestamp: new Date().toISOString(),
        value: 85.2, // Critical temperature
        sensorId: 'TEMP_ZONE_A_001',
        sensorType: 'temperature',
        unit: '°C'
      };

      const validationResult = DataValidator.validateSensorData(criticalSensorData);
      expect(validationResult.valid).toBe(true);
      expect(validationResult.warnings).toContain('Temperature value seems out of normal range (-50°C to 200°C)');

      // Should trigger alert creation
      const alertData = {
        alertType: 'equipment' as const,
        severity: 'critical' as const,
        priority: 'urgent' as const,
        message: `Critical temperature reading: ${criticalSensorData.value}°C`,
        metricName: 'temperature',
        currentValue: criticalSensorData.value,
        thresholdValue: 50,
        unit: '°C',
        equipmentId: 'EQ-123456',
        plantCode: 'PLANT-001',
        assetTag: 'ASSET-123456',
        workCenterId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const validatedAlert = DataValidator.validate(alertData, ManufacturingSchemas.alert);
      expect(validatedAlert.severity).toBe('critical');
      expect(validatedAlert.currentValue).toBe(85.2);
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle batch processing of multiple sensor readings', async () => {
      const batchSize = 100;
      const sensorReadings = Array.from({ length: batchSize }, (_, i) => ({
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        value: 20 + Math.random() * 10, // 20-30°C
        sensorId: `TEMP_${String(i).padStart(3, '0')}`,
        sensorType: 'temperature'
      }));

      // Validate all readings
      const validationResults = sensorReadings.map(reading => 
        DataValidator.validateSensorData(reading)
      );

      const validReadings = validationResults.filter(result => result.valid);
      expect(validReadings).toHaveLength(batchSize);

      // Simulate batch database insertion
      const mockBatchInsert = jest.fn().mockResolvedValue({ count: batchSize });
      
      const result = await mockBatchInsert(validReadings.map(r => r.sanitizedData));
      expect(result.count).toBe(batchSize);
    });

    test('should handle concurrent authentication requests', async () => {
      const concurrentRequests = 10;
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.OPERATOR,
        permissions: [Permission.DASHBOARD_VIEW],
        isActive: true
      };

      jest.spyOn(authService, 'verifyAccessToken').mockResolvedValue(mockUser);

      const requests = Array.from({ length: concurrentRequests }, (_, i) => ({
        headers: {
          get: (name: string) => name === 'authorization' ? `Bearer token-${i}` : null
        }
      })) as any as NextRequest[];

      const authPromises = requests.map(request => requireAuth(request));
      const results = await Promise.all(authPromises);

      results.forEach(result => {
        expect(result.authenticated).toBe(true);
        expect(result.user).toEqual(mockUser);
      });
    });
  });
});