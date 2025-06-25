import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

interface MigrationResult {
  totalRecords: number;
  migratedRecords: number;
  errors: number;
  duration: number;
}

/**
 * Migrate existing data to the new TimescaleDB metrics schema
 */
export async function migrateToMetricsSchema(): Promise<MigrationResult> {
  const startTime = Date.now();
  let totalRecords = 0;
  let migratedRecords = 0;
  let errors = 0;

  logger.info('Starting data migration to TimescaleDB metrics schema...');

  try {
    // Begin transaction
    await prisma.$transaction(async (tx) => {
      // 1. Migrate equipment metrics
      logger.info('Migrating equipment metrics...');
      const equipmentMetrics = await tx.equipmentMetrics.findMany({
        include: {
          equipment: true,
        },
        orderBy: {
          timestamp: 'asc',
        },
      });

      totalRecords += equipmentMetrics.length;

      for (const metric of equipmentMetrics) {
        try {
          // Insert OEE components
          const insertQuery = `
            INSERT INTO manufacturing_metrics (timestamp, equipment_id, metric_name, metric_value, tags, metadata)
            VALUES 
              ($1, $2, 'oee', $3, $4, $5),
              ($1, $2, 'availability', $6, $4, $5),
              ($1, $2, 'performance', $7, $4, $5),
              ($1, $2, 'quality', $8, $4, $5),
              ($1, $2, 'production_count', $9, $4, $5),
              ($1, $2, 'good_count', $10, $4, $5),
              ($1, $2, 'reject_count', $11, $4, $5)
            ON CONFLICT DO NOTHING
          `;

          const tags = {
            shift: metric.shift || 'unknown',
            production_line: metric.equipment?.productionLineId || 'unknown',
            equipment_type: metric.equipment?.type || 'unknown',
          };

          const metadata = {
            migrated_from: 'equipment_metrics',
            original_id: metric.id,
            migrated_at: new Date().toISOString(),
          };

          await tx.$executeRawUnsafe(
            insertQuery,
            metric.timestamp,
            metric.equipmentId,
            metric.oee,
            JSON.stringify(tags),
            JSON.stringify(metadata),
            metric.availability,
            metric.performance,
            metric.quality,
            metric.productionCount,
            metric.goodCount,
            metric.defectCount
          );

          migratedRecords += 7; // 7 metrics per record
        } catch (error) {
          logger.error(`Error migrating equipment metric ${metric.id}:`, error);
          errors++;
        }
      }

      // 2. Migrate production metrics
      logger.info('Migrating production metrics...');
      const productionMetrics = await tx.productionMetric.findMany({
        orderBy: {
          timestamp: 'asc',
        },
      });

      totalRecords += productionMetrics.length;

      for (const metric of productionMetrics) {
        try {
          const insertQuery = `
            INSERT INTO manufacturing_metrics (timestamp, equipment_id, metric_name, metric_value, tags, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT DO NOTHING
          `;

          const tags = {
            product_type: metric.productType || 'unknown',
            batch_id: metric.batchNumber || 'unknown',
          };

          const metadata = {
            migrated_from: 'production_metrics',
            original_id: metric.id,
            migrated_at: new Date().toISOString(),
          };

          // Map production metrics to appropriate metric names
          const metricMappings = [
            { name: 'production_count', value: metric.quantity },
            { name: 'cycle_time', value: metric.cycleTime },
            { name: 'energy_consumption', value: metric.energyConsumption },
          ];

          for (const mapping of metricMappings) {
            if (mapping.value !== null && mapping.value !== undefined) {
              await tx.$executeRawUnsafe(
                insertQuery,
                metric.timestamp,
                metric.equipmentId,
                mapping.name,
                mapping.value,
                JSON.stringify(tags),
                JSON.stringify(metadata)
              );
              migratedRecords++;
            }
          }
        } catch (error) {
          logger.error(`Error migrating production metric ${metric.id}:`, error);
          errors++;
        }
      }

      // 3. Migrate quality metrics
      logger.info('Migrating quality metrics...');
      const qualityMetrics = await tx.qualityMetric.findMany({
        orderBy: {
          timestamp: 'asc',
        },
      });

      totalRecords += qualityMetrics.length;

      for (const metric of qualityMetrics) {
        try {
          const insertQuery = `
            INSERT INTO manufacturing_metrics (timestamp, equipment_id, metric_name, metric_value, tags, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT DO NOTHING
          `;

          const tags = {
            product_type: metric.productType || 'unknown',
            inspection_type: metric.inspectionType || 'unknown',
            defect_type: metric.defectType || 'none',
          };

          const metadata = {
            migrated_from: 'quality_metrics',
            original_id: metric.id,
            migrated_at: new Date().toISOString(),
          };

          // Map quality metrics
          const metricMappings = [
            { name: 'inspection_pass_rate', value: metric.passRate },
            { name: 'defect_rate', value: metric.defectRate },
            { name: 'rework_rate', value: metric.reworkRate },
            { name: 'inspection_count', value: 1 }, // Each record is one inspection
          ];

          for (const mapping of metricMappings) {
            if (mapping.value !== null && mapping.value !== undefined) {
              await tx.$executeRawUnsafe(
                insertQuery,
                metric.timestamp,
                metric.equipmentId,
                mapping.name,
                mapping.value,
                JSON.stringify(tags),
                JSON.stringify(metadata)
              );
              migratedRecords++;
            }
          }
        } catch (error) {
          logger.error(`Error migrating quality metric ${metric.id}:`, error);
          errors++;
        }
      }

      // 4. Migrate alerts to downtime events
      logger.info('Migrating alerts to downtime events...');
      const downtimeAlerts = await tx.alert.findMany({
        where: {
          type: {
            in: ['equipment_down', 'maintenance_required', 'critical_failure'],
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      totalRecords += downtimeAlerts.length;

      for (const alert of downtimeAlerts) {
        try {
          const insertQuery = `
            INSERT INTO downtime_events (equipment_id, start_time, end_time, reason_category, reason_detail, tags)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT DO NOTHING
          `;

          const reasonCategory = alert.type === 'maintenance_required' 
            ? 'planned_maintenance' 
            : 'unplanned_downtime';

          const tags = {
            severity: alert.severity || 'unknown',
            migrated_from: 'alerts',
            original_id: alert.id,
          };

          await tx.$executeRawUnsafe(
            insertQuery,
            alert.equipmentId,
            alert.createdAt,
            alert.resolvedAt,
            reasonCategory,
            alert.description,
            JSON.stringify(tags)
          );

          migratedRecords++;
        } catch (error) {
          logger.error(`Error migrating alert ${alert.id}:`, error);
          errors++;
        }
      }

      // 5. Create initial continuous aggregate data
      logger.info('Refreshing continuous aggregates...');
      await tx.$executeRaw`SELECT refresh_continuous_aggregate('oee_5min', NULL, NULL);`;
      await tx.$executeRaw`SELECT refresh_continuous_aggregate('oee_hourly', NULL, NULL);`;
      await tx.$executeRaw`SELECT refresh_continuous_aggregate('sensor_1min', NULL, NULL);`;
    });

    const duration = Date.now() - startTime;

    logger.info(`Migration completed successfully:
      - Total records processed: ${totalRecords}
      - Records migrated: ${migratedRecords}
      - Errors: ${errors}
      - Duration: ${duration}ms
    `);

    return {
      totalRecords,
      migratedRecords,
      errors,
      duration,
    };
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Validate migrated data
 */
export async function validateMigration(): Promise<boolean> {
  logger.info('Validating migrated data...');

  try {
    // Check record counts
    const [metricsCount, equipmentCount, originalCount] = await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(*) FROM manufacturing_metrics`,
      prisma.$queryRaw<[{ count: bigint }]>`SELECT COUNT(DISTINCT equipment_id) FROM manufacturing_metrics`,
      prisma.equipmentMetrics.count(),
    ]);

    logger.info(`Validation results:
      - Total metrics in TimescaleDB: ${metricsCount[0].count}
      - Unique equipment with metrics: ${equipmentCount[0].count}
      - Original equipment metrics: ${originalCount}
    `);

    // Check data integrity
    const sampleCheck = await prisma.$queryRaw<any[]>`
      SELECT 
        equipment_id,
        COUNT(*) as metric_count,
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest
      FROM manufacturing_metrics
      GROUP BY equipment_id
      LIMIT 10
    `;

    logger.info('Sample data check:', sampleCheck);

    return true;
  } catch (error) {
    logger.error('Validation failed:', error);
    return false;
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateToMetricsSchema()
    .then(async (result) => {
      logger.info('Migration result:', result);
      const isValid = await validateMigration();
      logger.info('Validation passed:', isValid);
      process.exit(isValid ? 0 : 1);
    })
    .catch((error) => {
      logger.error('Migration error:', error);
      process.exit(1);
    });
}