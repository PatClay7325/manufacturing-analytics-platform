import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/test-utils/setup-integration';

describe('Database Integration Tests', () => {
  describe('Equipment Operations', () => {
    it('should create and retrieve equipment', async () => {
      // Create equipment
      const equipment = await prisma.equipment.create({
        data: {
          name: 'CNC Machine 1',
          type: 'CNC',
          manufacturerCode: 'HAAS-001',
          serialNumber: 'SN12345',
          status: 'operational',
          location: 'Building A',
        },
      });

      expect(equipment.id).toBeDefined();
      expect(equipment.name).toBe('CNC Machine 1');

      // Retrieve equipment
      const found = await prisma.equipment.findUnique({
        where: { id: equipment.id },
      });

      expect(found).toMatchObject({
        name: 'CNC Machine 1',
        type: 'CNC',
        status: 'operational',
      });
    });

    it('should update equipment status', async () => {
      const equipment = await createTestEquipment();

      const updated = await prisma.equipment.update({
        where: { id: equipment.id },
        data: { status: 'maintenance' },
      });

      expect(updated.status).toBe('maintenance');
    });

    it('should cascade delete related records', async () => {
      const equipment = await createTestEquipment();

      // Create related alert
      const alert = await prisma.alert.create({
        data: {
          equipmentId: equipment.id,
          alertType: 'maintenance',
          severity: 'medium',
          message: 'Test alert',
          status: 'active',
        },
      });

      // Delete equipment
      await prisma.equipment.delete({
        where: { id: equipment.id },
      });

      // Alert should be deleted too
      const foundAlert = await prisma.alert.findUnique({
        where: { id: alert.id },
      });

      expect(foundAlert).toBeNull();
    });
  });

  describe('Performance Metrics Operations', () => {
    it('should create and aggregate performance metrics', async () => {
      const equipment = await createTestEquipment();

      // Create multiple metrics
      const metrics = [];
      for (let i = 0; i < 10; i++) {
        metrics.push({
          equipmentId: equipment.id,
          timestamp: new Date(Date.now() - i * 60 * 60 * 1000), // Hourly data
          availability: 0.85 + Math.random() * 0.1,
          performance: 0.8 + Math.random() * 0.15,
          quality: 0.95 + Math.random() * 0.05,
          oeeScore: 0.75 + Math.random() * 0.2,
        });
      }

      await prisma.performanceMetric.createMany({
        data: metrics,
      });

      // Test aggregation
      const avgOEE = await prisma.performanceMetric.aggregate({
        where: { equipmentId: equipment.id },
        _avg: { oeeScore: true },
        _max: { oeeScore: true },
        _min: { oeeScore: true },
      });

      expect(avgOEE._avg.oeeScore).toBeGreaterThan(0.7);
      expect(avgOEE._avg.oeeScore).toBeLessThan(1);
      expect(avgOEE._max.oeeScore).toBeGreaterThan(avgOEE._avg.oeeScore!);
      expect(avgOEE._min.oeeScore).toBeLessThan(avgOEE._avg.oeeScore!);
    });

    it('should query metrics by time range', async () => {
      const equipment = await createTestEquipment();
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // Create metrics at different times
      await prisma.performanceMetric.create({
        data: {
          equipmentId: equipment.id,
          timestamp: now,
          oeeScore: 0.85,
          availability: 0.9,
          performance: 0.9,
          quality: 0.95,
        },
      });

      await prisma.performanceMetric.create({
        data: {
          equipmentId: equipment.id,
          timestamp: yesterday,
          oeeScore: 0.80,
          availability: 0.85,
          performance: 0.85,
          quality: 0.95,
        },
      });

      await prisma.performanceMetric.create({
        data: {
          equipmentId: equipment.id,
          timestamp: twoDaysAgo,
          oeeScore: 0.75,
          availability: 0.8,
          performance: 0.8,
          quality: 0.95,
        },
      });

      // Query last 24 hours
      const recentMetrics = await prisma.performanceMetric.findMany({
        where: {
          equipmentId: equipment.id,
          timestamp: {
            gte: yesterday,
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(recentMetrics).toHaveLength(2);
      expect(recentMetrics[0].oeeScore).toBe(0.85);
    });
  });

  describe('Alert Management', () => {
    it('should create and update alert status', async () => {
      const equipment = await createTestEquipment();

      const alert = await prisma.alert.create({
        data: {
          equipmentId: equipment.id,
          alertType: 'performance',
          severity: 'high',
          message: 'OEE below threshold',
          status: 'active',
        },
      });

      // Acknowledge alert
      const acknowledged = await prisma.alert.update({
        where: { id: alert.id },
        data: {
          status: 'acknowledged',
          acknowledgedBy: 'test-user',
          acknowledgedAt: new Date(),
        },
      });

      expect(acknowledged.status).toBe('acknowledged');
      expect(acknowledged.acknowledgedBy).toBe('test-user');
      expect(acknowledged.acknowledgedAt).toBeDefined();
    });

    it('should query active alerts with equipment details', async () => {
      const equipment1 = await createTestEquipment({ name: 'Machine 1' });
      const equipment2 = await createTestEquipment({ name: 'Machine 2' });

      // Create alerts
      await prisma.alert.createMany({
        data: [
          {
            equipmentId: equipment1.id,
            alertType: 'maintenance',
            severity: 'high',
            message: 'Maintenance required',
            status: 'active',
          },
          {
            equipmentId: equipment2.id,
            alertType: 'quality',
            severity: 'medium',
            message: 'Quality deviation',
            status: 'active',
          },
          {
            equipmentId: equipment1.id,
            alertType: 'performance',
            severity: 'low',
            message: 'Performance degradation',
            status: 'resolved',
          },
        ],
      });

      // Query active alerts with equipment
      const activeAlerts = await prisma.alert.findMany({
        where: { status: 'active' },
        include: { equipment: true },
        orderBy: { severity: 'desc' },
      });

      expect(activeAlerts).toHaveLength(2);
      expect(activeAlerts[0].severity).toBe('high');
      expect(activeAlerts[0].equipment.name).toBe('Machine 1');
      expect(activeAlerts[1].equipment.name).toBe('Machine 2');
    });
  });

  describe('Production Line Operations', () => {
    it('should create production line with equipment relationships', async () => {
      const equipment1 = await createTestEquipment({ name: 'Machine 1' });
      const equipment2 = await createTestEquipment({ name: 'Machine 2' });

      const productionLine = await prisma.productionLine.create({
        data: {
          name: 'Assembly Line 1',
          department: 'Assembly',
          status: 'active',
          equipment: {
            connect: [{ id: equipment1.id }, { id: equipment2.id }],
          },
        },
        include: {
          equipment: true,
        },
      });

      expect(productionLine.equipment).toHaveLength(2);
      expect(productionLine.equipment.map(e => e.name)).toContain('Machine 1');
      expect(productionLine.equipment.map(e => e.name)).toContain('Machine 2');
    });

    it('should handle production orders workflow', async () => {
      const productionLine = await prisma.productionLine.create({
        data: {
          name: 'Test Line',
          department: 'Manufacturing',
          status: 'active',
        },
      });

      // Create production order
      const order = await prisma.productionOrder.create({
        data: {
          orderNumber: 'PO-TEST-001',
          productionLineId: productionLine.id,
          product: 'Test Product',
          quantity: 1000,
          targetStartDate: new Date(),
          targetEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'scheduled',
          priority: 1,
        },
      });

      // Start production
      const startedOrder = await prisma.productionOrder.update({
        where: { id: order.id },
        data: {
          status: 'in-progress',
          actualStartDate: new Date(),
        },
      });

      expect(startedOrder.status).toBe('in-progress');
      expect(startedOrder.actualStartDate).toBeDefined();

      // Complete production
      const completedOrder = await prisma.productionOrder.update({
        where: { id: order.id },
        data: {
          status: 'completed',
          actualEndDate: new Date(),
        },
      });

      expect(completedOrder.status).toBe('completed');
      expect(completedOrder.actualEndDate).toBeDefined();
    });
  });

  describe('Complex Queries', () => {
    it('should calculate OEE trends by equipment', async () => {
      const equipment1 = await createTestEquipment({ name: 'Machine 1' });
      const equipment2 = await createTestEquipment({ name: 'Machine 2' });

      // Create metrics for both equipment
      const baseTime = new Date();
      const metrics = [];

      for (let i = 0; i < 7; i++) {
        metrics.push(
          {
            equipmentId: equipment1.id,
            timestamp: new Date(baseTime.getTime() - i * 24 * 60 * 60 * 1000),
            oeeScore: 0.80 + (i * 0.01), // Trending up
            availability: 0.85,
            performance: 0.85,
            quality: 0.95,
          },
          {
            equipmentId: equipment2.id,
            timestamp: new Date(baseTime.getTime() - i * 24 * 60 * 60 * 1000),
            oeeScore: 0.85 - (i * 0.01), // Trending down
            availability: 0.90,
            performance: 0.90,
            quality: 0.95,
          }
        );
      }

      await prisma.performanceMetric.createMany({ data: metrics });

      // Query with grouping
      const results = await prisma.$queryRaw`
        SELECT 
          e.name,
          AVG(pm."oeeScore") as avg_oee,
          MAX(pm."oeeScore") as max_oee,
          MIN(pm."oeeScore") as min_oee,
          COUNT(*)::int as metric_count
        FROM "PerformanceMetric" pm
        JOIN "Equipment" e ON pm."equipmentId" = e.id
        WHERE pm.timestamp >= ${new Date(baseTime.getTime() - 7 * 24 * 60 * 60 * 1000)}
        GROUP BY e.id, e.name
        ORDER BY avg_oee DESC
      `;

      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Machine 2'); // Higher average OEE
      expect(results[0].metric_count).toBe(7);
    });

    it('should handle time-series data for Grafana-style queries', async () => {
      const equipment = await createTestEquipment();

      // Create time-series metrics
      const metrics = [];
      const now = new Date();

      for (let i = 0; i < 24; i++) {
        await prisma.metric.create({
          data: {
            timestamp: new Date(now.getTime() - i * 60 * 60 * 1000),
            name: 'temperature',
            value: 65 + Math.random() * 10,
            unit: '°C',
            tags: { equipmentId: equipment.id, location: 'Building A' },
            metadata: { sensor: 'TEMP-001' },
            equipmentId: equipment.id,
          },
        });
      }

      // Query time-series data
      const timeSeries = await prisma.metric.findMany({
        where: {
          equipmentId: equipment.id,
          name: 'temperature',
          timestamp: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { timestamp: 'asc' },
      });

      expect(timeSeries).toHaveLength(24);
      
      // Verify data structure for Grafana compatibility
      timeSeries.forEach(point => {
        expect(point).toHaveProperty('timestamp');
        expect(point).toHaveProperty('value');
        expect(point).toHaveProperty('tags');
        expect(point.tags).toHaveProperty('equipmentId');
      });
    });
  });
});