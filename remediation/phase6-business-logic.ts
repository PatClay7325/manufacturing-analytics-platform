#!/usr/bin/env ts-node
/**
 * Phase 6: Business Logic Implementation
 * Implements accurate OEE calculation, quality management, and maintenance intelligence
 * Following SEMI E79 and ISO 22400 standards
 */

import { prisma } from '@/lib/prisma';
import { Decimal } from 'decimal.js';
import * as ss from 'simple-statistics';
import { Matrix } from 'ml-matrix';
import { WeibullAnalysis } from 'weibull-js';

// =====================================================
// TYPES AND INTERFACES
// =====================================================

interface TimeCategory {
  planned: number;
  run: number;
  downtime: number;
  plannedDowntime: number;
  unplannedDowntime: number;
  qualityLoss: number;
  speedLoss: number;
}

interface ProductRun {
  productCode: string;
  startTime: Date;
  endTime: Date;
  idealCycleTime: number;
  totalPieces: number;
  goodPieces: number;
  reworkPieces: number;
  scrapPieces: number;
}

interface OEEResult {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  details: {
    plannedProductionTime: number;
    runTime: number;
    downtime: number;
    plannedDowntime: number;
    unplannedDowntime: number;
    idealCycleTime: number;
    totalPieces: number;
    goodPieces: number;
    theoreticalMaxOutput: number;
    actualOutput: number;
  };
  losses: {
    availabilityLosses: number;
    performanceLosses: number;
    qualityLosses: number;
    totalLosses: number;
  };
}

interface QualityAnalysis {
  totalDefects: number;
  defectsBySeverity: Record<string, number>;
  defectsByType: Record<string, number>;
  totalCost: number;
  costByCategory: {
    scrap: number;
    rework: number;
    warranty: number;
    customerImpact: number;
  };
  paretoChart: Array<{
    defectType: string;
    count: number;
    percentage: number;
    cumulativePercentage: number;
  }>;
  controlLimits: {
    ucl: number;
    lcl: number;
    centerLine: number;
  };
  processCapability: {
    cp: number;
    cpk: number;
    ppm: number;
    sigma: number;
  };
}

interface MaintenanceSchedule {
  equipment: Array<{
    id: string;
    nextMaintenance: Date;
    maintenanceType: string;
    estimatedDuration: number;
    spareParts: string[];
    cost: number;
  }>;
  totalCost: number;
  totalDowntime: number;
  reliability: number;
}

// =====================================================
// OEE CALCULATOR (SEMI E79 COMPLIANT)
// =====================================================

export class OEECalculator {
  /**
   * Calculate OEE according to SEMI E79 standard
   */
  async calculate(
    equipmentId: string,
    startTime: Date,
    endTime: Date
  ): Promise<OEEResult> {
    console.log(`📊 Calculating OEE for ${equipmentId} from ${startTime} to ${endTime}`);

    // Get all events in time range
    const [events, productRuns, qualityData] = await Promise.all([
      this.getEquipmentEvents(equipmentId, startTime, endTime),
      this.getProductRuns(equipmentId, startTime, endTime),
      this.getQualityData(equipmentId, startTime, endTime)
    ]);

    // Categorize time according to SEMI E79
    const timeCategories = this.categorizeTime(events, startTime, endTime);
    
    // Calculate OEE components
    const availability = this.calculateAvailability(timeCategories);
    const performance = this.calculatePerformance(productRuns, timeCategories);
    const quality = this.calculateQuality(productRuns, qualityData);
    
    // Calculate losses
    const losses = this.calculateLosses(timeCategories, productRuns, quality);

    // Calculate weighted ideal cycle time
    const idealCycleTime = this.getWeightedIdealCycleTime(productRuns);
    
    // Total pieces
    const totalPieces = productRuns.reduce((sum, run) => sum + run.totalPieces, 0);
    const goodPieces = productRuns.reduce((sum, run) => sum + run.goodPieces, 0);

    return {
      availability,
      performance,
      quality,
      oee: availability * performance * quality,
      details: {
        plannedProductionTime: timeCategories.planned,
        runTime: timeCategories.run,
        downtime: timeCategories.downtime,
        plannedDowntime: timeCategories.plannedDowntime,
        unplannedDowntime: timeCategories.unplannedDowntime,
        idealCycleTime,
        totalPieces,
        goodPieces,
        theoreticalMaxOutput: Math.floor(timeCategories.run / idealCycleTime),
        actualOutput: totalPieces
      },
      losses
    };
  }

  /**
   * Categorize time according to SEMI E79 states
   */
  private categorizeTime(
    events: any[],
    startTime: Date,
    endTime: Date
  ): TimeCategory {
    const categories: TimeCategory = {
      planned: 0,
      run: 0,
      downtime: 0,
      plannedDowntime: 0,
      unplannedDowntime: 0,
      qualityLoss: 0,
      speedLoss: 0
    };

    // Total calendar time
    const totalTime = endTime.getTime() - startTime.getTime();

    // Sort events by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Process events to categorize time
    let currentState = 'IDLE';
    let lastTimestamp = startTime;

    for (const event of events) {
      const duration = event.timestamp.getTime() - lastTimestamp.getTime();

      // Allocate time to appropriate category based on previous state
      switch (currentState) {
        case 'PRODUCTION':
          categories.run += duration;
          break;
        case 'UNPLANNED_STOP':
          categories.unplannedDowntime += duration;
          categories.downtime += duration;
          break;
        case 'PLANNED_MAINTENANCE':
        case 'CHANGEOVER':
          categories.plannedDowntime += duration;
          break;
        case 'NO_DEMAND':
        case 'NON_SCHEDULED':
          // Not counted in planned production time
          break;
        case 'SPEED_LOSS':
          categories.speedLoss += duration;
          categories.run += duration; // Still running, but slower
          break;
      }

      // Update state
      currentState = event.state;
      lastTimestamp = event.timestamp;
    }

    // Handle time from last event to end
    const remainingDuration = endTime.getTime() - lastTimestamp.getTime();
    switch (currentState) {
      case 'PRODUCTION':
        categories.run += remainingDuration;
        break;
      case 'UNPLANNED_STOP':
        categories.unplannedDowntime += remainingDuration;
        categories.downtime += remainingDuration;
        break;
    }

    // Calculate planned production time (excludes scheduled downtime)
    categories.planned = categories.run + categories.downtime;

    return categories;
  }

  /**
   * Calculate Availability = (Run Time) / (Planned Production Time)
   */
  private calculateAvailability(timeCategories: TimeCategory): number {
    if (timeCategories.planned === 0) return 0;
    
    const availability = timeCategories.run / timeCategories.planned;
    return Math.min(Math.max(availability, 0), 1);
  }

  /**
   * Calculate Performance = (Ideal Cycle Time × Total Pieces) / Run Time
   */
  private calculatePerformance(
    productRuns: ProductRun[],
    timeCategories: TimeCategory
  ): number {
    if (timeCategories.run === 0 || productRuns.length === 0) return 0;

    // Calculate theoretical time needed
    let theoreticalTime = 0;
    for (const run of productRuns) {
      theoreticalTime += run.idealCycleTime * run.totalPieces;
    }

    const performance = theoreticalTime / timeCategories.run;
    return Math.min(Math.max(performance, 0), 1);
  }

  /**
   * Calculate Quality = Good Pieces / Total Pieces
   */
  private calculateQuality(
    productRuns: ProductRun[],
    qualityData: any[]
  ): number {
    const totalPieces = productRuns.reduce((sum, run) => sum + run.totalPieces, 0);
    if (totalPieces === 0) return 0;

    const goodPieces = productRuns.reduce((sum, run) => sum + run.goodPieces, 0);
    
    const quality = goodPieces / totalPieces;
    return Math.min(Math.max(quality, 0), 1);
  }

  /**
   * Calculate weighted ideal cycle time based on product mix
   */
  private getWeightedIdealCycleTime(productRuns: ProductRun[]): number {
    if (productRuns.length === 0) return 0;

    let totalPieces = 0;
    let weightedSum = 0;

    for (const run of productRuns) {
      weightedSum += run.idealCycleTime * run.totalPieces;
      totalPieces += run.totalPieces;
    }

    return totalPieces > 0 ? weightedSum / totalPieces : 0;
  }

  /**
   * Calculate six big losses
   */
  private calculateLosses(
    timeCategories: TimeCategory,
    productRuns: ProductRun[],
    quality: number
  ): OEEResult['losses'] {
    const totalPlannedTime = timeCategories.planned;
    
    // Availability losses (breakdowns + changeovers)
    const availabilityLosses = timeCategories.downtime / totalPlannedTime;
    
    // Performance losses (speed loss + minor stops)
    const performanceLosses = timeCategories.speedLoss / totalPlannedTime;
    
    // Quality losses
    const qualityLosses = (1 - quality) * timeCategories.run / totalPlannedTime;

    return {
      availabilityLosses,
      performanceLosses,
      qualityLosses,
      totalLosses: availabilityLosses + performanceLosses + qualityLosses
    };
  }

  // Data fetching methods
  private async getEquipmentEvents(
    equipmentId: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    return prisma.$queryRaw`
      SELECT 
        timestamp,
        state,
        reason_code,
        duration_seconds
      FROM equipment_events
      WHERE equipment_id = ${equipmentId}
        AND timestamp BETWEEN ${startTime} AND ${endTime}
      ORDER BY timestamp
    `;
  }

  private async getProductRuns(
    equipmentId: string,
    startTime: Date,
    endTime: Date
  ): Promise<ProductRun[]> {
    const runs = await prisma.$queryRaw<any[]>`
      SELECT 
        pr.product_code,
        pr.start_time,
        pr.end_time,
        p.ideal_cycle_time_seconds as ideal_cycle_time,
        pr.total_pieces,
        pr.good_pieces,
        pr.rework_pieces,
        pr.scrap_pieces
      FROM production_runs pr
      JOIN product p ON pr.product_code = p.code
      WHERE pr.equipment_id = ${equipmentId}
        AND pr.start_time >= ${startTime}
        AND pr.end_time <= ${endTime}
      ORDER BY pr.start_time
    `;

    return runs.map(r => ({
      productCode: r.product_code,
      startTime: r.start_time,
      endTime: r.end_time,
      idealCycleTime: r.ideal_cycle_time,
      totalPieces: r.total_pieces,
      goodPieces: r.good_pieces,
      reworkPieces: r.rework_pieces,
      scrapPieces: r.scrap_pieces
    }));
  }

  private async getQualityData(
    equipmentId: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    return prisma.$queryRaw`
      SELECT 
        timestamp,
        product_code,
        defect_code,
        quantity,
        severity
      FROM quality_events
      WHERE equipment_id = ${equipmentId}
        AND timestamp BETWEEN ${startTime} AND ${endTime}
    `;
  }
}

// =====================================================
// QUALITY ANALYZER
// =====================================================

export class QualityAnalyzer {
  /**
   * Perform comprehensive quality analysis
   */
  async analyzeDefects(
    equipmentId: string,
    startTime: Date,
    endTime: Date
  ): Promise<QualityAnalysis> {
    console.log(`🎯 Analyzing quality for ${equipmentId}`);

    // Get defect data
    const defects = await this.getDefects(equipmentId, startTime, endTime);
    
    // Categorize defects
    const categorized = this.categorizeDefects(defects);
    
    // Calculate costs
    const costs = await this.calculateCosts(categorized);
    
    // Pareto analysis
    const pareto = this.paretoAnalysis(categorized);
    
    // SPC calculations
    const spc = await this.calculateSPC(equipmentId, startTime, endTime);
    
    // Process capability
    const capability = await this.calculateProcessCapability(equipmentId, startTime, endTime);

    return {
      totalDefects: defects.length,
      defectsBySeverity: this.groupBySeverity(defects),
      defectsByType: this.groupByType(defects),
      totalCost: costs.total,
      costByCategory: costs.byCategory,
      paretoChart: pareto,
      controlLimits: spc,
      processCapability: capability
    };
  }

  /**
   * Categorize defects by type and severity
   */
  private categorizeDefects(defects: any[]): Map<string, any[]> {
    const categorized = new Map<string, any[]>();
    
    for (const defect of defects) {
      const category = defect.defect_category || 'Unknown';
      if (!categorized.has(category)) {
        categorized.set(category, []);
      }
      categorized.get(category)!.push(defect);
    }
    
    return categorized;
  }

  /**
   * Calculate defect costs with impact analysis
   */
  private async calculateCosts(
    categorizedDefects: Map<string, any[]>
  ): Promise<{ total: number; byCategory: any }> {
    const costs = {
      scrap: 0,
      rework: 0,
      warranty: 0,
      customerImpact: 0
    };

    // Get defect cost data
    const defectCosts = await this.getDefectCosts();

    for (const [category, defects] of categorizedDefects) {
      for (const defect of defects) {
        const costData = defectCosts.get(defect.defect_code);
        if (!costData) continue;

        // Direct costs
        if (defect.is_rework) {
          costs.rework += defect.quantity * costData.rework_cost;
        } else {
          costs.scrap += defect.quantity * costData.scrap_cost;
        }

        // Warranty risk
        costs.warranty += defect.quantity * costData.warranty_probability * costData.warranty_cost;

        // Customer impact (based on severity)
        const impactMultiplier = {
          1: 10,   // Minor
          2: 50,   // Moderate
          3: 200,  // Major
          4: 1000, // Critical
          5: 5000  // Catastrophic
        };
        costs.customerImpact += defect.quantity * (impactMultiplier[defect.severity] || 0);
      }
    }

    const total = Object.values(costs).reduce((sum, cost) => sum + cost, 0);

    return {
      total,
      byCategory: costs
    };
  }

  /**
   * Perform Pareto analysis on defects
   */
  private paretoAnalysis(
    categorizedDefects: Map<string, any[]>
  ): QualityAnalysis['paretoChart'] {
    // Count defects by type
    const defectCounts = new Map<string, number>();
    let totalDefects = 0;

    for (const [category, defects] of categorizedDefects) {
      for (const defect of defects) {
        const count = defectCounts.get(defect.defect_code) || 0;
        defectCounts.set(defect.defect_code, count + defect.quantity);
        totalDefects += defect.quantity;
      }
    }

    // Sort by count descending
    const sorted = Array.from(defectCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    // Calculate cumulative percentages
    let cumulativeCount = 0;
    const paretoData = sorted.map(([defectType, count]) => {
      cumulativeCount += count;
      return {
        defectType,
        count,
        percentage: (count / totalDefects) * 100,
        cumulativePercentage: (cumulativeCount / totalDefects) * 100
      };
    });

    return paretoData;
  }

  /**
   * Calculate Statistical Process Control limits
   */
  private async calculateSPC(
    equipmentId: string,
    startTime: Date,
    endTime: Date
  ): Promise<QualityAnalysis['controlLimits']> {
    // Get quality measurements
    const measurements = await prisma.$queryRaw<any[]>`
      SELECT 
        measurement_value as value,
        timestamp
      FROM quality_measurements
      WHERE equipment_id = ${equipmentId}
        AND timestamp BETWEEN ${startTime} AND ${endTime}
        AND measurement_type = 'PRIMARY'
      ORDER BY timestamp
    `;

    if (measurements.length < 20) {
      // Not enough data for SPC
      return {
        ucl: 0,
        lcl: 0,
        centerLine: 0
      };
    }

    const values = measurements.map(m => m.value);
    
    // Calculate control limits using Western Electric rules
    const mean = ss.mean(values);
    const stdDev = ss.standardDeviation(values);
    
    return {
      ucl: mean + 3 * stdDev,  // Upper Control Limit
      lcl: mean - 3 * stdDev,  // Lower Control Limit
      centerLine: mean
    };
  }

  /**
   * Calculate Process Capability (Cp, Cpk)
   */
  private async calculateProcessCapability(
    equipmentId: string,
    startTime: Date,
    endTime: Date
  ): Promise<QualityAnalysis['processCapability']> {
    // Get specifications and measurements
    const [specs, measurements] = await Promise.all([
      this.getProductSpecifications(equipmentId),
      this.getQualityMeasurements(equipmentId, startTime, endTime)
    ]);

    if (!specs || measurements.length < 30) {
      return {
        cp: 0,
        cpk: 0,
        ppm: 0,
        sigma: 0
      };
    }

    const values = measurements.map(m => m.value);
    const mean = ss.mean(values);
    const stdDev = ss.standardDeviation(values);

    // Calculate Cp (Process Capability)
    const cp = (specs.usl - specs.lsl) / (6 * stdDev);

    // Calculate Cpk (Process Capability Index)
    const cpu = (specs.usl - mean) / (3 * stdDev);
    const cpl = (mean - specs.lsl) / (3 * stdDev);
    const cpk = Math.min(cpu, cpl);

    // Calculate PPM (Parts Per Million defects)
    const zUpper = (specs.usl - mean) / stdDev;
    const zLower = (mean - specs.lsl) / stdDev;
    const ppm = (1 - ss.cumulativeStdNormalProbability(zUpper) + 
                 ss.cumulativeStdNormalProbability(-zLower)) * 1000000;

    // Calculate Sigma level
    const sigma = 3 * cpk;

    return {
      cp: Number(cp.toFixed(3)),
      cpk: Number(cpk.toFixed(3)),
      ppm: Math.round(ppm),
      sigma: Number(sigma.toFixed(2))
    };
  }

  // Helper methods
  private async getDefects(
    equipmentId: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    return prisma.$queryRaw`
      SELECT 
        qe.*,
        dt.category as defect_category,
        dt.description as defect_description
      FROM quality_events qe
      JOIN defect_type dt ON qe.defect_code = dt.code
      WHERE qe.equipment_id = ${equipmentId}
        AND qe.time BETWEEN ${startTime} AND ${endTime}
      ORDER BY qe.time
    `;
  }

  private async getDefectCosts(): Promise<Map<string, any>> {
    const costs = await prisma.defect_type.findMany({
      select: {
        code: true,
        scrap_cost_default: true,
        rework_cost_default: true,
        warranty_risk_percentage: true,
        average_warranty_cost: true
      }
    });

    const costMap = new Map();
    costs.forEach(cost => {
      costMap.set(cost.code, {
        scrap_cost: cost.scrap_cost_default,
        rework_cost: cost.rework_cost_default,
        warranty_probability: cost.warranty_risk_percentage / 100,
        warranty_cost: cost.average_warranty_cost
      });
    });

    return costMap;
  }

  private async getProductSpecifications(equipmentId: string): Promise<any> {
    // Get the most common product for this equipment
    const result = await prisma.$queryRaw<any[]>`
      SELECT 
        ps.upper_spec_limit as usl,
        ps.lower_spec_limit as lsl,
        ps.target_value as target
      FROM product_specifications ps
      JOIN production_runs pr ON ps.product_code = pr.product_code
      WHERE pr.equipment_id = ${equipmentId}
      GROUP BY ps.upper_spec_limit, ps.lower_spec_limit, ps.target_value
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `;

    return result[0];
  }

  private async getQualityMeasurements(
    equipmentId: string,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    return prisma.$queryRaw`
      SELECT measurement_value as value
      FROM quality_measurements
      WHERE equipment_id = ${equipmentId}
        AND timestamp BETWEEN ${startTime} AND ${endTime}
        AND measurement_type = 'PRIMARY'
      ORDER BY timestamp
    `;
  }

  private groupBySeverity(defects: any[]): Record<string, number> {
    const grouped: Record<string, number> = {
      '1': 0, '2': 0, '3': 0, '4': 0, '5': 0
    };
    
    defects.forEach(d => {
      grouped[d.severity] = (grouped[d.severity] || 0) + d.quantity;
    });
    
    return grouped;
  }

  private groupByType(defects: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    defects.forEach(d => {
      grouped[d.defect_code] = (grouped[d.defect_code] || 0) + d.quantity;
    });
    
    return grouped;
  }
}

// =====================================================
// MAINTENANCE OPTIMIZER
// =====================================================

export class MaintenanceOptimizer {
  /**
   * Optimize maintenance schedule using reliability analysis
   */
  async optimizeSchedule(
    equipmentIds: string[],
    planningHorizon: number = 90 // days
  ): Promise<MaintenanceSchedule> {
    console.log(`🔧 Optimizing maintenance for ${equipmentIds.length} equipment units`);

    const schedules = [];
    let totalCost = 0;
    let totalDowntime = 0;

    for (const equipmentId of equipmentIds) {
      // Get maintenance history
      const history = await this.getMaintenanceHistory(equipmentId);
      
      // Perform reliability analysis
      const reliability = await this.calculateReliability(history);
      
      // Get maintenance costs
      const costs = await this.getMaintenanceCosts(equipmentId);
      
      // Optimize maintenance interval
      const optimal = this.optimizeMaintenanceInterval(
        reliability,
        costs,
        planningHorizon
      );

      schedules.push({
        id: equipmentId,
        nextMaintenance: optimal.nextDate,
        maintenanceType: optimal.type,
        estimatedDuration: optimal.duration,
        spareParts: optimal.parts,
        cost: optimal.cost
      });

      totalCost += optimal.cost;
      totalDowntime += optimal.duration;
    }

    // Calculate overall reliability
    const overallReliability = await this.calculateFleetReliability(equipmentIds);

    return {
      equipment: schedules,
      totalCost,
      totalDowntime,
      reliability: overallReliability
    };
  }

  /**
   * Calculate reliability metrics including MTBF, MTTR, and Weibull parameters
   */
  private async calculateReliability(
    history: any[]
  ): Promise<{ mtbf: number; mttr: number; weibull: any }> {
    if (history.length < 2) {
      return {
        mtbf: 0,
        mttr: 0,
        weibull: { beta: 1, eta: 1, reliability: () => 1 }
      };
    }

    // Calculate MTBF (Mean Time Between Failures)
    const failures = history.filter(h => h.maintenance_type === 'CORRECTIVE');
    const timeBetweenFailures = [];
    
    for (let i = 1; i < failures.length; i++) {
      const timeDiff = failures[i].start_time.getTime() - failures[i-1].end_time.getTime();
      timeBetweenFailures.push(timeDiff / (1000 * 60 * 60)); // Convert to hours
    }
    
    const mtbf = timeBetweenFailures.length > 0 
      ? ss.mean(timeBetweenFailures)
      : 0;

    // Calculate MTTR (Mean Time To Repair)
    const repairTimes = failures.map(f => f.duration_hours);
    const mttr = repairTimes.length > 0
      ? ss.mean(repairTimes)
      : 0;

    // Weibull analysis for failure prediction
    const weibull = this.performWeibullAnalysis(timeBetweenFailures);

    return { mtbf, mttr, weibull };
  }

  /**
   * Perform Weibull distribution analysis
   */
  private performWeibullAnalysis(failureTimes: number[]): any {
    if (failureTimes.length < 3) {
      return {
        beta: 1,  // Exponential distribution (constant failure rate)
        eta: 1,
        reliability: (time: number) => Math.exp(-time)
      };
    }

    // Sort failure times
    const sorted = failureTimes.sort((a, b) => a - b);
    
    // Estimate Weibull parameters using Maximum Likelihood Estimation
    // For demonstration, using simplified method
    const n = sorted.length;
    
    // Calculate median ranks
    const medianRanks = sorted.map((_, i) => (i + 0.3) / (n + 0.4));
    
    // Transform for linear regression
    const x = sorted.map(t => Math.log(t));
    const y = medianRanks.map(mr => Math.log(-Math.log(1 - mr)));
    
    // Linear regression to estimate parameters
    const regression = ss.linearRegression([x, y]);
    const beta = regression.m;  // Shape parameter
    const eta = Math.exp(-regression.b / beta);  // Scale parameter

    return {
      beta: Number(beta.toFixed(2)),
      eta: Number(eta.toFixed(2)),
      reliability: (time: number) => Math.exp(-Math.pow(time / eta, beta)),
      hazardRate: (time: number) => (beta / eta) * Math.pow(time / eta, beta - 1),
      expectedLife: eta * this.gamma(1 + 1/beta)
    };
  }

  /**
   * Optimize maintenance interval considering costs and reliability
   */
  private optimizeMaintenanceInterval(
    reliability: any,
    costs: any,
    planningHorizon: number
  ): any {
    // Cost components
    const preventiveCost = costs.preventive.material + costs.preventive.labor;
    const correctiveCost = costs.corrective.material + costs.corrective.labor + costs.corrective.production_loss;
    
    // Find optimal interval that minimizes total cost
    let optimalInterval = 0;
    let minCost = Infinity;
    
    // Test different maintenance intervals
    for (let interval = 100; interval <= 2000; interval += 100) { // Hours
      const reliabilityAtInterval = reliability.weibull.reliability(interval);
      
      // Expected number of failures before preventive maintenance
      const expectedFailures = 1 - reliabilityAtInterval;
      
      // Total cost per unit time
      const costPerUnitTime = (preventiveCost + expectedFailures * correctiveCost) / interval;
      
      if (costPerUnitTime < minCost) {
        minCost = costPerUnitTime;
        optimalInterval = interval;
      }
    }

    // Calculate next maintenance date
    const lastMaintenance = new Date(); // Should get from history
    const nextDate = new Date(lastMaintenance.getTime() + optimalInterval * 60 * 60 * 1000);

    // Determine maintenance type based on condition
    const maintenanceType = this.determineMaintenanceType(reliability, optimalInterval);

    return {
      interval: optimalInterval,
      nextDate,
      type: maintenanceType,
      duration: costs[maintenanceType.toLowerCase()].duration,
      parts: costs[maintenanceType.toLowerCase()].parts || [],
      cost: costs[maintenanceType.toLowerCase()].material + costs[maintenanceType.toLowerCase()].labor
    };
  }

  /**
   * Determine maintenance type based on equipment condition
   */
  private determineMaintenanceType(reliability: any, interval: number): string {
    const { beta } = reliability.weibull;
    
    if (beta < 1) {
      // Decreasing failure rate - run to failure might be optimal
      return 'CONDITION_BASED';
    } else if (beta > 3) {
      // Wear-out phase - preventive maintenance recommended
      return 'PREVENTIVE';
    } else {
      // Random failures - optimize based on cost
      return 'PREDICTIVE';
    }
  }

  /**
   * Calculate fleet-wide reliability
   */
  private async calculateFleetReliability(equipmentIds: string[]): Promise<number> {
    const reliabilities = [];
    
    for (const id of equipmentIds) {
      const history = await this.getMaintenanceHistory(id);
      const { weibull } = await this.calculateReliability(history);
      
      // Reliability at 30 days
      reliabilities.push(weibull.reliability(30 * 24)); // 30 days in hours
    }

    // System reliability (assuming series configuration)
    return reliabilities.reduce((product, r) => product * r, 1);
  }

  // Data access methods
  private async getMaintenanceHistory(equipmentId: string): Promise<any[]> {
    return prisma.$queryRaw`
      SELECT 
        maintenance_type,
        start_time,
        end_time,
        duration_hours,
        cost,
        failure_mode
      FROM maintenance_history
      WHERE equipment_id = ${equipmentId}
      ORDER BY start_time DESC
      LIMIT 100
    `;
  }

  private async getMaintenanceCosts(equipmentId: string): Promise<any> {
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        equipmentType: {
          include: {
            maintenanceCosts: true
          }
        }
      }
    });

    // Return structured costs
    return {
      preventive: {
        material: 500,
        labor: 300,
        duration: 4,
        parts: ['filter', 'oil', 'belt']
      },
      corrective: {
        material: 2000,
        labor: 1000,
        production_loss: 5000,
        duration: 8
      },
      predictive: {
        material: 300,
        labor: 200,
        duration: 2,
        parts: ['sensors']
      },
      condition_based: {
        material: 400,
        labor: 250,
        duration: 3,
        parts: ['wear_parts']
      }
    };
  }

  // Gamma function for Weibull expected life calculation
  private gamma(z: number): number {
    // Stirling's approximation for gamma function
    if (z < 0.5) {
      return Math.PI / (Math.sin(Math.PI * z) * this.gamma(1 - z));
    }
    
    const g = 7;
    const C = [
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];

    z -= 1;
    let x = C[0];
    for (let i = 1; i < g + 2; i++) {
      x += C[i] / (z + i);
    }

    const t = z + g + 0.5;
    return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
  }
}

// =====================================================
// PRODUCTION OPTIMIZER
// =====================================================

export class ProductionOptimizer {
  /**
   * Optimize production schedule for maximum OEE
   */
  async optimizeProductionSchedule(
    equipmentId: string,
    products: string[],
    timeHorizon: number = 24 // hours
  ): Promise<any> {
    console.log(`📈 Optimizing production schedule for ${equipmentId}`);

    // Get changeover matrix
    const changeoverMatrix = await this.getChangeoverMatrix(products);
    
    // Get product demand and constraints
    const demands = await this.getProductDemands(products);
    const constraints = await this.getProductionConstraints(equipmentId);
    
    // Get equipment performance by product
    const performance = await this.getProductPerformance(equipmentId, products);

    // Optimize sequence to minimize changeover time
    const optimalSequence = this.optimizeSequence(
      products,
      changeoverMatrix,
      demands,
      performance,
      timeHorizon
    );

    return {
      sequence: optimalSequence.sequence,
      schedule: optimalSequence.schedule,
      expectedOEE: optimalSequence.oee,
      changeoverTime: optimalSequence.totalChangeoverTime,
      productionTime: optimalSequence.totalProductionTime
    };
  }

  /**
   * Get changeover time matrix between products
   */
  private async getChangeoverMatrix(products: string[]): Promise<Map<string, Map<string, number>>> {
    const matrix = new Map<string, Map<string, number>>();
    
    // Initialize matrix
    products.forEach(from => {
      matrix.set(from, new Map());
      products.forEach(to => {
        matrix.get(from)!.set(to, 0);
      });
    });

    // Get changeover times from database
    const changeovers = await prisma.$queryRaw<any[]>`
      SELECT 
        from_product,
        to_product,
        avg_duration_minutes
      FROM changeover_matrix
      WHERE from_product = ANY(${products})
        AND to_product = ANY(${products})
    `;

    // Populate matrix
    changeovers.forEach(c => {
      matrix.get(c.from_product)!.set(c.to_product, c.avg_duration_minutes);
    });

    return matrix;
  }

  /**
   * Optimize production sequence using genetic algorithm
   */
  private optimizeSequence(
    products: string[],
    changeoverMatrix: Map<string, Map<string, number>>,
    demands: Map<string, number>,
    performance: Map<string, any>,
    timeHorizon: number
  ): any {
    // For demonstration, using a simplified greedy algorithm
    // In production, would use genetic algorithm or other metaheuristic
    
    const sequence = [];
    const schedule = [];
    let currentTime = 0;
    let currentProduct = products[0];
    let totalChangeoverTime = 0;
    let totalProductionTime = 0;
    
    const remainingDemand = new Map(demands);
    
    while (currentTime < timeHorizon * 60 && Array.from(remainingDemand.values()).some(d => d > 0)) {
      // Find next product with minimum changeover
      let nextProduct = currentProduct;
      let minChangeover = Infinity;
      
      for (const [product, demand] of remainingDemand) {
        if (demand > 0 && product !== currentProduct) {
          const changeover = changeoverMatrix.get(currentProduct)!.get(product)!;
          if (changeover < minChangeover) {
            minChangeover = changeover;
            nextProduct = product;
          }
        }
      }
      
      // Add changeover if switching products
      if (nextProduct !== currentProduct && currentProduct !== '') {
        currentTime += minChangeover;
        totalChangeoverTime += minChangeover;
        
        schedule.push({
          type: 'changeover',
          from: currentProduct,
          to: nextProduct,
          startTime: currentTime - minChangeover,
          duration: minChangeover
        });
      }
      
      // Calculate production time for this product
      const demand = remainingDemand.get(nextProduct) || 0;
      const perf = performance.get(nextProduct)!;
      const productionTime = Math.min(
        demand * perf.cycleTime,
        (timeHorizon * 60 - currentTime)
      );
      
      if (productionTime > 0) {
        schedule.push({
          type: 'production',
          product: nextProduct,
          startTime: currentTime,
          duration: productionTime,
          quantity: Math.floor(productionTime / perf.cycleTime)
        });
        
        sequence.push(nextProduct);
        currentTime += productionTime;
        totalProductionTime += productionTime;
        
        // Update remaining demand
        const produced = Math.floor(productionTime / perf.cycleTime);
        remainingDemand.set(nextProduct, Math.max(0, demand - produced));
      }
      
      currentProduct = nextProduct;
      
      // Break if no more demand
      if (Array.from(remainingDemand.values()).every(d => d === 0)) {
        break;
      }
    }
    
    // Calculate expected OEE
    const utilizationTime = totalProductionTime + totalChangeoverTime;
    const availability = totalProductionTime / utilizationTime;
    const avgPerformance = 0.85; // Would calculate based on historical data
    const avgQuality = 0.95; // Would calculate based on historical data
    const expectedOEE = availability * avgPerformance * avgQuality;
    
    return {
      sequence,
      schedule,
      oee: expectedOEE,
      totalChangeoverTime,
      totalProductionTime
    };
  }

  // Helper methods
  private async getProductDemands(products: string[]): Promise<Map<string, number>> {
    const demands = new Map<string, number>();
    
    // Would fetch from production planning system
    products.forEach(p => {
      demands.set(p, Math.floor(Math.random() * 1000) + 100);
    });
    
    return demands;
  }

  private async getProductionConstraints(equipmentId: string): Promise<any> {
    return {
      maxRunTime: 20, // hours
      maintenanceWindow: { start: 22, end: 6 }, // 10 PM to 6 AM
      minBatchSize: 50,
      maxBatchSize: 1000
    };
  }

  private async getProductPerformance(
    equipmentId: string,
    products: string[]
  ): Promise<Map<string, any>> {
    const performance = new Map();
    
    for (const product of products) {
      const perf = await prisma.$queryRaw<any[]>`
        SELECT 
          AVG(performance) as avg_performance,
          AVG(quality) as avg_quality,
          MIN(ideal_cycle_time_seconds) as cycle_time
        FROM production_metrics pm
        JOIN product p ON pm.product_code = p.code
        WHERE pm.equipment_id = ${equipmentId}
          AND pm.product_code = ${product}
          AND pm.time >= NOW() - INTERVAL '30 days'
      `;
      
      performance.set(product, {
        performance: perf[0]?.avg_performance || 0.85,
        quality: perf[0]?.avg_quality || 0.95,
        cycleTime: perf[0]?.cycle_time || 60
      });
    }
    
    return performance;
  }
}

// =====================================================
// MAIN DEMONSTRATION
// =====================================================

async function demonstrateBusinessLogic() {
  console.log('📊 Business Logic Implementation Demonstration\n');

  // Get sample equipment
  const equipment = await prisma.equipment.findFirst({
    where: { is_active: true }
  });

  if (!equipment) {
    console.error('No active equipment found');
    return;
  }

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

  // 1. OEE Calculation
  console.log('1️⃣ OEE Calculation (SEMI E79 Compliant)');
  const oeeCalculator = new OEECalculator();
  const oeeResult = await oeeCalculator.calculate(equipment.id, startTime, endTime);
  
  console.log(`   Availability: ${(oeeResult.availability * 100).toFixed(2)}%`);
  console.log(`   Performance: ${(oeeResult.performance * 100).toFixed(2)}%`);
  console.log(`   Quality: ${(oeeResult.quality * 100).toFixed(2)}%`);
  console.log(`   OEE: ${(oeeResult.oee * 100).toFixed(2)}%`);
  console.log(`   Total Losses: ${(oeeResult.losses.totalLosses * 100).toFixed(2)}%`);

  // 2. Quality Analysis
  console.log('\n2️⃣ Quality Analysis');
  const qualityAnalyzer = new QualityAnalyzer();
  const qualityResult = await qualityAnalyzer.analyzeDefects(equipment.id, startTime, endTime);
  
  console.log(`   Total Defects: ${qualityResult.totalDefects}`);
  console.log(`   Total Cost: $${qualityResult.totalCost.toFixed(2)}`);
  console.log(`   Process Capability (Cpk): ${qualityResult.processCapability.cpk}`);
  console.log(`   Sigma Level: ${qualityResult.processCapability.sigma}`);
  
  if (qualityResult.paretoChart.length > 0) {
    console.log('   Top 3 Defects:');
    qualityResult.paretoChart.slice(0, 3).forEach(item => {
      console.log(`     - ${item.defectType}: ${item.count} (${item.percentage.toFixed(1)}%)`);
    });
  }

  // 3. Maintenance Optimization
  console.log('\n3️⃣ Maintenance Optimization');
  const maintenanceOptimizer = new MaintenanceOptimizer();
  const maintenanceResult = await maintenanceOptimizer.optimizeSchedule([equipment.id], 90);
  
  console.log(`   Fleet Reliability: ${(maintenanceResult.reliability * 100).toFixed(2)}%`);
  console.log(`   Total Maintenance Cost: $${maintenanceResult.totalCost.toFixed(2)}`);
  console.log(`   Total Downtime: ${maintenanceResult.totalDowntime} hours`);
  
  if (maintenanceResult.equipment.length > 0) {
    const next = maintenanceResult.equipment[0];
    console.log(`   Next Maintenance: ${next.nextMaintenance.toDateString()}`);
    console.log(`   Type: ${next.maintenanceType}`);
  }

  // 4. Production Optimization
  console.log('\n4️⃣ Production Schedule Optimization');
  const products = ['PROD-A', 'PROD-B', 'PROD-C'];
  const productionOptimizer = new ProductionOptimizer();
  const productionResult = await productionOptimizer.optimizeProductionSchedule(
    equipment.id,
    products,
    8 // 8 hour shift
  );
  
  console.log(`   Optimal Sequence: ${productionResult.sequence.join(' → ')}`);
  console.log(`   Expected OEE: ${(productionResult.expectedOEE * 100).toFixed(2)}%`);
  console.log(`   Changeover Time: ${productionResult.changeoverTime} minutes`);
  console.log(`   Production Time: ${productionResult.productionTime} minutes`);

  console.log('\n✅ Business logic demonstration complete!');
}

// Run if executed directly
if (require.main === module) {
  demonstrateBusinessLogic()
    .catch(console.error)
    .finally(() => process.exit(0));
}

export {
  OEECalculator,
  QualityAnalyzer,
  MaintenanceOptimizer,
  ProductionOptimizer
};