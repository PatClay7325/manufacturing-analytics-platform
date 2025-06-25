import { NextRequest, NextResponse } from 'next/server';
import { 
  systemHealthChecker, 
  getCircuitBreakerMetrics, 
  HealthStatus 
} from '@/lib/resilience';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Run all health checks
    const healthReport = await systemHealthChecker.runAllChecks();
    
    // Get circuit breaker metrics
    const circuitBreakerMetrics = getCircuitBreakerMetrics();
    
    // Determine HTTP status code based on health
    let statusCode = 200;
    if (healthReport.status === HealthStatus.UNHEALTHY) {
      statusCode = 503; // Service Unavailable
    } else if (healthReport.status === HealthStatus.DEGRADED) {
      statusCode = 200; // Still accepting traffic but degraded
    }

    const response = {
      status: healthReport.status,
      timestamp: healthReport.timestamp,
      responseTime: healthReport.responseTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      
      // Health check details
      checks: healthReport.checks,
      
      // Circuit breaker status
      circuitBreakers: circuitBreakerMetrics,
      
      // System information
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        nodeVersion: process.version,
      },
      
      // Database connections
      database: {
        maxConnections: 20, // From pool config
        // Additional database metrics could be added here
      }
    };

    logger.info('Health check completed', {
      status: healthReport.status,
      responseTime: healthReport.responseTime,
      statusCode,
    });

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    logger.error('Health check failed', { error: (error as Error).message });
    
    return NextResponse.json(
      {
        status: HealthStatus.UNKNOWN,
        timestamp: new Date(),
        error: 'Health check system failure',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

// Simplified health check for load balancers
export async function HEAD(request: NextRequest) {
  try {
    const healthReport = await systemHealthChecker.runAllChecks();
    
    if (healthReport.status === HealthStatus.UNHEALTHY) {
      return new NextResponse(null, { status: 503 });
    }
    
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return new NextResponse(null, { status: 500 });
  }
}