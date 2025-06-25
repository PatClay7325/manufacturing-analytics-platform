/**
 * Audit Logger Service
 * Comprehensive audit logging for compliance and security
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface AuditLogEntry {
  action: string;
  userId: string;
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  organizationId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface AuditSearchOptions {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  severity?: string;
  limit?: number;
  offset?: number;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private buffer: AuditLogEntry[];
  private bufferSize: number;
  private flushInterval: NodeJS.Timeout | null;

  constructor() {
    this.buffer = [];
    this.bufferSize = 100;
    this.flushInterval = null;
    
    // Start periodic flush
    this.startPeriodicFlush();
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    // Add timestamp and unique ID
    const fullEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      severity: entry.severity || this.determineSeverity(entry.action),
    };

    // Add to buffer
    this.buffer.push(fullEntry);

    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      await this.flush();
    }

    // For critical events, flush immediately
    if (fullEntry.severity === 'critical') {
      await this.flush();
    }
  }

  /**
   * Log a security event
   */
  async logSecurity({
    event,
    userId,
    success,
    reason,
    ipAddress,
    metadata,
  }: {
    event: string;
    userId?: string;
    success: boolean;
    reason?: string;
    ipAddress?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.log({
      action: `security.${event}`,
      userId: userId || 'anonymous',
      resourceType: 'security',
      severity: success ? 'medium' : 'high',
      metadata: {
        success,
        reason,
        ...metadata,
      },
      ipAddress,
    });
  }

  /**
   * Log a data access event
   */
  async logDataAccess({
    userId,
    operation,
    resourceType,
    resourceId,
    query,
    recordCount,
    duration,
    success,
  }: {
    userId: string;
    operation: 'read' | 'write' | 'delete' | 'export';
    resourceType: string;
    resourceId?: string;
    query?: any;
    recordCount?: number;
    duration?: number;
    success: boolean;
  }): Promise<void> {
    await this.log({
      action: `data.${operation}`,
      userId,
      resourceType,
      resourceId,
      severity: operation === 'delete' || operation === 'export' ? 'high' : 'low',
      metadata: {
        query,
        recordCount,
        duration,
        success,
      },
    });
  }

  /**
   * Log an administrative action
   */
  async logAdmin({
    userId,
    action,
    target,
    changes,
    reason,
  }: {
    userId: string;
    action: string;
    target: string;
    changes?: Record<string, any>;
    reason?: string;
  }): Promise<void> {
    await this.log({
      action: `admin.${action}`,
      userId,
      resourceType: 'admin',
      resourceId: target,
      changes,
      severity: 'high',
      metadata: { reason },
    });
  }

  /**
   * Search audit logs
   */
  async search(options: AuditSearchOptions): Promise<{
    logs: any[];
    total: number;
  }> {
    const where: any = {};

    if (options.userId) where.userId = options.userId;
    if (options.action) where.action = { contains: options.action };
    if (options.resourceType) where.resourceType = options.resourceType;
    if (options.resourceId) where.resourceId = options.resourceId;
    if (options.severity) where.severity = options.severity;

    if (options.startDate || options.endDate) {
      where.timestamp = {};
      if (options.startDate) where.timestamp.gte = options.startDate;
      if (options.endDate) where.timestamp.lte = options.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: options.limit || 100,
        skip: options.offset || 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Get user activity summary
   */
  async getUserActivity(
    userId: string,
    days: number = 30
  ): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    recentActions: any[];
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'desc' },
    });

    const actionsByType: Record<string, number> = {};
    logs.forEach(log => {
      const actionType = log.action.split('.')[0];
      actionsByType[actionType] = (actionsByType[actionType] || 0) + 1;
    });

    return {
      totalActions: logs.length,
      actionsByType,
      recentActions: logs.slice(0, 10),
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    summary: Record<string, any>;
    details: any[];
  }> {
    const logs = await prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const summary = {
      totalEvents: logs.length,
      uniqueUsers: new Set(logs.map(l => l.userId)).size,
      eventsByType: {} as Record<string, number>,
      eventsBySeverity: {} as Record<string, number>,
      securityEvents: logs.filter(l => l.action.startsWith('security')).length,
      dataAccessEvents: logs.filter(l => l.action.startsWith('data')).length,
      adminEvents: logs.filter(l => l.action.startsWith('admin')).length,
    };

    logs.forEach(log => {
      summary.eventsByType[log.action] = (summary.eventsByType[log.action] || 0) + 1;
      summary.eventsBySeverity[log.severity] = (summary.eventsBySeverity[log.severity] || 0) + 1;
    });

    return {
      summary,
      details: logs,
    };
  }

  /**
   * Flush buffer to database
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await prisma.auditLog.createMany({
        data: entries.map(entry => ({
          id: entry.id,
          timestamp: entry.timestamp,
          action: entry.action,
          userId: entry.userId,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          changes: entry.changes ? JSON.stringify(entry.changes) : null,
          metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          sessionId: entry.sessionId,
          organizationId: entry.organizationId,
          severity: entry.severity || 'low',
        })),
      });
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // Re-add to buffer to retry
      this.buffer.unshift(...entries);
    }
  }

  /**
   * Start periodic flush
   */
  private startPeriodicFlush(): void {
    this.flushInterval = setInterval(async () => {
      await this.flush();
    }, 5000); // Flush every 5 seconds
  }

  /**
   * Determine severity based on action
   */
  private determineSeverity(action: string): 'low' | 'medium' | 'high' | 'critical' {
    if (action.includes('delete') || action.includes('admin')) return 'high';
    if (action.includes('security') || action.includes('auth')) return 'high';
    if (action.includes('export') || action.includes('download')) return 'medium';
    if (action.includes('update') || action.includes('create')) return 'medium';
    return 'low';
  }

  /**
   * Cleanup old logs
   */
  async cleanup(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });

    await this.log({
      action: 'system.audit.cleanup',
      userId: 'system',
      resourceType: 'audit',
      metadata: {
        deletedCount: result.count,
        retentionDays,
      },
    });

    return result.count;
  }

  /**
   * Shutdown cleanup
   */
  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();