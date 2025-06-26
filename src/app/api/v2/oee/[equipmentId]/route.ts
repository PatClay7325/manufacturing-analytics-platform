import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { oeeRepository } from '@/repositories/oee.repository';
import { equipmentRepository } from '@/repositories/equipment.repository';

// Request validation schema
const querySchema = z.object({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  granularity: z.enum(['hour', 'day', 'week', 'month']).optional().default('day'),
});

/**
 * Production-Ready OEE API Endpoint
 * GET /api/v2/oee/[equipmentId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { equipmentId: string } }
) {
  const startTime = Date.now();
  
  try {
    // Validate equipment ID
    const equipmentId = parseInt(params.equipmentId);
    if (isNaN(equipmentId)) {
      return NextResponse.json(
        { error: 'Invalid equipment ID' },
        { status: 400 }
      );
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryResult = querySchema.safeParse({
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
      granularity: searchParams.get('granularity'),
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters',
          details: queryResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { startDate, endDate, granularity } = queryResult.data;

    // Validate date range
    if (endDate < startDate) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    const daysDifference = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDifference > 365) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 365 days' },
        { status: 400 }
      );
    }

    // Verify equipment exists and user has access
    const equipment = await equipmentRepository.findActive({
      limit: 1,
    }).then(results => results.find(e => e.equipmentId === equipmentId));

    if (!equipment) {
      return NextResponse.json(
        { error: 'Equipment not found or inactive' },
        { status: 404 }
      );
    }

    // Get OEE data in parallel
    const [currentOEE, trend] = await Promise.all([
      oeeRepository.calculateOEE(equipmentId, startDate, endDate),
      oeeRepository.getOEETrend(equipmentId, startDate, endDate, granularity),
    ]);

    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Return structured response
    return NextResponse.json({
      meta: {
        equipmentId,
        equipmentCode: equipment.equipmentCode,
        equipmentName: equipment.equipmentName,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        granularity,
        responseTime,
      },
      summary: {
        oee: currentOEE.oee,
        availability: currentOEE.availability,
        performance: currentOEE.performance,
        quality: currentOEE.quality,
        totalProductionTime: currentOEE.totalTime,
        actualRunTime: currentOEE.runTime,
        totalDowntime: currentOEE.downTime,
        goodParts: currentOEE.goodParts,
        totalParts: currentOEE.totalParts,
      },
      trend: trend.map(point => ({
        timestamp: point.time_bucket,
        oee: point.oee,
        availability: point.availability,
        performance: point.performance,
        quality: point.quality,
        productionRuns: point.production_count,
      })),
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'private, max-age=60',
        'X-Response-Time': `${responseTime}ms`,
      },
    });
  } catch (error) {
    console.error('[OEE API Error]', error);
    
    // Don't expose internal errors to client
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' 
          ? (error as Error).message 
          : 'An error occurred processing your request',
      },
      { status: 500 }
    );
  }
}

/**
 * Store OEE calculation results
 * POST /api/v2/oee/[equipmentId]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { equipmentId: string } }
) {
  try {
    const equipmentId = parseInt(params.equipmentId);
    if (isNaN(equipmentId)) {
      return NextResponse.json(
        { error: 'Invalid equipment ID' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate metrics
    const metricsSchema = z.object({
      startDate: z.string().transform(str => new Date(str)),
      endDate: z.string().transform(str => new Date(str)),
      timeWindow: z.string().optional().default('daily'),
    });

    const result = metricsSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { startDate, endDate, timeWindow } = result.data;

    // Calculate and store OEE
    const metrics = await oeeRepository.calculateOEE(equipmentId, startDate, endDate);
    const stored = await oeeRepository.storeOEEMetrics(equipmentId, metrics, timeWindow);

    return NextResponse.json({
      message: 'OEE metrics stored successfully',
      data: stored,
    }, { status: 201 });
  } catch (error) {
    console.error('[OEE Store Error]', error);
    return NextResponse.json(
      { error: 'Failed to store OEE metrics' },
      { status: 500 }
    );
  }
}