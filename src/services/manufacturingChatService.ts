/**
 * Manufacturing Chat Service with Database Integration
 * Combines AI chat with Prisma database queries
 */

import { PrismaClient } from '@prisma/client';
import { streamingChatService } from './streamingChatService';

const prisma = new PrismaClient();

export interface ManufacturingContext {
  equipmentData?: any[];
  metricsData?: any[];
  alertsData?: any[];
  recentOEE?: number;
  activeAlerts?: number;
}

export class ManufacturingChatService {
  /**
   * Process user message and determine if database query is needed
   */
  async processMessage(sessionId: string, userMessage: string): Promise<string> {
    // Keywords that trigger database queries
    const queryKeywords = {
      oee: ['oee', 'overall equipment effectiveness', 'efficiency'],
      equipment: ['equipment', 'machine', 'line', 'asset', 'status'],
      metrics: ['metric', 'measurement', 'performance', 'kpi'],
      alerts: ['alert', 'alarm', 'warning', 'issue', 'active alerts'],
      production: ['production', 'output', 'throughput', 'yield'],
      quality: ['quality', 'defect', 'scrap', 'rejection'],
      downtime: ['downtime', 'availability', 'uptime', 'breakdown'],
      current: ['current', 'now', 'today', 'latest', 'recent'],
    };

    // Check what the user is asking about
    const lowerMessage = userMessage.toLowerCase();
    const context: ManufacturingContext = {};

    // Determine if user wants current/live data
    const wantsCurrentData = queryKeywords.current.some(keyword => lowerMessage.includes(keyword));

    // Fetch relevant data based on keywords
    for (const [category, keywords] of Object.entries(queryKeywords)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        switch (category) {
          case 'oee':
            if (wantsCurrentData || lowerMessage.includes('current') || lowerMessage.includes('what is')) {
              context.recentOEE = await this.calculateCurrentOEE();
              context.metricsData = await this.getRecentMetrics('OEE');
            }
            break;
          
          case 'equipment':
            if (lowerMessage.includes('status') || lowerMessage.includes('show')) {
              context.equipmentData = await this.getEquipmentStatus();
            }
            break;
          
          case 'alerts':
            context.alertsData = await this.getActiveAlerts();
            context.activeAlerts = context.alertsData?.length || 0;
            break;
          
          case 'metrics':
          case 'production':
          case 'quality':
            if (wantsCurrentData || lowerMessage.includes('show') || lowerMessage.includes('calculate')) {
              context.metricsData = await this.getRecentMetrics();
            }
            break;
        }
      }
    }

    // Create enhanced prompt with actual data
    return this.createEnhancedPrompt(userMessage, context);
  }

  /**
   * Calculate current OEE from database
   */
  async calculateCurrentOEE(): Promise<number> {
    try {
      // Get the last 24 hours of metrics
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const metrics = await prisma.metric.findMany({
        where: {
          name: {
            in: ['AVAILABILITY', 'PERFORMANCE', 'QUALITY']
          },
          timestamp: {
            gte: oneDayAgo
          }
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 100
      });

      if (metrics.length === 0) return 0;

      // Group by equipment and calculate average
      const equipmentMetrics = metrics.reduce((acc, metric) => {
        const key = metric.workUnitId || 'general';
        if (!acc[key]) {
          acc[key] = { availability: [], performance: [], quality: [] };
        }
        
        if (metric.name === 'AVAILABILITY') acc[key].availability.push(metric.value);
        if (metric.name === 'PERFORMANCE') acc[key].performance.push(metric.value);
        if (metric.name === 'QUALITY') acc[key].quality.push(metric.value);
        
        return acc;
      }, {} as Record<string, { availability: number[], performance: number[], quality: number[] }>);

      // Calculate OEE for each equipment
      const oeeValues = Object.values(equipmentMetrics).map(metrics => {
        const avgAvailability = metrics.availability.reduce((a, b) => a + b, 0) / metrics.availability.length || 0;
        const avgPerformance = metrics.performance.reduce((a, b) => a + b, 0) / metrics.performance.length || 0;
        const avgQuality = metrics.quality.reduce((a, b) => a + b, 0) / metrics.quality.length || 0;
        
        return (avgAvailability / 100) * (avgPerformance / 100) * (avgQuality / 100) * 100;
      });

      // Return average OEE across all equipment
      return oeeValues.reduce((a, b) => a + b, 0) / oeeValues.length || 0;
    } catch (error) {
      console.error('Error calculating OEE:', error);
      return 0;
    }
  }

  /**
   * Get equipment status from database
   */
  async getEquipmentStatus() {
    try {
      const workUnits = await prisma.workUnit.findMany({
        include: {
          Metric: {
            orderBy: { timestamp: 'desc' },
            take: 5
          },
          MaintenanceRecord: {
            orderBy: { startTime: 'desc' },
            take: 1
          }
        },
        take: 10
      });

      return workUnits.map(wu => ({
        id: wu.id,
        name: wu.name,
        status: wu.status,
        type: wu.equipmentType,
        currentOEE: this.calculateEquipmentOEE(wu.Metric),
        lastMaintenance: wu.MaintenanceRecord[0]?.startTime,
        location: wu.location
      }));
    } catch (error) {
      console.error('Error fetching equipment:', error);
      return [];
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts() {
    try {
      return await prisma.alert.findMany({
        where: {
          status: 'ACTIVE'
        },
        include: {
          WorkUnit: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20
      });
    } catch (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
  }

  /**
   * Get recent metrics
   */
  async getRecentMetrics(type?: string) {
    try {
      const where: any = {
        timestamp: {
          gte: new Date(Date.now() - 4 * 60 * 60 * 1000) // Last 4 hours
        }
      };

      if (type) {
        where.name = type.toUpperCase();
      }

      return await prisma.metric.findMany({
        where,
        include: {
          WorkUnit: true
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 50
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return [];
    }
  }

  /**
   * Calculate OEE for specific equipment from metrics
   */
  private calculateEquipmentOEE(metrics: any[]): number {
    if (!metrics || metrics.length === 0) return 0;

    const availability = metrics.find(m => m.name === 'AVAILABILITY')?.value || 0;
    const performance = metrics.find(m => m.name === 'PERFORMANCE')?.value || 0;
    const quality = metrics.find(m => m.name === 'QUALITY')?.value || 0;

    return (availability / 100) * (performance / 100) * (quality / 100) * 100;
  }

  /**
   * Create enhanced prompt with database context
   */
  private createEnhancedPrompt(userMessage: string, context: ManufacturingContext): string {
    let enhancedPrompt = userMessage;

    // Add actual data context
    if (context.recentOEE !== undefined) {
      enhancedPrompt += `\n\n[CURRENT DATA: The current overall OEE is ${context.recentOEE.toFixed(1)}%]`;
    }

    if (context.equipmentData && context.equipmentData.length > 0) {
      const summary = context.equipmentData.map(eq => 
        `${eq.name}: ${eq.status} (OEE: ${eq.currentOEE.toFixed(1)}%)`
      ).join(', ');
      enhancedPrompt += `\n\n[EQUIPMENT STATUS: ${summary}]`;
    }

    if (context.activeAlerts !== undefined) {
      enhancedPrompt += `\n\n[ALERTS: There are ${context.activeAlerts} active alerts]`;
    }

    if (context.metricsData && context.metricsData.length > 0) {
      const avgValue = context.metricsData.reduce((sum, m) => sum + m.value, 0) / context.metricsData.length;
      enhancedPrompt += `\n\n[RECENT METRICS: Average value is ${avgValue.toFixed(1)}]`;
    }

    return enhancedPrompt;
  }

  /**
   * Execute specific database queries based on intent
   */
  async executeQuery(queryType: string, parameters: any = {}) {
    switch (queryType) {
      case 'equipment_list':
        return await prisma.workUnit.findMany({
          include: { Metric: { take: 1, orderBy: { timestamp: 'desc' } } }
        });

      case 'oee_history':
        const { equipmentId, days = 7 } = parameters;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return await prisma.metric.findMany({
          where: {
            workUnitId: equipmentId,
            name: { in: ['AVAILABILITY', 'PERFORMANCE', 'QUALITY', 'OEE'] },
            timestamp: { gte: startDate }
          },
          orderBy: { timestamp: 'asc' }
        });

      case 'production_summary':
        return await prisma.metric.groupBy({
          by: ['workUnitId', 'name'],
          _avg: { value: true },
          _count: true,
          where: {
            timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        });

      default:
        throw new Error(`Unknown query type: ${queryType}`);
    }
  }
}

// Export singleton instance
export const manufacturingChatService = new ManufacturingChatService();
export default manufacturingChatService;