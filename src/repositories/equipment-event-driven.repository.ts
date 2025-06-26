import { Prisma } from '@prisma/client';
import { PrismaProductionService } from '@/services/prisma-production.service';
import { EventSourcingService, EventType, EventPublisherMixin } from '@/services/event-sourcing.service';

/**
 * Event-Driven Equipment Repository
 * Replaces synchronous triggers with event publishing
 */
export class EquipmentEventDrivenRepository extends EventPublisherMixin {
  constructor(
    private prisma: PrismaProductionService,
    eventService: EventSourcingService
  ) {
    super(eventService, 'equipment');
  }

  /**
   * Create new equipment with event publishing
   */
  async create(data: Prisma.DimEquipmentCreateInput, userId?: string) {
    const equipment = await this.prisma.executeWithMetrics(
      async () => {
        return this.prisma.dimEquipment.create({
          data,
          include: {
            workCenter: {
              include: {
                area: {
                  include: {
                    site: true,
                  },
                },
              },
            },
          },
        });
      },
      'equipment.create'
    );

    // Publish event instead of relying on trigger
    await this.publishEvent(
      EventType.EQUIPMENT_CREATED,
      equipment.id.toString(),
      equipment,
      { userId }
    );

    return equipment;
  }

  /**
   * Update equipment with event publishing
   */
  async update(
    id: number,
    data: Prisma.DimEquipmentUpdateInput,
    userId?: string
  ) {
    // Get current state for event
    const before = await this.prisma.dimEquipment.findUnique({
      where: { id },
    });

    if (!before) {
      throw new Error(`Equipment ${id} not found`);
    }

    const after = await this.prisma.executeWithMetrics(
      async () => {
        return this.prisma.dimEquipment.update({
          where: { id },
          data,
          include: {
            workCenter: {
              include: {
                area: {
                  include: {
                    site: true,
                  },
                },
              },
            },
          },
        });
      },
      'equipment.update'
    );

    // Publish event with before/after state
    await this.publishEvent(
      EventType.EQUIPMENT_UPDATED,
      id.toString(),
      { before, after },
      { userId }
    );

    // Check for state changes that need additional events
    if (before.isActive !== after.isActive && !after.isActive) {
      await this.publishEvent(
        EventType.EQUIPMENT_DEACTIVATED,
        id.toString(),
        { equipmentCode: after.code, deactivatedAt: new Date() },
        { userId }
      );
    }

    return after;
  }

  /**
   * Record equipment state change with event
   */
  async recordStateChange(
    equipmentId: number,
    stateData: {
      stateCode: string;
      stateCategory: string;
      reasonCode?: string;
      reasonDescription?: string;
      operatorId?: string;
    }
  ) {
    // In a real system, this would update the equipment state table
    // For now, just publish the event
    await this.publishEvent(
      EventType.EQUIPMENT_STATE_CHANGED,
      equipmentId.toString(),
      {
        ...stateData,
        timestamp: new Date(),
      }
    );
  }

  /**
   * Batch update equipment with events
   */
  async batchUpdate(
    updates: Array<{ id: number; data: Prisma.DimEquipmentUpdateInput }>,
    userId?: string
  ) {
    const results = await this.prisma.$transaction(async (tx) => {
      const updatePromises = updates.map(async ({ id, data }) => {
        const before = await tx.dimEquipment.findUnique({
          where: { id },
        });

        if (!before) {
          throw new Error(`Equipment ${id} not found`);
        }

        const after = await tx.dimEquipment.update({
          where: { id },
          data,
        });

        return { id, before, after };
      });

      return Promise.all(updatePromises);
    });

    // Publish events after successful transaction
    await Promise.all(
      results.map(({ id, before, after }) =>
        this.publishEvent(
          EventType.EQUIPMENT_UPDATED,
          id.toString(),
          { before, after },
          { userId, correlationId: `batch-${Date.now()}` }
        )
      )
    );

    return results.map(r => r.after);
  }

  /**
   * Find equipment by criteria (read operations don't need events)
   */
  async findByCriteria(criteria: {
    workCenterId?: number;
    isActive?: boolean;
    equipmentType?: string;
    criticalityLevel?: string;
  }) {
    return this.prisma.executeWithMetrics(
      async () => {
        return this.prisma.dimEquipment.findMany({
          where: {
            ...(criteria.workCenterId && { workCenterId: criteria.workCenterId }),
            ...(criteria.isActive !== undefined && { isActive: criteria.isActive }),
            ...(criteria.equipmentType && { type: criteria.equipmentType }),
            ...(criteria.criticalityLevel && { criticalityLevel: criteria.criticalityLevel }),
          },
          include: {
            workCenter: {
              include: {
                area: true,
              },
            },
          },
          orderBy: [
            { criticalityLevel: 'asc' },
            { code: 'asc' },
          ],
        });
      },
      'equipment.findByCriteria'
    );
  }

  /**
   * Get equipment with recent events
   */
  async getEquipmentWithRecentEvents(
    equipmentId: number,
    hours: number = 24
  ) {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const [equipment, events] = await Promise.all([
      this.prisma.dimEquipment.findUnique({
        where: { id: equipmentId },
        include: {
          workCenter: {
            include: {
              area: {
                include: {
                  site: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.auditEvent.findMany({
        where: {
          aggregateType: 'equipment',
          aggregateId: equipmentId.toString(),
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      equipment,
      recentEvents: events.map(e => ({
        id: e.id.toString(),
        type: e.eventType,
        data: e.eventData,
        metadata: e.eventMetadata,
        createdAt: e.createdAt,
      })),
    };
  }

  /**
   * Get equipment performance metrics with caching
   */
  async getPerformanceMetrics(
    equipmentId: number,
    timeRange: { start: Date; end: Date }
  ) {
    const cacheKey = `equipment:${equipmentId}:performance:${timeRange.start.toISOString()}:${timeRange.end.toISOString()}`;
    
    // Check cache first (would use Redis in production)
    // For now, just execute the query
    
    const metrics = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(DISTINCT fp.production_id)::int as production_runs,
        SUM(fp.total_parts_produced)::int as total_parts,
        SUM(fp.good_parts)::int as good_parts,
        SUM(fp.scrap_parts)::int as scrap_parts,
        AVG(fp.operating_time::numeric / NULLIF(fp.planned_production_time::numeric, 0))::numeric(5,4) as availability,
        COUNT(DISTINCT fd.downtime_id)::int as downtime_events,
        SUM(fd.downtime_duration)::bigint as total_downtime_minutes
      FROM dim_equipment de
      LEFT JOIN fact_production fp ON de.equipment_id = fp.equipment_id
        AND fp.start_time >= ${timeRange.start}
        AND fp.start_time <= ${timeRange.end}
      LEFT JOIN fact_downtime fd ON de.equipment_id = fd.equipment_id
        AND fd.start_time >= ${timeRange.start}
        AND fd.start_time <= ${timeRange.end}
      WHERE de.equipment_id = ${equipmentId}
      GROUP BY de.equipment_id
    `;

    return metrics[0] || {
      production_runs: 0,
      total_parts: 0,
      good_parts: 0,
      scrap_parts: 0,
      availability: 0,
      downtime_events: 0,
      total_downtime_minutes: 0,
    };
  }
}