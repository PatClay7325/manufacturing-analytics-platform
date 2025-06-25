import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

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
      },
      unplannedDowntime: {
        gt: 0
      }
    };
    
    if (workUnitId) {
      whereClause.workUnitId = workUnitId;
    }
    
    // Fetch downtime metrics
    const downtimeRecords = await prisma.performanceMetric.findMany({
      where: whereClause,
      include: {
        WorkUnit: {
          select: {
            id: true,
            name: true,
            code: true,
            equipmentType: true
          }
        }
      },
      orderBy: {
        unplannedDowntime: 'desc'
      }
    });
    
    // Fetch alerts for context
    const alerts = await prisma.alert.findMany({
      where: {
        timestamp: {
          gte: startTime,
          lte: now
        },
        alertType: {
          in: ['EQUIPMENT_FAILURE', 'DOWNTIME_EXCEEDED', 'MAINTENANCE_REQUIRED']
        }
      },
      include: {
        WorkUnit: {
          select: {
            name: true,
            code: true
          }
        }
      }
    });
    
    // Aggregate downtime by equipment
    const downtimeByEquipment = downtimeRecords.reduce((acc, record) => {
      const equipmentId = record.WorkUnit.id;
      if (!acc[equipmentId]) {
        acc[equipmentId] = {
          equipment: record.WorkUnit,
          totalDowntime: 0,
          plannedDowntime: 0,
          unplannedDowntime: 0,
          changeoverTime: 0,
          occurrences: 0,
          alerts: []
        };
      }
      
      acc[equipmentId].totalDowntime += (record.plannedDowntime || 0) + (record.unplannedDowntime || 0);
      acc[equipmentId].plannedDowntime += record.plannedDowntime || 0;
      acc[equipmentId].unplannedDowntime += record.unplannedDowntime || 0;
      acc[equipmentId].changeoverTime += record.changeoverTime || 0;
      acc[equipmentId].occurrences += 1;
      
      // Add related alerts
      const relatedAlerts = alerts.filter(a => a.workUnitId === equipmentId);
      acc[equipmentId].alerts = relatedAlerts;
      
      return acc;
    }, {} as Record<string, any>);
    
    // Calculate Pareto data (80/20 rule)
    const sortedDowntime = Object.values(downtimeByEquipment)
      .sort((a: any, b: any) => b.unplannedDowntime - a.unplannedDowntime);
    
    const totalUnplannedDowntime = sortedDowntime.reduce((sum, item: any) => sum + item.unplannedDowntime, 0);
    
    let cumulativeDowntime = 0;
    const paretoData = sortedDowntime.map((item: any) => {
      cumulativeDowntime += item.unplannedDowntime;
      return {
        ...item,
        percentage: (item.unplannedDowntime / totalUnplannedDowntime) * 100,
        cumulativePercentage: (cumulativeDowntime / totalUnplannedDowntime) * 100
      };
    });
    
    // Identify top contributors (80% threshold)
    const eightyPercentThreshold = totalUnplannedDowntime * 0.8;
    let cumulative = 0;
    const topContributors = [];
    
    for (const item of paretoData) {
      topContributors.push(item);
      cumulative += item.unplannedDowntime;
      if (cumulative >= eightyPercentThreshold) break;
    }
    
    return NextResponse.json({
      summary: {
        totalDowntime: downtimeRecords.reduce((sum, r) => sum + (r.unplannedDowntime || 0) + (r.plannedDowntime || 0), 0),
        unplannedDowntime: totalUnplannedDowntime,
        plannedDowntime: downtimeRecords.reduce((sum, r) => sum + (r.plannedDowntime || 0), 0),
        changeoverTime: downtimeRecords.reduce((sum, r) => sum + (r.changeoverTime || 0), 0),
        affectedEquipment: Object.keys(downtimeByEquipment).length,
        activeAlerts: alerts.filter(a => a.status === 'active').length,
        timeRange: {
          start: startTime.toISOString(),
          end: now.toISOString()
        }
      },
      paretoAnalysis: {
        data: paretoData,
        topContributors: topContributors,
        eightyPercentCount: topContributors.length,
        totalItems: paretoData.length
      },
      alerts: alerts,
      rawData: downtimeRecords
    });
    
  } catch (error) {
    console.error('Error fetching downtime data:', error);
    return NextResponse.json({
      error: 'Failed to fetch downtime data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}