/**
 * Test Setup for Comprehensive Agent Tests
 */

import { beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '../../../prisma/generated/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Ensure test environment
process.env.NODE_ENV = 'test';

let prisma: PrismaClient;

beforeAll(async () => {
  console.log('🚀 Setting up comprehensive test environment...');
  
  // Initialize test database
  prisma = new PrismaClient({
    log: ['error']
  });
  
  try {
    await prisma.$connect();
    console.log('✅ Test database connected');
    
    // Verify we have test data
    const equipmentCount = await prisma.dimEquipment.count();
    const productionCount = await prisma.factProduction.count();
    
    if (equipmentCount === 0 || productionCount === 0) {
      console.log('⚠️  No test data found, seeding database...');
      
      // Create minimal test data
      const site = await prisma.dimSite.create({
        data: {
          code: 'TEST_SITE',
          name: 'Test Manufacturing Site'
        }
      });
      
      const area = await prisma.dimArea.create({
        data: {
          code: 'TEST_AREA',
          name: 'Test Production Area',
          siteId: site.id
        }
      });
      
      const workCenter = await prisma.dimWorkCenter.create({
        data: {
          code: 'TEST_WC',
          name: 'Test Work Center',
          areaId: area.id
        }
      });
      
      const equipment = await prisma.dimEquipment.create({
        data: {
          code: 'TEST_EQ_001',
          name: 'Test Equipment 1',
          workCenterId: workCenter.id
        }
      });
      
      const product = await prisma.dimProduct.create({
        data: {
          code: 'TEST_PROD',
          name: 'Test Product'
        }
      });
      
      const shift = await prisma.dimShift.create({
        data: {
          name: 'Day Shift',
          startTime: '08:00:00',
          endTime: '16:00:00',
          siteId: site.id
        }
      });
      
      // Create test production data
      await prisma.factProduction.create({
        data: {
          dateId: 20250625,
          shiftId: shift.id,
          equipmentId: equipment.id,
          productId: product.id,
          startTime: new Date(Date.now() - 60 * 60 * 1000),
          endTime: new Date(),
          plannedProductionTime: BigInt(3600000), // 1 hour in ms
          operatingTime: BigInt(3400000), // 56.67 min
          totalPartsProduced: 100,
          goodParts: 95,
          scrapParts: 5
        }
      });
      
      // Create test scrap data
      await prisma.factScrap.create({
        data: {
          productionId: 1,
          productId: product.id,
          scrapCode: 'DIMENSIONAL',
          scrapQty: 3
        }
      });
      
      await prisma.factScrap.create({
        data: {
          productionId: 1,
          productId: product.id,
          scrapCode: 'SURFACE_FINISH',
          scrapQty: 2
        }
      });
      
      console.log('✅ Test data seeded successfully');
    } else {
      console.log(`✅ Found existing test data: ${equipmentCount} equipment, ${productionCount} production records`);
    }
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    throw error;
  }
});

afterAll(async () => {
  if (prisma) {
    await prisma.$disconnect();
    console.log('✅ Test database disconnected');
  }
});

export { prisma };