import { Registry, Counter, Histogram, Gauge, Summary } from 'prom-client';
import { logger } from '@/lib/logger';

// Create a registry for all metrics
export const metricsRegistry = new Registry();

// Default metrics (CPU, memory, etc.)
import { collectDefaultMetrics } from 'prom-client';
collectDefaultMetrics({ register: metricsRegistry });

// Custom metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [metricsRegistry],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegistry],
});

export const agentOperationDuration = new Histogram({
  name: 'agent_operation_duration_seconds',
  help: 'Duration of agent operations in seconds',
  labelNames: ['agent', 'operation', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [metricsRegistry],
});

export const agentOperationTotal = new Counter({
  name: 'agent_operations_total',
  help: 'Total number of agent operations',
  labelNames: ['agent', 'operation', 'status'],
  registers: [metricsRegistry],
});

export const embeddingGenerationDuration = new Histogram({
  name: 'embedding_generation_duration_seconds',
  help: 'Duration of embedding generation in seconds',
  labelNames: ['model', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [metricsRegistry],
});

export const rateLimitHits = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['path', 'method'],
  registers: [metricsRegistry],
});

export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [metricsRegistry],
});

export const redisOperationDuration = new Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation', 'status'],
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05],
  registers: [metricsRegistry],
});

export const memoryPruningMetrics = {
  recordsDeleted: new Counter({
    name: 'memory_pruning_records_deleted_total',
    help: 'Total number of records deleted by memory pruning',
    labelNames: ['type'],
    registers: [metricsRegistry],
  }),
  pruningDuration: new Histogram({
    name: 'memory_pruning_duration_seconds',
    help: 'Duration of memory pruning operations',
    labelNames: ['type'],
    buckets: [1, 5, 10, 30, 60, 120],
    registers: [metricsRegistry],
  }),
};

export const manufacturingMetrics = {
  oeeScore: new Gauge({
    name: 'manufacturing_oee_score',
    help: 'Overall Equipment Effectiveness score',
    labelNames: ['equipment_id', 'equipment_name', 'line_id', 'location'],
    registers: [metricsRegistry],
  }),
  
  availability: new Gauge({
    name: 'manufacturing_availability_percent',
    help: 'Equipment availability percentage',
    labelNames: ['equipment_id', 'equipment_name', 'line_id'],
    registers: [metricsRegistry],
  }),
  
  performance: new Gauge({
    name: 'manufacturing_performance_percent',
    help: 'Equipment performance percentage',
    labelNames: ['equipment_id', 'equipment_name', 'line_id'],
    registers: [metricsRegistry],
  }),
  
  quality: new Gauge({
    name: 'manufacturing_quality_percent',
    help: 'Product quality percentage',
    labelNames: ['equipment_id', 'equipment_name', 'line_id'],
    registers: [metricsRegistry],
  }),
  
  equipmentDowntime: new Counter({
    name: 'manufacturing_equipment_downtime_minutes_total',
    help: 'Total equipment downtime in minutes',
    labelNames: ['equipment_id', 'equipment_name', 'reason', 'planned'],
    registers: [metricsRegistry],
  }),
  
  productionCount: new Counter({
    name: 'manufacturing_production_count_total',
    help: 'Total units produced',
    labelNames: ['product_type', 'equipment_id', 'line_id', 'shift'],
    registers: [metricsRegistry],
  }),
  
  scrapCount: new Counter({
    name: 'manufacturing_scrap_count_total',
    help: 'Total units scrapped',
    labelNames: ['product_type', 'equipment_id', 'reason'],
    registers: [metricsRegistry],
  }),
  
  defectRate: new Gauge({
    name: 'manufacturing_defect_rate_percent',
    help: 'Current defect rate percentage',
    labelNames: ['product_type', 'equipment_id', 'line_id'],
    registers: [metricsRegistry],
  }),
  
  cycleTime: new Histogram({
    name: 'manufacturing_cycle_time_seconds',
    help: 'Production cycle time in seconds',
    labelNames: ['product_type', 'equipment_id'],
    buckets: [10, 30, 60, 120, 300, 600, 1200],
    registers: [metricsRegistry],
  }),
  
  alertsActive: new Gauge({
    name: 'manufacturing_alerts_active_total',
    help: 'Number of active manufacturing alerts',
    labelNames: ['severity', 'equipment_id', 'type'],
    registers: [metricsRegistry],
  }),
  
  energyConsumption: new Gauge({
    name: 'manufacturing_energy_consumption_kwh',
    help: 'Energy consumption in kWh',
    labelNames: ['equipment_id', 'meter_type'],
    registers: [metricsRegistry],
  }),
  
  temperatureSensor: new Gauge({
    name: 'manufacturing_temperature_celsius',
    help: 'Equipment temperature in Celsius',
    labelNames: ['equipment_id', 'sensor_location'],
    registers: [metricsRegistry],
  }),
  
  vibrationSensor: new Gauge({
    name: 'manufacturing_vibration_mm_per_second',
    help: 'Equipment vibration in mm/s',
    labelNames: ['equipment_id', 'axis'],
    registers: [metricsRegistry],
  }),
};

export const circuitBreakerMetrics = {
  state: new Gauge({
    name: 'circuit_breaker_state',
    help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
    labelNames: ['service'],
    registers: [metricsRegistry],
  }),
  
  failures: new Counter({
    name: 'circuit_breaker_failures_total',
    help: 'Total circuit breaker failures',
    labelNames: ['service'],
    registers: [metricsRegistry],
  }),
};

// Active connections gauge
export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['type'],
  registers: [metricsRegistry],
});

// Custom metric recording function with error handling
export function recordMetric(
  name: string,
  value: number,
  labels?: Record<string, string>
): void {
  try {
    switch (name) {
      case 'http_request_duration':
        httpRequestDuration.observe(labels || {}, value);
        break;
      case 'agent_operation_duration':
        agentOperationDuration.observe(labels || {}, value);
        break;
      case 'rate_limit_exceeded':
        rateLimitHits.inc(labels || {});
        break;
      case 'database_query_duration':
        databaseQueryDuration.observe(labels || {}, value);
        break;
      case 'redis_operation_duration':
        redisOperationDuration.observe(labels || {}, value);
        break;
      default:
        logger.debug({ metric: name, value, labels }, 'Unknown metric');
    }
  } catch (error) {
    logger.error({ error, metric: name }, 'Failed to record metric');
  }
}

// Export metrics as Prometheus format
export async function getMetrics(): Promise<string> {
  try {
    return await metricsRegistry.metrics();
  } catch (error) {
    logger.error({ error }, 'Failed to generate metrics');
    return '';
  }
}

// Reset all metrics (useful for testing)
export function resetMetrics(): void {
  metricsRegistry.clear();
}