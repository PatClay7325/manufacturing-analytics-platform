/**
 * Transaction Logger for Distributed Systems
 * Production-ready transaction audit trails and recovery
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { performance } from 'perf_hooks';
import { Redis } from 'ioredis';
import { prisma } from '@/lib/prisma-singleton';

interface TransactionEvent {
  id: string;
  transactionId: string;
  sagaId?: string;
  stepId?: string;
  eventType: 'started' | 'committed' | 'rolled_back' | 'step_executed' | 'step_compensated' | 'failed';
  timestamp: Date;
  duration?: number;
  payload?: any;
  metadata?: Record<string, any>;
  tenantId?: string;
  userId?: string;
  correlationId?: string;
}

interface TransactionLog {
  transactionId: string;
  sagaId?: string;
  type: 'saga' | 'atomic' | 'compensation';
  status: 'active' | 'committed' | 'rolled_back' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  events: TransactionEvent[];
  context: {
    tenantId?: string;
    userId?: string;
    correlationId?: string;
    operation: string;
    resource?: string;
    metadata?: Record<string, any>;
  };
  checkpoints: TransactionCheckpoint[];
  metrics: {
    totalEvents: number;
    successfulSteps: number;
    failedSteps: number;
    compensatedSteps: number;
  };
}

interface TransactionCheckpoint {
  id: string;
  timestamp: Date;
  stepId?: string;
  state: any;
  hash: string;
}

interface LogQuery {
  transactionId?: string;
  sagaId?: string;
  tenantId?: string;
  userId?: string;
  status?: TransactionLog['status'];
  type?: TransactionLog['type'];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export class TransactionLogger extends EventEmitter {
  private static instance: TransactionLogger;
  private redis: Redis;
  private activeLogs: Map<string, TransactionLog> = new Map();
  private keyPrefix = 'txlog:';

  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_TXLOG_DB || '7'),
      keyPrefix: this.keyPrefix,
    });

    // Periodic persistence
    setInterval(() => this.persistActiveLogs(), 30000); // Every 30 seconds
  }

  static getInstance(): TransactionLogger {
    if (!TransactionLogger.instance) {
      TransactionLogger.instance = new TransactionLogger();
    }
    return TransactionLogger.instance;
  }

  /**
   * Start transaction logging
   */
  async startTransaction(
    transactionId: string,
    type: TransactionLog['type'],
    context: TransactionLog['context'],
    sagaId?: string
  ): Promise<void> {
    const log: TransactionLog = {
      transactionId,
      sagaId,
      type,
      status: 'active',
      startTime: new Date(),
      events: [],
      context,
      checkpoints: [],
      metrics: {
        totalEvents: 0,
        successfulSteps: 0,
        failedSteps: 0,
        compensatedSteps: 0,
      },
    };

    this.activeLogs.set(transactionId, log);

    // Log start event
    await this.logEvent(transactionId, {
      eventType: 'started',
      payload: { type, context },
    });

    this.emit('transaction_started', { transactionId, type, context });
  }

  /**
   * Log transaction event
   */
  async logEvent(
    transactionId: string,
    eventData: Partial<TransactionEvent> & { eventType: TransactionEvent['eventType'] }
  ): Promise<void> {
    const log = this.activeLogs.get(transactionId);
    if (!log) {
      throw new Error(`Transaction log not found: ${transactionId}`);
    }

    const event: TransactionEvent = {
      id: randomUUID(),
      transactionId,
      sagaId: log.sagaId,
      timestamp: new Date(),
      tenantId: log.context.tenantId,
      userId: log.context.userId,
      correlationId: log.context.correlationId,
      ...eventData,
    };

    log.events.push(event);
    log.metrics.totalEvents++;

    // Update metrics based on event type
    switch (event.eventType) {
      case 'step_executed':
        log.metrics.successfulSteps++;
        break;
      case 'step_compensated':
        log.metrics.compensatedSteps++;
        break;
      case 'failed':
        log.metrics.failedSteps++;
        break;
    }

    // Persist to Redis for durability
    await this.persistLog(log);

    this.emit('event_logged', event);
  }

  /**
   * Create checkpoint for transaction state
   */
  async createCheckpoint(
    transactionId: string,
    stepId: string,
    state: any
  ): Promise<string> {
    const log = this.activeLogs.get(transactionId);
    if (!log) {
      throw new Error(`Transaction log not found: ${transactionId}`);
    }

    const checkpoint: TransactionCheckpoint = {
      id: randomUUID(),
      timestamp: new Date(),
      stepId,
      state,
      hash: this.calculateStateHash(state),
    };

    log.checkpoints.push(checkpoint);
    await this.persistLog(log);

    this.emit('checkpoint_created', { transactionId, checkpointId: checkpoint.id });

    return checkpoint.id;
  }

  /**
   * Commit transaction
   */
  async commitTransaction(transactionId: string, result?: any): Promise<void> {
    const log = this.activeLogs.get(transactionId);
    if (!log) {
      throw new Error(`Transaction log not found: ${transactionId}`);
    }

    log.status = 'committed';
    log.endTime = new Date();
    log.duration = log.endTime.getTime() - log.startTime.getTime();

    await this.logEvent(transactionId, {
      eventType: 'committed',
      duration: log.duration,
      payload: result,
    });

    // Persist to database for long-term storage
    await this.persistToDatabase(log);

    // Remove from active logs
    this.activeLogs.delete(transactionId);

    this.emit('transaction_committed', { transactionId, duration: log.duration });
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(transactionId: string, error?: Error): Promise<void> {
    const log = this.activeLogs.get(transactionId);
    if (!log) {
      throw new Error(`Transaction log not found: ${transactionId}`);
    }

    log.status = 'rolled_back';
    log.endTime = new Date();
    log.duration = log.endTime.getTime() - log.startTime.getTime();

    await this.logEvent(transactionId, {
      eventType: 'rolled_back',
      duration: log.duration,
      payload: error ? { error: error.message, stack: error.stack } : undefined,
    });

    // Persist to database
    await this.persistToDatabase(log);

    // Remove from active logs
    this.activeLogs.delete(transactionId);

    this.emit('transaction_rolled_back', { transactionId, error });
  }

  /**
   * Fail transaction
   */
  async failTransaction(transactionId: string, error: Error): Promise<void> {
    const log = this.activeLogs.get(transactionId);
    if (!log) {
      throw new Error(`Transaction log not found: ${transactionId}`);
    }

    log.status = 'failed';
    log.endTime = new Date();
    log.duration = log.endTime.getTime() - log.startTime.getTime();

    await this.logEvent(transactionId, {
      eventType: 'failed',
      duration: log.duration,
      payload: { error: error.message, stack: error.stack },
    });

    // Persist to database
    await this.persistToDatabase(log);

    // Remove from active logs
    this.activeLogs.delete(transactionId);

    this.emit('transaction_failed', { transactionId, error });
  }

  /**
   * Get transaction log
   */
  async getTransactionLog(transactionId: string): Promise<TransactionLog | null> {
    // Check active logs first
    const activeLog = this.activeLogs.get(transactionId);
    if (activeLog) {
      return activeLog;
    }

    // Check Redis
    const redisLog = await this.redis.get(`log:${transactionId}`);
    if (redisLog) {
      return JSON.parse(redisLog);
    }

    // Check database
    try {
      const dbLog = await prisma.transactionLog.findUnique({
        where: { transactionId },
        include: { events: true, checkpoints: true },
      });

      if (dbLog) {
        return this.transformDbLogToLog(dbLog);
      }
    } catch (error) {
      console.error('Error fetching transaction log from database:', error);
    }

    return null;
  }

  /**
   * Query transaction logs
   */
  async queryLogs(query: LogQuery): Promise<{
    logs: TransactionLog[];
    total: number;
    hasMore: boolean;
  }> {
    const limit = query.limit || 50;
    const offset = query.offset || 0;

    // Build database query
    const where: any = {};
    
    if (query.transactionId) where.transactionId = query.transactionId;
    if (query.sagaId) where.sagaId = query.sagaId;
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.userId) where.userId = query.userId;
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    
    if (query.dateFrom || query.dateTo) {
      where.startTime = {};
      if (query.dateFrom) where.startTime.gte = query.dateFrom;
      if (query.dateTo) where.startTime.lte = query.dateTo;
    }

    try {
      const [logs, total] = await Promise.all([
        prisma.transactionLog.findMany({
          where,
          include: { events: true, checkpoints: true },
          orderBy: { startTime: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.transactionLog.count({ where }),
      ]);

      return {
        logs: logs.map(log => this.transformDbLogToLog(log)),
        total,
        hasMore: offset + logs.length < total,
      };
    } catch (error) {
      console.error('Error querying transaction logs:', error);
      return { logs: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get transaction statistics
   */
  async getStatistics(timeRange?: { from: Date; to: Date }): Promise<{
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    rolledBackTransactions: number;
    averageDuration: number;
    transactionsByType: Record<string, number>;
    transactionsByHour: Array<{ hour: string; count: number }>;
  }> {
    const where: any = {};
    
    if (timeRange) {
      where.startTime = {
        gte: timeRange.from,
        lte: timeRange.to,
      };
    }

    try {
      const [stats, typeStats] = await Promise.all([
        prisma.transactionLog.aggregate({
          where,
          _count: true,
          _avg: { duration: true },
        }),
        prisma.transactionLog.groupBy({
          by: ['type'],
          where,
          _count: true,
        }),
      ]);

      const statusStats = await prisma.transactionLog.groupBy({
        by: ['status'],
        where,
        _count: true,
      });

      const statusCounts = statusStats.reduce((acc, stat) => {
        acc[stat.status] = stat._count;
        return acc;
      }, {} as Record<string, number>);

      const transactionsByType = typeStats.reduce((acc, stat) => {
        acc[stat.type] = stat._count;
        return acc;
      }, {} as Record<string, number>);

      // Get hourly distribution (last 24 hours)
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const hourlyData = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('hour', "startTime") as hour,
          COUNT(*) as count
        FROM "TransactionLog"
        WHERE "startTime" >= ${last24Hours}
        GROUP BY DATE_TRUNC('hour', "startTime")
        ORDER BY hour
      ` as Array<{ hour: Date; count: bigint }>;

      const transactionsByHour = hourlyData.map(item => ({
        hour: item.hour.toISOString(),
        count: Number(item.count),
      }));

      return {
        totalTransactions: stats._count || 0,
        successfulTransactions: statusCounts.committed || 0,
        failedTransactions: statusCounts.failed || 0,
        rolledBackTransactions: statusCounts.rolled_back || 0,
        averageDuration: stats._avg.duration || 0,
        transactionsByType,
        transactionsByHour,
      };
    } catch (error) {
      console.error('Error getting transaction statistics:', error);
      return {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        rolledBackTransactions: 0,
        averageDuration: 0,
        transactionsByType: {},
        transactionsByHour: [],
      };
    }
  }

  /**
   * Persist log to Redis
   */
  private async persistLog(log: TransactionLog): Promise<void> {
    const key = `log:${log.transactionId}`;
    const ttl = 24 * 60 * 60; // 24 hours

    await this.redis.setex(key, ttl, JSON.stringify(log));
  }

  /**
   * Persist all active logs
   */
  private async persistActiveLogs(): Promise<void> {
    const promises = Array.from(this.activeLogs.values()).map(log => 
      this.persistLog(log)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Persist log to database
   */
  private async persistToDatabase(log: TransactionLog): Promise<void> {
    try {
      await prisma.transactionLog.create({
        data: {
          transactionId: log.transactionId,
          sagaId: log.sagaId,
          type: log.type,
          status: log.status,
          startTime: log.startTime,
          endTime: log.endTime,
          duration: log.duration,
          tenantId: log.context.tenantId,
          userId: log.context.userId,
          correlationId: log.context.correlationId,
          operation: log.context.operation,
          resource: log.context.resource,
          metadata: log.context.metadata,
          totalEvents: log.metrics.totalEvents,
          successfulSteps: log.metrics.successfulSteps,
          failedSteps: log.metrics.failedSteps,
          compensatedSteps: log.metrics.compensatedSteps,
          events: {
            create: log.events.map(event => ({
              id: event.id,
              eventType: event.eventType,
              timestamp: event.timestamp,
              duration: event.duration,
              stepId: event.stepId,
              payload: event.payload,
              metadata: event.metadata,
            })),
          },
          checkpoints: {
            create: log.checkpoints.map(checkpoint => ({
              id: checkpoint.id,
              timestamp: checkpoint.timestamp,
              stepId: checkpoint.stepId,
              state: checkpoint.state,
              hash: checkpoint.hash,
            })),
          },
        },
      });

      // Remove from Redis after successful database persistence
      await this.redis.del(`log:${log.transactionId}`);
    } catch (error) {
      console.error('Error persisting transaction log to database:', error);
      // Keep in Redis for retry
    }
  }

  /**
   * Calculate state hash for checkpoints
   */
  private calculateStateHash(state: any): string {
    const crypto = require('crypto');
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(state))
      .digest('hex');
  }

  /**
   * Transform database log to TransactionLog
   */
  private transformDbLogToLog(dbLog: any): TransactionLog {
    return {
      transactionId: dbLog.transactionId,
      sagaId: dbLog.sagaId,
      type: dbLog.type,
      status: dbLog.status,
      startTime: dbLog.startTime,
      endTime: dbLog.endTime,
      duration: dbLog.duration,
      events: dbLog.events || [],
      context: {
        tenantId: dbLog.tenantId,
        userId: dbLog.userId,
        correlationId: dbLog.correlationId,
        operation: dbLog.operation,
        resource: dbLog.resource,
        metadata: dbLog.metadata,
      },
      checkpoints: dbLog.checkpoints || [],
      metrics: {
        totalEvents: dbLog.totalEvents || 0,
        successfulSteps: dbLog.successfulSteps || 0,
        failedSteps: dbLog.failedSteps || 0,
        compensatedSteps: dbLog.compensatedSteps || 0,
      },
    };
  }

  /**
   * Cleanup old logs
   */
  async cleanup(olderThan: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - olderThan);
    
    try {
      const result = await prisma.transactionLog.deleteMany({
        where: {
          startTime: { lt: cutoff },
          status: { in: ['committed', 'failed', 'rolled_back'] },
        },
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning up transaction logs:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const transactionLogger = TransactionLogger.getInstance();