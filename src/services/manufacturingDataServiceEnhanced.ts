/**
 * Enhanced Manufacturing Data Service
 * Includes data validation, error handling, and proper sanitization
 */

import { prisma } from '@/lib/database';
import { 
  ManufacturingDataValidator, 
  DataSanitizer,
  DataValidationError 
} from '@/utils/dataValidation';
import {
  asyncHandler,
  handlePrismaError,
  ErrorLogger,
  NotFoundError,
  ValidationError,
  Result,
  success,
  failure,
  retry
} from '@/utils/errorHandling';

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
   * Get comprehensive OEE metrics with validation and error handling
   */
  static async getOEEMetrics(
    filters: FilterOptions & TimeRangeOptions = {}
  ): Promise<Result<any>> {
    try {
      // Validate input filters
      this.validateFilters(filters);
      
      const { timeRange = '24h', workUnitId, shift, productType } = filters;
      
      // Calculate time range
      const { startDate, endDate } = this.calculateTimeRange(
        timeRange, 
        filters.startDate, 
        filters.endDate
      );
      
      // Build where clause
      const whereClause: any = {
        timestamp: { gte: startDate, lte: endDate },
      };
      
      if (workUnitId && workUnitId !== 'all') {
        whereClause.workUnitId = workUnitId;
        // Verify work unit exists
        await this.verifyWorkUnitExists(workUnitId);
      }
      
      if (shift && shift !== 'all') whereClause.shift = shift;
      if (productType && productType !== 'all') whereClause.productType = productType;

      // Execute queries with retry for transient failures
      const [current, trends, aggregated, byShift, byProduct] = await retry(
        async () => Promise.all([
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
        ]),
        { 
          maxAttempts: 3,
          onRetry: (error, attempt) => {
            ErrorLogger.logWarning(`OEE metrics query retry attempt ${attempt}`, error);
          }
        }
      );

      // Validate data integrity
      if (current) {
        try {
          ManufacturingDataValidator.validateOEEMetrics(current);
        } catch (error) {
          if (error instanceof DataValidationError) {
            ErrorLogger.logWarning('Invalid OEE data detected, sanitizing...', {
              workUnitId: current.workUnitId,
              error: error.message
            });
            // Sanitize the data
            Object.assign(current, DataSanitizer.sanitizeOEEMetrics(current));
          }
        }
      }

      const result = {
        current,
        trends: trends.map(trend => {
          try {
            ManufacturingDataValidator.validateOEEMetrics(trend);
            return trend;
          } catch (error) {
            return DataSanitizer.sanitizeOEEMetrics(trend);
          }
        }),
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
        metadata: { 
          timeRange, 
          startDate, 
          endDate, 
          totalRecords: trends.length,
          dataQuality: this.assessDataQuality(trends)
        }
      };

      return success(result);
    } catch (error) {
      ErrorLogger.log(error as Error, { method: 'getOEEMetrics', filters });
      return failure(handlePrismaError(error));
    }
  }

  /**
   * Get equipment health and reliability metrics with validation
   */
  static async getEquipmentHealth(
    filters: FilterOptions = {}
  ): Promise<Result<any>> {
    try {
      this.validateFilters(filters);
      
      const { workUnitId, riskLevel } = filters;
      
      const whereClause: any = {};
      if (workUnitId && workUnitId !== 'all') {
        whereClause.workUnitId = workUnitId;
        await this.verifyWorkUnitExists(workUnitId);
      }
      
      if (riskLevel && riskLevel !== 'all') {
        if (!['low', 'medium', 'high'].includes(riskLevel)) {
          throw new ValidationError(`Invalid risk level: ${riskLevel}`);
        }
        whereClause.riskLevel = riskLevel;
      }

      const [equipmentHealth, aggregated, riskDistribution, maintenanceDue] = await retry(
        async () => Promise.all([
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
        ])
      );

      // Validate and sanitize equipment health data
      const validatedHealth = equipmentHealth.map(equipment => {
        try {
          ManufacturingDataValidator.validateEquipmentHealth(equipment);
          return equipment;
        } catch (error) {
          ErrorLogger.logWarning('Invalid equipment health data', {
            workUnitId: equipment.workUnitId,
            error: error.message
          });
          return {
            ...equipment,
            overallHealth: DataSanitizer.clampPercentage(equipment.overallHealth),
            mechanicalHealth: DataSanitizer.clampPercentage(equipment.mechanicalHealth),
            electricalHealth: DataSanitizer.clampPercentage(equipment.electricalHealth),
            softwareHealth: DataSanitizer.clampPercentage(equipment.softwareHealth),
            availability: DataSanitizer.clampPercentage(equipment.availability),
            reliability: DataSanitizer.clampPercentage(equipment.reliability),
          };
        }
      });

      const result = {
        equipmentHealth: validatedHealth,
        aggregated: {
          avgOverallHealth: aggregated._avg.overallHealth,
          avgMTBF: aggregated._avg.mtbf,
          avgMTTR: aggregated._avg.mttr,
          avgAvailability: aggregated._avg.availability,
          avgReliability: aggregated._avg.reliability,
          totalEquipment: aggregated._count.id,
        },
        riskDistribution,
        maintenanceDue,
        alerts: this.generateHealthAlerts(validatedHealth)
      };

      return success(result);
    } catch (error) {
      ErrorLogger.log(error as Error, { method: 'getEquipmentHealth', filters });
      return failure(handlePrismaError(error));
    }
  }

  /**
   * Get production metrics with validation
   */
  static async getProductionMetrics(
    filters: FilterOptions & TimeRangeOptions = {}
  ): Promise<Result<any>> {
    try {
      this.validateFilters(filters);
      
      const { timeRange = '24h', workUnitId, shift, productType } = filters;
      const { startDate, endDate } = this.calculateTimeRange(
        timeRange, 
        filters.startDate, 
        filters.endDate
      );
      
      const whereClause: any = {
        timestamp: { gte: startDate, lte: endDate },
      };
      
      if (workUnitId && workUnitId !== 'all') {
        whereClause.workUnitId = workUnitId;
        await this.verifyWorkUnitExists(workUnitId);
      }
      if (shift && shift !== 'all') whereClause.shift = shift;
      if (productType && productType !== 'all') whereClause.productType = productType;

      const [current, trends, aggregated, topPerformers] = await retry(
        async () => Promise.all([
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
        ])
      );

      // Validate production counts
      const validatedTrends = trends.map(trend => {
        try {
          ManufacturingDataValidator.validateProductionCounts(trend);
          return trend;
        } catch (error) {
          ErrorLogger.logWarning('Invalid production data', {
            timestamp: trend.timestamp,
            error: error.message
          });
          return DataSanitizer.sanitizeProductionCounts(trend);
        }
      });

      const result = {
        current: current ? DataSanitizer.sanitizeProductionCounts(current) : null,
        trends: validatedTrends,
        aggregated: {
          totalPartsProduced: aggregated._sum.totalParts || 0,
          totalGoodParts: aggregated._sum.goodParts || 0,
          totalRejectedParts: aggregated._sum.rejectedParts || 0,
          avgThroughputRate: aggregated._avg.throughputRate || 0,
          avgFirstPassYield: aggregated._avg.firstPassYield || 0,
          avgScrapRate: aggregated._avg.scrapRate || 0,
          efficiency: this.calculateProductionEfficiency(aggregated)
        },
        topPerformers,
        qualityMetrics: this.calculateQualityMetrics(validatedTrends)
      };

      return success(result);
    } catch (error) {
      ErrorLogger.log(error as Error, { method: 'getProductionMetrics', filters });
      return failure(handlePrismaError(error));
    }
  }

  /**
   * Helper method to validate filters
   */
  private static validateFilters(filters: FilterOptions & TimeRangeOptions): void {
    // Validate time range
    if (filters.startDate && filters.endDate) {
      if (filters.startDate > filters.endDate) {
        throw new ValidationError('Start date must be before end date');
      }
      if (filters.endDate > new Date()) {
        throw new ValidationError('End date cannot be in the future');
      }
    }

    // Validate shift
    if (filters.shift && filters.shift !== 'all') {
      if (!['A', 'B', 'C'].includes(filters.shift)) {
        throw new ValidationError(`Invalid shift: ${filters.shift}`);
      }
    }
  }

  /**
   * Verify work unit exists
   */
  private static async verifyWorkUnitExists(workUnitId: string): Promise<void> {
    const workUnit = await prisma.workUnit.findUnique({
      where: { id: workUnitId }
    });
    
    if (!workUnit) {
      throw new NotFoundError('WorkUnit', workUnitId);
    }
  }

  /**
   * Calculate time range helper
   */
  private static calculateTimeRange(
    timeRange: string, 
    startDate?: Date, 
    endDate?: Date
  ): { startDate: Date; endDate: Date } {
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

  /**
   * Assess data quality
   */
  private static assessDataQuality(data: any[]): string {
    if (data.length === 0) return 'NO_DATA';
    
    const nullCount = data.reduce((count, item) => {
      return count + Object.values(item).filter(v => v === null).length;
    }, 0);
    
    const totalFields = data.length * Object.keys(data[0]).length;
    const completeness = 1 - (nullCount / totalFields);
    
    if (completeness > 0.95) return 'EXCELLENT';
    if (completeness > 0.85) return 'GOOD';
    if (completeness > 0.70) return 'FAIR';
    return 'POOR';
  }

  /**
   * Generate health alerts based on thresholds
   */
  private static generateHealthAlerts(equipmentHealth: any[]): any[] {
    const alerts = [];
    
    for (const equipment of equipmentHealth) {
      if (equipment.overallHealth < 70) {
        alerts.push({
          severity: equipment.overallHealth < 50 ? 'critical' : 'warning',
          type: 'LOW_HEALTH',
          workUnitId: equipment.workUnitId,
          message: `Equipment health below threshold: ${equipment.overallHealth.toFixed(1)}%`
        });
      }
      
      if (equipment.mtbf < 100) {
        alerts.push({
          severity: 'warning',
          type: 'LOW_MTBF',
          workUnitId: equipment.workUnitId,
          message: `Low MTBF: ${equipment.mtbf.toFixed(1)} hours`
        });
      }
    }
    
    return alerts;
  }

  /**
   * Calculate production efficiency
   */
  private static calculateProductionEfficiency(aggregated: any): number {
    if (!aggregated._sum.totalParts) return 0;
    
    const efficiency = (aggregated._sum.goodParts / aggregated._sum.totalParts) * 100;
    return Math.min(100, Math.max(0, efficiency));
  }

  /**
   * Calculate quality metrics from trends
   */
  private static calculateQualityMetrics(trends: any[]): any {
    if (trends.length === 0) {
      return { trend: 'NO_DATA', improvement: 0 };
    }
    
    // Calculate trend
    const firstHalf = trends.slice(0, Math.floor(trends.length / 2));
    const secondHalf = trends.slice(Math.floor(trends.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, t) => sum + (t.firstPassYield || 0), 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, t) => sum + (t.firstPassYield || 0), 0) / secondHalf.length;
    
    const improvement = secondHalfAvg - firstHalfAvg;
    
    return {
      trend: improvement > 1 ? 'IMPROVING' : improvement < -1 ? 'DECLINING' : 'STABLE',
      improvement: improvement.toFixed(2)
    };
  }
}

export default ManufacturingDataService;