import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/test-utils/setup-integration';

describe('Service Layer Integration Tests', () => {
  describe('Equipment Service Tests', () => {
    it('should manage equipment lifecycle', async () => {
      // Create equipment
      const equipment = await prisma.equipment.create({
        data: {
          name: 'Service Test Machine',
          type: 'CNC',
          manufacturerCode: 'SVC-001',
          serialNumber: 'SN-SVC-001',
          status: 'operational',
          installationDate: new Date(),
          specifications: {
            maxSpeed: 5000,
            powerConsumption: 15,
            dimensions: '2x3x2m',
          },
        },
      });

      // Add performance metrics
      await prisma.performanceMetric.createMany({
        data: [
          {
            equipmentId: equipment.id,
            timestamp: new Date(),
            oeeScore: 0.85,
            availability: 0.90,
            performance: 0.90,
            quality: 0.95,
          },
          {
            equipmentId: equipment.id,
            timestamp: new Date(Date.now() - 60 * 60 * 1000),
            oeeScore: 0.80,
            availability: 0.85,
            performance: 0.85,
            quality: 0.95,
          },
        ],
      });

      // Calculate average OEE
      const metrics = await prisma.performanceMetric.findMany({
        where: { equipmentId: equipment.id },
      });

      const avgOEE = metrics.reduce((sum, m) => sum + m.oeeScore, 0) / metrics.length;
      expect(avgOEE).toBeCloseTo(0.825, 2);

      // Create maintenance record
      await prisma.maintenanceRecord.create({
        data: {
          equipmentId: equipment.id,
          maintenanceType: 'preventive',
          description: 'Regular maintenance',
          technician: 'Tech 1',
          startTime: new Date(),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          status: 'completed',
        },
      });

      // Verify equipment with relations
      const fullEquipment = await prisma.equipment.findUnique({
        where: { id: equipment.id },
        include: {
          performanceMetrics: true,
          maintenanceRecords: true,
        },
      });

      expect(fullEquipment?.performanceMetrics).toHaveLength(2);
      expect(fullEquipment?.maintenanceRecords).toHaveLength(1);
    });
  });

  describe('Alert Service Tests', () => {
    it('should manage alert lifecycle', async () => {
      const equipment = await createTestEquipment();

      // Create multiple alerts
      const alerts = await prisma.alert.createMany({
        data: [
          {
            equipmentId: equipment.id,
            alertType: 'maintenance',
            severity: 'high',
            message: 'Urgent maintenance required',
            status: 'active',
          },
          {
            equipmentId: equipment.id,
            alertType: 'performance',
            severity: 'medium',
            message: 'OEE below threshold',
            status: 'active',
          },
          {
            equipmentId: equipment.id,
            alertType: 'quality',
            severity: 'low',
            message: 'Quality variance detected',
            status: 'active',
          },
        ],
      });

      // Group alerts by severity
      const alertsBySeverity = await prisma.alert.groupBy({
        by: ['severity'],
        where: {
          equipmentId: equipment.id,
          status: 'active',
        },
        _count: true,
      });

      expect(alertsBySeverity).toHaveLength(3);
      expect(alertsBySeverity.find(a => a.severity === 'high')?._count).toBe(1);

      // Acknowledge high severity alert
      const highAlert = await prisma.alert.findFirst({
        where: {
          equipmentId: equipment.id,
          severity: 'high',
          status: 'active',
        },
      });

      if (highAlert) {
        await prisma.alert.update({
          where: { id: highAlert.id },
          data: {
            status: 'acknowledged',
            acknowledgedBy: 'Operator 1',
            acknowledgedAt: new Date(),
          },
        });
      }

      // Check active alerts count
      const activeAlerts = await prisma.alert.count({
        where: {
          equipmentId: equipment.id,
          status: 'active',
        },
      });

      expect(activeAlerts).toBe(2);
    });
  });

  describe('Metrics Service Tests', () => {
    it('should handle time-series metrics', async () => {
      const equipment = await createTestEquipment();
      const now = new Date();

      // Generate hourly metrics for 24 hours
      const metrics = [];
      for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        
        // Temperature varies between 65-75°C with some pattern
        const baseTemp = 70;
        const variation = Math.sin(i / 4) * 5;
        
        metrics.push({
          equipmentId: equipment.id,
          name: 'temperature',
          value: baseTemp + variation,
          unit: '°C',
          timestamp,
          tags: { sensor: 'TEMP-001', location: 'bearing' },
        });

        // Pressure varies between 100-120 psi
        metrics.push({
          equipmentId: equipment.id,
          name: 'pressure',
          value: 110 + Math.random() * 10,
          unit: 'psi',
          timestamp,
          tags: { sensor: 'PRES-001', location: 'hydraulic' },
        });
      }

      await prisma.metric.createMany({ data: metrics });

      // Query temperature metrics for last 12 hours
      const recentTemp = await prisma.metric.findMany({
        where: {
          equipmentId: equipment.id,
          name: 'temperature',
          timestamp: {
            gte: new Date(now.getTime() - 12 * 60 * 60 * 1000),
          },
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(recentTemp).toHaveLength(12);

      // Calculate statistics
      const tempStats = await prisma.metric.aggregate({
        where: {
          equipmentId: equipment.id,
          name: 'temperature',
        },
        _avg: { value: true },
        _max: { value: true },
        _min: { value: true },
        _count: true,
      });

      expect(tempStats._count).toBe(24);
      expect(tempStats._avg.value).toBeGreaterThan(65);
      expect(tempStats._avg.value).toBeLessThan(75);
    });
  });

  describe('Production Workflow Tests', () => {
    it('should handle complete production cycle', async () => {
      // Setup production line
      const line = await prisma.productionLine.create({
        data: {
          name: 'Workflow Test Line',
          department: 'Manufacturing',
          status: 'active',
        },
      });

      // Add equipment to line
      const equipment1 = await createTestEquipment({
        name: 'Workflow Machine 1',
      });
      const equipment2 = await createTestEquipment({
        name: 'Workflow Machine 2',
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
          orderNumber: 'WF-001',
          productionLineId: line.id,
          product: 'Test Widget',
          quantity: 1000,
          targetStartDate: new Date(),
          targetEndDate: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
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

      // Simulate production metrics over 4 hours
      const productionMetrics = [];
      for (let hour = 0; hour < 4; hour++) {
        for (const eq of [equipment1, equipment2]) {
          productionMetrics.push({
            equipmentId: eq.id,
            timestamp: new Date(Date.now() - (4 - hour) * 60 * 60 * 1000),
            oeeScore: 0.85 - (hour * 0.02), // Slight degradation
            availability: 0.90,
            performance: 0.88 - (hour * 0.02),
            quality: 0.96,
            totalParts: 125 * (hour + 1),
            goodParts: 120 * (hour + 1),
          });
        }
      }
      await prisma.performanceMetric.createMany({ data: productionMetrics });

      // Add quality checks
      await prisma.qualityCheck.createMany({
        data: [
          {
            productionOrderId: order.id,
            checkType: 'first-article',
            inspector: 'QC Tech 1',
            timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
            result: 'pass',
            notes: 'All dimensions within tolerance',
          },
          {
            productionOrderId: order.id,
            checkType: 'in-process',
            inspector: 'QC Tech 2',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            result: 'pass',
            measurements: {
              sample1: { length: 10.02, width: 5.01 },
              sample2: { length: 10.01, width: 4.99 },
            },
          },
        ],
      });

      // Complete production
      const completedOrder = await prisma.productionOrder.update({
        where: { id: order.id },
        data: {
          status: 'completed',
          actualEndDate: new Date(),
        },
        include: {
          productionLine: {
            include: {
              equipment: {
                include: {
                  performanceMetrics: {
                    where: {
                      timestamp: {
                        gte: new Date(Date.now() - 4 * 60 * 60 * 1000),
                      },
                    },
                  },
                },
              },
            },
          },
          qualityChecks: true,
        },
      });

      // Verify results
      expect(completedOrder.status).toBe('completed');
      expect(completedOrder.qualityChecks).toHaveLength(2);
      expect(completedOrder.productionLine.equipment).toHaveLength(2);
      
      // Calculate total production
      const totalParts = completedOrder.productionLine.equipment
        .flatMap(eq => eq.performanceMetrics)
        .reduce((sum, m) => sum + (m.goodParts || 0), 0);
      
      expect(totalParts).toBe(960); // 120 * 4 * 2 equipment
    });
  });
});