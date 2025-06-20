/**
 * OEE (Overall Equipment Effectiveness) API Route
 * Provides ISO 22400 compliant OEE metrics for manufacturing dashboards
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workUnitId = searchParams.get('workUnitId');
    const timeRange = searchParams.get('timeRange') || '24h';
    const groupBy = searchParams.get('groupBy') || 'hour';

    // Calculate time range
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Build where clause
    const whereClause: any = {
      timestamp: {
        gte: startDate,
        lte: now,
      },
    };

    if (workUnitId && workUnitId !== 'all') {
      whereClause.workUnitId = workUnitId;
    }

    // Get current OEE metrics
    const currentMetrics = await prisma.performanceMetric.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: 1,
      include: {
        WorkUnit: {
          select: {
            id: true,
            name: true,
            code: true,
            equipmentType: true,
          }
        }
      }
    });

    // Get historical OEE trends
    const historicalMetrics = await prisma.performanceMetric.findMany({
      where: whereClause,
      orderBy: { timestamp: 'asc' },
      select: {
        timestamp: true,
        availability: true,
        performance: true,
        quality: true,
        oeeScore: true,
        workUnitId: true,
        shift: true,
        productType: true,
        WorkUnit: {
          select: {
            name: true,
            code: true,
          }
        }
      }
    });

    // Calculate aggregated metrics
    const aggregatedMetrics = await prisma.performanceMetric.aggregate({
      where: whereClause,
      _avg: {
        availability: true,
        performance: true,
        quality: true,
        oeeScore: true,
        throughputRate: true,
        firstPassYield: true,
        scrapRate: true,
      },
      _min: {
        oeeScore: true,
      },
      _max: {
        oeeScore: true,
      }
    });

    // Get OEE by shift
    const shiftMetrics = await prisma.performanceMetric.groupBy({
      by: ['shift'],
      where: whereClause,
      _avg: {
        availability: true,
        performance: true,
        quality: true,
        oeeScore: true,
      },
      _count: {
        id: true,
      }
    });

    // Get OEE by product type
    const productMetrics = await prisma.performanceMetric.groupBy({
      by: ['productType'],
      where: whereClause,
      _avg: {
        availability: true,
        performance: true,
        quality: true,
        oeeScore: true,
      },
      _count: {
        id: true,
      }
    });

    // Get equipment ranking by OEE
    const equipmentRanking = await prisma.performanceMetric.groupBy({
      by: ['workUnitId'],
      where: whereClause,
      _avg: {
        oeeScore: true,
        availability: true,
        performance: true,
        quality: true,
      },
      orderBy: {
        _avg: {
          oeeScore: 'desc'
        }
      },
      take: 10
    });

    // Get work unit details for ranking
    const workUnitIds = equipmentRanking.map(r => r.workUnitId);
    const workUnits = await prisma.workUnit.findMany({
      where: {
        id: {
          in: workUnitIds
        }
      },
      select: {
        id: true,
        name: true,
        code: true,
        equipmentType: true,
      }
    });

    // Merge equipment ranking with work unit details
    const enhancedRanking = equipmentRanking.map(ranking => {
      const workUnit = workUnits.find(wu => wu.id === ranking.workUnitId);
      return {
        ...ranking,
        workUnit
      };
    });

    // Calculate downtime breakdown
    const downtimeData = await prisma.performanceMetric.findMany({
      where: whereClause,
      select: {
        plannedDowntime: true,
        unplannedDowntime: true,
        changeoverTime: true,
        timestamp: true,
        WorkUnit: {
          select: {
            name: true,
          }
        }
      }
    });

    const response = {
      current: currentMetrics[0] || null,
      aggregated: {
        avgAvailability: aggregatedMetrics._avg.availability,
        avgPerformance: aggregatedMetrics._avg.performance,
        avgQuality: aggregatedMetrics._avg.quality,
        avgOEE: aggregatedMetrics._avg.oeeScore,
        avgThroughput: aggregatedMetrics._avg.throughputRate,
        avgFirstPassYield: aggregatedMetrics._avg.firstPassYield,
        avgScrapRate: aggregatedMetrics._avg.scrapRate,
        minOEE: aggregatedMetrics._min.oeeScore,
        maxOEE: aggregatedMetrics._max.oeeScore,
      },
      trends: historicalMetrics.map(metric => ({
        timestamp: metric.timestamp,
        availability: metric.availability,
        performance: metric.performance,
        quality: metric.quality,
        oee: metric.oeeScore,
        workUnit: metric.WorkUnit.name,
        shift: metric.shift,
        product: metric.productType,
      })),
      byShift: shiftMetrics.map(shift => ({
        shift: shift.shift,
        avgAvailability: shift._avg.availability,
        avgPerformance: shift._avg.performance,
        avgQuality: shift._avg.quality,
        avgOEE: shift._avg.oeeScore,
        count: shift._count.id,
      })),
      byProduct: productMetrics.map(product => ({
        productType: product.productType,
        avgAvailability: product._avg.availability,
        avgPerformance: product._avg.performance,
        avgQuality: product._avg.quality,
        avgOEE: product._avg.oeeScore,
        count: product._count.id,
      })),
      equipmentRanking: enhancedRanking,
      downtime: downtimeData,
      metadata: {
        timeRange,
        startDate,
        endDate: now,
        totalRecords: historicalMetrics.length,
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching OEE metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OEE metrics' },
      { status: 500 }
    );
  }
}