/**
 * Root Cause Analyzer Agent
 * Performs fishbone analysis, identifies root causes, and provides actionable recommendations
 */

import { BaseAgent } from '../BaseAgent';
import { 
  AgentContext, 
  AgentResult, 
  RootCauseAnalysisResult, 
  DataCollectionResult,
  QualityAnalysisResult,
  PerformanceAnalysisResult,
  AgentConfig 
} from '../types';
import { logger } from '@/lib/logger';

export class RootCauseAnalyzerAgent extends BaseAgent {
  constructor(config?: Partial<AgentConfig>) {
    super('root_cause_analyzer', {
      type: 'root_cause_analyzer',
      enabled: true,
      timeout: 30000, // 30 seconds
      retries: 2,
      priority: 3,
      dependencies: ['data_collector', 'quality_analyzer', 'performance_optimizer'],
      ...config
    });
  }

  async execute(
    context: AgentContext, 
    data: {
      collectionData: DataCollectionResult;
      qualityAnalysis?: QualityAnalysisResult;
      performanceAnalysis?: PerformanceAnalysisResult;
    }
  ): Promise<AgentResult<RootCauseAnalysisResult>> {
    this.logStart(context);
    
    try {
      if (!data || !data.collectionData) {
        throw new Error('No data provided for root cause analysis');
      }

      // Identify the main problem to analyze
      const problem = this.identifyProblem(context, data);
      
      // Perform root cause analysis
      const rootCauses = this.analyzeRootCauses(problem, data);
      
      // Generate fishbone diagram data
      const fishboneDiagram = this.generateFishboneDiagram(problem, rootCauses);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(rootCauses, data);

      const result = this.createResult<RootCauseAnalysisResult>({
        problem,
        rootCauses,
        fishboneDiagram,
        recommendations
      });

      // Send high-priority recommendations to report generator
      const highPriorityRecs = recommendations.filter(r => r.priority <= 2);
      if (highPriorityRecs.length > 0 && this.communication) {
        await this.sendMessage('report_generator', {
          type: 'root_cause_recommendations',
          data: {
            problem,
            recommendations: highPriorityRecs
          }
        });
      }

      this.logComplete(result);
      return result;

    } catch (error) {
      this.handleError(error as Error);
      return this.createResult<RootCauseAnalysisResult>(
        {
          problem: 'Unable to identify problem',
          rootCauses: [],
          fishboneDiagram: { categories: {} },
          recommendations: []
        },
        [error as Error]
      );
    }
  }

  private identifyProblem(context: AgentContext, data: any): string {
    const { qualityAnalysis, performanceAnalysis } = data;
    const query = context.query.toLowerCase();
    
    // Check query for specific problem mentions
    if (query.includes('downtime')) {
      return 'Excessive unplanned downtime affecting production';
    } else if (query.includes('quality') || query.includes('defect')) {
      return `Quality issues: ${qualityAnalysis?.defectRate || 'High'} DPMO defect rate`;
    } else if (query.includes('oee') || query.includes('performance')) {
      return `Low OEE performance: ${performanceAnalysis?.oee.overall || 'Below target'}% overall`;
    } else if (query.includes('maintenance')) {
      return 'Frequent equipment failures requiring maintenance';
    }
    
    // Default: identify based on data analysis
    if (qualityAnalysis && qualityAnalysis.defectRate > 1000) {
      return `High defect rate: ${qualityAnalysis.defectRate} DPMO`;
    } else if (performanceAnalysis && performanceAnalysis.oee.overall < 60) {
      return `Poor OEE performance: ${performanceAnalysis.oee.overall}%`;
    }
    
    return 'Manufacturing efficiency below target levels';
  }

  private analyzeRootCauses(problem: string, data: any): Array<{
    cause: string;
    category: 'man' | 'machine' | 'method' | 'material' | 'measurement' | 'environment';
    probability: number;
    evidence: string[];
  }> {
    const rootCauses: Array<{
      cause: string;
      category: 'man' | 'machine' | 'method' | 'material' | 'measurement' | 'environment';
      probability: number;
      evidence: string[];
    }> = [];

    const { collectionData, qualityAnalysis, performanceAnalysis } = data;
    const { alerts, performance, quality, maintenance } = collectionData.metrics;

    // Analyze Machine causes
    this.analyzeMachineCauses(rootCauses, alerts, performance, maintenance);
    
    // Analyze Method causes
    this.analyzeMethodCauses(rootCauses, performance, qualityAnalysis);
    
    // Analyze Material causes
    this.analyzeMaterialCauses(rootCauses, quality, qualityAnalysis);
    
    // Analyze Man (Human) causes
    this.analyzeManCauses(rootCauses, alerts, performance);
    
    // Analyze Measurement causes
    this.analyzeMeasurementCauses(rootCauses, quality, collectionData.dataQuality);
    
    // Analyze Environment causes
    this.analyzeEnvironmentCauses(rootCauses, alerts, performance);

    // Sort by probability
    return rootCauses.sort((a, b) => b.probability - a.probability);
  }

  private analyzeMachineCauses(rootCauses: any[], alerts: any[], performance: any[], maintenance: any[]) {
    // Check for equipment-related alerts
    const equipmentAlerts = alerts.filter(a => 
      a.alertType.includes('EQUIPMENT') || 
      a.alertType.includes('MAINTENANCE')
    );

    if (equipmentAlerts.length > 10) {
      rootCauses.push({
        cause: 'Equipment reliability issues - frequent breakdowns',
        category: 'machine',
        probability: 0.85,
        evidence: [
          `${equipmentAlerts.length} equipment-related alerts in period`,
          'Multiple maintenance alerts detected',
          'Pattern of recurring equipment failures'
        ]
      });
    }

    // Check for performance degradation
    const degradedEquipment = performance.filter(p => p.oeeScore < 0.5);
    if (degradedEquipment.length > 0) {
      rootCauses.push({
        cause: 'Equipment performance degradation',
        category: 'machine',
        probability: 0.75,
        evidence: [
          `${degradedEquipment.length} equipment units below 50% OEE`,
          'Significant performance decline observed'
        ]
      });
    }

    // Check maintenance intervals
    const overdueCount = maintenance.filter(m => {
      const duration = new Date(m.endTime).getTime() - new Date(m.startTime).getTime();
      return duration > 8 * 60 * 60 * 1000; // Maintenance longer than 8 hours
    }).length;

    if (overdueCount > 5) {
      rootCauses.push({
        cause: 'Inadequate preventive maintenance program',
        category: 'machine',
        probability: 0.70,
        evidence: [
          `${overdueCount} extended maintenance periods`,
          'Reactive maintenance pattern detected'
        ]
      });
    }
  }

  private analyzeMethodCauses(rootCauses: any[], performance: any[], qualityAnalysis: any) {
    // Check for process inefficiencies
    const lowPerformance = performance.filter(p => p.performance < 0.7);
    if (lowPerformance.length > performance.length * 0.3) {
      rootCauses.push({
        cause: 'Inefficient production methods or procedures',
        category: 'method',
        probability: 0.80,
        evidence: [
          `${Math.round(lowPerformance.length / performance.length * 100)}% of readings show low performance efficiency`,
          'Cycle time variations detected',
          'Process bottlenecks identified'
        ]
      });
    }

    // Check for quality issues related to process
    if (qualityAnalysis && qualityAnalysis.reworkRate > 5) {
      rootCauses.push({
        cause: 'Process control inadequacies',
        category: 'method',
        probability: 0.75,
        evidence: [
          `${qualityAnalysis.reworkRate}% rework rate`,
          'Process parameters not optimized',
          'Lack of standardized procedures'
        ]
      });
    }
  }

  private analyzeMaterialCauses(rootCauses: any[], quality: any[], qualityAnalysis: any) {
    // Check for material quality issues
    const materialDefects = quality.filter(q => 
      !q.isWithinSpec && q.parameter.toLowerCase().includes('material')
    );

    if (materialDefects.length > 0) {
      rootCauses.push({
        cause: 'Raw material quality variations',
        category: 'material',
        probability: 0.65,
        evidence: [
          `${materialDefects.length} material-related quality issues`,
          'Material specifications not met',
          'Supplier quality concerns'
        ]
      });
    }

    // Check scrap rate for material issues
    if (qualityAnalysis && qualityAnalysis.scrapRate > 3) {
      rootCauses.push({
        cause: 'Material handling or storage issues',
        category: 'material',
        probability: 0.60,
        evidence: [
          `${qualityAnalysis.scrapRate}% scrap rate`,
          'Material degradation possible',
          'Inventory management concerns'
        ]
      });
    }
  }

  private analyzeManCauses(rootCauses: any[], alerts: any[], performance: any[]) {
    // Check for operator-related issues
    const operatorAlerts = alerts.filter(a => 
      a.message.toLowerCase().includes('operator') ||
      a.alertType.includes('PROCESS')
    );

    if (operatorAlerts.length > 5) {
      rootCauses.push({
        cause: 'Operator training or skill gaps',
        category: 'man',
        probability: 0.70,
        evidence: [
          `${operatorAlerts.length} operator-related incidents`,
          'Process deviations detected',
          'Human error patterns identified'
        ]
      });
    }

    // Check for shift variations
    const performanceByHour = new Map();
    performance.forEach(p => {
      const hour = new Date(p.timestamp).getHours();
      if (!performanceByHour.has(hour)) {
        performanceByHour.set(hour, []);
      }
      performanceByHour.get(hour).push(p.oeeScore);
    });

    let maxVariation = 0;
    performanceByHour.forEach((scores, hour) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const variation = Math.max(...scores) - Math.min(...scores);
      maxVariation = Math.max(maxVariation, variation);
    });

    if (maxVariation > 0.3) {
      rootCauses.push({
        cause: 'Shift-to-shift performance variations',
        category: 'man',
        probability: 0.65,
        evidence: [
          `${Math.round(maxVariation * 100)}% OEE variation between shifts`,
          'Inconsistent operator practices',
          'Staffing level impacts'
        ]
      });
    }
  }

  private analyzeMeasurementCauses(rootCauses: any[], quality: any[], dataQuality: any) {
    // Check data quality issues
    if (dataQuality.accuracy < 0.9) {
      rootCauses.push({
        cause: 'Measurement system accuracy issues',
        category: 'measurement',
        probability: 0.60,
        evidence: [
          `Data accuracy only ${Math.round(dataQuality.accuracy * 100)}%`,
          'Sensor calibration concerns',
          'Data collection gaps'
        ]
      });
    }

    // Check for measurement variations
    const parameterVariations = new Map();
    quality.forEach(q => {
      if (!parameterVariations.has(q.parameter)) {
        parameterVariations.set(q.parameter, []);
      }
      parameterVariations.get(q.parameter).push(q.value);
    });

    let highVariationParams = 0;
    parameterVariations.forEach((values, param) => {
      if (values.length > 10) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const cv = Math.sqrt(variance) / mean; // Coefficient of variation
        
        if (cv > 0.1) { // High variation
          highVariationParams++;
        }
      }
    });

    if (highVariationParams > 2) {
      rootCauses.push({
        cause: 'Measurement system variation',
        category: 'measurement',
        probability: 0.55,
        evidence: [
          `${highVariationParams} parameters show high measurement variation`,
          'Gage R&R study recommended',
          'Measurement standardization needed'
        ]
      });
    }
  }

  private analyzeEnvironmentCauses(rootCauses: any[], alerts: any[], performance: any[]) {
    // Check for environmental alerts
    const envAlerts = alerts.filter(a => 
      a.message.toLowerCase().includes('temperature') ||
      a.message.toLowerCase().includes('humidity') ||
      a.message.toLowerCase().includes('environment')
    );

    if (envAlerts.length > 3) {
      rootCauses.push({
        cause: 'Environmental conditions affecting production',
        category: 'environment',
        probability: 0.50,
        evidence: [
          `${envAlerts.length} environment-related alerts`,
          'Temperature/humidity variations detected',
          'Environmental control needed'
        ]
      });
    }

    // Check for time-based patterns (seasonal/daily)
    const performanceByDayOfWeek = new Map();
    performance.forEach(p => {
      const day = new Date(p.timestamp).getDay();
      if (!performanceByDayOfWeek.has(day)) {
        performanceByDayOfWeek.set(day, []);
      }
      performanceByDayOfWeek.get(day).push(p.oeeScore);
    });

    let weekendIssue = false;
    const weekendDays = [0, 6]; // Sunday, Saturday
    weekendDays.forEach(day => {
      const scores = performanceByDayOfWeek.get(day) || [];
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avg < 0.7) {
          weekendIssue = true;
        }
      }
    });

    if (weekendIssue) {
      rootCauses.push({
        cause: 'Weekend/off-hours environmental or operational changes',
        category: 'environment',
        probability: 0.45,
        evidence: [
          'Performance drops during weekends',
          'Facility conditions may vary',
          'Reduced support staff impact'
        ]
      });
    }
  }

  private generateFishboneDiagram(problem: string, rootCauses: any[]): { categories: Record<string, string[]> } {
    const categories: Record<string, string[]> = {
      man: [],
      machine: [],
      method: [],
      material: [],
      measurement: [],
      environment: []
    };

    // Group root causes by category
    rootCauses.forEach(cause => {
      if (categories[cause.category]) {
        categories[cause.category].push(cause.cause);
      }
    });

    // Add standard considerations for empty categories
    if (categories.man.length === 0) {
      categories.man.push('Training adequacy', 'Skill levels', 'Communication');
    }
    if (categories.machine.length === 0) {
      categories.machine.push('Equipment condition', 'Maintenance schedule', 'Capacity');
    }
    if (categories.method.length === 0) {
      categories.method.push('Process standards', 'Work instructions', 'Best practices');
    }
    if (categories.material.length === 0) {
      categories.material.push('Material quality', 'Supplier reliability', 'Storage conditions');
    }
    if (categories.measurement.length === 0) {
      categories.measurement.push('Measurement accuracy', 'Calibration', 'Data collection');
    }
    if (categories.environment.length === 0) {
      categories.environment.push('Temperature control', 'Workspace layout', 'Safety conditions');
    }

    return { categories };
  }

  private generateRecommendations(rootCauses: any[], data: any): Array<{
    action: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
    priority: number;
  }> {
    const recommendations: Array<{
      action: string;
      impact: 'high' | 'medium' | 'low';
      effort: 'high' | 'medium' | 'low';
      priority: number;
    }> = [];

    // Generate recommendations for top root causes
    rootCauses.slice(0, 5).forEach((cause, index) => {
      const recs = this.getRecommendationsForCause(cause);
      recs.forEach((rec, recIndex) => {
        recommendations.push({
          ...rec,
          priority: index + 1 + (recIndex * 0.1) // Prioritize by root cause ranking
        });
      });
    });

    // Sort by priority
    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  private getRecommendationsForCause(cause: any): Array<{
    action: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'high' | 'medium' | 'low';
  }> {
    const recommendations = [];

    switch (cause.category) {
      case 'machine':
        if (cause.cause.includes('reliability')) {
          recommendations.push({
            action: 'Implement predictive maintenance program using IoT sensors and ML algorithms',
            impact: 'high',
            effort: 'high'
          });
          recommendations.push({
            action: 'Conduct immediate equipment audit and create maintenance backlog prioritization',
            impact: 'high',
            effort: 'low'
          });
        }
        if (cause.cause.includes('performance degradation')) {
          recommendations.push({
            action: 'Schedule equipment overhaul and component replacement for critical assets',
            impact: 'high',
            effort: 'medium'
          });
        }
        break;

      case 'method':
        if (cause.cause.includes('inefficient')) {
          recommendations.push({
            action: 'Conduct time and motion study to optimize production workflow',
            impact: 'high',
            effort: 'medium'
          });
          recommendations.push({
            action: 'Implement lean manufacturing principles and eliminate non-value-added activities',
            impact: 'high',
            effort: 'high'
          });
        }
        if (cause.cause.includes('process control')) {
          recommendations.push({
            action: 'Deploy Statistical Process Control (SPC) charts for critical parameters',
            impact: 'medium',
            effort: 'low'
          });
        }
        break;

      case 'material':
        if (cause.cause.includes('quality variations')) {
          recommendations.push({
            action: 'Implement incoming material inspection and supplier scorecard system',
            impact: 'medium',
            effort: 'medium'
          });
          recommendations.push({
            action: 'Establish material specifications agreement with suppliers',
            impact: 'medium',
            effort: 'low'
          });
        }
        break;

      case 'man':
        if (cause.cause.includes('training')) {
          recommendations.push({
            action: 'Develop comprehensive operator certification program',
            impact: 'high',
            effort: 'medium'
          });
          recommendations.push({
            action: 'Create visual work instructions and SOPs for critical operations',
            impact: 'medium',
            effort: 'low'
          });
        }
        if (cause.cause.includes('shift')) {
          recommendations.push({
            action: 'Standardize shift handover procedures and checklists',
            impact: 'medium',
            effort: 'low'
          });
        }
        break;

      case 'measurement':
        if (cause.cause.includes('accuracy')) {
          recommendations.push({
            action: 'Conduct measurement system analysis (MSA) and calibrate all instruments',
            impact: 'medium',
            effort: 'medium'
          });
        }
        break;

      case 'environment':
        if (cause.cause.includes('conditions')) {
          recommendations.push({
            action: 'Install environmental monitoring and control systems',
            impact: 'medium',
            effort: 'high'
          });
        }
        break;
    }

    // Add general recommendation if none specific
    if (recommendations.length === 0) {
      recommendations.push({
        action: `Address ${cause.cause} through targeted improvement project`,
        impact: 'medium',
        effort: 'medium'
      });
    }

    return recommendations;
  }
}