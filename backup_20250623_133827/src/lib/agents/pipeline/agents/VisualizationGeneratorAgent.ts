/**
 * Visualization Generator Agent
 * Creates data visualizations based on analysis results
 */

import { BaseAgent } from '../BaseAgent';
import { 
  AgentContext, 
  AgentResult, 
  VisualizationConfig,
  AgentConfig 
} from '../types';
import { logger } from '@/lib/logger';

export class VisualizationGeneratorAgent extends BaseAgent {
  constructor(config?: Partial<AgentConfig>) {
    super('visualization_generator', {
      type: 'visualization_generator',
      enabled: true,
      timeout: 20000, // 20 seconds
      retries: 2,
      priority: 4,
      dependencies: ['quality_analyzer', 'performance_optimizer', 'maintenance_predictor', 'root_cause_analyzer'],
      ...config
    });
  }

  async execute(
    context: AgentContext, 
    analysisResults: {
      quality?: any;
      performance?: any;
      maintenance?: any;
      rootCause?: any;
    }
  ): Promise<AgentResult<VisualizationConfig[]>> {
    this.logStart(context);
    
    try {
      const visualizations: VisualizationConfig[] = [];
      
      // Generate visualizations based on available analysis results
      if (analysisResults.performance) {
        visualizations.push(...this.generatePerformanceVisualizations(analysisResults.performance));
      }
      
      if (analysisResults.quality) {
        visualizations.push(...this.generateQualityVisualizations(analysisResults.quality));
      }
      
      if (analysisResults.maintenance) {
        visualizations.push(...this.generateMaintenanceVisualizations(analysisResults.maintenance));
      }
      
      if (analysisResults.rootCause) {
        visualizations.push(...this.generateRootCauseVisualizations(analysisResults.rootCause));
      }
      
      // Add overview dashboard if multiple analyses
      if (Object.keys(analysisResults).length > 1) {
        visualizations.unshift(this.generateOverviewVisualization(analysisResults));
      }

      const result = this.createResult<VisualizationConfig[]>(visualizations);
      
      this.logComplete(result);
      return result;

    } catch (error) {
      this.handleError(error as Error);
      return this.createResult<VisualizationConfig[]>([], [error as Error]);
    }
  }

  private generatePerformanceVisualizations(performanceData: any): VisualizationConfig[] {
    const visualizations: VisualizationConfig[] = [];

    // OEE Gauge Chart
    if (performanceData.oee) {
      visualizations.push({
        id: 'oee-gauge',
        type: 'gauge_chart',
        title: 'Overall Equipment Effectiveness (OEE)',
        description: 'Current OEE performance against world-class standards',
        data: [{
          value: performanceData.oee.overall,
          title: 'OEE',
          min: 0,
          max: 100,
          thresholds: [
            { value: 60, color: '#EF4444', label: 'Poor' },
            { value: 75, color: '#F59E0B', label: 'Good' },
            { value: 85, color: '#10B981', label: 'World Class' }
          ]
        }],
        config: {
          dimensions: { width: 400, height: 300 },
          colors: ['#3B82F6']
        }
      });
    }

    // OEE Components Bar Chart
    if (performanceData.oee) {
      visualizations.push({
        id: 'oee-components',
        type: 'bar_chart',
        title: 'OEE Components Breakdown',
        description: 'Availability, Performance, and Quality metrics',
        data: [
          { 
            component: 'Availability', 
            value: performanceData.oee.availability, 
            target: 90,
            color: '#3B82F6'
          },
          { 
            component: 'Performance', 
            value: performanceData.oee.performance, 
            target: 95,
            color: '#8B5CF6'
          },
          { 
            component: 'Quality', 
            value: performanceData.oee.quality, 
            target: 99,
            color: '#10B981'
          }
        ],
        config: {
          xAxisKey: 'component',
          yAxisKey: 'value',
          dataKeys: ['value', 'target'],
          colors: ['#3B82F6', '#E5E7EB'],
          dimensions: { width: 600, height: 400 },
          margin: { top: 20, right: 30, bottom: 40, left: 40 }
        }
      });
    }

    // Bottlenecks Pareto Chart
    if (performanceData.bottlenecks && performanceData.bottlenecks.length > 0) {
      const paretoData = performanceData.bottlenecks.map((b: any, index: number) => {
        const cumulativePercentage = performanceData.bottlenecks
          .slice(0, index + 1)
          .reduce((sum: number, item: any) => sum + item.impact, 0);
        
        return {
          equipment: b.equipment,
          impact: b.impact,
          type: b.type,
          cumulative: cumulativePercentage
        };
      });

      visualizations.push({
        id: 'bottlenecks-pareto',
        type: 'pareto_chart',
        title: 'Production Bottlenecks Analysis',
        description: 'Equipment and processes limiting production efficiency',
        data: paretoData,
        config: {
          xAxisKey: 'equipment',
          yAxisKey: 'impact',
          dataKeys: ['impact', 'cumulative'],
          colors: ['#DC2626', '#F59E0B'],
          dimensions: { width: 800, height: 400 },
          margin: { top: 20, right: 60, bottom: 60, left: 40 }
        }
      });
    }

    // Productivity Trend
    if (performanceData.productivity) {
      visualizations.push({
        id: 'productivity-trend',
        type: 'line_chart',
        title: 'Production Efficiency Trend',
        description: 'Actual vs Target Production Over Time',
        data: [
          {
            time: 'Current',
            actual: performanceData.productivity.actualOutput,
            target: performanceData.productivity.targetOutput,
            efficiency: performanceData.productivity.efficiency
          }
        ],
        config: {
          xAxisKey: 'time',
          dataKeys: ['actual', 'target'],
          colors: ['#3B82F6', '#10B981'],
          dimensions: { width: 600, height: 300 },
          annotations: [
            {
              type: 'line',
              value: 85,
              label: 'Efficiency Target',
              color: '#F59E0B'
            }
          ]
        }
      });
    }

    return visualizations;
  }

  private generateQualityVisualizations(qualityData: any): VisualizationConfig[] {
    const visualizations: VisualizationConfig[] = [];

    // Quality Metrics Overview
    visualizations.push({
      id: 'quality-metrics',
      type: 'stat_panel',
      title: 'Quality Performance Metrics',
      description: 'Key quality indicators and performance',
      data: [
        {
          title: 'Quality Rate',
          value: qualityData.overallQualityRate,
          unit: '%',
          color: qualityData.overallQualityRate >= 99 ? '#10B981' : 
                 qualityData.overallQualityRate >= 95 ? '#F59E0B' : '#EF4444'
        },
        {
          title: 'Defect Rate',
          value: qualityData.defectRate,
          unit: 'DPMO',
          color: qualityData.defectRate <= 233 ? '#10B981' : 
                 qualityData.defectRate <= 6210 ? '#F59E0B' : '#EF4444'
        },
        {
          title: 'Scrap Rate',
          value: qualityData.scrapRate,
          unit: '%',
          color: qualityData.scrapRate <= 1 ? '#10B981' : 
                 qualityData.scrapRate <= 3 ? '#F59E0B' : '#EF4444'
        },
        {
          title: 'Rework Rate',
          value: qualityData.reworkRate,
          unit: '%',
          color: qualityData.reworkRate <= 2 ? '#10B981' : 
                 qualityData.reworkRate <= 5 ? '#F59E0B' : '#EF4444'
        }
      ],
      config: {
        dimensions: { width: 800, height: 200 }
      }
    });

    // Quality Trends
    if (qualityData.qualityTrends && qualityData.qualityTrends.length > 0) {
      visualizations.push({
        id: 'quality-trends',
        type: 'area_chart',
        title: 'Quality Rate Trend',
        description: 'Quality performance over time',
        data: qualityData.qualityTrends,
        config: {
          xAxisKey: 'timestamp',
          yAxisKey: 'qualityRate',
          colors: ['#10B981'],
          dimensions: { width: 800, height: 300 },
          thresholds: [
            { value: 99, color: '#10B981', label: 'Target' },
            { value: 95, color: '#F59E0B', label: 'Acceptable' }
          ]
        }
      });
    }

    // Parameter Analysis
    if (qualityData.parameterAnalysis && qualityData.parameterAnalysis.length > 0) {
      visualizations.push({
        id: 'parameter-analysis',
        type: 'bar_chart',
        title: 'Quality Parameter Analysis',
        description: 'Conformance rates by parameter',
        data: qualityData.parameterAnalysis.map((p: any) => ({
          ...p,
          color: p.trend === 'declining' ? '#EF4444' : 
                 p.trend === 'improving' ? '#10B981' : '#3B82F6'
        })),
        config: {
          xAxisKey: 'parameter',
          yAxisKey: 'conformanceRate',
          colors: ['#3B82F6'],
          dimensions: { width: 800, height: 400 },
          margin: { top: 20, right: 30, bottom: 60, left: 40 }
        }
      });
    }

    return visualizations;
  }

  private generateMaintenanceVisualizations(maintenanceData: any): VisualizationConfig[] {
    const visualizations: VisualizationConfig[] = [];

    // Failure Risk Matrix
    if (maintenanceData.predictions && maintenanceData.predictions.length > 0) {
      const riskMatrix = maintenanceData.predictions.slice(0, 10).map((p: any) => ({
        equipment: p.equipmentName,
        probability: p.failureProbability,
        timeToFailure: p.estimatedTimeToFailure,
        priority: p.priority,
        size: p.priority === 'critical' ? 20 : 
               p.priority === 'high' ? 15 : 
               p.priority === 'medium' ? 10 : 5
      }));

      visualizations.push({
        id: 'failure-risk-matrix',
        type: 'scatter_plot',
        title: 'Equipment Failure Risk Matrix',
        description: 'Failure probability vs time to failure',
        data: riskMatrix,
        config: {
          xAxisKey: 'timeToFailure',
          yAxisKey: 'probability',
          dataKeys: ['equipment'],
          colors: ['#EF4444', '#F59E0B', '#3B82F6', '#10B981'],
          dimensions: { width: 800, height: 400 },
          margin: { top: 20, right: 30, bottom: 40, left: 60 }
        }
      });
    }

    // Maintenance Schedule Gantt
    if (maintenanceData.maintenanceSchedule && maintenanceData.maintenanceSchedule.length > 0) {
      const ganttData = maintenanceData.maintenanceSchedule.map((m: any) => {
        const start = new Date(m.scheduledDate);
        const end = new Date(start.getTime() + m.estimatedDuration * 60 * 1000);
        
        return {
          equipmentId: m.equipmentId,
          start: start.toISOString(),
          end: end.toISOString(),
          type: m.type,
          duration: m.estimatedDuration
        };
      });

      visualizations.push({
        id: 'maintenance-schedule',
        type: 'timeline_chart',
        title: 'Upcoming Maintenance Schedule',
        description: 'Planned maintenance activities',
        data: ganttData,
        config: {
          dimensions: { width: 800, height: 300 },
          colors: {
            preventive: '#3B82F6',
            predictive: '#F59E0B',
            corrective: '#EF4444'
          }
        }
      });
    }

    // Cost Analysis
    if (maintenanceData.costAnalysis) {
      visualizations.push({
        id: 'maintenance-cost',
        type: 'bar_chart',
        title: 'Maintenance Cost Analysis',
        description: 'Current vs Projected maintenance costs with predictive approach',
        data: [
          {
            category: 'Current (Reactive)',
            cost: maintenanceData.costAnalysis.currentCost,
            type: 'current'
          },
          {
            category: 'Projected (Predictive)',
            cost: maintenanceData.costAnalysis.projectedCost,
            type: 'projected'
          },
          {
            category: 'Potential Savings',
            cost: maintenanceData.costAnalysis.savings,
            type: 'savings'
          }
        ],
        config: {
          xAxisKey: 'category',
          yAxisKey: 'cost',
          colors: ['#EF4444', '#3B82F6', '#10B981'],
          dimensions: { width: 600, height: 400 }
        }
      });
    }

    return visualizations;
  }

  private generateRootCauseVisualizations(rootCauseData: any): VisualizationConfig[] {
    const visualizations: VisualizationConfig[] = [];

    // Fishbone Diagram
    if (rootCauseData.fishboneDiagram) {
      visualizations.push({
        id: 'fishbone-diagram',
        type: 'fishbone_diagram',
        title: 'Root Cause Analysis - Fishbone Diagram',
        description: rootCauseData.problem,
        data: Object.entries(rootCauseData.fishboneDiagram.categories).map(([category, causes]) => ({
          category: category.charAt(0).toUpperCase() + category.slice(1),
          causes: causes as string[]
        })),
        config: {
          dimensions: { width: 1000, height: 600 },
          colors: {
            man: '#3B82F6',
            machine: '#EF4444',
            method: '#F59E0B',
            material: '#10B981',
            measurement: '#8B5CF6',
            environment: '#EC4899'
          }
        }
      });
    }

    // Root Causes Probability
    if (rootCauseData.rootCauses && rootCauseData.rootCauses.length > 0) {
      visualizations.push({
        id: 'root-causes-probability',
        type: 'bar_chart',
        title: 'Root Cause Probability Analysis',
        description: 'Likelihood of each identified root cause',
        data: rootCauseData.rootCauses.slice(0, 8).map((cause: any) => ({
          cause: cause.cause.length > 50 ? cause.cause.substring(0, 50) + '...' : cause.cause,
          probability: cause.probability * 100,
          category: cause.category,
          color: this.getCategoryColor(cause.category)
        })),
        config: {
          xAxisKey: 'cause',
          yAxisKey: 'probability',
          colors: ['#3B82F6'],
          dimensions: { width: 800, height: 400 },
          margin: { top: 20, right: 30, bottom: 100, left: 40 }
        }
      });
    }

    // Recommendations Impact Matrix
    if (rootCauseData.recommendations && rootCauseData.recommendations.length > 0) {
      const impactMatrix = rootCauseData.recommendations.map((rec: any) => ({
        action: rec.action.length > 60 ? rec.action.substring(0, 60) + '...' : rec.action,
        impact: this.getNumericValue(rec.impact),
        effort: this.getNumericValue(rec.effort),
        priority: rec.priority,
        quadrant: this.getQuadrant(rec.impact, rec.effort)
      }));

      visualizations.push({
        id: 'recommendations-matrix',
        type: 'scatter_plot',
        title: 'Recommendations Impact vs Effort Matrix',
        description: 'Prioritize actions based on impact and implementation effort',
        data: impactMatrix,
        config: {
          xAxisKey: 'effort',
          yAxisKey: 'impact',
          dataKeys: ['action'],
          colors: {
            'Quick Wins': '#10B981',
            'Major Projects': '#F59E0B',
            'Fill Ins': '#3B82F6',
            'Low Priority': '#9CA3AF'
          },
          dimensions: { width: 800, height: 600 },
          annotations: [
            { type: 'quadrant', labels: ['Quick Wins', 'Major Projects', 'Low Priority', 'Fill Ins'] }
          ]
        }
      });
    }

    return visualizations;
  }

  private generateOverviewVisualization(analysisResults: any): VisualizationConfig {
    const metrics = [];
    
    if (analysisResults.performance?.oee) {
      metrics.push({
        title: 'OEE',
        value: analysisResults.performance.oee.overall,
        unit: '%',
        target: 85,
        color: analysisResults.performance.oee.overall >= 85 ? '#10B981' : 
               analysisResults.performance.oee.overall >= 75 ? '#F59E0B' : '#EF4444'
      });
    }
    
    if (analysisResults.quality) {
      metrics.push({
        title: 'Quality Rate',
        value: analysisResults.quality.overallQualityRate,
        unit: '%',
        target: 99,
        color: analysisResults.quality.overallQualityRate >= 99 ? '#10B981' : 
               analysisResults.quality.overallQualityRate >= 95 ? '#F59E0B' : '#EF4444'
      });
    }
    
    if (analysisResults.maintenance?.predictions) {
      const criticalCount = analysisResults.maintenance.predictions
        .filter((p: any) => p.priority === 'critical' || p.priority === 'high').length;
      
      metrics.push({
        title: 'High Risk Equipment',
        value: criticalCount,
        unit: 'units',
        target: 0,
        color: criticalCount === 0 ? '#10B981' : 
               criticalCount <= 2 ? '#F59E0B' : '#EF4444'
      });
    }

    return {
      id: 'executive-overview',
      type: 'stat_panel',
      title: 'Executive Dashboard',
      description: 'Key performance indicators overview',
      data: metrics,
      config: {
        dimensions: { width: 1000, height: 150 }
      }
    };
  }

  private getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      man: '#3B82F6',
      machine: '#EF4444',
      method: '#F59E0B',
      material: '#10B981',
      measurement: '#8B5CF6',
      environment: '#EC4899'
    };
    return colors[category] || '#6B7280';
  }

  private getNumericValue(level: 'high' | 'medium' | 'low'): number {
    const values = { high: 3, medium: 2, low: 1 };
    return values[level] || 1;
  }

  private getQuadrant(impact: 'high' | 'medium' | 'low', effort: 'high' | 'medium' | 'low'): string {
    const impactNum = this.getNumericValue(impact);
    const effortNum = this.getNumericValue(effort);
    
    if (impactNum >= 2 && effortNum <= 2) return 'Quick Wins';
    if (impactNum >= 2 && effortNum > 2) return 'Major Projects';
    if (impactNum < 2 && effortNum <= 2) return 'Fill Ins';
    return 'Low Priority';
  }
}