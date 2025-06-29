import { prisma } from '@/lib/database/prisma';
import { manufacturingPipeline } from './pipeline';

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
      // Check if we should use the new pipeline
      const usePipeline = process.env.USE_AGENT_PIPELINE === 'true' || context?.usePipeline;
      
      if (usePipeline) {
        // Use the new multi-agent pipeline
        return await manufacturingPipeline.execute(query, {
          userId: context.userId,
          tenantId: context.tenantId,
          timeRange: context.timeRange,
          analysisType: context.analysisType,
          sessionId: context.sessionId
        });
      }
      
      // Otherwise, use the legacy single-agent approach
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
    const [equipment, productionData, downtimeData] = await Promise.all([
      prisma.dimEquipment.findMany({
        where: { isActive: true },
        include: {
          workCenter: {
            include: {
              area: {
                include: { site: true }
              }
            }
          }
        }
      }),
      prisma.factProduction.findMany({
        where: {
          startTime: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          equipment: {
            select: {
              name: true,
              code: true,
              type: true,
              isActive: true,
              theoreticalRate: true
            }
          },
          downtime: true,
          shift: true
        },
        orderBy: { startTime: 'desc' }
      }),
      prisma.factDowntime.findMany({
        where: {
          startTime: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        }
      })
    ]);

    // Calculate OEE metrics from production data
    const oeeMetrics = this.calculateOEEMetrics(equipment, productionData);

    return { equipment, productionData, oeeMetrics, timeRange };
  }

  private async fetchDowntimeData(timeRange: { start: Date; end: Date }) {
    const [downtimeData, maintenanceEvents] = await Promise.all([
      prisma.factDowntime.findMany({
        where: {
          startTime: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          equipment: {
            select: {
              name: true,
              code: true,
              type: true
            }
          },
          reason: {
            select: {
              code: true,
              description: true,
              category: true
            }
          }
        },
        orderBy: { startTime: 'desc' }
      }),
      prisma.factMaintenance.findMany({
        where: {
          startTime: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          equipment: {
            select: {
              name: true,
              code: true,
              type: true
            }
          }
        },
        orderBy: { startTime: 'desc' }
      })
    ]);

    return { downtimeData, maintenanceEvents, alerts: [], timeRange };
  }

  private async fetchQualityData(timeRange: { start: Date; end: Date }) {
    // Use FactScrap data as quality indicator
    const [scrapData, productionData] = await Promise.all([
      prisma.factScrap.findMany({
        where: {
          createdAt: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          product: {
            select: {
              name: true,
              code: true
            }
          },
          production: {
            include: {
              equipment: {
                select: {
                  name: true,
                  code: true,
                  type: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.factProduction.findMany({
        where: {
          startTime: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          equipment: {
            select: {
              name: true,
              code: true,
              type: true
            }
          },
          product: {
            select: {
              name: true,
              code: true
            }
          }
        },
        orderBy: { startTime: 'desc' }
      })
    ]);

    return { scrapData, productionData, timeRange };
  }

  private async fetchMaintenanceData(timeRange: { start: Date; end: Date }) {
    const maintenanceEvents = await prisma.factMaintenanceEvent.findMany({
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end
        }
      },
      include: {
        equipment: {
          select: {
            equipmentName: true,
            equipmentCode: true,
            equipmentType: true,
            maintenanceStrategy: true
          }
        }
      },
      orderBy: { timestamp: 'desc' }
    });

    return { maintenanceEvents, timeRange };
  }

  private async fetchProductionData(timeRange: { start: Date; end: Date }) {
    const [performanceMetrics, productionQuantities] = await Promise.all([
      prisma.factPerformanceMetric.findMany({
        where: {
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          equipment: {
            select: {
              equipmentName: true,
              equipmentCode: true,
              equipmentType: true
            }
          }
        },
        orderBy: { timestamp: 'desc' }
      }),
      prisma.factProductionQuantity.findMany({
        where: {
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          equipment: {
            select: {
              equipmentName: true,
              equipmentCode: true,
              equipmentType: true
            }
          }
        },
        orderBy: { timestamp: 'desc' }
      })
    ]);

    return { performanceMetrics, productionQuantities, timeRange };
  }

  private async fetchRootCauseData(timeRange: { start: Date; end: Date }) {
    // Comprehensive data for root cause analysis
    const [downtimeData, oeeData, qualityData, maintenanceData] = await Promise.all([
      this.fetchDowntimeData(timeRange),
      this.fetchOEEData(timeRange),
      this.fetchQualityData(timeRange),
      this.fetchMaintenanceData(timeRange)
    ]);

    return { 
      equipmentStates: downtimeData.equipmentStates,
      oeeMetrics: oeeData.oeeMetrics,
      qualityMetrics: qualityData.qualityMetrics,
      maintenanceEvents: maintenanceData.maintenanceEvents,
      timeRange 
    };
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
    const { oeeMetrics, equipment } = data;
    
    if (!oeeMetrics || oeeMetrics.length === 0) {
      return {
        content: "No OEE data available for analysis. Please ensure equipment is reporting metrics.",
        dataPoints: 0
      };
    }

    // Calculate overall OEE (convert Decimal to Number)
    const totalOEE = oeeMetrics.reduce((sum: number, metric: any) => sum + Number(metric.oee || 0), 0);
    const avgOEE = totalOEE / oeeMetrics.length;
    
    // Calculate component averages (convert Decimal to Number)
    const avgAvailability = oeeMetrics.reduce((sum: number, m: any) => sum + Number(m.availability || 0), 0) / oeeMetrics.length;
    const avgPerformance = oeeMetrics.reduce((sum: number, m: any) => sum + Number(m.performance || 0), 0) / oeeMetrics.length;
    const avgQuality = oeeMetrics.reduce((sum: number, m: any) => sum + Number(m.quality || 0), 0) / oeeMetrics.length;

    // Find best and worst performers (convert Decimal to Number for sorting)
    const sortedByOEE = [...oeeMetrics].sort((a, b) => Number(b.oee || 0) - Number(a.oee || 0));
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
- **Equipment**: ${bestPerformer?.equipment?.equipmentName || 'Unknown'}
- **OEE**: ${(Number(bestPerformer?.oee || 0) * 100).toFixed(1)}%

### Requires Attention:
- **Equipment**: ${worstPerformer?.equipment?.equipmentName || 'Unknown'}  
- **OEE**: ${(Number(worstPerformer?.oee || 0) * 100).toFixed(1)}%

### Recommendations:
${avgAvailability < 0.9 ? '1. **Availability**: Focus on reducing unplanned downtime through predictive maintenance\n' : ''}${avgPerformance < 0.95 ? '2. **Performance**: Optimize cycle times and reduce micro-stops\n' : ''}${avgQuality < 0.99 ? '3. **Quality**: Implement quality control measures to reduce defects\n' : ''}

*Analysis based on ${oeeMetrics.length} data points following ISO 22400-2:2014 standards.*`;

    return {
      content,
      dataPoints: oeeMetrics.length,
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
    const { equipmentStates, maintenanceEvents, alerts = [] } = data;
    
    // Calculate downtime contributors
    const downtimeByEquipment = new Map();
    
    equipmentStates?.forEach((state: any) => {
      if (state.durationMinutes > 0) {
        const equipmentName = state.equipment?.equipmentName || 'Unknown';
        const current = downtimeByEquipment.get(equipmentName) || 0;
        downtimeByEquipment.set(equipmentName, current + parseFloat(state.durationMinutes));
      }
    });

    // Sort by downtime impact
    const downtimeEntries = Array.from(downtimeByEquipment.entries())
      .sort(([,a], [,b]) => b - a);

    const totalDowntime = downtimeEntries.reduce((sum, [, downtime]) => sum + downtime, 0);
    
    if (totalDowntime === 0) {
      return {
        content: "✅ **Excellent News**: No significant unplanned downtime detected in the analyzed period. Your equipment is performing optimally.",
        dataPoints: equipmentStates?.length || 0
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
**Availability Impact**: ${(totalDowntime / (24 * 60) * 100).toFixed(2)}% of planned production time

*Analysis based on ${(equipmentStates?.length || 0) + (alerts?.length || 0)} data points following ISO 14224:2016 reliability standards.*`;

    return {
      content,
      dataPoints: (equipmentStates?.length || 0) + (alerts?.length || 0),
      calculations: {
        totalDowntime,
        downtimeByEquipment: Object.fromEntries(downtimeByEquipment),
        alertsByType: Object.fromEntries(alertsByType)
      }
    };
  }

  private analyzeQuality(data: any) {
    const { scrapData, productionData } = data;
    
    if (!productionData || productionData.length === 0) {
      return {
        content: "No production data available for quality analysis. Please ensure production records are being created.",
        dataPoints: 0
      };
    }

    // Calculate quality statistics from production and scrap data
    const totalProduced = productionData.reduce((sum: number, prod: any) => sum + (prod.goodParts || 0) + (prod.scrapParts || 0), 0);
    const totalGoodParts = productionData.reduce((sum: number, prod: any) => sum + (prod.goodParts || 0), 0);
    const totalScrapParts = productionData.reduce((sum: number, prod: any) => sum + (prod.scrapParts || 0), 0);
    
    const qualityRate = totalProduced > 0 ? (totalGoodParts / totalProduced) * 100 : 0;

    // Group scrap by reason/type
    const scrapByType = new Map();
    scrapData?.forEach((scrap: any) => {
      const scrapCode = scrap.scrapCode || 'Unknown';
      const current = scrapByType.get(scrapCode) || { qty: 0, cost: 0 };
      scrapByType.set(scrapCode, {
        qty: current.qty + (scrap.scrapQty || 0),
        cost: current.cost + (Number(scrap.scrapCost) || 0)
      });
    });

    // Top defect types
    const topDefects = Array.from(scrapByType.entries())
      .sort(([,a], [,b]) => b.qty - a.qty)
      .slice(0, 5);

    const content = `## Quality Analysis Results (ISO 9001:2015 Compliant)

**Overall Quality Rate**: ${qualityRate.toFixed(1)}% (${totalGoodParts}/${totalProduced} conforming)

### Quality Performance by Parameter:
${topDefects.map(([defectType, data]) => 
  `- **${defectType}**: ${data.qty} defects (${((data.qty / totalScrapParts) * 100).toFixed(1)}% of total scrap)`
).join('\n') || '- No specific defect data available'}

### Quality Status:
${qualityRate >= 99 ? '✅ **Excellent**: Quality exceeds target (>99%)' :
  qualityRate >= 95 ? '⚠️ **Good**: Quality meets acceptable levels' :
  '🚨 **Action Required**: Quality below acceptable threshold (<95%)'
}

### Non-Conformities Detected:
${topDefects.map(([defectType, data]) => 
  `- **${defectType}**: ${data.qty} units (Cost: $${data.cost.toFixed(2)})`
).join('\n') || '- No scrap data found for the specified period'}

### Quality Status:
${qualityRate >= 95 ? '✅ **Acceptable**: Quality meets minimum standards' : 
  '🚨 **Action Required**: Quality below acceptable threshold (<95%)'
}

*Analysis based on ${productionData.length} production records following ISO 9001:2015 standards.*`;

    return {
      content,
      dataPoints: productionData.length + (scrapData?.length || 0)
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

  private calculateOEEMetrics(equipment: any[], productionData: any[]) {
    const oeeMetrics = [];

    for (const eq of equipment) {
      // Get production data for this equipment
      const eqProduction = productionData.filter(p => p.equipment.code === eq.code);
      
      if (eqProduction.length === 0) continue;

      // Calculate totals
      let totalPlannedTime = 0n;
      let totalOperatingTime = 0n;
      let totalDowntime = 0n;
      let totalPartsProduced = 0;
      let totalGoodParts = 0;

      for (const prod of eqProduction) {
        totalPlannedTime += prod.plannedProductionTime;
        totalOperatingTime += prod.operatingTime;
        totalPartsProduced += prod.totalPartsProduced;
        totalGoodParts += prod.goodParts;
        
        // Sum downtime
        if (prod.downtime && prod.downtime.length > 0) {
          const downtimeForRun = prod.downtime.reduce((sum: bigint, dt: any) => sum + dt.downtimeDuration, 0n);
          totalDowntime += downtimeForRun;
        }
      }

      // Convert to hours for calculations
      const plannedHours = Number(totalPlannedTime) / (1000 * 60 * 60);
      const operatingHours = Number(totalOperatingTime) / (1000 * 60 * 60);
      const downtimeHours = Number(totalDowntime) / (1000 * 60 * 60);
      const actualRunTime = operatingHours - downtimeHours;

      // Calculate OEE components
      const availability = plannedHours > 0 ? actualRunTime / plannedHours : 0;
      const theoreticalRate = eq.theoreticalRate?.toNumber() || 60;
      const actualRate = actualRunTime > 0 ? totalPartsProduced / actualRunTime : 0;
      const performance = theoreticalRate > 0 ? actualRate / theoreticalRate : 0;
      const quality = totalPartsProduced > 0 ? totalGoodParts / totalPartsProduced : 0;
      const oee = availability * performance * quality;

      oeeMetrics.push({
        equipmentId: eq.id,
        equipmentName: eq.name,
        equipmentCode: eq.code,
        availability,
        performance,
        quality,
        oee,
        productionRuns: eqProduction.length,
        totalParts: totalPartsProduced,
        goodParts: totalGoodParts,
        scrapParts: totalPartsProduced - totalGoodParts,
        plannedTime: plannedHours,
        operatingTime: operatingHours,
        downtime: downtimeHours
      });
    }

    return oeeMetrics;
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
