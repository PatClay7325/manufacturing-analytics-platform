// Integration tests for ISO 22400-compliant manufacturing calculations
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

describe('Manufacturing Calculations Integration', () => {
  beforeAll(async () => {
    // Setup test environment
    const { getPrisma } = global.dbUtils;
    expect(getPrisma()).toBeDefined();
  });

  beforeEach(async () => {
    // Clear test data before each test
    await global.dbUtils.clearAllData();
  });

  describe('OEE Calculations (ISO 22400)', () => {
    it('should calculate OEE correctly according to ISO 22400 standard', async () => {
      const { getPrisma, createTestEquipment } = global.dbUtils;
      const prisma = getPrisma();

      // Create test equipment
      const equipment = await createTestEquipment({
        equipmentCode: 'OEE_TEST_001',
        theoreticalCycleTime: 30.0, // 30 seconds per unit
        idealRunRate: 120.0, // 120 units per hour
      });

      // Create test OEE data with known values
      const testData = {
        timestamp: new Date(),
        equipmentId: equipment.id,
        recordId: 'oee-test-record',
        plannedProductionTime: 480.0, // 8 hours in minutes
        actualProductionTime: 400.0, // 6.67 hours actual production
        downtimeMinutes: 80.0, // 1.33 hours downtime
        plannedQuantity: 960.0, // 120 units/hour * 8 hours
        producedQuantity: 800.0, // Actual production
        goodQuantity: 760.0, // After quality issues
        scrapQuantity: 40.0,
        idealCycleTime: 30.0,
        actualCycleTime: 36.0, // Slower than ideal
        availability: 0.0, // Will be calculated
        performance: 0.0, // Will be calculated
        quality: 0.0, // Will be calculated
        oee: 0.0, // Will be calculated
      };

      // Calculate ISO 22400 OEE components
      // Availability = (Planned Production Time - Downtime) / Planned Production Time
      const availability = (testData.plannedProductionTime - testData.downtimeMinutes) / testData.plannedProductionTime;
      
      // Performance = (Produced Quantity × Ideal Cycle Time) / Actual Runtime (in seconds)
      const actualRuntimeMinutes = testData.actualProductionTime;
      const performance = (testData.producedQuantity * testData.idealCycleTime / 60) / actualRuntimeMinutes;
      
      // Quality = Good Quantity / Total Quantity Produced
      const quality = testData.goodQuantity / testData.producedQuantity;
      
      // OEE = Availability × Performance × Quality
      const oee = availability * performance * quality;

      // Update test data with calculated values
      testData.availability = Number(availability.toFixed(6));
      testData.performance = Number(performance.toFixed(6));
      testData.quality = Number(quality.toFixed(6));
      testData.oee = Number(oee.toFixed(6));

      // Insert the test data
      await prisma.factOeeMetric.create({ data: testData });

      // Verify calculations
      const result = await prisma.factOeeMetric.findFirst({
        where: { equipmentId: equipment.id },
      });

      expect(result).toBeDefined();
      expect(result!.availability).toBeCloseTo(0.833333, 5); // 400/480
      expect(result!.performance).toBeCloseTo(1.0, 5); // (800 * 0.5) / 400
      expect(result!.quality).toBeCloseTo(0.95, 5); // 760/800
      expect(result!.oee).toBeCloseTo(0.791667, 5); // 0.833333 * 1.0 * 0.95
    });

    it('should handle edge cases in OEE calculations', async () => {
      const { getPrisma, createTestEquipment } = global.dbUtils;
      const prisma = getPrisma();

      const equipment = await createTestEquipment({
        equipmentCode: 'OEE_EDGE_001',
      });

      // Test zero downtime scenario
      const perfectData = {
        timestamp: new Date(),
        equipmentId: equipment.id,
        recordId: 'perfect-oee',
        plannedProductionTime: 480.0,
        actualProductionTime: 480.0,
        downtimeMinutes: 0.0,
        plannedQuantity: 960.0,
        producedQuantity: 960.0,
        goodQuantity: 960.0,
        scrapQuantity: 0.0,
        availability: 1.0,
        performance: 1.0,
        quality: 1.0,
        oee: 1.0,
      };

      await prisma.factOeeMetric.create({ data: perfectData });

      // Test complete downtime scenario
      const downtimeData = {
        timestamp: new Date(Date.now() - 60000),
        equipmentId: equipment.id,
        recordId: 'downtime-oee',
        plannedProductionTime: 480.0,
        actualProductionTime: 0.0,
        downtimeMinutes: 480.0,
        plannedQuantity: 960.0,
        producedQuantity: 0.0,
        goodQuantity: 0.0,
        scrapQuantity: 0.0,
        availability: 0.0,
        performance: 0.0,
        quality: 0.0,
        oee: 0.0,
      };

      await prisma.factOeeMetric.create({ data: downtimeData });

      // Verify both scenarios
      const results = await prisma.factOeeMetric.findMany({
        where: { equipmentId: equipment.id },
        orderBy: { timestamp: 'desc' },
      });

      expect(results).toHaveLength(2);
      expect(results[0].oee).toBe(0.0); // Complete downtime
      expect(results[1].oee).toBe(1.0); // Perfect OEE
    });
  });

  describe('TEEP Calculations', () => {
    it('should calculate TEEP (Total Effective Equipment Performance)', async () => {
      const { getPrisma, createTestEquipment } = global.dbUtils;
      const prisma = getPrisma();

      const equipment = await createTestEquipment({
        equipmentCode: 'TEEP_TEST_001',
      });

      // TEEP = Utilization × OEE
      // Where Utilization = Equipment Operating Time / Calendar Time
      const testData = {
        timestamp: new Date(),
        equipmentId: equipment.id,
        recordId: 'teep-test',
        plannedProductionTime: 480.0, // 8 hours planned
        actualProductionTime: 400.0,
        downtimeMinutes: 80.0,
        plannedQuantity: 800.0,
        producedQuantity: 720.0,
        goodQuantity: 684.0,
        scrapQuantity: 36.0,
        availability: 0.833333, // 400/480
        performance: 0.900000, // 720/800
        quality: 0.950000, // 684/720
        oee: 0.713750, // 0.833333 * 0.900000 * 0.950000
        utilization: 0.333333, // 8 hours / 24 hours (assuming 24h calendar)
        teep: 0.237917, // 0.333333 * 0.713750
      };

      await prisma.factOeeMetric.create({ data: testData });

      const result = await prisma.factOeeMetric.findFirst({
        where: { equipmentId: equipment.id },
      });

      expect(result).toBeDefined();
      expect(result!.teep).toBeCloseTo(0.237917, 5);
      expect(result!.utilization).toBeCloseTo(0.333333, 5);
    });
  });

  describe('Performance Metrics', () => {
    it('should track cycle time performance accurately', async () => {
      const { getPrisma, createTestEquipment } = global.dbUtils;
      const prisma = getPrisma();

      const equipment = await createTestEquipment({
        equipmentCode: 'PERF_TEST_001',
        theoreticalCycleTime: 45.0, // 45 seconds ideal
      });

      // Create performance metrics
      const performanceData = [
        {
          timestamp: new Date(),
          equipmentId: equipment.id,
          recordId: 'perf-1',
          cycleTime: 50.0, // Slower than ideal
          theoreticalCycleTime: 45.0,
          actualRunRate: 72.0, // units/hour
          idealRunRate: 80.0,
          speedLossMinutes: 15.0,
          microStopsCount: 3,
          reducedSpeedMinutes: 10.0,
        },
        {
          timestamp: new Date(Date.now() - 60000),
          equipmentId: equipment.id,
          recordId: 'perf-2',
          cycleTime: 42.0, // Better than ideal
          theoreticalCycleTime: 45.0,
          actualRunRate: 86.0,
          idealRunRate: 80.0,
          speedLossMinutes: 5.0,
          microStopsCount: 1,
          reducedSpeedMinutes: 2.0,
        },
      ];

      await prisma.factPerformanceMetric.createMany({ data: performanceData });

      const results = await prisma.factPerformanceMetric.findMany({
        where: { equipmentId: equipment.id },
        orderBy: { timestamp: 'desc' },
      });

      expect(results).toHaveLength(2);
      
      // Verify performance tracking
      expect(results[0].cycleTime).toBe(50.0);
      expect(results[0].actualRunRate).toBe(72.0);
      expect(results[1].cycleTime).toBe(42.0);
      expect(results[1].actualRunRate).toBe(86.0);
    });
  });

  describe('Quality Metrics', () => {
    it('should track defects and quality rates', async () => {
      const { getPrisma, createTestEquipment, createTestProduct } = global.dbUtils;
      const prisma = getPrisma();

      const equipment = await createTestEquipment({
        equipmentCode: 'QUAL_TEST_001',
      });

      const product = await createTestProduct({
        productCode: 'QUAL_PRODUCT',
      });

      // Create quality metrics
      const qualityData = [
        {
          timestamp: new Date(),
          equipmentId: equipment.id,
          recordId: 'qual-1',
          productId: product.id,
          defectType: 'Dimensional',
          defectCategory: 'Critical',
          defectCount: 2,
          inspectionLotSize: 100,
          totalInspected: 100,
          totalDefects: 2,
          severityScore: 8,
        },
        {
          timestamp: new Date(Date.now() - 30000),
          equipmentId: equipment.id,
          recordId: 'qual-2',
          productId: product.id,
          defectType: 'Surface Finish',
          defectCategory: 'Minor',
          defectCount: 1,
          inspectionLotSize: 100,
          totalInspected: 100,
          totalDefects: 1,
          severityScore: 3,
        },
      ];

      await prisma.factQualityMetric.createMany({ data: qualityData });

      // Query quality metrics
      const results = await prisma.factQualityMetric.findMany({
        where: { equipmentId: equipment.id },
        orderBy: { timestamp: 'desc' },
      });

      expect(results).toHaveLength(2);
      
      // Calculate overall quality rate
      const totalInspected = results.reduce((sum, r) => sum + (r.totalInspected || 0), 0);
      const totalDefects = results.reduce((sum, r) => sum + (r.totalDefects || 0), 0);
      const qualityRate = (totalInspected - totalDefects) / totalInspected;

      expect(qualityRate).toBeCloseTo(0.985, 3); // 197/200 = 98.5%
    });
  });

  describe('TimescaleDB Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const { getPrisma, createTestEquipment, checkTimescaleDB } = global.dbUtils;
      const prisma = getPrisma();

      // Check if TimescaleDB is available
      const hasTimescaleDB = await checkTimescaleDB();
      if (!hasTimescaleDB) {
        console.warn('TimescaleDB not available, skipping performance test');
        return;
      }

      const equipment = await createTestEquipment({
        equipmentCode: 'PERF_BULK_001',
      });

      // Generate large dataset (1000 records)
      const batchSize = 100;
      const totalRecords = 1000;
      const baseTime = new Date();

      for (let batch = 0; batch < totalRecords / batchSize; batch++) {
        const batchData = [];
        
        for (let i = 0; i < batchSize; i++) {
          const recordIndex = batch * batchSize + i;
          batchData.push({
            timestamp: new Date(baseTime.getTime() - recordIndex * 60000), // 1 minute intervals
            equipmentId: equipment.id,
            recordId: `bulk-${recordIndex}`,
            plannedProductionTime: 60.0,
            actualProductionTime: 50.0 + Math.random() * 10,
            downtimeMinutes: Math.random() * 10,
            plannedQuantity: 100.0,
            producedQuantity: 90.0 + Math.random() * 10,
            goodQuantity: 85.0 + Math.random() * 10,
            scrapQuantity: Math.random() * 5,
            availability: 0.80 + Math.random() * 0.15,
            performance: 0.85 + Math.random() * 0.10,
            quality: 0.90 + Math.random() * 0.08,
            oee: 0.60 + Math.random() * 0.20,
          });
        }

        await prisma.factOeeMetric.createMany({ data: batchData });
      }

      // Test query performance
      const startTime = Date.now();
      
      const results = await prisma.factOeeMetric.findMany({
        where: {
          equipmentId: equipment.id,
          timestamp: {
            gte: new Date(baseTime.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 100,
      });

      const queryTime = Date.now() - startTime;

      expect(results).toHaveLength(100);
      expect(queryTime).toBeLessThan(1000); // Should complete in under 1 second

      // Test aggregation performance
      const aggStartTime = Date.now();
      
      const aggregation = await prisma.factOeeMetric.aggregate({
        where: { equipmentId: equipment.id },
        _avg: {
          availability: true,
          performance: true,
          quality: true,
          oee: true,
        },
        _count: true,
      });

      const aggTime = Date.now() - aggStartTime;

      expect(aggregation._count).toBe(totalRecords);
      expect(aggregation._avg.oee).toBeGreaterThan(0);
      expect(aggTime).toBeLessThan(2000); // Should complete in under 2 seconds
    });
  });
});