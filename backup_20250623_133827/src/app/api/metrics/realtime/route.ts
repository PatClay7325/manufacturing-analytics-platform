import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema
const RealTimeMetricsRequestSchema = z.object({
  metrics: z.array(z.string()),
  equipmentIds: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).optional().default(10)
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const request = RealTimeMetricsRequestSchema.parse(body);

    // Get equipment IDs if not specified
    let equipmentIds = request.equipmentIds;
    if (!equipmentIds || equipmentIds.length === 0) {
      const equipment = await prisma.equipment.findMany({
        select: { id: true },
        where: { isActive: true },
        take: 10
      });
      equipmentIds = equipment.map(e => e.id);
    }

    const results: any[] = [];
    const now = new Date();

    // Fetch latest data for each metric type
    for (const metric of request.metrics) {
      if (metric.includes('oee') || metric.includes('availability') || metric.includes('performance')) {
        // Get latest production metrics
        const latestMetrics = await prisma.productionMetrics.findMany({
          where: {
            equipmentId: { in: equipmentIds },
            timestamp: {
              gte: new Date(now.getTime() - 5 * 60 * 1000) // Last 5 minutes
            }
          },
          orderBy: { timestamp: 'desc' },
          take: request.limit * equipmentIds.length,
          select: {
            timestamp: true,
            equipmentId: true,
            oeeScore: true,
            availability: true,
            performance: true,
            quality: true
          }
        });

        results.push(...latestMetrics.map(m => ({
          timestamp: m.timestamp.toISOString(),
          equipmentId: m.equipmentId,
          metric: metric,
          value: metric.includes('oee') ? (m.oeeScore * 100) :
                 metric.includes('availability') ? (m.availability * 100) :
                 metric.includes('performance') ? (m.performance * 100) :
                 (m.quality * 100),
          quality: 'good'
        })));
      } else if (metric.includes('temperature') || metric.includes('vibration')) {
        // Get latest telemetry data
        const latestTelemetry = await prisma.equipmentTelemetry.findMany({
          where: {
            equipmentId: { in: equipmentIds },
            timestamp: {
              gte: new Date(now.getTime() - 5 * 60 * 1000)
            }
          },
          orderBy: { timestamp: 'desc' },
          take: request.limit * equipmentIds.length,
          select: {
            timestamp: true,
            equipmentId: true,
            temperature: true,
            vibration: true,
            pressure: true
          }
        });

        results.push(...latestTelemetry.map(t => ({
          timestamp: t.timestamp.toISOString(),
          equipmentId: t.equipmentId,
          metric: metric,
          value: metric.includes('temperature') ? t.temperature :
                 metric.includes('vibration') ? t.vibration :
                 t.pressure,
          quality: 'good'
        })));
      } else if (metric.includes('production') || metric.includes('units')) {
        // Get latest production data
        const latestProduction = await prisma.productionMetrics.findMany({
          where: {
            equipmentId: { in: equipmentIds },
            timestamp: {
              gte: new Date(now.getTime() - 5 * 60 * 1000)
            }
          },
          orderBy: { timestamp: 'desc' },
          take: request.limit,
          select: {
            timestamp: true,
            equipmentId: true,
            totalUnits: true,
            goodUnits: true,
            rejectedUnits: true
          }
        });

        results.push(...latestProduction.map(p => ({
          timestamp: p.timestamp.toISOString(),
          equipmentId: p.equipmentId,
          metric: metric,
          value: metric.includes('total') ? p.totalUnits :
                 metric.includes('good') ? p.goodUnits :
                 p.rejectedUnits,
          quality: 'good'
        })));
      }
    }

    // Sort by timestamp
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(results.slice(0, request.limit * request.metrics.length));
  } catch (error) {
    console.error('Real-time metrics API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch real-time metrics' },
      { status: 500 }
    );
  }
}

// GET endpoint for simple polling
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const metric = searchParams.get('metric');
    const equipmentId = searchParams.get('equipmentId');
    
    if (!metric) {
      return NextResponse.json(
        { error: 'Metric parameter is required' },
        { status: 400 }
      );
    }

    const equipmentIds = equipmentId ? [equipmentId] : undefined;
    
    // Reuse POST logic
    const mockReq = {
      json: async () => ({
        metrics: [metric],
        equipmentIds,
        limit: 10
      })
    } as NextRequest;

    return POST(mockReq);
  } catch (error) {
    console.error('Real-time metrics GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch real-time metrics' },
      { status: 500 }
    );
  }
}