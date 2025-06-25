import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

let sdk: NodeSDK | null = null;

/**
 * Initialize OpenTelemetry instrumentation
 */
export async function initializeOpenTelemetry(): Promise<void> {
  if (!env.ENABLE_TRACING && !env.ENABLE_METRICS) {
    logger.info('OpenTelemetry disabled by configuration');
    return;
  }

  try {
    const resource = new Resource({
      [SEMRESATTRS_SERVICE_NAME]: 'manufacturing-analytics-platform',
      [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      environment: env.NODE_ENV,
    });

    const instrumentations = [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false, // Disable file system instrumentation to reduce noise
        },
      }),
    ];

    const traceExporter = env.ENABLE_TRACING && env.OTEL_EXPORTER_ENDPOINT
      ? new OTLPTraceExporter({
          url: `${env.OTEL_EXPORTER_ENDPOINT}/v1/traces`,
          headers: {},
        })
      : undefined;

    const metricReader = env.ENABLE_METRICS && env.OTEL_EXPORTER_ENDPOINT
      ? new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: `${env.OTEL_EXPORTER_ENDPOINT}/v1/metrics`,
            headers: {},
          }),
          exportIntervalMillis: 60000, // Export metrics every minute
        })
      : undefined;

    sdk = new NodeSDK({
      resource,
      instrumentations,
      traceExporter,
      metricReader,
    });

    await sdk.start();
    
    logger.info({
      tracingEnabled: env.ENABLE_TRACING,
      metricsEnabled: env.ENABLE_METRICS,
      endpoint: env.OTEL_EXPORTER_ENDPOINT,
    }, 'OpenTelemetry initialized');

    // Register shutdown hooks
    process.on('SIGTERM', () => shutdownOpenTelemetry());
    process.on('SIGINT', () => shutdownOpenTelemetry());
  } catch (error) {
    logger.error({ error }, 'Failed to initialize OpenTelemetry');
  }
}

/**
 * Shutdown OpenTelemetry gracefully
 */
export async function shutdownOpenTelemetry(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown();
      logger.info('OpenTelemetry shut down successfully');
    } catch (error) {
      logger.error({ error }, 'Error shutting down OpenTelemetry');
    }
  }
}