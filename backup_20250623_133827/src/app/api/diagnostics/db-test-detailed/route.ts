import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const results = {
    connectionString: process.env.DATABASE_URL ? 'Configured' : 'Not configured',
    tests: [] as any[],
    error: null as string | null,
  };

  // Test 1: Environment check
  results.tests.push({
    name: 'Environment Variables',
    status: process.env.DATABASE_URL ? 'pass' : 'fail',
    details: {
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Missing',
      NODE_ENV: process.env.NODE_ENV,
    }
  });

  // Test 2: Basic connection
  try {
    const startTime = Date.now();
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    results.tests.push({
      name: 'Basic Connection',
      status: 'pass',
      duration: Date.now() - startTime,
      result
    });
  } catch (error) {
    results.tests.push({
      name: 'Basic Connection',
      status: 'fail',
      error: error instanceof Error ? error.message : String(error)
    });
    results.error = error instanceof Error ? error.message : String(error);
  }

  // Test 3: Database version
  try {
    const version = await prisma.$queryRaw<[{ version: string }]>`SELECT version()`;
    results.tests.push({
      name: 'Database Version',
      status: 'pass',
      version: version[0].version
    });
  } catch (error) {
    results.tests.push({
      name: 'Database Version',
      status: 'fail',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 4: Table counts
  try {
    // First check what tables exist
    const tables = await prisma.$queryRaw<{tablename: string}[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
    `;
    
    // Count records in main tables (using correct model names)
    const counts: any = {};
    
    // Equipment is actually WorkUnit in the hierarchical schema
    if (tables.some(t => t.tablename === 'WorkUnit')) {
      counts.workUnits = await prisma.workUnit.count();
    }
    
    // Metrics
    if (tables.some(t => t.tablename === 'Metric')) {
      counts.metrics = await prisma.metric.count();
    }
    
    // Alerts
    if (tables.some(t => t.tablename === 'Alert')) {
      counts.alerts = await prisma.alert.count();
    }
    
    // Maintenance Records
    if (tables.some(t => t.tablename === 'MaintenanceRecord')) {
      counts.maintenanceRecords = await prisma.maintenanceRecord.count();
    }
    
    results.tests.push({
      name: 'Table Counts',
      status: 'pass',
      tables: tables.map(t => t.tablename),
      counts
    });
  } catch (error) {
    results.tests.push({
      name: 'Table Counts',
      status: 'fail',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  // Test 5: Connection pool
  try {
    const metrics = await prisma.$metrics.json();
    results.tests.push({
      name: 'Connection Pool Metrics',
      status: 'pass',
      metrics
    });
  } catch (error) {
    results.tests.push({
      name: 'Connection Pool Metrics',
      status: 'fail',
      error: error instanceof Error ? error.message : String(error)
    });
  }

  const allPassed = results.tests.every(test => test.status === 'pass');
  
  return NextResponse.json({
    status: allPassed ? 'connected' : 'issues',
    ...results
  });
}