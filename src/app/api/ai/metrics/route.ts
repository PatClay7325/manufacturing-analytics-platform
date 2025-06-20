import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { query, timeRange = '24h', equipment = null } = await request.json();
    
    // Calculate time range
    const now = new Date();
    let startTime = new Date();
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Query different metrics based on the request
    const results: any = {};

    // Get OEE metrics
    if (query.includes('oee') || query === 'all') {
      const oeeData = await prisma.metric.findMany({
        where: {
          name: {
            in: ['oee', 'availability', 'performance', 'quality']
          },
          timestamp: {
            gte: startTime,
            lte: now
          },
          ...(equipment && { tags: { contains: equipment } })
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 100
      });

      // Calculate current and average OEE
      const oeeValues = oeeData.filter(m => m.name === 'oee').map(m => m.value);
      const availabilityValues = oeeData.filter(m => m.name === 'availability').map(m => m.value);
      const performanceValues = oeeData.filter(m => m.name === 'performance').map(m => m.value);
      const qualityValues = oeeData.filter(m => m.name === 'quality').map(m => m.value);

      results.oee = {
        current: oeeValues[0] || 0,
        average: oeeValues.reduce((a, b) => a + b, 0) / (oeeValues.length || 1),
        trend: oeeValues.length > 1 ? ((oeeValues[0] - oeeValues[oeeValues.length - 1]) / oeeValues[oeeValues.length - 1] * 100) : 0,
        components: {
          availability: {
            current: availabilityValues[0] || 0,
            average: availabilityValues.reduce((a, b) => a + b, 0) / (availabilityValues.length || 1)
          },
          performance: {
            current: performanceValues[0] || 0,
            average: performanceValues.reduce((a, b) => a + b, 0) / (performanceValues.length || 1)
          },
          quality: {
            current: qualityValues[0] || 0,
            average: qualityValues.reduce((a, b) => a + b, 0) / (qualityValues.length || 1)
          }
        }
      };
    }

    // Get production metrics
    if (query.includes('production') || query.includes('units') || query === 'all') {
      const productionData = await prisma.metric.findMany({
        where: {
          name: {
            in: ['units_produced', 'production_rate', 'cycle_time']
          },
          timestamp: {
            gte: startTime,
            lte: now
          },
          ...(equipment && { tags: { contains: equipment } })
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 100
      });

      const unitsProduced = productionData
        .filter(m => m.name === 'units_produced')
        .reduce((sum, m) => sum + m.value, 0);
      
      const productionRates = productionData.filter(m => m.name === 'production_rate').map(m => m.value);
      const cycleTimes = productionData.filter(m => m.name === 'cycle_time').map(m => m.value);

      results.production = {
        totalUnits: unitsProduced,
        currentRate: productionRates[0] || 0,
        averageRate: productionRates.reduce((a, b) => a + b, 0) / (productionRates.length || 1),
        averageCycleTime: cycleTimes.reduce((a, b) => a + b, 0) / (cycleTimes.length || 1)
      };
    }

    // Get quality metrics
    if (query.includes('quality') || query.includes('defect') || query === 'all') {
      const qualityData = await prisma.metric.findMany({
        where: {
          name: {
            in: ['defect_rate', 'first_pass_yield', 'scrap_rate']
          },
          timestamp: {
            gte: startTime,
            lte: now
          },
          ...(equipment && { tags: { contains: equipment } })
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 100
      });

      const defectRates = qualityData.filter(m => m.name === 'defect_rate').map(m => m.value);
      const fpyValues = qualityData.filter(m => m.name === 'first_pass_yield').map(m => m.value);
      const scrapRates = qualityData.filter(m => m.name === 'scrap_rate').map(m => m.value);

      results.quality = {
        currentDefectRate: defectRates[0] || 0,
        averageDefectRate: defectRates.reduce((a, b) => a + b, 0) / (defectRates.length || 1),
        currentFPY: fpyValues[0] || 0,
        averageFPY: fpyValues.reduce((a, b) => a + b, 0) / (fpyValues.length || 1),
        currentScrapRate: scrapRates[0] || 0,
        averageScrapRate: scrapRates.reduce((a, b) => a + b, 0) / (scrapRates.length || 1)
      };
    }

    // Get equipment status
    if (query.includes('equipment') || query.includes('machine') || query.includes('down') || query === 'all') {
      const equipmentList = await prisma.equipment.findMany({
        where: equipment ? { name: { contains: equipment } } : {},
        include: {
          _count: {
            select: { maintenanceRecords: true }
          }
        }
      });

      results.equipment = equipmentList.map(eq => ({
        id: eq.id,
        name: eq.name,
        status: eq.status,
        type: eq.type,
        location: eq.location,
        maintenanceCount: eq._count.maintenanceRecords
      }));

      // Get recent downtime
      const downtimeData = await prisma.metric.findMany({
        where: {
          name: 'downtime_minutes',
          timestamp: {
            gte: startTime,
            lte: now
          },
          ...(equipment && { tags: { contains: equipment } })
        },
        orderBy: {
          timestamp: 'desc'
        },
        take: 50
      });

      const totalDowntime = downtimeData.reduce((sum, m) => sum + m.value, 0);
      results.downtime = {
        totalMinutes: totalDowntime,
        incidents: downtimeData.length,
        averagePerIncident: totalDowntime / (downtimeData.length || 1)
      };
    }

    return NextResponse.json({
      success: true,
      timeRange,
      startTime,
      endTime: now,
      data: results
    });

  } catch (error) {
    console.error('AI Metrics API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch metrics' 
      },
      { status: 500 }
    );
  }
}