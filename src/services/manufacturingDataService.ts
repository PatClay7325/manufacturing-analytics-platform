/**
 * Manufacturing Data Service
 * Comprehensive service for accessing manufacturing analytics data
 * Integrates with the enhanced Prisma schema for dashboard data queries
 */

import { prisma } from '@/lib/database';

export interface TimeRangeOptions {
  timeRange?: '1h' | '24h' | '7d' | '30d';
  startDate?: Date;
  endDate?: Date;
}

export interface FilterOptions {
  workUnitId?: string;
  shift?: string;
  productType?: string;
  equipmentType?: string;
  riskLevel?: string;
}

export class ManufacturingDataService {
  
  /**
   * Get comprehensive OEE metrics
   */
  static async getOEEMetrics(filters: FilterOptions & TimeRangeOptions = {}) {
    const { timeRange = '24h', workUnitId, shift, productType } = filters;
    
    // Calculate time range
    const { startDate, endDate } = this.calculateTimeRange(timeRange, filters.startDate, filters.endDate);
    
    // Build where clause
    const whereClause: any = {
      timestamp: { gte: startDate, lte: endDate },
    };
    
    if (workUnitId && workUnitId !== 'all') whereClause.workUnitId = workUnitId;
    if (shift && shift !== 'all') whereClause.shift = shift;
    if (productType && productType !== 'all') whereClause.productType = productType;

    const [current, trends, aggregated, byShift, byProduct] = await Promise.all([
      // Current metrics
      prisma.performanceMetric.findFirst({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        include: { WorkUnit: { select: { id: true, name: true, code: true, equipmentType: true } } }
      }),
      
      // Historical trends
      prisma.performanceMetric.findMany({
        where: whereClause,
        orderBy: { timestamp: 'asc' },
        select: {
          timestamp: true,
          availability: true,
          performance: true,
          quality: true,
          oeeScore: true,
          throughputRate: true,
          firstPassYield: true,
          WorkUnit: { select: { name: true, code: true } }
        }
      }),
      
      // Aggregated metrics
      prisma.performanceMetric.aggregate({
        where: whereClause,
        _avg: {
          availability: true,
          performance: true,
          quality: true,
          oeeScore: true,
          throughputRate: true,
          firstPassYield: true,
        },
        _min: { oeeScore: true },
        _max: { oeeScore: true }
      }),
      
      // By shift breakdown
      prisma.performanceMetric.groupBy({
        by: ['shift'],
        where: whereClause,
        _avg: { availability: true, performance: true, quality: true, oeeScore: true },
        _count: { id: true }
      }),
      
      // By product breakdown
      prisma.performanceMetric.groupBy({
        by: ['productType'],
        where: whereClause,
        _avg: { availability: true, performance: true, quality: true, oeeScore: true },
        _count: { id: true }
      })
    ]);

    return {
      current,
      trends,
      aggregated: {
        avgAvailability: aggregated._avg.availability,
        avgPerformance: aggregated._avg.performance,
        avgQuality: aggregated._avg.quality,
        avgOEE: aggregated._avg.oeeScore,
        avgThroughput: aggregated._avg.throughputRate,
        avgFirstPassYield: aggregated._avg.firstPassYield,
        minOEE: aggregated._min.oeeScore,
        maxOEE: aggregated._max.oeeScore,
      },
      byShift,
      byProduct,
      metadata: { timeRange, startDate, endDate, totalRecords: trends.length }
    };
  }

  /**
   * Get equipment health and reliability metrics
   */
  static async getEquipmentHealth(filters: FilterOptions = {}) {
    const { workUnitId, riskLevel } = filters;
    
    const whereClause: any = {};
    if (workUnitId && workUnitId !== 'all') whereClause.workUnitId = workUnitId;
    if (riskLevel && riskLevel !== 'all') whereClause.riskLevel = riskLevel;

    const [equipmentHealth, aggregated, riskDistribution, maintenanceDue] = await Promise.all([
      // Current equipment health
      prisma.equipmentHealth.findMany({
        where: whereClause,
        include: { WorkUnit: true },
        orderBy: { overallHealth: 'asc' }
      }),
      
      // Aggregated health metrics
      prisma.equipmentHealth.aggregate({
        where: whereClause,
        _avg: {
          overallHealth: true,
          mtbf: true,
          mttr: true,
          availability: true,
          reliability: true,
        },
        _count: { id: true }
      }),
      
      // Risk distribution
      prisma.equipmentHealth.groupBy({
        by: ['riskLevel'],
        where: whereClause,
        _count: { id: true },
        _avg: { overallHealth: true }
      }),
      
      // Maintenance due soon
      prisma.equipmentHealth.findMany({
        where: {
          ...whereClause,
          nextMaintenanceDue: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
          }
        },
        include: { WorkUnit: { select: { name: true, code: true, equipmentType: true } } },
        orderBy: { nextMaintenanceDue: 'asc' }
      })
    ]);

    return {
      equipmentHealth,
      aggregated: {
        avgOverallHealth: aggregated._avg.overallHealth,
        avgMTBF: aggregated._avg.mtbf,
        avgMTTR: aggregated._avg.mttr,
        avgAvailability: aggregated._avg.availability,
        avgReliability: aggregated._avg.reliability,
        totalEquipment: aggregated._count.id,
      },
      riskDistribution,
      maintenanceDue
    };
  }

  /**
   * Get production metrics
   */
  static async getProductionMetrics(filters: FilterOptions & TimeRangeOptions = {}) {
    const { timeRange = '24h', workUnitId, shift, productType } = filters;
    const { startDate, endDate } = this.calculateTimeRange(timeRange, filters.startDate, filters.endDate);
    
    const whereClause: any = {
      timestamp: { gte: startDate, lte: endDate },
    };
    
    if (workUnitId && workUnitId !== 'all') whereClause.workUnitId = workUnitId;
    if (shift && shift !== 'all') whereClause.shift = shift;
    if (productType && productType !== 'all') whereClause.productType = productType;

    const [current, trends, aggregated, topPerformers] = await Promise.all([
      // Current production
      prisma.performanceMetric.findFirst({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        include: { WorkUnit: true }
      }),
      
      // Production trends
      prisma.performanceMetric.findMany({
        where: whereClause,
        orderBy: { timestamp: 'asc' },
        select: {
          timestamp: true,
          totalParts: true,
          goodParts: true,
          rejectedParts: true,
          throughputRate: true,
          firstPassYield: true,
          shift: true,
          productType: true,
          WorkUnit: { select: { name: true } }
        }
      }),
      
      // Aggregated production
      prisma.performanceMetric.aggregate({
        where: whereClause,
        _sum: { totalParts: true, goodParts: true, rejectedParts: true },
        _avg: { throughputRate: true, firstPassYield: true, scrapRate: true }
      }),
      
      // Top performers
      prisma.performanceMetric.groupBy({
        by: ['workUnitId'],
        where: whereClause,
        _avg: { oeeScore: true, throughputRate: true },
        _sum: { totalParts: true },
        orderBy: { _avg: { oeeScore: 'desc' } },
        take: 10
      })
    ]);

    return {
      current,
      trends,
      aggregated: {
        totalPartsProduced: aggregated._sum.totalParts,
        totalGoodParts: aggregated._sum.goodParts,
        totalRejectedParts: aggregated._sum.rejectedParts,
        avgThroughputRate: aggregated._avg.throughputRate,
        avgFirstPassYield: aggregated._avg.firstPassYield,
        avgScrapRate: aggregated._avg.scrapRate,
      },
      topPerformers
    };
  }

  /**
   * Get quality control metrics
   */
  static async getQualityMetrics(filters: FilterOptions & TimeRangeOptions = {}) {
    const { timeRange = '24h', workUnitId } = filters;
    const { startDate, endDate } = this.calculateTimeRange(timeRange, filters.startDate, filters.endDate);
    
    const whereClause: any = {
      timestamp: { gte: startDate, lte: endDate },
    };
    
    if (workUnitId && workUnitId !== 'all') whereClause.workUnitId = workUnitId;

    const [qualityData, controlChartData, defectAnalysis] = await Promise.all([
      // Quality measurements
      prisma.qualityMetric.findMany({
        where: whereClause,
        orderBy: { timestamp: 'asc' },
        include: { WorkUnit: { select: { name: true } } }
      }),
      
      // Control chart data by parameter
      prisma.qualityMetric.groupBy({
        by: ['parameter'],
        where: whereClause,
        _avg: { value: true, deviation: true },
        _count: { id: true }
      }),
      
      // Defect analysis
      prisma.qualityMetric.groupBy({
        by: ['defectType'],
        where: {
          ...whereClause,
          defectType: { not: null }
        },
        _count: { id: true }
      })
    ]);

    return {
      qualityData,
      controlChartData,
      defectAnalysis,
      summary: {
        totalMeasurements: qualityData.length,
        withinSpec: qualityData.filter(q => q.isWithinSpec).length,
        outOfSpec: qualityData.filter(q => !q.isWithinSpec).length,
        inControl: qualityData.filter(q => q.isInControl).length,
        outOfControl: qualityData.filter(q => !q.isInControl).length,
      }
    };
  }

  /**
   * Get active alerts
   */
  static async getActiveAlerts(filters: FilterOptions = {}) {
    const { workUnitId } = filters;
    
    const whereClause: any = {
      status: { in: ['active', 'acknowledged'] }
    };
    
    if (workUnitId && workUnitId !== 'all') whereClause.workUnitId = workUnitId;

    const [alerts, alertStats, severityBreakdown] = await Promise.all([
      // Active alerts
      prisma.alert.findMany({
        where: whereClause,
        orderBy: [
          { severity: 'asc' }, // Critical first
          { timestamp: 'desc' }
        ],
        include: { WorkUnit: { select: { name: true, code: true } } },
        take: 50
      }),
      
      // Alert statistics
      prisma.alert.aggregate({
        where: whereClause,
        _count: { id: true },
        _avg: { resolutionTime: true }
      }),
      
      // Severity breakdown
      prisma.alert.groupBy({
        by: ['severity'],
        where: whereClause,
        _count: { id: true }
      })
    ]);

    return {
      alerts,
      stats: {
        totalActiveAlerts: alertStats._count.id,
        avgResolutionTime: alertStats._avg.resolutionTime,
      },
      severityBreakdown
    };
  }

  /**
   * Get maintenance schedule and history
   */
  static async getMaintenanceData(filters: FilterOptions & TimeRangeOptions = {}) {
    const { timeRange = '30d', workUnitId } = filters;
    const { startDate, endDate } = this.calculateTimeRange(timeRange, filters.startDate, filters.endDate);
    
    const whereClause: any = {
      startTime: { gte: startDate, lte: endDate },
    };
    
    if (workUnitId && workUnitId !== 'all') whereClause.workUnitId = workUnitId;

    const [recentMaintenance, upcomingMaintenance, maintenanceStats] = await Promise.all([
      // Recent maintenance
      prisma.maintenanceRecord.findMany({
        where: whereClause,
        orderBy: { startTime: 'desc' },
        include: { WorkUnit: { select: { name: true, code: true } } },
        take: 20
      }),
      
      // Upcoming maintenance
      prisma.equipmentHealth.findMany({
        where: {
          ...(workUnitId && workUnitId !== 'all' ? { workUnitId } : {}),
          nextMaintenanceDue: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
          }
        },
        include: { WorkUnit: { select: { name: true, code: true } } },
        orderBy: { nextMaintenanceDue: 'asc' }
      }),
      
      // Maintenance statistics
      prisma.maintenanceRecord.aggregate({
        where: whereClause,
        _avg: { actualDuration: true, totalCost: true },
        _sum: { totalCost: true },
        _count: { id: true }
      })
    ]);

    return {
      recentMaintenance,
      upcomingMaintenance,
      stats: {
        totalMaintenanceJobs: maintenanceStats._count.id,
        avgDuration: maintenanceStats._avg.actualDuration,
        avgCost: maintenanceStats._avg.totalCost,
        totalCost: maintenanceStats._sum.totalCost,
      }
    };
  }

  /**
   * Get work units (equipment) list
   */
  static async getWorkUnits(filters: FilterOptions = {}) {
    const { equipmentType } = filters;
    
    const whereClause: any = {};
    if (equipmentType && equipmentType !== 'all') whereClause.equipmentType = equipmentType;

    return await prisma.workUnit.findMany({
      where: whereClause,
      include: {
        WorkCenter: {
          include: {
            Area: {
              include: {
                Site: true
              }
            }
          }
        },
        EquipmentHealth: true,
      },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Get dashboard summary data
   */
  static async getDashboardSummary(filters: FilterOptions & TimeRangeOptions = {}) {
    const { timeRange = '24h' } = filters;
    
    const [oeeData, healthData, productionData, alertData] = await Promise.all([
      this.getOEEMetrics(filters),
      this.getEquipmentHealth(filters),
      this.getProductionMetrics(filters),
      this.getActiveAlerts(filters)
    ]);

    return {
      oee: oeeData.aggregated,
      health: healthData.aggregated,
      production: productionData.aggregated,
      alerts: alertData.stats,
      timestamp: new Date(),
      timeRange
    };
  }

  /**
   * Helper method to calculate time ranges
   */
  private static calculateTimeRange(timeRange: string, startDate?: Date, endDate?: Date) {
    if (startDate && endDate) {
      return { startDate, endDate };
    }

    const now = new Date();
    let calculatedStartDate: Date;
    
    switch (timeRange) {
      case '1h':
        calculatedStartDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        calculatedStartDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        calculatedStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        calculatedStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        calculatedStartDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    return { startDate: calculatedStartDate, endDate: now };
  }
}

export default ManufacturingDataService;