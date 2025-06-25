import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

// Use a separate test database URL
const TEST_DATABASE_URL = process.env.DATABASE_URL?.replace(/\/[^\/]+$/, '/test_manufacturing_analytics') 
  || 'postgresql://analytics:development_password@localhost:5433/test_manufacturing_analytics';

// Create test-specific Prisma client
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
  log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
});

export async function setupTestDatabase() {
  try {
    // Create test database if it doesn't exist
    await testPrisma.$executeRawUnsafe(`
      SELECT 'CREATE DATABASE test_manufacturing_analytics'
      WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'test_manufacturing_analytics')
    `);
  } catch (error) {
    // Database might already exist, which is fine
  }

  // Run migrations
  try {
    execSync('npx prisma migrate deploy', {
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
      },
    });
  } catch (error) {
    console.warn('Migration warning:', error);
  }
}

export async function cleanupTestDatabase() {
  // Clear all data in reverse order of dependencies
  await testPrisma.$transaction([
    testPrisma.chatHistory.deleteMany(),
    testPrisma.metric.deleteMany(),
    testPrisma.qualityCheck.deleteMany(),
    testPrisma.qualityMetric.deleteMany(),
    testPrisma.performanceMetric.deleteMany(),
    testPrisma.maintenanceRecord.deleteMany(),
    testPrisma.alert.deleteMany(),
    testPrisma.productionOrder.deleteMany(),
    testPrisma.workUnit.deleteMany(),
    testPrisma.workCenter.deleteMany(),
    testPrisma.area.deleteMany(),
    testPrisma.site.deleteMany(),
    testPrisma.enterprise.deleteMany(),
    testPrisma.user.deleteMany(),
  ]);
}

export async function teardownTestDatabase() {
  await testPrisma.$disconnect();
}