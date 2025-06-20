/**
 * Equipment Health API Route
 * Provides ISO 14224 compliant equipment health and reliability metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workUnitId = searchParams.get('workUnitId');
    const riskLevel = searchParams.get('riskLevel');

    // Build where clause
    const whereClause: any = {};
    
    if (workUnitId && workUnitId !== 'all') {
      whereClause.workUnitId = workUnitId;
    }
    
    if (riskLevel && riskLevel !== 'all') {
      whereClause.riskLevel = riskLevel;
    }

    // Get current equipment health status
    const equipmentHealth = await prisma.equipmentHealth.findMany({
      where: whereClause,
      include: {
        WorkUnit: {
          select: {
            id: true,
            name: true,
            code: true,
            equipmentType: true,
            status: true,
            location: true,
          }
        }
      },
      orderBy: {
        overallHealth: 'asc' // Worst health first
      }
    });

    // Get aggregated health metrics
    const aggregatedHealth = await prisma.equipmentHealth.aggregate({
      where: whereClause,
      _avg: {
        overallHealth: true,
        mechanicalHealth: true,
        electricalHealth: true,
        softwareHealth: true,
        mtbf: true,
        mttr: true,
        availability: true,
        reliability: true,
      },
      _count: {
        id: true,
      }
    });

    // Get health distribution by risk level
    const riskDistribution = await prisma.equipmentHealth.groupBy({
      by: ['riskLevel'],
      where: whereClause,
      _count: {
        id: true,
      },
      _avg: {
        overallHealth: true,
      }
    });

    // Get equipment requiring maintenance soon
    const maintenanceDue = await prisma.equipmentHealth.findMany({
      where: {
        ...whereClause,
        nextMaintenanceDue: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        }
      },
      include: {
        WorkUnit: {
          select: {
            name: true,
            code: true,
            equipmentType: true,
          }
        }
      },
      orderBy: {
        nextMaintenanceDue: 'asc'
      }
    });

    // Get recent maintenance records for context
    const recentMaintenance = await prisma.maintenanceRecord.findMany({
      where: {
        ...(workUnitId && workUnitId !== 'all' ? { workUnitId } : {}),
        startTime: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      include: {
        WorkUnit: {
          select: {
            name: true,
            code: true,
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      },
      take: 10
    });

    // Calculate MTBF and MTTR trends
    const reliabilityTrends = await prisma.maintenanceRecord.groupBy({
      by: ['workUnitId'],
      where: {
        ...(workUnitId && workUnitId !== 'all' ? { workUnitId } : {}),
        status: 'completed',
        endTime: {
          not: null
        }
      },
      _avg: {
        actualDuration: true,
        downtimeHours: true,
      },
      _count: {
        id: true,
      }
    });

    // Get failure mode distribution
    const failureModes = await prisma.maintenanceRecord.groupBy({
      by: ['failureMode'],
      where: {
        ...(workUnitId && workUnitId !== 'all' ? { workUnitId } : {}),
        maintenanceType: 'corrective',
        startTime: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
        }
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    // Get cost analysis
    const maintenanceCosts = await prisma.maintenanceRecord.aggregate({
      where: {
        ...(workUnitId && workUnitId !== 'all' ? { workUnitId } : {}),
        startTime: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      _sum: {
        totalCost: true,
        partsCost: true,
        laborCost: true,
      },
      _avg: {
        totalCost: true,
      },
      _count: {
        id: true,
      }
    });

    // Equipment status overview
    const statusOverview = await prisma.workUnit.groupBy({
      by: ['status'],
      where: workUnitId && workUnitId !== 'all' ? { id: workUnitId } : {},
      _count: {
        id: true,
      }
    });

    const response = {
      equipmentHealth: equipmentHealth.map(eq => ({
        id: eq.id,
        workUnit: eq.WorkUnit,
        overallHealth: eq.overallHealth,
        mechanicalHealth: eq.mechanicalHealth,
        electricalHealth: eq.electricalHealth,
        softwareHealth: eq.softwareHealth,
        mtbf: eq.mtbf,
        mttr: eq.mttr,
        availability: eq.availability,
        reliability: eq.reliability,
        totalFailures: eq.totalFailures,
        criticalFailures: eq.criticalFailures,
        riskLevel: eq.riskLevel,
        nextMaintenanceDue: eq.nextMaintenanceDue,
        vibrationLevel: eq.vibrationLevel,
        temperature: eq.temperature,
        lubricationStatus: eq.lubricationStatus,
        wearLevel: eq.wearLevel,
        lastCalculated: eq.lastCalculated,
      })),
      aggregated: {
        avgOverallHealth: aggregatedHealth._avg.overallHealth,
        avgMechanicalHealth: aggregatedHealth._avg.mechanicalHealth,
        avgElectricalHealth: aggregatedHealth._avg.electricalHealth,
        avgSoftwareHealth: aggregatedHealth._avg.softwareHealth,
        avgMTBF: aggregatedHealth._avg.mtbf,
        avgMTTR: aggregatedHealth._avg.mttr,
        avgAvailability: aggregatedHealth._avg.availability,
        avgReliability: aggregatedHealth._avg.reliability,
        totalEquipment: aggregatedHealth._count.id,
      },
      riskDistribution: riskDistribution.map(risk => ({
        riskLevel: risk.riskLevel,
        count: risk._count.id,
        avgHealth: risk._avg.overallHealth,
      })),
      maintenanceDue: maintenanceDue.map(eq => ({
        workUnit: eq.WorkUnit,
        nextMaintenanceDue: eq.nextMaintenanceDue,
        maintenanceScore: eq.maintenanceScore,
        riskLevel: eq.riskLevel,
        overallHealth: eq.overallHealth,
      })),
      recentMaintenance: recentMaintenance.map(maintenance => ({
        id: maintenance.id,
        workUnit: maintenance.WorkUnit,
        maintenanceType: maintenance.maintenanceType,
        description: maintenance.description,
        startTime: maintenance.startTime,
        endTime: maintenance.endTime,
        status: maintenance.status,
        totalCost: maintenance.totalCost,
        effectiveness: maintenance.effectiveness,
      })),
      failureModes: failureModes.map(mode => ({
        failureMode: mode.failureMode,
        count: mode._count.id,
      })),
      maintenanceCosts: {
        totalCost: maintenanceCosts._sum.totalCost,
        totalPartsCost: maintenanceCosts._sum.partsCost,
        totalLaborCost: maintenanceCosts._sum.laborCost,
        avgCostPerJob: maintenanceCosts._avg.totalCost,
        totalJobs: maintenanceCosts._count.id,
      },
      statusOverview: statusOverview.map(status => ({
        status: status.status,
        count: status._count.id,
      })),
      metadata: {
        timestamp: new Date(),
        filters: {
          workUnitId,
          riskLevel,
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching equipment health metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment health metrics' },
      { status: 500 }
    );
  }
}