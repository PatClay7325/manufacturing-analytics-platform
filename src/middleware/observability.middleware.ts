import { NextRequest, NextResponse } from 'next/server';
import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';

/**
 * OpenTelemetry Configuration for Manufacturing Analytics Platform
 */
class ObservabilityManager {
  private sdk: NodeSDK;
  private tracer = trace.getTracer('manufacturing-analytics-platform');
  private meterProvider: MeterProvider;
  private initialized = false;

  constructor() {
    this.initializeSDK();
  }

  private initializeSDK() {
    // Create resource with service information
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'manufacturing-analytics-platform',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    });

    // Configure exporters based on environment
    const traceExporters = [];
    
    if (process.env.JAEGER_ENDPOINT) {
      traceExporters.push(new JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT,
      }));
    }
    
    if (process.env.NODE_ENV === 'development') {
      traceExporters.push(new ConsoleSpanExporter());
    }

    // Configure Prometheus metrics
    this.meterProvider = new MeterProvider({
      resource,
    });

    if (process.env.PROMETHEUS_ENABLED !== 'false') {
      const prometheusExporter = new PrometheusExporter({
        port: parseInt(process.env.PROMETHEUS_PORT || '9090'),
        endpoint: '/metrics',
      });
    }

    // Initialize SDK
    this.sdk = new NodeSDK({
      resource,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-prisma': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-redis': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            requestHook: (span, request) => {
              span.setAttributes({
                'http.request.header.user-agent': request.headers['user-agent'],
                'http.request.header.x-forwarded-for': request.headers['x-forwarded-for'],
              });
            },
          },
        }),
      ],
    });
  }

  public initialize() {
    if (!this.initialized) {
      this.sdk.start();
      this.initialized = true;
      console.log('[Observability] OpenTelemetry initialized');
    }
  }

  public shutdown() {
    return this.sdk.shutdown();
  }

  public getTracer() {
    return this.tracer;
  }

  public getMeterProvider() {
    return this.meterProvider;
  }
}

// Singleton instance
export const observabilityManager = new ObservabilityManager();

/**
 * Manufacturing-specific metrics
 */
class ManufacturingMetrics {
  private meter = observabilityManager.getMeterProvider().getMeter('manufacturing-metrics');
  
  // Counters
  public readonly productionRunsStarted = this.meter.createCounter('production_runs_started_total', {
    description: 'Total number of production runs started',
  });
  
  public readonly productionRunsCompleted = this.meter.createCounter('production_runs_completed_total', {
    description: 'Total number of production runs completed',
  });
  
  public readonly oeeCalculations = this.meter.createCounter('oee_calculations_total', {
    description: 'Total number of OEE calculations performed',
  });
  
  public readonly apiRequests = this.meter.createCounter('api_requests_total', {
    description: 'Total number of API requests',
  });
  
  public readonly cacheHits = this.meter.createCounter('cache_hits_total', {
    description: 'Total number of cache hits',
  });
  
  public readonly cacheMisses = this.meter.createCounter('cache_misses_total', {
    description: 'Total number of cache misses',
  });
  
  // Histograms
  public readonly oeeCalculationDuration = this.meter.createHistogram('oee_calculation_duration_seconds', {
    description: 'Duration of OEE calculations in seconds',
    boundaries: [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10],
  });
  
  public readonly apiRequestDuration = this.meter.createHistogram('api_request_duration_seconds', {
    description: 'Duration of API requests in seconds',
    boundaries: [0.001, 0.01, 0.05, 0.1, 0.2, 0.5, 1, 2],
  });
  
  public readonly databaseQueryDuration = this.meter.createHistogram('database_query_duration_seconds', {
    description: 'Duration of database queries in seconds',
    boundaries: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  });
  
  // Gauges
  public readonly activeProductionRuns = this.meter.createUpDownCounter('active_production_runs', {
    description: 'Number of currently active production runs',
  });
  
  public readonly equipmentOnline = this.meter.createUpDownCounter('equipment_online_count', {
    description: 'Number of equipment units currently online',
  });
  
  public readonly currentOEE = this.meter.createUpDownCounter('current_oee_value', {
    description: 'Current OEE value (0-1)',
  });
}

export const manufacturingMetrics = new ManufacturingMetrics();

/**
 * Observability Middleware for Next.js
 */
export class ObservabilityMiddleware {
  /**
   * Middleware function for API routes
   */
  static middleware(request: NextRequest) {
    const tracer = observabilityManager.getTracer();
    const pathname = request.nextUrl.pathname;
    const method = request.method;
    
    // Skip non-API routes and static assets
    if (!pathname.startsWith('/api/') || 
        pathname.match(/\.(jpg|jpeg|png|gif|ico|css|js|woff|woff2)$/)) {
      return NextResponse.next();
    }

    return tracer.startActiveSpan(
      `${method} ${pathname}`,
      {
        kind: SpanKind.SERVER,
        attributes: {
          'http.method': method,
          'http.url': request.url,
          'http.route': pathname,
          'user_agent.original': request.headers.get('user-agent') || '',
          'client.address': request.headers.get('x-forwarded-for') || 
                           request.headers.get('x-real-ip') || '',
        },
      },
      (span) => {
        const startTime = Date.now();
        
        // Increment API request counter
        manufacturingMetrics.apiRequests.add(1, {
          method,
          endpoint: pathname,
        });

        try {
          const response = NextResponse.next();
          
          // Add observability headers
          response.headers.set('X-Trace-ID', span.spanContext().traceId);
          response.headers.set('X-Span-ID', span.spanContext().spanId);
          
          // Record metrics
          const duration = (Date.now() - startTime) / 1000;
          manufacturingMetrics.apiRequestDuration.record(duration, {
            method,
            endpoint: pathname,
            status_code: response.status.toString(),
          });
          
          // Set span status
          if (response.status >= 400) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: `HTTP ${response.status}`,
            });
          } else {
            span.setStatus({ code: SpanStatusCode.OK });
          }
          
          span.setAttributes({
            'http.status_code': response.status,
            'http.response.size': response.headers.get('content-length') || '0',
          });
          
          return response;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Trace database operations
   */
  static traceDbOperation<T>(
    operationName: string,
    operation: () => Promise<T>,
    attributes?: Record<string, string | number>
  ): Promise<T> {
    const tracer = observabilityManager.getTracer();
    
    return tracer.startActiveSpan(
      `db.${operationName}`,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          'db.system': 'postgresql',
          'db.operation': operationName,
          ...attributes,
        },
      },
      async (span) => {
        const startTime = Date.now();
        
        try {
          const result = await operation();
          
          span.setStatus({ code: SpanStatusCode.OK });
          
          // Record database query duration
          const duration = (Date.now() - startTime) / 1000;
          manufacturingMetrics.databaseQueryDuration.record(duration, {
            operation: operationName,
            status: 'success',
          });
          
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Database error',
          });
          
          manufacturingMetrics.databaseQueryDuration.record(
            (Date.now() - startTime) / 1000,
            {
              operation: operationName,
              status: 'error',
            }
          );
          
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }

  /**
   * Trace OEE calculations
   */
  static traceOEECalculation<T>(
    equipmentId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const tracer = observabilityManager.getTracer();
    
    return tracer.startActiveSpan(
      'oee.calculate',
      {
        attributes: {
          'equipment.id': equipmentId,
          'operation.type': 'oee_calculation',
        },
      },
      async (span) => {
        const startTime = Date.now();
        
        // Increment OEE calculation counter
        manufacturingMetrics.oeeCalculations.add(1, {
          equipment_id: equipmentId,
        });
        
        try {
          const result = await operation();
          
          span.setStatus({ code: SpanStatusCode.OK });
          
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'OEE calculation error',
          });
          throw error;
        } finally {
          const duration = (Date.now() - startTime) / 1000;
          manufacturingMetrics.oeeCalculationDuration.record(duration, {
            equipment_id: equipmentId,
          });
          span.end();
        }
      }
    );
  }

  /**
   * Trace cache operations
   */
  static traceCacheOperation<T>(
    operation: string,
    key: string,
    cacheOperation: () => Promise<T>
  ): Promise<T> {
    const tracer = observabilityManager.getTracer();
    
    return tracer.startActiveSpan(
      `cache.${operation}`,
      {
        kind: SpanKind.CLIENT,
        attributes: {
          'cache.operation': operation,
          'cache.key': key,
        },
      },
      async (span) => {
        try {
          const result = await cacheOperation();
          
          if (operation === 'get') {
            if (result !== null) {
              manufacturingMetrics.cacheHits.add(1, { key });
              span.setAttributes({ 'cache.hit': true });
            } else {
              manufacturingMetrics.cacheMisses.add(1, { key });
              span.setAttributes({ 'cache.hit': false });
            }
          }
          
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Cache error',
          });
          throw error;
        } finally {
          span.end();
        }
      }
    );
  }
}

/**
 * Initialize observability on module load
 */
if (process.env.OBSERVABILITY_ENABLED !== 'false') {
  observabilityManager.initialize();
}

// Export middleware function for Next.js
export function observabilityMiddleware(request: NextRequest) {
  return ObservabilityMiddleware.middleware(request);
}