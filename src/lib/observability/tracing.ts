import { trace, context, SpanStatusCode, SpanKind, Attributes } from '@opentelemetry/api';
import { logger } from '@/lib/logger';

const tracer = trace.getTracer('manufacturing-analytics-platform');

/**
 * Trace an agent operation
 */
export async function traceAgentOperation<T>(
  agentName: string,
  operationName: string,
  operation: () => Promise<T>,
  attributes?: Attributes
): Promise<T> {
  const span = tracer.startSpan(`${agentName}.${operationName}`, {
    kind: SpanKind.INTERNAL,
    attributes: {
      'agent.name': agentName,
      'agent.operation': operationName,
      ...attributes,
    },
  });

  try {
    const result = await context.with(trace.setSpan(context.active(), span), operation);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Trace an HTTP request
 */
export async function traceHttpRequest<T>(
  method: string,
  url: string,
  operation: () => Promise<T>
): Promise<T> {
  const span = tracer.startSpan(`HTTP ${method}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'http.method': method,
      'http.url': url,
    },
  });

  try {
    const startTime = Date.now();
    const result = await context.with(trace.setSpan(context.active(), span), operation);
    const duration = Date.now() - startTime;
    
    span.setAttributes({
      'http.status_code': 200,
      'http.duration': duration,
    });
    span.setStatus({ code: SpanStatusCode.OK });
    
    return result;
  } catch (error) {
    const statusCode = (error as any)?.response?.statusCode || 500;
    span.setAttributes({
      'http.status_code': statusCode,
    });
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'HTTP request failed',
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Trace a database operation
 */
export async function traceDatabaseOperation<T>(
  operation: string,
  table: string,
  query: () => Promise<T>
): Promise<T> {
  const span = tracer.startSpan(`db.${operation}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      'db.system': 'postgresql',
      'db.operation': operation,
      'db.table': table,
    },
  });

  try {
    const startTime = Date.now();
    const result = await context.with(trace.setSpan(context.active(), span), query);
    const duration = Date.now() - startTime;
    
    span.setAttributes({
      'db.duration': duration,
    });
    span.setStatus({ code: SpanStatusCode.OK });
    
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Database operation failed',
    });
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Add event to current span
 */
export function addSpanEvent(name: string, attributes?: Attributes): void {
  const currentSpan = trace.getActiveSpan();
  if (currentSpan) {
    currentSpan.addEvent(name, attributes);
  }
}

/**
 * Set attributes on current span
 */
export function setSpanAttributes(attributes: Attributes): void {
  const currentSpan = trace.getActiveSpan();
  if (currentSpan) {
    currentSpan.setAttributes(attributes);
  }
}

/**
 * Create a custom metric
 */
export function recordMetric(
  name: string,
  value: number,
  unit: string,
  attributes?: Attributes
): void {
  // This would integrate with the metrics API
  // For now, just log it
  logger.debug({
    metric: name,
    value,
    unit,
    attributes,
  }, 'Metric recorded');
}