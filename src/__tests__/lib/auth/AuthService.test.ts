// Jest test - using global test functions
/**
 * Authentication Service Tests
 * Comprehensive test suite for authentication and authorization
 */

import { AuthService, UserRole, Permission } from '@/lib/auth/AuthService';
import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  }
} as unknown as PrismaClient;

// Mock bcrypt
jest.mock('bcryptjs');
const mockedBcrypt = bcrypt as any;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    // Replace the prisma instance with our mock
    (authService as any).prisma = mockPrisma;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('register', () => {
    test('should register a new user successfully', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'Test123!',
        name: 'Test User',
        role: UserRole.OPERATOR,
        department: 'Production'
      };

      // Mock bcrypt.hash
      mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);

      // Mock Prisma findUnique (user doesn't exist)
      (mockPrisma.user.findUnique as any).mockResolvedValue(null);

      // Mock Prisma create
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.OPERATOR,
        department: 'Production',
        passwordHash: 'hashedPassword',
        teamId: null,
        siteId: null
      };
      (mockPrisma.user.create as any).mockResolvedValue(mockUser);

      const result = await authService.register(registerData);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.OPERATOR,
        department: 'Production',
        permissions: expect.arrayContaining([
          Permission.DASHBOARD_VIEW,
          Permission.DATA_VIEW,
          Permission.EQUIPMENT_VIEW
        ]),
        isActive: true,
        teamId: undefined,
        siteId: undefined
      });

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          name: 'Test User',
          role: UserRole.OPERATOR,
          department: 'Production',
          passwordHash: 'hashedPassword',
          teamId: undefined,
          siteId: undefined
        }
      });
    });

    test('should throw error for invalid email', async () => {
      const registerData = {
        email: 'invalid-email',
        password: 'Test123!',
        name: 'Test User'
      };

      await expect(authService.register(registerData)).rejects.toThrow('Invalid email format');
    });

    test('should throw error for weak password', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User'
      };

      await expect(authService.register(registerData)).rejects.toThrow(
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
      );
    });

    test('should throw error for existing user', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'Test123!',
        name: 'Test User'
      };

      // Mock user already exists
      (mockPrisma.user.findUnique as any).mockResolvedValue({ id: 'existing-user' });

      await expect(authService.register(registerData)).rejects.toThrow('User already exists with this email');
    });
  });

  describe('login', () => {
    test('should login user with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'Test123!'
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.OPERATOR,
        department: 'Production',
        passwordHash: 'hashedPassword',
        isActive: true,
        teamId: null,
        siteId: null
      };

      // Mock Prisma findUnique
      (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser);

      // Mock bcrypt.compare
      mockedBcrypt.compare.mockResolvedValue(true as never);

      // Mock Prisma update
      (mockPrisma.user.update as any).mockResolvedValue(mockUser);

      const result = await authService.login(credentials);

      expect(result.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.OPERATOR,
        department: 'Production',
        permissions: expect.arrayContaining([Permission.DASHBOARD_VIEW]),
        lastLogin: expect.any(Date),
        isActive: true,
        teamId: undefined,
        siteId: undefined
      });

      expect(result.tokens).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        tokenType: 'Bearer'
      });
    });

    test('should throw error for invalid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // Mock user not found
      (mockPrisma.user.findUnique as any).mockResolvedValue(null);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    test('should throw error for wrong password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        isActive: true
      };

      (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    test('should throw error for inactive user', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'Test123!'
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        isActive: false
      };

      (mockPrisma.user.findUnique as any).mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      await expect(authService.login(credentials)).rejects.toThrow('Account is deactivated');
    });
  });

  describe('permissions', () => {
    test('should check user permissions correctly', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.OPERATOR,
        department: 'Production',
        permissions: [Permission.DASHBOARD_VIEW, Permission.DATA_VIEW],
        isActive: true
      };

      expect(authService.hasPermission(user, Permission.DASHBOARD_VIEW)).toBe(true);
      expect(authService.hasPermission(user, Permission.DASHBOARD_CREATE)).toBe(false);
    });

    test('should check multiple permissions correctly', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.OPERATOR,
        department: 'Production',
        permissions: [Permission.DASHBOARD_VIEW, Permission.DATA_VIEW],
        isActive: true
      };

      // hasAnyPermission
      expect(authService.hasAnyPermission(user, [Permission.DASHBOARD_VIEW, Permission.DASHBOARD_CREATE])).toBe(true);
      expect(authService.hasAnyPermission(user, [Permission.DASHBOARD_CREATE, Permission.DASHBOARD_DELETE])).toBe(false);

      // hasAllPermissions
      expect(authService.hasAllPermissions(user, [Permission.DASHBOARD_VIEW, Permission.DATA_VIEW])).toBe(true);
      expect(authService.hasAllPermissions(user, [Permission.DASHBOARD_VIEW, Permission.DASHBOARD_CREATE])).toBe(false);
    });

    test.skip('should have correct permissions for each role', () => {
      // TODO: getUserPermissions method needs to be implemented in AuthService
      // Test by creating mock users with different roles and checking their permissions
      // Since ROLE_PERMISSIONS is not exposed, we test through the getUserPermissions method
    });
  });

  describe('token management', () => {
    test('should generate valid JWT tokens', async () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.OPERATOR,
        permissions: [Permission.DASHBOARD_VIEW],
        isActive: true
      };

      const sessionId = 'session-123';
      const tokens = (authService as any).generateTokens(user, sessionId);

      expect(tokens).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        expiresIn: expect.any(Number),
        tokenType: 'Bearer'
      });

      // Verify token structure (would need jwt verification in real test)
      expect(tokens.accessToken.split('.')).toHaveLength(3); // JWT has 3 parts
      expect(tokens.refreshToken.split('.')).toHaveLength(3);
    });

    test('should track active sessions', async () => {
      const authService = new AuthService();
      const userId = 'user-123';
      const sessionId = 'session-123';

      // Access private method for testing
      const activeSessions = (authService as any).activeSessions;

      // Simulate login
      activeSessions.set(userId, new Set([sessionId]));

      expect(activeSessions.has(userId)).toBe(true);
      expect(activeSessions.get(userId).has(sessionId)).toBe(true);

      // Simulate logout
      await authService.logout(userId, sessionId);

      expect(activeSessions.has(userId)).toBe(false);
    });
  });

  describe('validation helpers', () => {
    test('should validate email format correctly', async () => {
      // Test email validation through registration
      const testEmails = [
        { email: 'test@example.com', expected: true },
        { email: 'user.name+tag@domain.co.uk', expected: true },
        { email: 'invalid-email', expected: false },
        { email: 'test@', expected: false },
        { email: '@example.com', expected: false }
      ];

      for (const { email, expected } of testEmails) {
        if (expected) {
          // Valid emails should pass validation
          await expect(authService.register({
            email,
            password: 'Test123!',
            name: 'Test User'
          })).rejects.not.toThrow('Invalid email format');
        } else {
          // Invalid emails should fail validation
          await expect(authService.register({
            email,
            password: 'Test123!',
            name: 'Test User'
          })).rejects.toThrow('Invalid email format');
        }
      }
    });

    test('should validate password strength correctly', async () => {
      // Test password validation through registration
      const testPasswords = [
        { password: 'Test123!', expected: true },
        { password: 'Complex1!', expected: true },
        { password: 'weakpass', expected: false }, // No uppercase, number, special char
        { password: 'WEAK123!', expected: false }, // No lowercase
        { password: 'WeakPass!', expected: false }, // No number
        { password: 'WeakPass1', expected: false }, // No special char
        { password: 'Weak1!', expected: false } // Too short
      ];

      // Mock user doesn't exist for each test
      (mockPrisma.user.findUnique as any).mockResolvedValue(null);
      
      // Mock successful user creation for valid passwords
      (mockPrisma.user.create as any).mockResolvedValue({
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.VIEWER,
        passwordHash: 'hashed'
      });

      for (const { password, expected } of testPasswords) {
        if (expected) {
          // Valid passwords should not throw password validation error
          // They might throw other errors but not the password error
          try {
            await authService.register({
              email: `test${Math.random()}@example.com`, // Unique email for each test
              password,
              name: 'Test User'
            });
          } catch (error: any) {
            expect(error.message).not.toBe('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
          }
        } else {
          // Invalid passwords should fail validation
          await expect(authService.register({
            email: `test${Math.random()}@example.com`,
            password,
            name: 'Test User'
          })).rejects.toThrow('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
        }
      }
    });
  });
});

// Integration tests would go here
describe('AuthService Integration', () => {
  // These would use a test database
  test.skip('should integrate with real database', async () => {
    // Integration tests with actual database
  });

  test.skip('should handle concurrent user registrations', async () => {
    // Test race conditions and concurrent access
  });

  test.skip('should properly clean up expired sessions', async () => {
    // Test session cleanup mechanisms
  });
});