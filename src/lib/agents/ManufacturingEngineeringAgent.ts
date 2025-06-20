import { prisma } from '@/lib/prisma';

// ISO Standards References
const ISO_STANDARDS = {
  '22400': {
    title: 'ISO 22400-2:2014 Manufacturing Operations Management KPIs',
    url: 'https://www.iso.org/standard/56847.html',
    description: 'Key performance indicators for manufacturing operations'
  },
  '14224': {
    title: 'ISO 14224:2016 Reliability Data Collection and Exchange',
    url: 'https://www.iso.org/standard/64076.html', 
    description: 'Equipment reliability and maintenance data standards'
  },
  '9001': {
    title: 'ISO 9001:2015 Quality Management Systems',
    url: 'https://www.iso.org/standard/62085.html',
    description: 'Quality management system requirements'
  }
};

// Manufacturing Analysis Types
export type AnalysisType = 
  | 'oee_analysis'
  | 'downtime_analysis' 
  | 'quality_analysis'
  | 'maintenance_analysis'
  | 'production_analysis'
  | 'root_cause_analysis'
  | 'performance_trending';

// Visualization Types for Recharts
export type VisualizationType = 
  | 'line_chart'
  | 'bar_chart'
  | 'area_chart'
  | 'pareto_chart'
  | 'fishbone_diagram'
  | 'scatter_plot'
  | 'pie_chart'
  | 'gauge_chart';

// Agent Response Interface
export interface AgentResponse {
  content: string;
  confidence: number;
  visualizations: VisualizationConfig[];
  references: Reference[];
  analysisType: AnalysisType;
  executionTime: number;
  dataPoints: number;
}

export interface VisualizationConfig {
  chartType: VisualizationType;
  chartId: string;
  title: string;
  description: string;
  data: any[];
  config: {
    xAxisKey?: string;
    yAxisKey?: string;
    dataKey?: string;
    colors?: string[];
    width?: number;
    height?: number;
    margin?: { top: number; right: number; bottom: number; left: number };
  };
}

export interface Reference {
  type: 'standard' | 'calculation' | 'benchmark' | 'recommendation';
  id: string;
  title: string;
  description?: string;
  url?: string;
}

// Manufacturing Engineering Agent Class
export class ManufacturingEngineeringAgent {
  private startTime: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  async execute(query: string, context?: any): Promise<AgentResponse> {
    const executionStart = Date.now();
    
    try {
      // Analyze query to determine analysis type
      const analysisType = this.classifyQuery(query);
      
      // Fetch relevant data based on analysis type
      const data = await this.fetchRelevantData(analysisType, query);
      
      // Perform analysis
      const analysis = await this.performAnalysis(analysisType, data, query);
      
      // Generate visualizations
      const visualizations = this.generateVisualizations(analysisType, data, analysis);
      
      // Get relevant ISO references
      const references = this.getReferences(analysisType);
      
      // Calculate confidence based on data quality and completeness
      const confidence = this.calculateConfidence(data, analysis);
      
      return {
        content: analysis.content,
        confidence,
        visualizations,
        references,
        analysisType,
        executionTime: Date.now() - executionStart,
        dataPoints: analysis.dataPoints
      };
      
    } catch (error) {
      console.error('Manufacturing Engineering Agent Error:', error);
      
      return {
        content: `I encountered an error analyzing your manufacturing data: ${error.message}. Please check your database connection and try again.`,
        confidence: 0,
        visualizations: [],
        references: [],
        analysisType: 'oee_analysis',
        executionTime: Date.now() - executionStart,
        dataPoints: 0
      };
    }
  }

  private classifyQuery(query: string): AnalysisType {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('oee') || queryLower.includes('overall equipment')) {
      return 'oee_analysis';
    } else if (queryLower.includes('downtime') || queryLower.includes('contributor') || queryLower.includes('failure')) {
      return 'downtime_analysis';
    } else if (queryLower.includes('quality') || queryLower.includes('defect') || queryLower.includes('scrap')) {
      return 'quality_analysis';
    } else if (queryLower.includes('maintenance') || queryLower.includes('mtbf') || queryLower.includes('mttr')) {
      return 'maintenance_analysis';
    } else if (queryLower.includes('production') || queryLower.includes('rate') || queryLower.includes('output')) {
      return 'production_analysis';
    } else if (queryLower.includes('root cause') || queryLower.includes('analysis') || queryLower.includes('why')) {
      return 'root_cause_analysis';
    } else if (queryLower.includes('trend') || queryLower.includes('over time') || queryLower.includes('history')) {
      return 'performance_trending';
    }
    
    return 'oee_analysis'; // Default
  }

  private async fetchRelevantData(analysisType: AnalysisType, query: string) {
    const timeRange = this.extractTimeRange(query);
    
    switch (analysisType) {
      case 'oee_analysis':
        return this.fetchOEEData(timeRange);
      case 'downtime_analysis':
        return this.fetchDowntimeData(timeRange);
      case 'quality_analysis':
        return this.fetchQualityData(timeRange);
      case 'maintenance_analysis':
        return this.fetchMaintenanceData(timeRange);
      case 'production_analysis':
        return this.fetchProductionData(timeRange);
      case 'root_cause_analysis':
        return this.fetchRootCauseData(timeRange);
      case 'performance_trending':
        return this.fetchTrendingData(timeRange);
      default:
        return this.fetchOEEData(timeRange);
    }
  }

  private extractTimeRange(query: string): { start: Date; end: Date } {
    const now = new Date();
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('today')) {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { start, end: now };
    } else if (queryLower.includes('yesterday')) {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else if (queryLower.includes('week')) {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { start, end: now };
    } else if (queryLower.includes('month')) {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      return { start, end: now };
    }
    
    // Default: last 24 hours
    const start = new Date(now);
    start.setHours(start.getHours() - 24);
    return { start, end: now };
  }

  private async fetchOEEData(timeRange: { start: Date; end: Date }) {
    const [workUnits, performanceMetrics] = await Promise.all([
      prisma.workUnit.findMany({
        where: { status: { in: ['operational', 'maintenance'] } },
        include: {
          WorkCenter: {
            include: {
              Area: {
                include: { Site: true }
              }
            }
          },
          Alert: {
            where: { status: 'active' }
          }
        }
      }),
      prisma.performanceMetric.findMany({
        where: {
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          WorkUnit: {
            select: {
              name: true,
              code: true,
              equipmentType: true,
              status: true
            }
          }
        },
        orderBy: { timestamp: 'desc' }
      })
    ]);

    return { workUnits, performanceMetrics, timeRange };
  }

  private async fetchDowntimeData(timeRange: { start: Date; end: Date }) {
    const [alerts, performanceMetrics, maintenanceRecords] = await Promise.all([
      prisma.alert.findMany({
        where: {
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          WorkUnit: {
            select: {
              name: true,
              code: true,
              equipmentType: true
            }
          }
        },
        orderBy: { timestamp: 'desc' }
      }),
      prisma.performanceMetric.findMany({
        where: {
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end
          },
          unplannedDowntime: { gt: 0 }
        },
        include: {
          WorkUnit: {
            select: {
              name: true,
              code: true,
              equipmentType: true
            }
          }
        },
        orderBy: { unplannedDowntime: 'desc' }
      }),
      prisma.maintenanceRecord.findMany({
        where: {
          startTime: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          WorkUnit: {
            select: {
              name: true,
              code: true,
              equipmentType: true
            }
          }
        }
      })
    ]);

    return { alerts, performanceMetrics, maintenanceRecords, timeRange };
  }

  private async fetchQualityData(timeRange: { start: Date; end: Date }) {
    const [qualityMetrics, qualityChecks] = await Promise.all([
      prisma.qualityMetric.findMany({
        where: {
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          WorkUnit: {
            select: {
              name: true,
              code: true,
              equipmentType: true
            }
          }
        },
        orderBy: { timestamp: 'desc' }
      }),
      prisma.qualityCheck.findMany({
        where: {
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        }
      })
    ]);

    return { qualityMetrics, qualityChecks, timeRange };
  }

  private async fetchMaintenanceData(timeRange: { start: Date; end: Date }) {
    const maintenanceRecords = await prisma.maintenanceRecord.findMany({
      where: {
        startTime: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      },
      include: {
        WorkUnit: {
          select: {
            name: true,
            code: true,
            equipmentType: true,
            lastMaintenanceAt: true
          }
        }
      },
      orderBy: { startTime: 'desc' }
    });

    return { maintenanceRecords, timeRange };
  }

  private async fetchProductionData(timeRange: { start: Date; end: Date }) {
    const performanceMetrics = await prisma.performanceMetric.findMany({
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      },
      include: {
        WorkUnit: {
          select: {
            name: true,
            code: true,
            equipmentType: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    return { performanceMetrics, timeRange };
  }

  private async fetchRootCauseData(timeRange: { start: Date; end: Date }) {
    // Comprehensive data for root cause analysis
    const [alerts, performanceMetrics, qualityMetrics, maintenanceRecords] = await Promise.all([
      this.fetchDowntimeData(timeRange).then(d => d.alerts),
      this.fetchOEEData(timeRange).then(d => d.performanceMetrics),
      this.fetchQualityData(timeRange).then(d => d.qualityMetrics),
      this.fetchMaintenanceData(timeRange).then(d => d.maintenanceRecords)
    ]);

    return { alerts, performanceMetrics, qualityMetrics, maintenanceRecords, timeRange };
  }

  private async fetchTrendingData(timeRange: { start: Date; end: Date }) {
    // Extended time range for trending
    const extendedStart = new Date(timeRange.start);
    extendedStart.setDate(extendedStart.getDate() - 30); // 30 days back

    const performanceMetrics = await prisma.performanceMetric.findMany({
      where: {
        timestamp: {
          gte: extendedStart,
          lte: timeRange.end
        }
      },
      include: {
        WorkUnit: {
          select: {
            name: true,
            code: true,
            equipmentType: true
          }
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    return { performanceMetrics, timeRange: { start: extendedStart, end: timeRange.end } };
  }

  private async performAnalysis(analysisType: AnalysisType, data: any, query: string) {
    switch (analysisType) {
      case 'oee_analysis':
        return this.analyzeOEE(data);
      case 'downtime_analysis':
        return this.analyzeDowntime(data);
      case 'quality_analysis':
        return this.analyzeQuality(data);
      case 'maintenance_analysis':
        return this.analyzeMaintenance(data);
      case 'production_analysis':
        return this.analyzeProduction(data);
      case 'root_cause_analysis':
        return this.analyzeRootCause(data);
      case 'performance_trending':
        return this.analyzeTrending(data);
      default:
        return this.analyzeOEE(data);
    }
  }

  private analyzeOEE(data: any) {
    const { performanceMetrics } = data;
    
    if (!performanceMetrics || performanceMetrics.length === 0) {
      return {
        content: "No performance data available for OEE analysis. Please ensure equipment is reporting metrics.",
        dataPoints: 0
      };
    }

    // Calculate overall OEE
    const totalOEE = performanceMetrics.reduce((sum: number, metric: any) => sum + (metric.oeeScore || 0), 0);
    const avgOEE = totalOEE / performanceMetrics.length;
    
    // Calculate component averages
    const avgAvailability = performanceMetrics.reduce((sum: number, m: any) => sum + (m.availability || 0), 0) / performanceMetrics.length;
    const avgPerformance = performanceMetrics.reduce((sum: number, m: any) => sum + (m.performance || 0), 0) / performanceMetrics.length;
    const avgQuality = performanceMetrics.reduce((sum: number, m: any) => sum + (m.quality || 0), 0) / performanceMetrics.length;

    // Find best and worst performers
    const sortedByOEE = [...performanceMetrics].sort((a, b) => (b.oeeScore || 0) - (a.oeeScore || 0));
    const bestPerformer = sortedByOEE[0];
    const worstPerformer = sortedByOEE[sortedByOEE.length - 1];

    // ISO 22400 compliance assessment
    const worldClassOEE = 0.85; // 85% is considered world-class
    const goodOEE = 0.75; // 75% is considered good
    
    let performanceLevel = 'Poor';
    if (avgOEE >= worldClassOEE) performanceLevel = 'World Class';
    else if (avgOEE >= goodOEE) performanceLevel = 'Good';
    else if (avgOEE >= 0.60) performanceLevel = 'Average';

    const content = `## OEE Analysis Results (ISO 22400-2:2014 Compliant)

**Overall Equipment Effectiveness: ${(avgOEE * 100).toFixed(1)}%** (${performanceLevel})

### Component Analysis:
- **Availability**: ${(avgAvailability * 100).toFixed(1)}% (Target: >90%)
- **Performance**: ${(avgPerformance * 100).toFixed(1)}% (Target: >95%)  
- **Quality**: ${(avgQuality * 100).toFixed(1)}% (Target: >99%)

### Key Insights:
${avgOEE >= worldClassOEE ? 
  '✅ **Excellent Performance**: Your OEE exceeds world-class standards.' :
  avgOEE >= goodOEE ?
  '⚠️ **Good Performance**: Room for improvement to reach world-class levels.' :
  '🚨 **Performance Gap**: Significant improvement opportunities identified.'
}

### Best Performer:
- **Equipment**: ${bestPerformer?.WorkUnit?.name || 'Unknown'}
- **OEE**: ${((bestPerformer?.oeeScore || 0) * 100).toFixed(1)}%

### Requires Attention:
- **Equipment**: ${worstPerformer?.WorkUnit?.name || 'Unknown'}  
- **OEE**: ${((worstPerformer?.oeeScore || 0) * 100).toFixed(1)}%

### Recommendations:
${avgAvailability < 0.9 ? '1. **Availability**: Focus on reducing unplanned downtime through predictive maintenance\n' : ''}${avgPerformance < 0.95 ? '2. **Performance**: Optimize cycle times and reduce micro-stops\n' : ''}${avgQuality < 0.99 ? '3. **Quality**: Implement quality control measures to reduce defects\n' : ''}

*Analysis based on ${performanceMetrics.length} data points following ISO 22400-2:2014 standards.*`;

    return {
      content,
      dataPoints: performanceMetrics.length,
      calculations: {
        avgOEE,
        avgAvailability,
        avgPerformance,
        avgQuality,
        bestPerformer,
        worstPerformer
      }
    };
  }

  private analyzeDowntime(data: any) {
    const { alerts, performanceMetrics, maintenanceRecords } = data;
    
    // Calculate downtime contributors
    const downtimeByEquipment = new Map();
    
    performanceMetrics?.forEach((metric: any) => {
      if (metric.unplannedDowntime > 0) {
        const equipmentName = metric.WorkUnit?.name || 'Unknown';
        const current = downtimeByEquipment.get(equipmentName) || 0;
        downtimeByEquipment.set(equipmentName, current + metric.unplannedDowntime);
      }
    });

    // Sort by downtime impact
    const downtimeEntries = Array.from(downtimeByEquipment.entries())
      .sort(([,a], [,b]) => b - a);

    const totalDowntime = downtimeEntries.reduce((sum, [, downtime]) => sum + downtime, 0);
    
    if (totalDowntime === 0) {
      return {
        content: "✅ **Excellent News**: No significant unplanned downtime detected in the analyzed period. Your equipment is performing optimally.",
        dataPoints: performanceMetrics.length || 0
      };
    }

    const majorContributor = downtimeEntries[0];
    const top3Contributors = downtimeEntries.slice(0, 3);

    // Analyze alert patterns
    const alertsByType = new Map();
    alerts?.forEach((alert: any) => {
      const type = alert.alertType;
      alertsByType.set(type, (alertsByType.get(type) || 0) + 1);
    });

    const content = `## Downtime Analysis Results (ISO 14224:2016 Compliant)

🚨 **Major Downtime Contributor**: ${majorContributor?.[0] || 'Unknown Equipment'}
- **Total Downtime**: ${majorContributor?.[1]?.toFixed(1) || 0} minutes
- **Impact**: ${majorContributor ? ((majorContributor[1] / totalDowntime) * 100).toFixed(1) : 0}% of total downtime

### Top Contributors (Pareto Analysis):
${top3Contributors.map(([equipment, downtime], index) => 
  `${index + 1}. **${equipment}**: ${downtime.toFixed(1)} min (${((downtime / totalDowntime) * 100).toFixed(1)}%)`
).join('\n')}

### Active Alert Analysis:
${Array.from(alertsByType.entries()).map(([type, count]) => 
  `- **${type.replace(/_/g, ' ')}**: ${count} occurrence${count > 1 ? 's' : ''}`
).join('\n')}

### Root Cause Categories:
${alerts?.filter((a: any) => a.alertType.includes('MAINTENANCE')).length > 0 ? 
  '🔧 **Maintenance Issues**: Preventive maintenance gaps detected\n' : ''}${alerts?.filter((a: any) => a.alertType.includes('PERFORMANCE')).length > 0 ? 
  '⚡ **Performance Issues**: Equipment operating below optimal levels\n' : ''}${alerts?.filter((a: any) => a.alertType.includes('QUALITY')).length > 0 ? 
  '🎯 **Quality Issues**: Process parameters outside specifications\n' : ''}

### Immediate Actions Required:
1. **Prioritize**: Address ${majorContributor?.[0] || 'top contributor'} immediately (highest impact)
2. **Investigate**: Review maintenance history and operating conditions  
3. **Prevent**: Implement predictive maintenance strategies

**Total Unplanned Downtime**: ${totalDowntime.toFixed(1)} minutes
**Availability Impact**: ${((totalDowntime / (24 * 60)) * 100).toFixed(2)}% of planned production time

*Analysis based on ${(performanceMetrics?.length || 0) + (alerts?.length || 0)} data points following ISO 14224:2016 reliability standards.*`;

    return {
      content,
      dataPoints: (performanceMetrics?.length || 0) + (alerts?.length || 0),
      calculations: {
        totalDowntime,
        downtimeByEquipment: Object.fromEntries(downtimeByEquipment),
        alertsByType: Object.fromEntries(alertsByType)
      }
    };
  }

  private analyzeQuality(data: any) {
    const { qualityMetrics } = data;
    
    if (!qualityMetrics || qualityMetrics.length === 0) {
      return {
        content: "No quality data available for analysis. Please ensure quality measurements are being recorded.",
        dataPoints: 0
      };
    }

    // Calculate quality statistics
    const totalMeasurements = qualityMetrics.length;
    const outOfSpec = qualityMetrics.filter((q: any) => !q.isWithinSpec).length;
    const qualityRate = ((totalMeasurements - outOfSpec) / totalMeasurements) * 100;

    // Group by parameter
    const parameterGroups = new Map();
    qualityMetrics.forEach((q: any) => {
      if (!parameterGroups.has(q.parameter)) {
        parameterGroups.set(q.parameter, []);
      }
      parameterGroups.get(q.parameter).push(q);
    });

    const content = `## Quality Analysis Results (ISO 9001:2015 Compliant)

**Overall Quality Rate**: ${qualityRate.toFixed(1)}% (${totalMeasurements - outOfSpec}/${totalMeasurements} conforming)

### Quality Performance by Parameter:
${Array.from(parameterGroups.entries()).map(([param, measurements]) => {
  const outOfSpecCount = measurements.filter((m: any) => !m.isWithinSpec).length;
  const paramQuality = ((measurements.length - outOfSpecCount) / measurements.length) * 100;
  return `- **${param}**: ${paramQuality.toFixed(1)}% conformance (${outOfSpecCount} non-conformities)`;
}).join('\n')}

### Quality Status:
${qualityRate >= 99 ? '✅ **Excellent**: Quality exceeds target (>99%)' :
  qualityRate >= 95 ? '⚠️ **Good**: Quality meets acceptable levels' :
  '🚨 **Action Required**: Quality below acceptable threshold (<95%)'
}

${outOfSpec > 0 ? `### Non-Conformities Detected:
${qualityMetrics.filter((q: any) => !q.isWithinSpec).slice(0, 5).map((q: any) => 
  `- **${q.WorkUnit?.name}**: ${q.parameter} = ${q.value} ${q.uom} (outside ${q.lowerLimit}-${q.upperLimit})`
).join('\n')}` : ''}

*Analysis based on ${totalMeasurements} quality measurements following ISO 9001:2015 standards.*`;

    return {
      content,
      dataPoints: totalMeasurements
    };
  }

  private analyzeMaintenance(data: any) {
    const { maintenanceRecords } = data;
    
    const content = `## Maintenance Analysis Results

*Maintenance analysis implementation in progress...*

Data points analyzed: ${maintenanceRecords?.length || 0}`;

    return {
      content,
      dataPoints: maintenanceRecords.length || 0
    };
  }

  private analyzeProduction(data: any) {
    const { performanceMetrics } = data;
    
    const content = `## Production Analysis Results

*Production analysis implementation in progress...*

Data points analyzed: ${performanceMetrics?.length || 0}`;

    return {
      content,
      dataPoints: performanceMetrics.length || 0
    };
  }

  private analyzeRootCause(data: any) {
    const content = `## Root Cause Analysis Results

*Root cause analysis implementation in progress...*`;

    return {
      content,
      dataPoints: 0
    };
  }

  private analyzeTrending(data: any) {
    const content = `## Performance Trending Analysis

*Trending analysis implementation in progress...*`;

    return {
      content,
      dataPoints: 0
    };
  }

  private generateVisualizations(analysisType: AnalysisType, data: any, analysis: any): VisualizationConfig[] {
    const visualizations: VisualizationConfig[] = [];

    switch (analysisType) {
      case 'oee_analysis':
        visualizations.push(...this.generateOEEVisualizations(data, analysis));
        break;
      case 'downtime_analysis':
        visualizations.push(...this.generateDowntimeVisualizations(data, analysis));
        break;
      case 'quality_analysis':
        visualizations.push(...this.generateQualityVisualizations(data, analysis));
        break;
      // Add other cases as needed
    }

    return visualizations;
  }

  private generateOEEVisualizations(data: any, analysis: any): VisualizationConfig[] {
    const visualizations: VisualizationConfig[] = [];

    // OEE Components Bar Chart
    if (analysis.calculations) {
      visualizations.push({
        chartType: 'bar_chart',
        chartId: 'oee-components',
        title: 'OEE Components Analysis',
        description: 'Breakdown of Availability, Performance, and Quality',
        data: [
          { component: 'Availability', value: analysis.calculations.avgAvailability * 100, target: 90 },
          { component: 'Performance', value: analysis.calculations.avgPerformance * 100, target: 95 },
          { component: 'Quality', value: analysis.calculations.avgQuality * 100, target: 99 }
        ],
        config: {
          xAxisKey: 'component',
          yAxisKey: 'value',
          colors: ['#3B82F6', '#EF4444'],
          height: 300,
          margin: { top: 20, right: 30, bottom: 20, left: 20 }
        }
      });
    }

    return visualizations;
  }

  private generateDowntimeVisualizations(data: any, analysis: any): VisualizationConfig[] {
    const visualizations: VisualizationConfig[] = [];

    // Pareto Chart for Downtime Contributors
    if (analysis.calculations?.downtimeByEquipment) {
      const downtimeData = Object.entries(analysis.calculations.downtimeByEquipment)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([equipment, downtime]) => ({
          equipment: equipment.length > 15 ? equipment.substring(0, 15) + '...' : equipment,
          downtime: downtime as number,
          percentage: ((downtime as number) / Object.values(analysis.calculations.downtimeByEquipment).reduce((a, b) => a + b, 0)) * 100
        }));

      visualizations.push({
        chartType: 'pareto_chart',
        chartId: 'downtime-pareto',
        title: 'Downtime Contributors (Pareto Analysis)',
        description: 'Equipment ranked by downtime impact - focus on the vital few',
        data: downtimeData,
        config: {
          xAxisKey: 'equipment',
          yAxisKey: 'downtime',
          colors: ['#DC2626', '#F59E0B'],
          height: 400,
          margin: { top: 20, right: 30, bottom: 60, left: 40 }
        }
      });
    }

    return visualizations;
  }

  private generateQualityVisualizations(data: any, analysis: any): VisualizationConfig[] {
    // Quality visualizations implementation
    return [];
  }

  private getReferences(analysisType: AnalysisType): Reference[] {
    const references: Reference[] = [];

    switch (analysisType) {
      case 'oee_analysis':
        references.push({
          type: 'standard',
          id: 'iso-22400',
          title: ISO_STANDARDS['22400'].title,
          description: 'OEE calculation methodology and benchmarks',
          url: ISO_STANDARDS['22400'].url
        });
        break;
      case 'downtime_analysis':
        references.push({
          type: 'standard',
          id: 'iso-14224',
          title: ISO_STANDARDS['14224'].title,
          description: 'Equipment reliability and maintenance data collection',
          url: ISO_STANDARDS['14224'].url
        });
        break;
      case 'quality_analysis':
        references.push({
          type: 'standard',
          id: 'iso-9001',
          title: ISO_STANDARDS['9001'].title,
          description: 'Quality management system requirements and metrics',
          url: ISO_STANDARDS['9001'].url
        });
        break;
    }

    return references;
  }

  private calculateConfidence(data: any, analysis: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on data points
    const dataPoints = analysis.dataPoints || 0;
    if (dataPoints >= 100) confidence += 0.3;
    else if (dataPoints >= 50) confidence += 0.2;
    else if (dataPoints >= 10) confidence += 0.1;

    // Increase confidence based on data recency (assume recent data)
    confidence += 0.15;

    // Ensure confidence is between 0 and 1
    return Math.min(1.0, Math.max(0.1, confidence));
  }
}

// Export singleton instance
export const manufacturingAgent = new ManufacturingEngineeringAgent();