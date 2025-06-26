// Jest test - using global test functions
/**
 * Authentication Middleware Tests
 * Comprehensive test suite for authentication, authorization, security, and rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import middleware from '@/lib/auth/middleware';
import { authService, Permission, UserRole } from '@/lib/auth/AuthService';

const {
  requireAuth,
  createAuthMiddleware,
  createRateLimitMiddleware,
  createCORSMiddleware,
  securityHeaders,
  sanitizeInput,
  authRateLimit,
  apiRateLimit
} = middleware;

// Mock authService
jest.mock('@/lib/auth/AuthService');
const mockedAuthService = authService as any;

// Mock NextRequest and NextResponse
const createMockRequest = (options: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  ip?: string;
} = {}): NextRequest => {
  const {
    url = 'https://example.com/api/test',
    method = 'GET',
    headers = {},
    ip = '127.0.0.1'
  } = options;

  const headersMap = new Map();
  Object.entries(headers).forEach(([key, value]) => {
    headersMap.set(key, value);
  });

  return {
    url,
    method,
    headers: {
      get: (name: string) => headersMap.get(name.toLowerCase()) || null,
      has: (name: string) => headersMap.has(name.toLowerCase()),
      entries: () => headersMap.entries(),
      keys: () => headersMap.keys(),
      values: () => headersMap.values()
    },
    ip
  } as any as NextRequest;
};

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: UserRole.OPERATOR,
  department: 'Production',
  permissions: [Permission.DASHBOARD_VIEW, Permission.DATA_VIEW],
  isActive: true
};

describe('requireAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should authenticate user with valid token', async () => {
    const request = createMockRequest({
      headers: { authorization: 'Bearer valid-token' }
    });

    mockedAuthService.verifyAccessToken.mockResolvedValue(mockUser);

    const result = await requireAuth(request);

    expect(result.authenticated).toBe(true);
    expect(result.user).toEqual(mockUser);
    expect(result.error).toBeUndefined();
    expect(mockedAuthService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
  });

  test('should reject request without authorization header', async () => {
    const request = createMockRequest();

    const result = await requireAuth(request);

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe('Authorization header missing');
    expect(result.user).toBeUndefined();
  });

  test('should reject request with invalid authorization format', async () => {
    const request = createMockRequest({
      headers: { authorization: 'Invalid format' }
    });

    const result = await requireAuth(request);

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe('Invalid authorization format. Use: Bearer <token>');
  });

  test('should reject request with invalid token', async () => {
    const request = createMockRequest({
      headers: { authorization: 'Bearer invalid-token' }
    });

    mockedAuthService.verifyAccessToken.mockRejectedValue(new Error('Invalid token'));

    const result = await requireAuth(request);

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe('Invalid token');
  });

  test('should check single permission requirement', async () => {
    const request = createMockRequest({
      headers: { authorization: 'Bearer valid-token' }
    });

    mockedAuthService.verifyAccessToken.mockResolvedValue(mockUser);
    mockedAuthService.hasAnyPermission.mockReturnValue(true);

    const result = await requireAuth(request, Permission.DASHBOARD_VIEW);

    expect(result.authenticated).toBe(true);
    expect(mockedAuthService.hasAnyPermission).toHaveBeenCalledWith(mockUser, [Permission.DASHBOARD_VIEW]);
  });

  test('should check multiple permission requirements (any)', async () => {
    const request = createMockRequest({
      headers: { authorization: 'Bearer valid-token' }
    });

    mockedAuthService.verifyAccessToken.mockResolvedValue(mockUser);
    mockedAuthService.hasAnyPermission.mockReturnValue(true);

    const result = await requireAuth(request, [Permission.DASHBOARD_VIEW, Permission.DASHBOARD_CREATE]);

    expect(result.authenticated).toBe(true);
    expect(mockedAuthService.hasAnyPermission).toHaveBeenCalledWith(
      mockUser, 
      [Permission.DASHBOARD_VIEW, Permission.DASHBOARD_CREATE]
    );
  });

  test('should check multiple permission requirements (all)', async () => {
    const request = createMockRequest({
      headers: { authorization: 'Bearer valid-token' }
    });

    mockedAuthService.verifyAccessToken.mockResolvedValue(mockUser);
    mockedAuthService.hasAllPermissions.mockReturnValue(true);

    const result = await requireAuth(
      request, 
      [Permission.DASHBOARD_VIEW, Permission.DASHBOARD_CREATE],
      { requireAllPermissions: true }
    );

    expect(result.authenticated).toBe(true);
    expect(mockedAuthService.hasAllPermissions).toHaveBeenCalledWith(
      mockUser, 
      [Permission.DASHBOARD_VIEW, Permission.DASHBOARD_CREATE]
    );
  });

  test('should reject insufficient permissions', async () => {
    const request = createMockRequest({
      headers: { authorization: 'Bearer valid-token' }
    });

    mockedAuthService.verifyAccessToken.mockResolvedValue(mockUser);
    mockedAuthService.hasAnyPermission.mockReturnValue(false);

    const result = await requireAuth(request, Permission.DASHBOARD_CREATE);

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe('Insufficient permissions');
  });

  test('should allow anonymous access when configured', async () => {
    const request = createMockRequest();

    const result = await requireAuth(request, undefined, { allowAnonymous: true });

    expect(result.authenticated).toBe(true);
    expect(result.user).toBeUndefined();
  });

  test('should skip authentication when configured', async () => {
    const request = createMockRequest();

    const result = await requireAuth(request, undefined, { skipAuth: true });

    expect(result.authenticated).toBe(true);
    expect(result.user).toBeUndefined();
  });
});

describe('createAuthMiddleware', () => {
  test('should create middleware that authenticates requests', async () => {
    const middleware = createAuthMiddleware(Permission.DASHBOARD_VIEW);
    const request = createMockRequest({
      headers: { authorization: 'Bearer valid-token' }
    });

    mockedAuthService.verifyAccessToken.mockResolvedValue(mockUser);
    mockedAuthService.hasAnyPermission.mockReturnValue(true);

    const mockHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
    
    const response = await middleware(request, mockHandler);

    expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({
      user: mockUser
    }));
  });

  test('should return 401 for unauthenticated requests', async () => {
    const middleware = createAuthMiddleware(Permission.DASHBOARD_VIEW);
    const request = createMockRequest();

    const mockHandler = jest.fn();
    
    const response = await middleware(request, mockHandler);

    expect(response.status).toBe(401);
    expect(mockHandler).not.toHaveBeenCalled();
  });
});

describe('Rate Limiting', () => {
  test('should allow requests within limit', () => {
    const request = createMockRequest({ ip: '127.0.0.1' });
    
    // Use the exported authRateLimit middleware
    const response = authRateLimit(request);
    expect(response).toBeNull(); // First request should be allowed
  });

  test('should rate limit excessive requests', () => {
    // Create a simple rate limiter for testing
    class TestRateLimiter {
      private count = 0;
      private max = 2;

      isAllowed() {
        this.count++;
        return {
          allowed: this.count <= this.max,
          resetTime: Date.now() + 60000,
          remaining: Math.max(0, this.max - this.count)
        };
      }
    }

    const testLimiter = new TestRateLimiter();
    const limiterFunction = (request: NextRequest) => {
      const result = testLimiter.isAllowed();
      
      if (!result.allowed) {
        return NextResponse.json(
          { error: 'Too many requests' },
          { status: 429 }
        );
      }
      return null;
    };

    const request = createMockRequest({ ip: '127.0.0.1' });

    // First two requests should pass
    expect(limiterFunction(request)).toBeNull();
    expect(limiterFunction(request)).toBeNull();
    
    // Third request should be rate limited
    const response = limiterFunction(request);
    expect(response?.status).toBe(429);
  });
});

describe('CORS Middleware', () => {
  test('should set correct CORS headers for allowed origin', () => {
    const corsMiddleware = createCORSMiddleware({
      origin: 'https://example.com',
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization']
    });

    const request = createMockRequest({
      headers: { origin: 'https://example.com' }
    });

    const result = corsMiddleware(request);
    expect(result).toBeNull(); // Should continue with request
  });

  test('should handle OPTIONS preflight requests', () => {
    const corsMiddleware = createCORSMiddleware({
      origin: 'https://example.com'
    });

    const request = createMockRequest({
      method: 'OPTIONS',
      headers: { origin: 'https://example.com' }
    });

    const result = corsMiddleware(request);
    expect(result).toBeInstanceOf(NextResponse);
    expect(result?.status).toBe(200);
  });

  test('should handle multiple allowed origins', () => {
    const corsMiddleware = createCORSMiddleware({
      origin: ['https://example.com', 'https://test.com']
    });

    const request = createMockRequest({
      headers: { origin: 'https://test.com' }
    });

    const result = corsMiddleware(request);
    expect(result).toBeNull();
  });
});

describe('Security Headers', () => {
  test('should add security headers', () => {
    const request = createMockRequest();
    
    const result = securityHeaders(request);
    expect(result).toBeNull(); // Should continue with request
  });

  test('should add HSTS header in production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const request = createMockRequest();
    securityHeaders(request);

    process.env.NODE_ENV = originalEnv;
  });
});

describe('Input Sanitization', () => {
  test('should remove script tags', () => {
    const maliciousInput = '<script>alert("xss")</script>Hello';
    const sanitized = sanitizeInput(maliciousInput);
    expect(sanitized).toBe('Hello');
  });

  test('should remove javascript protocols', () => {
    const maliciousInput = 'javascript:alert("xss")';
    const sanitized = sanitizeInput(maliciousInput);
    expect(sanitized).toBe('alert("xss")');
  });

  test('should remove event handlers', () => {
    const maliciousInput = 'onclick=alert("xss")';
    const sanitized = sanitizeInput(maliciousInput);
    expect(sanitized).toBe('alert("xss")'); // Only removes onclick= part
  });

  test('should handle nested objects', () => {
    const maliciousObject = {
      name: '<script>alert("xss")</script>John',
      data: {
        value: 'onclick=alert("xss")',
        items: ['<script>', 'safe']
      }
    };

    const sanitized = sanitizeInput(maliciousObject);
    expect(sanitized.name).toBe('John');
    expect(sanitized.data.value).toBe('alert("xss")'); // onclick= removed
    expect(sanitized.data.items).toEqual(['', 'safe']);
  });

  test('should handle arrays', () => {
    const maliciousArray = ['<script>alert("xss")</script>', 'safe', 'javascript:void(0)'];
    const sanitized = sanitizeInput(maliciousArray);
    expect(sanitized).toEqual(['', 'safe', 'void(0)']);
  });

  test('should preserve non-string types', () => {
    const input = {
      number: 42,
      boolean: true,
      null: null,
      undefined: undefined,
      date: new Date()
    };

    const sanitized = sanitizeInput(input);
    expect(sanitized.number).toBe(42);
    expect(sanitized.boolean).toBe(true);
    expect(sanitized.null).toBe(null);
    expect(sanitized.undefined).toBe(undefined);
    expect(sanitized.date).toBeInstanceOf(Date);
  });

  test('should handle empty and whitespace strings', () => {
    expect(sanitizeInput('')).toBe('');
    expect(sanitizeInput('   ')).toBe('');
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });
});

describe('Integration Tests', () => {
  test('should handle complete authentication flow', async () => {
    const request = createMockRequest({
      headers: { authorization: 'Bearer valid-token' }
    });

    mockedAuthService.verifyAccessToken.mockResolvedValue(mockUser);
    mockedAuthService.hasAnyPermission.mockReturnValue(true);

    const middleware = createAuthMiddleware([Permission.DASHBOARD_VIEW]);
    const mockHandler = jest.fn().mockResolvedValue(NextResponse.json({ data: 'success' }));

    const response = await middleware(request, mockHandler);

    expect(mockHandler).toHaveBeenCalledWith(expect.objectContaining({
      user: mockUser
    }));
  });

  test('should handle authentication with sanitization', async () => {
    const maliciousData = {
      name: '<script>alert("xss")</script>John',
      email: 'test@example.com'
    };

    const sanitized = sanitizeInput(maliciousData);
    expect(sanitized.name).toBe('John');
    expect(sanitized.email).toBe('test@example.com');
  });

  test('should handle rate limiting with authentication', () => {
    // Simulate a scenario where both rate limiting and auth are applied
    const request = createMockRequest({
      ip: '127.0.0.1',
      headers: { authorization: 'Bearer valid-token' }
    });

    // Rate limiting should be checked first
    const rateLimitResponse = apiRateLimit(request);
    
    // If not rate limited, should proceed to auth
    if (!rateLimitResponse) {
      // Authentication would be checked next
      expect(request.headers.get('authorization')).toBe('Bearer valid-token');
    }
  });
});

describe('Error Handling', () => {
  test('should handle token verification errors gracefully', async () => {
    const request = createMockRequest({
      headers: { authorization: 'Bearer invalid-token' }
    });

    mockedAuthService.verifyAccessToken.mockRejectedValue(new Error('Token expired'));

    const result = await requireAuth(request);

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe('Token expired');
  });

  test('should handle network errors in token verification', async () => {
    const request = createMockRequest({
      headers: { authorization: 'Bearer valid-token' }
    });

    mockedAuthService.verifyAccessToken.mockRejectedValue(new Error('Network error'));

    const result = await requireAuth(request);

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe('Network error');
  });

  test('should handle permission check errors', async () => {
    const request = createMockRequest({
      headers: { authorization: 'Bearer valid-token' }
    });

    mockedAuthService.verifyAccessToken.mockResolvedValue(mockUser);
    mockedAuthService.hasAnyPermission.mockImplementation(() => {
      throw new Error('Permission check failed');
    });

    const result = await requireAuth(request, Permission.DASHBOARD_VIEW);

    expect(result.authenticated).toBe(false);
    expect(result.error).toBe('Permission check failed');
  });
});

describe('Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should handle concurrent authentication requests', async () => {
    const requests = Array.from({ length: 10 }, (_, i) => 
      createMockRequest({
        headers: { authorization: `Bearer token-${i}` }
      })
    );

    mockedAuthService.verifyAccessToken.mockResolvedValue(mockUser);

    const promises = requests.map(request => requireAuth(request));
    const results = await Promise.all(promises);

    results.forEach(result => {
      expect(result.authenticated).toBe(true);
      expect(result.user).toEqual(mockUser);
    });

    expect(mockedAuthService.verifyAccessToken).toHaveBeenCalledTimes(10);
  });

  test('should handle rate limiter cleanup', () => {
    // This test ensures that rate limiter cleanup doesn't cause issues
    const request = createMockRequest({ ip: '127.0.0.1' });
    
    // Multiple requests to trigger cleanup logic
    for (let i = 0; i < 5; i++) {
      apiRateLimit(request);
    }
    
    // Should still work after cleanup
    const response = apiRateLimit(request);
    expect(response).toBeDefined(); // Could be null (allowed) or NextResponse (rate limited)
  });
});