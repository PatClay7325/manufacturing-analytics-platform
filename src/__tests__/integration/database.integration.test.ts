import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/test-utils/setup-integration';

describe('Database Integration Tests', () => {
  describe('WorkUnit Operations', () => {
    it('should create and retrieve equipment', async () => {
      // Create hierarchy first
      const { workCenter } = await createTestHierarchy();

      // Create work unit
      const workUnit = await prisma.workUnit.create({
        data: {
          id: `wu-db-${Date.now()}`,
          name: 'CNC Machine 1',
          code: 'CNC-001',
          equipmentType: 'CNC',
          manufacturerCode: 'HAAS-001',
          serialNumber: 'SN12345',
          model: 'HAAS VF-2',
          status: 'OPERATIONAL',
          location: 'Building A',
          installationDate: new Date(),
          updatedAt: new Date(),
          workCenterId: workCenter.id,
        },
      });

      expect(workUnit.id).toBeDefined();
      expect(workUnit.name).toBe('CNC Machine 1');

      // Retrieve work unit
      const found = await prisma.workUnit.findUnique({
        where: { id: workUnit.id },
      });

      expect(found).toMatchObject({
        name: 'CNC Machine 1',
        equipmentType: 'CNC',
        status: 'OPERATIONAL',
      });
    });

    it('should update equipment status', async () => {
      const { workUnit } = await createTestHierarchy();

      const updated = await prisma.workUnit.update({
        where: { id: workUnit.id },
        data: { status: 'MAINTENANCE' },
      });

      expect(updated.status).toBe('MAINTENANCE');
    });

    it('should handle work unit deletion with alerts', async () => {
      const { workUnit } = await createTestHierarchy();

      // Create related alert
      const alert = await prisma.alert.create({
        data: {
          workUnitId: workUnit.id,
          alertType: 'MAINTENANCE',
          severity: 'MEDIUM',
          message: 'Test alert',
          status: 'ACTIVE',
        },
      });

      // Delete related alerts first
      await prisma.alert.deleteMany({
        where: { workUnitId: workUnit.id },
      });

      // Then delete work unit
      await prisma.workUnit.delete({
        where: { id: workUnit.id },
      });

      // Verify both are gone
      const foundAlert = await prisma.alert.findUnique({
        where: { id: alert.id },
      });
      const foundWorkUnit = await prisma.workUnit.findUnique({
        where: { id: workUnit.id },
      });

      expect(foundAlert).toBeNull();
      expect(foundWorkUnit).toBeNull();
    });
  });

  describe('Performance Metrics Operations', () => {
    it('should create and aggregate performance metrics', async () => {
      const { workUnit } = await createTestHierarchy();

      // Create multiple metrics
      const metrics = [];
      for (let i = 0; i < 10; i++) {
        metrics.push({
          workUnitId: workUnit.id,
          timestamp: new Date(Date.now() - i * 60 * 60 * 1000), // Hourly data
          availability: 85 + Math.random() * 10,
          performance: 80 + Math.random() * 15,
          quality: 95 + Math.random() * 5,
          oeeScore: 0.75 + Math.random() * 0.2,
        });
      }

      await prisma.performanceMetric.createMany({
        data: metrics,
      });

      // Test aggregation
      const avgOEE = await prisma.performanceMetric.aggregate({
        where: { workUnitId: workUnit.id },
        _avg: { oeeScore: true },
        _max: { oeeScore: true },
        _min: { oeeScore: true },
      });

      expect(avgOEE._avg.oeeScore).toBeGreaterThan(0.7);
      expect(avgOEE._max.oeeScore).toBeGreaterThan(avgOEE._avg.oeeScore!);
      expect(avgOEE._min.oeeScore).toBeLessThan(avgOEE._avg.oeeScore!);
    });

    it('should query metrics by time range', async () => {
      const { workUnit } = await createTestHierarchy();
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Create metrics at different times
      await prisma.performanceMetric.createMany({
        data: [
          {
            workUnitId: workUnit.id,
            timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
            oeeScore: 0.85,
          },
          {
            workUnitId: workUnit.id,
            timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000), // 2 days ago
            oeeScore: 0.75,
          },
        ],
      });

      // Query last 24 hours
      const recentMetrics = await prisma.performanceMetric.findMany({
        where: {
          workUnitId: workUnit.id,
          timestamp: {
            gte: oneDayAgo,
          },
        },
      });

      expect(recentMetrics).toHaveLength(1);
      expect(recentMetrics[0].oeeScore).toBe(0.85);
    });
  });

  describe('Alert Management', () => {
    it('should create and update alert status', async () => {
      const { workUnit } = await createTestHierarchy();

      // Create alert
      const alert = await prisma.alert.create({
        data: {
          workUnitId: workUnit.id,
          alertType: 'QUALITY',
          severity: 'HIGH',
          message: 'Quality threshold exceeded',
          status: 'ACTIVE',
        },
      });

      expect(alert.id).toBeDefined();
      expect(alert.status).toBe('ACTIVE');

      // Update alert
      const updated = await prisma.alert.update({
        where: { id: alert.id },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedBy: 'operator1',
          acknowledgedAt: new Date(),
        },
      });

      expect(updated.status).toBe('ACKNOWLEDGED');
      expect(updated.acknowledgedBy).toBe('operator1');
    });

    it('should query active alerts with equipment details', async () => {
      const { workUnit } = await createTestHierarchy();

      // Create multiple alerts
      await prisma.alert.createMany({
        data: [
          {
            workUnitId: workUnit.id,
            alertType: 'MAINTENANCE',
            severity: 'HIGH',
            message: 'Maintenance required',
            status: 'ACTIVE',
          },
          {
            workUnitId: workUnit.id,
            alertType: 'PERFORMANCE',
            severity: 'MEDIUM',
            message: 'Performance degradation',
            status: 'RESOLVED',
          },
        ],
      });

      // Query active alerts with equipment
      const activeAlerts = await prisma.alert.findMany({
        where: { status: 'ACTIVE' },
        include: {
          WorkUnit: true,
        },
      });

      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].WorkUnit.name).toBe(workUnit.name);
    });
  });

  describe('Production Operations', () => {
    it('should create production workflow with work center', async () => {
      const { workCenter, workUnit } = await createTestHierarchy();

      // Create additional work units
      const workUnit2 = await createTestWorkUnit(workCenter.id, {
        name: 'Assembly Station 1',
        code: 'AS-001',
      });

      // Create production order
      const order = await prisma.productionOrder.create({
        data: {
          orderNumber: 'PO-DB-001',
          workCenterId: workCenter.id,
          product: 'Product X',
          quantity: 1000,
          targetStartDate: new Date(),
          targetEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'SCHEDULED',
          priority: 1,
        },
      });

      // Query work center with units
      const wcWithUnits = await prisma.workCenter.findUnique({
        where: { id: workCenter.id },
        include: {
          WorkUnit: true,
          ProductionOrder: true,
        },
      });

      expect(wcWithUnits?.WorkUnit).toHaveLength(2);
      expect(wcWithUnits?.ProductionOrder).toHaveLength(1);
    });

    it('should handle production orders workflow', async () => {
      const { workCenter } = await createTestHierarchy();

      // Create order
      const order = await prisma.productionOrder.create({
        data: {
          orderNumber: 'PO-WF-001',
          workCenterId: workCenter.id,
          product: 'Widget A',
          quantity: 500,
          targetStartDate: new Date(),
          targetEndDate: new Date(Date.now() + 8 * 60 * 60 * 1000),
          status: 'SCHEDULED',
          priority: 2,
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

      // Complete production
      const completed = await prisma.productionOrder.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          actualEndDate: new Date(),
        },
      });

      expect(completed.status).toBe('COMPLETED');
      expect(completed.actualStartDate).toBeDefined();
      expect(completed.actualEndDate).toBeDefined();
    });
  });

  describe('Complex Queries', () => {
    it('should calculate OEE trends by equipment', async () => {
      const { workUnit } = await createTestHierarchy();

      // Create performance data over multiple days
      const days = 7;
      const metricsData = [];
      
      for (let day = 0; day < days; day++) {
        for (let hour = 0; hour < 24; hour += 4) { // Every 4 hours
          metricsData.push({
            workUnitId: workUnit.id,
            timestamp: new Date(Date.now() - (day * 24 + hour) * 60 * 60 * 1000),
            availability: 80 + Math.random() * 15,
            performance: 75 + Math.random() * 20,
            quality: 90 + Math.random() * 10,
            oeeScore: 0.65 + Math.random() * 0.25,
          });
        }
      }

      await prisma.performanceMetric.createMany({
        data: metricsData,
      });

      // Calculate daily averages
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const metrics = await prisma.performanceMetric.findMany({
        where: {
          workUnitId: workUnit.id,
          timestamp: {
            gte: sevenDaysAgo,
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      expect(metrics.length).toBeGreaterThan(0);
      
      // Group by day and calculate averages
      const dailyAverages = metrics.reduce((acc, metric) => {
        const day = metric.timestamp.toISOString().split('T')[0];
        if (!acc[day]) {
          acc[day] = { count: 0, totalOEE: 0 };
        }
        acc[day].count++;
        acc[day].totalOEE += metric.oeeScore || 0;
        return acc;
      }, {} as Record<string, { count: number; totalOEE: number }>);

      const averages = Object.entries(dailyAverages).map(([day, data]) => ({
        day,
        avgOEE: data.totalOEE / data.count,
      }));

      expect(averages.length).toBeGreaterThan(0);
      averages.forEach(avg => {
        expect(avg.avgOEE).toBeGreaterThan(0.6);
        expect(avg.avgOEE).toBeLessThan(0.9);
      });
    });

    it('should handle time-series data for Analytics queries', async () => {
      const { workUnit } = await createTestHierarchy();
      const now = new Date();

      // Create time-series metrics
      const metricsData = [];
      for (let i = 0; i < 60; i++) { // Last 60 minutes
        metricsData.push({
          id: `metric-ts-${Date.now()}-${i}`,
          workUnitId: workUnit.id,
          name: 'TEMPERATURE',
          value: 65 + Math.sin(i / 10) * 10 + Math.random() * 2,
          unit: '°C',
          timestamp: new Date(now.getTime() - i * 60 * 1000),
        });
      }

      await prisma.metric.createMany({
        data: metricsData,
      });

      // Query with time range and aggregation
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      
      const timeSeries = await prisma.metric.findMany({
        where: {
          workUnitId: workUnit.id,
          name: 'TEMPERATURE',
          timestamp: {
            gte: oneHourAgo,
            lte: now,
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      expect(timeSeries).toHaveLength(60);

      // Calculate 5-minute averages
      const fiveMinBuckets: Record<string, number[]> = {};
      
      timeSeries.forEach(metric => {
        const bucket = Math.floor(metric.timestamp.getTime() / (5 * 60 * 1000));
        if (!fiveMinBuckets[bucket]) {
          fiveMinBuckets[bucket] = [];
        }
        fiveMinBuckets[bucket].push(metric.value);
      });

      const bucketAverages = Object.entries(fiveMinBuckets).map(([bucket, values]) => ({
        timestamp: new Date(parseInt(bucket) * 5 * 60 * 1000),
        avgValue: values.reduce((sum, val) => sum + val, 0) / values.length,
      }));

      expect(bucketAverages.length).toBeGreaterThan(0);
      bucketAverages.forEach(bucket => {
        expect(bucket.avgValue).toBeGreaterThan(55);
        expect(bucket.avgValue).toBeLessThan(80);
      });
    });
  });
});