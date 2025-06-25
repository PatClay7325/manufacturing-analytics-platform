import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Mock datasources - in a real implementation, these would come from a database
const datasources = [
  {
    uid: 'prometheus-default',
    name: 'Prometheus',
    type: 'prometheus',
    url: 'http://localhost:9090',
    access: 'proxy',
    isDefault: true,
    readOnly: false,
    basicAuth: false,
    withCredentials: false,
    jsonData: {
      httpMethod: 'GET',
      manageAlerts: true,
      alertmanagerUid: 'alertmanager-default'
    },
    secureJsonFields: {},
    version: 1,
    created: new Date('2024-01-01T00:00:00Z'),
    updated: new Date('2024-01-01T00:00:00Z')
  },
  {
    uid: 'timescaledb-metrics',
    name: 'TimescaleDB Metrics',
    type: 'postgres',
    url: 'postgresql://localhost:5432/manufacturing_metrics',
    access: 'proxy',
    isDefault: false,
    readOnly: false,
    basicAuth: false,
    withCredentials: false,
    database: 'manufacturing_metrics',
    user: 'analyticsPlatform',
    jsonData: {
      sslmode: 'disable',
      maxOpenConns: 0,
      maxIdleConns: 2,
      connMaxLifetime: 14400,
      postgresVersion: 1300,
      timescaledb: true
    },
    secureJsonFields: {
      password: true
    },
    version: 1,
    created: new Date('2024-01-01T00:00:00Z'),
    updated: new Date('2024-01-01T00:00:00Z')
  },
  {
    uid: 'influxdb-sensors',
    name: 'InfluxDB Sensors',
    type: 'influxdb',
    url: 'http://localhost:8086',
    access: 'proxy',
    isDefault: false,
    readOnly: false,
    basicAuth: false,
    withCredentials: false,
    database: 'manufacturing_sensors',
    user: 'analyticsPlatform',
    jsonData: {
      httpMode: 'GET',
      keepCookies: []
    },
    secureJsonFields: {
      password: true
    },
    version: 1,
    created: new Date('2024-01-01T00:00:00Z'),
    updated: new Date('2024-01-01T00:00:00Z')
  },
  {
    uid: 'postgres-production',
    name: 'Production Database',
    type: 'postgres',
    url: 'postgresql://localhost:5432/production',
    access: 'proxy',
    isDefault: false,
    readOnly: true,
    basicAuth: false,
    withCredentials: false,
    database: 'production',
    user: 'readonly',
    jsonData: {
      sslmode: 'prefer',
      maxOpenConns: 5,
      maxIdleConns: 2,
      connMaxLifetime: 14400,
      postgresVersion: 1400,
      timescaledb: false
    },
    secureJsonFields: {
      password: true
    },
    version: 1,
    created: new Date('2024-01-01T00:00:00Z'),
    updated: new Date('2024-01-01T00:00:00Z')
  },
  {
    uid: 'elasticsearch-logs',
    name: 'Equipment Logs',
    type: 'elasticsearch',
    url: 'http://localhost:9200',
    access: 'proxy',
    isDefault: false,
    readOnly: true,
    basicAuth: false,
    withCredentials: false,
    jsonData: {
      index: 'manufacturing-logs-*',
      timeField: '@timestamp',
      esVersion: '7.10.0',
      maxConcurrentShardRequests: 5,
      logMessageField: 'message',
      logLevelField: 'level'
    },
    secureJsonFields: {},
    version: 1,
    created: new Date('2024-01-01T00:00:00Z'),
    updated: new Date('2024-01-01T00:00:00Z')
  }
];

// GET /api/datasources/:uid
export async function GET(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const authResult = await requireAuth(request, 'view:dashboards');
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const datasource = datasources.find(ds => ds.uid === params.uid);
    
    if (!datasource) {
      return NextResponse.json(
        { error: 'Datasource not found' },
        { status: 404 }
      );
    }

    // Remove sensitive information
    const { secureJsonFields, ...safeDatasource } = datasource;

    return NextResponse.json({ datasource: safeDatasource });

  } catch (error) {
    console.error('Failed to fetch datasource:', error);
    return NextResponse.json(
      { error: 'Failed to fetch datasource' },
      { status: 500 }
    );
  }
}

// PUT /api/datasources/:uid
export async function PUT(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const authResult = await requireAuth(request, 'admin:datasources');
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const datasourceIndex = datasources.findIndex(ds => ds.uid === params.uid);
    
    if (datasourceIndex === -1) {
      return NextResponse.json(
        { error: 'Datasource not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const existingDatasource = datasources[datasourceIndex];

    // Merge the updates with existing datasource
    const updatedDatasource = {
      ...existingDatasource,
      ...body,
      uid: existingDatasource.uid, // Prevent UID change
      version: existingDatasource.version + 1,
      updated: new Date()
    };

    // If this is marked as default, unset other defaults of the same type
    if (body.isDefault && body.isDefault !== existingDatasource.isDefault) {
      datasources.forEach(ds => {
        if (ds.type === updatedDatasource.type && ds.uid !== updatedDatasource.uid) {
          ds.isDefault = false;
        }
      });
    }

    datasources[datasourceIndex] = updatedDatasource;

    // Remove sensitive information from response
    const { secureJsonFields, ...safeDatasource } = updatedDatasource;

    return NextResponse.json({ 
      datasource: safeDatasource,
      message: 'Datasource updated successfully'
    });

  } catch (error) {
    console.error('Failed to update datasource:', error);
    return NextResponse.json(
      { error: 'Failed to update datasource' },
      { status: 500 }
    );
  }
}

// DELETE /api/datasources/:uid
export async function DELETE(
  request: NextRequest,
  { params }: { params: { uid: string } }
) {
  try {
    const authResult = await requireAuth(request, 'admin:datasources');
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const datasourceIndex = datasources.findIndex(ds => ds.uid === params.uid);
    
    if (datasourceIndex === -1) {
      return NextResponse.json(
        { error: 'Datasource not found' },
        { status: 404 }
      );
    }

    const datasource = datasources[datasourceIndex];
    
    // Prevent deletion of default datasource
    if (datasource.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default datasource' },
        { status: 400 }
      );
    }

    // Remove the datasource
    datasources.splice(datasourceIndex, 1);

    return NextResponse.json({ 
      message: 'Datasource deleted successfully' 
    });

  } catch (error) {
    console.error('Failed to delete datasource:', error);
    return NextResponse.json(
      { error: 'Failed to delete datasource' },
      { status: 500 }
    );
  }
}