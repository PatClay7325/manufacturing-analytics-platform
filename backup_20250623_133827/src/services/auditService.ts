/**
 * Audit Logging Service
 * Provides comprehensive audit logging functionality for security, compliance, and monitoring
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import type { AuditLog, Prisma } from '@prisma/client';

// Types
export type AuditEventType = 
  | 'login' | 'logout' | 'login_failed' | 'password_reset' | 'password_change'
  | 'create' | 'read' | 'update' | 'delete' | 'query' | 'export' | 'import'
  | 'share' | 'unshare' | 'permission_grant' | 'permission_revoke'
  | 'api_key_create' | 'api_key_delete' | 'api_key_use'
  | 'system_config_change' | 'system_error' | 'system_warning';

export type AuditEventCategory = 
  | 'auth' | 'dashboard' | 'panel' | 'alert' | 'user' | 'team' 
  | 'datasource' | 'system' | 'api' | 'plugin' | 'annotation'
  | 'playlist' | 'folder' | 'organization' | 'preferences';

export type AuditEventStatus = 'success' | 'failure' | 'error' | 'warning';
export type AuditEventSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditContext {
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  sessionId?: string;
  apiKeyId?: string;
  requestId?: string;
  correlationId?: string;
  parentEventId?: string;
}

export interface RequestContext {
  method?: string;
  path?: string;
  query?: Record<string, any>;
  body?: Record<string, any>;
  headers?: Record<string, string>;
  ip?: string;
  userAgent?: string;
  origin?: string;
  referer?: string;
}

export interface ResourceContext {
  type?: string;
  id?: string;
  name?: string;
  previousValue?: any;
  newValue?: any;
}

export interface PerformanceContext {
  responseTime?: number;
  queryDuration?: number;
  totalDuration?: number;
}

export interface ErrorContext {
  code?: string;
  message?: string;
  stack?: string;
}

export interface AuditLogEntry {
  eventType: AuditEventType;
  eventCategory: AuditEventCategory;
  eventAction: string;
  eventStatus: AuditEventStatus;
  eventSeverity?: AuditEventSeverity;
  resource?: ResourceContext;
  request?: RequestContext;
  performance?: PerformanceContext;
  error?: ErrorContext;
  tags?: string[];
  metadata?: Record<string, any>;
  dataClassification?: string;
  complianceFlags?: string[];
  securityContext?: Record<string, any>;
}

class AuditService {
  private writeQueue: Prisma.AuditLogCreateInput[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private isEnabled: boolean;
  private batchSize: number;
  private flushIntervalMs: number;

  constructor() {
    this.isEnabled = process.env.ENABLE_AUDIT_LOGGING !== 'false';
    this.batchSize = parseInt(process.env.AUDIT_LOG_BATCH_SIZE || '50');
    this.flushIntervalMs = parseInt(process.env.AUDIT_LOG_FLUSH_INTERVAL || '5000');
    
    if (this.isEnabled) {
      this.startBatchWriter();
    }
  }

  /**
   * Log an audit event
   */
  async log(
    entry: AuditLogEntry,
    context: AuditContext = {}
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const auditLog: Prisma.AuditLogCreateInput = {
        // Event Information
        eventType: entry.eventType,
        eventCategory: entry.eventCategory,
        eventAction: entry.eventAction,
        eventStatus: entry.eventStatus,
        eventSeverity: entry.eventSeverity || 'info',
        
        // Resource Information
        resourceType: entry.resource?.type,
        resourceId: entry.resource?.id,
        resourceName: entry.resource?.name,
        previousValue: entry.resource?.previousValue,
        newValue: entry.resource?.newValue,
        
        // User and Session Information
        userId: context.userId,
        userName: context.userName,
        userEmail: context.userEmail,
        userRole: context.userRole,
        sessionId: context.sessionId,
        apiKeyId: context.apiKeyId,
        
        // Request Information
        requestId: context.requestId,
        requestMethod: entry.request?.method,
        requestPath: entry.request?.path,
        requestQuery: entry.request?.query,
        requestBody: this.sanitizeRequestBody(entry.request?.body),
        
        // Client Information
        ipAddress: entry.request?.ip,
        userAgent: entry.request?.userAgent,
        origin: entry.request?.origin,
        referer: entry.request?.referer,
        
        // Performance Metrics
        responseTime: entry.performance?.responseTime,
        queryDuration: entry.performance?.queryDuration,
        totalDuration: entry.performance?.totalDuration,
        
        // Error Information
        errorCode: entry.error?.code,
        errorMessage: entry.error?.message,
        errorStack: process.env.NODE_ENV === 'development' ? entry.error?.stack : undefined,
        
        // Additional Context
        tags: entry.tags || [],
        metadata: entry.metadata,
        correlationId: context.correlationId,
        parentEventId: context.parentEventId,
        
        // Compliance and Security
        dataClassification: entry.dataClassification,
        complianceFlags: entry.complianceFlags || [],
        securityContext: entry.securityContext,
        
        // Connect user relation if userId exists
        ...(context.userId && {
          user: {
            connect: { id: context.userId }
          }
        })
      };

      // Critical events are written immediately
      if (entry.eventSeverity === 'critical' || entry.eventStatus === 'error') {
        await this.writeImmediate(auditLog);
      } else {
        // Queue for batch writing
        this.writeQueue.push(auditLog);
        
        // Flush if queue is full
        if (this.writeQueue.length >= this.batchSize) {
          await this.flush();
        }
      }
    } catch (error) {
      logger.error('Failed to log audit event', error as Error, {
        eventType: entry.eventType,
        eventAction: entry.eventAction
      });
    }
  }

  /**
   * Log authentication events
   */
  async logAuth(
    action: 'login' | 'logout' | 'login_failed' | 'password_reset' | 'password_change',
    status: AuditEventStatus,
    context: AuditContext,
    request?: RequestContext,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType: action,
      eventCategory: 'auth',
      eventAction: `auth.${action}`,
      eventStatus: status,
      eventSeverity: status === 'failure' ? 'warning' : 'info',
      request,
      metadata,
      tags: ['authentication']
    }, context);
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    resource: ResourceContext,
    action: 'read' | 'query' | 'export',
    context: AuditContext,
    request?: RequestContext,
    performance?: PerformanceContext
  ): Promise<void> {
    await this.log({
      eventType: action,
      eventCategory: resource.type as AuditEventCategory || 'system',
      eventAction: `${resource.type}.${action}`,
      eventStatus: 'success',
      resource,
      request,
      performance,
      tags: ['data-access']
    }, context);
  }

  /**
   * Log data modification events
   */
  async logDataModification(
    resource: ResourceContext,
    action: 'create' | 'update' | 'delete',
    status: AuditEventStatus,
    context: AuditContext,
    request?: RequestContext,
    error?: ErrorContext
  ): Promise<void> {
    await this.log({
      eventType: action,
      eventCategory: resource.type as AuditEventCategory || 'system',
      eventAction: `${resource.type}.${action}`,
      eventStatus: status,
      eventSeverity: status === 'error' ? 'error' : 'info',
      resource,
      request,
      error,
      tags: ['data-modification']
    }, context);
  }

  /**
   * Log permission changes
   */
  async logPermissionChange(
    resource: ResourceContext,
    action: 'permission_grant' | 'permission_revoke',
    context: AuditContext,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      eventType: action,
      eventCategory: resource.type as AuditEventCategory || 'system',
      eventAction: `${resource.type}.${action}`,
      eventStatus: 'success',
      eventSeverity: 'warning',
      resource,
      metadata,
      tags: ['permission-change', 'security']
    }, context);
  }

  /**
   * Log system events
   */
  async logSystem(
    action: string,
    status: AuditEventStatus,
    severity: AuditEventSeverity,
    metadata?: Record<string, any>,
    error?: ErrorContext
  ): Promise<void> {
    await this.log({
      eventType: status === 'error' ? 'system_error' : 'system_warning',
      eventCategory: 'system',
      eventAction: `system.${action}`,
      eventStatus: status,
      eventSeverity: severity,
      metadata,
      error,
      tags: ['system']
    }, {});
  }

  /**
   * Search audit logs
   */
  async search(params: {
    eventTypes?: AuditEventType[];
    eventCategories?: AuditEventCategory[];
    eventStatuses?: AuditEventStatus[];
    eventSeverities?: AuditEventSeverity[];
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    ipAddress?: string;
    startDate?: Date;
    endDate?: Date;
    tags?: string[];
    searchTerm?: string;
    page?: number;
    pageSize?: number;
    sortBy?: keyof AuditLog;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    logs: AuditLog[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AuditLogWhereInput = {
      ...(params.eventTypes && { eventType: { in: params.eventTypes } }),
      ...(params.eventCategories && { eventCategory: { in: params.eventCategories } }),
      ...(params.eventStatuses && { eventStatus: { in: params.eventStatuses } }),
      ...(params.eventSeverities && { eventSeverity: { in: params.eventSeverities } }),
      ...(params.userId && { userId: params.userId }),
      ...(params.resourceType && { resourceType: params.resourceType }),
      ...(params.resourceId && { resourceId: params.resourceId }),
      ...(params.ipAddress && { ipAddress: params.ipAddress }),
      ...(params.startDate && { timestamp: { gte: params.startDate } }),
      ...(params.endDate && { timestamp: { lte: params.endDate } }),
      ...(params.tags && { tags: { hasSome: params.tags } }),
      ...(params.searchTerm && {
        OR: [
          { eventAction: { contains: params.searchTerm, mode: 'insensitive' } },
          { resourceName: { contains: params.searchTerm, mode: 'insensitive' } },
          { userName: { contains: params.searchTerm, mode: 'insensitive' } },
          { userEmail: { contains: params.searchTerm, mode: 'insensitive' } },
          { requestPath: { contains: params.searchTerm, mode: 'insensitive' } }
        ]
      })
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [params.sortBy || 'timestamp']: params.sortOrder || 'desc'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Get audit log by ID
   */
  async getById(id: string): Promise<AuditLog | null> {
    return prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
  }

  /**
   * Get audit analytics
   */
  async getAnalytics(params: {
    startDate: Date;
    endDate: Date;
    groupBy?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<{
    eventCounts: Record<string, number>;
    categoryBreakdown: Record<string, number>;
    statusBreakdown: Record<string, number>;
    severityBreakdown: Record<string, number>;
    topUsers: Array<{ userId: string; userName?: string; count: number }>;
    topResources: Array<{ resourceType: string; count: number }>;
    performanceMetrics: {
      avgResponseTime: number;
      avgQueryDuration: number;
      slowestOperations: Array<{ action: string; avgDuration: number }>;
    };
    errorRate: number;
    timeline: Array<{ period: string; count: number; errors: number }>;
  }> {
    // Implementation would aggregate data from the database
    // This is a simplified version
    const logs = await prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: params.startDate,
          lte: params.endDate
        }
      }
    });

    // Calculate analytics
    const analytics = {
      eventCounts: {} as Record<string, number>,
      categoryBreakdown: {} as Record<string, number>,
      statusBreakdown: {} as Record<string, number>,
      severityBreakdown: {} as Record<string, number>,
      topUsers: [] as Array<{ userId: string; userName?: string; count: number }>,
      topResources: [] as Array<{ resourceType: string; count: number }>,
      performanceMetrics: {
        avgResponseTime: 0,
        avgQueryDuration: 0,
        slowestOperations: [] as Array<{ action: string; avgDuration: number }>
      },
      errorRate: 0,
      timeline: [] as Array<{ period: string; count: number; errors: number }>
    };

    // Process logs for analytics
    logs.forEach(log => {
      // Event counts
      analytics.eventCounts[log.eventType] = (analytics.eventCounts[log.eventType] || 0) + 1;
      
      // Category breakdown
      analytics.categoryBreakdown[log.eventCategory] = (analytics.categoryBreakdown[log.eventCategory] || 0) + 1;
      
      // Status breakdown
      analytics.statusBreakdown[log.eventStatus] = (analytics.statusBreakdown[log.eventStatus] || 0) + 1;
      
      // Severity breakdown
      analytics.severityBreakdown[log.eventSeverity] = (analytics.severityBreakdown[log.eventSeverity] || 0) + 1;
    });

    // Calculate error rate
    const totalLogs = logs.length;
    const errorLogs = logs.filter(log => log.eventStatus === 'error').length;
    analytics.errorRate = totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;

    return analytics;
  }

  /**
   * Export audit logs
   */
  async export(params: {
    format: 'json' | 'csv';
    filters?: Parameters<typeof this.search>[0];
  }): Promise<{ data: string; filename: string; contentType: string }> {
    const { logs } = await this.search(params.filters || {});
    
    let data: string;
    let contentType: string;
    
    if (params.format === 'csv') {
      // Convert to CSV
      const headers = [
        'Timestamp', 'Event Type', 'Category', 'Action', 'Status', 'Severity',
        'User', 'Resource Type', 'Resource Name', 'IP Address', 'Response Time'
      ];
      
      const rows = logs.map(log => [
        log.timestamp.toISOString(),
        log.eventType,
        log.eventCategory,
        log.eventAction,
        log.eventStatus,
        log.eventSeverity,
        log.userName || log.userId || '',
        log.resourceType || '',
        log.resourceName || '',
        log.ipAddress || '',
        log.responseTime?.toString() || ''
      ]);
      
      data = [headers, ...rows].map(row => row.join(',')).join('\n');
      contentType = 'text/csv';
    } else {
      // Export as JSON
      data = JSON.stringify(logs, null, 2);
      contentType = 'application/json';
    }
    
    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${params.format}`;
    
    return { data, filename, contentType };
  }

  /**
   * Purge old audit logs
   */
  async purge(params: {
    olderThan: Date;
    dryRun?: boolean;
  }): Promise<{ count: number }> {
    if (params.dryRun) {
      const count = await prisma.auditLog.count({
        where: {
          timestamp: { lt: params.olderThan }
        }
      });
      return { count };
    }

    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: { lt: params.olderThan }
      }
    });

    await this.logSystem(
      'audit_log_purge',
      'success',
      'info',
      {
        deletedCount: result.count,
        olderThan: params.olderThan.toISOString()
      }
    );

    return { count: result.count };
  }

  // Private methods

  private sanitizeRequestBody(body?: Record<string, any>): Record<string, any> | undefined {
    if (!body) return undefined;
    
    const sensitiveFields = [
      'password', 'passwordHash', 'token', 'apiKey', 'secret',
      'authorization', 'cookie', 'creditCard', 'ssn'
    ];
    
    const sanitized = { ...body };
    
    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      Object.keys(obj).forEach(key => {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          obj[key] = sanitizeObject(obj[key]);
        }
      });
      
      return obj;
    };
    
    return sanitizeObject(sanitized);
  }

  private async writeImmediate(log: Prisma.AuditLogCreateInput): Promise<void> {
    try {
      await prisma.auditLog.create({ data: log });
    } catch (error) {
      logger.error('Failed to write audit log immediately', error as Error);
    }
  }

  private startBatchWriter(): void {
    this.flushInterval = setInterval(async () => {
      await this.flush();
    }, this.flushIntervalMs);
  }

  private async flush(): Promise<void> {
    if (this.writeQueue.length === 0) return;
    
    const batch = [...this.writeQueue];
    this.writeQueue = [];
    
    try {
      await prisma.auditLog.createMany({
        data: batch
      });
    } catch (error) {
      logger.error('Failed to write audit log batch', error as Error, {
        batchSize: batch.length
      });
      
      // Re-queue failed logs
      this.writeQueue.unshift(...batch);
    }
  }

  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }
}

// Export singleton instance
export const auditService = new AuditService();