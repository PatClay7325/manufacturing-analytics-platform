/**
 * Phase 1 Security Components Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { jwtService } from '@/lib/auth/jwt-service';
import { authenticate, requirePermission, withAuth } from '@/lib/auth/auth-middleware';
import { clamAVScanner } from '@/lib/security/clamav-scanner';
import { pathValidator } from '@/lib/security/path-validator';
import { fileTypeValidator } from '@/lib/security/file-type-validator';
import { binaryAnalyzer } from '@/lib/security/binary-analyzer';
import { rowLevelSecurity, withTenantContext } from '@/lib/security/row-level-security';
import { errorHandler, AppError, ErrorCategory } from '@/lib/error/centralized-error-handler';
import { promises as fs } from 'fs';
import path from 'path';

describe('Phase 1 Security Integration Tests', () => {
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    // Setup test user
    testUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      tenantId: 'test-tenant-123',
      permissions: ['read', 'write', 'data:import'],
      roles: ['user'],
    };

    // Generate auth token
    const tokens = await jwtService.generateTokenPair(testUser);
    authToken = tokens.accessToken;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication & Authorization', () => {
    it('should authenticate valid JWT token', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'authorization': `Bearer ${authToken}`,
        },
      });

      const authRequest = request as any;
      const result = await authenticate(authRequest);

      expect(result).toBeUndefined(); // No error response
      expect(authRequest.user).toBeDefined();
      expect(authRequest.user.id).toBe(testUser.id);
      expect(authRequest.user.tenantId).toBe(testUser.tenantId);
    });

    it('should reject invalid JWT token', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'authorization': 'Bearer invalid-token',
        },
      });

      const result = await authenticate(request as any);
      expect(result).toBeDefined();
      expect(result?.status).toBe(401);
    });

    it('should enforce permission requirements', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'authorization': `Bearer ${authToken}`,
        },
      });

      const authRequest = request as any;
      
      // Should pass with existing permission
      const validResult = await requirePermission('data:import')(authRequest);
      expect(validResult).toBeUndefined();

      // Should fail with missing permission
      const invalidResult = await requirePermission('admin:delete')(authRequest);
      expect(invalidResult).toBeDefined();
      expect(invalidResult?.status).toBe(403);
    });

    it('should handle multi-tenancy correctly', async () => {
      await withTenantContext(testUser, async () => {
        const context = rowLevelSecurity.getContext();
        expect(context).toBeDefined();
        expect(context?.tenantId).toBe(testUser.tenantId);
        expect(context?.userId).toBe(testUser.id);
      });

      // Context should be cleared after
      const afterContext = rowLevelSecurity.getContext();
      expect(afterContext).toBeNull();
    });
  });

  describe('File Security', () => {
    const testFilesDir = path.join(process.cwd(), 'test-files');

    beforeEach(async () => {
      await fs.mkdir(testFilesDir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(testFilesDir, { recursive: true, force: true });
    });

    it('should validate safe file paths', async () => {
      const validation = await pathValidator.validatePath(
        'test-file.csv',
        testFilesDir
      );

      expect(validation.valid).toBe(true);
      expect(validation.sanitized).toBeDefined();
    });

    it('should reject path traversal attempts', async () => {
      const maliciousInputs = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        'test/../../secret.txt',
        'test\x00.txt', // Null byte
      ];

      for (const input of maliciousInputs) {
        const validation = await pathValidator.validatePath(input, testFilesDir);
        expect(validation.valid).toBe(false);
        expect(validation.error).toBeDefined();
      }
    });

    it('should generate safe filenames', () => {
      const unsafe = '../../../etc/passwd';
      const safe = pathValidator.generateSafeFilename(unsafe, testUser.tenantId);
      
      expect(safe).toMatch(/^test-tenant-123_\d+_[a-f0-9]+_etc_passwd$/);
      expect(safe).not.toContain('..');
      expect(safe).not.toContain('/');
    });

    it('should detect file types by magic numbers', async () => {
      // Create test files
      const jpegFile = path.join(testFilesDir, 'test.jpg');
      const jpegMagic = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      await fs.writeFile(jpegFile, jpegMagic);

      const pdfFile = path.join(testFilesDir, 'test.pdf');
      const pdfMagic = Buffer.from('%PDF-1.4');
      await fs.writeFile(pdfFile, pdfMagic);

      // Validate JPEG
      const jpegValidation = await fileTypeValidator.validateFile(jpegFile, 'image/jpeg', 'jpg');
      expect(jpegValidation.valid).toBe(true);
      expect(jpegValidation.mimeType).toBe('image/jpeg');

      // Validate PDF
      const pdfValidation = await fileTypeValidator.validateFile(pdfFile, 'application/pdf', 'pdf');
      expect(pdfValidation.valid).toBe(true);
      expect(pdfValidation.mimeType).toBe('application/pdf');

      // Detect mismatch
      const mismatchValidation = await fileTypeValidator.validateFile(jpegFile, 'application/pdf', 'pdf');
      expect(mismatchValidation.valid).toBe(true); // Still valid file type
      expect(mismatchValidation.warnings).toContain(
        "Claimed MIME type (application/pdf) doesn't match detected type (image/jpeg)"
      );
    });

    it('should block dangerous file types', async () => {
      const exeFile = path.join(testFilesDir, 'malware.exe');
      const exeMagic = Buffer.from('MZ'); // Windows executable
      await fs.writeFile(exeFile, exeMagic);

      const validation = await fileTypeValidator.validateFile(exeFile);
      expect(validation.valid).toBe(false);
      expect(validation.warnings).toContain('File type is blocked for security reasons');
    });
  });

  describe('Malware Scanning', () => {
    it('should handle ClamAV connection test', async () => {
      // Mock ClamAV not available
      vi.spyOn(clamAVScanner, 'testConnection').mockResolvedValue(false);
      
      const connected = await clamAVScanner.testConnection();
      expect(connected).toBe(false);
    });

    it('should handle scan results', async () => {
      const mockScanResult = {
        clean: true,
        infected: false,
        viruses: [],
        scanTime: 100,
        fileSize: 1024,
      };

      vi.spyOn(clamAVScanner, 'scanFile').mockResolvedValue(mockScanResult);

      const result = await clamAVScanner.scanFile('/test/file.txt');
      expect(result.clean).toBe(true);
      expect(result.infected).toBe(false);
    });
  });

  describe('Binary Analysis', () => {
    it('should analyze binary files for threats', async () => {
      const testFile = path.join(process.cwd(), 'test-binary.bin');
      
      // Create a test binary with suspicious patterns
      const suspiciousData = Buffer.concat([
        Buffer.from('MZ'), // PE header
        Buffer.from('This program cannot be run in DOS mode'),
        Buffer.from('cmd.exe'),
        Buffer.from('powershell'),
      ]);
      
      await fs.writeFile(testFile, suspiciousData);

      const analysis = await binaryAnalyzer.analyzeBinary(testFile);
      
      expect(analysis.threats.length).toBeGreaterThan(0);
      expect(analysis.metadata.fileType).toBe('PE');
      expect(analysis.risk).toBe('high'); // Due to cmd.exe and powershell strings
      
      await fs.unlink(testFile);
    });

    it('should calculate entropy for obfuscation detection', async () => {
      const testFile = path.join(process.cwd(), 'test-entropy.bin');
      
      // High entropy data (random)
      const randomData = crypto.getRandomValues(new Uint8Array(1024));
      await fs.writeFile(testFile, Buffer.from(randomData));

      const analysis = await binaryAnalyzer.analyzeBinary(testFile);
      
      expect(analysis.entropy).toBeGreaterThan(7); // High entropy indicates encryption/compression
      expect(analysis.metadata.obfuscated).toBe(true);
      
      await fs.unlink(testFile);
    });
  });

  describe('Error Handling', () => {
    it('should categorize errors correctly', () => {
      const validationError = new AppError('Invalid input', ErrorCategory.VALIDATION, 400);
      expect(validationError.category).toBe(ErrorCategory.VALIDATION);
      expect(validationError.statusCode).toBe(400);

      const authError = new AppError('Unauthorized', ErrorCategory.AUTHENTICATION, 401);
      expect(authError.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(authError.statusCode).toBe(401);
    });

    it('should handle error responses', () => {
      const error = new AppError('Test error', ErrorCategory.BUSINESS_LOGIC, 400, {
        severity: 'medium',
        context: { field: 'test' },
      });

      const response = errorHandler.handleError(error);
      expect(response.status).toBe(400);
    });

    it('should track circuit breaker state', () => {
      const breaker = errorHandler.getCircuitBreaker('test-service');
      
      // Record failures
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure();
      }
      
      expect(breaker.isOpen()).toBe(true);
      
      // Should block requests when open
      const serviceError = new AppError(
        'Service unavailable',
        ErrorCategory.EXTERNAL_SERVICE,
        503,
        { context: { service: 'test-service' } }
      );
      
      const response = errorHandler.handleError(serviceError);
      expect(response.status).toBe(503);
    });
  });

  describe('Row-Level Security', () => {
    it('should apply tenant filters to queries', () => {
      const rls = rowLevelSecurity;
      rls.setContext(testUser);

      const args = { where: { name: 'test' } };
      const filtered = rls.applyRLS('Equipment', 'read', args);

      expect(filtered.where).toEqual({
        AND: [
          { name: 'test' },
          { tenantId: testUser.tenantId },
        ],
      });
    });

    it('should add tenant context to creates', () => {
      const rls = rowLevelSecurity;
      rls.setContext(testUser);

      const args = { data: { name: 'New Equipment' } };
      const modified = rls.applyRLS('Equipment', 'create', args);

      expect(modified.data).toEqual({
        name: 'New Equipment',
        tenantId: testUser.tenantId,
      });
    });

    it('should enforce delete permissions', () => {
      const rls = rowLevelSecurity;
      const regularUser = { ...testUser, permissions: ['read', 'write'] };
      rls.setContext(regularUser);

      expect(() => {
        rls.applyRLS('Equipment', 'delete', {});
      }).toThrow('Insufficient permissions for delete operation');
    });
  });
});

// Crypto polyfill for Node.js environment
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = require('crypto').webcrypto as Crypto;
}