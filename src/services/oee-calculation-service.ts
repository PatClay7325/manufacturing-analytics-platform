/**
 * OEE Calculation Service
 * Implements ISO 22400 compliant OEE calculations
 * Handles real-time and historical OEE computation
 */

import { prisma } from '@/lib/database';
import { Decimal } from '@prisma/client/runtime/library';

// ISO 22400 Time Categories
enum TimeCategory {
  PLANNED_BUSY_TIME = 'PBT',           // Planned production time
  UNPLANNED_DOWN_TIME = 'UDT',        // Breakdowns
  PLANNED_DOWN_TIME = 'PDT',          // Planned maintenance
  SETUP_TIME = 'SUT',                 // Changeovers
  PRODUCTION_TIME = 'PT',             // Actual production
  STANDBY_TIME = 'SBT'                // Waiting for work
}

// ISO 22400 Loss Categories (Six Big Losses)
enum LossCategory {
  EQUIPMENT_FAILURE = 'Availability',  // Breakdowns
  SETUP_ADJUSTMENT = 'Availability',   // Changeovers
  IDLING_MINOR_STOPS = 'Performance', // Small stops
  REDUCED_SPEED = 'Performance',       // Speed losses
  PROCESS_DEFECTS = 'Quality',         // Defects in production
  REDUCED_YIELD = 'Quality'            // Startup losses
}

export interface OEEComponents {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

export interface OEECalculation extends OEEComponents {
  // Time components (minutes)
  plannedProductionTime: number;
  operatingTime: number;
  netOperatingTime: number;
  fullyProductiveTime: number;
  
  // Loss breakdown (minutes)
  availabilityLoss: number;
  performanceLoss: number;
  qualityLoss: number;
  
  // Production metrics
  totalProduced: number;
  goodProduced: number;
  theoreticalOutput: number;
  
  // Additional KPIs
  teep?: number;  // Total Effective Equipment Performance
  mtbf?: number;  // Mean Time Between Failures
  mttr?: number;  // Mean Time To Repair
}

export class OEECalculationService {
  /**
   * Calculate OEE for a specific equipment and time period
   * Following ISO 22400 standard calculations
   */
  async calculateOEE(
    equipmentId: string,
    startTime: Date,
    endTime: Date,
    shiftInstanceId?: string
  ): Promise<OEECalculation> {
    // 1. Get equipment details
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: { workCenter: true }
    });

    if (!equipment) {
      throw new Error(`Equipment ${equipmentId} not found`);
    }

    // 2. Get or calculate shift details
    const shiftDetails = await this.getShiftDetails(startTime, endTime, shiftInstanceId);
    
    // 3. Calculate time components
    const timeComponents = await this.calculateTimeComponents(
      equipmentId,
      startTime,
      endTime,
      shiftDetails.plannedMinutes
    );

    // 4. Get production data
    const productionData = await this.getProductionData(
      equipmentId,
      startTime,
      endTime
    );

    // 5. Calculate theoretical output
    const theoreticalOutput = this.calculateTheoreticalOutput(
      timeComponents.operatingTime,
      equipment.theoreticalCycleTime || 60 // Default 60 seconds if not specified
    );

    // 6. Calculate OEE components
    const oeeComponents = this.computeOEEComponents(
      timeComponents,
      productionData,
      theoreticalOutput
    );

    // 7. Calculate additional KPIs
    const additionalKPIs = await this.calculateAdditionalKPIs(
      equipmentId,
      startTime,
      endTime,
      oeeComponents.oee,
      shiftDetails.totalAvailableTime
    );

    return {
      ...oeeComponents,
      ...timeComponents,
      ...productionData,
      theoreticalOutput,
      ...additionalKPIs
    };
  }

  /**
   * Get shift details for the time period
   */
  private async getShiftDetails(
    startTime: Date,
    endTime: Date,
    shiftInstanceId?: string
  ): Promise<{
    plannedMinutes: number;
    breakMinutes: number;
    totalAvailableTime: number;
  }> {
    if (shiftInstanceId) {
      const shiftInstance = await prisma.shiftInstance.findUnique({
        where: { id: shiftInstanceId },
        include: { shift: true }
      });

      if (shiftInstance) {
        return {
          plannedMinutes: shiftInstance.plannedMinutes,
          breakMinutes: shiftInstance.breakMinutes,
          totalAvailableTime: shiftInstance.plannedMinutes - shiftInstance.breakMinutes
        };
      }
    }

    // Calculate based on time period if no shift specified
    const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    return {
      plannedMinutes: totalMinutes,
      breakMinutes: 0,
      totalAvailableTime: totalMinutes
    };
  }

  /**
   * Calculate time components from equipment states
   */
  private async calculateTimeComponents(
    equipmentId: string,
    startTime: Date,
    endTime: Date,
    plannedMinutes: number
  ): Promise<{
    plannedProductionTime: number;
    operatingTime: number;
    netOperatingTime: number;
    fullyProductiveTime: number;
    availabilityLoss: number;
    performanceLoss: number;
    qualityLoss: number;
  }> {
    // Get all equipment states in the period
    const states = await prisma.$queryRaw<Array<{
      state: string;
      state_category: string;
      total_minutes: number;
    }>>`
      SELECT 
        state,
        "stateCategory" as state_category,
        SUM(
          EXTRACT(EPOCH FROM (
            LEAST(COALESCE("endTime", ${endTime}), ${endTime}) - 
            GREATEST("startTime", ${startTime})
          )) / 60
        ) as total_minutes
      FROM equipment_states
      WHERE "equipmentId" = ${equipmentId}
        AND "startTime" < ${endTime}
        AND (COALESCE("endTime", ${endTime}) > ${startTime})
      GROUP BY state, "stateCategory"
    `;

    // Sum up time by category
    let operatingTime = 0;
    let plannedDowntime = 0;
    let unplannedDowntime = 0;

    for (const state of states) {
      const minutes = Number(state.total_minutes) || 0;
      
      switch (state.state) {
        case 'PRODUCING':
          operatingTime += minutes;
          break;
        case 'PLANNED_STOP':
          plannedDowntime += minutes;
          break;
        case 'DOWN':
        case 'IDLE':
          unplannedDowntime += minutes;
          break;
      }
    }

    const plannedProductionTime = plannedMinutes - plannedDowntime;
    const availabilityLoss = unplannedDowntime;

    // Performance and quality losses calculated later with production data
    return {
      plannedProductionTime,
      operatingTime,
      netOperatingTime: operatingTime, // Will be adjusted for performance
      fullyProductiveTime: operatingTime, // Will be adjusted for quality
      availabilityLoss,
      performanceLoss: 0, // Calculated with production data
      qualityLoss: 0 // Calculated with production data
    };
  }

  /**
   * Get production data for the period
   */
  private async getProductionData(
    equipmentId: string,
    startTime: Date,
    endTime: Date
  ): Promise<{
    totalProduced: number;
    goodProduced: number;
  }> {
    const result = await prisma.$queryRaw<Array<{
      total_produced: bigint;
      good_produced: bigint;
    }>>`
      SELECT 
        COALESCE(SUM("totalCount"), 0) as total_produced,
        COALESCE(SUM("goodCount"), 0) as good_produced
      FROM production_counts
      WHERE "equipmentId" = ${equipmentId}
        AND timestamp >= ${startTime}
        AND timestamp <= ${endTime}
    `;

    return {
      totalProduced: Number(result[0]?.total_produced || 0),
      goodProduced: Number(result[0]?.good_produced || 0)
    };
  }

  /**
   * Calculate theoretical output based on cycle time
   */
  private calculateTheoreticalOutput(
    operatingTimeMinutes: number,
    theoreticalCycleTimeSeconds: number
  ): number {
    if (theoreticalCycleTimeSeconds <= 0) return 0;
    return (operatingTimeMinutes * 60) / theoreticalCycleTimeSeconds;
  }

  /**
   * Compute OEE components according to ISO 22400
   */
  private computeOEEComponents(
    timeComponents: any,
    productionData: any,
    theoreticalOutput: number
  ): OEEComponents & {
    netOperatingTime: number;
    fullyProductiveTime: number;
    performanceLoss: number;
    qualityLoss: number;
  } {
    // Availability = Operating Time / Planned Production Time
    const availability = timeComponents.plannedProductionTime > 0
      ? timeComponents.operatingTime / timeComponents.plannedProductionTime
      : 0;

    // Performance = (Total Count / Operating Time) / Ideal Run Rate
    const performance = theoreticalOutput > 0 && productionData.totalProduced > 0
      ? Math.min(productionData.totalProduced / theoreticalOutput, 1)
      : 0;

    // Quality = Good Count / Total Count
    const quality = productionData.totalProduced > 0
      ? productionData.goodProduced / productionData.totalProduced
      : 0;

    // OEE = Availability × Performance × Quality
    const oee = availability * performance * quality;

    // Calculate time losses
    const netOperatingTime = timeComponents.operatingTime * performance;
    const fullyProductiveTime = netOperatingTime * quality;
    const performanceLoss = timeComponents.operatingTime - netOperatingTime;
    const qualityLoss = netOperatingTime - fullyProductiveTime;

    return {
      availability: Math.round(availability * 10000) / 10000,
      performance: Math.round(performance * 10000) / 10000,
      quality: Math.round(quality * 10000) / 10000,
      oee: Math.round(oee * 10000) / 10000,
      netOperatingTime,
      fullyProductiveTime,
      performanceLoss,
      qualityLoss
    };
  }

  /**
   * Calculate additional KPIs
   */
  private async calculateAdditionalKPIs(
    equipmentId: string,
    startTime: Date,
    endTime: Date,
    oee: number,
    totalAvailableTime: number
  ): Promise<{
    teep?: number;
    mtbf?: number;
    mttr?: number;
  }> {
    // TEEP = OEE × Utilization
    // Utilization = Planned Production Time / Total Available Time
    const utilization = totalAvailableTime > 0 
      ? (totalAvailableTime - (await this.getPlannedDowntime(equipmentId, startTime, endTime))) / totalAvailableTime
      : 0;
    const teep = oee * utilization;

    // Calculate MTBF and MTTR
    const maintenanceMetrics = await this.calculateMaintenanceMetrics(
      equipmentId,
      startTime,
      endTime
    );

    return {
      teep: Math.round(teep * 10000) / 10000,
      ...maintenanceMetrics
    };
  }

  /**
   * Get planned downtime for the period
   */
  private async getPlannedDowntime(
    equipmentId: string,
    startTime: Date,
    endTime: Date
  ): Promise<number> {
    const result = await prisma.$queryRaw<Array<{ planned_minutes: number }>>`
      SELECT 
        COALESCE(SUM(
          EXTRACT(EPOCH FROM (
            LEAST(COALESCE("endTime", ${endTime}), ${endTime}) - 
            GREATEST("startTime", ${startTime})
          )) / 60
        ), 0) as planned_minutes
      FROM equipment_states
      WHERE "equipmentId" = ${equipmentId}
        AND state = 'PLANNED_STOP'
        AND "startTime" < ${endTime}
        AND COALESCE("endTime", ${endTime}) > ${startTime}
    `;

    return Number(result[0]?.planned_minutes || 0);
  }

  /**
   * Calculate MTBF and MTTR
   */
  private async calculateMaintenanceMetrics(
    equipmentId: string,
    startTime: Date,
    endTime: Date
  ): Promise<{
    mtbf?: number;
    mttr?: number;
  }> {
    const breakdowns = await prisma.maintenanceEvent.findMany({
      where: {
        equipmentId,
        eventType: 'BREAKDOWN',
        startTime: { gte: startTime, lte: endTime }
      },
      orderBy: { startTime: 'asc' }
    });

    if (breakdowns.length === 0) {
      return {};
    }

    // MTTR = Total Repair Time / Number of Repairs
    const totalRepairMinutes = breakdowns.reduce((sum, event) => {
      return sum + (event.durationMinutes || 0);
    }, 0);
    const mttr = totalRepairMinutes / breakdowns.length;

    // MTBF = Total Operating Time / Number of Failures
    if (breakdowns.length > 1) {
      let totalOperatingMinutes = 0;
      
      for (let i = 1; i < breakdowns.length; i++) {
        const timeBetween = (breakdowns[i].startTime.getTime() - 
                           breakdowns[i-1].endTime!.getTime()) / (1000 * 60);
        totalOperatingMinutes += timeBetween;
      }
      
      const mtbf = totalOperatingMinutes / (breakdowns.length - 1);
      
      return {
        mtbf: Math.round(mtbf * 100) / 100,
        mttr: Math.round(mttr * 100) / 100
      };
    }

    return {
      mttr: Math.round(mttr * 100) / 100
    };
  }

  /**
   * Store calculated OEE in database
   */
  async storeOEECalculation(
    equipmentId: string,
    shiftInstanceId: string,
    calculation: OEECalculation
  ): Promise<void> {
    await prisma.oEECalculation.create({
      data: {
        timestamp: new Date(),
        equipmentId,
        shiftInstanceId,
        plannedTime: calculation.plannedProductionTime,
        availableTime: calculation.plannedProductionTime - calculation.availabilityLoss,
        operatingTime: calculation.operatingTime,
        netOperatingTime: calculation.netOperatingTime,
        productiveTime: calculation.fullyProductiveTime,
        availability: calculation.availability,
        performance: calculation.performance,
        quality: calculation.quality,
        oee: calculation.oee,
        teep: calculation.teep,
        totalProduced: calculation.totalProduced,
        goodProduced: calculation.goodProduced,
        defectCount: calculation.totalProduced - calculation.goodProduced,
        reworkCount: 0, // Would need to get from quality events
        breakdownLoss: calculation.availabilityLoss,
        speedLoss: calculation.performanceLoss,
        defectLoss: calculation.qualityLoss
      }
    });
  }

  /**
   * Get OEE trend for equipment
   */
  async getOEETrend(
    equipmentId: string,
    startDate: Date,
    endDate: Date,
    granularity: 'hour' | 'shift' | 'day' | 'week' = 'day'
  ): Promise<Array<{
    period: Date;
    oee: number;
    availability: number;
    performance: number;
    quality: number;
  }>> {
    const bucketInterval = {
      hour: '1 hour',
      shift: '8 hours',
      day: '1 day',
      week: '1 week'
    }[granularity];

    const result = await prisma.$queryRaw<Array<{
      period: Date;
      avg_oee: number;
      avg_availability: number;
      avg_performance: number;
      avg_quality: number;
    }>>`
      SELECT 
        time_bucket(${bucketInterval}::interval, timestamp) as period,
        AVG(oee) as avg_oee,
        AVG(availability) as avg_availability,
        AVG(performance) as avg_performance,
        AVG(quality) as avg_quality
      FROM oee_calculations
      WHERE "equipmentId" = ${equipmentId}
        AND timestamp >= ${startDate}
        AND timestamp <= ${endDate}
      GROUP BY period
      ORDER BY period
    `;

    return result.map(row => ({
      period: row.period,
      oee: Math.round(Number(row.avg_oee) * 1000) / 1000,
      availability: Math.round(Number(row.avg_availability) * 1000) / 1000,
      performance: Math.round(Number(row.avg_performance) * 1000) / 1000,
      quality: Math.round(Number(row.avg_quality) * 1000) / 1000
    }));
  }
}

// Export singleton instance
export const oeeCalculationService = new OEECalculationService();