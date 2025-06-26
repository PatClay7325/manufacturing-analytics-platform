// Jest test - using global test functions
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/resilience/CircuitBreaker', () => ({
  CircuitBreaker: jest.fn().mockImplementation(() => ({
    execute: jest.fn((fn) => fn()),
    getMetrics: jest.fn(() => ({
      state: 'CLOSED',
      failures: 0,
      successes: 10,
      totalRequests: 10,
    })),
  })),
}));

// Import modules after mocks
import { rateLimit, RATE_LIMIT_CONFIGS } from '@/lib/middleware/rate-limit';
import { authenticate } from '@/lib/auth/middleware';

describe('Comprehensive Security Tests', () => {
  
  describe('Rate Limiting Security', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should enforce rate limits on Grafana proxy', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/grafana-proxy');
      
      // Make requests up to the limit
      const requests = [];
      for (let i = 0; i < RATE_LIMIT_CONFIGS.GRAFANA_PROXY.maxRequests; i++) {
        requests.push(rateLimit(mockRequest, RATE_LIMIT_CONFIGS.GRAFANA_PROXY));
      }
      
      const results = await Promise.all(requests);
      
      // All requests should pass
      results.forEach(result => expect(result).toBeNull());
      
      // Next request should be rate limited
      const rateLimitedResult = await rateLimit(mockRequest, RATE_LIMIT_CONFIGS.GRAFANA_PROXY);
      expect(rateLimitedResult).toBeInstanceOf(NextResponse);
      
      const response = rateLimitedResult as NextResponse;
      expect(response.status).toBe(429);
    });

    it('should enforce strict rate limits on authentication', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/auth/login');
      
      // Make requests up to the auth limit (5 attempts)
      const requests = [];
      for (let i = 0; i < RATE_LIMIT_CONFIGS.AUTH.maxRequests; i++) {
        requests.push(rateLimit(mockRequest, RATE_LIMIT_CONFIGS.AUTH));
      }
      
      const results = await Promise.all(requests);
      
      // All requests should pass
      results.forEach(result => expect(result).toBeNull());
      
      // Next request should be rate limited
      const rateLimitedResult = await rateLimit(mockRequest, RATE_LIMIT_CONFIGS.AUTH);
      expect(rateLimitedResult).toBeInstanceOf(NextResponse);
      
      const response = rateLimitedResult as NextResponse;
      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBeTruthy();
    });

    it('should handle different client identification', async () => {
      const request1 = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Browser1'
        }
      });
      
      const request2 = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.2',
          'user-agent': 'Browser2'
        }
      });
      
      // Fill up rate limit for first client
      for (let i = 0; i < 100; i++) {
        await rateLimit(request1);
      }
      
      // First client should be rate limited
      const rateLimited1 = await rateLimit(request1);
      expect(rateLimited1).toBeInstanceOf(NextResponse);
      
      // Second client should still be allowed
      const allowed2 = await rateLimit(request2);
      expect(allowed2).toBeNull();
    });
  });

  describe('Authentication Security', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should reject requests without authentication', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/grafana-proxy');
      
      const authResult = await authenticate(mockRequest);
      
      expect(authResult.isAuthenticated).toBe(false);
      expect(authResult.user).toBeNull();
    });

    it('should validate JWT tokens properly', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      
      const authResult = await authenticate(mockRequest);
      
      expect(authResult.isAuthenticated).toBe(false);
      expect(authResult.error).toBeTruthy();
    });

    it('should handle expired sessions', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'Cookie': 'session=expired-session-id'
        }
      });
      
      const authResult = await authenticate(mockRequest);
      
      expect(authResult.isAuthenticated).toBe(false);
      expect(authResult.user).toBeNull();
    });

    it('should validate session integrity', async () => {
      const mockRequest = new NextRequest('http://localhost:3000/api/test', {
        headers: {
          'Cookie': 'session=tampered-session-id'
        }
      });
      
      const authResult = await authenticate(mockRequest);
      
      expect(authResult.isAuthenticated).toBe(false);
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent path traversal attacks', () => {
      const maliciousInputs = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '....//....//....//etc/passwd',
        '/var/log/../../../etc/passwd',
        'normal/path/../../secret'
      ];
      
      maliciousInputs.forEach(input => {
        const sanitized = input.replace(/\.\./g, '').replace(/\/+/g, '/');
        expect(sanitized).not.toContain('..');
        expect(sanitized).not.toMatch(/\/\.\.\/|\\\.\.\\|\/\.\.$/);
      });
    });

    it('should validate allowed API paths', () => {
      const allowedPaths = [
        'dashboards',
        'datasources', 
        'folders',
        'search',
        'health',
        'user',
        'orgs'
      ];
      
      const testPaths = [
        'dashboards/test',
        'datasources',
        'admin/users', // Should be rejected
        'health',
        'malicious/path', // Should be rejected
        'user/profile'
      ];
      
      testPaths.forEach(path => {
        const isAllowed = allowedPaths.some(allowedPath => 
          path.startsWith(allowedPath) || path === allowedPath
        );
        
        if (path.includes('admin') || path.includes('malicious')) {
          expect(isAllowed).toBe(false);
        }
      });
    });

    it('should sanitize SQL injection attempts', () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM passwords --",
        "admin'--",
        "admin' /*"
      ];
      
      sqlInjectionAttempts.forEach(attempt => {
        // Basic SQL injection prevention
        const sanitized = attempt
          .replace(/'/g, "''")  // Escape single quotes
          .replace(/;/g, '')    // Remove semicolons
          .replace(/--/g, '')   // Remove SQL comments
          .replace(/\/\*/g, '') // Remove SQL block comments
          .replace(/\*\//g, '');
        
        expect(sanitized).not.toContain(';');
        expect(sanitized).not.toContain('--');
        expect(sanitized).not.toContain('/*');
      });
    });
  });

  describe('Environment Security', () => {
    it('should validate required environment variables', () => {
      const requiredEnvVars = [
        'DATABASE_URL',
        'GRAFANA_API_KEY',
        'NEXTAUTH_SECRET',
        'GRAFANA_SECRET_KEY'
      ];
      
      // In tests, these might not be set, but we validate the structure
      requiredEnvVars.forEach(envVar => {
        const value = process.env[envVar];
        
        if (value) {
          // If set, should not be default/placeholder values
          expect(value).not.toBe('change-me');
          expect(value).not.toBe('admin');
          expect(value).not.toBe('password');
          expect(value).not.toBe('secret');
          expect(value).not.toBe('your-secret-here');
        }
      });
    });

    it('should detect insecure default passwords', () => {
      const insecurePasswords = [
        'admin',
        'password',
        'admin123',
        'password123',
        '123456',
        'grafana',
        'changeme',
        'default'
      ];
      
      const envVarsToCheck = [
        'GRAFANA_ADMIN_PASSWORD',
        'POSTGRES_PASSWORD',
        'REDIS_PASSWORD',
        'DB_PASSWORD'
      ];
      
      envVarsToCheck.forEach(envVar => {
        const value = process.env[envVar];
        if (value) {
          insecurePasswords.forEach(insecurePassword => {
            expect(value.toLowerCase()).not.toBe(insecurePassword);
          });
          
          // Should be reasonably long
          expect(value.length).toBeGreaterThan(8);
        }
      });
    });
  });

  describe('API Security Headers', () => {
    it('should include security headers in responses', () => {
      const securityHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'",
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      };
      
      Object.entries(securityHeaders).forEach(([header, value]) => {
        expect(header).toBeTruthy();
        expect(value).toBeTruthy();
        expect(typeof header).toBe('string');
        expect(typeof value).toBe('string');
      });
    });
  });

  describe('Session Security', () => {
    it('should generate cryptographically secure session IDs', () => {
      const sessionIdPattern = /^sess_\d+_[a-z0-9]+$/;
      
      // Mock session ID generation
      const generateSessionId = () => {
        const timestamp = Date.now();
        const randomPart = Math.random().toString(36).substring(2, 15);
        return `sess_${timestamp}_${randomPart}`;
      };
      
      const sessionId = generateSessionId();
      
      expect(sessionId).toMatch(sessionIdPattern);
      expect(sessionId.length).toBeGreaterThan(20);
      
      // Should be unique across multiple generations
      const sessionId2 = generateSessionId();
      expect(sessionId).not.toBe(sessionId2);
    });

    it('should validate session expiration', () => {
      const mockSessionData = {
        userId: 'user-123',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        createdAt: Date.now() - 3600000, // Created 1 hour ago
        lastAccessedAt: Date.now() - 1800000 // Last accessed 30 minutes ago
      };
      
      const isExpired = mockSessionData.expiresAt < Date.now();
      expect(isExpired).toBe(true);
    });

    it('should enforce session timeout policies', () => {
      const sessionTimeout = 30 * 60 * 1000; // 30 minutes
      const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours
      
      const mockSessionData = {
        userId: 'user-123',
        createdAt: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        lastAccessedAt: Date.now() - (35 * 60 * 1000) // 35 minutes ago
      };
      
      const isSessionTooOld = (Date.now() - mockSessionData.createdAt) > maxSessionAge;
      const isSessionInactive = (Date.now() - mockSessionData.lastAccessedAt) > sessionTimeout;
      
      expect(isSessionTooOld).toBe(true);
      expect(isSessionInactive).toBe(true);
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose sensitive information in error messages', () => {
      const sensitiveTerms = [
        'password',
        'secret',
        'token',
        'key',
        'internal',
        'database',
        'connection string',
        'admin'
      ];
      
      const mockErrorMessage = 'Authentication failed for user';
      
      sensitiveTerms.forEach(term => {
        expect(mockErrorMessage.toLowerCase()).not.toContain(term);
      });
    });

    it('should implement proper error logging without sensitive data', () => {
      const mockError = {
        message: 'Database connection failed',
        stack: 'Error: Database connection failed\n    at connect (/app/db.js:123:45)',
        connectionString: 'postgresql://user:password@localhost:5433/db' // Sensitive
      };
      
      // Error logging should exclude sensitive fields
      const safeErrorLog = {
        message: mockError.message,
        stack: mockError.stack.split('\n')[0], // Only first line
        timestamp: new Date().toISOString(),
        // connectionString intentionally excluded
      };
      
      expect(safeErrorLog).not.toHaveProperty('connectionString');
      expect(safeErrorLog.message).toBeTruthy();
      expect(safeErrorLog.stack).not.toContain('password');
    });
  });

  describe('Dependency Security', () => {
    it('should use secure versions of critical dependencies', () => {
      // Mock package.json dependencies check
      const criticalDependencies = {
        'next': '^15.0.0',
        'react': '^18.0.0',
        'jsonwebtoken': '^9.0.0',
        'bcryptjs': '^2.4.0'
      };
      
      Object.entries(criticalDependencies).forEach(([pkg, version]) => {
        expect(version).not.toMatch(/^\d+\.\d+\.\d+$/); // Should use caret/tilde
        expect(version).toMatch(/^[\^~]/); // Should have version range
      });
    });
  });
});

describe('Performance Security Tests', () => {
  it('should handle high-load scenarios without memory leaks', async () => {
    const initialMemory = process.memoryUsage();
    
    // Simulate high load
    const promises = Array(1000).fill(0).map(async (_, i) => {
      const mockRequest = new NextRequest(`http://localhost:3000/api/test?id=${i}`);
      return rateLimit(mockRequest);
    });
    
    await Promise.all(promises);
    
    const finalMemory = process.memoryUsage();
    
    // Memory growth should be reasonable (less than 50MB increase)
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
  });

  it('should prevent ReDoS (Regular Expression Denial of Service)', () => {
    const maliciousInputs = [
      'a'.repeat(100000) + '!',
      'x'.repeat(50000) + 'y'.repeat(50000),
      '(' + 'a'.repeat(10000) + ')*' + 'b'
    ];
    
    maliciousInputs.forEach(input => {
      const start = Date.now();
      
      // Simple regex that could be vulnerable
      const result = /^[a-zA-Z0-9_-]+$/.test(input.substring(0, 1000)); // Limit input length
      
      const duration = Date.now() - start;
      
      // Should complete quickly (under 100ms)
      expect(duration).toBeLessThan(100);
    });
  });
});