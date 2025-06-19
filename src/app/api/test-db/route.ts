import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const [
      workUnitCount,
      metricsCount,
      alertsCount,
      recentMetrics
    ] = await Promise.all([
      prisma.workUnit.count(),
      prisma.metric.count(),
      prisma.alert.count({ where: { status: 'active' } }),
      prisma.metric.findMany({
        take: 5,
        orderBy: { timestamp: 'desc' },
        include: { WorkUnit: true }
      })
    ]);

    // Calculate sample OEE
    const oeeMetrics = await prisma.metric.findMany({
      where: {
        name: { in: ['AVAILABILITY', 'PERFORMANCE', 'QUALITY'] },
        timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      take: 30
    });

    const avgAvailability = oeeMetrics
      .filter(m => m.name === 'AVAILABILITY')
      .reduce((sum, m) => sum + m.value, 0) / 
      oeeMetrics.filter(m => m.name === 'AVAILABILITY').length || 0;
    
    const avgPerformance = oeeMetrics
      .filter(m => m.name === 'PERFORMANCE')
      .reduce((sum, m) => sum + m.value, 0) / 
      oeeMetrics.filter(m => m.name === 'PERFORMANCE').length || 0;
    
    const avgQuality = oeeMetrics
      .filter(m => m.name === 'QUALITY')
      .reduce((sum, m) => sum + m.value, 0) / 
      oeeMetrics.filter(m => m.name === 'QUALITY').length || 0;

    const calculatedOEE = (avgAvailability / 100) * (avgPerformance / 100) * (avgQuality / 100) * 100;

    return NextResponse.json({
      status: 'connected',
      database: {
        workUnits: workUnitCount,
        metrics: metricsCount,
        activeAlerts: alertsCount,
        calculatedOEE: calculatedOEE.toFixed(2) + '%',
        sampleMetrics: recentMetrics
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      hint: 'Make sure PostgreSQL is running and the database is seeded'
    }, { status: 500 });
  }
}