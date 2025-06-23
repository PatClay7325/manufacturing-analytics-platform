import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Find the alert by ID from database
    const alert = await prisma.alert.findUnique({
      where: { id },
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
    
    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Transform to match expected format
    const transformedAlert = {
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
    };
    
    return NextResponse.json(transformedAlert);
  } catch (error) {
    console.error('Error fetching alert:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    // Special handling for acknowledging and resolving
    const updateData: any = { ...data };
    if (data.status === 'acknowledged' && !data.acknowledgedAt) {
      updateData.acknowledgedAt = new Date();
    } else if (data.status === 'resolved' && !data.resolvedAt) {
      updateData.resolvedAt = new Date();
    }
    
    // Update alert in database
    const updatedAlert = await prisma.alert.update({
      where: { id },
      data: updateData,
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
    
    return NextResponse.json(updatedAlert);
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Delete alert from database
    await prisma.alert.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json(
      { error: 'Failed to delete alert' },
      { status: 500 }
    );
  }
}