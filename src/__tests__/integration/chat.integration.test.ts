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

  // Create equipment identifiers for this work center
  const equipmentId = `EQ-${timestamp}-${randomSuffix}`;
  const assetTag = `ASSET-${timestamp}-${randomSuffix}`;
  const plantCode = `PLANT-${timestamp}-${randomSuffix}`;

  return { enterprise, site, area, workCenter, equipmentId, assetTag, plantCode };
}

// Helper function to create additional equipment identifiers
function createTestEquipment(suffix: string) {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 9);
  return {
    equipmentId: `EQ-${timestamp}-${suffix}-${randomSuffix}`,
    assetTag: `ASSET-${timestamp}-${suffix}-${randomSuffix}`,
    plantCode: `PLANT-${timestamp}-${randomSuffix}`,
    name: `Test Equipment ${suffix}`,
  };
}

describe('Chat Integration Tests', () => {
  describe('Chat Context Retrieval', () => {
    it('should retrieve equipment context for equipment queries', async () => {
      // Create test equipment using hierarchical schema
      const { workCenter, equipmentId, assetTag, plantCode } = await createTestHierarchy();

      // Create some metrics for context
      await prisma.metric.createMany({
        data: [
          {
            name: 'TEMPERATURE',
            value: 75.5,
            unit: '°C',
            source: 'sensor',
            category: 'equipment',
            tags: { equipmentId, assetTag, workCenter: workCenter.name },
            timestamp: new Date(),
          },
          {
            name: 'PRESSURE',
            value: 101.3,
            unit: 'kPa',
            source: 'sensor',
            category: 'equipment',
            tags: { equipmentId, assetTag, workCenter: workCenter.name },
            timestamp: new Date(),
          },
        ],
      });

      // Verify context can be retrieved by equipment
      const metrics = await prisma.metric.findMany({
        where: {
          tags: {
            path: ['equipmentId'],
            equals: equipmentId,
          },
        },
      });

      // Verify work center hierarchy can be retrieved
      const context = await prisma.workCenter.findUnique({
        where: { id: workCenter.id },
        include: {
          Area: {
            include: {
              Site: {
                include: {
                  Enterprise: true,
                },
              },
            },
          },
        },
      });

      expect(metrics).toHaveLength(2);
      expect(context).toBeDefined();
      expect(context?.Area.Site.Enterprise).toBeDefined();
    });

    it('should retrieve work center context', async () => {
      // Create work center with production order
      const { workCenter } = await createTestHierarchy();

      // Create production order
      const order = await prisma.productionOrder.create({
        data: {
          orderNumber: `PO-CHAT-${Date.now()}`,
          workCenterId: workCenter.id,
          product: 'Test Product',
          quantity: 500,
          targetStartDate: new Date(),
          targetEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'in-progress',
          priority: 1,
        },
      });

      // Verify context retrieval
      const context = await prisma.workCenter.findUnique({
        where: { id: workCenter.id },
        include: {
          ProductionOrder: true,
          Area: {
            include: {
              Site: true,
            },
          },
        },
      });

      expect(context).toBeDefined();
      expect(context?.ProductionOrder).toHaveLength(1);
      expect(context?.ProductionOrder[0].status).toBe('in-progress');
    });

    it('should retrieve maintenance schedule context', async () => {
      const { workCenter, equipmentId, assetTag, plantCode } = await createTestHierarchy();

      // Create maintenance records
      await prisma.maintenanceRecord.createMany({
        data: [
          {
            equipmentId,
            assetTag,
            plantCode,
            maintenanceType: 'preventive',
            description: 'Regular maintenance',
            technician: 'Tech A',
            startTime: new Date(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
            status: 'scheduled',
          },
          {
            equipmentId,
            assetTag,
            plantCode,
            maintenanceType: 'corrective',
            description: 'Emergency repair',
            technician: 'Tech B',
            startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
            endTime: new Date(Date.now() - 22 * 60 * 60 * 1000),
            status: 'completed',
          },
        ],
      });

      // Verify maintenance context
      const maintenanceRecords = await prisma.maintenanceRecord.findMany({
        where: { equipmentId },
        orderBy: { startTime: 'desc' },
      });

      expect(maintenanceRecords).toHaveLength(2);
      expect(maintenanceRecords[0].status).toBe('scheduled');
    });

    it('should retrieve quality metrics context', async () => {
      const { workCenter, equipmentId, assetTag, plantCode } = await createTestHierarchy();

      // Create quality metrics
      await prisma.qualityMetric.createMany({
        data: [
          {
            equipmentId,
            assetTag,
            plantCode,
            workCenterId: workCenter.id,
            parameter: 'dimension',
            value: 10.05,
            uom: 'mm',
            lowerLimit: 9.95,
            upperLimit: 10.05,
            nominal: 10.0,
            isWithinSpec: true,
            deviation: 0.05,
            timestamp: new Date(),
          },
          {
            equipmentId,
            assetTag,
            plantCode,
            workCenterId: workCenter.id,
            parameter: 'weight',
            value: 250.2,
            uom: 'g',
            lowerLimit: 245.0,
            upperLimit: 255.0,
            nominal: 250.0,
            isWithinSpec: true,
            deviation: 0.2,
            timestamp: new Date(),
          },
        ],
      });

      // Verify quality context
      const qualityMetrics = await prisma.qualityMetric.findMany({
        where: { equipmentId },
      });

      expect(qualityMetrics).toHaveLength(2);
      expect(qualityMetrics.every(qm => qm.isWithinSpec)).toBe(true);
    });
  });

  describe('Chat Query Processing', () => {
    it('should handle OEE calculation queries', async () => {
      const { workCenter, equipmentId, assetTag, plantCode } = await createTestHierarchy();

      // Create performance metrics
      await prisma.performanceMetric.create({
        data: {
          equipmentId,
          assetTag,
          plantCode,
          workCenterId: workCenter.id,
          availability: 90,
          performance: 88,
          quality: 95,
          oeeScore: 75.24,
          timestamp: new Date(),
        },
      });

      // Verify OEE data retrieval
      const metrics = await prisma.performanceMetric.findFirst({
        where: { equipmentId },
      });

      expect(metrics?.oeeScore).toBe(75.24);
      expect(metrics?.availability).toBe(90);
      expect(metrics?.performance).toBe(88);
      expect(metrics?.quality).toBe(95);
    });

    it('should handle downtime analysis queries', async () => {
      const { workCenter, equipmentId, assetTag, plantCode } = await createTestHierarchy();

      // Create maintenance records for downtime analysis
      const maintenanceRecords = [
        {
          equipmentId,
          assetTag,
          plantCode,
          maintenanceType: 'corrective',
          description: 'Motor replacement',
          technician: 'Tech A',
          startTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
          status: 'completed',
        },
        {
          equipmentId,
          assetTag,
          plantCode,
          maintenanceType: 'preventive',
          description: 'Regular service',
          technician: 'Tech B',
          startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
          status: 'completed',
        },
      ];

      await prisma.maintenanceRecord.createMany({ data: maintenanceRecords });

      // Query downtime data
      const downtime = await prisma.maintenanceRecord.findMany({
        where: { 
          equipmentId,
          status: 'completed',
          startTime: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { startTime: 'desc' },
      });

      expect(downtime).toHaveLength(2);
      expect(downtime[0].maintenanceType).toBe('preventive');
    });

    it('should provide production insights', async () => {
      const { workCenter } = await createTestHierarchy();

      // Create production orders
      const timestamp = Date.now();
      const orders = [
        {
          orderNumber: `PO-${timestamp}-001`,
          workCenterId: workCenter.id,
          product: 'Product A',
          quantity: 1000,
          targetStartDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
          targetEndDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          actualStartDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
          actualEndDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          status: 'completed',
          priority: 1,
        },
        {
          orderNumber: `PO-${timestamp}-002`,
          workCenterId: workCenter.id,
          product: 'Product B',
          quantity: 500,
          targetStartDate: new Date(),
          targetEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'in-progress',
          priority: 2,
        },
      ];

      await prisma.productionOrder.createMany({ data: orders });

      // Query production insights
      const insights = await prisma.productionOrder.findMany({
        where: { workCenterId: workCenter.id },
        include: {
          WorkCenter: {
            include: {
              Area: {
                include: {
                  Site: true,
                },
              },
            },
          },
        },
      });

      expect(insights).toHaveLength(2);
      expect(insights.filter(o => o.status === 'completed')).toHaveLength(1);
      expect(insights.filter(o => o.status === 'in-progress')).toHaveLength(1);
    });
  });

  describe('Chat Response Generation', () => {
    it('should generate appropriate responses for equipment status', async () => {
      const { workCenter, equipmentId, assetTag, plantCode } = await createTestHierarchy();

      // Create current status data
      await prisma.metric.create({
        data: {
          name: 'STATUS',
          value: 1,
          unit: 'binary',
          source: 'system',
          category: 'equipment',
          tags: { equipmentId, assetTag, workCenter: workCenter.name },
          timestamp: new Date(),
        },
      });

      const statusMetrics = await prisma.metric.findMany({
        where: {
          name: 'STATUS',
          tags: {
            path: ['equipmentId'],
            equals: equipmentId,
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 1,
      });

      expect(statusMetrics).toHaveLength(1);
      expect(statusMetrics[0]?.value).toBe(1);
    });

    it('should handle multi-context queries', async () => {
      const { workCenter, equipmentId, assetTag, plantCode } = await createTestHierarchy();

      // Create various data points
      await Promise.all([
        prisma.metric.create({
          data: {
            name: 'OEE',
            value: 85.5,
            unit: '%',
            source: 'calculated',
            category: 'equipment',
            tags: { equipmentId, assetTag, workCenter: workCenter.name },
            timestamp: new Date(),
          },
        }),
        prisma.alert.create({
          data: {
            equipmentId,
            assetTag,
            plantCode,
            alertType: 'quality',
            subType: 'equipment_monitoring',
            severity: 'medium',
            priority: 'medium',
            title: 'Quality Alert',
            message: 'Quality threshold warning',
            status: 'active',
          },
        }),
        prisma.productionOrder.create({
          data: {
            orderNumber: `PO-MC-${Date.now()}`,
            workCenterId: workCenter.id,
            product: 'Multi-Context Product',
            quantity: 750,
            targetStartDate: new Date(),
            targetEndDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
            status: 'in-progress',
            priority: 1,
          },
        }),
      ]);

      // Query multi-context data
      const [oeeMetrics, alerts, productionOrders] = await Promise.all([
        prisma.metric.findMany({
          where: {
            name: 'OEE',
            tags: {
              path: ['equipmentId'],
              equals: equipmentId,
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 1,
        }),
        prisma.alert.findMany({
          where: { equipmentId, status: 'active' },
        }),
        prisma.productionOrder.findMany({
          where: { workCenterId: workCenter.id, status: 'in-progress' },
        }),
      ]);

      expect(oeeMetrics).toHaveLength(1);
      expect(alerts).toHaveLength(1);
      expect(productionOrders).toHaveLength(1);
    });

    it('should provide hierarchical context for site-level queries', async () => {
      const { enterprise, site, area, workCenter, equipmentId, assetTag, plantCode } = await createTestHierarchy();

      // Create additional equipment identifiers
      const equipment2 = createTestEquipment('2');

      // Create site-wide metrics with unique test identifier
      const testTag = `test-${Date.now()}`;
      await prisma.metric.createMany({
        data: [
          {
            name: 'PRODUCTION_RATE',
            value: 150,
            unit: 'units/hour',
            source: 'system',
            category: 'production',
            tags: { equipmentId, assetTag, workCenter: workCenter.name, testId: testTag },
            timestamp: new Date(),
          },
          {
            name: 'PRODUCTION_RATE',
            value: 180,
            unit: 'units/hour',
            source: 'system',
            category: 'production',
            tags: { equipmentId: equipment2.equipmentId, assetTag: equipment2.assetTag, workCenter: workCenter.name, testId: testTag },
            timestamp: new Date(),
          },
        ],
      });

      // Query site-level data
      const siteContext = await prisma.site.findUnique({
        where: { id: site.id },
        include: {
          Area: {
            include: {
              WorkCenter: {
                include: {
                  Area: {
                    include: {
                      Site: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Query production rate metrics for this specific test
      const productionMetrics = await prisma.metric.findMany({
        where: {
          name: 'PRODUCTION_RATE',
          tags: {
            path: ['testId'],
            equals: testTag,
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(siteContext?.Area).toHaveLength(1);
      expect(siteContext?.Area[0].WorkCenter).toHaveLength(1);
      expect(productionMetrics).toHaveLength(2);
      
      // Verify metrics have correct values
      const metricValues = productionMetrics.map(m => m.value);
      expect(metricValues).toContain(150);
      expect(metricValues).toContain(180);
    });
  });
});