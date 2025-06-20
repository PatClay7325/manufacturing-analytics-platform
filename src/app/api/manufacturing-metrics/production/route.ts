/**
 * Production Metrics API Route
 * Provides comprehensive production performance data for manufacturing dashboards
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workUnitId = searchParams.get('workUnitId');
    const shift = searchParams.get('shift');
    const productType = searchParams.get('productType');
    const timeRange = searchParams.get('timeRange') || '24h';

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

    // Build where clause for performance metrics
    const whereClause: any = {
      timestamp: {
        gte: startDate,
        lte: now,
      },
    };

    if (workUnitId && workUnitId !== 'all') {
      whereClause.workUnitId = workUnitId;
    }
    
    if (shift && shift !== 'all') {
      whereClause.shift = shift;
    }
    
    if (productType && productType !== 'all') {
      whereClause.productType = productType;
    }

    // Get current production metrics
    const currentProduction = await prisma.performanceMetric.findFirst({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
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

    // Get production trends over time
    const productionTrends = await prisma.performanceMetric.findMany({
      where: whereClause,
      select: {
        timestamp: true,
        totalParts: true,
        goodParts: true,
        rejectedParts: true,
        reworkParts: true,
        plannedProduction: true,
        throughputRate: true,
        targetThroughput: true,
        shift: true,
        productType: true,
        firstPassYield: true,
        scrapRate: true,
        WorkUnit: {
          select: {
            name: true,
            code: true,
          }
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    // Get aggregated production metrics
    const aggregatedProduction = await prisma.performanceMetric.aggregate({
      where: whereClause,
      _sum: {
        totalParts: true,
        goodParts: true,
        rejectedParts: true,
        reworkParts: true,
        plannedProduction: true,
      },
      _avg: {
        throughputRate: true,
        targetThroughput: true,
        firstPassYield: true,
        scrapRate: true,
        reworkRate: true,
      }
    });

    // Get production by shift
    const shiftProduction = await prisma.performanceMetric.groupBy({
      by: ['shift'],
      where: whereClause,
      _sum: {
        totalParts: true,
        goodParts: true,
        rejectedParts: true,
      },
      _avg: {
        throughputRate: true,
        firstPassYield: true,
      },
      _count: {
        id: true,
      }
    });

    // Get production by product type
    const productProduction = await prisma.performanceMetric.groupBy({
      by: ['productType'],
      where: whereClause,
      _sum: {
        totalParts: true,
        goodParts: true,
        rejectedParts: true,
      },
      _avg: {
        throughputRate: true,
        firstPassYield: true,
      },
      _count: {
        id: true,
      }
    });

    // Get cycle time analysis
    const cycleTimeData = await prisma.performanceMetric.findMany({
      where: whereClause,
      select: {
        timestamp: true,
        idealCycleTime: true,
        actualCycleTime: true,
        standardCycleTime: true,
        WorkUnit: {
          select: {
            name: true,
          }
        }
      }
    });

    // Get quality metrics for production context
    const qualityData = await prisma.qualityMetric.findMany({
      where: {
        workUnitId: workUnitId && workUnitId !== 'all' ? workUnitId : undefined,
        timestamp: {
          gte: startDate,
          lte: now,
        },
      },
      select: {
        timestamp: true,
        parameter: true,
        value: true,
        isWithinSpec: true,
        qualityGrade: true,
        defectType: true,
        shift: true,
        WorkUnit: {
          select: {
            name: true,
          }
        }
      },
      take: 100 // Limit for performance
    });

    // Get top performing work units
    const topPerformers = await prisma.performanceMetric.groupBy({
      by: ['workUnitId'],
      where: whereClause,
      _avg: {
        throughputRate: true,
        firstPassYield: true,
        oeeScore: true,
      },
      _sum: {
        totalParts: true,
        goodParts: true,
      },
      orderBy: {
        _avg: {
          oeeScore: 'desc'
        }
      },
      take: 10
    });

    // Get work unit details for top performers
    const workUnitIds = topPerformers.map(p => p.workUnitId);
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

    // Merge top performers with work unit details
    const enhancedTopPerformers = topPerformers.map(performer => {
      const workUnit = workUnits.find(wu => wu.id === performer.workUnitId);
      return {
        ...performer,
        workUnit
      };
    });

    // Calculate production efficiency trends
    const efficiencyTrends = productionTrends.map(trend => ({
      timestamp: trend.timestamp,
      efficiency: trend.plannedProduction && trend.plannedProduction > 0 
        ? (trend.totalParts / trend.plannedProduction) * 100 
        : 0,
      throughputEfficiency: trend.targetThroughput && trend.targetThroughput > 0
        ? (trend.throughputRate / trend.targetThroughput) * 100
        : 0,
      workUnit: trend.WorkUnit.name,
      shift: trend.shift,
      productType: trend.productType,
    }));

    const response = {
      current: currentProduction ? {
        workUnit: currentProduction.WorkUnit,
        totalParts: currentProduction.totalParts,
        goodParts: currentProduction.goodParts,
        rejectedParts: currentProduction.rejectedParts,
        reworkParts: currentProduction.reworkParts,
        plannedProduction: currentProduction.plannedProduction,
        throughputRate: currentProduction.throughputRate,
        targetThroughput: currentProduction.targetThroughput,
        firstPassYield: currentProduction.firstPassYield,
        scrapRate: currentProduction.scrapRate,
        shift: currentProduction.shift,
        productType: currentProduction.productType,
        timestamp: currentProduction.timestamp,
      } : null,
      aggregated: {
        totalPartsProduced: aggregatedProduction._sum.totalParts,
        totalGoodParts: aggregatedProduction._sum.goodParts,
        totalRejectedParts: aggregatedProduction._sum.rejectedParts,
        totalReworkParts: aggregatedProduction._sum.reworkParts,
        totalPlannedProduction: aggregatedProduction._sum.plannedProduction,
        avgThroughputRate: aggregatedProduction._avg.throughputRate,
        avgTargetThroughput: aggregatedProduction._avg.targetThroughput,
        avgFirstPassYield: aggregatedProduction._avg.firstPassYield,
        avgScrapRate: aggregatedProduction._avg.scrapRate,
        avgReworkRate: aggregatedProduction._avg.reworkRate,
        productionEfficiency: aggregatedProduction._sum.plannedProduction && aggregatedProduction._sum.plannedProduction > 0
          ? (aggregatedProduction._sum.totalParts / aggregatedProduction._sum.plannedProduction) * 100
          : 0,
      },
      trends: productionTrends.map(trend => ({
        timestamp: trend.timestamp,
        totalParts: trend.totalParts,
        goodParts: trend.goodParts,
        rejectedParts: trend.rejectedParts,
        throughputRate: trend.throughputRate,
        firstPassYield: trend.firstPassYield,
        workUnit: trend.WorkUnit.name,
        shift: trend.shift,
        productType: trend.productType,
      })),
      byShift: shiftProduction.map(shift => ({
        shift: shift.shift,
        totalParts: shift._sum.totalParts,
        goodParts: shift._sum.goodParts,
        rejectedParts: shift._sum.rejectedParts,
        avgThroughput: shift._avg.throughputRate,
        avgFirstPassYield: shift._avg.firstPassYield,
        recordCount: shift._count.id,
      })),
      byProduct: productProduction.map(product => ({
        productType: product.productType,
        totalParts: product._sum.totalParts,
        goodParts: product._sum.goodParts,
        rejectedParts: product._sum.rejectedParts,
        avgThroughput: product._avg.throughputRate,
        avgFirstPassYield: product._avg.firstPassYield,
        recordCount: product._count.id,
      })),
      cycleTimeAnalysis: cycleTimeData.map(data => ({
        timestamp: data.timestamp,
        idealCycleTime: data.idealCycleTime,
        actualCycleTime: data.actualCycleTime,
        standardCycleTime: data.standardCycleTime,
        workUnit: data.WorkUnit.name,
        efficiency: data.idealCycleTime && data.actualCycleTime
          ? (data.idealCycleTime / data.actualCycleTime) * 100
          : 0,
      })),
      topPerformers: enhancedTopPerformers,
      efficiencyTrends,
      qualityOverview: {
        totalMeasurements: qualityData.length,
        withinSpec: qualityData.filter(q => q.isWithinSpec).length,
        outOfSpec: qualityData.filter(q => !q.isWithinSpec).length,
        gradeA: qualityData.filter(q => q.qualityGrade === 'A').length,
        gradeB: qualityData.filter(q => q.qualityGrade === 'B').length,
        gradeC: qualityData.filter(q => q.qualityGrade === 'C').length,
      },
      metadata: {
        timeRange,
        startDate,
        endDate: now,
        totalRecords: productionTrends.length,
        filters: {
          workUnitId,
          shift,
          productType,
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching production metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch production metrics' },
      { status: 500 }
    );
  }
}