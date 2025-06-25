/**
 * Custom Log Aggregation Service
 * Replacement for Loki - stores logs in PostgreSQL with TimescaleDB
 */

import { prisma } from '@/lib/database';
import { logger } from '@/lib/logger';

export interface LogEntry {
  id?: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  service: string;
  message: string;
  metadata?: Record<string, any>;
  traceId?: string;
  spanId?: string;
  userId?: string;
  tenantId?: string;
}

export interface LogQuery {
  service?: string;
  level?: string[];
  startTime?: Date;
  endTime?: Date;
  search?: string;
  traceId?: string;
  limit?: number;
  offset?: number;
}

export class CustomLogAggregator {
  private static instance: CustomLogAggregator;
  private batchSize = 100;
  private flushInterval = 5000; // 5 seconds
  private logBuffer: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startAutoFlush();
  }

  static getInstance(): CustomLogAggregator {
    if (!CustomLogAggregator.instance) {
      CustomLogAggregator.instance = new CustomLogAggregator();
    }
    return CustomLogAggregator.instance;
  }

  /**
   * Add a log entry to the buffer
   */
  async log(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date(),
    };

    this.logBuffer.push(logEntry);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * Query logs from the database
   */
  async query(query: LogQuery): Promise<{ logs: LogEntry[]; total: number }> {
    try {
      const where: any = {};

      if (query.service) {
        where.service = query.service;
      }

      if (query.level && query.level.length > 0) {
        where.level = { in: query.level };
      }

      if (query.startTime || query.endTime) {
        where.timestamp = {};
        if (query.startTime) {
          where.timestamp.gte = query.startTime;
        }
        if (query.endTime) {
          where.timestamp.lte = query.endTime;
        }
      }

      if (query.search) {
        where.OR = [
          { message: { contains: query.search, mode: 'insensitive' } },
          { metadata: { path: '$.', string_contains: query.search } },
        ];
      }

      if (query.traceId) {
        where.traceId = query.traceId;
      }

      // Get total count
      const total = await prisma.systemLog.count({ where });

      // Get logs with pagination
      const logs = await prisma.systemLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: query.limit || 100,
        skip: query.offset || 0,
      });

      return { logs, total };
    } catch (error) {
      logger.error('Failed to query logs:', error);
      throw error;
    }
  }

  /**
   * Get log statistics
   */
  async getStats(
    service?: string,
    startTime?: Date,
    endTime?: Date
  ): Promise<{
    byLevel: Record<string, number>;
    byService: Record<string, number>;
    total: number;
  }> {
    try {
      const where: any = {};
      
      if (service) {
        where.service = service;
      }

      if (startTime || endTime) {
        where.timestamp = {};
        if (startTime) {
          where.timestamp.gte = startTime;
        }
        if (endTime) {
          where.timestamp.lte = endTime;
        }
      }

      // Get counts by level
      const byLevel = await prisma.systemLog.groupBy({
        by: ['level'],
        where,
        _count: true,
      });

      // Get counts by service
      const byService = await prisma.systemLog.groupBy({
        by: ['service'],
        where,
        _count: true,
      });

      // Get total count
      const total = await prisma.systemLog.count({ where });

      return {
        byLevel: byLevel.reduce((acc, item) => {
          acc[item.level] = item._count;
          return acc;
        }, {} as Record<string, number>),
        byService: byService.reduce((acc, item) => {
          acc[item.service] = item._count;
          return acc;
        }, {} as Record<string, number>),
        total,
      };
    } catch (error) {
      logger.error('Failed to get log stats:', error);
      throw error;
    }
  }

  /**
   * Clean up old logs
   */
  async cleanup(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await prisma.systemLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      logger.info(`Cleaned up ${result.count} old log entries`);
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup logs:', error);
      throw error;
    }
  }

  /**
   * Flush buffered logs to database
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await prisma.systemLog.createMany({
        data: logsToFlush.map((log) => ({
          timestamp: log.timestamp,
          level: log.level,
          service: log.service,
          message: log.message,
          metadata: log.metadata || {},
          traceId: log.traceId,
          spanId: log.spanId,
          userId: log.userId,
          tenantId: log.tenantId,
        })),
        skipDuplicates: true,
      });
    } catch (error) {
      logger.error('Failed to flush logs to database:', error);
      // Re-add logs to buffer on failure
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  /**
   * Start automatic flush timer
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        logger.error('Auto-flush failed:', error);
      });
    }, this.flushInterval);
  }

  /**
   * Stop the service and flush remaining logs
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flush();
  }
}

// Export singleton instance
export const logAggregator = CustomLogAggregator.getInstance();