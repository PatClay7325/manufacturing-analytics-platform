import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/test-utils/setup-integration';

describe('API Integration Tests', () => {
  describe('Database API Operations', () => {
    it('should perform workUnit CRUD operations', async () => {
      // Create hierarchy first
      const { workCenter, workUnit: testUnit } = await createTestHierarchy();

      // Create
      const workUnit = await prisma.workUnit.create({
        data: {
          id: `wu-api-${Date.now()}`,
          name: 'API Test Machine',
          code: 'API-001',
          equipmentType: 'CNC',
          manufacturerCode: 'MFG-API-001',
          model: 'Model X',
          serialNumber: 'SN-API-001',
          status: 'OPERATIONAL',
          installationDate: new Date(),
          updatedAt: new Date(),
          workCenterId: workCenter.id,
        },
      });

      expect(workUnit.id).toBeDefined();
      expect(workUnit.name).toBe('API Test Machine');

      // Read
      const found = await prisma.workUnit.findUnique({
        where: { id: workUnit.id },
      });
      expect(found).toBeDefined();
      expect(found?.name).toBe('API Test Machine');

      // Update
      const updated = await prisma.workUnit.update({
        where: { id: workUnit.id },
        data: { status: 'MAINTENANCE' },
      });
      expect(updated.status).toBe('MAINTENANCE');

      // List
      const list = await prisma.workUnit.findMany({
        where: { status: 'MAINTENANCE' },
      });
      expect(list).toHaveLength(1);

      // Delete
      await prisma.workUnit.delete({
        where: { id: workUnit.id },
      });

      const deleted = await prisma.workUnit.findUnique({
        where: { id: workUnit.id },
      });
      expect(deleted).toBeNull();
    });

    it('should handle alert operations with workUnit relationship', async () => {
      const { workUnit } = await createTestHierarchy();

      // Create alert
      const alert = await prisma.alert.create({
        data: {
          workUnitId: workUnit.id,
          alertType: 'MAINTENANCE',
          severity: 'HIGH',
          message: 'Urgent maintenance required',
          status: 'ACTIVE',
        },
      });

      expect(alert.workUnitId).toBe(workUnit.id);

      // Query alerts by workUnit
      const workUnitAlerts = await prisma.alert.findMany({
        where: { workUnitId: workUnit.id },
        include: { WorkUnit: true },
      });

      expect(workUnitAlerts).toHaveLength(1);
      expect(workUnitAlerts[0].WorkUnit.name).toBe(workUnit.name);

      // Update alert status
      await prisma.alert.update({
        where: { id: alert.id },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedBy: 'test-user',
          acknowledgedAt: new Date(),
        },
      });

      const acknowledged = await prisma.alert.findUnique({
        where: { id: alert.id },
      });
      expect(acknowledged?.status).toBe('ACKNOWLEDGED');
    });

    it('should handle metrics ingestion and querying', async () => {
      const { workUnit } = await createTestHierarchy();
      const now = new Date();

      // Ingest multiple metrics
      const metrics = [];
      for (let i = 0; i < 10; i++) {
        metrics.push({
          id: `metric-${Date.now()}-${i}`,
          workUnitId: workUnit.id,
          name: 'TEMPERATURE',
          value: 65 + Math.random() * 10,
          unit: '°C',
          timestamp: new Date(now.getTime() - i * 60 * 1000),
          tags: { sensor: 'TEMP-001' },
        });
      }

      await prisma.metric.createMany({ data: metrics });

      // Query metrics
      const recentMetrics = await prisma.metric.findMany({
        where: {
          workUnitId: workUnit.id,
          name: 'TEMPERATURE',
          timestamp: {
            gte: new Date(now.getTime() - 30 * 60 * 1000),
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(recentMetrics.length).toBeGreaterThan(0);
      expect(recentMetrics[0].name).toBe('TEMPERATURE');

      // Aggregate metrics
      const avgTemp = await prisma.metric.aggregate({
        where: {
          workUnitId: workUnit.id,
          name: 'TEMPERATURE',
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
      // Create hierarchy with multiple work units
      const { enterprise, site, area, workCenter } = await createTestHierarchy();
      
      // Create work units for the work center
      const workUnit1 = await createTestWorkUnit(workCenter.id, { 
        name: 'Line Machine 1',
        code: 'LM-001',
      });
      const workUnit2 = await createTestWorkUnit(workCenter.id, { 
        name: 'Line Machine 2',
        code: 'LM-002',
      });

      // Create production order
      const order = await prisma.productionOrder.create({
        data: {
          orderNumber: 'PO-API-001',
          workCenterId: workCenter.id,
          product: 'Test Product',
          quantity: 1000,
          targetStartDate: new Date(),
          targetEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'SCHEDULED',
          priority: 1,
        },
      });

      // Start production
      await prisma.productionOrder.update({
        where: { id: order.id },
        data: {
          status: 'IN_PROGRESS',
          actualStartDate: new Date(),
        },
      });

      // Create performance metrics
      const perfMetrics = [];
      for (const wu of [workUnit1, workUnit2]) {
        perfMetrics.push({
          id: `perf-${Date.now()}-${wu.id}`,
          workUnitId: wu.id,
          timestamp: new Date(),
          availability: 95,
          performance: 88,
          quality: 99,
          oeeScore: (0.95 * 0.88 * 0.99),
        });
      }

      await prisma.performanceMetric.createMany({ data: perfMetrics });

      // Query production order with metrics
      const orderWithMetrics = await prisma.productionOrder.findUnique({
        where: { id: order.id },
        include: {
          WorkCenter: {
            include: {
              WorkUnit: {
                include: {
                  PerformanceMetric: {
                    orderBy: { timestamp: 'desc' },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      });

      expect(orderWithMetrics).toBeDefined();
      expect(orderWithMetrics?.WorkCenter.WorkUnit).toHaveLength(3); // Including the one from createTestHierarchy
      
      // Complete production
      await prisma.productionOrder.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          actualEndDate: new Date(),
        },
      });

      const completed = await prisma.productionOrder.findUnique({
        where: { id: order.id },
      });
      expect(completed?.status).toBe('COMPLETED');
      expect(completed?.actualEndDate).toBeDefined();
    });
  });
});