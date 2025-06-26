// Jest test - using global test functions
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

  // Create equipment identifiers following ISO standards
  const equipmentId = `EQ-${timestamp}-${randomSuffix}`;
  const plantCode = `PLANT-${timestamp}-${randomSuffix}`;
  const assetTag = `ASSET-${timestamp}-${randomSuffix}`;

  return { enterprise, site, area, workCenter, equipmentId, plantCode, assetTag };
}

describe('Service Layer Integration Tests', () => {
  describe('Equipment Service Tests', () => {
    it('should manage equipment lifecycle', async () => {
      // Create hierarchy and equipment identifiers
      const { workCenter, equipmentId, plantCode, assetTag } = await createTestHierarchy();
      
      // Add performance metrics using ISO-compliant equipment identification
      await prisma.performanceMetric.createMany({
        data: [
          {
            equipmentId,
            plantCode,
            assetTag,
            workCenterId: workCenter.id,
            machineName: 'Service Test Machine',
            processName: 'CNC Machining',
            timestamp: new Date(),
            oeeScore: 0.85,
            availability: 90,
            performance: 90,
            quality: 95,
            totalPartsProduced: 100,
            goodParts: 95,
            rejectParts: 5,
          },
          {
            equipmentId,
            plantCode,
            assetTag,
            workCenterId: workCenter.id,
            machineName: 'Service Test Machine',
            processName: 'CNC Machining',
            timestamp: new Date(Date.now() - 60 * 60 * 1000),
            oeeScore: 0.80,
            availability: 85,
            performance: 85,
            quality: 95,
            totalPartsProduced: 90,
            goodParts: 85,
            rejectParts: 5,
          },
        ],
      });

      // Calculate average OEE
      const metrics = await prisma.performanceMetric.findMany({
        where: { equipmentId },
      });

      const avgOEE = metrics.reduce((sum, m) => sum + (m.oeeScore || 0), 0) / metrics.length;
      expect(avgOEE).toBeCloseTo(0.825, 2);

      // Create maintenance record with ISO-compliant identification
      await prisma.maintenanceRecord.create({
        data: {
          equipmentId,
          plantCode,
          assetTag,
          maintenanceType: 'preventive',
          subType: 'planned',
          description: 'Regular maintenance',
          technician: 'Tech 1',
          startTime: new Date(),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          status: 'completed',
          priority: 'medium',
          actualDuration: 2.0,
          effectiveness: 'successful',
        },
      });

      // Verify equipment data with relations
      const equipmentMetrics = await prisma.performanceMetric.findMany({
        where: { equipmentId },
      });

      const equipmentMaintenance = await prisma.maintenanceRecord.findMany({
        where: { equipmentId },
      });

      expect(equipmentMetrics).toHaveLength(2);
      expect(equipmentMaintenance).toHaveLength(1);
      expect(equipmentMaintenance[0].status).toBe('completed');
    });
  });

  describe('Alert Service Tests', () => {
    it('should manage alert lifecycle', async () => {
      const { equipmentId, plantCode, assetTag } = await createTestHierarchy();

      // Create multiple alerts using ISO-compliant equipment identification
      const alerts = await prisma.alert.createMany({
        data: [
          {
            equipmentId,
            plantCode,
            assetTag,
            alertType: 'maintenance',
            severity: 'high',
            message: 'Urgent maintenance required',
            status: 'active',
          },
          {
            equipmentId,
            plantCode,
            assetTag,
            alertType: 'equipment',
            severity: 'medium',
            message: 'OEE below threshold',
            status: 'active',
          },
          {
            equipmentId,
            plantCode,
            assetTag,
            alertType: 'quality',
            severity: 'low',
            message: 'Quality check reminder',
            status: 'resolved',
          },
        ],
      });

      // Query active alerts
      const activeAlerts = await prisma.alert.findMany({
        where: {
          equipmentId,
          status: 'active',
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      expect(activeAlerts).toHaveLength(2);
      // First created alert was MAINTENANCE with HIGH severity
      expect(activeAlerts[0].severity).toBe('high');
      expect(activeAlerts[0].alertType).toBe('maintenance');

      // Acknowledge alert
      const acknowledged = await prisma.alert.updateMany({
        where: {
          equipmentId,
          alertType: 'maintenance',
          status: 'active',
        },
        data: {
          status: 'acknowledged',
          acknowledgedBy: 'operator1',
          acknowledgedAt: new Date(),
        },
      });

      expect(acknowledged.count).toBe(1);

      // Resolve alert
      const resolved = await prisma.alert.updateMany({
        where: {
          equipmentId,
          status: 'acknowledged',
        },
        data: {
          status: 'resolved',
          resolvedBy: 'technician1',
          resolvedAt: new Date(),
        },
      });

      expect(resolved.count).toBe(1);

      // Verify alert status distribution
      const alertStats = await prisma.alert.groupBy({
        by: ['status'],
        where: { equipmentId },
        _count: { status: true },
      });

      const statusMap = alertStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {} as Record<string, number>);

      expect(statusMap['active']).toBe(1);
      expect(statusMap['resolved']).toBe(2);
    });
  });

  describe('Metrics Service Tests', () => {
    it('should handle time-series metrics', async () => {
      const { equipmentId, plantCode, assetTag } = await createTestHierarchy();
      const now = new Date();

      // Create time-series data using the Metric model
      const metricsData = [];
      const baseTime = Date.now();
      const testTag = `test-${baseTime}`;
      for (let i = 0; i < 24; i++) { // 24 hours of data
        metricsData.push({
          id: `metric-temp-${baseTime}-${i}`,
          name: 'TEMPERATURE',
          value: 70 + Math.sin(i * Math.PI / 12) * 5 + Math.random() * 2,
          unit: '°C',
          source: 'sensor',
          category: 'equipment',
          tags: { testId: testTag, equipmentId },
          timestamp: new Date(now.getTime() - i * 60 * 60 * 1000),
        });
        
        metricsData.push({
          id: `metric-press-${baseTime}-${i}-p`,
          name: 'PRESSURE',
          value: 100 + Math.cos(i * Math.PI / 12) * 10 + Math.random() * 5,
          unit: 'PSI',
          source: 'sensor',
          category: 'equipment',
          tags: { testId: testTag, equipmentId },
          timestamp: new Date(now.getTime() - i * 60 * 60 * 1000),
        });
      }

      await prisma.metric.createMany({
        data: metricsData,
      });

      // Query temperature metrics for this specific test
      const tempMetrics = await prisma.metric.findMany({
        where: {
          name: 'TEMPERATURE',
          source: 'sensor',
          category: 'equipment',
          tags: {
            path: ['testId'],
            equals: testTag,
          },
          timestamp: {
            gte: new Date(now.getTime() - 12 * 60 * 60 * 1000), // Last 12 hours
            lte: new Date(now.getTime() + 60 * 1000), // Up to 1 minute in future to include current test data
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      expect(tempMetrics.length).toBeGreaterThan(0);
      expect(tempMetrics.length).toBeLessThanOrEqual(13); // Should be 13 (hours 0-12 inclusive)

      // Calculate statistics
      const temps = tempMetrics.map(m => m.value);
      const avgTemp = temps.reduce((sum, val) => sum + val, 0) / temps.length;
      const maxTemp = Math.max(...temps);
      const minTemp = Math.min(...temps);

      expect(avgTemp).toBeGreaterThan(65);
      expect(avgTemp).toBeLessThan(75);
      expect(maxTemp).toBeGreaterThan(avgTemp);
      expect(minTemp).toBeLessThan(avgTemp);
    });
  });

  describe('Production Workflow Tests', () => {
    it('should handle complete production cycle', async () => {
      // Create hierarchy with multiple work centers
      const { area, equipmentId, plantCode, assetTag } = await createTestHierarchy();
      const timestamp = Date.now();
      
      // Create additional work center
      const workCenter2 = await prisma.workCenter.create({
        data: {
          id: `wc-assembly-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
          name: 'Assembly Center',
          code: `AC-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
          areaId: area.id,
          updatedAt: new Date(),
        },
      });

      // Create equipment identifiers for assembly equipment
      const assemblyEquipmentId = `EQ-ASSEMBLY-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;
      const assemblyAssetTag = `ASSET-ASSEMBLY-${timestamp}-${Math.random().toString(36).substr(2, 9)}`;

      // Create production order
      const order = await prisma.productionOrder.create({
        data: {
          orderNumber: `PO-SVC-${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
          workCenterId: workCenter2.id,
          product: 'Complex Assembly',
          quantity: 100,
          targetStartDate: new Date(),
          targetEndDate: new Date(Date.now() + 8 * 60 * 60 * 1000),
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

      // Add quality checks during production
      await prisma.qualityCheck.createMany({
        data: [
          {
            productionOrderId: order.id,
            checkType: 'DIMENSIONAL',
            result: 'PASS',
            inspector: 'QC Inspector 1',
            notes: 'All dimensions within tolerance',
            defectTypes: [],
            defectCounts: [],
          },
          {
            productionOrderId: order.id,
            checkType: 'VISUAL',
            result: 'PASS',
            inspector: 'QC Inspector 2',
            notes: 'No visual defects found',
            defectTypes: [],
            defectCounts: [],
          },
        ],
      });

      // Create performance data during production using ISO-compliant equipment identification
      await prisma.performanceMetric.create({
        data: {
          equipmentId: assemblyEquipmentId,
          plantCode,
          assetTag: assemblyAssetTag,
          workCenterId: workCenter2.id,
          machineName: 'Assembly Robot 1',
          processName: 'Component Assembly',
          timestamp: new Date(),
          availability: 92,
          performance: 88,
          quality: 98,
          oeeScore: 0.79,
          totalPartsProduced: 50,
          goodParts: 49,
          rejectParts: 1,
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

      // Verify complete workflow
      const finalOrder = await prisma.productionOrder.findUnique({
        where: { id: order.id },
        include: {
          qualityChecks: true,
          WorkCenter: true,
        },
      });

      expect(finalOrder?.status).toBe('completed');
      expect(finalOrder?.qualityChecks).toHaveLength(2);
      expect(finalOrder?.qualityChecks.every(qc => qc.result === 'PASS')).toBe(true);
      expect(finalOrder?.WorkCenter).toBeTruthy();
      
      // Verify performance metrics were created for the assembly equipment
      const performanceMetrics = await prisma.performanceMetric.findMany({
        where: {
          equipmentId: assemblyEquipmentId,
          workCenterId: workCenter2.id,
          timestamp: {
            gte: completed.actualStartDate || new Date(),
            lte: completed.actualEndDate || new Date(),
          },
        },
      });
      
      expect(performanceMetrics.length).toBeGreaterThan(0);
      expect(performanceMetrics[0].oeeScore).toBe(0.79);
    });
  });
});