/**
 * Report Generator Agent
 * Generates comprehensive reports from analysis results
 */

import { BaseAgent } from '../BaseAgent';
import { 
  AgentContext, 
  AgentResult, 
  ReportConfig,
  VisualizationConfig,
  AgentConfig 
} from '../types';
import { logger } from '@/lib/logger';

export class ReportGeneratorAgent extends BaseAgent {
  constructor(config?: Partial<AgentConfig>) {
    super('report_generator', {
      type: 'report_generator',
      enabled: true,
      timeout: 25000, // 25 seconds
      retries: 2,
      priority: 5,
      dependencies: ['visualization_generator'],
      ...config
    });
  }

  async execute(
    context: AgentContext,
    data: {
      analysisResults: any;
      visualizations: VisualizationConfig[];
    }
  ): Promise<AgentResult<{ content: string; format: string; metadata: any }>> {
    this.logStart(context);
    
    try {
      const reportFormat = context.preferences?.reportFormat || 'detailed';
      const reportConfig: ReportConfig = {
        format: reportFormat,
        sections: {
          executive: reportFormat === 'executive' || reportFormat === 'detailed',
          analysis: reportFormat === 'detailed',
          visualizations: true,
          recommendations: true,
          appendix: reportFormat === 'detailed'
        }
      };

      // Generate report content
      const reportContent = this.generateReport(
        context,
        data.analysisResults,
        data.visualizations,
        reportConfig
      );

      // Generate metadata
      const metadata = this.generateReportMetadata(
        context,
        data.analysisResults,
        reportConfig
      );

      const result = this.createResult({
        content: reportContent,
        format: 'markdown',
        metadata
      });

      this.logComplete(result);
      return result;

    } catch (error) {
      this.handleError(error as Error);
      return this.createResult(
        {
          content: 'Error generating report',
          format: 'text',
          metadata: {}
        },
        [error as Error]
      );
    }
  }

  private generateReport(
    context: AgentContext,
    analysisResults: any,
    visualizations: VisualizationConfig[],
    config: ReportConfig
  ): string {
    const sections: string[] = [];
    const timestamp = new Date().toISOString();

    // Header
    sections.push(this.generateHeader(context, timestamp));

    // Executive Summary
    if (config.sections.executive) {
      sections.push(this.generateExecutiveSummary(analysisResults));
    }

    // Detailed Analysis
    if (config.sections.analysis) {
      sections.push(this.generateDetailedAnalysis(analysisResults));
    }

    // Visualizations
    if (config.sections.visualizations && visualizations.length > 0) {
      sections.push(this.generateVisualizationsSection(visualizations));
    }

    // Recommendations
    if (config.sections.recommendations) {
      sections.push(this.generateRecommendations(analysisResults));
    }

    // Appendix
    if (config.sections.appendix) {
      sections.push(this.generateAppendix(analysisResults, context));
    }

    // Footer
    sections.push(this.generateFooter());

    return sections.join('\n\n---\n\n');
  }

  private generateHeader(context: AgentContext, timestamp: string): string {
    return `# Manufacturing Analytics Report

**Generated**: ${new Date(timestamp).toLocaleString()}  
**Analysis Type**: ${context.analysisType.replace(/_/g, ' ').toUpperCase()}  
**Time Period**: ${new Date(context.timeRange.start).toLocaleDateString()} - ${new Date(context.timeRange.end).toLocaleDateString()}  
**Query**: "${context.query}"

---`;
  }

  private generateExecutiveSummary(analysisResults: any): string {
    const sections: string[] = ['## Executive Summary'];
    
    // Key Findings
    sections.push('### Key Findings');
    const keyFindings: string[] = [];

    if (analysisResults.performance?.oee) {
      const oee = analysisResults.performance.oee.overall;
      const status = oee >= 85 ? '✅ Excellent' : oee >= 75 ? '⚠️ Good' : '🚨 Needs Improvement';
      keyFindings.push(`- **OEE Performance**: ${oee}% (${status})`);
    }

    if (analysisResults.quality) {
      const qualityRate = analysisResults.quality.overallQualityRate;
      const defectRate = analysisResults.quality.defectRate;
      keyFindings.push(`- **Quality Rate**: ${qualityRate}% with ${defectRate} DPMO`);
    }

    if (analysisResults.maintenance?.predictions) {
      const critical = analysisResults.maintenance.predictions.filter((p: any) => 
        p.priority === 'critical' || p.priority === 'high'
      ).length;
      if (critical > 0) {
        keyFindings.push(`- **Maintenance Alert**: ${critical} equipment units at high risk of failure`);
      }
    }

    if (analysisResults.rootCause?.rootCauses) {
      const topCause = analysisResults.rootCause.rootCauses[0];
      if (topCause) {
        keyFindings.push(`- **Primary Root Cause**: ${topCause.cause} (${Math.round(topCause.probability * 100)}% probability)`);
      }
    }

    sections.push(keyFindings.join('\n'));

    // Business Impact
    sections.push('\n### Business Impact');
    const impacts: string[] = [];

    if (analysisResults.performance?.bottlenecks && analysisResults.performance.bottlenecks.length > 0) {
      const totalImpact = analysisResults.performance.bottlenecks
        .reduce((sum: number, b: any) => sum + b.impact, 0);
      impacts.push(`- Production bottlenecks causing ${Math.round(totalImpact)}% efficiency loss`);
    }

    if (analysisResults.maintenance?.costAnalysis) {
      const savings = analysisResults.maintenance.costAnalysis.savings;
      if (savings > 0) {
        impacts.push(`- Potential cost savings of $${savings.toLocaleString()} through predictive maintenance`);
      }
    }

    if (analysisResults.quality) {
      const scrapCost = analysisResults.quality.scrapRate * 1000; // Estimated cost per percentage
      impacts.push(`- Quality issues resulting in estimated $${Math.round(scrapCost).toLocaleString()} in scrap costs`);
    }

    sections.push(impacts.join('\n'));

    // Immediate Actions Required
    sections.push('\n### Immediate Actions Required');
    const actions = this.getTopActions(analysisResults);
    sections.push(actions.map((a, i) => `${i + 1}. ${a}`).join('\n'));

    return sections.join('\n');
  }

  private generateDetailedAnalysis(analysisResults: any): string {
    const sections: string[] = ['## Detailed Analysis'];

    // Performance Analysis
    if (analysisResults.performance) {
      sections.push(this.generatePerformanceAnalysis(analysisResults.performance));
    }

    // Quality Analysis
    if (analysisResults.quality) {
      sections.push(this.generateQualityAnalysis(analysisResults.quality));
    }

    // Maintenance Analysis
    if (analysisResults.maintenance) {
      sections.push(this.generateMaintenanceAnalysis(analysisResults.maintenance));
    }

    // Root Cause Analysis
    if (analysisResults.rootCause) {
      sections.push(this.generateRootCauseAnalysis(analysisResults.rootCause));
    }

    return sections.join('\n\n');
  }

  private generatePerformanceAnalysis(performance: any): string {
    const sections: string[] = ['### Performance Analysis'];

    // OEE Analysis
    if (performance.oee) {
      sections.push(`
#### Overall Equipment Effectiveness (OEE)

| Component | Current | Target | Gap |
|-----------|---------|--------|-----|
| **Overall OEE** | ${performance.oee.overall}% | 85% | ${85 - performance.oee.overall}% |
| Availability | ${performance.oee.availability}% | 90% | ${90 - performance.oee.availability}% |
| Performance | ${performance.oee.performance}% | 95% | ${95 - performance.oee.performance}% |
| Quality | ${performance.oee.quality}% | 99% | ${99 - performance.oee.quality}% |
`);
    }

    // Productivity Analysis
    if (performance.productivity) {
      sections.push(`
#### Productivity Metrics

- **Actual Output**: ${performance.productivity.actualOutput.toLocaleString()} units
- **Target Output**: ${performance.productivity.targetOutput.toLocaleString()} units
- **Efficiency**: ${performance.productivity.efficiency}%
`);
    }

    // Bottlenecks
    if (performance.bottlenecks && performance.bottlenecks.length > 0) {
      sections.push(`
#### Production Bottlenecks

| Equipment | Impact | Type | Action Required |
|-----------|--------|------|-----------------|
${performance.bottlenecks.slice(0, 5).map((b: any) => 
  `| ${b.equipment} | ${b.impact}% | ${b.type} | Immediate attention |`
).join('\n')}`);
    }

    return sections.join('\n');
  }

  private generateQualityAnalysis(quality: any): string {
    const sections: string[] = ['### Quality Analysis'];

    sections.push(`
#### Quality Metrics Summary

- **Overall Quality Rate**: ${quality.overallQualityRate}% ${quality.overallQualityRate >= 99 ? '✅' : quality.overallQualityRate >= 95 ? '⚠️' : '🚨'}
- **Defect Rate**: ${quality.defectRate} DPMO
- **Scrap Rate**: ${quality.scrapRate}%
- **Rework Rate**: ${quality.reworkRate}%
`);

    // Parameter Analysis
    if (quality.parameterAnalysis && quality.parameterAnalysis.length > 0) {
      sections.push(`
#### Parameter Performance

| Parameter | Conformance | Out of Spec | Trend |
|-----------|-------------|-------------|-------|
${quality.parameterAnalysis.slice(0, 5).map((p: any) => 
  `| ${p.parameter} | ${p.conformanceRate}% | ${p.outOfSpecCount} | ${p.trend} |`
).join('\n')}`);
    }

    // Quality Recommendations
    if (quality.recommendations && quality.recommendations.length > 0) {
      sections.push(`
#### Quality Improvement Recommendations

${quality.recommendations.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}`);
    }

    return sections.join('\n');
  }

  private generateMaintenanceAnalysis(maintenance: any): string {
    const sections: string[] = ['### Maintenance Analysis'];

    // High Risk Equipment
    if (maintenance.predictions && maintenance.predictions.length > 0) {
      const criticalEquipment = maintenance.predictions.filter((p: any) => 
        p.priority === 'critical' || p.priority === 'high'
      );

      sections.push(`
#### Equipment Risk Assessment

**${criticalEquipment.length} equipment units require immediate attention**

| Equipment | Failure Probability | Time to Failure | Recommended Action |
|-----------|-------------------|-----------------|-------------------|
${criticalEquipment.slice(0, 5).map((p: any) => 
  `| ${p.equipmentName} | ${p.failureProbability}% | ${p.estimatedTimeToFailure} days | ${p.recommendedAction} |`
).join('\n')}`);
    }

    // Maintenance Schedule
    if (maintenance.maintenanceSchedule && maintenance.maintenanceSchedule.length > 0) {
      sections.push(`
#### Upcoming Maintenance Schedule

| Equipment | Scheduled Date | Type | Duration |
|-----------|---------------|------|----------|
${maintenance.maintenanceSchedule.slice(0, 5).map((m: any) => 
  `| ${m.equipmentId} | ${new Date(m.scheduledDate).toLocaleDateString()} | ${m.type} | ${m.estimatedDuration} min |`
).join('\n')}`);
    }

    // Cost Analysis
    if (maintenance.costAnalysis) {
      sections.push(`
#### Maintenance Cost Analysis

- **Current Cost (Reactive)**: $${maintenance.costAnalysis.currentCost.toLocaleString()}
- **Projected Cost (Predictive)**: $${maintenance.costAnalysis.projectedCost.toLocaleString()}
- **Potential Savings**: $${maintenance.costAnalysis.savings.toLocaleString()} (${Math.round(maintenance.costAnalysis.savings / maintenance.costAnalysis.currentCost * 100)}% reduction)
`);
    }

    return sections.join('\n');
  }

  private generateRootCauseAnalysis(rootCause: any): string {
    const sections: string[] = ['### Root Cause Analysis'];

    sections.push(`
#### Problem Statement
> ${rootCause.problem}
`);

    // Top Root Causes
    if (rootCause.rootCauses && rootCause.rootCauses.length > 0) {
      sections.push(`
#### Identified Root Causes

| Rank | Root Cause | Category | Probability | Evidence |
|------|-----------|----------|-------------|----------|
${rootCause.rootCauses.slice(0, 5).map((cause: any, i: number) => 
  `| ${i + 1} | ${cause.cause} | ${cause.category} | ${Math.round(cause.probability * 100)}% | ${cause.evidence.length} factors |`
).join('\n')}`);
    }

    // Recommendations
    if (rootCause.recommendations && rootCause.recommendations.length > 0) {
      sections.push(`
#### Prioritized Actions

| Priority | Action | Impact | Effort |
|----------|--------|--------|--------|
${rootCause.recommendations.slice(0, 5).map((rec: any) => 
  `| ${rec.priority} | ${rec.action} | ${rec.impact} | ${rec.effort} |`
).join('\n')}`);
    }

    return sections.join('\n');
  }

  private generateVisualizationsSection(visualizations: VisualizationConfig[]): string {
    const sections: string[] = ['## Data Visualizations'];

    sections.push(`
This analysis generated ${visualizations.length} data visualizations to support decision-making:
`);

    visualizations.forEach((viz, index) => {
      sections.push(`
### ${index + 1}. ${viz.title}

- **Type**: ${viz.type.replace(/_/g, ' ').charAt(0).toUpperCase() + viz.type.replace(/_/g, ' ').slice(1)}
- **Description**: ${viz.description}
- **Chart ID**: \`${viz.id}\`
`);
    });

    return sections.join('\n');
  }

  private generateRecommendations(analysisResults: any): string {
    const sections: string[] = ['## Recommendations'];
    const allRecommendations: any[] = [];

    // Collect all recommendations
    if (analysisResults.performance?.improvements) {
      analysisResults.performance.improvements.forEach((imp: any) => {
        allRecommendations.push({
          source: 'Performance',
          recommendation: imp.opportunity,
          impact: imp.potentialGain,
          priority: imp.priority
        });
      });
    }

    if (analysisResults.quality?.recommendations) {
      analysisResults.quality.recommendations.forEach((rec: string) => {
        allRecommendations.push({
          source: 'Quality',
          recommendation: rec,
          impact: 'Medium',
          priority: 'medium'
        });
      });
    }

    if (analysisResults.rootCause?.recommendations) {
      analysisResults.rootCause.recommendations.forEach((rec: any) => {
        allRecommendations.push({
          source: 'Root Cause',
          recommendation: rec.action,
          impact: rec.impact,
          priority: rec.priority <= 2 ? 'high' : rec.priority <= 4 ? 'medium' : 'low'
        });
      });
    }

    // Group by priority
    const highPriority = allRecommendations.filter(r => r.priority === 'high' || r.priority === 'critical');
    const mediumPriority = allRecommendations.filter(r => r.priority === 'medium');
    const lowPriority = allRecommendations.filter(r => r.priority === 'low');

    if (highPriority.length > 0) {
      sections.push(`
### High Priority Actions

${highPriority.map((r, i) => `${i + 1}. **[${r.source}]** ${r.recommendation}`).join('\n')}`);
    }

    if (mediumPriority.length > 0) {
      sections.push(`
### Medium Priority Actions

${mediumPriority.map((r, i) => `${i + 1}. **[${r.source}]** ${r.recommendation}`).join('\n')}`);
    }

    if (lowPriority.length > 0) {
      sections.push(`
### Low Priority Actions

${lowPriority.map((r, i) => `${i + 1}. **[${r.source}]** ${r.recommendation}`).join('\n')}`);
    }

    // Implementation Roadmap
    sections.push(`
### Implementation Roadmap

1. **Immediate (0-7 days)**
   - Address critical equipment failures
   - Implement quick wins for quality improvements
   - Schedule urgent maintenance activities

2. **Short-term (1-4 weeks)**
   - Deploy monitoring solutions for high-risk equipment
   - Standardize operating procedures
   - Conduct operator training sessions

3. **Medium-term (1-3 months)**
   - Implement predictive maintenance program
   - Upgrade measurement systems
   - Establish continuous improvement processes

4. **Long-term (3-12 months)**
   - Complete digital transformation initiatives
   - Achieve world-class OEE targets
   - Establish center of excellence for manufacturing analytics
`);

    return sections.join('\n');
  }

  private generateAppendix(analysisResults: any, context: AgentContext): string {
    const sections: string[] = ['## Appendix'];

    // Data Quality Metrics
    if (analysisResults.collectionData?.dataQuality) {
      const dq = analysisResults.collectionData.dataQuality;
      sections.push(`
### A. Data Quality Assessment

- **Completeness**: ${Math.round(dq.completeness * 100)}%
- **Accuracy**: ${Math.round(dq.accuracy * 100)}%
- **Timeliness**: ${Math.round(dq.timeliness * 100)}%
`);
    }

    // ISO Standards References
    sections.push(`
### B. Relevant ISO Standards

1. **ISO 22400-2:2014** - Manufacturing Operations Management KPIs
   - Defines standard KPIs for manufacturing operations
   - Used for OEE and performance calculations

2. **ISO 14224:2016** - Reliability Data Collection
   - Standards for equipment reliability and maintenance data
   - Used for failure prediction and maintenance planning

3. **ISO 9001:2015** - Quality Management Systems
   - Quality management requirements
   - Used for quality metrics and improvement processes
`);

    // Glossary
    sections.push(`
### C. Glossary of Terms

- **OEE**: Overall Equipment Effectiveness = Availability × Performance × Quality
- **DPMO**: Defects Per Million Opportunities
- **MTBF**: Mean Time Between Failures
- **MTTR**: Mean Time To Repair
- **TPM**: Total Productive Maintenance
- **SPC**: Statistical Process Control
`);

    // Analysis Parameters
    sections.push(`
### D. Analysis Parameters

- **Analysis Period**: ${new Date(context.timeRange.start).toLocaleDateString()} to ${new Date(context.timeRange.end).toLocaleDateString()}
- **Data Points Analyzed**: ${this.countDataPoints(analysisResults)}
- **Confidence Level**: ${this.calculateOverallConfidence(analysisResults)}%
- **Analysis Type**: ${context.analysisType}
`);

    return sections.join('\n');
  }

  private generateFooter(): string {
    return `
---

*This report was automatically generated by the Manufacturing AnalyticsPlatform AI Pipeline. For questions or clarifications, please contact the manufacturing engineering team.*

**Disclaimer**: This analysis is based on available data at the time of generation. Recommendations should be validated with operational teams before implementation.`;
  }

  private getTopActions(analysisResults: any): string[] {
    const actions: string[] = [];

    // Critical maintenance actions
    if (analysisResults.maintenance?.predictions) {
      const critical = analysisResults.maintenance.predictions
        .filter((p: any) => p.priority === 'critical')
        .slice(0, 2);
      
      critical.forEach((p: any) => {
        actions.push(`Schedule immediate maintenance for ${p.equipmentName}`);
      });
    }

    // Quality actions
    if (analysisResults.quality?.overallQualityRate < 95) {
      actions.push('Implement quality control measures to achieve 95%+ quality rate');
    }

    // Performance actions
    if (analysisResults.performance?.oee?.overall < 75) {
      actions.push('Deploy OEE improvement program targeting availability and performance');
    }

    // Root cause actions
    if (analysisResults.rootCause?.recommendations && analysisResults.rootCause.recommendations.length > 0) {
      const topRec = analysisResults.rootCause.recommendations[0];
      actions.push(topRec.action);
    }

    return actions.slice(0, 5); // Return top 5 actions
  }

  private generateReportMetadata(
    context: AgentContext,
    analysisResults: any,
    config: ReportConfig
  ): any {
    return {
      reportId: `${context.sessionId}-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      analysisType: context.analysisType,
      timeRange: context.timeRange,
      format: config.format,
      sections: Object.keys(config.sections).filter(s => config.sections[s as keyof typeof config.sections]),
      dataPoints: this.countDataPoints(analysisResults),
      confidence: this.calculateOverallConfidence(analysisResults),
      version: '1.0.0'
    };
  }

  private countDataPoints(analysisResults: any): number {
    let count = 0;
    
    if (analysisResults.collectionData?.metrics) {
      const metrics = analysisResults.collectionData.metrics;
      count += (metrics.performance?.length || 0) +
               (metrics.quality?.length || 0) +
               (metrics.maintenance?.length || 0) +
               (metrics.alerts?.length || 0);
    }
    
    return count;
  }

  private calculateOverallConfidence(analysisResults: any): number {
    const confidences: number[] = [];
    
    if (analysisResults.collectionData?.dataQuality) {
      const dq = analysisResults.collectionData.dataQuality;
      confidences.push((dq.completeness + dq.accuracy + dq.timeliness) / 3);
    }
    
    if (analysisResults.rootCause?.rootCauses) {
      const avgProbability = analysisResults.rootCause.rootCauses
        .reduce((sum: number, c: any) => sum + c.probability, 0) / 
        analysisResults.rootCause.rootCauses.length;
      confidences.push(avgProbability);
    }
    
    const overallConfidence = confidences.length > 0 ?
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 0.5;
    
    return Math.round(overallConfidence * 100);
  }
}