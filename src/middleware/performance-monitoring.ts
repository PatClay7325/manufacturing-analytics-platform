import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/services/prisma-production.service';

interface PerformanceMetrics {
  path: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
  userAgent?: string;
  ip?: string;
}

/**
 * Performance Monitoring Middleware
 * Tracks API performance and stores metrics
 */
export class PerformanceMonitor {
  private static metricsBuffer: PerformanceMetrics[] = [];
  private static flushInterval: NodeJS.Timeout | null = null;
  
  /**
   * Initialize the performance monitor
   */
  static initialize() {
    // Flush metrics every 10 seconds
    this.flushInterval = setInterval(() => {
      this.flushMetrics().catch(console.error);
    }, 10000);
  }

  /**
   * Middleware function for Next.js
   */
  static middleware(request: NextRequest) {
    const start = Date.now();
    const { pathname, searchParams } = request.nextUrl;
    const method = request.method;

    // Skip static assets and Next.js internals
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/static') ||
      pathname.match(/\.(jpg|jpeg|png|gif|ico|css|js)$/)
    ) {
      return NextResponse.next();
    }

    // Clone the response to add performance headers
    const response = NextResponse.next();
    
    // Track the request
    const duration = Date.now() - start;
    
    // Add performance headers
    response.headers.set('X-Response-Time', `${duration}ms`);
    response.headers.set('X-Server-Timing', `total;dur=${duration}`);

    // Store metrics
    this.recordMetric({
      path: pathname,
      method,
      statusCode: 200, // Default, actual status comes from response
      duration,
      timestamp: new Date(),
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    });

    return response;
  }

  /**
   * Record a performance metric
   */
  private static recordMetric(metric: PerformanceMetrics) {
    this.metricsBuffer.push(metric);
    
    // Flush if buffer is getting large
    if (this.metricsBuffer.length >= 100) {
      this.flushMetrics().catch(console.error);
    }
  }

  /**
   * Flush metrics to database
   */
  private static async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Aggregate metrics by path and method
      const aggregated = metrics.reduce((acc, metric) => {
        const key = `${metric.method}:${metric.path}`;
        
        if (!acc[key]) {
          acc[key] = {
            path: metric.path,
            method: metric.method,
            count: 0,
            totalDuration: 0,
            minDuration: Infinity,
            maxDuration: 0,
            errors: 0,
          };
        }

        acc[key].count++;
        acc[key].totalDuration += metric.duration;
        acc[key].minDuration = Math.min(acc[key].minDuration, metric.duration);
        acc[key].maxDuration = Math.max(acc[key].maxDuration, metric.duration);
        
        if (metric.statusCode >= 400) {
          acc[key].errors++;
        }

        return acc;
      }, {} as Record<string, any>);

      // Store in monitoring schema
      const queries = Object.values(aggregated).map(agg => 
        prisma.$executeRaw`
          INSERT INTO monitoring.query_performance (
            query_hash,
            query_text,
            total_time,
            mean_time,
            max_time,
            min_time,
            calls,
            rows
          ) VALUES (
            md5(${agg.method + ':' + agg.path}),
            ${agg.method + ' ' + agg.path},
            ${agg.totalDuration},
            ${agg.totalDuration / agg.count},
            ${agg.maxDuration},
            ${agg.minDuration},
            ${agg.count},
            0
          )
        `
      );

      await Promise.all(queries);
    } catch (error) {
      console.error('[Performance Monitor] Failed to flush metrics:', error);
    }
  }

  /**
   * Get current performance stats
   */
  static async getStats(timeRange: { start: Date; end: Date }) {
    return prisma.$queryRaw`
      SELECT 
        query_text as endpoint,
        SUM(calls) as total_calls,
        AVG(mean_time)::numeric(10,2) as avg_response_time,
        MAX(max_time)::numeric(10,2) as max_response_time,
        MIN(min_time)::numeric(10,2) as min_response_time,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY mean_time)::numeric(10,2) as p95_response_time,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY mean_time)::numeric(10,2) as p99_response_time
      FROM monitoring.query_performance
      WHERE captured_at >= ${timeRange.start}
        AND captured_at <= ${timeRange.end}
        AND query_text LIKE '%/api/%'
      GROUP BY query_text
      ORDER BY total_calls DESC
      LIMIT 50
    `;
  }

  /**
   * Cleanup old metrics
   */
  static async cleanup(daysToKeep: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return prisma.$executeRaw`
      DELETE FROM monitoring.query_performance
      WHERE captured_at < ${cutoffDate}
    `;
  }
}

// Export middleware function for Next.js
export function performanceMiddleware(request: NextRequest) {
  return PerformanceMonitor.middleware(request);
}