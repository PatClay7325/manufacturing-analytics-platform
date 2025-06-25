import { NextRequest, NextResponse } from 'next/server';
import { serviceHealthMonitor } from '@/lib/monitoring/ServiceHealthMonitor';

export async function GET(request: NextRequest) {
  try {
    // Get all service statuses
    const statuses = serviceHealthMonitor.getAllStatuses();
    
    // Format response
    const response = {
      timestamp: new Date().toISOString(),
      services: statuses.map(status => ({
        name: status.name,
        status: status.status,
        lastChecked: status.lastChecked,
        responseTime: status.responseTime,
        error: status.error,
        url: status.url,
      })),
      summary: {
        total: statuses.length,
        up: statuses.filter(s => s.status === 'up').length,
        down: statuses.filter(s => s.status === 'down').length,
        unknown: statuses.filter(s => s.status === 'unknown').length,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error checking service health:', error);
    return NextResponse.json(
      { error: 'Failed to check service health' },
      { status: 500 }
    );
  }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';
