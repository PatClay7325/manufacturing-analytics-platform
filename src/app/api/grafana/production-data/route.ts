import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    // Get all production data from PerformanceMetric table
    const data = await prisma.performanceMetric.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        oeeScore: true,
        availabilityScore: true,
        performanceScore: true,
        qualityScore: true,
        productionRate: true,
        defectRate: true,
        plannedDowntime: true,
        unplannedDowntime: true,
        equipmentId: true,
        workCenterId: true,
      },
      take: 1000, // Limit to prevent overwhelming response
    });

    // Transform data for time series visualization
    const timeSeries = data.map(metric => ({
      timestamp: metric.createdAt.toISOString(),
      oee: metric.oeeScore,
      availability: metric.availabilityScore,
      performance: metric.performanceScore,
      quality: metric.qualityScore,
      productionRate: metric.productionRate,
      defectRate: metric.defectRate,
      downtime: (metric.plannedDowntime || 0) + (metric.unplannedDowntime || 0),
      equipmentId: metric.equipmentId,
      workCenterId: metric.workCenterId,
    }));

    return NextResponse.json(timeSeries);
  } catch (error) {
    console.error('API /production-data error:', error);
    return NextResponse.json(
      { error: 'Unable to fetch production data.' },
      { status: 500 }
    );
  }
}