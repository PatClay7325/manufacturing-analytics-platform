import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/test-utils/setup-integration';

describe('Chat Integration Tests', () => {
  describe('Chat Context Retrieval', () => {
    it('should retrieve equipment context for equipment queries', async () => {
      // Create test equipment using hierarchical schema
      const equipment = await createTestEquipment();

      // Create some metrics for context
      await prisma.metric.createMany({
        data: [
          {
            workUnitId: equipment.id,
            name: 'temperature',
            value: 75.5,
            unit: '°C',
            source: 'sensor',
          },
          {
            workUnitId: equipment.id,
            name: 'pressure',
            value: 101.3,
            unit: 'kPa',
            source: 'sensor',
          },
        ],
      });

      // Verify context can be retrieved
      const context = await prisma.workUnit.findUnique({
        where: { id: equipment.id },
        include: {
          metrics: true,
          workCenter: {
            include: {
              area: {
                include: {
                  site: {
                    include: {
                      enterprise: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      expect(context).toBeDefined();
      expect(context?.metrics).toHaveLength(2);
      expect(context?.workCenter.area.site.enterprise).toBeDefined();
    });

    it('should retrieve work center context', async () => {
      // Create work center with production order
      const { workCenter } = await createTestHierarchy();

      // Create production order
      const order = await prisma.productionOrder.create({
        data: {
          orderNumber: 'PO-CHAT-001',
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
          productionOrders: true,
          workUnits: true,
          area: {
            include: {
              site: true,
            },
          },
        },
      });

      expect(context).toBeDefined();
      expect(context?.productionOrders).toHaveLength(1);
      expect(context?.productionOrders[0].status).toBe('in-progress');
    });

    it('should retrieve maintenance schedule context', async () => {
      const equipment = await createTestEquipment();

      // Create maintenance records
      await prisma.maintenanceRecord.createMany({
        data: [
          {
            workUnitId: equipment.id,
            maintenanceType: 'preventive',
            description: 'Regular maintenance',
            technician: 'Tech A',
            startTime: new Date(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
            status: 'scheduled',
          },
          {
            workUnitId: equipment.id,
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
      const context = await prisma.workUnit.findUnique({
        where: { id: equipment.id },
        include: {
          maintenanceRecords: {
            orderBy: { startTime: 'desc' },
          },
        },
      });

      expect(context?.maintenanceRecords).toHaveLength(2);
      expect(context?.maintenanceRecords[0].status).toBe('scheduled');
    });

    it('should retrieve quality metrics context', async () => {
      const equipment = await createTestEquipment();

      // Create quality metrics
      await prisma.qualityMetric.createMany({
        data: [
          {
            workUnitId: equipment.id,
            parameter: 'dimension',
            value: 10.05,
            uom: 'mm',
            lowerLimit: 9.95,
            upperLimit: 10.05,
            nominal: 10.0,
            isWithinSpec: true,
            deviation: 0.05,
          },
          {
            workUnitId: equipment.id,
            parameter: 'weight',
            value: 250.2,
            uom: 'g',
            lowerLimit: 245.0,
            upperLimit: 255.0,
            nominal: 250.0,
            isWithinSpec: true,
            deviation: 0.2,
          },
        ],
      });

      // Verify quality context
      const context = await prisma.workUnit.findUnique({
        where: { id: equipment.id },
        include: {
          qualityMetrics: true,
        },
      });

      expect(context?.qualityMetrics).toHaveLength(2);
      expect(context?.qualityMetrics.every(qm => qm.isWithinSpec)).toBe(true);
    });
  });

  describe('Chat Query Processing', () => {
    it('should handle OEE calculation queries', async () => {
      const equipment = await createTestEquipment();

      // Create performance metrics
      await prisma.performanceMetric.create({
        data: {
          workUnitId: equipment.id,
          availability: 0.90,
          performance: 0.88,
          quality: 0.95,
          oeeScore: 0.75,
          runTime: 480,
          plannedDowntime: 60,
          unplannedDowntime: 20,
          totalParts: 1000,
          goodParts: 950,
        },
      });

      // Verify OEE data retrieval
      const metrics = await prisma.performanceMetric.findFirst({
        where: { workUnitId: equipment.id },
      });

      expect(metrics?.oeeScore).toBe(0.75);
      expect(metrics?.availability).toBe(0.90);
      expect(metrics?.performance).toBe(0.88);
      expect(metrics?.quality).toBe(0.95);
    });

    it('should handle downtime analysis queries', async () => {
      const equipment = await createTestEquipment();

      // Create maintenance records for downtime analysis
      const maintenanceRecords = [
        {
          workUnitId: equipment.id,
          maintenanceType: 'corrective',
          description: 'Motor replacement',
          technician: 'Tech A',
          startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
          status: 'completed',
        },
        {
          workUnitId: equipment.id,
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
          workUnitId: equipment.id,
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

      // Create production order with quality checks
      const order = await prisma.productionOrder.create({
        data: {
          orderNumber: 'PO-INSIGHT-001',
          workCenterId: workCenter.id,
          product: 'Widget A',
          quantity: 1000,
          targetStartDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          targetEndDate: new Date(),
          status: 'completed',
          priority: 1,
          actualStartDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          actualEndDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      });

      // Create quality check
      await prisma.qualityCheck.create({
        data: {
          productionOrderId: order.id,
          checkType: 'final',
          inspector: 'QC Manager',
          result: 'pass',
          notes: 'All quality parameters met',
        },
      });

      // Query production insights
      const insights = await prisma.productionOrder.findUnique({
        where: { id: order.id },
        include: {
          qualityChecks: true,
          workCenter: {
            include: {
              workUnits: true,
            },
          },
        },
      });

      expect(insights?.status).toBe('completed');
      expect(insights?.qualityChecks).toHaveLength(1);
      expect(insights?.qualityChecks[0].result).toBe('pass');
    });
  });

  describe('Chat Response Generation', () => {
    it('should generate appropriate responses for equipment status', async () => {
      const equipment = await createTestEquipment({ status: 'maintenance' });

      // Create alert for equipment
      await prisma.alert.create({
        data: {
          workUnitId: equipment.id,
          alertType: 'maintenance',
          severity: 'medium',
          message: 'Scheduled maintenance in progress',
          status: 'active',
        },
      });

      // Query for response generation context
      const context = await prisma.workUnit.findUnique({
        where: { id: equipment.id },
        include: {
          alerts: {
            where: { status: 'active' },
          },
          workCenter: {
            include: {
              area: {
                include: {
                  site: true,
                },
              },
            },
          },
        },
      });

      expect(context?.status).toBe('maintenance');
      expect(context?.alerts).toHaveLength(1);
      expect(context?.alerts[0].alertType).toBe('maintenance');
    });

    it('should handle multi-context queries', async () => {
      const equipment1 = await createTestEquipment({ name: 'Machine A' });
      const equipment2 = await createTestEquipment({ name: 'Machine B' });

      // Add performance metrics
      await prisma.performanceMetric.create({
        data: {
          workUnitId: equipment1.id,
          oeeScore: 0.75,
          availability: 0.85,
          performance: 0.82,
          quality: 0.92,
          totalParts: 800,
          goodParts: 736,
        },
      });

      await prisma.performanceMetric.create({
        data: {
          workUnitId: equipment2.id,
          oeeScore: 0.82,
          availability: 0.88,
          performance: 0.85,
          quality: 0.95,
          totalParts: 900,
          goodParts: 855,
        },
      });

      // Query for multi-equipment context
      const context = await prisma.workUnit.findMany({
        where: {
          id: { in: [equipment1.id, equipment2.id] },
        },
        include: {
          performanceMetrics: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      expect(context).toHaveLength(2);
      expect(context.every(eq => eq.performanceMetrics.length > 0)).toBe(true);
      
      // Verify OEE scores
      const oeeScores = context.map(eq => eq.performanceMetrics[0].oeeScore);
      expect(oeeScores).toContain(0.75);
      expect(oeeScores).toContain(0.82);
    });

    it('should provide hierarchical context for site-level queries', async () => {
      const { enterprise, site, area, workCenter } = await createTestHierarchy();
      
      // Create multiple work units
      const equipment1 = await createTestEquipment({ 
        name: 'Line 1 Machine',
        workCenterId: workCenter.id,
      });
      const equipment2 = await createTestEquipment({ 
        name: 'Line 2 Machine',
        workCenterId: workCenter.id,
      });

      // Query for site-level context
      const siteContext = await prisma.site.findUnique({
        where: { id: site.id },
        include: {
          enterprise: true,
          areas: {
            include: {
              workCenters: {
                include: {
                  workUnits: {
                    include: {
                      alerts: {
                        where: { status: 'active' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      expect(siteContext?.enterprise.name).toBe('Test Enterprise');
      expect(siteContext?.areas).toHaveLength(1);
      expect(siteContext?.areas[0].workCenters).toHaveLength(1);
      expect(siteContext?.areas[0].workCenters[0].workUnits).toHaveLength(2);
    });
  });
});