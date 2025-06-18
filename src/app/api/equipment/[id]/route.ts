import { NextRequest, NextResponse } from 'next/server';
import { Equipment } from '@/models/equipment';

// Sample data - importing from parent route to keep consistency
import { equipmentData } from '../route';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  
  // Find the equipment by ID
  const equipment = equipmentData.find(e => e.id === id);
  
  if (!equipment) {
    return NextResponse.json(
      { error: 'Equipment not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(equipment);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const data = await request.json();
    
    // Check if equipment exists
    const equipmentIndex = equipmentData.findIndex(e => e.id === id);
    if (equipmentIndex === -1) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }
    
    // Update equipment
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  
  // Check if equipment exists
  const equipmentIndex = equipmentData.findIndex(e => e.id === id);
  if (equipmentIndex === -1) {
    return NextResponse.json(
      { error: 'Equipment not found' },
      { status: 404 }
    );
  }
  
  // Actually delete from our mock data for the session
  equipmentData.splice(equipmentIndex, 1);
  
  return NextResponse.json({ success: true });
}