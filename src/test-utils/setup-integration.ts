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
  await prisma.equipment.deleteMany({});
  await prisma.productionLine.deleteMany({});
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
  await cleanDatabase();
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

global.createTestEquipment = async (overrides = {}) => {
  // Generate unique serial number
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const defaultSerialNumber = `SN-${timestamp}-${random}`;
  
  return prisma.equipment.create({
    data: {
      name: 'Test Equipment',
      type: 'CNC',
      manufacturerCode: 'TEST-001',
      serialNumber: defaultSerialNumber,
      status: 'operational',
      installationDate: new Date(),
      ...overrides,
    },
  });
};

// Declare global types
declare global {
  var testPrisma: PrismaClient;
  var createTestUser: (overrides?: any) => Promise<any>;
  var createTestEquipment: (overrides?: any) => Promise<any>;
}