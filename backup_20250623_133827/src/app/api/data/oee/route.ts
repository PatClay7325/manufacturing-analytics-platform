import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || '24h';
    const workUnitId = searchParams.get('workUnitId');
    
    // Calculate time range
    const now = new Date();
    let startTime = new Date();
    
    switch (timeRange) {
      case '1h':
        startTime.setHours(now.getHours() - 1);
        break;
      case '24h':
        startTime.setDate(now.getDate() - 1);
        break;
      case '7d':
        startTime.setDate(now.getDate() - 7);
        break;
      case '30d':
        startTime.setDate(now.getDate() - 30);
        break;
      default:
        startTime.setDate(now.getDate() - 1);
    }
    
    // Build query
    const whereClause: any = {
      timestamp: {
        gte: startTime,
        lte: now
      }
    };
    
    if (workUnitId) {
      whereClause.workUnitId = workUnitId;
    }
    
    // Fetch OEE metrics
    const metrics = await prisma.performanceMetric.findMany({
      where: whereClause,
      include: {
        WorkUnit: {
          select: {
            id: true,
            name: true,
            code: true,
            equipmentType: true,
            status: true
          }
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });
    
    // Calculate aggregated OEE
    if (metrics.length > 0) {
      const aggregated = metrics.reduce((acc, metric) => {
        acc.totalOEE += metric.oeeScore || 0;
        acc.totalAvailability += metric.availability || 0;
        acc.totalPerformance += metric.performance || 0;
        acc.totalQuality += metric.quality || 0;
        acc.count += 1;
        return acc;
      }, {
        totalOEE: 0,
        totalAvailability: 0,
        totalPerformance: 0,
        totalQuality: 0,
        count: 0
      });
      
      const avgOEE = aggregated.totalOEE / aggregated.count;
      const avgAvailability = aggregated.totalAvailability / aggregated.count;
      const avgPerformance = aggregated.totalPerformance / aggregated.count;
      const avgQuality = aggregated.totalQuality / aggregated.count;
      
      // Group by equipment
      const byEquipment = metrics.reduce((acc, metric) => {
        const equipmentId = metric.WorkUnit.id;
        if (!acc[equipmentId]) {
          acc[equipmentId] = {
            equipment: metric.WorkUnit,
            metrics: [],
            avgOEE: 0,
            avgAvailability: 0,
            avgPerformance: 0,
            avgQuality: 0
          };
        }
        acc[equipmentId].metrics.push(metric);
        return acc;
      }, {} as Record<string, any>);
      
      // Calculate averages per equipment
      Object.values(byEquipment).forEach((equipment: any) => {
        const equipMetrics = equipment.metrics;
        equipment.avgOEE = equipMetrics.reduce((sum: number, m: any) => sum + (m.oeeScore || 0), 0) / equipMetrics.length;
        equipment.avgAvailability = equipMetrics.reduce((sum: number, m: any) => sum + (m.availability || 0), 0) / equipMetrics.length;
        equipment.avgPerformance = equipMetrics.reduce((sum: number, m: any) => sum + (m.performance || 0), 0) / equipMetrics.length;
        equipment.avgQuality = equipMetrics.reduce((sum: number, m: any) => sum + (m.quality || 0), 0) / equipMetrics.length;
      });
      
      return NextResponse.json({
        summary: {
          oee: avgOEE,
          availability: avgAvailability,
          performance: avgPerformance,
          quality: avgQuality,
          dataPoints: metrics.length,
          timeRange: {
            start: startTime.toISOString(),
            end: now.toISOString()
          }
        },
        byEquipment: Object.values(byEquipment),
        rawData: metrics
      });
    }
    
    return NextResponse.json({
      summary: {
        oee: 0,
        availability: 0,
        performance: 0,
        quality: 0,
        dataPoints: 0,
        timeRange: {
          start: startTime.toISOString(),
          end: now.toISOString()
        }
      },
      byEquipment: [],
      rawData: []
    });
    
  } catch (error) {
    console.error('Error fetching OEE data:', error);
    return NextResponse.json({
      error: 'Failed to fetch OEE data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}