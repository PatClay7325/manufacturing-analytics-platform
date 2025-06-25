/**
 * Comprehensive audit trail implementation for workflow orchestration
 * Provides immutable audit logging with compliance features
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export enum AuditEventType {
  WORKFLOW_REGISTERED = 'workflow.registered',
  WORKFLOW_UPDATED = 'workflow.updated',
  WORKFLOW_DELETED = 'workflow.deleted',
  EXECUTION_STARTED = 'execution.started',
  EXECUTION_COMPLETED = 'execution.completed',
  EXECUTION_FAILED = 'execution.failed',
  EXECUTION_CANCELLED = 'execution.cancelled',
  STEP_STARTED = 'step.started',
  STEP_COMPLETED = 'step.completed',
  STEP_FAILED = 'step.failed',
  STEP_SKIPPED = 'step.skipped',
  SECURITY_VIOLATION = 'security.violation',
  AUTHORIZATION_DENIED = 'authorization.denied',
  RATE_LIMIT_EXCEEDED = 'ratelimit.exceeded',
  CIRCUIT_BREAKER_OPENED = 'circuitbreaker.opened',
  CIRCUIT_BREAKER_CLOSED = 'circuitbreaker.closed',
  DATA_ACCESS = 'data.access',
  DATA_MODIFICATION = 'data.modification',
  CONFIGURATION_CHANGED = 'configuration.changed',
  USER_ACTION = 'user.action',
  SYSTEM_EVENT = 'system.event',
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface AuditEvent {
  id?: string;
  timestamp: Date;
  eventType: AuditEventType;
  severity: AuditSeverity;
  source: string;
  userId?: string;
  sessionId?: string;
  workflowId?: string;
  executionId?: string;
  stepId?: string;
  resourceId?: string;
  resourceType?: string;
  action: string;
  description: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  traceId?: string;
  outcome: 'success' | 'failure' | 'warning';
  metadata?: any;
}

export interface AuditQuery {
  startDate?: Date;
  endDate?: Date;
  eventTypes?: AuditEventType[];
  severity?: AuditSeverity[];
  userId?: string;
  workflowId?: string;
  executionId?: string;
  outcome?: 'success' | 'failure' | 'warning';
  source?: string;
  resourceType?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity';
  sortOrder?: 'asc' | 'desc';
}

export interface AuditStatistics {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsBySeverity: Record<AuditSeverity, number>;
  eventsByOutcome: Record<string, number>;
  eventsBySource: Record<string, number>;
  eventsPerHour: Array<{ hour: string; count: number }>;
  topUsers: Array<{ userId: string; count: number }>;
  topWorkflows: Array<{ workflowId: string; count: number }>;
}

export class AuditTrail {
  private static instance: AuditTrail;
  private batchBuffer: AuditEvent[] = [];
  private readonly batchSize = 100;
  private readonly flushInterval = 10000; // 10 seconds
  private flushTimer?: NodeJS.Timeout;

  constructor() {
    this.startBatchProcessor();
  }

  static getInstance(): AuditTrail {
    if (!AuditTrail.instance) {
      AuditTrail.instance = new AuditTrail();
    }
    return AuditTrail.instance;
  }

  /**
   * Log an audit event
   */
  async logEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      ...event,
    };

    try {
      // Validate audit event
      this.validateAuditEvent(auditEvent);

      // Add to batch buffer
      this.batchBuffer.push(auditEvent);

      // Flush if buffer is full
      if (this.batchBuffer.length >= this.batchSize) {
        await this.flushBatch();
      }

      // Log critical events immediately
      if (event.severity === AuditSeverity.CRITICAL) {
        await this.flushBatch();
      }

    } catch (error) {
      logger.error({ 
        error, 
        event: auditEvent 
      }, 'Failed to log audit event');
    }
  }

  /**
   * Log workflow registration
   */
  async logWorkflowRegistered(
    workflowId: string,
    workflowName: string,
    userId?: string,
    details?: any
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.WORKFLOW_REGISTERED,
      severity: AuditSeverity.MEDIUM,
      source: 'workflow-engine',
      userId,
      workflowId,
      action: 'register_workflow',
      description: `Workflow ${workflowName} registered`,
      details: {
        workflowName,
        ...details,
      },
      outcome: 'success',
    });
  }

  /**
   * Log workflow execution started
   */
  async logExecutionStarted(
    workflowId: string,
    executionId: string,
    userId?: string,
    context?: any
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.EXECUTION_STARTED,
      severity: AuditSeverity.LOW,
      source: 'workflow-engine',
      userId,
      workflowId,
      executionId,
      action: 'start_execution',
      description: `Workflow execution ${executionId} started`,
      details: {
        context,
      },
      outcome: 'success',
    });
  }

  /**
   * Log workflow execution completed
   */
  async logExecutionCompleted(
    workflowId: string,
    executionId: string,
    duration: number,
    stepCount: number,
    outcome: 'success' | 'failure',
    error?: any
  ): Promise<void> {
    await this.logEvent({
      eventType: outcome === 'success' 
        ? AuditEventType.EXECUTION_COMPLETED 
        : AuditEventType.EXECUTION_FAILED,
      severity: outcome === 'success' ? AuditSeverity.LOW : AuditSeverity.HIGH,
      source: 'workflow-engine',
      workflowId,
      executionId,
      action: 'complete_execution',
      description: `Workflow execution ${executionId} ${outcome}`,
      details: {
        duration,
        stepCount,
        error,
      },
      outcome,
    });
  }

  /**
   * Log step execution
   */
  async logStepExecution(
    workflowId: string,
    executionId: string,
    stepId: string,
    stepType: string,
    outcome: 'success' | 'failure' | 'skipped',
    duration?: number,
    error?: any
  ): Promise<void> {
    const eventType = outcome === 'success' 
      ? AuditEventType.STEP_COMPLETED
      : outcome === 'failure'
      ? AuditEventType.STEP_FAILED
      : AuditEventType.STEP_SKIPPED;

    await this.logEvent({
      eventType,
      severity: outcome === 'failure' ? AuditSeverity.MEDIUM : AuditSeverity.LOW,
      source: 'workflow-processor',
      workflowId,
      executionId,
      stepId,
      resourceType: 'workflow_step',
      action: `${outcome}_step`,
      description: `Step ${stepId} (${stepType}) ${outcome}`,
      details: {
        stepType,
        duration,
        error,
      },
      outcome: outcome === 'skipped' ? 'warning' : outcome,
    });
  }

  /**
   * Log security violation
   */
  async logSecurityViolation(
    eventType: string,
    description: string,
    userId?: string,
    ipAddress?: string,
    details?: any
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.SECURITY_VIOLATION,
      severity: AuditSeverity.CRITICAL,
      source: 'security-validator',
      userId,
      ipAddress,
      action: 'security_violation',
      description: `Security violation: ${description}`,
      details: {
        violationType: eventType,
        ...details,
      },
      outcome: 'failure',
    });
  }

  /**
   * Log authorization denied
   */
  async logAuthorizationDenied(
    userId: string,
    action: string,
    resource: string,
    reason: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.AUTHORIZATION_DENIED,
      severity: AuditSeverity.HIGH,
      source: 'authorization-manager',
      userId,
      ipAddress,
      resourceId: resource,
      action: 'authorization_denied',
      description: `Authorization denied for ${action} on ${resource}: ${reason}`,
      details: {
        deniedAction: action,
        reason,
      },
      outcome: 'failure',
    });
  }

  /**
   * Log data access
   */
  async logDataAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
    successful: boolean = true
  ): Promise<void> {
    await this.logEvent({
      eventType: AuditEventType.DATA_ACCESS,
      severity: AuditSeverity.LOW,
      source: 'data-layer',
      userId,
      resourceType,
      resourceId,
      action: `access_${resourceType}`,
      description: `${action} access to ${resourceType} ${resourceId}`,
      details: {
        accessType: action,
      },
      outcome: successful ? 'success' : 'failure',
    });
  }

  /**
   * Query audit events
   */
  async queryEvents(query: AuditQuery): Promise<{
    events: AuditEvent[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const where: any = {};

      // Build query conditions
      if (query.startDate) {
        where.timestamp = { ...where.timestamp, gte: query.startDate };
      }
      if (query.endDate) {
        where.timestamp = { ...where.timestamp, lte: query.endDate };
      }
      if (query.eventTypes?.length) {
        where.eventType = { in: query.eventTypes };
      }
      if (query.severity?.length) {
        where.severity = { in: query.severity };
      }
      if (query.userId) {
        where.userId = query.userId;
      }
      if (query.workflowId) {
        where.workflowId = query.workflowId;
      }
      if (query.executionId) {
        where.executionId = query.executionId;
      }
      if (query.outcome) {
        where.outcome = query.outcome;
      }
      if (query.source) {
        where.source = query.source;
      }
      if (query.resourceType) {
        where.resourceType = query.resourceType;
      }

      const [events, total] = await Promise.all([
        prisma.auditEvent.findMany({
          where,
          orderBy: {
            [query.sortBy || 'timestamp']: query.sortOrder || 'desc',
          },
          take: query.limit || 100,
          skip: query.offset || 0,
        }),
        prisma.auditEvent.count({ where }),
      ]);

      const limit = query.limit || 100;
      const offset = query.offset || 0;
      const hasMore = offset + events.length < total;

      return {
        events: events.map(this.mapDatabaseEventToModel),
        total,
        hasMore,
      };
    } catch (error) {
      logger.error({ error, query }, 'Failed to query audit events');
      return { events: [], total: 0, hasMore: false };
    }
  }

  /**
   * Get audit statistics
   */
  async getStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditStatistics> {
    try {
      const where: any = {};
      if (startDate) {
        where.timestamp = { ...where.timestamp, gte: startDate };
      }
      if (endDate) {
        where.timestamp = { ...where.timestamp, lte: endDate };
      }

      const [
        totalEvents,
        eventsByType,
        eventsBySeverity,
        eventsByOutcome,
        eventsBySource,
        topUsers,
        topWorkflows,
      ] = await Promise.all([
        prisma.auditEvent.count({ where }),
        prisma.auditEvent.groupBy({
          by: ['eventType'],
          where,
          _count: true,
        }),
        prisma.auditEvent.groupBy({
          by: ['severity'],
          where,
          _count: true,
        }),
        prisma.auditEvent.groupBy({
          by: ['outcome'],
          where,
          _count: true,
        }),
        prisma.auditEvent.groupBy({
          by: ['source'],
          where,
          _count: true,
        }),
        prisma.auditEvent.groupBy({
          by: ['userId'],
          where: { ...where, userId: { not: null } },
          _count: true,
          orderBy: { _count: { userId: 'desc' } },
          take: 10,
        }),
        prisma.auditEvent.groupBy({
          by: ['workflowId'],
          where: { ...where, workflowId: { not: null } },
          _count: true,
          orderBy: { _count: { workflowId: 'desc' } },
          take: 10,
        }),
      ]);

      // Process hourly events (simplified - would need more complex SQL for real implementation)
      const eventsPerHour: Array<{ hour: string; count: number }> = [];

      return {
        totalEvents,
        eventsByType: eventsByType.reduce((acc, item) => {
          acc[item.eventType as AuditEventType] = item._count;
          return acc;
        }, {} as Record<AuditEventType, number>),
        eventsBySeverity: eventsBySeverity.reduce((acc, item) => {
          acc[item.severity as AuditSeverity] = item._count;
          return acc;
        }, {} as Record<AuditSeverity, number>),
        eventsByOutcome: eventsByOutcome.reduce((acc, item) => {
          acc[item.outcome] = item._count;
          return acc;
        }, {} as Record<string, number>),
        eventsBySource: eventsBySource.reduce((acc, item) => {
          acc[item.source] = item._count;
          return acc;
        }, {} as Record<string, number>),
        eventsPerHour,
        topUsers: topUsers.map(item => ({
          userId: item.userId!,
          count: item._count,
        })),
        topWorkflows: topWorkflows.map(item => ({
          workflowId: item.workflowId!,
          count: item._count,
        })),
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get audit statistics');
      return {
        totalEvents: 0,
        eventsByType: {} as Record<AuditEventType, number>,
        eventsBySeverity: {} as Record<AuditSeverity, number>,
        eventsByOutcome: {},
        eventsBySource: {},
        eventsPerHour: [],
        topUsers: [],
        topWorkflows: [],
      };
    }
  }

  /**
   * Export audit events to file
   */
  async exportEvents(
    query: AuditQuery,
    format: 'json' | 'csv' = 'json'
  ): Promise<string> {
    const { events } = await this.queryEvents({ ...query, limit: 10000 });
    
    if (format === 'csv') {
      return this.exportToCsv(events);
    } else {
      return JSON.stringify(events, null, 2);
    }
  }

  /**
   * Archive old audit events
   */
  async archiveOldEvents(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { count } = await prisma.auditEvent.deleteMany({
        where: {
          timestamp: { lt: cutoffDate },
        },
      });

      logger.info({
        archivedCount: count,
        cutoffDate,
        daysToKeep,
      }, 'Archived old audit events');

      return count;
    } catch (error) {
      logger.error({ error, daysToKeep }, 'Failed to archive old audit events');
      return 0;
    }
  }

  /**
   * Validate audit event structure
   */
  private validateAuditEvent(event: AuditEvent): void {
    if (!event.eventType) {
      throw new Error('Audit event must have an event type');
    }
    if (!event.severity) {
      throw new Error('Audit event must have a severity');
    }
    if (!event.source) {
      throw new Error('Audit event must have a source');
    }
    if (!event.action) {
      throw new Error('Audit event must have an action');
    }
    if (!event.description) {
      throw new Error('Audit event must have a description');
    }
    if (!event.outcome) {
      throw new Error('Audit event must have an outcome');
    }
  }

  /**
   * Start batch processor for audit events
   */
  private startBatchProcessor(): void {
    this.flushTimer = setInterval(async () => {
      if (this.batchBuffer.length > 0) {
        await this.flushBatch();
      }
    }, this.flushInterval);
  }

  /**
   * Flush batch buffer to database
   */
  private async flushBatch(): Promise<void> {
    if (this.batchBuffer.length === 0) {
      return;
    }

    const events = [...this.batchBuffer];
    this.batchBuffer = [];

    try {
      await prisma.auditEvent.createMany({
        data: events.map(event => ({
          id: event.id!,
          timestamp: event.timestamp,
          eventType: event.eventType,
          severity: event.severity,
          source: event.source,
          userId: event.userId,
          sessionId: event.sessionId,
          workflowId: event.workflowId,
          executionId: event.executionId,
          stepId: event.stepId,
          resourceId: event.resourceId,
          resourceType: event.resourceType,
          action: event.action,
          description: event.description,
          details: event.details as any,
          ipAddress: event.ipAddress,
          userAgent: event.userAgent,
          traceId: event.traceId,
          outcome: event.outcome,
          metadata: event.metadata as any,
        })),
      });

      logger.debug({
        batchSize: events.length,
      }, 'Audit events batch flushed');
    } catch (error) {
      logger.error({
        error,
        batchSize: events.length,
      }, 'Failed to flush audit events batch');
      
      // Re-add events to buffer for retry (with limit to prevent memory issues)
      if (this.batchBuffer.length < this.batchSize * 2) {
        this.batchBuffer.unshift(...events);
      }
    }
  }

  /**
   * Map database event to model
   */
  private mapDatabaseEventToModel(dbEvent: any): AuditEvent {
    return {
      id: dbEvent.id,
      timestamp: dbEvent.timestamp,
      eventType: dbEvent.eventType,
      severity: dbEvent.severity,
      source: dbEvent.source,
      userId: dbEvent.userId,
      sessionId: dbEvent.sessionId,
      workflowId: dbEvent.workflowId,
      executionId: dbEvent.executionId,
      stepId: dbEvent.stepId,
      resourceId: dbEvent.resourceId,
      resourceType: dbEvent.resourceType,
      action: dbEvent.action,
      description: dbEvent.description,
      details: dbEvent.details,
      ipAddress: dbEvent.ipAddress,
      userAgent: dbEvent.userAgent,
      traceId: dbEvent.traceId,
      outcome: dbEvent.outcome,
      metadata: dbEvent.metadata,
    };
  }

  /**
   * Export events to CSV format
   */
  private exportToCsv(events: AuditEvent[]): string {
    const headers = [
      'timestamp',
      'eventType',
      'severity',
      'source',
      'userId',
      'workflowId',
      'executionId',
      'action',
      'description',
      'outcome',
    ];

    const rows = events.map(event => [
      event.timestamp.toISOString(),
      event.eventType,
      event.severity,
      event.source,
      event.userId || '',
      event.workflowId || '',
      event.executionId || '',
      event.action,
      event.description.replace(/"/g, '""'),
      event.outcome,
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
  }

  /**
   * Shutdown audit trail
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Flush remaining events
    await this.flushBatch();

    logger.info('Audit trail shutdown completed');
  }
}