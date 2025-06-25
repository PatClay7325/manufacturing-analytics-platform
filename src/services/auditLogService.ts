/**
 * Audit Log Service
 * Implements Phase 1.5: Security - Audit logging
 */

import { prisma } from '@/lib/database';
import { NextRequest } from 'next/server';

export enum AuditAction {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  PASSWORD_RESET = 'PASSWORD_RESET',
  
  // Dashboard actions
  DASHBOARD_VIEW = 'DASHBOARD_VIEW',
  DASHBOARD_CREATE = 'DASHBOARD_CREATE',
  DASHBOARD_UPDATE = 'DASHBOARD_UPDATE',
  DASHBOARD_DELETE = 'DASHBOARD_DELETE',
  DASHBOARD_EXPORT = 'DASHBOARD_EXPORT',
  
  // Data access
  DATA_QUERY = 'DATA_QUERY',
  DATA_EXPORT = 'DATA_EXPORT',
  METRICS_VIEW = 'METRICS_VIEW',
  ALERT_VIEW = 'ALERT_VIEW',
  
  // Filter changes
  FILTER_CHANGE = 'FILTER_CHANGE',
  TIME_RANGE_CHANGE = 'TIME_RANGE_CHANGE',
  EQUIPMENT_FILTER = 'EQUIPMENT_FILTER',
  
  // API access
  API_ACCESS = 'API_ACCESS',
  API_ERROR = 'API_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Admin actions
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  
  // Phase 2.2: Annotation system actions
  ANNOTATION_CREATE = 'ANNOTATION_CREATE',
  ANNOTATION_UPDATE = 'ANNOTATION_UPDATE',
  ANNOTATION_DELETE = 'ANNOTATION_DELETE',
  
  // Phase 2.2: Email and sharing actions
  EMAIL_SHARE = 'EMAIL_SHARE',
  EMAIL_NOTIFICATION = 'EMAIL_NOTIFICATION',
  SHARE_LINK_CREATE = 'SHARE_LINK_CREATE',
  SHARE_LINK_REVOKE = 'SHARE_LINK_REVOKE',
  SHARE_LINK_ACCESS = 'SHARE_LINK_ACCESS',
  
  // Phase 2.2: Compliance reporting
  COMPLIANCE_REPORT = 'COMPLIANCE_REPORT',
}

export interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export interface AuditLogFilter {
  userId?: string;
  action?: AuditAction;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  success?: boolean;
  limit?: number;
  offset?: number;
}

class AuditLogService {
  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          eventType: entry.action,
          eventCategory: 'api',
          eventAction: entry.action,
          eventStatus: entry.success ? 'success' : 'failure',
          eventSeverity: entry.success ? 'info' : 'warning',
          userId: entry.userId,
          resourceType: entry.resource,
          resourceId: entry.resourceId,
          metadata: entry.details || {},
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          errorMessage: entry.errorMessage,
        },
      });
    } catch (error) {
      // Log to console if database write fails
      console.error('Failed to write audit log:', error, entry);
    }
  }

  /**
   * Log from HTTP request context
   */
  async logRequest(
    request: NextRequest,
    action: AuditAction,
    options: {
      userId?: string;
      resource?: string;
      resourceId?: string;
      details?: Record<string, any>;
      success?: boolean;
      errorMessage?: string;
    } = {}
  ): Promise<void> {
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await this.log({
      action,
      ipAddress,
      userAgent,
      success: options.success !== false,
      ...options,
    });
  }

  /**
   * Query audit logs
   */
  async query(filter: AuditLogFilter = {}) {
    const where: any = {};

    if (filter.userId) where.userId = filter.userId;
    if (filter.action) where.action = filter.action;
    if (filter.resource) where.resource = filter.resource;
    if (filter.success !== undefined) where.success = filter.success;
    
    if (filter.startDate || filter.endDate) {
      where.timestamp = {};
      if (filter.startDate) where.timestamp.gte = filter.startDate;
      if (filter.endDate) where.timestamp.lte = filter.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filter.limit || 100,
        skip: filter.offset || 0,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  /**
   * Get audit summary statistics
   */
  async getStatistics(timeRange: { start: Date; end: Date }) {
    const stats = await prisma.auditLog.groupBy({
      by: ['action', 'success'],
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      _count: true,
    });

    const userActivity = await prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: 10,
    });

    const failedLogins = await prisma.auditLog.count({
      where: {
        action: AuditAction.LOGIN_FAILED,
        timestamp: {
          gte: timeRange.start,
          lte: timeRange.end,
        },
      },
    });

    return {
      actionBreakdown: stats,
      topUsers: userActivity,
      failedLogins,
      timeRange,
    };
  }

  /**
   * Clean up old audit logs (retention policy)
   */
  async cleanup(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    await this.log({
      action: AuditAction.API_ACCESS,
      resource: 'audit_logs',
      details: {
        operation: 'cleanup',
        retentionDays,
        deletedCount: result.count,
      },
      success: true,
    });

    return result.count;
  }

  /**
   * Export audit logs for compliance
   */
  async export(filter: AuditLogFilter = {}) {
    const { logs } = await this.query({ ...filter, limit: 10000 });

    // Format for CSV export
    const headers = [
      'Timestamp',
      'User ID',
      'User Email',
      'Action',
      'Resource',
      'Resource ID',
      'Success',
      'IP Address',
      'User Agent',
      'Error Message',
      'Details',
    ];

    const rows = logs.map(log => [
      log.timestamp.toISOString(),
      log.userId || '',
      log.user?.email || '',
      log.action,
      log.resource || '',
      log.resourceId || '',
      log.success ? 'Yes' : 'No',
      log.ipAddress || '',
      log.userAgent || '',
      log.errorMessage || '',
      JSON.stringify(log.details || {}),
    ]);

    // Log the export action
    await this.log({
      action: AuditAction.DATA_EXPORT,
      resource: 'audit_logs',
      details: {
        filter,
        rowCount: rows.length,
      },
      success: true,
    });

    return {
      headers,
      rows,
      csv: [headers, ...rows].map(row => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(',')).join('\n'),
    };
  }
}

// Export singleton instance
export const auditLogService = new AuditLogService();

// Middleware helper for common audit scenarios
export function auditMiddleware(action: AuditAction, getDetails?: (req: NextRequest) => Record<string, any>) {
  return async (request: NextRequest) => {
    const details = getDetails ? getDetails(request) : {};
    await auditLogService.logRequest(request, action, { details });
  };
}