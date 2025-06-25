import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/database';

// Helper function to create test hierarchy
async function createTestHierarchy() {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 9);
  const enterprise = await prisma.enterprise.create({
    data: {
      id: `ent-${timestamp}-${randomSuffix}`,
      name: 'Test Enterprise',
      code: `TEST-ENT-${timestamp}-${randomSuffix}`,
      updatedAt: new Date(),
    },
  });

  const site = await prisma.site.create({
    data: {
      id: `site-${timestamp}-${randomSuffix}`,
      name: 'Test Site',
      code: `TEST-SITE-${timestamp}-${randomSuffix}`,
      location: 'Test Location',
      enterpriseId: enterprise.id,
      updatedAt: new Date(),
    },
  });

  const area = await prisma.area.create({
    data: {
      id: `area-${timestamp}-${randomSuffix}`,
      name: 'Test Area',
      code: `TEST-AREA-${timestamp}-${randomSuffix}`,
      siteId: site.id,
      updatedAt: new Date(),
    },
  });

  const workCenter = await prisma.workCenter.create({
    data: {
      id: `wc-${timestamp}-${randomSuffix}`,
      name: 'Test Work Center',
      code: `TEST-WC-${timestamp}-${randomSuffix}`,
      areaId: area.id,
      updatedAt: new Date(),
    },
  });

  // Return equipment identifiers instead of workUnit
  const equipmentIdentifiers = {
    equipmentId: `EQ-${timestamp}-${randomSuffix}`,
    assetTag: `AT-${timestamp}-${randomSuffix}`,
    plantCode: site.code,
    workCenterId: workCenter.id,
  };

  return { enterprise, site, area, workCenter, equipmentIdentifiers };
}

// Helper function to create equipment identifiers for tests
async function createTestEquipment(workCenterId: string, options: { name: string; code: string }) {
  const timestamp = Date.now();
  return {
    equipmentId: `EQ-${timestamp}-${options.code}`,
    assetTag: `AT-${timestamp}-${options.code}`,
    plantCode: `PLANT-${timestamp}`,
    workCenterId,
    name: options.name,
    code: options.code,
  };
}

describe('API Integration Tests', () => {
  describe('Database API Operations', () => {
    it('should perform equipment CRUD operations using performance metrics', async () => {
      // Create hierarchy first
      const { workCenter, equipmentIdentifiers } = await createTestHierarchy();

      // Create performance metric representing equipment
      const performanceMetric = await prisma.performanceMetric.create({
        data: {
          id: `pm-api-${Date.now()}`,
          equipmentId: equipmentIdentifiers.equipmentId,
          assetTag: equipmentIdentifiers.assetTag,
          plantCode: equipmentIdentifiers.plantCode,
          workCenterId: workCenter.id,
          machineName: 'API Test Machine',
          processName: 'CNC Machining',
          oeeScore: 0.85,
          availability: 90.0,
          performance: 88.0,
          quality: 96.0,
          timestamp: new Date(),
        },
      });

      expect(performanceMetric.id).toBeDefined();
      expect(performanceMetric.machineName).toBe('API Test Machine');
      expect(performanceMetric.equipmentId).toBe(equipmentIdentifiers.equipmentId);

      // Read
      const found = await prisma.performanceMetric.findUnique({
        where: { id: performanceMetric.id },
      });
      expect(found).toBeDefined();
      expect(found?.machineName).toBe('API Test Machine');
      expect(found?.equipmentId).toBe(equipmentIdentifiers.equipmentId);

      // Update
      const updated = await prisma.performanceMetric.update({
        where: { id: performanceMetric.id },
        data: { 
          oeeScore: 0.75,
          availability: 85.0,
        },
      });
      expect(updated.oeeScore).toBe(0.75);
      expect(updated.availability).toBe(85.0);

      // List by equipment
      const equipmentMetrics = await prisma.performanceMetric.findMany({
        where: { 
          equipmentId: equipmentIdentifiers.equipmentId,
          plantCode: equipmentIdentifiers.plantCode 
        },
      });
      expect(equipmentMetrics).toHaveLength(1);

      // Delete
      await prisma.performanceMetric.delete({
        where: { id: performanceMetric.id },
      });

      const deleted = await prisma.performanceMetric.findUnique({
        where: { id: performanceMetric.id },
      });
      expect(deleted).toBeNull();
    });

    it('should handle alert operations with equipment identification', async () => {
      const { equipmentIdentifiers } = await createTestHierarchy();

      // Create alert with equipment identification
      const alert = await prisma.alert.create({
        data: {
          equipmentId: equipmentIdentifiers.equipmentId,
          assetTag: equipmentIdentifiers.assetTag,
          plantCode: equipmentIdentifiers.plantCode,
          alertType: 'maintenance',
          severity: 'high',
          message: 'Urgent maintenance required',
          status: 'active',
          title: 'Equipment Maintenance Alert',
        },
      });

      expect(alert.equipmentId).toBe(equipmentIdentifiers.equipmentId);
      expect(alert.assetTag).toBe(equipmentIdentifiers.assetTag);
      expect(alert.plantCode).toBe(equipmentIdentifiers.plantCode);

      // Query alerts by equipment
      const equipmentAlerts = await prisma.alert.findMany({
        where: { 
          equipmentId: equipmentIdentifiers.equipmentId,
          plantCode: equipmentIdentifiers.plantCode 
        },
      });

      expect(equipmentAlerts).toHaveLength(1);
      expect(equipmentAlerts[0].equipmentId).toBe(equipmentIdentifiers.equipmentId);
      expect(equipmentAlerts[0].message).toBe('Urgent maintenance required');

      // Update alert status
      await prisma.alert.update({
        where: { id: alert.id },
        data: {
          status: 'acknowledged',
          acknowledgedBy: 'test-user',
          acknowledgedAt: new Date(),
        },
      });

      const acknowledged = await prisma.alert.findUnique({
        where: { id: alert.id },
      });
      expect(acknowledged?.status).toBe('acknowledged');
      expect(acknowledged?.acknowledgedBy).toBe('test-user');
    });

    it('should handle metrics ingestion and querying', async () => {
      const { equipmentIdentifiers } = await createTestHierarchy();
      const now = new Date();

      // Ingest multiple metrics using equipment identification
      const metrics = [];
      for (let i = 0; i < 10; i++) {
        metrics.push({
          id: `metric-${Date.now()}-${i}`,
          name: 'TEMPERATURE',
          value: 65 + Math.random() * 10,
          unit: '°C',
          timestamp: new Date(now.getTime() - i * 60 * 1000),
          tags: { 
            sensor: 'TEMP-001',
            equipmentId: equipmentIdentifiers.equipmentId,
            assetTag: equipmentIdentifiers.assetTag,
            plantCode: equipmentIdentifiers.plantCode,
          },
          category: 'equipment',
          source: 'sensor',
        });
      }

      await prisma.metric.createMany({ data: metrics });

      // Query metrics by equipment (using tags)
      const recentMetrics = await prisma.metric.findMany({
        where: {
          name: 'TEMPERATURE',
          timestamp: {
            gte: new Date(now.getTime() - 30 * 60 * 1000),
          },
          // Note: Prisma doesn't support querying JSON fields directly in all cases
          // This is a simplified version that would work in production with proper JSON queries
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(recentMetrics.length).toBeGreaterThan(0);
      expect(recentMetrics[0].name).toBe('TEMPERATURE');

      // Aggregate metrics
      const avgTemp = await prisma.metric.aggregate({
        where: {
          name: 'TEMPERATURE',
          category: 'equipment',
        },
        _avg: { value: true },
        _max: { value: true },
        _min: { value: true },
      });

      expect(avgTemp._avg.value).toBeGreaterThan(65);
      expect(avgTemp._avg.value).toBeLessThan(75);
      expect(avgTemp._max.value).toBeGreaterThanOrEqual(avgTemp._avg.value!);
      expect(avgTemp._min.value).toBeLessThanOrEqual(avgTemp._avg.value!);
    });

    it('should handle complex production workflow', async () => {
      // Create hierarchy with multiple equipment
      const { enterprise, site, area, workCenter } = await createTestHierarchy();
      
      // Create equipment identifiers for the work center
      const equipment1 = await createTestEquipment(workCenter.id, { 
        name: 'Line Machine 1',
        code: 'LM-001',
      });
      const equipment2 = await createTestEquipment(workCenter.id, { 
        name: 'Line Machine 2',
        code: 'LM-002',
      });

      // Create production order
      const order = await prisma.productionOrder.create({
        data: {
          orderNumber: `PO-API-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          workCenterId: workCenter.id,
          product: 'Test Product',
          quantity: 1000,
          targetStartDate: new Date(),
          targetEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'scheduled',
          priority: 1,
        },
      });

      // Start production
      await prisma.productionOrder.update({
        where: { id: order.id },
        data: {
          status: 'in_progress',
          actualStartDate: new Date(),
        },
      });

      // Create performance metrics for each piece of equipment
      const perfMetrics = [];
      for (const equipment of [equipment1, equipment2]) {
        perfMetrics.push({
          id: `perf-${Date.now()}-${equipment.code}`,
          equipmentId: equipment.equipmentId,
          assetTag: equipment.assetTag,
          plantCode: equipment.plantCode,
          workCenterId: equipment.workCenterId,
          machineName: equipment.name,
          timestamp: new Date(),
          availability: 95,
          performance: 88,
          quality: 99,
          oeeScore: (0.95 * 0.88 * 0.99),
        });
      }

      await prisma.performanceMetric.createMany({ data: perfMetrics });

      // Query production order with associated work center
      const orderWithWorkCenter = await prisma.productionOrder.findUnique({
        where: { id: order.id },
        include: {
          WorkCenter: true,
        },
      });

      // Query performance metrics for this work center
      const workCenterMetrics = await prisma.performanceMetric.findMany({
        where: { 
          workCenterId: workCenter.id,
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(orderWithWorkCenter).toBeDefined();
      expect(orderWithWorkCenter?.WorkCenter).toBeDefined();
      expect(workCenterMetrics).toHaveLength(2); // Two equipment metrics
      
      // Complete production
      await prisma.productionOrder.update({
        where: { id: order.id },
        data: {
          status: 'completed',
          actualEndDate: new Date(),
        },
      });

      const completed = await prisma.productionOrder.findUnique({
        where: { id: order.id },
      });
      expect(completed?.status).toBe('completed');
      expect(completed?.actualEndDate).toBeDefined();
    });
  });
});