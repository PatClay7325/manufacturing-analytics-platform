/**
 * Production Metrics API Route
 * Provides comprehensive production performance data for manufacturing dashboards
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
    const machineName = searchParams.get('machineName');
    const shift = searchParams.get('shift');
    const productType = searchParams.get('productType');
    const timeRange = searchParams.get('timeRange') || '24h';

    // Get dynamic schema introspection for PerformanceMetric model
    const modelIntrospection = await getCachedModelIntrospection('performanceMetric');

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

    // Build where clause for performance metrics with dynamic field resolution
    const whereClause: any = {
      timestamp: {
        gte: startDate,
        lte: now,
      },
    };

    // Dynamically resolve filter fields
    const machineField = resolveFieldName('machineName', modelIntrospection);
    const shiftField = resolveFieldName('shift', modelIntrospection);
    const productTypeField = resolveFieldName('productType', modelIntrospection);

    if (machineName && machineName !== 'all' && machineField) {
      whereClause[machineField] = machineName;
    }
    
    if (shift && shift !== 'all' && shiftField) {
      whereClause[shiftField] = shift;
    }
    
    if (productType && productType !== 'all' && productTypeField) {
      whereClause[productTypeField] = productType;
    }

    // Create dynamic select for production trends
    const trendsSelect = createDynamicSelect([
      'timestamp', 'totalParts', 'totalPartsProduced', 'goodParts', 
      'rejectedParts', 'rejectParts', 'reworkParts', 'plannedProduction',
      'shift', 'productType', 'machineName'
    ], modelIntrospection);

    // Get current production metrics
    const currentProduction = await prisma.performanceMetric.findFirst({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
    });

    // Get production trends over time
    const productionTrends = await prisma.performanceMetric.findMany({
      where: whereClause,
      select: trendsSelect,
      orderBy: { timestamp: 'asc' },
      take: 100, // Limit for performance
    });

    // Dynamically resolve production quantity fields for aggregation
    const totalPartsFields = FIELD_ALIASES.totalParts.filter(field => 
      modelIntrospection.availableFields.includes(field)
    );
    const goodPartsFields = FIELD_ALIASES.goodParts.filter(field => 
      modelIntrospection.availableFields.includes(field)
    );
    const rejectedPartsFields = FIELD_ALIASES.rejectedParts.filter(field => 
      modelIntrospection.availableFields.includes(field)
    );
    const reworkPartsFields = FIELD_ALIASES.reworkParts.filter(field => 
      modelIntrospection.availableFields.includes(field)
    );
    const plannedProductionFields = FIELD_ALIASES.plannedProduction.filter(field => 
      modelIntrospection.availableFields.includes(field)
    );

    // Build aggregation object dynamically
    const aggregationFields: any = { _count: { id: true } };
    
    // Add sum aggregations for available fields
    if (totalPartsFields.length > 0) {
      aggregationFields._sum = { ...aggregationFields._sum };
      totalPartsFields.forEach(field => {
        aggregationFields._sum[field] = true;
      });
    }
    
    if (goodPartsFields.length > 0) {
      aggregationFields._sum = { ...aggregationFields._sum };
      goodPartsFields.forEach(field => {
        aggregationFields._sum[field] = true;
      });
    }
    
    if (rejectedPartsFields.length > 0) {
      aggregationFields._sum = { ...aggregationFields._sum };
      rejectedPartsFields.forEach(field => {
        aggregationFields._sum[field] = true;
      });
    }
    
    if (reworkPartsFields.length > 0) {
      aggregationFields._sum = { ...aggregationFields._sum };
      reworkPartsFields.forEach(field => {
        aggregationFields._sum[field] = true;
      });
    }
    
    if (plannedProductionFields.length > 0) {
      aggregationFields._sum = { ...aggregationFields._sum };
      plannedProductionFields.forEach(field => {
        aggregationFields._sum[field] = true;
      });
    }

    // Get aggregated production metrics
    const aggregatedProduction = await prisma.performanceMetric.aggregate({
      where: whereClause,
      ...aggregationFields
    });

    // Get production by shift with dynamic fields
    let shiftProduction: any[] = [];
    if (shiftField) {
      const shiftAggregation: any = { _count: { id: true } };
      if (aggregationFields._sum) {
        shiftAggregation._sum = aggregationFields._sum;
      }

      shiftProduction = await prisma.performanceMetric.groupBy({
        by: [shiftField as any],
        where: whereClause,
        ...shiftAggregation
      });
    }

    // Get production by product type with dynamic fields
    let productProduction: any[] = [];
    if (productTypeField) {
      const productAggregation: any = { _count: { id: true } };
      if (aggregationFields._sum) {
        productAggregation._sum = aggregationFields._sum;
      }

      productProduction = await prisma.performanceMetric.groupBy({
        by: [productTypeField as any],
        where: whereClause,
        ...productAggregation
      });
    }

    // Get top performing machines with dynamic fields
    let topPerformers: any[] = [];
    if (machineField) {
      const performerAggregation: any = {};
      const oeeField = resolveFieldName('oeeScore', modelIntrospection);
      
      if (oeeField) {
        performerAggregation._avg = { [oeeField]: true };
        performerAggregation.orderBy = { _avg: { [oeeField]: 'desc' } };
      }
      
      if (aggregationFields._sum) {
        performerAggregation._sum = aggregationFields._sum;
      }

      topPerformers = await prisma.performanceMetric.groupBy({
        by: [machineField as any],
        where: whereClause,
        ...performerAggregation,
        take: 10
      });
    }

    // Normalize all query results
    const normalizedCurrent = normalizeQueryResult(currentProduction, modelIntrospection);
    const normalizedTrends = normalizeQueryResult(productionTrends, modelIntrospection);
    const normalizedShiftProduction = normalizeQueryResult(shiftProduction, modelIntrospection);
    const normalizedProductProduction = normalizeQueryResult(productProduction, modelIntrospection);
    const normalizedTopPerformers = normalizeQueryResult(topPerformers, modelIntrospection);

    const response = {
      current: normalizedCurrent ? {
        machine: combineFieldValues(normalizedCurrent, FIELD_ALIASES.machineName, 'Unknown'),
        totalParts: combineFieldValues(normalizedCurrent, FIELD_ALIASES.totalParts, 0),
        goodParts: combineFieldValues(normalizedCurrent, FIELD_ALIASES.goodParts, 0),
        rejectedParts: combineFieldValues(normalizedCurrent, FIELD_ALIASES.rejectedParts, 0),
        reworkParts: combineFieldValues(normalizedCurrent, FIELD_ALIASES.reworkParts, 0),
        plannedProduction: combineFieldValues(normalizedCurrent, FIELD_ALIASES.plannedProduction, 0),
        shift: combineFieldValues(normalizedCurrent, FIELD_ALIASES.shift, 'Unknown'),
        productType: combineFieldValues(normalizedCurrent, FIELD_ALIASES.productType, 'Unknown'),
        timestamp: normalizedCurrent.timestamp,
      } : null,
      aggregated: {
        totalPartsProduced: combineFieldValues(aggregatedProduction._sum || {}, FIELD_ALIASES.totalParts, 0),
        totalGoodParts: combineFieldValues(aggregatedProduction._sum || {}, FIELD_ALIASES.goodParts, 0),
        totalRejectedParts: combineFieldValues(aggregatedProduction._sum || {}, FIELD_ALIASES.rejectedParts, 0),
        totalReworkParts: combineFieldValues(aggregatedProduction._sum || {}, FIELD_ALIASES.reworkParts, 0),
        totalPlannedProduction: combineFieldValues(aggregatedProduction._sum || {}, FIELD_ALIASES.plannedProduction, 0),
        totalRecords: aggregatedProduction._count.id || 0,
      },
      trends: normalizedTrends.map((trend: any) => ({
        timestamp: trend.timestamp,
        totalParts: combineFieldValues(trend, FIELD_ALIASES.totalParts, 0),
        goodParts: combineFieldValues(trend, FIELD_ALIASES.goodParts, 0),
        rejectedParts: combineFieldValues(trend, FIELD_ALIASES.rejectedParts, 0),
        machine: combineFieldValues(trend, FIELD_ALIASES.machineName, 'Unknown'),
        shift: combineFieldValues(trend, FIELD_ALIASES.shift, 'Unknown'),
        productType: combineFieldValues(trend, FIELD_ALIASES.productType, 'Unknown'),
      })),
      byShift: normalizedShiftProduction.map((shift: any) => ({
        shift: combineFieldValues(shift, [shiftField || 'shift'], 'Unknown'),
        totalParts: combineFieldValues(shift._sum || {}, FIELD_ALIASES.totalParts, 0),
        goodParts: combineFieldValues(shift._sum || {}, FIELD_ALIASES.goodParts, 0),
        rejectedParts: combineFieldValues(shift._sum || {}, FIELD_ALIASES.rejectedParts, 0),
        recordCount: shift._count.id || 0,
      })),
      byProduct: normalizedProductProduction.map((product: any) => ({
        productType: combineFieldValues(product, [productTypeField || 'productType'], 'Unknown'),
        totalParts: combineFieldValues(product._sum || {}, FIELD_ALIASES.totalParts, 0),
        goodParts: combineFieldValues(product._sum || {}, FIELD_ALIASES.goodParts, 0),
        rejectedParts: combineFieldValues(product._sum || {}, FIELD_ALIASES.rejectedParts, 0),
        recordCount: product._count.id || 0,
      })),
      topPerformers: normalizedTopPerformers.map((performer: any) => ({
        machineName: combineFieldValues(performer, [machineField || 'machineName'], 'Unknown'),
        avgOEE: combineFieldValues(performer._avg || {}, FIELD_ALIASES.oeeScore, 0),
        totalParts: combineFieldValues(performer._sum || {}, FIELD_ALIASES.totalParts, 0),
        goodParts: combineFieldValues(performer._sum || {}, FIELD_ALIASES.goodParts, 0),
      })),
      metadata: {
        timeRange,
        startDate,
        endDate: now,
        totalRecords: normalizedTrends.length,
        filters: {
          machineName,
          shift,
          productType,
        },
        schemaInfo: {
          availableFields: modelIntrospection.availableFields,
          resolvedFields: {
            machineName: machineField,
            shift: shiftField,
            productType: productTypeField
          },
          availableProductionFields: {
            totalParts: totalPartsFields,
            goodParts: goodPartsFields,
            rejectedParts: rejectedPartsFields,
            reworkParts: reworkPartsFields,
            plannedProduction: plannedProductionFields
          }
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching production metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch production metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}