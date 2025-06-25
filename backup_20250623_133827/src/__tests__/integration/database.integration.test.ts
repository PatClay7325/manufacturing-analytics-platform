import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';

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

describe('Database Integration Tests', () => {
  describe('Equipment Operations', () => {
    it('should create and retrieve performance metrics with equipment identifiers', async () => {
      // Create hierarchy first
      const { equipmentIdentifiers } = await createTestHierarchy();

      // Create performance metric with equipment identifiers
      const performanceMetric = await prisma.performanceMetric.create({
        data: {
          id: `pm-db-${Date.now()}`,
          equipmentId: equipmentIdentifiers.equipmentId,
          assetTag: equipmentIdentifiers.assetTag,
          plantCode: equipmentIdentifiers.plantCode,
          workCenterId: equipmentIdentifiers.workCenterId,
          machineName: 'CNC Machine 1',
          oeeScore: 0.85,
          availability: 90.5,
          performance: 88.2,
          quality: 96.8,
          timestamp: new Date(),
        },
      });

      expect(performanceMetric.id).toBeDefined();
      expect(performanceMetric.equipmentId).toBe(equipmentIdentifiers.equipmentId);

      // Retrieve performance metric
      const found = await prisma.performanceMetric.findUnique({
        where: { id: performanceMetric.id },
      });

      expect(found).toMatchObject({
        equipmentId: equipmentIdentifiers.equipmentId,
        assetTag: equipmentIdentifiers.assetTag,
        plantCode: equipmentIdentifiers.plantCode,
        oeeScore: 0.85,
      });
    });

    it('should update equipment maintenance record', async () => {
      const { equipmentIdentifiers } = await createTestHierarchy();

      const maintenanceRecord = await prisma.maintenanceRecord.create({
        data: {
          equipmentId: equipmentIdentifiers.equipmentId,
          assetTag: equipmentIdentifiers.assetTag,
          plantCode: equipmentIdentifiers.plantCode,
          maintenanceType: 'preventive',
          description: 'Scheduled maintenance',
          technician: 'tech001',
          startTime: new Date(),
          status: 'scheduled',
        },
      });

      const updated = await prisma.maintenanceRecord.update({
        where: { id: maintenanceRecord.id },
        data: { status: 'completed' },
      });

      expect(updated.status).toBe('completed');
    });

    it('should handle equipment alerts with proper hierarchy', async () => {
      const { equipmentIdentifiers } = await createTestHierarchy();

      // Create related alert
      const alert = await prisma.alert.create({
        data: {
          equipmentId: equipmentIdentifiers.equipmentId,
          assetTag: equipmentIdentifiers.assetTag,
          plantCode: equipmentIdentifiers.plantCode,
          alertType: 'maintenance',
          severity: 'medium',
          priority: 'high',
          title: 'Maintenance Required',
          message: 'Test alert for maintenance',
          status: 'active',
        },
      });

      // Update alert status
      await prisma.alert.update({
        where: { id: alert.id },
        data: { status: 'resolved' },
      });

      // Verify alert was updated
      const foundAlert = await prisma.alert.findUnique({
        where: { id: alert.id },
      });

      expect(foundAlert?.status).toBe('resolved');
      expect(foundAlert?.equipmentId).toBe(equipmentIdentifiers.equipmentId);
    });
  });

  describe('Performance Metrics Operations', () => {
    it('should create and aggregate performance metrics', async () => {
      const { equipmentIdentifiers } = await createTestHierarchy();

      // Create multiple metrics
      const metrics = [];
      for (let i = 0; i < 10; i++) {
        metrics.push({
          equipmentId: equipmentIdentifiers.equipmentId,
          assetTag: equipmentIdentifiers.assetTag,
          plantCode: equipmentIdentifiers.plantCode,
          workCenterId: equipmentIdentifiers.workCenterId,
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
        where: { equipmentId: equipmentIdentifiers.equipmentId },
        _avg: { oeeScore: true },
        _max: { oeeScore: true },
        _min: { oeeScore: true },
      });

      expect(avgOEE._avg.oeeScore).toBeGreaterThan(0.7);
      expect(avgOEE._max.oeeScore).toBeGreaterThan(avgOEE._avg.oeeScore!);
      expect(avgOEE._min.oeeScore).toBeLessThan(avgOEE._avg.oeeScore!);
    });

    it('should query metrics by time range', async () => {
      const { equipmentIdentifiers } = await createTestHierarchy();
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Create metrics at different times
      await prisma.performanceMetric.createMany({
        data: [
          {
            equipmentId: equipmentIdentifiers.equipmentId,
            assetTag: equipmentIdentifiers.assetTag,
            plantCode: equipmentIdentifiers.plantCode,
            timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
            oeeScore: 0.85,
          },
          {
            equipmentId: equipmentIdentifiers.equipmentId,
            assetTag: equipmentIdentifiers.assetTag,
            plantCode: equipmentIdentifiers.plantCode,
            timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000), // 2 days ago
            oeeScore: 0.75,
          },
        ],
      });

      // Query last 24 hours
      const recentMetrics = await prisma.performanceMetric.findMany({
        where: {
          equipmentId: equipmentIdentifiers.equipmentId,
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
      const { equipmentIdentifiers } = await createTestHierarchy();

      // Create alert
      const alert = await prisma.alert.create({
        data: {
          equipmentId: equipmentIdentifiers.equipmentId,
          assetTag: equipmentIdentifiers.assetTag,
          plantCode: equipmentIdentifiers.plantCode,
          alertType: 'quality',
          severity: 'high',
          priority: 'urgent',
          title: 'Quality Alert',
          message: 'Quality threshold exceeded',
          status: 'active',
        },
      });

      expect(alert.id).toBeDefined();
      expect(alert.status).toBe('active');

      // Update alert
      const updated = await prisma.alert.update({
        where: { id: alert.id },
        data: {
          status: 'acknowledged',
          acknowledgedBy: 'operator1',
          acknowledgedAt: new Date(),
        },
      });

      expect(updated.status).toBe('acknowledged');
      expect(updated.acknowledgedBy).toBe('operator1');
    });

    it('should query active alerts with equipment details', async () => {
      const { equipmentIdentifiers } = await createTestHierarchy();

      // Create multiple alerts
      await prisma.alert.createMany({
        data: [
          {
            equipmentId: equipmentIdentifiers.equipmentId,
            assetTag: equipmentIdentifiers.assetTag,
            plantCode: equipmentIdentifiers.plantCode,
            alertType: 'maintenance',
            severity: 'high',
            priority: 'high',
            title: 'Maintenance Required',
            message: 'Maintenance required',
            status: 'active',
          },
          {
            equipmentId: equipmentIdentifiers.equipmentId,
            assetTag: equipmentIdentifiers.assetTag,
            plantCode: equipmentIdentifiers.plantCode,
            alertType: 'equipment',
            severity: 'medium',
            priority: 'medium',
            title: 'Performance Issue',
            message: 'Performance degradation',
            status: 'resolved',
          },
        ],
      });

      // Query active alerts for this specific equipment
      const activeAlerts = await prisma.alert.findMany({
        where: { 
          status: 'active',
          equipmentId: equipmentIdentifiers.equipmentId,
        },
      });

      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].equipmentId).toBe(equipmentIdentifiers.equipmentId);
    });
  });

  describe('Production Operations', () => {
    it('should create production workflow with work center', async () => {
      const { workCenter, equipmentIdentifiers } = await createTestHierarchy();

      // Create production order
      const order = await prisma.productionOrder.create({
        data: {
          orderNumber: `PO-DB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          workCenterId: workCenter.id,
          product: 'Product X',
          quantity: 1000,
          targetStartDate: new Date(),
          targetEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'scheduled',
          priority: 1,
        },
      });

      // Query work center with orders
      const wcWithOrders = await prisma.workCenter.findUnique({
        where: { id: workCenter.id },
        include: {
          ProductionOrder: true,
        },
      });

      expect(wcWithOrders?.ProductionOrder).toHaveLength(1);
    });

    it('should handle production orders workflow', async () => {
      const { workCenter } = await createTestHierarchy();

      // Create order
      const order = await prisma.productionOrder.create({
        data: {
          orderNumber: `PO-WF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          workCenterId: workCenter.id,
          product: 'Widget A',
          quantity: 500,
          targetStartDate: new Date(),
          targetEndDate: new Date(Date.now() + 8 * 60 * 60 * 1000),
          status: 'scheduled',
          priority: 2,
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

      // Complete production
      const completed = await prisma.productionOrder.update({
        where: { id: order.id },
        data: {
          status: 'completed',
          actualEndDate: new Date(),
        },
      });

      expect(completed.status).toBe('completed');
      expect(completed.actualStartDate).toBeDefined();
      expect(completed.actualEndDate).toBeDefined();
    });
  });

  describe('Quality Metrics Operations', () => {
    it('should create and query quality metrics', async () => {
      const { equipmentIdentifiers } = await createTestHierarchy();

      // Create quality metric
      const qualityMetric = await prisma.qualityMetric.create({
        data: {
          equipmentId: equipmentIdentifiers.equipmentId,
          assetTag: equipmentIdentifiers.assetTag,
          plantCode: equipmentIdentifiers.plantCode,
          workCenterId: equipmentIdentifiers.workCenterId,
          parameter: 'dimension_tolerance',
          value: 0.05,
          uom: 'mm',
          lowerLimit: 0.0,
          upperLimit: 0.1,
          nominal: 0.05,
          isWithinSpec: true,
          qualityGrade: 'A',
          inspectionType: 'final',
          inspector: 'inspector001',
          shift: 'day',
        },
      });

      expect(qualityMetric.id).toBeDefined();
      expect(qualityMetric.isWithinSpec).toBe(true);

      // Query quality metrics
      const metrics = await prisma.qualityMetric.findMany({
        where: {
          equipmentId: equipmentIdentifiers.equipmentId,
          isWithinSpec: true,
        },
      });

      expect(metrics).toHaveLength(1);
      expect(metrics[0].parameter).toBe('dimension_tolerance');
    });
  });

  describe('Complex Queries', () => {
    it('should calculate OEE trends by equipment', async () => {
      const { equipmentIdentifiers } = await createTestHierarchy();

      // Create performance data over multiple days
      const days = 7;
      const metricsData = [];
      
      for (let day = 0; day < days; day++) {
        for (let hour = 0; hour < 24; hour += 4) { // Every 4 hours
          metricsData.push({
            equipmentId: equipmentIdentifiers.equipmentId,
            assetTag: equipmentIdentifiers.assetTag,
            plantCode: equipmentIdentifiers.plantCode,
            workCenterId: equipmentIdentifiers.workCenterId,
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
          equipmentId: equipmentIdentifiers.equipmentId,
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
      const { equipmentIdentifiers } = await createTestHierarchy();
      const now = new Date();

      // Create time-series metrics
      const metricsData = [];
      for (let i = 0; i < 60; i++) { // Last 60 minutes
        metricsData.push({
          id: `metric-ts-${Date.now()}-${i}`,
          name: 'TEMPERATURE',
          value: 65 + Math.sin(i / 10) * 10 + Math.random() * 2,
          unit: '°C',
          source: 'sensor',
          category: 'equipment',
          tags: {
            equipmentId: equipmentIdentifiers.equipmentId,
            assetTag: equipmentIdentifiers.assetTag,
            plantCode: equipmentIdentifiers.plantCode,
          },
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
          name: 'TEMPERATURE',
          tags: {
            path: ['equipmentId'],
            equals: equipmentIdentifiers.equipmentId,
          },
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