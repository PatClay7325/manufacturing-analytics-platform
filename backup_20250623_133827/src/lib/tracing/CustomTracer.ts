/**
 * Custom Distributed Tracing Service
 * Replacement for Jaeger - stores traces in PostgreSQL
 */

import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  tags: Record<string, any>;
  logs: SpanLog[];
  status: 'in_progress' | 'completed' | 'error';
  errorMessage?: string;
}

export interface SpanLog {
  timestamp: Date;
  message: string;
  level: 'info' | 'warn' | 'error';
  fields?: Record<string, any>;
}

export interface TraceQuery {
  service?: string;
  operation?: string;
  minDuration?: number;
  maxDuration?: number;
  startTime?: Date;
  endTime?: Date;
  tags?: Record<string, any>;
  status?: string;
  limit?: number;
}

export class CustomTracer {
  private static instance: CustomTracer;
  private activeSpans: Map<string, Span> = new Map();
  private batchSize = 50;
  private flushInterval = 10000; // 10 seconds
  private completedSpans: Span[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startAutoFlush();
  }

  static getInstance(): CustomTracer {
    if (!CustomTracer.instance) {
      CustomTracer.instance = new CustomTracer();
    }
    return CustomTracer.instance;
  }

  /**
   * Start a new trace
   */
  startTrace(operationName: string, serviceName: string, tags?: Record<string, any>): string {
    const traceId = randomUUID();
    const spanId = randomUUID();

    const span: Span = {
      traceId,
      spanId,
      operationName,
      serviceName,
      startTime: new Date(),
      tags: tags || {},
      logs: [],
      status: 'in_progress',
    };

    this.activeSpans.set(spanId, span);
    return traceId;
  }

  /**
   * Start a new span within an existing trace
   */
  startSpan(
    traceId: string,
    operationName: string,
    serviceName: string,
    parentSpanId?: string,
    tags?: Record<string, any>
  ): string {
    const spanId = randomUUID();

    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      serviceName,
      startTime: new Date(),
      tags: tags || {},
      logs: [],
      status: 'in_progress',
    };

    this.activeSpans.set(spanId, span);
    return spanId;
  }

  /**
   * Add a log to a span
   */
  addLog(spanId: string, message: string, level: 'info' | 'warn' | 'error' = 'info', fields?: Record<string, any>): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.logs.push({
        timestamp: new Date(),
        message,
        level,
        fields,
      });
    }
  }

  /**
   * Add tags to a span
   */
  addTags(spanId: string, tags: Record<string, any>): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.tags = { ...span.tags, ...tags };
    }
  }

  /**
   * Complete a span
   */
  finishSpan(spanId: string, status: 'completed' | 'error' = 'completed', errorMessage?: string): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.endTime = new Date();
      span.duration = span.endTime.getTime() - span.startTime.getTime();
      span.status = status;
      if (errorMessage) {
        span.errorMessage = errorMessage;
      }

      this.activeSpans.delete(spanId);
      this.completedSpans.push(span);

      // Flush if buffer is full
      if (this.completedSpans.length >= this.batchSize) {
        this.flush().catch((error) => {
          logger.error('Failed to flush spans:', error);
        });
      }
    }
  }

  /**
   * Query traces from the database
   */
  async queryTraces(query: TraceQuery): Promise<any[]> {
    try {
      const where: any = {};

      if (query.service) {
        where.serviceName = query.service;
      }

      if (query.operation) {
        where.operationName = query.operation;
      }

      if (query.status) {
        where.status = query.status;
      }

      if (query.minDuration !== undefined || query.maxDuration !== undefined) {
        where.duration = {};
        if (query.minDuration !== undefined) {
          where.duration.gte = query.minDuration;
        }
        if (query.maxDuration !== undefined) {
          where.duration.lte = query.maxDuration;
        }
      }

      if (query.startTime || query.endTime) {
        where.startTime = {};
        if (query.startTime) {
          where.startTime.gte = query.startTime;
        }
        if (query.endTime) {
          where.startTime.lte = query.endTime;
        }
      }

      // Query for root spans (no parentSpanId) to get complete traces
      const rootSpans = await prisma.trace.findMany({
        where: {
          ...where,
          parentSpanId: null,
        },
        orderBy: { startTime: 'desc' },
        take: query.limit || 100,
      });

      // Get all spans for each trace
      const traceIds = rootSpans.map((span) => span.traceId);
      const allSpans = await prisma.trace.findMany({
        where: {
          traceId: { in: traceIds },
        },
        orderBy: { startTime: 'asc' },
      });

      // Group spans by traceId
      const traces = traceIds.map((traceId) => {
        const spans = allSpans.filter((span) => span.traceId === traceId);
        return {
          traceId,
          spans,
          rootSpan: spans.find((s) => !s.parentSpanId),
          duration: Math.max(...spans.map((s) => s.duration || 0)),
          spanCount: spans.length,
          services: [...new Set(spans.map((s) => s.serviceName))],
          status: spans.some((s) => s.status === 'error') ? 'error' : 'completed',
        };
      });

      return traces;
    } catch (error) {
      logger.error('Failed to query traces:', error);
      throw error;
    }
  }

  /**
   * Get trace by ID
   */
  async getTrace(traceId: string): Promise<any> {
    try {
      const spans = await prisma.trace.findMany({
        where: { traceId },
        orderBy: { startTime: 'asc' },
      });

      if (spans.length === 0) {
        return null;
      }

      return {
        traceId,
        spans,
        rootSpan: spans.find((s) => !s.parentSpanId),
        duration: Math.max(...spans.map((s) => s.duration || 0)),
        spanCount: spans.length,
        services: [...new Set(spans.map((s) => s.serviceName))],
        status: spans.some((s) => s.status === 'error') ? 'error' : 'completed',
      };
    } catch (error) {
      logger.error('Failed to get trace:', error);
      throw error;
    }
  }

  /**
   * Get service dependencies
   */
  async getServiceDependencies(
    startTime?: Date,
    endTime?: Date
  ): Promise<{ source: string; target: string; callCount: number }[]> {
    try {
      const where: any = {};
      
      if (startTime || endTime) {
        where.startTime = {};
        if (startTime) {
          where.startTime.gte = startTime;
        }
        if (endTime) {
          where.startTime.lte = endTime;
        }
      }

      // Get all spans with parent spans
      const spansWithParents = await prisma.trace.findMany({
        where: {
          ...where,
          parentSpanId: { not: null },
        },
        include: {
          parent: true,
        },
      });

      // Calculate dependencies
      const dependencies = new Map<string, number>();
      
      spansWithParents.forEach((span) => {
        if (span.parent && span.serviceName !== span.parent.serviceName) {
          const key = `${span.parent.serviceName}->${span.serviceName}`;
          dependencies.set(key, (dependencies.get(key) || 0) + 1);
        }
      });

      return Array.from(dependencies.entries()).map(([key, callCount]) => {
        const [source, target] = key.split('->');
        return { source, target, callCount };
      });
    } catch (error) {
      logger.error('Failed to get service dependencies:', error);
      throw error;
    }
  }

  /**
   * Flush completed spans to database
   */
  private async flush(): Promise<void> {
    if (this.completedSpans.length === 0) {
      return;
    }

    const spansToFlush = [...this.completedSpans];
    this.completedSpans = [];

    try {
      await prisma.trace.createMany({
        data: spansToFlush.map((span) => ({
          traceId: span.traceId,
          spanId: span.spanId,
          parentSpanId: span.parentSpanId,
          operationName: span.operationName,
          serviceName: span.serviceName,
          startTime: span.startTime,
          endTime: span.endTime,
          duration: span.duration,
          tags: span.tags,
          logs: span.logs,
          status: span.status,
          errorMessage: span.errorMessage,
        })),
        skipDuplicates: true,
      });
    } catch (error) {
      logger.error('Failed to flush spans to database:', error);
      // Re-add spans to buffer on failure
      this.completedSpans.unshift(...spansToFlush);
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
   * Stop the service and flush remaining spans
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Mark all active spans as completed with error
    this.activeSpans.forEach((span, spanId) => {
      this.finishSpan(spanId, 'error', 'Service stopped');
    });

    await this.flush();
  }
}

// Export singleton instance
export const tracer = CustomTracer.getInstance();