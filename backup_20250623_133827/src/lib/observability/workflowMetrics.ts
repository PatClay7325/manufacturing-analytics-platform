/**
 * Workflow-specific Prometheus metrics
 * Dedicated metrics for workflow orchestration monitoring
 */

import { Histogram, Counter, Gauge, register } from 'prom-client';
import { metricsRegistry } from './metrics';

// Workflow execution metrics
export const workflowExecutionDuration = new Histogram({
  name: 'workflow_execution_duration_seconds',
  help: 'Duration of workflow executions in seconds',
  labelNames: ['workflow', 'status'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300, 600],
});

export const workflowExecutionCounter = new Counter({
  name: 'workflow_executions_total',
  help: 'Total number of workflow executions',
  labelNames: ['workflow', 'status'],
});

export const activeWorkflowsGauge = new Gauge({
  name: 'active_workflows_count',
  help: 'Number of currently active workflow executions',
});

export const workflowErrorCounter = new Counter({
  name: 'workflow_errors_total',
  help: 'Total number of workflow errors',
  labelNames: ['workflow', 'type'],
});

// Step execution metrics
export const stepExecutionDuration = new Histogram({
  name: 'workflow_step_execution_duration_seconds',
  help: 'Duration of workflow step executions in seconds',
  labelNames: ['step', 'status'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
});

export const stepExecutionCounter = new Counter({
  name: 'workflow_step_executions_total',
  help: 'Total number of workflow step executions',
  labelNames: ['step', 'status'],
});

// Queue metrics
export const queueSizeGauge = new Gauge({
  name: 'workflow_queue_size',
  help: 'Number of messages in workflow queues',
  labelNames: ['queue'],
});

export const messageProcessingDuration = new Histogram({
  name: 'workflow_message_processing_duration_seconds',
  help: 'Duration of message processing in seconds',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
});

export const messageRetryCounter = new Counter({
  name: 'workflow_message_retries_total',
  help: 'Total number of message retries',
  labelNames: ['queue', 'attempt'],
});

export const deadLetterQueueGauge = new Gauge({
  name: 'workflow_dead_letter_queue_size',
  help: 'Number of messages in dead letter queues',
  labelNames: ['queue'],
});

// Agent execution metrics
export const agentOperationDuration = new Histogram({
  name: 'workflow_agent_operation_duration_seconds',
  help: 'Duration of agent operations in seconds',
  labelNames: ['agent', 'operation'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
});

export const agentOperationCounter = new Counter({
  name: 'workflow_agent_operations_total',
  help: 'Total number of agent operations',
  labelNames: ['agent', 'operation', 'status'],
});

export const agentErrorCounter = new Counter({
  name: 'workflow_agent_errors_total',
  help: 'Total number of agent errors',
  labelNames: ['agent', 'error_type'],
});

// Cache metrics
export const cacheHitCounter = new Counter({
  name: 'workflow_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type', 'operation'],
});

export const cacheMissCounter = new Counter({
  name: 'workflow_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type', 'operation'],
});

export const cacheOperationDuration = new Histogram({
  name: 'workflow_cache_operation_duration_seconds',
  help: 'Duration of cache operations in seconds',
  labelNames: ['cache_type', 'operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// Circuit breaker metrics
export const circuitBreakerStateGauge = new Gauge({
  name: 'workflow_circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=half-open, 2=open)',
  labelNames: ['circuit_breaker'],
});

export const circuitBreakerOperationCounter = new Counter({
  name: 'workflow_circuit_breaker_operations_total',
  help: 'Total number of circuit breaker operations',
  labelNames: ['circuit_breaker', 'operation', 'result'],
});

// Authorization metrics
export const authorizationDuration = new Histogram({
  name: 'workflow_authorization_duration_seconds',
  help: 'Duration of authorization checks in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
});

export const authorizationCounter = new Counter({
  name: 'workflow_authorization_total',
  help: 'Total number of authorization checks',
  labelNames: ['operation', 'result'],
});

// Register all metrics
register.registerMetric(workflowExecutionDuration);
register.registerMetric(workflowExecutionCounter);
register.registerMetric(activeWorkflowsGauge);
register.registerMetric(workflowErrorCounter);
register.registerMetric(stepExecutionDuration);
register.registerMetric(stepExecutionCounter);
register.registerMetric(queueSizeGauge);
register.registerMetric(messageProcessingDuration);
register.registerMetric(messageRetryCounter);
register.registerMetric(deadLetterQueueGauge);
register.registerMetric(agentOperationDuration);
register.registerMetric(agentOperationCounter);
register.registerMetric(agentErrorCounter);
register.registerMetric(cacheHitCounter);
register.registerMetric(cacheMissCounter);
register.registerMetric(cacheOperationDuration);
register.registerMetric(circuitBreakerStateGauge);
register.registerMetric(circuitBreakerOperationCounter);
register.registerMetric(authorizationDuration);
register.registerMetric(authorizationCounter);