import { logger } from '@/lib/logger';

export interface RawSensorData {
  timestamp: Date;
  equipmentId: string;
  readings: Record<string, number>;
  metadata?: Record<string, any>;
}

export interface ProcessedMetrics {
  oee?: number;
  availability?: number;
  performance?: number;
  quality?: number;
  productionCount?: number;
  goodCount?: number;
  rejectCount?: number;
}

export interface EquipmentConfig {
  id: string;
  idealCycleTime: number;
  targetProductionRate: number;
  shiftDuration: number; // in minutes
  qualityThresholds: {
    temperature?: { min: number; max: number };
    pressure?: { min: number; max: number };
    vibration?: { max: number };
  };
}

export class DataTransformer {
  private equipmentConfigs: Map<string, EquipmentConfig> = new Map();
  private productionBuffer: Map<string, any[]> = new Map();
  private readonly BUFFER_WINDOW = 60000; // 1 minute window for calculations

  constructor() {
    // Initialize with default configurations
    // In production, these would be loaded from database
    this.loadDefaultConfigurations();
  }

  /**
   * Transform raw sensor data to processed metrics
   */
  transformSensorData(data: RawSensorData): ProcessedMetrics {
    const config = this.equipmentConfigs.get(data.equipmentId);
    if (!config) {
      logger.warn(`No configuration found for equipment ${data.equipmentId}`);
      return {};
    }

    // Buffer production data for time-based calculations
    this.bufferProductionData(data);

    // Calculate metrics
    const metrics: ProcessedMetrics = {};

    // Calculate production metrics
    if (data.readings.cycleCount !== undefined) {
      metrics.productionCount = data.readings.cycleCount;
    }

    if (data.readings.goodParts !== undefined && data.readings.totalParts !== undefined) {
      metrics.goodCount = data.readings.goodParts;
      metrics.rejectCount = data.readings.totalParts - data.readings.goodParts;
      
      // Calculate quality
      if (data.readings.totalParts > 0) {
        metrics.quality = (data.readings.goodParts / data.readings.totalParts) * 100;
      }
    }

    // Calculate availability based on equipment status
    if (data.readings.status !== undefined) {
      const bufferData = this.getBufferData(data.equipmentId);
      const availability = this.calculateAvailability(bufferData);
      if (availability !== null) {
        metrics.availability = availability;
      }
    }

    // Calculate performance
    if (data.readings.actualCycleTime !== undefined && config.idealCycleTime > 0) {
      metrics.performance = (config.idealCycleTime / data.readings.actualCycleTime) * 100;
      metrics.performance = Math.min(metrics.performance, 100); // Cap at 100%
    }

    // Calculate OEE if all components are available
    if (metrics.availability !== undefined && 
        metrics.performance !== undefined && 
        metrics.quality !== undefined) {
      metrics.oee = (metrics.availability * metrics.performance * metrics.quality) / 10000;
    }

    return metrics;
  }

  /**
   * Calculate availability from buffer data
   */
  private calculateAvailability(bufferData: any[]): number | null {
    if (bufferData.length < 2) return null;

    const timeWindow = bufferData[bufferData.length - 1].timestamp.getTime() - 
                      bufferData[0].timestamp.getTime();
    
    let runningTime = 0;
    let lastTimestamp = bufferData[0].timestamp.getTime();
    let lastStatus = bufferData[0].readings.status;

    for (let i = 1; i < bufferData.length; i++) {
      const currentTimestamp = bufferData[i].timestamp.getTime();
      const currentStatus = bufferData[i].readings.status;
      
      if (lastStatus === 1) { // 1 = running
        runningTime += currentTimestamp - lastTimestamp;
      }
      
      lastTimestamp = currentTimestamp;
      lastStatus = currentStatus;
    }

    // Add time from last reading to now if still running
    if (lastStatus === 1) {
      runningTime += Date.now() - lastTimestamp;
    }

    return (runningTime / timeWindow) * 100;
  }

  /**
   * Buffer production data for time-based calculations
   */
  private bufferProductionData(data: RawSensorData): void {
    if (!this.productionBuffer.has(data.equipmentId)) {
      this.productionBuffer.set(data.equipmentId, []);
    }

    const buffer = this.productionBuffer.get(data.equipmentId)!;
    buffer.push(data);

    // Remove old data outside the window
    const cutoffTime = Date.now() - this.BUFFER_WINDOW;
    const filteredBuffer = buffer.filter(d => d.timestamp.getTime() > cutoffTime);
    this.productionBuffer.set(data.equipmentId, filteredBuffer);
  }

  /**
   * Get buffer data for equipment
   */
  private getBufferData(equipmentId: string): any[] {
    return this.productionBuffer.get(equipmentId) || [];
  }

  /**
   * Validate sensor readings against quality thresholds
   */
  validateQuality(equipmentId: string, readings: Record<string, number>): {
    isValid: boolean;
    violations: string[];
  } {
    const config = this.equipmentConfigs.get(equipmentId);
    if (!config || !config.qualityThresholds) {
      return { isValid: true, violations: [] };
    }

    const violations: string[] = [];
    const thresholds = config.qualityThresholds;

    // Check temperature
    if (thresholds.temperature && readings.temperature !== undefined) {
      if (readings.temperature < thresholds.temperature.min) {
        violations.push(`Temperature too low: ${readings.temperature}°C`);
      } else if (readings.temperature > thresholds.temperature.max) {
        violations.push(`Temperature too high: ${readings.temperature}°C`);
      }
    }

    // Check pressure
    if (thresholds.pressure && readings.pressure !== undefined) {
      if (readings.pressure < thresholds.pressure.min) {
        violations.push(`Pressure too low: ${readings.pressure} bar`);
      } else if (readings.pressure > thresholds.pressure.max) {
        violations.push(`Pressure too high: ${readings.pressure} bar`);
      }
    }

    // Check vibration
    if (thresholds.vibration && readings.vibration !== undefined) {
      if (readings.vibration > thresholds.vibration.max) {
        violations.push(`Excessive vibration: ${readings.vibration} mm/s`);
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }

  /**
   * Detect anomalies in sensor data
   */
  detectAnomalies(equipmentId: string, currentData: RawSensorData): {
    hasAnomaly: boolean;
    anomalies: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      value: number;
    }>;
  } {
    const anomalies: Array<any> = [];
    const bufferData = this.getBufferData(equipmentId);
    
    if (bufferData.length < 5) {
      return { hasAnomaly: false, anomalies: [] };
    }

    // Calculate statistics from buffer
    const stats = this.calculateStatistics(bufferData);

    // Check for sudden changes
    for (const [metric, value] of Object.entries(currentData.readings)) {
      if (typeof value !== 'number') continue;
      
      const metricStats = stats[metric];
      if (!metricStats) continue;

      // Detect outliers (3 sigma rule)
      if (Math.abs(value - metricStats.mean) > 3 * metricStats.stdDev) {
        anomalies.push({
          type: 'outlier',
          severity: 'high',
          description: `${metric} value is an outlier`,
          value,
        });
      }

      // Detect rapid changes
      if (metricStats.lastValue !== undefined) {
        const changeRate = Math.abs(value - metricStats.lastValue) / metricStats.lastValue;
        if (changeRate > 0.5) { // 50% change
          anomalies.push({
            type: 'rapid_change',
            severity: 'medium',
            description: `${metric} changed rapidly by ${(changeRate * 100).toFixed(1)}%`,
            value,
          });
        }
      }
    }

    // Detect stuck sensors (no change over time)
    for (const [metric, metricStats] of Object.entries(stats)) {
      if (metricStats.stdDev === 0 && bufferData.length > 10) {
        anomalies.push({
          type: 'stuck_sensor',
          severity: 'low',
          description: `${metric} sensor may be stuck (no variation)`,
          value: metricStats.mean,
        });
      }
    }

    return {
      hasAnomaly: anomalies.length > 0,
      anomalies,
    };
  }

  /**
   * Calculate statistics from buffer data
   */
  private calculateStatistics(bufferData: any[]): Record<string, {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    lastValue?: number;
  }> {
    const stats: Record<string, any> = {};

    // Collect all metrics
    const metrics = new Set<string>();
    bufferData.forEach(data => {
      Object.keys(data.readings).forEach(key => {
        if (typeof data.readings[key] === 'number') {
          metrics.add(key);
        }
      });
    });

    // Calculate statistics for each metric
    metrics.forEach(metric => {
      const values = bufferData
        .map(d => d.readings[metric])
        .filter(v => typeof v === 'number');

      if (values.length === 0) return;

      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / values.length;
      
      const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(variance);

      stats[metric] = {
        mean,
        stdDev,
        min: Math.min(...values),
        max: Math.max(...values),
        lastValue: values[values.length - 1],
      };
    });

    return stats;
  }

  /**
   * Calculate predictive maintenance indicators
   */
  calculateMaintenanceIndicators(equipmentId: string): {
    healthScore: number;
    maintenanceRisk: 'low' | 'medium' | 'high';
    estimatedTimeToMaintenance: number | null;
    indicators: Array<{
      component: string;
      status: 'good' | 'warning' | 'critical';
      remainingLife: number; // percentage
    }>;
  } {
    const bufferData = this.getBufferData(equipmentId);
    if (bufferData.length < 10) {
      return {
        healthScore: 100,
        maintenanceRisk: 'low',
        estimatedTimeToMaintenance: null,
        indicators: [],
      };
    }

    const stats = this.calculateStatistics(bufferData);
    const indicators: Array<any> = [];
    let overallHealth = 100;

    // Analyze vibration trends
    if (stats.vibration) {
      const vibrationHealth = this.calculateComponentHealth(
        stats.vibration.mean,
        0, // ideal
        5, // warning threshold
        10 // critical threshold
      );
      
      indicators.push({
        component: 'Bearings',
        status: vibrationHealth > 70 ? 'good' : vibrationHealth > 30 ? 'warning' : 'critical',
        remainingLife: vibrationHealth,
      });
      
      overallHealth = Math.min(overallHealth, vibrationHealth);
    }

    // Analyze temperature trends
    if (stats.temperature) {
      const tempHealth = this.calculateComponentHealth(
        stats.temperature.mean,
        70, // ideal
        85, // warning threshold
        95 // critical threshold
      );
      
      indicators.push({
        component: 'Thermal System',
        status: tempHealth > 70 ? 'good' : tempHealth > 30 ? 'warning' : 'critical',
        remainingLife: tempHealth,
      });
      
      overallHealth = Math.min(overallHealth, tempHealth);
    }

    // Determine maintenance risk
    let maintenanceRisk: 'low' | 'medium' | 'high' = 'low';
    if (overallHealth < 30) {
      maintenanceRisk = 'high';
    } else if (overallHealth < 70) {
      maintenanceRisk = 'medium';
    }

    // Estimate time to maintenance (simplified linear degradation)
    const degradationRate = 0.1; // 0.1% per hour
    const hoursToMaintenance = maintenanceRisk === 'high' 
      ? 24 
      : maintenanceRisk === 'medium' 
        ? 168 // 1 week
        : 720; // 1 month

    return {
      healthScore: overallHealth,
      maintenanceRisk,
      estimatedTimeToMaintenance: hoursToMaintenance,
      indicators,
    };
  }

  /**
   * Calculate component health score
   */
  private calculateComponentHealth(
    currentValue: number,
    idealValue: number,
    warningThreshold: number,
    criticalThreshold: number
  ): number {
    const deviation = Math.abs(currentValue - idealValue);
    const warningDelta = Math.abs(warningThreshold - idealValue);
    const criticalDelta = Math.abs(criticalThreshold - idealValue);

    if (deviation <= warningDelta) {
      // Linear interpolation between 100% and 70%
      return 100 - (deviation / warningDelta) * 30;
    } else if (deviation <= criticalDelta) {
      // Linear interpolation between 70% and 0%
      return 70 - ((deviation - warningDelta) / (criticalDelta - warningDelta)) * 70;
    } else {
      return 0;
    }
  }

  /**
   * Load default equipment configurations
   */
  private loadDefaultConfigurations(): void {
    // Example configurations - in production, load from database
    const configs: EquipmentConfig[] = [
      {
        id: 'press1',
        idealCycleTime: 45, // seconds
        targetProductionRate: 80, // units per hour
        shiftDuration: 480, // 8 hours
        qualityThresholds: {
          temperature: { min: 60, max: 90 },
          pressure: { min: 4, max: 6 },
          vibration: { max: 5 },
        },
      },
      {
        id: 'assembly1',
        idealCycleTime: 120, // seconds
        targetProductionRate: 30, // units per hour
        shiftDuration: 480,
        qualityThresholds: {
          temperature: { min: 20, max: 35 },
          vibration: { max: 3 },
        },
      },
    ];

    configs.forEach(config => {
      this.equipmentConfigs.set(config.id, config);
    });
  }

  /**
   * Update equipment configuration
   */
  updateEquipmentConfig(config: EquipmentConfig): void {
    this.equipmentConfigs.set(config.id, config);
    logger.info(`Updated configuration for equipment ${config.id}`);
  }
}

// Export singleton instance
export const dataTransformer = new DataTransformer();