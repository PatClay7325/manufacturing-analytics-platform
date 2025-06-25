import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

// Sample equipment data for development/testing when database is not available
export const equipmentData = [
  {
    id: 'eq-001',
    name: 'CNC Machine #1',
    serialNumber: 'CNC001',
    model: 'DMU 50',
    manufacturer: 'DMG MORI',
    type: 'CNC',
    location: 'Production Floor A',
    department: 'Manufacturing',
    installationDate: '2023-01-15T00:00:00.000Z',
    lastMaintenanceDate: '2024-01-10T00:00:00.000Z',
    nextMaintenanceDate: '2024-02-10T00:00:00.000Z',
    status: 'operational',
    specifications: {},
    metrics: [],
    maintenanceHistory: [],
    tags: [],
    createdAt: '2023-01-15T00:00:00.000Z',
    updatedAt: '2024-01-10T00:00:00.000Z',
    workCenterId: 'wc-001',
    workCenterName: 'Machining Center 1',
    areaId: 'area-001',
    areaName: 'Production Area A',
    siteId: 'site-001',
    siteName: 'Main Factory',
    oee: 85.5,
    availability: 95.2,
    performance: 89.8,
    quality: 97.1,
    activeAlerts: 0,
    recentQualityMetrics: []
  },
  {
    id: 'eq-002',
    name: 'Assembly Line #2',
    serialNumber: 'ASM002',
    model: 'AL-2000',
    manufacturer: 'AutoTech',
    type: 'Assembly',
    location: 'Production Floor B',
    department: 'Assembly',
    installationDate: '2023-02-20T00:00:00.000Z',
    lastMaintenanceDate: '2024-01-05T00:00:00.000Z',
    nextMaintenanceDate: '2024-02-05T00:00:00.000Z',
    status: 'maintenance',
    specifications: {},
    metrics: [],
    maintenanceHistory: [],
    tags: [],
    createdAt: '2023-02-20T00:00:00.000Z',
    updatedAt: '2024-01-05T00:00:00.000Z',
    workCenterId: 'wc-002',
    workCenterName: 'Assembly Line 2',
    areaId: 'area-002',
    areaName: 'Assembly Area B',
    siteId: 'site-001',
    siteName: 'Main Factory',
    oee: 72.3,
    availability: 85.5,
    performance: 84.6,
    quality: 99.8,
    activeAlerts: 2,
    recentQualityMetrics: []
  }
];

// GET all work units (equipment)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const workCenterId = searchParams.get('workCenterId');
    const areaId = searchParams.get('areaId');
    const siteId = searchParams.get('siteId');

    // Build where clause based on filters
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (type) {
      where.equipmentType = type;
    }
    
    if (workCenterId) {
      where.workCenterId = workCenterId;
    }
    
    if (areaId) {
      where.workCenter = {
        areaId: areaId
      };
    }
    
    if (siteId) {
      where.workCenter = {
        area: {
          siteId: siteId
        }
      };
    }

    const workUnits = await prisma.workUnit.findMany({
      where,
      include: {
        workCenter: {
          include: {
            area: {
              include: {
                site: true
              }
            }
          }
        },
        kpiSummary: true,
        maintenanceRecords: {
          orderBy: {
            startTime: 'desc'
          },
          take: 5
        },
        alerts: {
          where: {
            status: 'active'
          }
        },
        qualityMetrics: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 10
        }
      }
    });

    // Transform to match existing equipment interface
    const equipment = workUnits.map(unit => ({
      id: unit.id,
      name: unit.name,
      serialNumber: unit.serialNumber,
      model: unit.model,
      manufacturer: unit.manufacturerCode,
      type: unit.equipmentType,
      location: unit.location || `${unit.workCenter.area.site.name} - ${unit.workCenter.area.name} - ${unit.workCenter.name}`,
      department: unit.workCenter.area.name,
      installationDate: unit.installationDate.toISOString(),
      lastMaintenanceDate: unit.lastMaintenanceAt?.toISOString(),
      nextMaintenanceDate: unit.maintenanceRecords.find(m => m.status === 'scheduled')?.startTime.toISOString(),
      status: unit.status,
      specifications: {}, // Could be stored as JSON in description field
      metrics: [], // Would need to be fetched from metrics table
      maintenanceHistory: unit.maintenanceRecords.map(record => ({
        id: record.id,
        type: record.maintenanceType,
        scheduledDate: record.startTime.toISOString(),
        completedDate: record.endTime?.toISOString(),
        description: record.description,
        status: record.status,
        technician: record.technician,
        notes: record.notes,
        parts: record.parts || []
      })),
      tags: [], // Could be implemented later
      createdAt: unit.createdAt.toISOString(),
      updatedAt: unit.updatedAt.toISOString(),
      // Additional hierarchical context
      workCenterId: unit.workCenterId,
      workCenterName: unit.workCenter.name,
      areaId: unit.workCenter.areaId,
      areaName: unit.workCenter.area.name,
      siteId: unit.workCenter.area.siteId,
      siteName: unit.workCenter.area.site.name,
      // KPI data
      oee: unit.kpiSummary?.oee,
      availability: unit.kpiSummary?.availability,
      performance: unit.kpiSummary?.performance,
      quality: unit.kpiSummary?.quality,
      activeAlerts: unit.alerts.length,
      recentQualityMetrics: unit.qualityMetrics
    }));

    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Error fetching work units:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}

// POST new work unit (equipment)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const workUnit = await prisma.workUnit.create({
      data: {
        workCenterId: data.workCenterId,
        name: data.name,
        code: data.code,
        equipmentType: data.type || data.equipmentType,
        model: data.model,
        serialNumber: data.serialNumber,
        manufacturerCode: data.manufacturer || data.manufacturerCode,
        installationDate: new Date(data.installationDate),
        status: data.status || 'operational',
        location: data.location,
        description: data.description
      },
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
    });

    return NextResponse.json({
      id: workUnit.id,
      name: workUnit.name,
      serialNumber: workUnit.serialNumber,
      model: workUnit.model,
      manufacturer: workUnit.manufacturerCode,
      type: workUnit.equipmentType,
      location: workUnit.location || `${workUnit.workCenter.area.site.name} - ${workUnit.workCenter.area.name} - ${workUnit.workCenter.name}`,
      department: workUnit.workCenter.area.name,
      installationDate: workUnit.installationDate.toISOString(),
      status: workUnit.status,
      createdAt: workUnit.createdAt.toISOString(),
      updatedAt: workUnit.updatedAt.toISOString()
    });
  } catch (error) {
    console.error('Error creating work unit:', error);
    return NextResponse.json(
      { error: 'Failed to create equipment' },
      { status: 500 }
    );
  }
}