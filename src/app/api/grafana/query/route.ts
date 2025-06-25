import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Grafana JSON datasource query endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Grafana query request:', JSON.stringify(body, null, 2));

    // Handle different query formats
    const { targets = [], range, from: directFrom, to: directTo } = body;
    
    // Determine time range
    const from = directFrom ? new Date(directFrom) : new Date(range?.from || new Date().getTime() - 6 * 60 * 60 * 1000);
    const to = directTo ? new Date(directTo) : new Date(range?.to || new Date());

    // If no targets specified, return empty array
    if (!targets || targets.length === 0) {
      return NextResponse.json([]);
    }

    const results = await Promise.all(
      targets.map(async (target: any) => {
        try {
          // Handle different target formats
          const queryType = target.target || target.refId || 'performance_metrics';
          const type = target.type || target.format || 'timeserie';

          console.log(`Processing query: ${queryType} (type: ${type})`);

          switch (queryType) {
            case 'performance_metrics':
            case 'A': // Default Grafana panel query
              return await getPerformanceMetrics(from, to, type);
            
            case 'oee_by_equipment':
            case 'B':
              return await getOEEByEquipment(from, to, type);
            
            case 'production_summary':
            case 'C':
              return await getProductionSummary(from, to, type);
            
            case 'downtime_analysis':
            case 'D':
              return await getDowntimeAnalysis(from, to, type);
            
            case 'quality_metrics':
            case 'E':
              return await getQualityMetrics(from, to, type);
            
            case 'equipment_list':
            case 'F':
              return await getEquipmentList(type);
            
            case 'shift_performance':
            case 'G':
              return await getShiftPerformance(from, to, type);
            
            default:
              console.log(`Unknown query type: ${queryType}, returning empty dataset`);
              return { target: queryType, datapoints: [] };
          }
        } catch (targetError) {
          console.error(`Error processing target ${target.target}:`, targetError);
          return { target: target.target || 'unknown', datapoints: [] };
        }
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('Grafana query error:', error);
    return NextResponse.json({ 
      error: 'Query failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// Query functions
async function getPerformanceMetrics(from: Date, to: Date, type: string) {
  const metrics = await prisma.performanceMetric.findMany({
    where: {
      timestamp: {
        gte: from,
        lte: to,
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  if (type === 'table') {
    return {
      type: 'table',
      columns: [
        { text: 'Time', type: 'time' },
        { text: 'Machine', type: 'string' },
        { text: 'OEE', type: 'number' },
        { text: 'Availability', type: 'number' },
        { text: 'Performance', type: 'number' },
        { text: 'Quality', type: 'number' },
      ],
      rows: metrics.map(m => [
        new Date(m.timestamp).getTime(),
        m.machineName,
        m.oeeScore || 0,
        m.availability || 0,
        m.performance || 0,
        m.quality || 0,
      ]),
    };
  }

  // Group by machine for time series
  const machineGroups = metrics.reduce((acc: any, metric) => {
    if (!acc[metric.machineName]) {
      acc[metric.machineName] = [];
    }
    acc[metric.machineName].push([
      metric.oeeScore || 0,
      new Date(metric.timestamp).getTime(),
    ]);
    return acc;
  }, {});

  return Object.entries(machineGroups).map(([machine, datapoints]) => ({
    target: `${machine} OEE`,
    datapoints,
  }));
}

async function getOEEByEquipment(from: Date, to: Date, type: string) {
  const result = await prisma.performanceMetric.groupBy({
    by: ['machineName'],
    where: {
      timestamp: {
        gte: from,
        lte: to,
      },
    },
    _avg: {
      oeeScore: true,
      availability: true,
      performance: true,
      quality: true,
    },
    _sum: {
      totalPartsProduced: true,
      goodParts: true,
      rejectedParts: true,
    },
  });

  if (type === 'table') {
    return {
      type: 'table',
      columns: [
        { text: 'Equipment', type: 'string' },
        { text: 'Avg OEE %', type: 'number' },
        { text: 'Availability %', type: 'number' },
        { text: 'Performance %', type: 'number' },
        { text: 'Quality %', type: 'number' },
        { text: 'Total Parts', type: 'number' },
        { text: 'Good Parts', type: 'number' },
        { text: 'Rejected Parts', type: 'number' },
      ],
      rows: result.map(r => [
        r.machineName,
        (r._avg.oeeScore || 0) * 100,
        (r._avg.availability || 0) * 100,
        (r._avg.performance || 0) * 100,
        (r._avg.quality || 0) * 100,
        r._sum.totalPartsProduced || 0,
        r._sum.goodParts || 0,
        r._sum.rejectedParts || 0,
      ]),
    };
  }

  return [{
    target: 'Average OEE by Equipment',
    datapoints: result.map(r => [
      (r._avg.oeeScore || 0) * 100,
      Date.now(), // Single point in time
    ]),
  }];
}

async function getProductionSummary(from: Date, to: Date, type: string) {
  const summary = await prisma.performanceMetric.aggregate({
    where: {
      timestamp: {
        gte: from,
        lte: to,
      },
    },
    _sum: {
      totalPartsProduced: true,
      goodParts: true,
      rejectedParts: true,
      reworkParts: true,
      downtimeMinutes: true,
    },
    _avg: {
      oeeScore: true,
      availability: true,
      performance: true,
      quality: true,
    },
    _count: {
      id: true,
    },
  });

  if (type === 'table') {
    return {
      type: 'table',
      columns: [
        { text: 'Metric', type: 'string' },
        { text: 'Value', type: 'number' },
      ],
      rows: [
        ['Total Parts Produced', summary._sum.totalPartsProduced || 0],
        ['Good Parts', summary._sum.goodParts || 0],
        ['Rejected Parts', summary._sum.rejectedParts || 0],
        ['Rework Parts', summary._sum.reworkParts || 0],
        ['Total Downtime (min)', summary._sum.downtimeMinutes || 0],
        ['Average OEE %', (summary._avg.oeeScore || 0) * 100],
        ['Average Availability %', (summary._avg.availability || 0) * 100],
        ['Average Performance %', (summary._avg.performance || 0) * 100],
        ['Average Quality %', (summary._avg.quality || 0) * 100],
        ['Total Records', summary._count.id],
      ],
    };
  }

  return [{
    target: 'Production Summary',
    datapoints: [[summary._sum.totalPartsProduced || 0, Date.now()]],
  }];
}

async function getDowntimeAnalysis(from: Date, to: Date, type: string) {
  const downtime = await prisma.performanceMetric.groupBy({
    by: ['downtimeCategory'],
    where: {
      timestamp: {
        gte: from,
        lte: to,
      },
      downtimeMinutes: {
        gt: 0,
      },
    },
    _sum: {
      downtimeMinutes: true,
    },
    _count: {
      id: true,
    },
  });

  if (type === 'table') {
    return {
      type: 'table',
      columns: [
        { text: 'Category', type: 'string' },
        { text: 'Total Downtime (min)', type: 'number' },
        { text: 'Occurrences', type: 'number' },
      ],
      rows: downtime.map(d => [
        d.downtimeCategory || 'Unspecified',
        d._sum.downtimeMinutes || 0,
        d._count.id,
      ]),
    };
  }

  return downtime.map(d => ({
    target: d.downtimeCategory || 'Unspecified',
    datapoints: [[d._sum.downtimeMinutes || 0, Date.now()]],
  }));
}

async function getQualityMetrics(from: Date, to: Date, type: string) {
  const metrics = await prisma.performanceMetric.findMany({
    where: {
      timestamp: {
        gte: from,
        lte: to,
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  if (type === 'table') {
    return {
      type: 'table',
      columns: [
        { text: 'Time', type: 'time' },
        { text: 'Machine', type: 'string' },
        { text: 'Yield %', type: 'number' },
        { text: 'First Pass Yield %', type: 'number' },
        { text: 'Scrap Rate %', type: 'number' },
        { text: 'Rework Rate %', type: 'number' },
      ],
      rows: metrics.map(m => [
        new Date(m.timestamp).getTime(),
        m.machineName,
        (m.yieldPercentage || 0) * 100,
        (m.firstPassYield || 0) * 100,
        (m.scrapRate || 0) * 100,
        (m.reworkRate || 0) * 100,
      ]),
    };
  }

  return [{
    target: 'Quality Yield',
    datapoints: metrics.map(m => [
      (m.yieldPercentage || 0) * 100,
      new Date(m.timestamp).getTime(),
    ]),
  }];
}

async function getEquipmentList(type: string) {
  // Get unique machine names from performance metrics
  const machines = await prisma.performanceMetric.findMany({
    where: {
      machineName: { not: null }
    },
    select: {
      machineName: true,
      processName: true,
      oeeScore: true,
      availability: true,
      timestamp: true
    },
    distinct: ['machineName'],
    orderBy: { machineName: 'asc' },
    take: 20
  });

  return {
    type: 'table',
    columns: [
      { text: 'Machine', type: 'string' },
      { text: 'Process', type: 'string' },
      { text: 'OEE %', type: 'number' },
      { text: 'Availability %', type: 'number' },
      { text: 'Last Updated', type: 'time' },
    ],
    rows: machines.map(m => [
      m.machineName || 'Unknown',
      m.processName || 'Unknown',
      m.oeeScore || 0,
      m.availability || 0,
      new Date(m.timestamp).getTime()
    ]),
  };
}

async function getShiftPerformance(from: Date, to: Date, type: string) {
  const shifts = await prisma.performanceMetric.groupBy({
    by: ['shift'],
    where: {
      timestamp: {
        gte: from,
        lte: to,
      },
    },
    _avg: {
      oeeScore: true,
      availability: true,
      performance: true,
      quality: true,
    },
    _sum: {
      totalPartsProduced: true,
      downtimeMinutes: true,
    },
  });

  if (type === 'table') {
    return {
      type: 'table',
      columns: [
        { text: 'Shift', type: 'string' },
        { text: 'Avg OEE %', type: 'number' },
        { text: 'Total Parts', type: 'number' },
        { text: 'Downtime (min)', type: 'number' },
      ],
      rows: shifts.map(s => [
        s.shift || 'Unknown',
        (s._avg.oeeScore || 0) * 100,
        s._sum.totalPartsProduced || 0,
        s._sum.downtimeMinutes || 0,
      ]),
    };
  }

  return shifts.map(s => ({
    target: s.shift || 'Unknown',
    datapoints: [[
      (s._avg.oeeScore || 0) * 100,
      Date.now(),
    ]],
  }));
}