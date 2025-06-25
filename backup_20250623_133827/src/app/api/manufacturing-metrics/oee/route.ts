/**
 * OEE (Overall Equipment Effectiveness) API Route
 * Provides ISO 22400 compliant OEE metrics for manufacturing dashboards
 * Uses dynamic schema introspection to handle field variations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  getCachedModelIntrospection, 
  resolveFieldName, 
  createDynamicSelect,
  normalizeQueryResult,
  createDynamicAggregation,
  combineFieldValues,
  combineStringFieldValues,
  FIELD_ALIASES
} from '@/lib/schema-introspection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workUnitId = searchParams.get('workUnitId');
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

    // Build where clause with dynamic field resolution
    const whereClause: any = {
      timestamp: {
        gte: startDate,
        lte: now,
      },
    };

    // Resolve machine identifier field dynamically
    if (workUnitId && workUnitId !== 'all') {
      const machineField = resolveFieldName('machineName', modelIntrospection) || 
                          resolveFieldName('workUnitId', modelIntrospection) || 
                          'machineName';
      whereClause[machineField] = workUnitId;
    }

    // Create dynamic select for historical metrics
    const historicalSelect = createDynamicSelect([
      'timestamp', 'availability', 'performance', 'quality', 'oeeScore', 
      'machineName', 'shift', 'productType'
    ], modelIntrospection);

    // Get current OEE metrics
    const currentMetrics = await prisma.performanceMetric.findFirst({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
    });

    // Get historical OEE trends
    const historicalMetrics = await prisma.performanceMetric.findMany({
      where: whereClause,
      orderBy: { timestamp: 'asc' },
      select: historicalSelect,
      take: 100, // Limit for performance
    });

    // Calculate aggregated metrics with dynamic field resolution
    const availabilityField = resolveFieldName('availability', modelIntrospection);
    const performanceField = resolveFieldName('performance', modelIntrospection);
    const qualityField = resolveFieldName('quality', modelIntrospection);
    const oeeField = resolveFieldName('oeeScore', modelIntrospection);

    const aggregationFields: any = { _count: { id: true } };
    
    if (availabilityField) aggregationFields._avg = { ...aggregationFields._avg, [availabilityField]: true };
    if (performanceField) aggregationFields._avg = { ...aggregationFields._avg, [performanceField]: true };
    if (qualityField) aggregationFields._avg = { ...aggregationFields._avg, [qualityField]: true };
    if (oeeField) {
      aggregationFields._avg = { ...aggregationFields._avg, [oeeField]: true };
      aggregationFields._min = { [oeeField]: true };
      aggregationFields._max = { [oeeField]: true };
    }

    const aggregatedMetrics = await prisma.performanceMetric.aggregate({
      where: whereClause,
      ...aggregationFields
    });

    // Get OEE by shift with dynamic field resolution
    const shiftField = resolveFieldName('shift', modelIntrospection);
    let shiftMetrics: any[] = [];
    
    if (shiftField) {
      const shiftAggregation: any = { _count: { id: true } };
      if (availabilityField) shiftAggregation._avg = { ...shiftAggregation._avg, [availabilityField]: true };
      if (performanceField) shiftAggregation._avg = { ...shiftAggregation._avg, [performanceField]: true };
      if (qualityField) shiftAggregation._avg = { ...shiftAggregation._avg, [qualityField]: true };
      if (oeeField) shiftAggregation._avg = { ...shiftAggregation._avg, [oeeField]: true };

      shiftMetrics = await prisma.performanceMetric.groupBy({
        by: [shiftField as any],
        where: whereClause,
        ...shiftAggregation
      });
    }

    // Get OEE by product type with dynamic field resolution
    const productTypeField = resolveFieldName('productType', modelIntrospection);
    let productMetrics: any[] = [];
    
    if (productTypeField) {
      const productAggregation: any = { _count: { id: true } };
      if (availabilityField) productAggregation._avg = { ...productAggregation._avg, [availabilityField]: true };
      if (performanceField) productAggregation._avg = { ...productAggregation._avg, [performanceField]: true };
      if (qualityField) productAggregation._avg = { ...productAggregation._avg, [qualityField]: true };
      if (oeeField) productAggregation._avg = { ...productAggregation._avg, [oeeField]: true };

      productMetrics = await prisma.performanceMetric.groupBy({
        by: [productTypeField as any],
        where: whereClause,
        ...productAggregation
      });
    }

    // Get equipment ranking by OEE with dynamic field resolution
    const machineNameField = resolveFieldName('machineName', modelIntrospection);
    let equipmentRanking: any[] = [];
    
    if (machineNameField) {
      const equipmentAggregation: any = {};
      if (availabilityField) equipmentAggregation._avg = { ...equipmentAggregation._avg, [availabilityField]: true };
      if (performanceField) equipmentAggregation._avg = { ...equipmentAggregation._avg, [performanceField]: true };
      if (qualityField) equipmentAggregation._avg = { ...equipmentAggregation._avg, [qualityField]: true };
      if (oeeField) equipmentAggregation._avg = { ...equipmentAggregation._avg, [oeeField]: true };

      const orderByClause: any = {};
      if (oeeField) {
        orderByClause.orderBy = {
          _avg: { [oeeField]: 'desc' }
        };
      }

      equipmentRanking = await prisma.performanceMetric.groupBy({
        by: [machineNameField as any],
        where: whereClause,
        ...equipmentAggregation,
        ...orderByClause,
        take: 10
      });
    }

    // Normalize all query results for consistent field names
    const normalizedCurrent = normalizeQueryResult(currentMetrics, modelIntrospection);
    const normalizedHistorical = normalizeQueryResult(historicalMetrics, modelIntrospection);
    const normalizedShiftMetrics = normalizeQueryResult(shiftMetrics, modelIntrospection);
    const normalizedProductMetrics = normalizeQueryResult(productMetrics, modelIntrospection);
    const normalizedEquipmentRanking = normalizeQueryResult(equipmentRanking, modelIntrospection);

    const response = {
      current: normalizedCurrent || null,
      aggregated: {
        avgAvailability: combineFieldValues(aggregatedMetrics._avg || {}, FIELD_ALIASES.availability, 0),
        avgPerformance: combineFieldValues(aggregatedMetrics._avg || {}, FIELD_ALIASES.performance, 0),
        avgQuality: combineFieldValues(aggregatedMetrics._avg || {}, FIELD_ALIASES.quality, 0),
        avgOEE: combineFieldValues(aggregatedMetrics._avg || {}, FIELD_ALIASES.oeeScore, 0),
        minOEE: combineFieldValues(aggregatedMetrics._min || {}, FIELD_ALIASES.oeeScore, 0),
        maxOEE: combineFieldValues(aggregatedMetrics._max || {}, FIELD_ALIASES.oeeScore, 0),
        totalRecords: aggregatedMetrics._count?.id || 0,
      },
      trends: normalizedHistorical.map((metric: any) => ({
        timestamp: metric.timestamp,
        availability: combineFieldValues(metric, FIELD_ALIASES.availability, 0),
        performance: combineFieldValues(metric, FIELD_ALIASES.performance, 0),
        quality: combineFieldValues(metric, FIELD_ALIASES.quality, 0),
        oee: combineFieldValues(metric, FIELD_ALIASES.oeeScore, 0),
        machine: combineStringFieldValues(metric, FIELD_ALIASES.machineName, 'Unknown'),
        shift: combineStringFieldValues(metric, FIELD_ALIASES.shift, 'Unknown'),
        product: combineStringFieldValues(metric, FIELD_ALIASES.productType, 'Unknown'),
      })),
      byShift: normalizedShiftMetrics.map((shift: any) => ({
        shift: combineStringFieldValues(shift, [shiftField || 'shift'], 'Unknown'),
        avgAvailability: combineFieldValues(shift._avg || {}, FIELD_ALIASES.availability, 0),
        avgPerformance: combineFieldValues(shift._avg || {}, FIELD_ALIASES.performance, 0),
        avgQuality: combineFieldValues(shift._avg || {}, FIELD_ALIASES.quality, 0),
        avgOEE: combineFieldValues(shift._avg || {}, FIELD_ALIASES.oeeScore, 0),
        count: shift._count?.id || 0,
      })),
      byProduct: normalizedProductMetrics.map((product: any) => ({
        productType: combineStringFieldValues(product, [productTypeField || 'productType'], 'Unknown'),
        avgAvailability: combineFieldValues(product._avg || {}, FIELD_ALIASES.availability, 0),
        avgPerformance: combineFieldValues(product._avg || {}, FIELD_ALIASES.performance, 0),
        avgQuality: combineFieldValues(product._avg || {}, FIELD_ALIASES.quality, 0),
        avgOEE: combineFieldValues(product._avg || {}, FIELD_ALIASES.oeeScore, 0),
        count: product._count?.id || 0,
      })),
      equipmentRanking: normalizedEquipmentRanking.map((equipment: any) => ({
        machineName: combineStringFieldValues(equipment, [machineNameField || 'machineName'], 'Unknown'),
        _avg: {
          oeeScore: combineFieldValues(equipment._avg || {}, FIELD_ALIASES.oeeScore, 0),
          availability: combineFieldValues(equipment._avg || {}, FIELD_ALIASES.availability, 0),
          performance: combineFieldValues(equipment._avg || {}, FIELD_ALIASES.performance, 0),
          quality: combineFieldValues(equipment._avg || {}, FIELD_ALIASES.quality, 0),
        }
      })),
      metadata: {
        timeRange,
        startDate,
        endDate: now,
        totalRecords: normalizedHistorical.length,
        schemaInfo: {
          availableFields: modelIntrospection.availableFields,
          resolvedFields: {
            machineName: machineNameField,
            shift: shiftField,
            productType: productTypeField,
            availability: availabilityField,
            performance: performanceField,
            quality: qualityField,
            oeeScore: oeeField
          }
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching OEE metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OEE metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}