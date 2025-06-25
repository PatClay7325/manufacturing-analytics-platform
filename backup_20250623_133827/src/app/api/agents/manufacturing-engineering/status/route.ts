import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Check if we have data
    const [
      equipmentCount,
      metricsCount,
      recentMetrics,
      activeAlerts
    ] = await Promise.all([
      prisma.workUnit.count(),
      prisma.performanceMetric.count(),
      prisma.performanceMetric.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      prisma.alert.count({
        where: {
          status: 'active'
        }
      })
    ]);

    const hasData = metricsCount > 0;
    const isOperational = equipmentCount > 0 && hasData;

    return NextResponse.json({
      status: isOperational ? 'operational' : 'no_data',
      message: isOperational 
        ? 'Manufacturing Engineering Agent is operational' 
        : 'No manufacturing data available. Please seed data first.',
      details: {
        equipment: equipmentCount,
        totalMetrics: metricsCount,
        recentMetrics: recentMetrics,
        activeAlerts: activeAlerts,
        dataAvailable: hasData
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking agent status:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check agent status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}