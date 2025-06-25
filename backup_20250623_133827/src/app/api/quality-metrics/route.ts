/**
 * Quality Metrics API Route
 * Provides quality metrics for manufacturing dashboards
 * Uses dynamic schema introspection to handle field variations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  getCachedModelIntrospection, 
  resolveFieldName, 
  createDynamicSelect,
  normalizeQueryResult,
  combineFieldValues,
  FIELD_ALIASES
} from '@/lib/schema-introspection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const workCenterId = searchParams.get('workCenterId');
    const productType = searchParams.get('productType');
    const parameter = searchParams.get('parameter');

    // Get dynamic schema introspection for QualityMetric model
    const modelIntrospection = await getCachedModelIntrospection('qualityMetric');

    // Calculate time range
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'last24h':
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

    // Build where clause with dynamic field resolution
    const whereClause: any = {
      timestamp: {
        gte: startDate,
        lte: now,
      },
    };

    // Dynamically resolve filter fields
    const workCenterField = resolveFieldName('workCenterId', modelIntrospection);
    const productTypeField = resolveFieldName('productType', modelIntrospection);

    if (workCenterId && workCenterId !== 'all' && workCenterField) {
      whereClause[workCenterField] = workCenterId;
    }
    
    if (productType && productType !== 'all' && productTypeField) {
      whereClause[productTypeField] = productType;
    }

    if (parameter && parameter !== 'all') {
      whereClause.parameter = parameter;
    }

    // Create dynamic select for quality metrics
    const qualitySelect = createDynamicSelect([
      'timestamp', 'parameter', 'value', 'uom', 'nominal', 'lowerLimit', 'upperLimit',
      'isWithinSpec', 'qualityGrade', 'cpk', 'ppk', 'defectType', 'productType', 'shift'
    ], modelIntrospection);

    // Get quality metrics without WorkCenter relation (not defined in schema)
    const qualityMetrics = await prisma.qualityMetric.findMany({
      where: whereClause,
      select: qualitySelect,
      orderBy: { timestamp: 'desc' },
      take: 500 // Limit for performance
    });

    // Get aggregated quality data
    const aggregatedQuality = await prisma.qualityMetric.aggregate({
      where: whereClause,
      _avg: {
        value: true,
        cpk: true,
        ppk: true,
      },
      _count: {
        id: true,
      }
    });

    // Count within/out of spec
    const withinSpecCount = await prisma.qualityMetric.count({
      where: {
        ...whereClause,
        isWithinSpec: true
      }
    });

    const outOfSpecCount = await prisma.qualityMetric.count({
      where: {
        ...whereClause,
        isWithinSpec: false
      }
    });

    // Get quality by parameter
    const byParameter = await prisma.qualityMetric.groupBy({
      by: ['parameter'],
      where: whereClause,
      _avg: {
        value: true,
        cpk: true,
        ppk: true,
      },
      _count: {
        id: true,
      }
    });

    // Get defect analysis
    const defectAnalysis = await prisma.qualityMetric.groupBy({
      by: ['defectType'],
      where: {
        ...whereClause,
        defectType: {
          not: null
        }
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    // Get quality by shift if shift field exists
    let byShift = [];
    const shiftField = resolveFieldName('shift', modelIntrospection);
    if (shiftField) {
      byShift = await prisma.qualityMetric.groupBy({
        by: [shiftField as any],
        where: whereClause,
        _avg: {
          value: true,
          cpk: true,
          ppk: true,
        },
        _count: {
          id: true,
        }
      });
    }

    // Normalize results
    const normalizedQualityMetrics = normalizeQueryResult(qualityMetrics, modelIntrospection);
    const normalizedByParameter = normalizeQueryResult(byParameter, modelIntrospection);
    const normalizedDefectAnalysis = normalizeQueryResult(defectAnalysis, modelIntrospection);
    const normalizedByShift = normalizeQueryResult(byShift, modelIntrospection);

    // Get quality trends over time
    const trends = normalizedQualityMetrics.map((metric: any) => ({
      timestamp: metric.timestamp,
      parameter: metric.parameter || 'Unknown',
      value: metric.value || 0,
      isWithinSpec: metric.isWithinSpec || false,
      workCenter: 'Manufacturing',
      shift: combineFieldValues(metric, ['shift'], 'Unknown'),
    }));

    // Calculate quality metrics
    const totalMeasurements = aggregatedQuality._count.id || 0;
    const firstPassYield = totalMeasurements > 0 ? withinSpecCount / totalMeasurements : 0;
    const defectRate = 1 - firstPassYield;

    const response = {
      current: {
        defectRate: Number(defectRate.toFixed(4)),
        firstPassYield: Number(firstPassYield.toFixed(4)),
        totalMeasurements,
        withinSpec: withinSpecCount,
        outOfSpec: outOfSpecCount,
        yieldRate: Number((firstPassYield * 100).toFixed(2)),
        avgCpk: aggregatedQuality._avg.cpk || 0,
        avgPpk: aggregatedQuality._avg.ppk || 0,
      },
      trends,
      byParameter: normalizedByParameter.map((param: any) => ({
        parameter: param.parameter || 'Unknown',
        avgValue: param._avg?.value || 0,
        avgCpk: param._avg?.cpk || 0,
        avgPpk: param._avg?.ppk || 0,
        count: param._count?.id || 0,
      })),
      byShift: normalizedByShift.map((shift: any) => ({
        shift: combineFieldValues(shift, [shiftField || 'shift'], 'Unknown'),
        avgValue: shift._avg?.value || 0,
        avgCpk: shift._avg?.cpk || 0,
        avgPpk: shift._avg?.ppk || 0,
        count: shift._count?.id || 0,
      })),
      defectAnalysis: normalizedDefectAnalysis.map((defect: any) => ({
        defectType: defect.defectType || 'Unknown',
        count: defect._count?.id || 0,
        percentage: totalMeasurements > 0
          ? Number(((defect._count?.id || 0) / totalMeasurements * 100).toFixed(2))
          : 0,
      })),
      metadata: {
        timeRange,
        startDate,
        endDate: now,
        totalRecords: normalizedQualityMetrics.length,
        filters: {
          workCenterId,
          productType,
          parameter,
        },
        schemaInfo: {
          availableFields: modelIntrospection.availableFields,
          resolvedFields: {
            workCenterId: workCenterField,
            productType: productTypeField,
            shift: shiftField
          }
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching quality metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quality metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}