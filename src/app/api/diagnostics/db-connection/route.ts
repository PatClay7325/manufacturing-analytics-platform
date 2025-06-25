import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Test basic connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Get database info
    const [version] = await prisma.$queryRaw<[{ version: string }]>`SELECT version()`;
    
    // Count tables
    const tableCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    // Check migrations
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, started_at, finished_at 
      FROM _prisma_migrations 
      ORDER BY started_at DESC 
      LIMIT 5
    `;
    
    // Test connection pool (handle BigInt serialization)
    let poolStats = {};
    try {
      const rawMetrics = await prisma.$metrics.json();
      poolStats = JSON.parse(JSON.stringify(rawMetrics, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
    } catch (metricsError) {
      poolStats = { error: 'Metrics unavailable' };
    }
    
    return NextResponse.json({
      status: 'connected',
      duration: Date.now() - startTime,
      details: {
        databaseVersion: version.version,
        tableCount: Number(tableCount[0]?.count || 0),
        recentMigrations: migrations.map((m: any) => ({
          ...m,
          started_at: m.started_at?.toISOString() || m.started_at,
          finished_at: m.finished_at?.toISOString() || m.finished_at
        })),
        connectionPool: {
          metrics: poolStats,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({
      status: 'disconnected',
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: {
        hint: 'Check PostgreSQL container: docker ps | grep postgres',
        connectionString: process.env.DATABASE_URL ? 'Configured' : 'Not configured',
      },
    });
  }
}