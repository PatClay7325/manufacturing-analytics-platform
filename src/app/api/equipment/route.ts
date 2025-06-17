import { NextRequest, NextResponse } from 'next/server';
import { Equipment } from '@/models/equipment';
import { withCache } from '@/lib/apiCache';

// Sample data - exported to share with dynamic route handler
export const equipmentData: Equipment[] = [
  {
    id: '1',
    name: 'Assembly Line A',
    type: 'Assembly',
    manufacturer: 'AL Industries',
    serialNumber: 'SN123456789',
    installationDate: new Date('2023-01-15').toISOString(),
    status: 'operational',
    location: 'Building 3, Floor 1',
    notes: 'Main assembly line for product series X',
    model: 'AL-5000',
    lastMaintenanceDate: new Date('2024-05-01').toISOString(),
    createdAt: new Date('2023-01-10').toISOString(),
    updatedAt: new Date('2025-06-01').toISOString()
  },
  {
    id: '2',
    name: 'CNC Machine B',
    type: 'Machining',
    manufacturer: 'CNC Precision Ltd',
    serialNumber: 'SN987654321',
    installationDate: new Date('2022-11-20').toISOString(),
    status: 'maintenance',
    location: 'Building 2, Floor 2',
    notes: 'Precision CNC machine for metal components',
    model: 'CNC-X200',
    lastMaintenanceDate: new Date('2025-06-01').toISOString(),
    createdAt: new Date('2022-11-15').toISOString(),
    updatedAt: new Date('2025-06-01').toISOString()
  },
  {
    id: '3',
    name: 'Packaging Robot C',
    type: 'Packaging',
    manufacturer: 'PackBot Inc',
    serialNumber: 'SN456789123',
    installationDate: new Date('2024-02-10').toISOString(),
    status: 'operational',
    location: 'Building 1, Floor 1',
    notes: 'Automated packaging robot for final product packaging',
    model: 'PackBot-3000',
    lastMaintenanceDate: new Date('2025-05-15').toISOString(),
    createdAt: new Date('2024-02-05').toISOString(),
    updatedAt: new Date('2025-05-15').toISOString()
  }
];

export async function GET(request: NextRequest) {
  // Check for ID parameter in the URL
  const id = request.nextUrl.searchParams.get('id');
  
  if (id) {
    // Use cache for single equipment response
    return withCache(`equipment-${id}`, async () => {
      // Return single equipment if ID is provided
      const equipment = equipmentData.find(e => e.id === id);
      
      if (!equipment) {
        return NextResponse.json(
          { error: 'Equipment not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(equipment);
    });
  }
  
  // Use cache for all equipment response
  return withCache('equipment-all', async () => {
    // Return all equipment if no ID is provided
    return NextResponse.json(equipmentData);
  });
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.type || !data.manufacturer || !data.serialNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Mock creating a new equipment
    const newEquipment: Equipment = {
      id: `${equipmentData.length + 1}`,
      name: data.name,
      type: data.type,
      manufacturer: data.manufacturer,
      serialNumber: data.serialNumber,
      installationDate: data.installationDate || new Date().toISOString(),
      status: data.status || 'operational',
      location: data.location,
      notes: data.notes,
      model: data.model,
      lastMaintenanceDate: data.lastMaintenanceDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Actually save to our mock data for the session
    equipmentData.push(newEquipment);
    
    return NextResponse.json(newEquipment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate ID
    if (!data.id) {
      return NextResponse.json(
        { error: 'Equipment ID is required' },
        { status: 400 }
      );
    }
    
    // Check if equipment exists
    const equipmentIndex = equipmentData.findIndex(e => e.id === data.id);
    if (equipmentIndex === -1) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }
    
    // Mock updating equipment
    const updatedEquipment = {
      ...equipmentData[equipmentIndex],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    // Actually update our mock data for the session
    equipmentData[equipmentIndex] = updatedEquipment;
    
    return NextResponse.json(updatedEquipment);
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}