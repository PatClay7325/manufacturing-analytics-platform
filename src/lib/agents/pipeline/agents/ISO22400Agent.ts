/**
 * ISO 22400 Compliance Agent
 * Ensures all KPI calculations follow ISO 22400 standards
 */

import { BaseAgent } from '../BaseAgent';
import { AgentContext, AgentResult, AgentConfig } from '../types';
import { ISO22400Calculator, ISO22400_KPIs } from '../../standards/ISO22400';
import { prisma } from '@/lib/database';
import { logger } from '@/lib/logger';

export interface ISO22400Result {
  kpis: {
    oee: {
      value: number;
      components: {
        availability: number;
        performance: number;
        quality: number;
      };
      benchmark: ReturnType<typeof ISO22400Calculator.evaluatePerformance>;
    };
    mtbf: number;
    mttr: number;
    fpy: number;
    mce: number;
    throughput: number;
    scrapRate: number;
    reworkRate: number;
  };
  compliance: {
    level: number; // 1-3 based on ISO 22400 levels
    missingKPIs: string[];
    recommendations: string[];
  };
  trends: {
    period: string;
    improvements: string[];
    concerns: string[];
  };
}

export class ISO22400Agent extends BaseAgent {
  constructor(config?: Partial<AgentConfig>) {
    super('iso22400', {
      type: 'iso22400' as any,
      enabled: true,
      timeout: 20000,
      retries: 2,
      priority: 2,
      ...config
    });
  }

  async execute(context: AgentContext, data?: any): Promise<AgentResult<ISO22400Result>> {
    this.logStart(context);
    
    try {
      const { timeRange } = context;
      const metrics = data?.metrics || {};

      // Calculate Level 1 KPIs (Strategic)
      const oeeComponents = await this.calculateOEEComponents(metrics.performance, timeRange);
      const oee = ISO22400Calculator.calculateOEE(
        oeeComponents.availability,
        oeeComponents.performance,
        oeeComponents.quality
      );

      // Calculate Level 2 & 3 KPIs (Tactical & Operational)
      const mtbf = await this.calculateMTBF(metrics.maintenance, timeRange);
      const mttr = await this.calculateMTTR(metrics.maintenance, timeRange);
      const fpy = await this.calculateFPY(metrics.quality, timeRange);
      const mce = await this.calculateMCE(metrics.performance, timeRange);
      const throughput = await this.calculateThroughput(metrics.performance, timeRange);
      const { scrapRate, reworkRate } = await this.calculateQualityRates(metrics.quality, timeRange);

      // Evaluate performance against benchmarks
      const oeeBenchmark = ISO22400Calculator.evaluatePerformance('OEE', oee);

      // Assess compliance
      const compliance = this.assessCompliance({
        oee, mtbf, mttr, fpy, mce, throughput, scrapRate, reworkRate
      });

      // Analyze trends
      const trends = await this.analyzeTrends(metrics, timeRange);

      const result = this.createResult<ISO22400Result>({
        kpis: {
          oee: {
            value: oee,
            components: oeeComponents,
            benchmark: oeeBenchmark
          },
          mtbf,
          mttr,
          fpy,
          mce,
          throughput,
          scrapRate,
          reworkRate
        },
        compliance,
        trends
      });

      this.logComplete(result);
      return result;

    } catch (error) {
      this.handleError(error as Error);
      return this.createResult<ISO22400Result>(
        {
          kpis: {
            oee: {
              value: 0,
              components: { availability: 0, performance: 0, quality: 0 },
              benchmark: { level: 'poor', recommendation: 'Data collection required' }
            },
            mtbf: 0,
            mttr: 0,
            fpy: 0,
            mce: 0,
            throughput: 0,
            scrapRate: 0,
            reworkRate: 0
          },
          compliance: {
            level: 0,
            missingKPIs: Object.keys(ISO22400_KPIs),
            recommendations: ['Implement data collection for ISO 22400 compliance']
          },
          trends: {
            period: 'N/A',
            improvements: [],
            concerns: ['Insufficient data for trend analysis']
          }
        },
        [error as Error]
      );
    }
  }

  private async calculateOEEComponents(
    performanceMetrics: any[],
    timeRange: { start: Date; end: Date }
  ): Promise<{ availability: number; performance: number; quality: number }> {
    if (!performanceMetrics || performanceMetrics.length === 0) {
      return { availability: 0, performance: 0, quality: 0 };
    }

    // Calculate averages from performance metrics
    let totalAvailability = 0;
    let totalPerformance = 0;
    let totalQuality = 0;
    let count = 0;

    performanceMetrics.forEach(metric => {
      if (metric.availability !== null) {
        totalAvailability += metric.availability;
        count++;
      }
      if (metric.performance !== null) {
        totalPerformance += metric.performance;
      }
      if (metric.quality !== null) {
        totalQuality += metric.quality;
      }
    });

    return {
      availability: count > 0 ? totalAvailability / count : 0,
      performance: count > 0 ? totalPerformance / count : 0,
      quality: count > 0 ? totalQuality / count : 0
    };
  }

  private async calculateMTBF(
    maintenanceRecords: any[],
    timeRange: { start: Date; end: Date }
  ): Promise<number> {
    if (!maintenanceRecords || maintenanceRecords.length === 0) return 0;

    // Group by equipment and calculate MTBF
    const equipmentFailures = new Map<string, { operatingTime: number; failures: number }>();

    maintenanceRecords
      .filter(record => record.type === 'corrective')
      .forEach(record => {
        const equipmentId = record.WorkUnit?.id || 'unknown';
        if (!equipmentFailures.has(equipmentId)) {
          equipmentFailures.set(equipmentId, { operatingTime: 0, failures: 0 });
        }
        const data = equipmentFailures.get(equipmentId)!;
        data.failures++;
      });

    // Calculate total operating time (simplified - assumes 24/7 operation minus downtime)
    const totalHours = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60);
    
    let totalMTBF = 0;
    let equipmentCount = 0;

    equipmentFailures.forEach((data, equipmentId) => {
      if (data.failures > 0) {
        const mtbf = totalHours / data.failures;
        totalMTBF += mtbf;
        equipmentCount++;
      }
    });

    return equipmentCount > 0 ? totalMTBF / equipmentCount : totalHours;
  }

  private async calculateMTTR(
    maintenanceRecords: any[],
    timeRange: { start: Date; end: Date }
  ): Promise<number> {
    if (!maintenanceRecords || maintenanceRecords.length === 0) return 0;

    let totalRepairTime = 0;
    let repairCount = 0;

    maintenanceRecords
      .filter(record => record.type === 'corrective' && record.endTime && record.startTime)
      .forEach(record => {
        const repairTime = (new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / (1000 * 60 * 60);
        totalRepairTime += repairTime;
        repairCount++;
      });

    return repairCount > 0 ? totalRepairTime / repairCount : 0;
  }

  private async calculateFPY(
    qualityMetrics: any[],
    timeRange: { start: Date; end: Date }
  ): Promise<number> {
    if (!qualityMetrics || qualityMetrics.length === 0) return 0;

    let totalProduced = 0;
    let firstPassGood = 0;

    qualityMetrics.forEach(metric => {
      if (metric.totalProduced) {
        totalProduced += metric.totalProduced;
        firstPassGood += metric.totalProduced - (metric.defects || 0) - (metric.rework || 0);
      }
    });

    return ISO22400Calculator.calculateFPY(firstPassGood, totalProduced);
  }

  private async calculateMCE(
    performanceMetrics: any[],
    timeRange: { start: Date; end: Date }
  ): Promise<number> {
    // Manufacturing Cycle Efficiency calculation
    // This would need actual cycle time data from the process
    // For now, using a simplified calculation based on performance metrics
    
    if (!performanceMetrics || performanceMetrics.length === 0) return 0;

    let totalValueAddedTime = 0;
    let totalCycleTime = 0;

    performanceMetrics.forEach(metric => {
      if (metric.actualProductionTime && metric.plannedProductionTime) {
        // Assume value-added time is actual production time * performance rate
        totalValueAddedTime += metric.actualProductionTime * (metric.performance || 0);
        totalCycleTime += metric.plannedProductionTime;
      }
    });

    return ISO22400Calculator.calculateMCE(totalValueAddedTime, totalCycleTime);
  }

  private async calculateThroughput(
    performanceMetrics: any[],
    timeRange: { start: Date; end: Date }
  ): Promise<number> {
    if (!performanceMetrics || performanceMetrics.length === 0) return 0;

    let totalGoodUnits = 0;
    let totalProductionTime = 0;

    performanceMetrics.forEach(metric => {
      if (metric.goodCount !== null && metric.actualProductionTime) {
        totalGoodUnits += metric.goodCount;
        totalProductionTime += metric.actualProductionTime;
      }
    });

    return totalProductionTime > 0 ? totalGoodUnits / totalProductionTime : 0;
  }

  private async calculateQualityRates(
    qualityMetrics: any[],
    timeRange: { start: Date; end: Date }
  ): Promise<{ scrapRate: number; reworkRate: number }> {
    if (!qualityMetrics || qualityMetrics.length === 0) {
      return { scrapRate: 0, reworkRate: 0 };
    }

    let totalProduced = 0;
    let totalScrap = 0;
    let totalRework = 0;

    qualityMetrics.forEach(metric => {
      if (metric.totalProduced) {
        totalProduced += metric.totalProduced;
        totalScrap += metric.scrap || 0;
        totalRework += metric.rework || 0;
      }
    });

    return {
      scrapRate: totalProduced > 0 ? (totalScrap / totalProduced) * 100 : 0,
      reworkRate: totalProduced > 0 ? (totalRework / totalProduced) * 100 : 0
    };
  }

  private assessCompliance(kpis: any): {
    level: number;
    missingKPIs: string[];
    recommendations: string[];
  } {
    const implementedKPIs = [];
    const missingKPIs = [];
    const recommendations = [];

    // Check which KPIs are implemented (have non-zero values)
    Object.entries(ISO22400_KPIs).forEach(([id, kpi]) => {
      const value = this.getKPIValue(kpis, id);
      if (value > 0) {
        implementedKPIs.push(id);
      } else {
        missingKPIs.push(kpi.name);
      }
    });

    // Determine compliance level
    let level = 0;
    if (kpis.oee.value > 0) level = 1; // Level 1 - Strategic KPIs
    if (level === 1 && kpis.mtbf > 0 && kpis.mttr > 0) level = 2; // Level 2 - Tactical KPIs
    if (level === 2 && kpis.fpy > 0 && kpis.mce > 0) level = 3; // Level 3 - Operational KPIs

    // Generate recommendations
    if (level < 3) {
      recommendations.push('Implement all ISO 22400 Level 3 KPIs for full compliance');
    }
    if (kpis.oee.value < 60) {
      recommendations.push('Focus on OEE improvement - target 60% for good performance');
    }
    if (missingKPIs.length > 0) {
      recommendations.push(`Implement missing KPIs: ${missingKPIs.slice(0, 3).join(', ')}`);
    }

    return { level, missingKPIs, recommendations };
  }

  private getKPIValue(kpis: any, kpiId: string): number {
    const mapping: Record<string, string> = {
      'OEE': 'oee.value',
      'MTBF': 'mtbf',
      'MTTR': 'mttr',
      'FPY': 'fpy',
      'MCE': 'mce',
      'TP': 'throughput',
      'SR': 'scrapRate',
      'RR': 'reworkRate'
    };

    const path = mapping[kpiId];
    if (!path) return 0;

    if (path.includes('.')) {
      const parts = path.split('.');
      let value = kpis;
      for (const part of parts) {
        value = value?.[part];
      }
      return value || 0;
    }

    return kpis[path] || 0;
  }

  private async analyzeTrends(
    data: any,
    timeRange: { start: Date; end: Date }
  ): Promise<{ period: string; improvements: string[]; concerns: string[] }> {
    const improvements = [];
    const concerns = [];

    // This would need historical data comparison
    // For now, providing static analysis based on current values
    
    if (data.performance?.length > 0) {
      const avgOEE = data.performance.reduce((sum: number, m: any) => sum + (m.oeeScore || 0), 0) / data.performance.length;
      if (avgOEE > 60) {
        improvements.push('OEE performing above industry average');
      } else {
        concerns.push('OEE below industry average of 60%');
      }
    }

    const period = `${timeRange.start.toLocaleDateString()} - ${timeRange.end.toLocaleDateString()}`;

    return { period, improvements, concerns };
  }
}