import { NextRequest, NextResponse } from 'next/server';
import { Alert } from '@/models/alert';

// Sample data - importing from parent route to keep consistency
import { alertsData } from '../route';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  
  // Find the alert by ID
  const alert = alertsData.find(a => a.id === id);
  
  if (!alert) {
    return NextResponse.json(
      { error: 'Alert not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(alert);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const data = await request.json();
    
    // Check if alert exists
    const alertIndex = alertsData.findIndex(a => a.id === id);
    if (alertIndex === -1) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }
    
    // Special handling for acknowledging and resolving
    if (data.status === 'acknowledged' && !data.acknowledgedAt) {
      data.acknowledgedAt = new Date().toISOString();
    } else if (data.status === 'resolved' && !data.resolvedAt) {
      data.resolvedAt = new Date().toISOString();
    }
    
    // Update alert
    const updatedAlert = {
      ...alertsData[alertIndex],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    // Actually update our mock data for the session
    alertsData[alertIndex] = updatedAlert;
    
    return NextResponse.json(updatedAlert);
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
  
  // Check if alert exists
  const alertIndex = alertsData.findIndex(a => a.id === id);
  if (alertIndex === -1) {
    return NextResponse.json(
      { error: 'Alert not found' },
      { status: 404 }
    );
  }
  
  // Actually delete from our mock data for the session
  alertsData.splice(alertIndex, 1);
  
  return NextResponse.json({ success: true });
}