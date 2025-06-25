import { NextRequest, NextResponse } from 'next/server';

// Mock datasources for development
const mockDataSources = [
  {
    uid: 'prometheus-default',
    id: 1,
    name: 'Prometheus',
    type: 'prometheus',
    url: 'http://localhost:9090',
    access: 'proxy',
    isDefault: true,
    jsonData: {
      httpMethod: 'POST',
      timeInterval: '5s'
    },
    secureJsonFields: {},
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  },
  {
    uid: 'postgres-default',
    id: 2,
    name: 'PostgreSQL',
    type: 'postgres',
    url: 'localhost:5432',
    access: 'proxy',
    isDefault: false,
    database: 'manufacturing',
    jsonData: {
      sslmode: 'disable',
      postgresVersion: 1300
    },
    secureJsonFields: {},
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  },
  {
    uid: 'influxdb-default',
    id: 3,
    name: 'InfluxDB',
    type: 'influxdb',
    url: 'http://localhost:8086',
    access: 'proxy',
    isDefault: false,
    jsonData: {
      organization: 'manufacturing',
      defaultBucket: 'metrics',
      version: 'Flux'
    },
    secureJsonFields: {},
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  }
];

export async function GET(request: NextRequest) {
  try {
    // In development, return mock datasources
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json(mockDataSources);
    }

    // In production, you would fetch from database
    // const datasources = await prisma.dataSource.findMany();
    
    return NextResponse.json(mockDataSources);
  } catch (error) {
    console.error('Failed to fetch datasources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch datasources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Mock creating a new datasource
    const newDataSource = {
      ...body,
      uid: `${body.type}-${Date.now()}`,
      id: mockDataSources.length + 1,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      secureJsonFields: {},
      jsonData: body.jsonData || {}
    };

    // In production, you would save to database
    // const datasource = await prisma.dataSource.create({ data: newDataSource });
    
    return NextResponse.json(newDataSource, { status: 201 });
  } catch (error) {
    console.error('Failed to create datasource:', error);
    return NextResponse.json(
      { error: 'Failed to create datasource' },
      { status: 500 }
    );
  }
}