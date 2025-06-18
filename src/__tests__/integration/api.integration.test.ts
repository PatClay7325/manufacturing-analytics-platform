import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/test-utils/setup-integration';

describe('API Integration Tests', () => {
  describe('Database API Operations', () => {
    it('should perform equipment CRUD operations', async () => {
      // Create
      const equipment = await prisma.equipment.create({
        data: {
          name: 'API Test Machine',
          type: 'CNC',
          manufacturerCode: 'API-001',
          serialNumber: 'SN-API-001',
          status: 'operational',
          installationDate: new Date(),
        },
      });

      expect(equipment.id).toBeDefined();
      expect(equipment.name).toBe('API Test Machine');

      // Read
      const found = await prisma.equipment.findUnique({
        where: { id: equipment.id },
      });
      expect(found).toBeDefined();
      expect(found?.name).toBe('API Test Machine');

      // Update
      const updated = await prisma.equipment.update({
        where: { id: equipment.id },
        data: { status: 'maintenance' },
      });
      expect(updated.status).toBe('maintenance');

      // List
      const list = await prisma.equipment.findMany({
        where: { status: 'maintenance' },
      });
      expect(list).toHaveLength(1);

      // Delete
      await prisma.equipment.delete({
        where: { id: equipment.id },
      });

      const deleted = await prisma.equipment.findUnique({
        where: { id: equipment.id },
      });
      expect(deleted).toBeNull();
    });

    it('should handle alert operations with equipment relationship', async () => {
      const equipment = await createTestEquipment();

      // Create alert
      const alert = await prisma.alert.create({
        data: {
          equipmentId: equipment.id,
          alertType: 'maintenance',
          severity: 'high',
          message: 'Urgent maintenance required',
          status: 'active',
        },
      });

      expect(alert.equipmentId).toBe(equipment.id);

      // Query alerts by equipment
      const equipmentAlerts = await prisma.alert.findMany({
        where: { equipmentId: equipment.id },
        include: { equipment: true },
      });

      expect(equipmentAlerts).toHaveLength(1);
      expect(equipmentAlerts[0].equipment.name).toBe(equipment.name);

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
    });

    it('should handle metrics ingestion and querying', async () => {
      const equipment = await createTestEquipment();
      const now = new Date();

      // Ingest multiple metrics
      const metrics = [];
      for (let i = 0; i < 10; i++) {
        metrics.push({
          equipmentId: equipment.id,
          name: 'temperature',
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
          equipmentId: equipment.id,
          name: 'temperature',
          timestamp: {
            gte: new Date(now.getTime() - 30 * 60 * 1000),
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(recentMetrics.length).toBeGreaterThan(0);
      expect(recentMetrics[0].name).toBe('temperature');

      // Aggregate metrics
      const avgTemp = await prisma.metric.aggregate({
        where: {
          equipmentId: equipment.id,
          name: 'temperature',
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
      // Create production line
      const line = await prisma.productionLine.create({
        data: {
          name: 'API Test Line',
          department: 'Manufacturing',
          status: 'active',
        },
      });

      // Create equipment for the line
      const equipment1 = await createTestEquipment({ 
        name: 'Line Machine 1',
      });
      const equipment2 = await createTestEquipment({ 
        name: 'Line Machine 2',
      });
      
      // Associate equipment with production line
      await prisma.productionLine.update({
        where: { id: line.id },
        data: {
          equipment: {
            connect: [{ id: equipment1.id }, { id: equipment2.id }],
          },
        },
      });

      // Create production order
      const order = await prisma.productionOrder.create({
        data: {
          orderNumber: 'PO-API-001',
          productionLineId: line.id,
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
          status: 'in-progress',
          actualStartDate: new Date(),
        },
      });

      // Create performance metrics
      const perfMetrics = [];
      for (const eq of [equipment1, equipment2]) {
        perfMetrics.push({
          equipmentId: eq.id,
          timestamp: new Date(),
          oeeScore: 0.85,
          availability: 0.90,
          performance: 0.90,
          quality: 0.95,
          totalParts: 500,
          goodParts: 490,
        });
      }
      await prisma.performanceMetric.createMany({ data: perfMetrics });

      // Create quality check
      await prisma.qualityCheck.create({
        data: {
          productionOrderId: order.id,
          checkType: 'in-process',
          inspector: 'QC Tech',
          timestamp: new Date(),
          result: 'pass',
          measurements: {
            dimension1: 10.05,
            dimension2: 20.02,
          },
        },
      });

      // Complete order
      const completed = await prisma.productionOrder.update({
        where: { id: order.id },
        data: {
          status: 'completed',
          actualEndDate: new Date(),
        },
        include: {
          productionLine: {
            include: { equipment: true },
          },
          qualityChecks: true,
        },
      });

      expect(completed.status).toBe('completed');
      expect(completed.productionLine.equipment).toHaveLength(2);
      expect(completed.qualityChecks).toHaveLength(1);
    });
  });
});