import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Mock datasources for health checking
const datasources = [
  {
    uid: 'prometheus-default',
    name: 'Prometheus',
    type: 'prometheus',
    url: 'http://localhost:9090'
  },
  {
    uid: 'timescaledb-metrics',
    name: 'TimescaleDB Metrics',
    type: 'postgres',
    url: 'postgresql://localhost:5433/manufacturing_metrics'
  },
  {
    uid: 'influxdb-sensors',
    name: 'InfluxDB Sensors',
    type: 'influxdb',
    url: 'http://localhost:8086'
  },
  {
    uid: 'postgres-production',
    name: 'Production Database',
    type: 'postgres',
    url: 'postgresql://localhost:5433/production'
  },
  {
    uid: 'elasticsearch-logs',
    name: 'Equipment Logs',
    type: 'elasticsearch',
    url: 'http://localhost:9200'
  }
];

// POST /api/datasources/health
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'view:dashboards');
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json(
        { error: 'Datasource UID is required' },
        { status: 400 }
      );
    }

    const datasource = datasources.find(ds => ds.uid === uid);
    
    if (!datasource) {
      return NextResponse.json(
        { error: 'Datasource not found' },
        { status: 404 }
      );
    }

    // Mock health check - in real implementation, this would actually test the connection
    const isHealthy = Math.random() > 0.1; // 90% success rate for demo
    
    if (isHealthy) {
      return NextResponse.json({
        status: 'success',
        message: `Successfully connected to ${datasource.name}`,
        details: {
          version: getVersionForType(datasource.type),
          responseTime: Math.floor(Math.random() * 100) + 10 // 10-110ms
        }
      });
    } else {
      return NextResponse.json({
        status: 'error',
        message: `Failed to connect to ${datasource.name}`,
        details: {
          error: 'Connection timeout after 5 seconds'
        }
      }, { status: 503 });
    }

  } catch (error) {
    console.error('Datasource health check failed:', error);
    return NextResponse.json(
      { error: 'Health check failed' },
      { status: 500 }
    );
  }
}

function getVersionForType(type: string): string {
  switch (type) {
    case 'prometheus': return '2.45.0';
    case 'postgres': return '14.9';
    case 'influxdb': return '1.8.10';
    case 'elasticsearch': return '7.17.0';
    case 'mysql': return '8.0.34';
    default: return 'unknown';
  }
}