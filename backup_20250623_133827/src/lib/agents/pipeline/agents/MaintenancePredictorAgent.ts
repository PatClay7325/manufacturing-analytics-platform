/**
 * Maintenance Predictor Agent
 * Predicts equipment failures, schedules maintenance, and optimizes maintenance costs
 */

import { BaseAgent } from '../BaseAgent';
import { AgentContext, AgentResult, MaintenancePredictionResult, DataCollectionResult, AgentConfig } from '../types';
import { logger } from '@/lib/logger';

export class MaintenancePredictorAgent extends BaseAgent {
  constructor(config?: Partial<AgentConfig>) {
    super('maintenance_predictor', {
      type: 'maintenance_predictor',
      enabled: true,
      timeout: 30000, // 30 seconds
      retries: 2,
      priority: 2,
      dependencies: ['data_collector'],
      ...config
    });
  }

  async execute(context: AgentContext, data: DataCollectionResult): Promise<AgentResult<MaintenancePredictionResult>> {
    this.logStart(context);
    
    try {
      if (!data || !data.metrics) {
        throw new Error('No data provided for maintenance prediction');
      }

      const { maintenance: maintenanceRecords, alerts, performance: performanceMetrics } = data.metrics;
      const { equipment } = data;
      
      // Predict failures
      const predictions = this.predictFailures(equipment, maintenanceRecords, alerts, performanceMetrics);
      
      // Generate maintenance schedule
      const maintenanceSchedule = this.generateMaintenanceSchedule(predictions, equipment, maintenanceRecords);
      
      // Calculate cost analysis
      const costAnalysis = this.calculateCostAnalysis(predictions, maintenanceSchedule);

      const result = this.createResult<MaintenancePredictionResult>({
        predictions,
        maintenanceSchedule,
        costAnalysis
      });

      // Send critical predictions to alert system
      const criticalPredictions = predictions.filter(p => p.priority === 'critical');
      if (criticalPredictions.length > 0 && this.communication) {
        await this.sendMessage('report_generator', {
          type: 'critical_maintenance',
          data: criticalPredictions
        });
      }

      this.logComplete(result);
      return result;

    } catch (error) {
      this.handleError(error as Error);
      return this.createResult<MaintenancePredictionResult>(
        {
          predictions: [],
          maintenanceSchedule: [],
          costAnalysis: {
            currentCost: 0,
            projectedCost: 0,
            savings: 0
          }
        },
        [error as Error]
      );
    }
  }

  private predictFailures(
    equipment: any[], 
    maintenanceRecords: any[], 
    alerts: any[],
    performanceMetrics: any[]
  ): Array<{
    equipmentId: string;
    equipmentName: string;
    failureProbability: number;
    estimatedTimeToFailure: number;
    recommendedAction: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }> {
    const predictions: Array<{
      equipmentId: string;
      equipmentName: string;
      failureProbability: number;
      estimatedTimeToFailure: number;
      recommendedAction: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
    }> = [];

    equipment.forEach(equip => {
      // Get equipment-specific data
      const equipAlerts = alerts.filter(a => a.workUnitId === equip.id);
      const equipMaintenance = maintenanceRecords.filter(m => m.workUnitId === equip.id);
      const equipPerformance = performanceMetrics.filter(p => p.workUnitId === equip.id);

      // Calculate failure indicators
      const failureIndicators = this.calculateFailureIndicators(
        equip,
        equipAlerts,
        equipMaintenance,
        equipPerformance
      );

      // Calculate failure probability
      const failureProbability = this.calculateFailureProbability(failureIndicators);
      
      // Estimate time to failure
      const timeToFailure = this.estimateTimeToFailure(failureIndicators, equip.lastMaintenanceAt);
      
      // Determine priority
      const priority = this.determinePriority(failureProbability, timeToFailure);
      
      // Generate recommendation
      const recommendedAction = this.generateMaintenanceRecommendation(
        failureIndicators,
        failureProbability,
        timeToFailure
      );

      predictions.push({
        equipmentId: equip.id,
        equipmentName: equip.name,
        failureProbability: Math.round(failureProbability * 100) / 100,
        estimatedTimeToFailure: timeToFailure,
        recommendedAction,
        priority
      });
    });

    // Sort by priority and probability
    return predictions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return b.failureProbability - a.failureProbability;
    });
  }

  private calculateFailureIndicators(
    equipment: any,
    alerts: any[],
    maintenanceRecords: any[],
    performanceMetrics: any[]
  ): {
    alertFrequency: number;
    performanceDegradation: number;
    timeSinceLastMaintenance: number;
    maintenanceFrequency: number;
    downtimeRate: number;
    ageScore: number;
  } {
    const now = new Date();
    
    // Alert frequency (alerts per day in last 7 days)
    const recentAlerts = alerts.filter(a => {
      const alertDate = new Date(a.timestamp);
      const daysDiff = (now.getTime() - alertDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });
    const alertFrequency = recentAlerts.length / 7;

    // Performance degradation
    let performanceDegradation = 0;
    if (performanceMetrics.length > 10) {
      const recentMetrics = performanceMetrics.slice(0, 5);
      const olderMetrics = performanceMetrics.slice(-5);
      
      const recentOEE = recentMetrics.reduce((sum, m) => sum + (m.oeeScore || 0), 0) / recentMetrics.length;
      const olderOEE = olderMetrics.reduce((sum, m) => sum + (m.oeeScore || 0), 0) / olderMetrics.length;
      
      performanceDegradation = Math.max(0, olderOEE - recentOEE);
    }

    // Time since last maintenance (in days)
    const lastMaintenanceDate = equipment.lastMaintenanceAt ? 
      new Date(equipment.lastMaintenanceAt) : 
      new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // Default to 1 year ago
    const timeSinceLastMaintenance = (now.getTime() - lastMaintenanceDate.getTime()) / (1000 * 60 * 60 * 24);

    // Maintenance frequency (maintenances per month in last year)
    const yearAgo = new Date(now);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    const yearlyMaintenance = maintenanceRecords.filter(m => 
      new Date(m.startTime) >= yearAgo
    );
    const maintenanceFrequency = yearlyMaintenance.length / 12;

    // Downtime rate
    const totalDowntime = performanceMetrics.reduce((sum, m) => sum + (m.unplannedDowntime || 0), 0);
    const totalTime = performanceMetrics.length * 60; // Assuming 60 minutes per metric
    const downtimeRate = totalTime > 0 ? totalDowntime / totalTime : 0;

    // Age score (based on equipment installation date if available)
    const installDate = equipment.installDate ? new Date(equipment.installDate) : yearAgo;
    const ageInYears = (now.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const ageScore = Math.min(1, ageInYears / 10); // Normalize to 0-1, max at 10 years

    return {
      alertFrequency,
      performanceDegradation,
      timeSinceLastMaintenance,
      maintenanceFrequency,
      downtimeRate,
      ageScore
    };
  }

  private calculateFailureProbability(indicators: any): number {
    // Weighted failure probability calculation
    const weights = {
      alertFrequency: 0.25,
      performanceDegradation: 0.20,
      timeSinceLastMaintenance: 0.20,
      maintenanceFrequency: 0.15,
      downtimeRate: 0.15,
      ageScore: 0.05
    };

    // Normalize indicators
    const normalized = {
      alertFrequency: Math.min(1, indicators.alertFrequency / 5), // Max 5 alerts/day
      performanceDegradation: Math.min(1, indicators.performanceDegradation / 0.3), // Max 30% degradation
      timeSinceLastMaintenance: Math.min(1, indicators.timeSinceLastMaintenance / 180), // Max 180 days
      maintenanceFrequency: Math.min(1, 1 - (indicators.maintenanceFrequency / 2)), // Inverse, max 2/month
      downtimeRate: Math.min(1, indicators.downtimeRate / 0.2), // Max 20% downtime
      ageScore: indicators.ageScore
    };

    // Calculate weighted probability
    let probability = 0;
    Object.keys(weights).forEach(key => {
      probability += normalized[key] * weights[key];
    });

    return Math.min(1, Math.max(0, probability));
  }

  private estimateTimeToFailure(indicators: any, lastMaintenanceDate: Date | null): number {
    // Base estimation in days
    let baseEstimate = 90; // Default 90 days

    // Adjust based on indicators
    if (indicators.alertFrequency > 2) {
      baseEstimate *= 0.5; // High alert frequency, halve the time
    } else if (indicators.alertFrequency > 1) {
      baseEstimate *= 0.75;
    }

    if (indicators.performanceDegradation > 0.2) {
      baseEstimate *= 0.6; // Significant degradation
    } else if (indicators.performanceDegradation > 0.1) {
      baseEstimate *= 0.8;
    }

    if (indicators.downtimeRate > 0.15) {
      baseEstimate *= 0.7; // High downtime
    }

    // Consider maintenance cycle
    if (lastMaintenanceDate && indicators.maintenanceFrequency > 0) {
      const typicalCycle = 30 / indicators.maintenanceFrequency; // Days between maintenance
      const daysSinceLast = indicators.timeSinceLastMaintenance;
      const remainingCycle = Math.max(0, typicalCycle - daysSinceLast);
      
      baseEstimate = Math.min(baseEstimate, remainingCycle);
    }

    return Math.max(1, Math.round(baseEstimate));
  }

  private determinePriority(
    failureProbability: number, 
    timeToFailure: number
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (failureProbability > 0.8 || timeToFailure <= 7) {
      return 'critical';
    } else if (failureProbability > 0.6 || timeToFailure <= 14) {
      return 'high';
    } else if (failureProbability > 0.4 || timeToFailure <= 30) {
      return 'medium';
    }
    return 'low';
  }

  private generateMaintenanceRecommendation(
    indicators: any,
    failureProbability: number,
    timeToFailure: number
  ): string {
    if (failureProbability > 0.8) {
      return 'Immediate preventive maintenance required. High risk of imminent failure.';
    }

    if (indicators.alertFrequency > 3) {
      return 'Investigate and resolve recurring alerts. Consider comprehensive diagnostic.';
    }

    if (indicators.performanceDegradation > 0.2) {
      return 'Performance restoration maintenance needed. Check calibration and worn components.';
    }

    if (indicators.downtimeRate > 0.15) {
      return 'Focus on reliability improvement. Review maintenance procedures and spare parts availability.';
    }

    if (timeToFailure <= 14) {
      return 'Schedule preventive maintenance within 2 weeks to avoid unplanned downtime.';
    }

    if (indicators.timeSinceLastMaintenance > 120) {
      return 'Overdue for routine maintenance. Schedule inspection and servicing.';
    }

    return 'Continue monitoring. Schedule routine maintenance as per standard cycle.';
  }

  private generateMaintenanceSchedule(
    predictions: any[],
    equipment: any[],
    existingMaintenance: any[]
  ): Array<{
    equipmentId: string;
    scheduledDate: Date;
    type: 'preventive' | 'predictive' | 'corrective';
    estimatedDuration: number;
  }> {
    const schedule: Array<{
      equipmentId: string;
      scheduledDate: Date;
      type: 'preventive' | 'predictive' | 'corrective';
      estimatedDuration: number;
    }> = [];

    const now = new Date();

    predictions.forEach(prediction => {
      if (prediction.priority === 'critical' || prediction.priority === 'high') {
        const scheduledDate = new Date(now);
        scheduledDate.setDate(scheduledDate.getDate() + Math.min(prediction.estimatedTimeToFailure, 14));

        // Check for conflicts with existing maintenance
        const hasConflict = existingMaintenance.some(m => {
          const maintenanceDate = new Date(m.startTime);
          return m.workUnitId === prediction.equipmentId &&
                 Math.abs(maintenanceDate.getTime() - scheduledDate.getTime()) < 7 * 24 * 60 * 60 * 1000;
        });

        if (!hasConflict) {
          schedule.push({
            equipmentId: prediction.equipmentId,
            scheduledDate,
            type: prediction.failureProbability > 0.7 ? 'predictive' : 'preventive',
            estimatedDuration: prediction.priority === 'critical' ? 240 : 120 // minutes
          });
        }
      }
    });

    // Sort by scheduled date
    return schedule.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }

  private calculateCostAnalysis(
    predictions: any[],
    schedule: any[]
  ): {
    currentCost: number;
    projectedCost: number;
    savings: number;
  } {
    // Cost assumptions (in currency units)
    const costs = {
      unplannedDowntimePerHour: 5000,
      plannedMaintenancePerHour: 500,
      emergencyRepairMultiplier: 3,
      productionLossPerHour: 10000
    };

    // Calculate current cost (reactive maintenance)
    const highRiskEquipment = predictions.filter(p => p.failureProbability > 0.6);
    const currentCost = highRiskEquipment.reduce((total, pred) => {
      const downTimeCost = costs.unplannedDowntimePerHour * 8; // Assume 8 hours average downtime
      const repairCost = costs.plannedMaintenancePerHour * 4 * costs.emergencyRepairMultiplier;
      const productionLoss = costs.productionLossPerHour * 8;
      return total + downTimeCost + repairCost + productionLoss;
    }, 0);

    // Calculate projected cost (predictive maintenance)
    const projectedCost = schedule.reduce((total, maint) => {
      const duration = maint.estimatedDuration / 60; // Convert to hours
      const maintenanceCost = costs.plannedMaintenancePerHour * duration;
      const productionLoss = costs.productionLossPerHour * duration * 0.5; // Reduced impact with planning
      return total + maintenanceCost + productionLoss;
    }, 0);

    const savings = Math.max(0, currentCost - projectedCost);

    return {
      currentCost: Math.round(currentCost),
      projectedCost: Math.round(projectedCost),
      savings: Math.round(savings)
    };
  }
}