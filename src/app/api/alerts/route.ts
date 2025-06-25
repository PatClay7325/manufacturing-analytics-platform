import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

// GET all alerts with filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const alertType = searchParams.get('type');
    const workUnitId = searchParams.get('workUnitId');
    const workCenterId = searchParams.get('workCenterId');
    const areaId = searchParams.get('areaId');
    const siteId = searchParams.get('siteId');
    const limit = searchParams.get('limit');

    // Build where clause based on filters
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (severity) {
      where.severity = severity;
    }
    
    if (alertType) {
      where.alertType = alertType;
    }
    
    if (workUnitId) {
      where.workUnitId = workUnitId;
    }
    
    if (workCenterId) {
      where.workUnit = {
        workCenterId: workCenterId
      };
    }
    
    if (areaId) {
      where.workUnit = {
        workCenter: {
          areaId: areaId
        }
      };
    }
    
    if (siteId) {
      where.workUnit = {
        workCenter: {
          area: {
            siteId: siteId
          }
        }
      };
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        workUnit: {
          include: {
            workCenter: {
              include: {
                area: {
                  include: {
                    site: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { severity: 'desc' },
        { timestamp: 'desc' }
      ],
      take: limit ? parseInt(limit) : 100
    });

    // Transform to match expected format
    const transformedAlerts = alerts.map(alert => ({
      id: alert.id,
      type: alert.alertType,
      severity: alert.severity,
      message: alert.message,
      status: alert.status,
      timestamp: alert.timestamp.toISOString(),
      acknowledgedBy: alert.acknowledgedBy,
      acknowledgedAt: alert.acknowledgedAt?.toISOString(),
      resolvedBy: alert.resolvedBy,
      resolvedAt: alert.resolvedAt?.toISOString(),
      notes: alert.notes,
      
      // Equipment/WorkUnit info
      equipmentId: alert.workUnitId,
      equipmentName: alert.workUnit.name,
      equipmentType: alert.workUnit.equipmentType,
      equipmentStatus: alert.workUnit.status,
      
      // Hierarchical context
      workUnitId: alert.workUnitId,
      workUnitName: alert.workUnit.name,
      workCenterId: alert.workUnit.workCenterId,
      workCenterName: alert.workUnit.workCenter.name,
      areaId: alert.workUnit.workCenter.areaId,
      areaName: alert.workUnit.workCenter.area.name,
      siteId: alert.workUnit.workCenter.area.siteId,
      siteName: alert.workUnit.workCenter.area.site.name,
      
      // Full location path
      location: `${alert.workUnit.workCenter.area.site.name} > ${alert.workUnit.workCenter.area.name} > ${alert.workUnit.workCenter.name} > ${alert.workUnit.name}`,
      
      createdAt: alert.createdAt.toISOString(),
      updatedAt: alert.updatedAt.toISOString()
    }));

    return NextResponse.json(transformedAlerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

// POST new alert
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.workUnitId && !data.equipmentId) {
      return NextResponse.json(
        { error: 'workUnitId or equipmentId is required' },
        { status: 400 }
      );
    }
    
    const alert = await prisma.alert.create({
      data: {
        workUnitId: data.workUnitId || data.equipmentId,
        alertType: data.type || data.alertType || 'maintenance',
        severity: data.severity || 'medium',
        message: data.message,
        status: data.status || 'active',
        notes: data.notes
      },
      include: {
        workUnit: {
          include: {
            workCenter: {
              include: {
                area: {
                  include: {
                    site: true
                  }
                }
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      id: alert.id,
      type: alert.alertType,
      severity: alert.severity,
      message: alert.message,
      status: alert.status,
      timestamp: alert.timestamp.toISOString(),
      equipmentId: alert.workUnitId,
      equipmentName: alert.workUnit.name,
      location: `${alert.workUnit.workCenter.area.site.name} > ${alert.workUnit.workCenter.area.name} > ${alert.workUnit.workCenter.name} > ${alert.workUnit.name}`,
      createdAt: alert.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}