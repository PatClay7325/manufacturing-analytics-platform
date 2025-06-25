import { prisma } from '@/lib/database';

export interface QueryClassification {
  category: string;
  patterns: string[];
  confidence: number;
}

export interface AgentResult {
  content: string;
  dataPoints: number;
  metadata?: Record<string, any>;
}

export class ManufacturingEngineeringAgentGeneric {
  private prismaModels: Set<string>;
  
  constructor() {
    // Dynamically get available Prisma models
    this.prismaModels = new Set(Object.keys(prisma).filter(key => 
      !key.startsWith('_') && 
      !key.startsWith('$') && 
      typeof (prisma as any)[key] === 'object'
    ));
  }

  async execute(query: string, parameters: Record<string, any> = {}): Promise<AgentResult> {
    try {
      console.log('🤖 Generic Manufacturing Agent executing query:', query);
      
      // Classify the query to understand intent
      const classification = this.classifyQuery(query);
      
      // Fetch relevant data based on classification
      const data = await this.fetchRelevantData(classification, parameters);
      
      // Analyze and generate response
      const result = await this.analyzeData(classification, data, query);
      
      console.log(`✅ Analysis completed with ${result.dataPoints} data points`);
      return result;
      
    } catch (error) {
      console.error('Manufacturing Agent Error:', error);
      return {
        content: `I encountered an error while analyzing your request: ${error.message}. Please try rephrasing your question.`,
        dataPoints: 0,
        metadata: { error: error.message }
      };
    }
  }

  private classifyQuery(query: string): QueryClassification {
    const queryLower = query.toLowerCase();
    
    // Pattern-based classification
    const classifications = [
      {
        category: 'oee_metrics',
        patterns: ['oee', 'overall equipment effectiveness', 'efficiency', 'performance metrics', 'availability', 'quality rate'],
        keywords: ['equipment', 'machine', 'performance', 'efficiency']
      },
      {
        category: 'equipment_status',
        patterns: ['equipment', 'machine', 'status', 'running', 'operational', 'active', 'down', 'offline'],
        keywords: ['status', 'state', 'condition']
      },
      {
        category: 'production_metrics',
        patterns: ['production', 'output', 'quantity', 'throughput', 'cycle time', 'units produced'],
        keywords: ['production', 'manufacturing', 'output']
      },
      {
        category: 'quality_metrics',
        patterns: ['quality', 'defect', 'scrap', 'rework', 'reject', 'pass rate', 'yield'],
        keywords: ['quality', 'defects', 'issues']
      },
      {
        category: 'maintenance',
        patterns: ['maintenance', 'mtbf', 'mttr', 'breakdown', 'repair', 'service'],
        keywords: ['maintenance', 'repair', 'service']
      },
      {
        category: 'downtime',
        patterns: ['downtime', 'stoppage', 'breakdown', 'failure', 'unavailable'],
        keywords: ['down', 'stopped', 'failed']
      }
    ];

    let bestMatch = { category: 'general', patterns: [] as string[], confidence: 0 };
    
    for (const classification of classifications) {
      let score = 0;
      const matchedPatterns: string[] = [];
      
      for (const pattern of classification.patterns) {
        if (queryLower.includes(pattern)) {
          score += 2;
          matchedPatterns.push(pattern);
        }
      }
      
      for (const keyword of classification.keywords) {
        if (queryLower.includes(keyword)) {
          score += 1;
        }
      }
      
      if (score > bestMatch.confidence) {
        bestMatch = {
          category: classification.category,
          patterns: matchedPatterns,
          confidence: score
        };
      }
    }
    
    console.log(`Query classified as: ${bestMatch.category} (confidence: ${bestMatch.confidence})`);
    return bestMatch;
  }

  private async fetchRelevantData(
    classification: QueryClassification, 
    parameters: Record<string, any>
  ): Promise<Record<string, any>> {
    const data: Record<string, any> = {};
    const timeRange = this.getTimeRange(parameters);
    
    try {
      // Dynamically fetch data based on available models
      if (this.hasModel('factOeeMetric') || this.hasModel('oeeMetric')) {
        data.oeeMetrics = await this.fetchOeeMetrics(timeRange);
      }
      
      if (this.hasModel('equipment')) {
        data.equipment = await this.fetchEquipment();
      }
      
      if (this.hasModel('factProductionQuantity') || this.hasModel('productionQuantity')) {
        data.productionData = await this.fetchProductionData(timeRange);
      }
      
      if (this.hasModel('factQualityMetric') || this.hasModel('qualityMetric')) {
        data.qualityData = await this.fetchQualityData(timeRange);
      }
      
      if (this.hasModel('factEquipmentState') || this.hasModel('equipmentState')) {
        data.equipmentStates = await this.fetchEquipmentStates(timeRange);
      }
      
      if (this.hasModel('factMaintenanceEvent') || this.hasModel('maintenanceEvent')) {
        data.maintenanceEvents = await this.fetchMaintenanceEvents(timeRange);
      }
      
      // Fetch hierarchical data if available
      if (this.hasModel('manufacturingSite') || this.hasModel('site')) {
        data.sites = await this.fetchSites();
      }
      
    } catch (error) {
      console.error('Error fetching data:', error);
      // Continue with partial data
    }
    
    return data;
  }

  private hasModel(modelName: string): boolean {
    return this.prismaModels.has(modelName);
  }

  private async fetchOeeMetrics(timeRange: { start: Date; end: Date }) {
    const modelName = this.hasModel('factOeeMetric') ? 'factOeeMetric' : 'oeeMetric';
    
    try {
      return await (prisma as any)[modelName].findMany({
        where: {
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          equipment: true
        },
        orderBy: { timestamp: 'desc' },
        take: 100
      });
    } catch (error) {
      console.warn(`Could not fetch from ${modelName}:`, error.message);
      return [];
    }
  }

  private async fetchEquipment() {
    try {
      return await prisma.equipment.findMany({
        where: { isActive: true },
        include: {
          workCenter: {
            include: {
              area: {
                include: {
                  site: true
                }
              }
            }
          }
        },
        take: 50
      });
    } catch (error) {
      console.warn('Could not fetch equipment:', error.message);
      return [];
    }
  }

  private async fetchProductionData(timeRange: { start: Date; end: Date }) {
    const modelName = this.hasModel('factProductionQuantity') ? 'factProductionQuantity' : 'productionQuantity';
    
    try {
      return await (prisma as any)[modelName].findMany({
        where: {
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          equipment: true
        },
        orderBy: { timestamp: 'desc' },
        take: 100
      });
    } catch (error) {
      console.warn(`Could not fetch from ${modelName}:`, error.message);
      return [];
    }
  }

  private async fetchQualityData(timeRange: { start: Date; end: Date }) {
    const modelName = this.hasModel('factQualityMetric') ? 'factQualityMetric' : 'qualityMetric';
    
    try {
      return await (prisma as any)[modelName].findMany({
        where: {
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          equipment: true
        },
        orderBy: { timestamp: 'desc' },
        take: 100
      });
    } catch (error) {
      console.warn(`Could not fetch from ${modelName}:`, error.message);
      return [];
    }
  }

  private async fetchEquipmentStates(timeRange: { start: Date; end: Date }) {
    const modelName = this.hasModel('factEquipmentState') ? 'factEquipmentState' : 'equipmentState';
    
    try {
      return await (prisma as any)[modelName].findMany({
        where: {
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          equipment: true
        },
        orderBy: { timestamp: 'desc' },
        take: 100
      });
    } catch (error) {
      console.warn(`Could not fetch from ${modelName}:`, error.message);
      return [];
    }
  }

  private async fetchMaintenanceEvents(timeRange: { start: Date; end: Date }) {
    const modelName = this.hasModel('factMaintenanceEvent') ? 'factMaintenanceEvent' : 'maintenanceEvent';
    
    try {
      return await (prisma as any)[modelName].findMany({
        where: {
          timestamp: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        include: {
          equipment: true
        },
        orderBy: { timestamp: 'desc' },
        take: 100
      });
    } catch (error) {
      console.warn(`Could not fetch from ${modelName}:`, error.message);
      return [];
    }
  }

  private async fetchSites() {
    const modelName = this.hasModel('manufacturingSite') ? 'manufacturingSite' : 'site';
    
    try {
      return await (prisma as any)[modelName].findMany({
        include: {
          areas: {
            include: {
              workCenters: {
                include: {
                  equipment: {
                    take: 5
                  }
                }
              }
            }
          }
        },
        take: 10
      });
    } catch (error) {
      console.warn(`Could not fetch from ${modelName}:`, error.message);
      return [];
    }
  }

  private getTimeRange(parameters: Record<string, any>): { start: Date; end: Date } {
    const now = new Date();
    const hours = parameters.hours || 24;
    const start = new Date(now);
    start.setHours(start.getHours() - hours);
    return { start, end: now };
  }

  private async analyzeData(
    classification: QueryClassification,
    data: Record<string, any>,
    originalQuery: string
  ): Promise<AgentResult> {
    // Count total data points
    let totalDataPoints = 0;
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) {
        totalDataPoints += data[key].length;
      }
    }

    if (totalDataPoints === 0) {
      return {
        content: "I couldn't find any data matching your query. Please ensure the equipment is reporting data or try a different time range.",
        dataPoints: 0
      };
    }

    // Route to specific analysis based on classification
    switch (classification.category) {
      case 'oee_metrics':
        return this.analyzeOeeMetrics(data);
      case 'equipment_status':
        return this.analyzeEquipmentStatus(data);
      case 'production_metrics':
        return this.analyzeProductionMetrics(data);
      case 'quality_metrics':
        return this.analyzeQualityMetrics(data);
      case 'maintenance':
        return this.analyzeMaintenanceData(data);
      case 'downtime':
        return this.analyzeDowntimeData(data);
      default:
        return this.provideGeneralAnalysis(data, originalQuery);
    }
  }

  private analyzeOeeMetrics(data: Record<string, any>): AgentResult {
    const oeeMetrics = data.oeeMetrics || [];
    
    if (oeeMetrics.length === 0) {
      return {
        content: "No OEE data available for the requested period.",
        dataPoints: 0
      };
    }

    // Calculate averages dynamically based on available fields
    const calculations: Record<string, number> = {};
    const numericFields = ['oee', 'availability', 'performance', 'quality', 'oeePercentage'];
    
    for (const field of numericFields) {
      const values = oeeMetrics
        .map((m: any) => parseFloat(m[field]) || 0)
        .filter((v: number) => v > 0);
      
      if (values.length > 0) {
        calculations[field] = values.reduce((a: number, b: number) => a + b, 0) / values.length;
      }
    }

    // Group by equipment if available
    const byEquipment: Record<string, any[]> = {};
    oeeMetrics.forEach((metric: any) => {
      const equipmentName = metric.equipment?.equipmentName || metric.equipment?.name || 'Unknown';
      if (!byEquipment[equipmentName]) {
        byEquipment[equipmentName] = [];
      }
      byEquipment[equipmentName].push(metric);
    });

    // Build response
    let content = `## OEE Analysis Results\n\n`;
    
    // Overall metrics
    if (calculations.oee || calculations.oeePercentage) {
      const oeeValue = (calculations.oee || calculations.oeePercentage / 100) * 100;
      content += `**Overall OEE: ${oeeValue.toFixed(1)}%**\n\n`;
      
      if (calculations.availability) {
        content += `- **Availability**: ${(calculations.availability * 100).toFixed(1)}%\n`;
      }
      if (calculations.performance) {
        content += `- **Performance**: ${(calculations.performance * 100).toFixed(1)}%\n`;
      }
      if (calculations.quality) {
        content += `- **Quality**: ${(calculations.quality * 100).toFixed(1)}%\n`;
      }
    }

    // Equipment breakdown
    if (Object.keys(byEquipment).length > 1) {
      content += `\n### By Equipment:\n`;
      for (const [equipment, metrics] of Object.entries(byEquipment)) {
        const avgOee = metrics.reduce((sum, m) => sum + (parseFloat(m.oee) || 0), 0) / metrics.length;
        content += `- **${equipment}**: ${(avgOee * 100).toFixed(1)}% (${metrics.length} readings)\n`;
      }
    }

    content += `\n*Analysis based on ${oeeMetrics.length} data points.*`;

    return {
      content,
      dataPoints: oeeMetrics.length,
      metadata: { calculations, byEquipment: Object.keys(byEquipment) }
    };
  }

  private analyzeEquipmentStatus(data: Record<string, any>): AgentResult {
    const equipment = data.equipment || [];
    const states = data.equipmentStates || [];
    
    let content = `## Equipment Status Overview\n\n`;
    
    if (equipment.length > 0) {
      content += `**Total Equipment**: ${equipment.length}\n\n`;
      
      // Group by status if available
      const byStatus: Record<string, any[]> = {};
      equipment.forEach((eq: any) => {
        const status = eq.status || eq.isActive ? 'Active' : 'Inactive';
        if (!byStatus[status]) {
          byStatus[status] = [];
        }
        byStatus[status].push(eq);
      });
      
      content += `### Status Breakdown:\n`;
      for (const [status, items] of Object.entries(byStatus)) {
        content += `- **${status}**: ${items.length} equipment\n`;
      }
      
      // List equipment
      content += `\n### Equipment List:\n`;
      equipment.slice(0, 10).forEach((eq: any) => {
        const name = eq.equipmentName || eq.name || 'Unknown';
        const type = eq.equipmentType || eq.type || 'N/A';
        const location = eq.workCenter?.area?.site?.siteName || eq.location || 'N/A';
        content += `- **${name}** (${type}) - Location: ${location}\n`;
      });
      
      if (equipment.length > 10) {
        content += `\n... and ${equipment.length - 10} more.\n`;
      }
    }

    // Recent state changes
    if (states.length > 0) {
      content += `\n### Recent State Changes:\n`;
      states.slice(0, 5).forEach((state: any) => {
        const equipmentName = state.equipment?.equipmentName || 'Unknown';
        const stateCategory = state.stateCategory || state.state || 'Unknown';
        content += `- ${equipmentName}: ${stateCategory}\n`;
      });
    }

    return {
      content,
      dataPoints: equipment.length + states.length,
      metadata: { equipmentCount: equipment.length, stateCount: states.length }
    };
  }

  private analyzeProductionMetrics(data: Record<string, any>): AgentResult {
    const production = data.productionData || [];
    
    if (production.length === 0) {
      return {
        content: "No production data available for the requested period.",
        dataPoints: 0
      };
    }

    // Calculate totals
    let totalProduced = 0;
    let totalGood = 0;
    let totalScrap = 0;
    
    production.forEach((p: any) => {
      totalProduced += parseFloat(p.producedQuantity) || 0;
      totalGood += parseFloat(p.goodQuantity) || 0;
      totalScrap += parseFloat(p.scrapQuantity) || 0;
    });

    const yieldRate = totalProduced > 0 ? (totalGood / totalProduced * 100) : 0;

    let content = `## Production Analysis\n\n`;
    content += `**Total Production**: ${totalProduced.toFixed(0)} units\n`;
    content += `**Good Units**: ${totalGood.toFixed(0)} units\n`;
    content += `**Scrap**: ${totalScrap.toFixed(0)} units\n`;
    content += `**Yield Rate**: ${yieldRate.toFixed(1)}%\n\n`;

    // Group by equipment
    const byEquipment: Record<string, any> = {};
    production.forEach((p: any) => {
      const equipmentName = p.equipment?.equipmentName || 'Unknown';
      if (!byEquipment[equipmentName]) {
        byEquipment[equipmentName] = { produced: 0, good: 0, scrap: 0, count: 0 };
      }
      byEquipment[equipmentName].produced += parseFloat(p.producedQuantity) || 0;
      byEquipment[equipmentName].good += parseFloat(p.goodQuantity) || 0;
      byEquipment[equipmentName].scrap += parseFloat(p.scrapQuantity) || 0;
      byEquipment[equipmentName].count++;
    });

    if (Object.keys(byEquipment).length > 1) {
      content += `### Production by Equipment:\n`;
      for (const [equipment, stats] of Object.entries(byEquipment)) {
        const equipmentYield = stats.produced > 0 ? (stats.good / stats.produced * 100) : 0;
        content += `- **${equipment}**: ${stats.produced.toFixed(0)} units (${equipmentYield.toFixed(1)}% yield)\n`;
      }
    }

    content += `\n*Analysis based on ${production.length} production records.*`;

    return {
      content,
      dataPoints: production.length,
      metadata: { totalProduced, totalGood, totalScrap, yieldRate }
    };
  }

  private analyzeQualityMetrics(data: Record<string, any>): AgentResult {
    const quality = data.qualityData || [];
    const oeeMetrics = data.oeeMetrics || [];
    
    let content = `## Quality Analysis\n\n`;
    
    if (quality.length > 0) {
      // Analyze defects
      const defectsByType: Record<string, number> = {};
      quality.forEach((q: any) => {
        const defectType = q.defectType || q.defectCategory || 'Other';
        defectsByType[defectType] = (defectsByType[defectType] || 0) + (q.defectCount || 1);
      });
      
      content += `### Defect Analysis:\n`;
      const sortedDefects = Object.entries(defectsByType)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);
      
      sortedDefects.forEach(([type, count]) => {
        content += `- **${type}**: ${count} occurrences\n`;
      });
    }
    
    // Use OEE quality data if available
    if (oeeMetrics.length > 0) {
      const qualityRates = oeeMetrics
        .map((m: any) => parseFloat(m.quality) || 0)
        .filter((q: number) => q > 0);
      
      if (qualityRates.length > 0) {
        const avgQuality = qualityRates.reduce((a: number, b: number) => a + b, 0) / qualityRates.length;
        content += `\n### Quality Performance:\n`;
        content += `**Average Quality Rate**: ${(avgQuality * 100).toFixed(1)}%\n`;
        
        const belowTarget = qualityRates.filter((q: number) => q < 0.99).length;
        if (belowTarget > 0) {
          content += `**Below Target (99%)**: ${belowTarget} readings\n`;
        }
      }
    }

    const totalDataPoints = quality.length + oeeMetrics.length;
    if (totalDataPoints === 0) {
      return {
        content: "No quality data available for the requested period.",
        dataPoints: 0
      };
    }

    content += `\n*Analysis based on ${totalDataPoints} data points.*`;

    return {
      content,
      dataPoints: totalDataPoints
    };
  }

  private analyzeMaintenanceData(data: Record<string, any>): AgentResult {
    const maintenanceEvents = data.maintenanceEvents || [];
    
    if (maintenanceEvents.length === 0) {
      return {
        content: "No maintenance events found for the requested period.",
        dataPoints: 0
      };
    }

    // Group by type
    const byType: Record<string, any[]> = {};
    maintenanceEvents.forEach((event: any) => {
      const type = event.maintenanceType || 'Unspecified';
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(event);
    });

    let content = `## Maintenance Analysis\n\n`;
    content += `**Total Events**: ${maintenanceEvents.length}\n\n`;
    
    content += `### By Type:\n`;
    for (const [type, events] of Object.entries(byType)) {
      const totalDuration = events.reduce((sum, e) => sum + (parseFloat(e.actualDurationMinutes) || 0), 0);
      content += `- **${type}**: ${events.length} events (${totalDuration.toFixed(0)} minutes total)\n`;
    }

    // Recent events
    content += `\n### Recent Maintenance:\n`;
    maintenanceEvents.slice(0, 5).forEach((event: any) => {
      const equipment = event.equipment?.equipmentName || 'Unknown';
      const type = event.maintenanceType || 'Maintenance';
      const duration = event.actualDurationMinutes || 'N/A';
      content += `- ${equipment}: ${type} (${duration} minutes)\n`;
    });

    content += `\n*Analysis based on ${maintenanceEvents.length} maintenance records.*`;

    return {
      content,
      dataPoints: maintenanceEvents.length
    };
  }

  private analyzeDowntimeData(data: Record<string, any>): AgentResult {
    const states = data.equipmentStates || [];
    const downtimeStates = states.filter((s: any) => 
      s.stateCategory === 'Unscheduled_Downtime' || 
      s.stateCategory === 'Scheduled_Downtime' ||
      s.state === 'Down'
    );

    if (downtimeStates.length === 0) {
      return {
        content: "✅ No significant downtime detected in the analyzed period.",
        dataPoints: states.length
      };
    }

    // Calculate downtime by equipment
    const downtimeByEquipment: Record<string, number> = {};
    downtimeStates.forEach((state: any) => {
      const equipment = state.equipment?.equipmentName || 'Unknown';
      const duration = parseFloat(state.durationMinutes) || 0;
      downtimeByEquipment[equipment] = (downtimeByEquipment[equipment] || 0) + duration;
    });

    const totalDowntime = Object.values(downtimeByEquipment).reduce((a, b) => a + b, 0);
    const sortedEquipment = Object.entries(downtimeByEquipment)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    let content = `## Downtime Analysis\n\n`;
    content += `**Total Downtime**: ${totalDowntime.toFixed(0)} minutes\n\n`;
    
    content += `### Top Contributors:\n`;
    sortedEquipment.forEach(([equipment, downtime], index) => {
      const percentage = (downtime / totalDowntime * 100).toFixed(1);
      content += `${index + 1}. **${equipment}**: ${downtime.toFixed(0)} min (${percentage}%)\n`;
    });

    // Downtime categories
    const byCategory: Record<string, number> = {};
    downtimeStates.forEach((state: any) => {
      const category = state.stateCategory || 'Unknown';
      byCategory[category] = (byCategory[category] || 0) + 1;
    });

    if (Object.keys(byCategory).length > 0) {
      content += `\n### Downtime Types:\n`;
      for (const [category, count] of Object.entries(byCategory)) {
        content += `- **${category.replace(/_/g, ' ')}**: ${count} occurrences\n`;
      }
    }

    content += `\n*Analysis based on ${states.length} equipment state records.*`;

    return {
      content,
      dataPoints: states.length,
      metadata: { totalDowntime, topContributors: sortedEquipment }
    };
  }

  private provideGeneralAnalysis(data: Record<string, any>, query: string): AgentResult {
    let content = `## Manufacturing Data Overview\n\n`;
    let totalDataPoints = 0;

    // Summarize available data
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0) {
        totalDataPoints += value.length;
        content += `- **${this.formatDataType(key)}**: ${value.length} records\n`;
      }
    }

    if (totalDataPoints === 0) {
      content = "I couldn't find specific data for your query. Please try rephrasing or check if the equipment is reporting data.";
    } else {
      content += `\n### Your Query: "${query}"\n\n`;
      content += `I found ${totalDataPoints} data points that might be relevant. `;
      content += `Please try a more specific query such as:\n`;
      content += `- "What is the OEE for all equipment?"\n`;
      content += `- "Show equipment status"\n`;
      content += `- "Analyze production output"\n`;
      content += `- "What quality issues do we have?"\n`;
    }

    return {
      content,
      dataPoints: totalDataPoints
    };
  }

  private formatDataType(key: string): string {
    const formatMap: Record<string, string> = {
      oeeMetrics: 'OEE Metrics',
      equipment: 'Equipment',
      productionData: 'Production Data',
      qualityData: 'Quality Metrics',
      equipmentStates: 'Equipment States',
      maintenanceEvents: 'Maintenance Events',
      sites: 'Manufacturing Sites'
    };
    return formatMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
  }
}