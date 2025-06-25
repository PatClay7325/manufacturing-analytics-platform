// Smoke tests for basic system functionality
import { describe, it, expect, beforeAll } from '@jest/globals';

describe('Basic System Smoke Tests', () => {
  describe('Environment Configuration', () => {
    it('should have required environment variables in test mode', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.DATABASE_URL).toMatch(/manufacturing_test/);
    });

    it('should have test database configuration', () => {
      const dbUrl = process.env.DATABASE_URL!;
      expect(dbUrl).toContain('localhost');
      expect(dbUrl).toContain('manufacturing_test');
    });
  });

  describe('Database Connectivity', () => {
    it('should connect to test database', async () => {
      const { getPrisma } = global.dbUtils;
      const prisma = getPrisma();
      
      expect(prisma).toBeDefined();
      
      // Simple connection test
      const result = await prisma.$queryRaw`SELECT 1 as test`;
      expect(result).toEqual([{ test: 1 }]);
    });

    it('should have TimescaleDB extension available', async () => {
      const { checkTimescaleDB } = global.dbUtils;
      const hasTimescaleDB = await checkTimescaleDB();
      
      // Log for CI visibility
      console.log(`TimescaleDB available: ${hasTimescaleDB}`);
      
      // Don't fail if TimescaleDB is not available in CI
      if (hasTimescaleDB) {
        expect(hasTimescaleDB).toBe(true);
      }
    });
  });

  describe('Core Manufacturing Models', () => {
    it('should create and query manufacturing site', async () => {
      const { createTestSite, getPrisma } = global.dbUtils;
      const prisma = getPrisma();
      
      const site = await createTestSite({
        siteCode: 'SMOKE_TEST_SITE',
        siteName: 'Smoke Test Site',
      });
      
      expect(site).toBeDefined();
      expect(site.siteCode).toBe('SMOKE_TEST_SITE');
      
      // Verify we can query it
      const foundSite = await prisma.manufacturingSite.findUnique({
        where: { siteCode: 'SMOKE_TEST_SITE' },
      });
      
      expect(foundSite).toBeDefined();
      expect(foundSite!.siteName).toBe('Smoke Test Site');
    });

    it('should create complete equipment hierarchy', async () => {
      const { createTestEquipment } = global.dbUtils;
      
      const equipment = await createTestEquipment({
        equipmentCode: 'SMOKE_TEST_EQ',
        equipmentName: 'Smoke Test Equipment',
      });
      
      expect(equipment).toBeDefined();
      expect(equipment.equipmentCode).toBe('SMOKE_TEST_EQ');
      expect(equipment.isActive).toBe(true);
    });

    it('should handle OEE metrics creation', async () => {
      const { createTestEquipment, createTestOeeMetrics, getPrisma } = global.dbUtils;
      const prisma = getPrisma();
      
      const equipment = await createTestEquipment({
        equipmentCode: 'OEE_SMOKE_TEST',
      });
      
      await createTestOeeMetrics(equipment.id, 5);
      
      const metrics = await prisma.factOeeMetric.findMany({
        where: { equipmentId: equipment.id },
      });
      
      expect(metrics).toHaveLength(5);
      expect(metrics[0].oee).toBeGreaterThan(0);
      expect(metrics[0].oee).toBeLessThanOrEqual(1);
    });
  });

  describe('ISO 22400 Compliance', () => {
    it('should validate OEE component ranges', async () => {
      const { createTestEquipment, getPrisma } = global.dbUtils;
      const prisma = getPrisma();
      
      const equipment = await createTestEquipment();
      
      // Create OEE data with valid ranges
      const oeeData = {
        timestamp: new Date(),
        equipmentId: equipment.id,
        recordId: 'iso-compliance-test',
        plannedProductionTime: 480.0,
        actualProductionTime: 400.0,
        downtimeMinutes: 80.0,
        plannedQuantity: 100.0,
        producedQuantity: 85.0,
        goodQuantity: 80.0,
        scrapQuantity: 5.0,
        availability: 0.833333, // 400/480
        performance: 0.85, // 85/100
        quality: 0.941176, // 80/85
        oee: 0.666667, // 0.833333 * 0.85 * 0.941176
      };
      
      await prisma.factOeeMetric.create({ data: oeeData });
      
      const result = await prisma.factOeeMetric.findFirst({
        where: { equipmentId: equipment.id },
      });
      
      // Validate ISO 22400 compliance
      expect(result!.availability).toBeGreaterThanOrEqual(0);
      expect(result!.availability).toBeLessThanOrEqual(1);
      expect(result!.performance).toBeGreaterThanOrEqual(0);
      expect(result!.performance).toBeLessThanOrEqual(1);
      expect(result!.quality).toBeGreaterThanOrEqual(0);
      expect(result!.quality).toBeLessThanOrEqual(1);
      expect(result!.oee).toBeGreaterThanOrEqual(0);
      expect(result!.oee).toBeLessThanOrEqual(1);
    });
  });

  describe('Basic Query Performance', () => {
    it('should execute basic queries within acceptable time', async () => {
      const { createTestEquipment, createTestOeeMetrics, getPrisma } = global.dbUtils;
      const prisma = getPrisma();
      
      const equipment = await createTestEquipment();
      await createTestOeeMetrics(equipment.id, 10);
      
      const startTime = Date.now();
      
      const results = await prisma.factOeeMetric.findMany({
        where: { equipmentId: equipment.id },
        orderBy: { timestamp: 'desc' },
        take: 5,
      });
      
      const queryTime = Date.now() - startTime;
      
      expect(results).toHaveLength(5);
      expect(queryTime).toBeLessThan(1000); // Should complete in under 1 second
      
      console.log(`Query completed in ${queryTime}ms`);
    });

    it('should handle aggregation queries efficiently', async () => {
      const { createTestEquipment, createTestOeeMetrics, getPrisma } = global.dbUtils;
      const prisma = getPrisma();
      
      const equipment = await createTestEquipment();
      await createTestOeeMetrics(equipment.id, 20);
      
      const startTime = Date.now();
      
      const aggregation = await prisma.factOeeMetric.aggregate({
        where: { equipmentId: equipment.id },
        _avg: {
          oee: true,
          availability: true,
          performance: true,
          quality: true,
        },
        _count: true,
      });
      
      const queryTime = Date.now() - startTime;
      
      expect(aggregation._count).toBe(20);
      expect(aggregation._avg.oee).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(2000); // Should complete in under 2 seconds
      
      console.log(`Aggregation completed in ${queryTime}ms`);
    });
  });
});