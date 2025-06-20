import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Test database connectivity
    const dbTest = await prisma.enterprise.findFirst({
      select: { id: true, name: true }
    });
    
    // Test basic query performance
    const metricsCount = await prisma.performanceMetric.count({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    // Determine health status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let issues: string[] = [];
    
    if (!dbTest) {
      status = 'unhealthy';
      issues.push('No enterprise data found in database');
    }
    
    if (metricsCount === 0) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push('No recent performance metrics available');
    }
    
    if (responseTime > 2000) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push('Database response time exceeds 2 seconds');
    }
    
    const healthData = {
      status,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: {
        connected: !!dbTest,
        enterprise: dbTest.name || null,
        recentMetrics: metricsCount
      },
      agent: {
        version: '1.0.0',
        capabilities: [
          'OEE Analysis (ISO 22400)',
          'Downtime Analysis (ISO 14224)', 
          'Quality Analysis (ISO 9001)',
          'Maintenance Analysis',
          'Production Analysis',
          'Root Cause Analysis',
          'Performance Trending'
        ],
        visualizations: [
          'Line Charts',
          'Bar Charts', 
          'Pareto Charts',
          'Area Charts',
          'Pie Charts',
          'Gauge Charts',
          'Scatter Plots'
        ]
      },
      issues: issues.length > 0 ? issues : undefined
    };
    
    const httpStatus = status === 'healthy' ? 200 : status === 'degraded' ? 206 : 503;
    
    return NextResponse.json(healthData, { status: httpStatus });
    
  } catch (error) {
    console.error('❌ Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: `${Date.now() - startTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
      database: {
        connected: false,
        enterprise: null,
        recentMetrics: 0
      },
      agent: {
        version: '1.0.0',
        status: 'error'
      },
      issues: ['Database connection failed', 'Agent unable to access manufacturing data']
    }, { status: 503 });
  }
}