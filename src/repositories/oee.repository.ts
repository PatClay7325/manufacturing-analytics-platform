import { Prisma } from '@prisma/client';
import { prisma } from '../services/prisma-production.service';

interface OEEMetrics {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  totalTime: number;
  runTime: number;
  downTime: number;
  goodParts: number;
  totalParts: number;
}

/**
 * Production-Ready OEE Repository
 * Calculates OEE metrics with proper performance optimization
 */
export class OEERepository {
  /**
   * Calculate OEE for equipment over a time period
   * Uses optimized queries and avoids N+1 problems
   */
  async calculateOEE(
    equipmentId: number,
    startDate: Date,
    endDate: Date
  ): Promise<OEEMetrics> {
    return prisma.executeWithMetrics(
      async () => {
        // Execute all queries in parallel for performance
        const [production, downtime, equipment] = await Promise.all([
          // Get production data
          prisma.factProduction.aggregate({
            where: {
              equipmentId,
              startTime: { gte: startDate },
              endTime: { lte: endDate },
            },
            _sum: {
              operatingTime: true,
              plannedProductionTime: true,
              totalPartsProduced: true,
              goodParts: true,
            },
            _count: {
              productionId: true,
            },
          }),
          
          // Get downtime data
          prisma.factDowntime.aggregate({
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
          }),
          
          // Get equipment details for ideal cycle time
          prisma.dimEquipment.findUnique({
            where: { equipmentId },
            select: {
              equipmentCode: true,
              equipmentName: true,
              attributes: true,
            },
          }),
        ]);

        // Calculate time components
        const plannedTime = Number(production._sum.plannedProductionTime || 0);
        const operatingTime = Number(production._sum.operatingTime || 0);
        const downtimeTotal = Number(downtime._sum.downtimeDuration || 0);
        
        // Calculate part components
        const totalParts = production._sum.totalPartsProduced || 0;
        const goodParts = production._sum.goodParts || 0;
        
        // Calculate OEE components
        const availability = plannedTime > 0 
          ? Math.min(1, (plannedTime - downtimeTotal) / plannedTime)
          : 0;
        
        const performance = operatingTime > 0 && plannedTime > 0
          ? Math.min(1, operatingTime / (plannedTime - downtimeTotal))
          : 0;
        
        const quality = totalParts > 0
          ? Math.min(1, goodParts / totalParts)
          : 0;
        
        const oee = availability * performance * quality;

        return {
          availability: Math.round(availability * 10000) / 10000,
          performance: Math.round(performance * 10000) / 10000,
          quality: Math.round(quality * 10000) / 10000,
          oee: Math.round(oee * 10000) / 10000,
          totalTime: plannedTime,
          runTime: operatingTime,
          downTime: downtimeTotal,
          goodParts,
          totalParts,
        };
      },
      'oee.calculateOEE'
    );
  }

  /**
   * Get OEE trend data for charting
   * Uses materialized view for performance
   */
  async getOEETrend(
    equipmentId: number,
    startDate: Date,
    endDate: Date,
    granularity: 'hour' | 'day' | 'week' | 'month' = 'day'
  ) {
    return prisma.executeWithMetrics(
      async () => {
        // Use raw query for time-series aggregation
        const result = await prisma.$queryRaw<Array<{
          time_bucket: Date;
          availability: number;
          performance: number;
          quality: number;
          oee: number;
          production_count: bigint;
        }>>`
          WITH time_buckets AS (
            SELECT 
              date_trunc(${granularity}, fp.start_time) as time_bucket,
              SUM(fp.planned_production_time) as planned_time,
              SUM(fp.operating_time) as operating_time,
              SUM(fp.total_parts_produced) as total_parts,
              SUM(fp.good_parts) as good_parts,
              COUNT(*)::bigint as production_count
            FROM fact_production fp
            WHERE fp.equipment_id = ${equipmentId}
              AND fp.start_time >= ${startDate}
              AND fp.end_time <= ${endDate}
            GROUP BY date_trunc(${granularity}, fp.start_time)
          ),
          downtime_buckets AS (
            SELECT 
              date_trunc(${granularity}, fd.start_time) as time_bucket,
              SUM(fd.downtime_duration) as downtime_total
            FROM fact_downtime fd
            WHERE fd.equipment_id = ${equipmentId}
              AND fd.start_time >= ${startDate}
              AND fd.end_time <= ${endDate}
            GROUP BY date_trunc(${granularity}, fd.start_time)
          )
          SELECT 
            tb.time_bucket,
            ROUND(
              CASE 
                WHEN tb.planned_time > 0 
                THEN LEAST(1.0, (tb.planned_time - COALESCE(db.downtime_total, 0))::numeric / tb.planned_time)
                ELSE 0 
              END, 4
            ) as availability,
            ROUND(
              CASE 
                WHEN tb.planned_time - COALESCE(db.downtime_total, 0) > 0 
                THEN LEAST(1.0, tb.operating_time::numeric / (tb.planned_time - COALESCE(db.downtime_total, 0)))
                ELSE 0 
              END, 4
            ) as performance,
            ROUND(
              CASE 
                WHEN tb.total_parts > 0 
                THEN LEAST(1.0, tb.good_parts::numeric / tb.total_parts)
                ELSE 0 
              END, 4
            ) as quality,
            ROUND(
              CASE 
                WHEN tb.planned_time > 0 AND tb.total_parts > 0
                THEN LEAST(1.0, 
                  ((tb.planned_time - COALESCE(db.downtime_total, 0))::numeric / tb.planned_time) *
                  (tb.operating_time::numeric / GREATEST(1, tb.planned_time - COALESCE(db.downtime_total, 0))) *
                  (tb.good_parts::numeric / tb.total_parts)
                )
                ELSE 0 
              END, 4
            ) as oee,
            tb.production_count
          FROM time_buckets tb
          LEFT JOIN downtime_buckets db ON tb.time_bucket = db.time_bucket
          ORDER BY tb.time_bucket ASC
        `;

        return result.map(row => ({
          ...row,
          production_count: Number(row.production_count),
        }));
      },
      'oee.getOEETrend'
    );
  }

  /**
   * Get comparative OEE across multiple equipment
   */
  async getComparativeOEE(
    equipmentIds: number[],
    startDate: Date,
    endDate: Date
  ) {
    return prisma.executeWithMetrics(
      async () => {
        const results = await Promise.all(
          equipmentIds.map(async (equipmentId) => {
            const metrics = await this.calculateOEE(equipmentId, startDate, endDate);
            const equipment = await prisma.dimEquipment.findUnique({
              where: { equipmentId },
              select: {
                equipmentId: true,
                equipmentCode: true,
                equipmentName: true,
                workCenter: {
                  select: {
                    workCenterCode: true,
                    workCenterName: true,
                  },
                },
              },
            });

            return {
              ...equipment,
              ...metrics,
            };
          })
        );

        // Sort by OEE descending
        return results.sort((a, b) => b.oee - a.oee);
      },
      'oee.getComparativeOEE'
    );
  }

  /**
   * Store calculated OEE metrics for reporting
   */
  async storeOEEMetrics(
    equipmentId: number,
    metrics: OEEMetrics,
    timeWindow: string = 'daily'
  ) {
    return prisma.executeWithMetrics(
      () => prisma.factOeeMetrics.create({
        data: {
          equipmentId,
          calculationTime: new Date(),
          timeWindow,
          availability: metrics.availability,
          performance: metrics.performance,
          quality: metrics.quality,
          oee: metrics.oee,
        },
      }),
      'oee.storeOEEMetrics'
    );
  }

  /**
   * Get top/bottom performers by OEE
   */
  async getOEERanking(
    startDate: Date,
    endDate: Date,
    limit: number = 10,
    order: 'top' | 'bottom' = 'top'
  ) {
    return prisma.executeWithMetrics(
      async () => {
        const result = await prisma.$queryRaw<Array<{
          equipment_id: number;
          equipment_code: string;
          equipment_name: string;
          work_center_name: string;
          avg_oee: number;
          avg_availability: number;
          avg_performance: number;
          avg_quality: number;
          data_points: bigint;
        }>>`
          SELECT 
            e.equipment_id,
            e.equipment_code,
            e.equipment_name,
            wc.work_center_name,
            ROUND(AVG(om.oee)::numeric, 4) as avg_oee,
            ROUND(AVG(om.availability)::numeric, 4) as avg_availability,
            ROUND(AVG(om.performance)::numeric, 4) as avg_performance,
            ROUND(AVG(om.quality)::numeric, 4) as avg_quality,
            COUNT(*)::bigint as data_points
          FROM fact_oee_metrics om
          JOIN dim_equipment e ON om.equipment_id = e.equipment_id
          JOIN dim_work_center wc ON e.work_center_id = wc.work_center_id
          WHERE om.calculation_time >= ${startDate}
            AND om.calculation_time <= ${endDate}
            AND e.is_active = true
          GROUP BY 
            e.equipment_id,
            e.equipment_code,
            e.equipment_name,
            wc.work_center_name
          ORDER BY avg_oee ${order === 'top' ? 'DESC' : 'ASC'}
          LIMIT ${limit}
        `;

        return result.map(row => ({
          ...row,
          data_points: Number(row.data_points),
        }));
      },
      'oee.getOEERanking'
    );
  }
}

// Export singleton instance
export const oeeRepository = new OEERepository();