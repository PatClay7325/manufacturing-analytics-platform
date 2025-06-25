/**
 * Quality Analyzer Agent
 * Analyzes quality metrics, defect patterns, and provides quality improvement recommendations
 */

import { BaseAgent } from '../BaseAgent';
import { AgentContext, AgentResult, QualityAnalysisResult, DataCollectionResult, AgentConfig } from '../types';
import { logger } from '@/lib/logger';

export class QualityAnalyzerAgent extends BaseAgent {
  constructor(config?: Partial<AgentConfig>) {
    super('quality_analyzer', {
      type: 'quality_analyzer',
      enabled: true,
      timeout: 20000, // 20 seconds
      retries: 2,
      priority: 2,
      dependencies: ['data_collector'],
      ...config
    });
  }

  async execute(context: AgentContext, data: DataCollectionResult): Promise<AgentResult<QualityAnalysisResult>> {
    this.logStart(context);
    
    try {
      if (!data || !data.metrics) {
        throw new Error('No data provided for quality analysis');
      }

      const { quality: qualityMetrics } = data.metrics;
      
      // Calculate overall quality metrics
      const overallQualityRate = this.calculateOverallQualityRate(qualityMetrics);
      const defectRate = this.calculateDefectRate(qualityMetrics);
      const scrapRate = this.calculateScrapRate(qualityMetrics);
      const reworkRate = this.calculateReworkRate(qualityMetrics);
      
      // Analyze quality trends
      const qualityTrends = this.analyzeQualityTrends(qualityMetrics);
      
      // Analyze parameters
      const parameterAnalysis = this.analyzeParameters(qualityMetrics);
      
      // Generate recommendations
      const recommendations = this.generateQualityRecommendations({
        overallQualityRate,
        defectRate,
        scrapRate,
        reworkRate,
        parameterAnalysis,
        qualityTrends
      });

      const result = this.createResult<QualityAnalysisResult>({
        overallQualityRate,
        defectRate,
        scrapRate,
        reworkRate,
        qualityTrends,
        parameterAnalysis,
        recommendations
      });

      // Send results to other agents if needed
      if (this.communication) {
        await this.sendMessage('visualization_generator', {
          type: 'quality_data',
          data: result.data
        });
      }

      this.logComplete(result);
      return result;

    } catch (error) {
      this.handleError(error as Error);
      return this.createResult<QualityAnalysisResult>(
        {
          overallQualityRate: 0,
          defectRate: 0,
          scrapRate: 0,
          reworkRate: 0,
          qualityTrends: [],
          parameterAnalysis: [],
          recommendations: []
        },
        [error as Error]
      );
    }
  }

  private calculateOverallQualityRate(qualityMetrics: any[]): number {
    if (!qualityMetrics || qualityMetrics.length === 0) {
      return 0;
    }

    const conformingCount = qualityMetrics.filter(m => m.isWithinSpec).length;
    return Math.round((conformingCount / qualityMetrics.length) * 10000) / 100; // percentage with 2 decimals
  }

  private calculateDefectRate(qualityMetrics: any[]): number {
    if (!qualityMetrics || qualityMetrics.length === 0) {
      return 0;
    }

    // Calculate defects per million opportunities (DPMO)
    const defectCount = qualityMetrics.filter(m => !m.isWithinSpec).length;
    const opportunities = qualityMetrics.length;
    
    if (opportunities === 0) return 0;
    
    const dpmo = (defectCount / opportunities) * 1000000;
    return Math.round(dpmo * 100) / 100;
  }

  private calculateScrapRate(qualityMetrics: any[]): number {
    // In a real implementation, this would identify metrics marked as scrap
    // For now, we'll estimate based on severely out-of-spec items
    const scrapCount = qualityMetrics.filter(m => {
      if (!m.isWithinSpec && m.value && m.upperLimit && m.lowerLimit) {
        const deviation = Math.max(
          m.value - m.upperLimit,
          m.lowerLimit - m.value
        );
        const range = m.upperLimit - m.lowerLimit;
        return deviation > range * 0.5; // More than 50% out of spec
      }
      return false;
    }).length;

    return qualityMetrics.length > 0 ? 
      Math.round((scrapCount / qualityMetrics.length) * 10000) / 100 : 0;
  }

  private calculateReworkRate(qualityMetrics: any[]): number {
    // Estimate rework as out-of-spec but not scrap
    const reworkCount = qualityMetrics.filter(m => {
      if (!m.isWithinSpec && m.value && m.upperLimit && m.lowerLimit) {
        const deviation = Math.max(
          m.value - m.upperLimit,
          m.lowerLimit - m.value
        );
        const range = m.upperLimit - m.lowerLimit;
        return deviation <= range * 0.5; // Less than 50% out of spec
      }
      return false;
    }).length;

    return qualityMetrics.length > 0 ? 
      Math.round((reworkCount / qualityMetrics.length) * 10000) / 100 : 0;
  }

  private analyzeQualityTrends(qualityMetrics: any[]): any[] {
    if (!qualityMetrics || qualityMetrics.length === 0) {
      return [];
    }

    // Group metrics by hour
    const hourlyGroups = new Map<string, any[]>();
    
    qualityMetrics.forEach(metric => {
      const hour = new Date(metric.timestamp);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();
      
      if (!hourlyGroups.has(key)) {
        hourlyGroups.set(key, []);
      }
      hourlyGroups.get(key)!.push(metric);
    });

    // Calculate hourly quality rates
    const trends = Array.from(hourlyGroups.entries()).map(([timestamp, metrics]) => {
      const conforming = metrics.filter(m => m.isWithinSpec).length;
      const defects = metrics.length - conforming;
      const qualityRate = metrics.length > 0 ? (conforming / metrics.length) * 100 : 0;
      
      return {
        timestamp: new Date(timestamp),
        qualityRate: Math.round(qualityRate * 100) / 100,
        defects
      };
    });

    // Sort by timestamp
    return trends.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private analyzeParameters(qualityMetrics: any[]): any[] {
    if (!qualityMetrics || qualityMetrics.length === 0) {
      return [];
    }

    // Group by parameter
    const parameterGroups = new Map<string, any[]>();
    
    qualityMetrics.forEach(metric => {
      if (!parameterGroups.has(metric.parameter)) {
        parameterGroups.set(metric.parameter, []);
      }
      parameterGroups.get(metric.parameter)!.push(metric);
    });

    // Analyze each parameter
    return Array.from(parameterGroups.entries()).map(([parameter, metrics]) => {
      const conforming = metrics.filter(m => m.isWithinSpec).length;
      const conformanceRate = (conforming / metrics.length) * 100;
      
      // Determine trend
      const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
      const secondHalf = metrics.slice(Math.floor(metrics.length / 2));
      
      const firstHalfRate = firstHalf.filter(m => m.isWithinSpec).length / firstHalf.length;
      const secondHalfRate = secondHalf.filter(m => m.isWithinSpec).length / secondHalf.length;
      
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (secondHalfRate > firstHalfRate + 0.05) trend = 'improving';
      else if (secondHalfRate < firstHalfRate - 0.05) trend = 'declining';
      
      return {
        parameter,
        conformanceRate: Math.round(conformanceRate * 100) / 100,
        outOfSpecCount: metrics.length - conforming,
        trend
      };
    });
  }

  private generateQualityRecommendations(analysis: {
    overallQualityRate: number;
    defectRate: number;
    scrapRate: number;
    reworkRate: number;
    parameterAnalysis: any[];
    qualityTrends: any[];
  }): string[] {
    const recommendations: string[] = [];

    // Overall quality recommendations
    if (analysis.overallQualityRate < 95) {
      recommendations.push('🚨 Critical: Overall quality rate is below 95%. Implement immediate quality control measures.');
    } else if (analysis.overallQualityRate < 99) {
      recommendations.push('⚠️ Warning: Quality rate is below target. Review and enhance quality control procedures.');
    }

    // Defect rate recommendations
    if (analysis.defectRate > 3400) { // Below 3 sigma
      recommendations.push('📊 Implement Statistical Process Control (SPC) to achieve Six Sigma quality levels.');
    }

    // Scrap rate recommendations
    if (analysis.scrapRate > 2) {
      recommendations.push('💰 High scrap rate detected. Review process parameters and equipment calibration.');
    }

    // Rework rate recommendations
    if (analysis.reworkRate > 5) {
      recommendations.push('🔄 Significant rework required. Consider process optimization to reduce rework costs.');
    }

    // Parameter-specific recommendations
    const poorParameters = analysis.parameterAnalysis
      .filter(p => p.conformanceRate < 95)
      .sort((a, b) => a.conformanceRate - b.conformanceRate);

    if (poorParameters.length > 0) {
      const worstParameter = poorParameters[0];
      recommendations.push(
        `🎯 Focus on ${worstParameter.parameter}: Only ${worstParameter.conformanceRate}% conformance rate.`
      );
    }

    // Trend-based recommendations
    const decliningParameters = analysis.parameterAnalysis.filter(p => p.trend === 'declining');
    if (decliningParameters.length > 0) {
      recommendations.push(
        `📉 Declining trends detected in: ${decliningParameters.map(p => p.parameter).join(', ')}`
      );
    }

    // Best practices
    if (recommendations.length === 0) {
      recommendations.push('✅ Quality metrics are within acceptable ranges. Continue monitoring for sustained performance.');
    }

    // Add ISO compliance recommendation
    recommendations.push('📋 Ensure all quality procedures align with ISO 9001:2015 standards for continuous improvement.');

    return recommendations;
  }
}