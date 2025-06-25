/**
 * Metrics Endpoint for Monitoring
 * Implements Phase 1.5: Metrics endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { auditLogService } from '@/services/auditLogService';
import { getMetrics, manufacturingMetrics } from '@/lib/observability/metrics';
import { logger } from '@/lib/logger';

/**
 * GET /api/metrics
 * Prometheus metrics endpoint with manufacturing data
 */
export async function GET(req: NextRequest) {
  try {
    // Check if request is from internal monitoring
    const isInternal = req.headers.get('x-forwarded-for')?.includes('10.') || 
                      req.headers.get('x-real-ip')?.includes('10.') ||
                      req.ip?.includes('127.0.0.1') ||
                      req.headers.get('user-agent')?.includes('Prometheus');

    if (!isInternal && process.env.NODE_ENV === 'production') {
      // In production, only allow internal access to metrics
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Collect manufacturing metrics from database
    try {
      // Get latest performance metrics
      const performanceData = await prisma.performanceMetrics.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
          }
        },
        include: {
          workUnit: true
        },
        orderBy: {
          timestamp: 'desc'
        }
      });

      // Update Prometheus metrics
      performanceData.forEach(metric => {
        const labels = {
          equipment_id: metric.workUnitId,
          equipment_name: metric.workUnit.name,
          line_id: metric.workUnit.line || 'unknown',
          location: metric.workUnit.location || 'unknown'
        };

        manufacturingMetrics.oeeScore.set(labels, metric.oee || 0);
        manufacturingMetrics.availability.set(labels, metric.availability || 0);
        manufacturingMetrics.performance.set(labels, metric.performance || 0);
        manufacturingMetrics.quality.set(labels, metric.quality || 0);
      });

      // Get production metrics
      const productionData = await prisma.productionMetrics.aggregate({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
          }
        },
        _sum: {
          unitsProduced: true,
          unitsScrapped: true
        },
        _avg: {
          cycleTime: true
        }
      });

      // Get active alerts count
      const activeAlerts = await prisma.alerts.groupBy({
        by: ['severity', 'type'],
        where: {
          status: 'active'
        },
        _count: {
          id: true
        }
      });

      activeAlerts.forEach(alert => {
        manufacturingMetrics.alertsActive.set(
          { 
            severity: alert.severity, 
            equipment_id: 'all',
            type: alert.type 
          }, 
          alert._count.id
        );
      });

    } catch (dbError) {
      logger.error({ error: dbError }, 'Failed to collect manufacturing metrics from database');
    }

    // Get all metrics in Prometheus format
    const metrics = await getMetrics();

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to generate metrics');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}