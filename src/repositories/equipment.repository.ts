import { Prisma } from '@prisma/client';
import { prisma } from '../services/prisma-production.service';

/**
 * Type-safe Equipment Repository
 * Implements common equipment queries with proper error handling
 */
export class EquipmentRepository {
  /**
   * Find active equipment with optional filtering
   */
  async findActive(options?: {
    workCenterId?: number;
    includeRelations?: boolean;
    limit?: number;
    offset?: number;
  }) {
    return prisma.executeWithMetrics(
      () => prisma.dimEquipment.findMany({
        where: {
          isActive: true,
          ...(options?.workCenterId && { workCenterId: options.workCenterId }),
        },
        include: options?.includeRelations ? {
          workCenter: {
            include: {
              area: {
                include: {
                  site: true,
                },
              },
            },
          },
        } : undefined,
        take: options?.limit,
        skip: options?.offset,
        orderBy: { equipmentName: 'asc' },
      }),
      'equipment.findActive'
    );
  }

  /**
   * Get equipment with recent production data
   */
  async getWithRecentProduction(
    equipmentId: number,
    days: number = 7
  ) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return prisma.executeWithMetrics(
      () => prisma.dimEquipment.findUniqueOrThrow({
        where: { equipmentId },
        include: {
          workCenter: true,
          production: {
            where: { startTime: { gte: since } },
            orderBy: { startTime: 'desc' },
            take: 100,
            include: {
              product: true,
              shift: true,
            },
          },
          _count: {
            select: {
              production: true,
              downtime: true,
              maintenance: true,
            },
          },
        },
      }),
      'equipment.getWithRecentProduction'
    );
  }

  /**
   * Get equipment utilization metrics
   */
  async getUtilizationMetrics(
    equipmentId: number,
    startDate: Date,
    endDate: Date
  ) {
    return prisma.executeWithMetrics(
      async () => {
        // Get production time
        const productionTime = await prisma.factProduction.aggregate({
          where: {
            equipmentId,
            startTime: { gte: startDate },
            endTime: { lte: endDate },
          },
          _sum: {
            operatingTime: true,
            plannedProductionTime: true,
          },
        });

        // Get downtime
        const downtime = await prisma.factDowntime.aggregate({
          where: {
            equipmentId,
            startTime: { gte: startDate },
            endTime: { lte: endDate },
          },
          _sum: {
            downtimeDuration: true,
          },
          _count: {
            downtimeId: true,
          },
        });

        // Get downtime by reason
        const downtimeByReason = await prisma.factDowntime.groupBy({
          by: ['reasonId'],
          where: {
            equipmentId,
            startTime: { gte: startDate },
            endTime: { lte: endDate },
          },
          _sum: {
            downtimeDuration: true,
          },
          _count: {
            downtimeId: true,
          },
          orderBy: {
            _sum: {
              downtimeDuration: 'desc',
            },
          },
        });

        // Join with reason details
        const reasonDetails = await prisma.dimDowntimeReason.findMany({
          where: {
            reasonId: {
              in: downtimeByReason.map(d => d.reasonId),
            },
          },
        });

        const reasonMap = new Map(reasonDetails.map(r => [r.reasonId, r]));

        return {
          totalOperatingTime: Number(productionTime._sum.operatingTime || 0),
          totalPlannedTime: Number(productionTime._sum.plannedProductionTime || 0),
          totalDowntime: Number(downtime._sum.downtimeDuration || 0),
          downtimeEvents: downtime._count.downtimeId,
          downtimeByReason: downtimeByReason.map(d => ({
            reason: reasonMap.get(d.reasonId),
            duration: Number(d._sum.downtimeDuration || 0),
            events: d._count.downtimeId,
          })),
        };
      },
      'equipment.getUtilizationMetrics'
    );
  }

  /**
   * Search equipment by various criteria
   */
  async search(criteria: {
    searchTerm?: string;
    workCenterIds?: number[];
    manufacturerFilter?: string;
    isActive?: boolean;
  }) {
    const whereClause: Prisma.DimEquipmentWhereInput = {
      AND: [
        criteria.isActive !== undefined ? { isActive: criteria.isActive } : {},
        criteria.searchTerm ? {
          OR: [
            { equipmentCode: { contains: criteria.searchTerm, mode: 'insensitive' } },
            { equipmentName: { contains: criteria.searchTerm, mode: 'insensitive' } },
            { model: { contains: criteria.searchTerm, mode: 'insensitive' } },
            { serialNumber: { contains: criteria.searchTerm, mode: 'insensitive' } },
          ],
        } : {},
        criteria.workCenterIds?.length ? {
          workCenterId: { in: criteria.workCenterIds },
        } : {},
        criteria.manufacturerFilter ? {
          manufacturer: { contains: criteria.manufacturerFilter, mode: 'insensitive' },
        } : {},
      ],
    };

    return prisma.executeWithMetrics(
      () => prisma.dimEquipment.findMany({
        where: whereClause,
        include: {
          workCenter: {
            include: {
              area: true,
            },
          },
        },
        orderBy: [
          { isActive: 'desc' },
          { equipmentName: 'asc' },
        ],
      }),
      'equipment.search'
    );
  }

  /**
   * Update equipment with audit trail
   */
  async update(
    equipmentId: number,
    data: Prisma.DimEquipmentUpdateInput,
    userId: string
  ) {
    return prisma.executeTransaction(
      async (tx) => {
        // Get current state for audit
        const current = await tx.dimEquipment.findUniqueOrThrow({
          where: { equipmentId },
        });

        // Update equipment
        const updated = await tx.dimEquipment.update({
          where: { equipmentId },
          data: {
            ...data,
            updatedAt: new Date(),
          },
        });

        // Manual audit log (since we're not using triggers in production)
        await tx.auditLog.create({
          data: {
            username: userId,
            action: 'UPDATE',
            tableName: 'dim_equipment',
            recordId: equipmentId.toString(),
            beforeData: current as any,
            afterData: updated as any,
          },
        });

        return updated;
      },
      { maxRetries: 3 }
    );
  }

  /**
   * Bulk update equipment status
   */
  async bulkUpdateStatus(
    equipmentIds: number[],
    isActive: boolean,
    userId: string
  ) {
    return prisma.executeTransaction(
      async (tx) => {
        // Get current states for audit
        const currentStates = await tx.dimEquipment.findMany({
          where: { equipmentId: { in: equipmentIds } },
          select: { equipmentId: true, isActive: true },
        });

        // Update all equipment
        const result = await tx.dimEquipment.updateMany({
          where: { equipmentId: { in: equipmentIds } },
          data: {
            isActive,
            updatedAt: new Date(),
          },
        });

        // Create audit logs
        const auditLogs = currentStates.map(state => ({
          username: userId,
          action: 'UPDATE',
          tableName: 'dim_equipment',
          recordId: state.equipmentId.toString(),
          beforeData: { isActive: state.isActive },
          afterData: { isActive },
        }));

        await tx.auditLog.createMany({
          data: auditLogs,
        });

        return result;
      },
      { maxRetries: 3 }
    );
  }
}

// Export singleton instance
export const equipmentRepository = new EquipmentRepository();