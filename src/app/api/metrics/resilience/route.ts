import { NextRequest, NextResponse } from 'next/server';
import { 
  getCircuitBreakerMetrics, 
  systemHealthChecker,
  resetAllCircuitBreakers 
} from '@/lib/resilience';
import { logger } from '@/lib/logger';
import { EnhancedError, ErrorCategory } from '@/lib/enhanced-error/EnhancedError';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeHistory = searchParams.get('history') === 'true';
    const format = searchParams.get('format') || 'json';

    // Get current circuit breaker metrics
    const circuitBreakerMetrics = getCircuitBreakerMetrics();
    
    // Get last health check results
    const lastHealthResults = systemHealthChecker.getLastResults();

    const metrics = {
      timestamp: new Date().toISOString(),
      circuitBreakers: circuitBreakerMetrics,
      healthChecks: lastHealthResults,
      
      // Summary metrics
      summary: {
        totalCircuitBreakers: Object.keys(circuitBreakerMetrics).length,
        openCircuitBreakers: Object.values(circuitBreakerMetrics).filter(
          (cb: any) => cb.state === 'OPEN'
        ).length,
        halfOpenCircuitBreakers: Object.values(circuitBreakerMetrics).filter(
          (cb: any) => cb.state === 'HALF_OPEN'
        ).length,
        totalHealthChecks: Object.keys(lastHealthResults).length,
        healthyChecks: Object.values(lastHealthResults).filter(
          (check: any) => check.status === 'HEALTHY'
        ).length,
        unhealthyChecks: Object.values(lastHealthResults).filter(
          (check: any) => check.status === 'UNHEALTHY'
        ).length,
      }
    };

    // Format for Prometheus if requested
    if (format === 'prometheus') {
      const prometheusMetrics = formatPrometheusMetrics(metrics);
      return new NextResponse(prometheusMetrics, {
        headers: {
          'Content-Type': 'text/plain; version=0.0.4',
        },
      });
    }

    return NextResponse.json(metrics);
  } catch (error) {
    const enhancedError = EnhancedError.system(
      'Failed to retrieve resilience metrics',
      undefined,
      {
        component: 'ResilienceMetricsAPI',
        operation: 'GET',
      },
      error as Error
    );

    logger.error('Resilience metrics retrieval failed', enhancedError.metadata);
    
    return NextResponse.json(
      enhancedError.toApiResponse(),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    switch (action) {
      case 'reset_circuit_breakers':
        resetAllCircuitBreakers();
        logger.info('All circuit breakers reset manually via API');
        
        return NextResponse.json({
          success: true,
          message: 'All circuit breakers have been reset',
          timestamp: new Date().toISOString(),
        });

      case 'reset_circuit_breaker':
        const circuitBreakerName = body.name;
        if (!circuitBreakerName) {
          throw EnhancedError.validation(
            'Circuit breaker name is required',
            'Please specify the name of the circuit breaker to reset'
          );
        }

        const circuitBreakers = await import('@/lib/resilience');
        const breaker = (circuitBreakers.circuitBreakers as any)[circuitBreakerName];
        
        if (!breaker) {
          throw EnhancedError.validation(
            `Circuit breaker '${circuitBreakerName}' not found`,
            `The specified circuit breaker does not exist`
          );
        }

        breaker.reset();
        logger.info(`Circuit breaker '${circuitBreakerName}' reset manually via API`);
        
        return NextResponse.json({
          success: true,
          message: `Circuit breaker '${circuitBreakerName}' has been reset`,
          timestamp: new Date().toISOString(),
        });

      case 'force_open_circuit_breaker':
        const forceOpenName = body.name;
        if (!forceOpenName) {
          throw EnhancedError.validation(
            'Circuit breaker name is required',
            'Please specify the name of the circuit breaker to force open'
          );
        }

        const circuitBreakersForce = await import('@/lib/resilience');
        const breakerToOpen = (circuitBreakersForce.circuitBreakers as any)[forceOpenName];
        
        if (!breakerToOpen) {
          throw EnhancedError.validation(
            `Circuit breaker '${forceOpenName}' not found`,
            `The specified circuit breaker does not exist`
          );
        }

        breakerToOpen.forceOpen();
        logger.warn(`Circuit breaker '${forceOpenName}' forced open manually via API`);
        
        return NextResponse.json({
          success: true,
          message: `Circuit breaker '${forceOpenName}' has been forced open`,
          timestamp: new Date().toISOString(),
        });

      default:
        throw EnhancedError.validation(
          `Unknown action: ${action}`,
          'Supported actions: reset_circuit_breakers, reset_circuit_breaker, force_open_circuit_breaker'
        );
    }
  } catch (error) {
    if (error instanceof EnhancedError) {
      return NextResponse.json(
        error.toApiResponse(),
        { status: error.metadata.category === ErrorCategory.VALIDATION ? 400 : 500 }
      );
    }

    const enhancedError = EnhancedError.system(
      'Failed to process resilience action',
      undefined,
      {
        component: 'ResilienceMetricsAPI',
        operation: 'POST',
      },
      error as Error
    );

    logger.error('Resilience action failed', enhancedError.metadata);
    
    return NextResponse.json(
      enhancedError.toApiResponse(),
      { status: 500 }
    );
  }
}

function formatPrometheusMetrics(metrics: any): string {
  const lines: string[] = [];
  
  // Circuit breaker metrics
  lines.push('# HELP circuit_breaker_state Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)');
  lines.push('# TYPE circuit_breaker_state gauge');
  
  lines.push('# HELP circuit_breaker_failures Circuit breaker failure count');
  lines.push('# TYPE circuit_breaker_failures counter');
  
  lines.push('# HELP circuit_breaker_successes Circuit breaker success count');
  lines.push('# TYPE circuit_breaker_successes counter');
  
  lines.push('# HELP circuit_breaker_total_requests Circuit breaker total requests');
  lines.push('# TYPE circuit_breaker_total_requests counter');

  Object.entries(metrics.circuitBreakers).forEach(([name, breaker]: [string, any]) => {
    const stateValue = breaker.state === 'CLOSED' ? 0 : breaker.state === 'HALF_OPEN' ? 1 : 2;
    
    lines.push(`circuit_breaker_state{name="${name}"} ${stateValue}`);
    lines.push(`circuit_breaker_failures{name="${name}"} ${breaker.failures}`);
    lines.push(`circuit_breaker_successes{name="${name}"} ${breaker.successes}`);
    lines.push(`circuit_breaker_total_requests{name="${name}"} ${breaker.totalRequests}`);
  });

  // Health check metrics
  lines.push('# HELP health_check_status Health check status (0=UNHEALTHY, 1=HEALTHY, 2=DEGRADED, 3=UNKNOWN)');
  lines.push('# TYPE health_check_status gauge');
  
  lines.push('# HELP health_check_response_time Health check response time in milliseconds');
  lines.push('# TYPE health_check_response_time gauge');

  Object.entries(metrics.healthChecks).forEach(([name, check]: [string, any]) => {
    const statusValue = 
      check.status === 'UNHEALTHY' ? 0 :
      check.status === 'HEALTHY' ? 1 :
      check.status === 'DEGRADED' ? 2 : 3;
    
    lines.push(`health_check_status{name="${name}"} ${statusValue}`);
    
    if (check.responseTime) {
      lines.push(`health_check_response_time{name="${name}"} ${check.responseTime}`);
    }
  });

  return lines.join('\n') + '\n';
}