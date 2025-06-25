/**
 * Equipment Health API Route
 * Provides equipment health metrics for manufacturing dashboards
 * Uses dynamic schema introspection to handle field variations
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { 
  getCachedModelIntrospection, 
  resolveFieldName, 
  normalizeQueryResult,
  combineFieldValues
} from '@/lib/schema-introspection';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workCenterId = searchParams.get('workCenterId');
    const riskLevel = searchParams.get('riskLevel');

    // Get dynamic schema introspection for EquipmentHealth model
    const modelIntrospection = await getCachedModelIntrospection('equipmentHealth');

    // Build where clause
    const whereClause: any = {};
    
    if (workCenterId && workCenterId !== 'all') {
      whereClause.workCenterId = workCenterId;
    }
    
    if (riskLevel && riskLevel !== 'all') {
      whereClause.riskLevel = riskLevel;
    }

    // Get equipment health records
    const equipmentHealthRecords = await prisma.equipmentHealth.findMany({
      where: whereClause,
      orderBy: {
        overallHealth: 'asc' // Worst health first
      },
      take: 50, // Limit for performance
    });

    // If no equipment health records exist, return empty data structure
    if (!equipmentHealthRecords || equipmentHealthRecords.length === 0) {
      return NextResponse.json({
        equipment: [],
        summary: {
          totalEquipment: 0,
          healthyCount: 0,
          warningCount: 0,
          criticalCount: 0,
          averageHealth: 0
        },
        metadata: {
          totalRecords: 0,
          schemaInfo: {
            availableFields: modelIntrospection.availableFields,
            resolvedFields: {}
          }
        }
      });
    }

    // Normalize results
    const normalizedRecords = normalizeQueryResult(equipmentHealthRecords, modelIntrospection);

    // Process equipment health data
    const equipmentData = normalizedRecords.map((record: any, index: number) => {
      const overallHealth = combineFieldValues(record, ['overallHealth', 'healthScore'], 0.85);
      const operationalStatus = combineFieldValues(record, ['operationalStatus', 'status'], 'GOOD');
      
      return {
        id: record.id || `equipment-${index}`,
        workCenter: { name: `Equipment ${index + 1}`, code: `EQ-${index + 1}` },
        overallHealth: overallHealth,
        status: operationalStatus,
        mechanicalHealth: combineFieldValues(record, ['mechanicalHealth'], 0.9),
        electricalHealth: combineFieldValues(record, ['electricalHealth'], 0.9),
        hydraulicHealth: combineFieldValues(record, ['hydraulicHealth'], 0.9),
        vibrationLevel: combineFieldValues(record, ['vibrationLevel'], 1.0),
        temperatureLevel: combineFieldValues(record, ['temperatureLevel'], 75),
        mtbf: combineFieldValues(record, ['mtbf'], 150),
        mttr: combineFieldValues(record, ['mttr'], 2),
        lastMaintenanceDate: record.lastMaintenanceDate || new Date(),
        nextMaintenanceDate: record.nextMaintenanceDate || new Date(),
        riskLevel: combineFieldValues(record, ['riskLevel'], 'LOW'),
      };
    });

    // Calculate summary statistics
    const totalEquipment = equipmentData.length;
    const healthyCount = equipmentData.filter(eq => eq.overallHealth > 0.8).length;
    const warningCount = equipmentData.filter(eq => eq.overallHealth > 0.6 && eq.overallHealth <= 0.8).length;
    const criticalCount = equipmentData.filter(eq => eq.overallHealth <= 0.6).length;
    const averageHealth = equipmentData.reduce((sum, eq) => sum + eq.overallHealth, 0) / totalEquipment;

    // Get aggregated health metrics
    const aggregatedHealth = await prisma.equipmentHealth.aggregate({
      where: whereClause,
      _avg: {
        overallHealth: true,
        mechanicalHealth: true,
        electricalHealth: true,
        mtbf: true,
        mttr: true,
      },
      _count: {
        id: true,
      }
    });

    const response = {
      equipment: equipmentData,
      summary: {
        totalEquipment,
        healthyCount,
        warningCount,
        criticalCount,
        averageHealth: Number(averageHealth.toFixed(3))
      },
      aggregated: {
        avgOverallHealth: aggregatedHealth._avg.overallHealth || 0,
        avgMechanicalHealth: aggregatedHealth._avg.mechanicalHealth || 0,
        avgElectricalHealth: aggregatedHealth._avg.electricalHealth || 0,
        avgMTBF: aggregatedHealth._avg.mtbf || 0,
        avgMTTR: aggregatedHealth._avg.mttr || 0,
        totalEquipment: aggregatedHealth._count.id || 0,
      },
      metadata: {
        totalRecords: normalizedRecords.length,
        filters: {
          workCenterId,
          riskLevel,
        },
        schemaInfo: {
          availableFields: modelIntrospection.availableFields,
          resolvedFields: {
            overallHealth: resolveFieldName('overallHealth', modelIntrospection),
            operationalStatus: resolveFieldName('operationalStatus', modelIntrospection)
          }
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching equipment health:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment health', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}