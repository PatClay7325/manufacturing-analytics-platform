import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// Create a test database client
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Test data cleanup utilities
export async function cleanDatabase() {
  // Delete in correct order to respect foreign key constraints
  await prisma.metric.deleteMany({});
  await prisma.qualityCheck.deleteMany({});
  await prisma.qualityMetric.deleteMany({});
  await prisma.performanceMetric.deleteMany({});
  await prisma.maintenanceRecord.deleteMany({});
  await prisma.alert.deleteMany({});
  await prisma.productionOrder.deleteMany({});
  // Delete hierarchical data in reverse order
  await prisma.workUnit.deleteMany({});
  await prisma.workCenter.deleteMany({});
  await prisma.area.deleteMany({});
  await prisma.site.deleteMany({});
  await prisma.enterprise.deleteMany({});
  // Delete other data
  await prisma.dashboard.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.setting.deleteMany({});
}

// Setup and teardown
beforeAll(async () => {
  console.log('🔧 Setting up test database...');
  
  try {
    // Push schema to test database
    execSync('npx prisma db push --skip-generate', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });
    
    // Connect to database
    await prisma.$connect();
    console.log('✅ Test database ready');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean database before each test
  try {
    await cleanDatabase();
  } catch (error) {
    console.warn('Warning: Database cleanup failed, retrying...', error);
    // Retry cleanup once
    await cleanDatabase();
  }
});

// Global test utilities
global.testPrisma = prisma;
global.createTestUser = async (overrides = {}) => {
  return prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      passwordHash: 'hashed',
      ...overrides,
    },
  });
};

global.createTestEnterprise = async (overrides = {}) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return prisma.enterprise.create({
    data: {
      id: `ent-${timestamp}-${random}`,
      name: 'Test Enterprise',
      code: `TEST-ENT-${timestamp}-${random}`,
      updatedAt: new Date(),
      ...overrides,
    },
  });
};

global.createTestSite = async (enterpriseId: string, overrides = {}) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return prisma.site.create({
    data: {
      id: `site-${timestamp}-${random}`,
      name: 'Test Site',
      code: `TEST-SITE-${timestamp}-${random}`,
      location: 'Test Location',
      updatedAt: new Date(),
      enterpriseId,
      ...overrides,
    },
  });
};

global.createTestArea = async (siteId: string, overrides = {}) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return prisma.area.create({
    data: {
      id: `area-${timestamp}-${random}`,
      name: 'Test Area',
      code: `TEST-AREA-${timestamp}-${random}`,
      updatedAt: new Date(),
      siteId,
      ...overrides,
    },
  });
};

global.createTestWorkCenter = async (areaId: string, overrides = {}) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return prisma.workCenter.create({
    data: {
      id: `wc-${timestamp}-${random}`,
      name: 'Test Work Center',
      code: `TEST-WC-${timestamp}-${random}`,
      updatedAt: new Date(),
      areaId,
      ...overrides,
    },
  });
};

global.createTestWorkUnit = async (workCenterId: string, overrides = {}) => {
  // Generate unique serial number
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const defaultSerialNumber = `SN-${timestamp}-${random}`;
  
  return prisma.workUnit.create({
    data: {
      id: `wu-${timestamp}-${random}`,
      name: 'Test Work Unit',
      code: `TEST-WU-${timestamp}-${random}`,
      equipmentType: 'CNC',
      manufacturerCode: 'MFG-TEST-001',
      model: 'Model X',
      serialNumber: defaultSerialNumber,
      status: 'OPERATIONAL',
      installationDate: new Date(),
      updatedAt: new Date(),
      workCenterId,
      ...overrides,
    },
  });
};

// Helper to create full hierarchy
global.createTestHierarchy = async () => {
  const enterprise = await global.createTestEnterprise();
  const site = await global.createTestSite(enterprise.id);
  const area = await global.createTestArea(site.id);
  const workCenter = await global.createTestWorkCenter(area.id);
  const workUnit = await global.createTestWorkUnit(workCenter.id);
  
  return { enterprise, site, area, workCenter, workUnit };
};

// Declare global types
declare global {
  var testPrisma: PrismaClient;
  var createTestUser: (overrides?: any) => Promise<any>;
  var createTestEnterprise: (overrides?: any) => Promise<any>;
  var createTestSite: (enterpriseId: string, overrides?: any) => Promise<any>;
  var createTestArea: (siteId: string, overrides?: any) => Promise<any>;
  var createTestWorkCenter: (areaId: string, overrides?: any) => Promise<any>;
  var createTestWorkUnit: (workCenterId: string, overrides?: any) => Promise<any>;
  var createTestHierarchy: () => Promise<{
    enterprise: any;
    site: any;
    area: any;
    workCenter: any;
    workUnit: any;
  }>;
}