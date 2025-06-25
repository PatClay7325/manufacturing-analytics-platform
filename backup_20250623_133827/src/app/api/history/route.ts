import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getFieldAlias, normalizeFieldName } from '@/lib/schema-introspection';

// Validation schema
const HistoricalDataRequestSchema = z.object({
  metrics: z.array(z.string()),
  equipmentIds: z.array(z.string()).optional(),
  startTime: z.string(),
  endTime: z.string(),
  interval: z.enum(['1s', '5s', '1m', '5m', '1h']).optional(),
  aggregation: z.enum(['avg', 'max', 'min', 'sum', 'last']).optional()
});

type HistoricalDataRequest = z.infer<typeof HistoricalDataRequestSchema>;

// Convert interval to PostgreSQL interval string
function getIntervalString(interval?: string): string {
  switch (interval) {
    case '1s': return '1 second';
    case '5s': return '5 seconds';
    case '1m': return '1 minute';
    case '5m': return '5 minutes';
    case '1h': return '1 hour';
    default: return '1 minute';
  }
}

// Convert aggregation to SQL function
function getAggregationFunction(aggregation?: string, field: string): string {
  switch (aggregation) {
    case 'avg': return `AVG(${field})`;
    case 'max': return `MAX(${field})`;
    case 'min': return `MIN(${field})`;
    case 'sum': return `SUM(${field})`;
    case 'last': return `LAST(${field}, timestamp)`;
    default: return `AVG(${field})`;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request
    const body = await req.json();
    const request = HistoricalDataRequestSchema.parse(body);

    // Get equipment IDs if not specified
    let equipmentIds = request.equipmentIds;
    if (!equipmentIds || equipmentIds.length === 0) {
      const equipment = await prisma.equipment.findMany({
        select: { id: true },
        where: { isActive: true }
      });
      equipmentIds = equipment.map(e => e.id);
    }

    // Build time-series query
    const intervalString = getIntervalString(request.interval);
    const results: any[] = [];

    // For each metric, fetch historical data
    for (const metric of request.metrics) {
      // Try different data models based on metric type
      if (metric.startsWith('oee') || metric.includes('availability') || metric.includes('performance')) {
        // Query from productionMetrics
        const query = await prisma.$queryRaw`
          SELECT 
            time_bucket(${intervalString}::interval, timestamp) AS timestamp,
            equipment_id AS "equipmentId",
            ${request.aggregation === 'last' ? 'LAST' : 'AVG'}(${getFieldAlias('oeeScore')}, timestamp) AS value,
            'oee' AS metric
          FROM production_metrics
          WHERE 
            equipment_id = ANY(${equipmentIds}::text[])
            AND timestamp >= ${new Date(request.startTime)}::timestamp
            AND timestamp <= ${new Date(request.endTime)}::timestamp
          GROUP BY time_bucket(${intervalString}::interval, timestamp), equipment_id
          ORDER BY timestamp ASC
        `;
        
        results.push(...(query as any[]));
      } else if (metric.includes('temperature') || metric.includes('vibration') || metric.includes('pressure')) {
        // Query from equipmentTelemetry
        const telemetryField = normalizeFieldName(metric);
        const query = await prisma.$queryRaw`
          SELECT 
            time_bucket(${intervalString}::interval, timestamp) AS timestamp,
            equipment_id AS "equipmentId",
            ${request.aggregation === 'last' ? 'LAST' : 'AVG'}(${telemetryField}, timestamp) AS value,
            ${metric} AS metric
          FROM equipment_telemetry
          WHERE 
            equipment_id = ANY(${equipmentIds}::text[])
            AND timestamp >= ${new Date(request.startTime)}::timestamp
            AND timestamp <= ${new Date(request.endTime)}::timestamp
          GROUP BY time_bucket(${intervalString}::interval, timestamp), equipment_id
          ORDER BY timestamp ASC
        `;
        
        results.push(...(query as any[]));
      } else if (metric.includes('quality') || metric.includes('defect')) {
        // Query from qualityInspections
        const query = await prisma.$queryRaw`
          SELECT 
            time_bucket(${intervalString}::interval, timestamp) AS timestamp,
            equipment_id AS "equipmentId",
            AVG(CASE WHEN passed THEN 1 ELSE 0 END) * 100 AS value,
            'quality' AS metric
          FROM quality_inspections
          WHERE 
            equipment_id = ANY(${equipmentIds}::text[])
            AND timestamp >= ${new Date(request.startTime)}::timestamp
            AND timestamp <= ${new Date(request.endTime)}::timestamp
          GROUP BY time_bucket(${intervalString}::interval, timestamp), equipment_id
          ORDER BY timestamp ASC
        `;
        
        results.push(...(query as any[]));
      }
    }

    // Format results
    const formattedResults = results.map(row => ({
      timestamp: new Date(row.timestamp).toISOString(),
      equipmentId: row.equipmentId,
      metric: row.metric,
      value: parseFloat(row.value) || 0,
      quality: 'good'
    }));

    return NextResponse.json(formattedResults);
  } catch (error) {
    console.error('Historical data API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch historical data' },
      { status: 500 }
    );
  }
}