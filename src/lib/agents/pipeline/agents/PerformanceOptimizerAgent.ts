/**
 * Performance Optimizer Agent
 * Analyzes OEE, productivity, bottlenecks, and provides optimization recommendations
 */

import { BaseAgent } from '../BaseAgent';
import { AgentContext, AgentResult, PerformanceAnalysisResult, DataCollectionResult, AgentConfig } from '../types';
import { logger } from '@/lib/logger';

export class PerformanceOptimizerAgent extends BaseAgent {
  constructor(config?: Partial<AgentConfig>) {
    super('performance_optimizer', {
      type: 'performance_optimizer',
      enabled: true,
      timeout: 25000, // 25 seconds
      retries: 2,
      priority: 2,
      dependencies: ['data_collector'],
      ...config
    });
  }

  async execute(context: AgentContext, data: DataCollectionResult): Promise<AgentResult<PerformanceAnalysisResult>> {
    this.logStart(context);
    
    try {
      if (!data || !data.metrics) {
        throw new Error('No data provided for performance analysis');
      }

      const { performance: performanceMetrics } = data.metrics;
      const { equipment } = data;
      
      // Calculate OEE components
      const oee = this.calculateOEE(performanceMetrics);
      
      // Analyze productivity
      const productivity = this.analyzeProductivity(performanceMetrics);
      
      // Identify bottlenecks
      const bottlenecks = this.identifyBottlenecks(performanceMetrics, equipment);
      
      // Find improvement opportunities
      const improvements = this.findImprovementOpportunities(oee, productivity, bottlenecks);

      const result = this.createResult<PerformanceAnalysisResult>({
        oee,
        productivity,
        bottlenecks,
        improvements
      });

      // Send results to visualization generator
      if (this.communication) {
        await this.sendMessage('visualization_generator', {
          type: 'performance_data',
          data: result.data
        });
      }

      this.logComplete(result);
      return result;

    } catch (error) {
      this.handleError(error as Error);
      return this.createResult<PerformanceAnalysisResult>(
        {
          oee: {
            overall: 0,
            availability: 0,
            performance: 0,
            quality: 0
          },
          productivity: {
            actualOutput: 0,
            targetOutput: 0,
            efficiency: 0
          },
          bottlenecks: [],
          improvements: []
        },
        [error as Error]
      );
    }
  }

  private calculateOEE(performanceMetrics: any[]): {
    overall: number;
    availability: number;
    performance: number;
    quality: number;
  } {
    if (!performanceMetrics || performanceMetrics.length === 0) {
      return { overall: 0, availability: 0, performance: 0, quality: 0 };
    }

    // Calculate averages
    let totalAvailability = 0;
    let totalPerformance = 0;
    let totalQuality = 0;
    let totalOEE = 0;
    let validMetrics = 0;

    performanceMetrics.forEach(metric => {
      if (metric.availability !== null && metric.performance !== null && 
          metric.quality !== null && metric.oeeScore !== null) {
        totalAvailability += metric.availability;
        totalPerformance += metric.performance;
        totalQuality += metric.quality;
        totalOEE += metric.oeeScore;
        validMetrics++;
      }
    });

    if (validMetrics === 0) {
      return { overall: 0, availability: 0, performance: 0, quality: 0 };
    }

    return {
      overall: Math.round((totalOEE / validMetrics) * 10000) / 100,
      availability: Math.round((totalAvailability / validMetrics) * 10000) / 100,
      performance: Math.round((totalPerformance / validMetrics) * 10000) / 100,
      quality: Math.round((totalQuality / validMetrics) * 10000) / 100
    };
  }

  private analyzeProductivity(performanceMetrics: any[]): {
    actualOutput: number;
    targetOutput: number;
    efficiency: number;
  } {
    if (!performanceMetrics || performanceMetrics.length === 0) {
      return { actualOutput: 0, targetOutput: 0, efficiency: 0 };
    }

    let totalActualOutput = 0;
    let totalTargetOutput = 0;

    performanceMetrics.forEach(metric => {
      totalActualOutput += metric.actualOutput || 0;
      totalTargetOutput += metric.targetOutput || 0;
    });

    const efficiency = totalTargetOutput > 0 ? 
      Math.round((totalActualOutput / totalTargetOutput) * 10000) / 100 : 0;

    return {
      actualOutput: totalActualOutput,
      targetOutput: totalTargetOutput,
      efficiency
    };
  }

  private identifyBottlenecks(performanceMetrics: any[], equipment: any[]): Array<{
    equipment: string;
    impact: number;
    type: string;
  }> {
    const bottlenecks: Array<{
      equipment: string;
      impact: number;
      type: string;
    }> = [];

    // Group metrics by equipment
    const equipmentMetrics = new Map<string, any[]>();
    
    performanceMetrics.forEach(metric => {
      const equipmentId = metric.workUnitId;
      if (!equipmentMetrics.has(equipmentId)) {
        equipmentMetrics.set(equipmentId, []);
      }
      equipmentMetrics.get(equipmentId)!.push(metric);
    });

    // Analyze each equipment for bottlenecks
    equipmentMetrics.forEach((metrics, equipmentId) => {
      const equipmentInfo = equipment.find(e => e.id === equipmentId);
      const equipmentName = equipmentInfo?.name || 'Unknown Equipment';

      // Calculate average OEE for this equipment
      const avgOEE = metrics.reduce((sum, m) => sum + (m.oeeScore || 0), 0) / metrics.length;
      
      // Calculate downtime impact
      const totalDowntime = metrics.reduce((sum, m) => sum + (m.unplannedDowntime || 0), 0);
      
      // Identify bottleneck type
      if (avgOEE < 0.6) { // OEE below 60%
        const avgAvailability = metrics.reduce((sum, m) => sum + (m.availability || 0), 0) / metrics.length;
        const avgPerformance = metrics.reduce((sum, m) => sum + (m.performance || 0), 0) / metrics.length;
        const avgQuality = metrics.reduce((sum, m) => sum + (m.quality || 0), 0) / metrics.length;

        let bottleneckType = 'General';
        let minComponent = Math.min(avgAvailability, avgPerformance, avgQuality);
        
        if (minComponent === avgAvailability) {
          bottleneckType = 'Availability';
        } else if (minComponent === avgPerformance) {
          bottleneckType = 'Performance';
        } else if (minComponent === avgQuality) {
          bottleneckType = 'Quality';
        }

        bottlenecks.push({
          equipment: equipmentName,
          impact: Math.round((1 - avgOEE) * 100), // Impact as percentage loss
          type: bottleneckType
        });
      }

      // Check for high downtime
      if (totalDowntime > 60) { // More than 1 hour downtime
        bottlenecks.push({
          equipment: equipmentName,
          impact: Math.round(totalDowntime / 60), // Convert to hours
          type: 'Downtime'
        });
      }
    });

    // Sort by impact (descending)
    return bottlenecks.sort((a, b) => b.impact - a.impact).slice(0, 10); // Top 10 bottlenecks
  }

  private findImprovementOpportunities(
    oee: any, 
    productivity: any, 
    bottlenecks: any[]
  ): Array<{
    opportunity: string;
    potentialGain: number;
    priority: 'high' | 'medium' | 'low';
  }> {
    const improvements: Array<{
      opportunity: string;
      potentialGain: number;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    // OEE-based improvements
    const worldClassOEE = 85;
    const oeeGap = worldClassOEE - oee.overall;
    
    if (oeeGap > 0) {
      // Availability improvements
      if (oee.availability < 90) {
        const availabilityGap = 90 - oee.availability;
        improvements.push({
          opportunity: `Improve equipment availability through predictive maintenance and reduced changeover times`,
          potentialGain: Math.round(availabilityGap * oee.performance * oee.quality / 100),
          priority: availabilityGap > 10 ? 'high' : 'medium'
        });
      }

      // Performance improvements
      if (oee.performance < 95) {
        const performanceGap = 95 - oee.performance;
        improvements.push({
          opportunity: `Optimize cycle times and reduce micro-stops through process optimization`,
          potentialGain: Math.round(oee.availability * performanceGap * oee.quality / 10000),
          priority: performanceGap > 10 ? 'high' : 'medium'
        });
      }

      // Quality improvements
      if (oee.quality < 99) {
        const qualityGap = 99 - oee.quality;
        improvements.push({
          opportunity: `Enhance quality control measures to reduce defects and rework`,
          potentialGain: Math.round(oee.availability * oee.performance * qualityGap / 10000),
          priority: qualityGap > 5 ? 'high' : 'medium'
        });
      }
    }

    // Productivity improvements
    if (productivity.efficiency < 85) {
      const efficiencyGap = 85 - productivity.efficiency;
      improvements.push({
        opportunity: `Increase production efficiency through workflow optimization and resource allocation`,
        potentialGain: Math.round(efficiencyGap),
        priority: efficiencyGap > 15 ? 'high' : 'medium'
      });
    }

    // Bottleneck-based improvements
    bottlenecks.slice(0, 3).forEach((bottleneck, index) => {
      let opportunity = '';
      
      switch (bottleneck.type) {
        case 'Availability':
          opportunity = `Address availability issues on ${bottleneck.equipment} through maintenance optimization`;
          break;
        case 'Performance':
          opportunity = `Improve performance on ${bottleneck.equipment} by optimizing operating parameters`;
          break;
        case 'Quality':
          opportunity = `Enhance quality control on ${bottleneck.equipment} to reduce defects`;
          break;
        case 'Downtime':
          opportunity = `Reduce downtime on ${bottleneck.equipment} through root cause analysis`;
          break;
        default:
          opportunity = `Optimize ${bottleneck.equipment} operations`;
      }

      improvements.push({
        opportunity,
        potentialGain: bottleneck.impact,
        priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'low'
      });
    });

    // TPM implementation if not achieving targets
    if (oee.overall < 75) {
      improvements.push({
        opportunity: 'Implement Total Productive Maintenance (TPM) program for systematic improvement',
        potentialGain: 15, // Typical TPM improvement
        priority: 'high'
      });
    }

    // Sort by potential gain
    return improvements.sort((a, b) => b.potentialGain - a.potentialGain);
  }
}