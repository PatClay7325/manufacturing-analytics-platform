import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { z } from 'zod';

// Pruning configuration schema
export const pruningConfigSchema = z.object({
  retentionDays: z.number().min(1).default(30),
  batchSize: z.number().min(1).max(10000).default(1000),
  pruneSessionMemory: z.boolean().default(true),
  pruneAuditTrail: z.boolean().default(true),
  pruneAlerts: z.boolean().default(true),
  pruneMetrics: z.boolean().default(false), // Metrics are usually kept longer
});

export type PruningConfig = z.infer<typeof pruningConfigSchema>;

// Pruning result schema
export const pruningResultSchema = z.object({
  sessionMemoryDeleted: z.number(),
  auditTrailDeleted: z.number(),
  alertsDeleted: z.number(),
  metricsDeleted: z.number(),
  totalDeleted: z.number(),
  duration: z.number(), // milliseconds
  errors: z.array(z.string()),
});

export type PruningResult = z.infer<typeof pruningResultSchema>;

/**
 * Memory Pruner Agent
 * Manages data retention and cleanup of old records
 */
export class MemoryPrunerAgent {
  private static instance: MemoryPrunerAgent;
  private isRunning: boolean = false;

  private constructor() {}

  static getInstance(): MemoryPrunerAgent {
    if (!MemoryPrunerAgent.instance) {
      MemoryPrunerAgent.instance = new MemoryPrunerAgent();
    }
    return MemoryPrunerAgent.instance;
  }

  /**
   * Prune old data based on retention policy
   */
  async prune(config?: Partial<PruningConfig>): Promise<PruningResult> {
    if (this.isRunning) {
      logger.warn('Pruning already in progress, skipping');
      return {
        sessionMemoryDeleted: 0,
        auditTrailDeleted: 0,
        alertsDeleted: 0,
        metricsDeleted: 0,
        totalDeleted: 0,
        duration: 0,
        errors: ['Pruning already in progress'],
      };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Merge with default config
      const pruningConfig = pruningConfigSchema.parse({
        retentionDays: env.MEMORY_RETENTION_DAYS,
        ...config,
      });

      logger.info({ config: pruningConfig }, 'Starting memory pruning');

      const cutoffDate = new Date(Date.now() - pruningConfig.retentionDays * 24 * 60 * 60 * 1000);

      let sessionMemoryDeleted = 0;
      let auditTrailDeleted = 0;
      let alertsDeleted = 0;
      let metricsDeleted = 0;

      // Prune session memory
      if (pruningConfig.pruneSessionMemory) {
        try {
          sessionMemoryDeleted = await this.pruneSessionMemory(cutoffDate, pruningConfig.batchSize);
          logger.info({ count: sessionMemoryDeleted }, 'Pruned session memory');
        } catch (error) {
          logger.error({ error }, 'Failed to prune session memory');
          errors.push('Failed to prune session memory');
        }
      }

      // Prune audit trail
      if (pruningConfig.pruneAuditTrail) {
        try {
          auditTrailDeleted = await this.pruneAuditTrail(cutoffDate, pruningConfig.batchSize);
          logger.info({ count: auditTrailDeleted }, 'Pruned audit trail');
        } catch (error) {
          logger.error({ error }, 'Failed to prune audit trail');
          errors.push('Failed to prune audit trail');
        }
      }

      // Prune old alerts
      if (pruningConfig.pruneAlerts) {
        try {
          alertsDeleted = await this.pruneAlerts(cutoffDate, pruningConfig.batchSize);
          logger.info({ count: alertsDeleted }, 'Pruned alerts');
        } catch (error) {
          logger.error({ error }, 'Failed to prune alerts');
          errors.push('Failed to prune alerts');
        }
      }

      // Prune old metrics (if enabled)
      if (pruningConfig.pruneMetrics) {
        try {
          metricsDeleted = await this.pruneMetrics(cutoffDate, pruningConfig.batchSize);
          logger.info({ count: metricsDeleted }, 'Pruned metrics');
        } catch (error) {
          logger.error({ error }, 'Failed to prune metrics');
          errors.push('Failed to prune metrics');
        }
      }

      const totalDeleted = sessionMemoryDeleted + auditTrailDeleted + alertsDeleted + metricsDeleted;
      const duration = Date.now() - startTime;

      const result: PruningResult = {
        sessionMemoryDeleted,
        auditTrailDeleted,
        alertsDeleted,
        metricsDeleted,
        totalDeleted,
        duration,
        errors,
      };

      logger.info({ result }, 'Memory pruning completed');

      // Audit the pruning operation
      await this.auditPruning(result, pruningConfig);

      return result;
    } catch (error) {
      logger.error({ error }, 'Memory pruning failed');
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Prune old session memory records
   */
  private async pruneSessionMemory(cutoffDate: Date, batchSize: number): Promise<number> {
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const { count } = await prisma.sessionMemory.deleteMany({
        where: {
          updatedAt: {
            lt: cutoffDate,
          },
        },
        // Prisma doesn't support limit in deleteMany, so we need a workaround
      });

      totalDeleted += count;
      hasMore = count === batchSize;

      if (hasMore) {
        // Small delay to prevent overloading the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return totalDeleted;
  }

  /**
   * Prune old audit trail records
   */
  private async pruneAuditTrail(cutoffDate: Date, batchSize: number): Promise<number> {
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      // Find records to delete (work around deleteMany limitation)
      const recordsToDelete = await prisma.auditTrail.findMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
        select: { id: true },
        take: batchSize,
      });

      if (recordsToDelete.length === 0) {
        hasMore = false;
        break;
      }

      const { count } = await prisma.auditTrail.deleteMany({
        where: {
          id: {
            in: recordsToDelete.map(r => r.id),
          },
        },
      });

      totalDeleted += count;
      hasMore = recordsToDelete.length === batchSize;

      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return totalDeleted;
  }

  /**
   * Prune old alerts (only resolved/dismissed ones)
   */
  private async pruneAlerts(cutoffDate: Date, batchSize: number): Promise<number> {
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const recordsToDelete = await prisma.alert.findMany({
        where: {
          AND: [
            {
              createdAt: {
                lt: cutoffDate,
              },
            },
            {
              OR: [
                { status: 'resolved' },
                { status: 'dismissed' },
              ],
            },
          ],
        },
        select: { id: true },
        take: batchSize,
      });

      if (recordsToDelete.length === 0) {
        hasMore = false;
        break;
      }

      const { count } = await prisma.alert.deleteMany({
        where: {
          id: {
            in: recordsToDelete.map(r => r.id),
          },
        },
      });

      totalDeleted += count;
      hasMore = recordsToDelete.length === batchSize;

      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return totalDeleted;
  }

  /**
   * Prune old metrics data
   */
  private async pruneMetrics(cutoffDate: Date, batchSize: number): Promise<number> {
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const recordsToDelete = await prisma.metric.findMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
        select: { id: true },
        take: batchSize,
      });

      if (recordsToDelete.length === 0) {
        hasMore = false;
        break;
      }

      const { count } = await prisma.metric.deleteMany({
        where: {
          id: {
            in: recordsToDelete.map(r => r.id),
          },
        },
      });

      totalDeleted += count;
      hasMore = recordsToDelete.length === batchSize;

      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return totalDeleted;
  }

  /**
   * Audit the pruning operation
   */
  private async auditPruning(result: PruningResult, config: PruningConfig): Promise<void> {
    try {
      await prisma.auditTrail.create({
        data: {
          intent: 'system-maintenance',
          request: {
            action: 'memory-pruning',
            config,
          },
          response: result,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to audit pruning operation');
    }
  }

  /**
   * Get pruning statistics
   */
  async getStatistics(): Promise<{
    sessionMemoryCount: number;
    auditTrailCount: number;
    alertsCount: number;
    metricsCount: number;
    oldestSessionMemory: Date | null;
    oldestAuditTrail: Date | null;
  }> {
    const [
      sessionMemoryCount,
      auditTrailCount,
      alertsCount,
      metricsCount,
      oldestSessionMemory,
      oldestAuditTrail,
    ] = await Promise.all([
      prisma.sessionMemory.count(),
      prisma.auditTrail.count(),
      prisma.alert.count(),
      prisma.metric.count(),
      prisma.sessionMemory.findFirst({
        orderBy: { updatedAt: 'asc' },
        select: { updatedAt: true },
      }),
      prisma.auditTrail.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      sessionMemoryCount,
      auditTrailCount,
      alertsCount,
      metricsCount,
      oldestSessionMemory: oldestSessionMemory.updatedAt || null,
      oldestAuditTrail: oldestAuditTrail.createdAt || null,
    };
  }
}