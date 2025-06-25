/**
 * Data Collector Agent
 * Responsible for collecting and aggregating manufacturing data from various sources
 */

import { BaseAgent } from '../BaseAgent';
import { AgentContext, AgentResult, DataCollectionResult, AgentConfig } from '../types';
import { prisma } from '@/lib/database/prisma';
import { logger } from '@/lib/logger';

export class DataCollectorAgent extends BaseAgent {
  constructor(config?: Partial<AgentConfig>) {
    super('data_collector', {
      type: 'data_collector',
      enabled: true,
      timeout: 30000, // 30 seconds
      retries: 3,
      priority: 1,
      ...config
    });
  }

  async execute(context: AgentContext): Promise<AgentResult<DataCollectionResult>> {
    this.logStart(context);
    
    try {
      const { timeRange } = context;
      
      // Validate time range
      if (!this.validateTimeRange(timeRange)) {
        throw new Error('Invalid time range provided');
      }

      // Collect data in parallel for better performance
      const [
        performanceMetrics,
        qualityMetrics,
        maintenanceRecords,
        alerts,
        equipment
      ] = await Promise.all([
        this.collectPerformanceMetrics(timeRange),
        this.collectQualityMetrics(timeRange),
        this.collectMaintenanceRecords(timeRange),
        this.collectAlerts(timeRange),
        this.collectEquipmentData()
      ]);

      // Assess data quality
      const dataQuality = this.assessDataQuality({
        performanceMetrics,
        qualityMetrics,
        maintenanceRecords,
        alerts
      });

      // Log collection statistics
      logger.info('Data collection completed', {
        performanceMetrics: performanceMetrics.length,
        qualityMetrics: qualityMetrics.length,
        maintenanceRecords: maintenanceRecords.length,
        alerts: alerts.length,
        equipment: equipment.length,
        dataQuality
      });

      const result = this.createResult<DataCollectionResult>({
        metrics: {
          performance: performanceMetrics,
          quality: qualityMetrics,
          maintenance: maintenanceRecords,
          alerts: alerts
        },
        equipment,
        timeRange,
        dataQuality
      });

      this.logComplete(result);
      return result;

    } catch (error) {
      this.handleError(error as Error);
      return this.createResult<DataCollectionResult>(
        {
          metrics: {
            performance: [],
            quality: [],
            maintenance: [],
            alerts: []
          },
          equipment: [],
          timeRange: context.timeRange,
          dataQuality: {
            completeness: 0,
            accuracy: 0,
            timeliness: 0
          }
        },
        [error as Error]
      );
    }
  }

  private validateTimeRange(timeRange: { start: Date; end: Date }): boolean {
    if (!timeRange.start || !timeRange.end) {
      return false;
    }
    
    const start = new Date(timeRange.start);
    const end = new Date(timeRange.end);
    
    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }
    
    // Check if start is before end
    if (start >= end) {
      return false;
    }
    
    // Check if time range is not too large (e.g., max 1 year)
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > oneYear) {
      return false;
    }
    
    return true;
  }

  private async collectPerformanceMetrics(timeRange: { start: Date; end: Date }) {
    try {
      return await prisma.performanceMetric.findMany({
        where: {
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          WorkUnit: {
            select: {
              id: true,
              name: true,
              code: true,
              equipmentType: true,
              status: true,
              WorkCenter: {
                select: {
                  id: true,
                  name: true,
                  Area: {
                    select: {
                      id: true,
                      name: true,
                      Site: {
                        select: {
                          id: true,
                          name: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: { timestamp: 'desc' }
      });
    } catch (error) {
      logger.error('Error collecting performance metrics:', error);
      return [];
    }
  }

  private async collectQualityMetrics(timeRange: { start: Date; end: Date }) {
    try {
      return await prisma.qualityMetric.findMany({
        where: {
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          WorkUnit: {
            select: {
              id: true,
              name: true,
              code: true,
              equipmentType: true
            }
          },
          QualityCheck: {
            select: {
              id: true,
              checkType: true,
              result: true,
              timestamp: true
            }
          }
        },
        orderBy: { timestamp: 'desc' }
      });
    } catch (error) {
      logger.error('Error collecting quality metrics:', error);
      return [];
    }
  }

  private async collectMaintenanceRecords(timeRange: { start: Date; end: Date }) {
    try {
      return await prisma.maintenanceRecord.findMany({
        where: {
          OR: [
            {
              startTime: {
                gte: timeRange.start,
                lte: timeRange.end
              }
            },
            {
              endTime: {
                gte: timeRange.start,
                lte: timeRange.end
              }
            },
            {
              AND: [
                { startTime: { lte: timeRange.start } },
                { endTime: { gte: timeRange.end } }
              ]
            }
          ]
        },
        include: {
          WorkUnit: {
            select: {
              id: true,
              name: true,
              code: true,
              equipmentType: true,
              lastMaintenanceAt: true
            }
          }
        },
        orderBy: { startTime: 'desc' }
      });
    } catch (error) {
      logger.error('Error collecting maintenance records:', error);
      return [];
    }
  }

  private async collectAlerts(timeRange: { start: Date; end: Date }) {
    try {
      return await prisma.alert.findMany({
        where: {
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          WorkUnit: {
            select: {
              id: true,
              name: true,
              code: true,
              equipmentType: true
            }
          }
        },
        orderBy: { timestamp: 'desc' }
      });
    } catch (error) {
      logger.error('Error collecting alerts:', error);
      return [];
    }
  }

  private async collectEquipmentData() {
    try {
      return await prisma.workUnit.findMany({
        where: {
          status: { in: ['operational', 'maintenance', 'idle'] }
        },
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
          _count: {
            select: {
              PerformanceMetric: true,
              QualityMetric: true,
              MaintenanceRecord: true,
              Alert: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      logger.error('Error collecting equipment data:', error);
      return [];
    }
  }

  private assessDataQuality(data: {
    performanceMetrics: any[];
    qualityMetrics: any[];
    maintenanceRecords: any[];
    alerts: any[];
  }): { completeness: number; accuracy: number; timeliness: number } {
    const totalRecords = 
      data.performanceMetrics.length + 
      data.qualityMetrics.length + 
      data.maintenanceRecords.length + 
      data.alerts.length;

    // Completeness: Check for required fields
    let completeRecords = 0;
    
    data.performanceMetrics.forEach(metric => {
      if (metric.oeeScore !== null && metric.availability !== null && 
          metric.performance !== null && metric.quality !== null) {
        completeRecords++;
      }
    });
    
    data.qualityMetrics.forEach(metric => {
      if (metric.value !== null && metric.isWithinSpec !== null) {
        completeRecords++;
      }
    });
    
    const completeness = totalRecords > 0 ? completeRecords / totalRecords : 0;

    // Accuracy: Check for valid ranges
    let accurateRecords = 0;
    
    data.performanceMetrics.forEach(metric => {
      if (metric.oeeScore >= 0 && metric.oeeScore <= 1 &&
          metric.availability >= 0 && metric.availability <= 1 &&
          metric.performance >= 0 && metric.performance <= 1 &&
          metric.quality >= 0 && metric.quality <= 1) {
        accurateRecords++;
      }
    });
    
    const accuracy = data.performanceMetrics.length > 0 ? 
      accurateRecords / data.performanceMetrics.length : 1;

    // Timeliness: Check how recent the data is
    const now = new Date();
    let recentRecords = 0;
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    [...data.performanceMetrics, ...data.qualityMetrics, ...data.alerts].forEach(record => {
      if (new Date(record.timestamp) >= oneHourAgo) {
        recentRecords++;
      }
    });
    
    const totalTimedRecords = data.performanceMetrics.length + data.qualityMetrics.length + data.alerts.length;
    const timeliness = totalTimedRecords > 0 ? recentRecords / totalTimedRecords : 0;

    return {
      completeness: Math.round(completeness * 100) / 100,
      accuracy: Math.round(accuracy * 100) / 100,
      timeliness: Math.round(timeliness * 100) / 100
    };
  }
}