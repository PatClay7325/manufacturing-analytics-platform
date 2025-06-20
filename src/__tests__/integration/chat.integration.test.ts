import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '@/test-utils/setup-integration';

describe('Chat Integration Tests', () => {
  describe('Chat Context Retrieval', () => {
    it('should retrieve equipment context for equipment queries', async () => {
      // Create test equipment using hierarchical schema
      const { workUnit } = await createTestHierarchy();

      // Create some metrics for context
      await prisma.metric.createMany({
        data: [
          {
            id: `metric-temp-${Date.now()}`,
            workUnitId: workUnit.id,
            name: 'TEMPERATURE',
            value: 75.5,
            unit: '°C',
            source: 'sensor',
            timestamp: new Date(),
          },
          {
            id: `metric-press-${Date.now()}`,
            workUnitId: workUnit.id,
            name: 'PRESSURE',
            value: 101.3,
            unit: 'kPa',
            source: 'sensor',
            timestamp: new Date(),
          },
        ],
      });

      // Verify context can be retrieved
      const context = await prisma.workUnit.findUnique({
        where: { id: workUnit.id },
        include: {
          Metric: true,
          WorkCenter: {
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
          },
        },
      });

      expect(context).toBeDefined();
      expect(context?.Metric).toHaveLength(2);
      expect(context?.WorkCenter.Area.Site.Enterprise).toBeDefined();
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
          status: 'IN_PROGRESS',
          priority: 1,
        },
      });

      // Verify context retrieval
      const context = await prisma.workCenter.findUnique({
        where: { id: workCenter.id },
        include: {
          ProductionOrder: true,
          WorkUnit: true,
          Area: {
            include: {
              Site: true,
            },
          },
        },
      });

      expect(context).toBeDefined();
      expect(context?.ProductionOrder).toHaveLength(1);
      expect(context?.ProductionOrder[0].status).toBe('IN_PROGRESS');
    });

    it('should retrieve maintenance schedule context', async () => {
      const { workUnit } = await createTestHierarchy();

      // Create maintenance records
      await prisma.maintenanceRecord.createMany({
        data: [
          {
            workUnitId: workUnit.id,
            maintenanceType: 'PREVENTIVE',
            description: 'Regular maintenance',
            technician: 'Tech A',
            startTime: new Date(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
            status: 'SCHEDULED',
          },
          {
            workUnitId: workUnit.id,
            maintenanceType: 'CORRECTIVE',
            description: 'Emergency repair',
            technician: 'Tech B',
            startTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
            endTime: new Date(Date.now() - 22 * 60 * 60 * 1000),
            status: 'COMPLETED',
          },
        ],
      });

      // Verify maintenance context
      const context = await prisma.workUnit.findUnique({
        where: { id: workUnit.id },
        include: {
          MaintenanceRecord: {
            orderBy: { startTime: 'desc' },
          },
        },
      });

      expect(context?.MaintenanceRecord).toHaveLength(2);
      expect(context?.MaintenanceRecord[0].status).toBe('SCHEDULED');
    });

    it('should retrieve quality metrics context', async () => {
      const { workUnit } = await createTestHierarchy();

      // Create quality metrics
      await prisma.qualityMetric.createMany({
        data: [
          {
            workUnitId: workUnit.id,
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
            workUnitId: workUnit.id,
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
      const context = await prisma.workUnit.findUnique({
        where: { id: workUnit.id },
        include: {
          QualityMetric: true,
        },
      });

      expect(context?.QualityMetric).toHaveLength(2);
      expect(context?.QualityMetric.every(qm => qm.isWithinSpec)).toBe(true);
    });
  });

  describe('Chat Query Processing', () => {
    it('should handle OEE calculation queries', async () => {
      const { workUnit } = await createTestHierarchy();

      // Create performance metrics
      await prisma.performanceMetric.create({
        data: {
          workUnitId: workUnit.id,
          availability: 90,
          performance: 88,
          quality: 95,
          oeeScore: 75.24,
          timestamp: new Date(),
        },
      });

      // Verify OEE data retrieval
      const metrics = await prisma.performanceMetric.findFirst({
        where: { workUnitId: workUnit.id },
      });

      expect(metrics?.oeeScore).toBe(75.24);
      expect(metrics?.availability).toBe(90);
      expect(metrics?.performance).toBe(88);
      expect(metrics?.quality).toBe(95);
    });

    it('should handle downtime analysis queries', async () => {
      const { workUnit } = await createTestHierarchy();

      // Create maintenance records for downtime analysis
      const maintenanceRecords = [
        {
          workUnitId: workUnit.id,
          maintenanceType: 'CORRECTIVE',
          description: 'Motor replacement',
          technician: 'Tech A',
          startTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
          status: 'COMPLETED',
        },
        {
          workUnitId: workUnit.id,
          maintenanceType: 'PREVENTIVE',
          description: 'Regular service',
          technician: 'Tech B',
          startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
          status: 'COMPLETED',
        },
      ];

      await prisma.maintenanceRecord.createMany({ data: maintenanceRecords });

      // Query downtime data
      const downtime = await prisma.maintenanceRecord.findMany({
        where: { 
          workUnitId: workUnit.id,
          status: 'COMPLETED',
          startTime: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { startTime: 'desc' },
      });

      expect(downtime).toHaveLength(2);
      expect(downtime[0].maintenanceType).toBe('PREVENTIVE');
    });

    it('should provide production insights', async () => {
      const { workCenter } = await createTestHierarchy();

      // Create production orders
      const orders = [
        {
          orderNumber: 'PO-001',
          workCenterId: workCenter.id,
          product: 'Product A',
          quantity: 1000,
          targetStartDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
          targetEndDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          actualStartDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
          actualEndDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          status: 'COMPLETED',
          priority: 1,
        },
        {
          orderNumber: 'PO-002',
          workCenterId: workCenter.id,
          product: 'Product B',
          quantity: 500,
          targetStartDate: new Date(),
          targetEndDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: 'IN_PROGRESS',
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
              WorkUnit: true,
            },
          },
        },
      });

      expect(insights).toHaveLength(2);
      expect(insights.filter(o => o.status === 'COMPLETED')).toHaveLength(1);
      expect(insights.filter(o => o.status === 'IN_PROGRESS')).toHaveLength(1);
    });
  });

  describe('Chat Response Generation', () => {
    it('should generate appropriate responses for equipment status', async () => {
      const { workUnit } = await createTestHierarchy();

      // Create current status data
      await prisma.metric.create({
        data: {
          id: `metric-status-${Date.now()}`,
          workUnitId: workUnit.id,
          name: 'STATUS',
          value: 1,
          unit: 'binary',
          source: 'system',
          timestamp: new Date(),
        },
      });

      const status = await prisma.workUnit.findUnique({
        where: { id: workUnit.id },
        include: {
          Metric: {
            where: { name: 'STATUS' },
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      });

      expect(status?.status).toBe('OPERATIONAL');
      expect(status?.Metric[0]?.value).toBe(1);
    });

    it('should handle multi-context queries', async () => {
      const { workUnit, workCenter } = await createTestHierarchy();

      // Create various data points
      await Promise.all([
        prisma.metric.create({
          data: {
            id: `metric-oee-${Date.now()}`,
            workUnitId: workUnit.id,
            name: 'OEE',
            value: 85.5,
            unit: '%',
            source: 'calculated',
            timestamp: new Date(),
          },
        }),
        prisma.alert.create({
          data: {
            workUnitId: workUnit.id,
            alertType: 'QUALITY',
            severity: 'MEDIUM',
            message: 'Quality threshold warning',
            status: 'ACTIVE',
          },
        }),
        prisma.productionOrder.create({
          data: {
            orderNumber: 'PO-MC-001',
            workCenterId: workCenter.id,
            product: 'Multi-Context Product',
            quantity: 750,
            targetStartDate: new Date(),
            targetEndDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
            status: 'IN_PROGRESS',
            priority: 1,
          },
        }),
      ]);

      // Query multi-context data
      const multiContext = await prisma.workUnit.findUnique({
        where: { id: workUnit.id },
        include: {
          Metric: {
            where: { name: 'OEE' },
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
          Alert: {
            where: { status: 'ACTIVE' },
          },
          WorkCenter: {
            include: {
              ProductionOrder: {
                where: { status: 'IN_PROGRESS' },
              },
            },
          },
        },
      });

      expect(multiContext?.Metric).toHaveLength(1);
      expect(multiContext?.Alert).toHaveLength(1);
      expect(multiContext?.WorkCenter.ProductionOrder).toHaveLength(1);
    });

    it('should provide hierarchical context for site-level queries', async () => {
      const { enterprise, site, area, workCenter, workUnit } = await createTestHierarchy();

      // Create additional work units
      const workUnit2 = await createTestWorkUnit(workCenter.id, { 
        name: 'Site Test Unit 2',
        code: 'STU-002',
      });

      // Create site-wide metrics
      await prisma.metric.createMany({
        data: [
          {
            id: `metric-pr-1-${Date.now()}`,
            workUnitId: workUnit.id,
            name: 'PRODUCTION_RATE',
            value: 150,
            unit: 'units/hour',
            source: 'system',
            timestamp: new Date(),
          },
          {
            id: `metric-pr-2-${Date.now()}`,
            workUnitId: workUnit2.id,
            name: 'PRODUCTION_RATE',
            value: 180,
            unit: 'units/hour',
            source: 'system',
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
                  WorkUnit: {
                    include: {
                      Metric: {
                        where: { name: 'PRODUCTION_RATE' },
                        orderBy: { timestamp: 'desc' },
                        take: 1,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      expect(siteContext?.Area).toHaveLength(1);
      expect(siteContext?.Area[0].WorkCenter).toHaveLength(1);
      expect(siteContext?.Area[0].WorkCenter[0].WorkUnit).toHaveLength(2);
      
      // Verify all work units have production rate metrics
      const allWorkUnits = siteContext?.Area[0].WorkCenter[0].WorkUnit || [];
      expect(allWorkUnits.every(wu => wu.Metric.length > 0)).toBe(true);
    });
  });
});