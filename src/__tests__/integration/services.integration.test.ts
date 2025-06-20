import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/test-utils/setup-integration';

describe('Service Layer Integration Tests', () => {
  describe('Equipment Service Tests', () => {
    it('should manage equipment lifecycle', async () => {
      // Create hierarchy and work unit
      const { workCenter } = await createTestHierarchy();
      
      const workUnit = await prisma.workUnit.create({
        data: {
          id: `wu-svc-${Date.now()}`,
          name: 'Service Test Machine',
          code: 'SVC-001',
          equipmentType: 'CNC',
          manufacturerCode: 'SVC-MFG-001',
          model: 'CNC-5000',
          serialNumber: 'SN-SVC-001',
          status: 'OPERATIONAL',
          installationDate: new Date(),
          updatedAt: new Date(),
          workCenterId: workCenter.id,
          description: 'High-speed CNC machine for precision parts',
        },
      });

      // Add performance metrics
      await prisma.performanceMetric.createMany({
        data: [
          {
            workUnitId: workUnit.id,
            timestamp: new Date(),
            oeeScore: 0.85,
            availability: 90,
            performance: 90,
            quality: 95,
          },
          {
            workUnitId: workUnit.id,
            timestamp: new Date(Date.now() - 60 * 60 * 1000),
            oeeScore: 0.80,
            availability: 85,
            performance: 85,
            quality: 95,
          },
        ],
      });

      // Calculate average OEE
      const metrics = await prisma.performanceMetric.findMany({
        where: { workUnitId: workUnit.id },
      });

      const avgOEE = metrics.reduce((sum, m) => sum + (m.oeeScore || 0), 0) / metrics.length;
      expect(avgOEE).toBeCloseTo(0.825, 2);

      // Create maintenance record
      await prisma.maintenanceRecord.create({
        data: {
          workUnitId: workUnit.id,
          maintenanceType: 'PREVENTIVE',
          description: 'Regular maintenance',
          technician: 'Tech 1',
          startTime: new Date(),
          endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
          status: 'COMPLETED',
        },
      });

      // Verify work unit with relations
      const fullWorkUnit = await prisma.workUnit.findUnique({
        where: { id: workUnit.id },
        include: {
          PerformanceMetric: true,
          MaintenanceRecord: true,
        },
      });

      expect(fullWorkUnit?.PerformanceMetric).toHaveLength(2);
      expect(fullWorkUnit?.MaintenanceRecord).toHaveLength(1);
    });
  });

  describe('Alert Service Tests', () => {
    it('should manage alert lifecycle', async () => {
      const { workUnit } = await createTestHierarchy();

      // Create multiple alerts
      const alerts = await prisma.alert.createMany({
        data: [
          {
            workUnitId: workUnit.id,
            alertType: 'MAINTENANCE',
            severity: 'HIGH',
            message: 'Urgent maintenance required',
            status: 'ACTIVE',
          },
          {
            workUnitId: workUnit.id,
            alertType: 'PERFORMANCE',
            severity: 'MEDIUM',
            message: 'OEE below threshold',
            status: 'ACTIVE',
          },
          {
            workUnitId: workUnit.id,
            alertType: 'QUALITY',
            severity: 'LOW',
            message: 'Quality check reminder',
            status: 'RESOLVED',
          },
        ],
      });

      // Query active alerts
      const activeAlerts = await prisma.alert.findMany({
        where: {
          workUnitId: workUnit.id,
          status: 'ACTIVE',
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      expect(activeAlerts).toHaveLength(2);
      // First created alert was MAINTENANCE with HIGH severity
      expect(activeAlerts[0].severity).toBe('HIGH');
      expect(activeAlerts[0].alertType).toBe('MAINTENANCE');

      // Acknowledge alert
      const acknowledged = await prisma.alert.updateMany({
        where: {
          workUnitId: workUnit.id,
          alertType: 'MAINTENANCE',
          status: 'ACTIVE',
        },
        data: {
          status: 'ACKNOWLEDGED',
          acknowledgedBy: 'operator1',
          acknowledgedAt: new Date(),
        },
      });

      expect(acknowledged.count).toBe(1);

      // Resolve alert
      const resolved = await prisma.alert.updateMany({
        where: {
          workUnitId: workUnit.id,
          status: 'ACKNOWLEDGED',
        },
        data: {
          status: 'RESOLVED',
          resolvedBy: 'technician1',
          resolvedAt: new Date(),
        },
      });

      expect(resolved.count).toBe(1);

      // Verify alert status distribution
      const alertStats = await prisma.alert.groupBy({
        by: ['status'],
        where: { workUnitId: workUnit.id },
        _count: { status: true },
      });

      const statusMap = alertStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {} as Record<string, number>);

      expect(statusMap['ACTIVE']).toBe(1);
      expect(statusMap['RESOLVED']).toBe(2);
    });
  });

  describe('Metrics Service Tests', () => {
    it('should handle time-series metrics', async () => {
      const { workUnit } = await createTestHierarchy();
      const now = new Date();

      // Create time-series data
      const metricsData = [];
      const baseTime = Date.now();
      for (let i = 0; i < 24; i++) { // 24 hours of data
        metricsData.push({
          id: `metric-temp-${baseTime}-${i}`,
          workUnitId: workUnit.id,
          name: 'TEMPERATURE',
          value: 70 + Math.sin(i * Math.PI / 12) * 5 + Math.random() * 2,
          unit: '°C',
          source: 'sensor',
          timestamp: new Date(now.getTime() - i * 60 * 60 * 1000),
        });
        
        metricsData.push({
          id: `metric-press-${baseTime}-${i}-p`,
          workUnitId: workUnit.id,
          name: 'PRESSURE',
          value: 100 + Math.cos(i * Math.PI / 12) * 10 + Math.random() * 5,
          unit: 'PSI',
          source: 'sensor',
          timestamp: new Date(now.getTime() - i * 60 * 60 * 1000),
        });
      }

      await prisma.metric.createMany({
        data: metricsData,
      });

      // Query temperature metrics
      const tempMetrics = await prisma.metric.findMany({
        where: {
          workUnitId: workUnit.id,
          name: 'TEMPERATURE',
          timestamp: {
            gt: new Date(now.getTime() - 12 * 60 * 60 * 1000), // Last 12 hours (exclusive)
          },
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      expect(tempMetrics.length).toBeGreaterThan(0);
      expect(tempMetrics.length).toBeLessThanOrEqual(12);

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
      const { area } = await createTestHierarchy();
      
      // Create additional work center
      const workCenter2 = await createTestWorkCenter(area.id, {
        name: 'Assembly Center',
        code: 'AC-001',
      });

      // Create work units for the new center
      const assemblyUnit = await createTestWorkUnit(workCenter2.id, {
        name: 'Assembly Robot 1',
        code: 'AR-001',
        equipmentType: 'ROBOT',
      });

      // Create production order
      const order = await prisma.productionOrder.create({
        data: {
          orderNumber: 'PO-SVC-001',
          workCenterId: workCenter2.id,
          product: 'Complex Assembly',
          quantity: 100,
          targetStartDate: new Date(),
          targetEndDate: new Date(Date.now() + 8 * 60 * 60 * 1000),
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

      // Create performance data during production
      await prisma.performanceMetric.create({
        data: {
          workUnitId: assemblyUnit.id,
          timestamp: new Date(),
          availability: 92,
          performance: 88,
          quality: 98,
          oeeScore: 0.79,
          totalParts: 50,
          goodParts: 49,
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

      // Verify complete workflow
      const finalOrder = await prisma.productionOrder.findUnique({
        where: { id: order.id },
        include: {
          qualityChecks: true,
          WorkCenter: {
            include: {
              WorkUnit: {
                include: {
                  PerformanceMetric: {
                    where: {
                      timestamp: {
                        gte: completed.actualStartDate || new Date(),
                        lte: completed.actualEndDate || new Date(),
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      expect(finalOrder?.status).toBe('COMPLETED');
      expect(finalOrder?.qualityChecks).toHaveLength(2);
      expect(finalOrder?.qualityChecks.every(qc => qc.result === 'PASS')).toBe(true);
      expect(finalOrder?.WorkCenter.WorkUnit.length).toBeGreaterThan(0);
      
      const workUnitWithMetrics = finalOrder?.WorkCenter.WorkUnit.find(
        wu => wu.id === assemblyUnit.id
      );
      expect(workUnitWithMetrics?.PerformanceMetric.length).toBeGreaterThan(0);
    });
  });
});