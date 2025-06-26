// Jest test - using global test functions
import { prisma } from '@/lib/database';
import { DEFAULT_USER_PREFERENCES } from '@/types/preferences';

describe('User Preferences Integration', () => {
  let testUserId: string;

  beforeAll(async () => {
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: 'test-preferences@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
      },
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.preferenceChangeHistory.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.userPreferences.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
  });

  it('should create default preferences for new user', async () => {
    const preferences = await prisma.userPreferences.create({
      data: {
        userId: testUserId,
      },
    });

    expect(preferences).toBeDefined();
    expect(preferences.theme).toBe('system');
    expect(preferences.language).toBe('en');
    expect(preferences.timezone).toBe('browser');
    expect(preferences.defaultTimeRange).toBe('Last 6 hours');
    expect(preferences.emailNotifications).toBe(true);
    expect(preferences.reduceMotion).toBe(false);
    expect(preferences.fontSize).toBe('medium');
  });

  it('should update preferences and track changes', async () => {
    // Update preferences
    const updatedPreferences = await prisma.userPreferences.update({
      where: { userId: testUserId },
      data: {
        theme: 'dark',
        language: 'es',
        fontSize: 'large',
      },
    });

    expect(updatedPreferences.theme).toBe('dark');
    expect(updatedPreferences.language).toBe('es');
    expect(updatedPreferences.fontSize).toBe('large');

    // Log changes for audit
    await prisma.preferenceChangeHistory.createMany({
      data: [
        {
          userId: testUserId,
          preferenceType: 'user',
          preferenceId: updatedPreferences.id,
          fieldChanged: 'theme',
          oldValue: 'system',
          newValue: 'dark',
          changedBy: testUserId,
          changeSource: 'test',
        },
        {
          userId: testUserId,
          preferenceType: 'user',
          preferenceId: updatedPreferences.id,
          fieldChanged: 'language',
          oldValue: 'en',
          newValue: 'es',
          changedBy: testUserId,
          changeSource: 'test',
        },
      ],
    });

    // Verify change history
    const changes = await prisma.preferenceChangeHistory.findMany({
      where: { userId: testUserId },
    });

    expect(changes).toHaveLength(2);
    expect(changes.some(c => c.fieldChanged === 'theme')).toBe(true);
    expect(changes.some(c => c.fieldChanged === 'language')).toBe(true);
  });

  it('should reset preferences to defaults', async () => {
    // Delete current preferences
    await prisma.userPreferences.delete({
      where: { userId: testUserId },
    });

    // Create new default preferences
    const newPreferences = await prisma.userPreferences.create({
      data: {
        userId: testUserId,
      },
    });

    expect(newPreferences.theme).toBe('system');
    expect(newPreferences.language).toBe('en');
    expect(newPreferences.fontSize).toBe('medium');
  });

  it('should validate preference constraints', async () => {
    // Test invalid font size
    await expect(
      prisma.userPreferences.update({
        where: { userId: testUserId },
        data: {
          fontSize: 'invalid' as any,
        },
      })
    ).rejects.toThrow();

    // Test valid updates
    const validUpdate = await prisma.userPreferences.update({
      where: { userId: testUserId },
      data: {
        fontSize: 'small',
        decimalPlaces: 3,
        queryHistory: 100,
      },
    });

    expect(validUpdate.fontSize).toBe('small');
    expect(validUpdate.decimalPlaces).toBe(3);
    expect(validUpdate.queryHistory).toBe(100);
  });
});

describe('Organization Defaults Integration', () => {
  let testOrgId: string;

  beforeAll(async () => {
    testOrgId = 'test-org-preferences';
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.organizationDefaults.deleteMany({
      where: { organizationId: testOrgId },
    });
  });

  it('should create organization defaults', async () => {
    const defaults = await prisma.organizationDefaults.create({
      data: {
        organizationId: testOrgId,
        defaultTheme: 'dark',
        defaultLanguage: 'en',
        defaultTimezone: 'UTC',
        emailNotificationsEnabled: true,
        alertingEnabled: true,
        passwordMinLength: 12,
        sessionTimeout: 28800, // 8 hours
      },
    });

    expect(defaults).toBeDefined();
    expect(defaults.defaultTheme).toBe('dark');
    expect(defaults.passwordMinLength).toBe(12);
    expect(defaults.sessionTimeout).toBe(28800);
  });

  it('should update organization defaults', async () => {
    const updated = await prisma.organizationDefaults.update({
      where: { organizationId: testOrgId },
      data: {
        maxDashboardsPerUser: 50,
        maxQueriesPerMinute: 100,
        enforcePasswordPolicy: true,
      },
    });

    expect(updated.maxDashboardsPerUser).toBe(50);
    expect(updated.maxQueriesPerMinute).toBe(100);
    expect(updated.enforcePasswordPolicy).toBe(true);
  });
});