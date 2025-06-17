import { NextRequest, NextResponse } from 'next/server';
import { Alert } from '@/models/alert';

// Sample data
const alertsData: Alert[] = [
  {
    id: '1',
    equipmentId: '1',
    alertType: 'maintenance',
    severity: 'medium',
    message: 'Scheduled maintenance due in 3 days',
    status: 'active',
    timestamp: new Date('2025-06-15T09:30:00Z').toISOString(),
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedBy: null,
    resolvedAt: null,
    notes: 'Regular quarterly maintenance',
    createdAt: new Date('2025-06-15T09:30:00Z').toISOString(),
    updatedAt: new Date('2025-06-15T09:30:00Z').toISOString()
  },
  {
    id: '2',
    equipmentId: '2',
    alertType: 'performance',
    severity: 'high',
    message: 'OEE below threshold (65%)',
    status: 'active',
    timestamp: new Date('2025-06-16T14:22:00Z').toISOString(),
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedBy: null,
    resolvedAt: null,
    notes: 'Investigate performance drop urgently',
    createdAt: new Date('2025-06-16T14:22:00Z').toISOString(),
    updatedAt: new Date('2025-06-16T14:22:00Z').toISOString()
  },
  {
    id: '3',
    equipmentId: '3',
    alertType: 'quality',
    severity: 'low',
    message: 'Minor quality deviation detected',
    status: 'acknowledged',
    timestamp: new Date('2025-06-17T08:45:00Z').toISOString(),
    acknowledgedBy: 'user1',
    acknowledgedAt: new Date('2025-06-17T09:15:00Z').toISOString(),
    resolvedBy: null,
    resolvedAt: null,
    notes: 'Investigating cause of quality deviation',
    createdAt: new Date('2025-06-17T08:45:00Z').toISOString(),
    updatedAt: new Date('2025-06-17T09:15:00Z').toISOString()
  },
  {
    id: '4',
    equipmentId: '1',
    alertType: 'safety',
    severity: 'critical',
    message: 'Emergency stop triggered',
    status: 'resolved',
    timestamp: new Date('2025-06-16T11:20:00Z').toISOString(),
    acknowledgedBy: 'user2',
    acknowledgedAt: new Date('2025-06-16T11:22:00Z').toISOString(),
    resolvedBy: 'user2',
    resolvedAt: new Date('2025-06-16T11:45:00Z').toISOString(),
    notes: 'False alarm, system reset and operational',
    createdAt: new Date('2025-06-16T11:20:00Z').toISOString(),
    updatedAt: new Date('2025-06-16T11:45:00Z').toISOString()
  }
];

export async function GET(request: NextRequest) {
  // Check for ID parameter in the URL
  const id = request.nextUrl.searchParams.get('id');
  
  // Check for status filter
  const status = request.nextUrl.searchParams.get('status');
  
  if (id) {
    // Return single alert if ID is provided
    const alert = alertsData.find(a => a.id === id);
    
    if (!alert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(alert);
  }
  
  // Filter by status if provided
  if (status) {
    const filteredAlerts = alertsData.filter(a => a.status === status);
    return NextResponse.json(filteredAlerts);
  }
  
  // Return all alerts if no filters are provided
  return NextResponse.json(alertsData);
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.alertType || !data.severity || !data.message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Mock creating a new alert
    const newAlert: Alert = {
      id: `${alertsData.length + 1}`,
      equipmentId: data.equipmentId || null,
      alertType: data.alertType,
      severity: data.severity,
      message: data.message,
      status: data.status || 'active',
      timestamp: data.timestamp || new Date().toISOString(),
      acknowledgedBy: data.acknowledgedBy || null,
      acknowledgedAt: data.acknowledgedAt || null,
      resolvedBy: data.resolvedBy || null,
      resolvedAt: data.resolvedAt || null,
      notes: data.notes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // In a real app, this would save to a database
    // alertsData.push(newAlert);
    
    return NextResponse.json(newAlert, { status: 201 });
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
        { error: 'Alert ID is required' },
        { status: 400 }
      );
    }
    
    // Check if alert exists
    const alertIndex = alertsData.findIndex(a => a.id === data.id);
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
    
    // Mock updating alert
    const updatedAlert = {
      ...alertsData[alertIndex],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    // In a real app, this would update the database
    // alertsData[alertIndex] = updatedAlert;
    
    return NextResponse.json(updatedAlert);
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}