import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import os from 'os';

export async function GET() {
  try {
    // Ollama status
    let ollamaStatus = { status: 'unknown', models: [], memoryUsage: 0 };
    try {
      const ollamaResponse = await fetch('http://localhost:11434/api/tags');
      if (ollamaResponse.ok) {
        const data = await ollamaResponse.json();
        ollamaStatus = {
          status: 'healthy',
          models: data.models?.map((m: any) => m.name) || [],
          memoryUsage: data.models?.reduce((sum: number, m: any) => sum + (m.size || 0), 0) || 0,
        };
      }
    } catch (e) {
      ollamaStatus.status = 'offline';
    }

    // Database status
    let dbStatus: any = { status: 'unknown', tables: [], latency: 0 };
    try {
      const startTime = Date.now();
      // First try a simple query to check connection
      await prisma.$queryRaw`SELECT 1`;
      
      const [workUnits, metrics, alerts, maintenance] = await Promise.all([
        prisma.workUnit.count(),
        prisma.metric.count(),
        prisma.alert.count(),
        prisma.maintenanceRecord.count(),
      ]);
      
      dbStatus = {
        status: 'connected',
        tables: [
          { name: 'workUnits', count: workUnits },
          { name: 'metrics', count: metrics },
          { name: 'alerts', count: alerts },
          { name: 'maintenance', count: maintenance },
        ],
        latency: Date.now() - startTime,
      };
    } catch (e) {
      console.error('Database connection error in system metrics:', e);
      dbStatus = {
        status: 'disconnected',
        error: e instanceof Error ? e.message : String(e),
        hint: 'Check DATABASE_URL in .env.local'
      };
    }

    // API endpoints status (simplified)
    const apiStatus = {
      status: 'healthy',
      endpoints: [
        { name: '/api/chat', status: 'active' },
        { name: '/api/test-db', status: 'active' },
        { name: '/api/metrics/query', status: 'active' },
      ],
    };

    // System metrics
    const systemMetrics = {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
      },
      uptime: process.uptime(),
    };

    return NextResponse.json({
      ollama: ollamaStatus,
      database: dbStatus,
      api: apiStatus,
      system: systemMetrics,
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch system metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}