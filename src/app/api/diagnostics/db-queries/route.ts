import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { config } = await request.json();
  
  const queryResults = [];
  
  // Test 1: Simple count query
  try {
    const countStart = Date.now();
    const workUnitCount = await prisma.workUnit.count();
    queryResults.push({
      name: 'WorkUnit Count',
      success: true,
      duration: Date.now() - countStart,
      result: workUnitCount,
    });
  } catch (error) {
    queryResults.push({
      name: 'WorkUnit Count',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  // Test 2: Complex join query
  try {
    const joinStart = Date.now();
    const workUnitsWithMetrics = await prisma.workUnit.findMany({
      take: 5,
      include: {
        Metric: {
          take: 3,
          orderBy: { timestamp: 'desc' },
        },
      },
    });
    queryResults.push({
      name: 'WorkUnit with Metrics (Join)',
      success: true,
      duration: Date.now() - joinStart,
      result: `${workUnitsWithMetrics.length} work units with metrics`,
    });
  } catch (error) {
    queryResults.push({
      name: 'WorkUnit with Metrics (Join)',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  // Test 3: Aggregation query
  try {
    const aggStart = Date.now();
    const oeeAggregation = await prisma.metric.aggregate({
      where: {
        name: 'OEE',
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      _avg: { value: true },
      _max: { value: true },
      _min: { value: true },
      _count: true,
    });
    queryResults.push({
      name: 'OEE Aggregation (24h)',
      success: true,
      duration: Date.now() - aggStart,
      result: oeeAggregation,
    });
  } catch (error) {
    queryResults.push({
      name: 'OEE Aggregation (24h)',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  // Test 4: Transaction test
  try {
    const txStart = Date.now();
    await prisma.$transaction(async (tx) => {
      const count = await tx.metric.count();
      const latest = await tx.metric.findFirst({
        orderBy: { timestamp: 'desc' },
      });
      return { count, latest };
    });
    queryResults.push({
      name: 'Transaction Test',
      success: true,
      duration: Date.now() - txStart,
    });
  } catch (error) {
    queryResults.push({
      name: 'Transaction Test',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  // Test 5: Raw SQL query
  try {
    const rawStart = Date.now();
    const result = await prisma.$queryRaw`
      SELECT 
        w.name as workunit_name,
        COUNT(m.id) as metric_count,
        AVG(m.value) as avg_value
      FROM "WorkUnit" w
      LEFT JOIN "Metric" m ON w.id = m."workUnitId"
      WHERE m."timestamp" > ${new Date(Date.now() - 24 * 60 * 60 * 1000)}
      GROUP BY w.id, w.name
      LIMIT 5
    `;
    queryResults.push({
      name: 'Raw SQL Query',
      success: true,
      duration: Date.now() - rawStart,
      result: `${(result as any[]).length} rows returned`,
    });
  } catch (error) {
    queryResults.push({
      name: 'Raw SQL Query',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
  
  const successCount = queryResults.filter(r => r.success).length;
  const avgDuration = queryResults
    .filter(r => r.success && r.duration)
    .reduce((sum, r) => sum + (r.duration || 0), 0) / successCount || 0;
  
  return NextResponse.json({
    status: successCount === queryResults.length ? 'all_passed' : 'partial_failure',
    duration: Date.now() - startTime,
    summary: {
      total: queryResults.length,
      passed: successCount,
      failed: queryResults.length - successCount,
      averageQueryTime: Math.round(avgDuration),
    },
    queries: queryResults,
  });
}