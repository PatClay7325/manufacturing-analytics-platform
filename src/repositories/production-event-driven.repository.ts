import { Prisma, Decimal } from '@prisma/client';
import { PrismaProductionService } from '@/services/prisma-production.service';
import { EventSourcingService, EventType, EventPublisherMixin } from '@/services/event-sourcing.service';

/**
 * Event-Driven Production Repository
 * Handles production operations with event publishing
 */
export class ProductionEventDrivenRepository extends EventPublisherMixin {
  constructor(
    private prisma: PrismaProductionService,
    eventService: EventSourcingService
  ) {
    super(eventService, 'production');
  }

  /**
   * Start a new production run
   */
  async startProduction(data: {
    equipmentId: number;
    productId: number;
    shiftId: number;
    orderNumber?: string;
    plannedQuantity: number;
    operatorId?: string;
  }, userId?: string) {
    const production = await this.prisma.executeWithMetrics(
      async () => {
        // Calculate planned production time based on shift
        const shift = await this.prisma.dimShift.findUnique({
          where: { id: data.shiftId },
        });

        if (!shift) {
          throw new Error(`Shift ${data.shiftId} not found`);
        }

        const plannedTime = this.calculatePlannedTime(shift);
        
        return this.prisma.factProduction.create({
          data: {
            dateId: parseInt(new Date().toISOString().slice(0, 10).replace(/-/g, '')),
            shiftId: data.shiftId,
            equipmentId: data.equipmentId,
            productId: data.productId,
            orderNumber: data.orderNumber,
            startTime: new Date(),
            endTime: new Date(), // Will be updated when production ends
            plannedProductionTime: plannedTime,
            operatingTime: BigInt(0),
            totalPartsProduced: 0,
            goodParts: 0,
            scrapParts: 0,
            reworkParts: 0,
            operatorId: data.operatorId,
          },
          include: {
            equipment: true,
            product: true,
            shift: true,
          },
        });
      },
      'production.start'
    );

    // Publish production started event
    await this.publishEvent(
      EventType.PRODUCTION_STARTED,
      production.id.toString(),
      {
        productionId: production.id,
        equipmentCode: production.equipment.code,
        productCode: production.product.code,
        plannedQuantity: data.plannedQuantity,
        startTime: production.startTime,
        operatorId: data.operatorId,
      },
      { userId }
    );

    return production;
  }

  /**
   * Complete a production run
   */
  async completeProduction(
    productionId: number,
    data: {
      totalPartsProduced: number;
      goodParts: number;
      scrapParts?: number;
      reworkParts?: number;
    },
    userId?: string
  ) {
    const endTime = new Date();
    
    // Get current production data
    const currentProduction = await this.prisma.factProduction.findUnique({
      where: { id: productionId },
      include: {
        equipment: true,
        product: true,
      },
    });

    if (!currentProduction) {
      throw new Error(`Production ${productionId} not found`);
    }

    // Calculate operating time
    const operatingTime = BigInt(
      Math.floor((endTime.getTime() - currentProduction.startTime.getTime()) / 1000)
    );

    const updatedProduction = await this.prisma.executeWithMetrics(
      async () => {
        return this.prisma.factProduction.update({
          where: { id: productionId },
          data: {
            endTime,
            operatingTime,
            totalPartsProduced: data.totalPartsProduced,
            goodParts: data.goodParts,
            scrapParts: data.scrapParts || 0,
            reworkParts: data.reworkParts || 0,
          },
          include: {
            equipment: true,
            product: true,
            shift: true,
          },
        });
      },
      'production.complete'
    );

    // Calculate OEE components
    const oeeMetrics = this.calculateOEEComponents(updatedProduction);

    // Publish production completed event
    await this.publishEvent(
      EventType.PRODUCTION_COMPLETED,
      productionId.toString(),
      {
        productionId,
        equipmentCode: updatedProduction.equipment.code,
        productCode: updatedProduction.product.code,
        metrics: {
          totalParts: data.totalPartsProduced,
          goodParts: data.goodParts,
          scrapParts: data.scrapParts || 0,
          reworkParts: data.reworkParts || 0,
          operatingTime: Number(operatingTime),
          plannedTime: Number(updatedProduction.plannedProductionTime),
        },
        oee: oeeMetrics,
      },
      { userId }
    );

    // Check for OEE threshold breaches
    if (oeeMetrics.oee < 0.6) { // 60% threshold
      await this.publishEvent(
        EventType.OEE_THRESHOLD_BREACHED,
        productionId.toString(),
        {
          productionId,
          equipmentCode: updatedProduction.equipment.code,
          oeeValue: oeeMetrics.oee,
          threshold: 0.6,
          components: oeeMetrics,
        },
        { userId }
      );
    }

    return updatedProduction;
  }

  /**
   * Update production progress
   */
  async updateProgress(
    productionId: number,
    data: {
      additionalGoodParts: number;
      additionalScrapParts?: number;
      additionalReworkParts?: number;
    },
    userId?: string
  ) {
    const current = await this.prisma.factProduction.findUnique({
      where: { id: productionId },
    });

    if (!current) {
      throw new Error(`Production ${productionId} not found`);
    }

    const updated = await this.prisma.executeWithMetrics(
      async () => {
        return this.prisma.factProduction.update({
          where: { id: productionId },
          data: {
            totalPartsProduced: current.totalPartsProduced + data.additionalGoodParts + 
              (data.additionalScrapParts || 0) + (data.additionalReworkParts || 0),
            goodParts: current.goodParts + data.additionalGoodParts,
            scrapParts: (current.scrapParts || 0) + (data.additionalScrapParts || 0),
            reworkParts: (current.reworkParts || 0) + (data.additionalReworkParts || 0),
          },
        });
      },
      'production.updateProgress'
    );

    // Publish update event
    await this.publishEvent(
      EventType.PRODUCTION_UPDATED,
      productionId.toString(),
      {
        productionId,
        progress: {
          totalParts: updated.totalPartsProduced,
          goodParts: updated.goodParts,
          scrapParts: updated.scrapParts || 0,
          reworkParts: updated.reworkParts || 0,
        },
      },
      { userId }
    );

    return updated;
  }

  /**
   * Record scrap with event
   */
  async recordScrap(data: {
    productionId: number;
    productId: number;
    scrapCode: string;
    scrapQty: number;
    scrapCost?: Decimal;
  }, userId?: string) {
    const scrap = await this.prisma.executeWithMetrics(
      async () => {
        return this.prisma.factScrap.create({
          data,
        });
      },
      'production.recordScrap'
    );

    // Publish scrap event
    await this.publishEvent(
      EventType.SCRAP_RECORDED,
      data.productionId.toString(),
      {
        productionId: data.productionId,
        scrapId: scrap.id,
        scrapCode: data.scrapCode,
        quantity: data.scrapQty,
        cost: data.scrapCost?.toNumber(),
      },
      { userId, causationId: `production-${data.productionId}` }
    );

    return scrap;
  }

  /**
   * Get production summary with events
   */
  async getProductionSummary(
    equipmentId: number,
    timeRange: { start: Date; end: Date }
  ) {
    const [productions, downtimes, events] = await Promise.all([
      // Get productions
      this.prisma.factProduction.findMany({
        where: {
          equipmentId,
          startTime: { gte: timeRange.start, lte: timeRange.end },
        },
        include: {
          product: true,
          shift: true,
          scrap: true,
        },
        orderBy: { startTime: 'desc' },
      }),
      
      // Get downtimes
      this.prisma.factDowntime.findMany({
        where: {
          equipmentId,
          startTime: { gte: timeRange.start, lte: timeRange.end },
        },
        include: {
          reason: true,
        },
      }),
      
      // Get related events
      this.prisma.auditEvent.findMany({
        where: {
          aggregateType: 'production',
          createdAt: { gte: timeRange.start, lte: timeRange.end },
          eventType: { in: [EventType.PRODUCTION_COMPLETED, EventType.OEE_THRESHOLD_BREACHED] },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    // Calculate summary metrics
    const totalProductions = productions.length;
    const totalParts = productions.reduce((sum, p) => sum + p.totalPartsProduced, 0);
    const goodParts = productions.reduce((sum, p) => sum + p.goodParts, 0);
    const scrapParts = productions.reduce((sum, p) => sum + (p.scrapParts || 0), 0);
    const totalDowntime = downtimes.reduce((sum, d) => sum + Number(d.downtimeDuration), 0);

    return {
      summary: {
        totalProductions,
        totalParts,
        goodParts,
        scrapParts,
        quality: totalParts > 0 ? goodParts / totalParts : 0,
        totalDowntimeMinutes: totalDowntime / 60,
        downtimeEvents: downtimes.length,
      },
      productions,
      downtimes,
      recentEvents: events.map(e => ({
        type: e.eventType,
        data: e.eventData,
        timestamp: e.createdAt,
      })),
    };
  }

  /**
   * Calculate planned production time from shift
   */
  private calculatePlannedTime(shift: any): bigint {
    const [startHour, startMin] = shift.startTime.split(':').map(Number);
    const [endHour, endMin] = shift.endTime.split(':').map(Number);
    
    let minutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    if (minutes < 0) minutes += 24 * 60; // Handle overnight shifts
    
    minutes -= shift.breakMinutes || 0;
    
    return BigInt(minutes * 60); // Convert to seconds
  }

  /**
   * Calculate OEE components
   */
  private calculateOEEComponents(production: any) {
    const plannedTime = Number(production.plannedProductionTime);
    const operatingTime = Number(production.operatingTime);
    const theoreticalRate = production.equipment.theoreticalRate?.toNumber() || 1;
    
    // Availability = Operating Time / Planned Production Time
    const availability = plannedTime > 0 ? operatingTime / plannedTime : 0;
    
    // Performance = (Total Parts / Operating Time) / Theoretical Rate
    const actualRate = operatingTime > 0 ? production.totalPartsProduced / (operatingTime / 3600) : 0;
    const performance = theoreticalRate > 0 ? actualRate / theoreticalRate : 0;
    
    // Quality = Good Parts / Total Parts
    const quality = production.totalPartsProduced > 0 
      ? production.goodParts / production.totalPartsProduced 
      : 0;
    
    // OEE = Availability × Performance × Quality
    const oee = availability * performance * quality;
    
    return {
      availability: Math.min(availability, 1),
      performance: Math.min(performance, 1),
      quality: Math.min(quality, 1),
      oee: Math.min(oee, 1),
    };
  }
}