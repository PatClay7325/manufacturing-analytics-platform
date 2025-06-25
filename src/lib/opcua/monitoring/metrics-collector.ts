/**
 * OPC UA Metrics Collector
 * Collects and exposes metrics for monitoring and observability
 */

import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from 'prom-client';
import { EventEmitter } from 'events';
import { OPCUAMetrics, CircuitBreakerState } from '../types';
import { logger } from '../../logger';

export interface MetricsConfig {
  prefix?: string;
  defaultLabels?: Record<string, string>;
  buckets?: number[];
  includeDefaultMetrics?: boolean;
}

export class MetricsCollector extends EventEmitter {
  private registry: Registry;
  private prefix: string;
  
  // Connection metrics
  private connectionsTotal: Counter;
  private connectionsActive: Gauge;
  private connectionErrors: Counter;
  private connectionDuration: Histogram;
  
  // Subscription metrics
  private subscriptionsActive: Gauge;
  private monitoredItemsActive: Gauge;
  private subscriptionErrors: Counter;
  
  // Data metrics
  private dataValuesReceived: Counter;
  private dataValuesProcessed: Counter;
  private dataProcessingDuration: Histogram;
  private dataProcessingErrors: Counter;
  
  // Circuit breaker metrics
  private circuitBreakerState: Gauge;
  private circuitBreakerStateChanges: Counter;
  
  // Performance metrics
  private requestDuration: Histogram;
  private requestsTotal: Counter;
  private requestErrors: Counter;

  constructor(config: MetricsConfig = {}) {
    super();
    
    this.registry = new Registry();
    this.prefix = config.prefix || 'opcua_';
    
    // Set default labels
    if (config.defaultLabels) {
      this.registry.setDefaultLabels(config.defaultLabels);
    }
    
    // Collect default Node.js metrics
    if (config.includeDefaultMetrics !== false) {
      collectDefaultMetrics({ register: this.registry });
    }
    
    this.initializeMetrics(config);
  }

  /**
   * Initialize all metrics
   */
  private initializeMetrics(config: MetricsConfig): void {
    const buckets = config.buckets || [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10];
    
    // Connection metrics
    this.connectionsTotal = new Counter({
      name: `${this.prefix}connections_total`,
      help: 'Total number of OPC UA connections attempted',
      labelNames: ['endpoint', 'status'],
      registers: [this.registry]
    });
    
    this.connectionsActive = new Gauge({
      name: `${this.prefix}connections_active`,
      help: 'Number of active OPC UA connections',
      labelNames: ['endpoint'],
      registers: [this.registry]
    });
    
    this.connectionErrors = new Counter({
      name: `${this.prefix}connection_errors_total`,
      help: 'Total number of OPC UA connection errors',
      labelNames: ['endpoint', 'error_type'],
      registers: [this.registry]
    });
    
    this.connectionDuration = new Histogram({
      name: `${this.prefix}connection_duration_seconds`,
      help: 'OPC UA connection duration in seconds',
      labelNames: ['endpoint'],
      buckets,
      registers: [this.registry]
    });
    
    // Subscription metrics
    this.subscriptionsActive = new Gauge({
      name: `${this.prefix}subscriptions_active`,
      help: 'Number of active OPC UA subscriptions',
      labelNames: ['endpoint'],
      registers: [this.registry]
    });
    
    this.monitoredItemsActive = new Gauge({
      name: `${this.prefix}monitored_items_active`,
      help: 'Number of active monitored items',
      labelNames: ['endpoint', 'subscription_id'],
      registers: [this.registry]
    });
    
    this.subscriptionErrors = new Counter({
      name: `${this.prefix}subscription_errors_total`,
      help: 'Total number of subscription errors',
      labelNames: ['endpoint', 'error_type'],
      registers: [this.registry]
    });
    
    // Data metrics
    this.dataValuesReceived = new Counter({
      name: `${this.prefix}data_values_received_total`,
      help: 'Total number of data values received',
      labelNames: ['endpoint', 'node_id', 'data_type'],
      registers: [this.registry]
    });
    
    this.dataValuesProcessed = new Counter({
      name: `${this.prefix}data_values_processed_total`,
      help: 'Total number of data values processed',
      labelNames: ['endpoint', 'status'],
      registers: [this.registry]
    });
    
    this.dataProcessingDuration = new Histogram({
      name: `${this.prefix}data_processing_duration_seconds`,
      help: 'Data processing duration in seconds',
      labelNames: ['endpoint', 'data_type'],
      buckets,
      registers: [this.registry]
    });
    
    this.dataProcessingErrors = new Counter({
      name: `${this.prefix}data_processing_errors_total`,
      help: 'Total number of data processing errors',
      labelNames: ['endpoint', 'error_type'],
      registers: [this.registry]
    });
    
    // Circuit breaker metrics
    this.circuitBreakerState = new Gauge({
      name: `${this.prefix}circuit_breaker_state`,
      help: 'Current state of circuit breaker (0=closed, 1=open, 2=half-open)',
      labelNames: ['endpoint'],
      registers: [this.registry]
    });
    
    this.circuitBreakerStateChanges = new Counter({
      name: `${this.prefix}circuit_breaker_state_changes_total`,
      help: 'Total number of circuit breaker state changes',
      labelNames: ['endpoint', 'from_state', 'to_state'],
      registers: [this.registry]
    });
    
    // Performance metrics
    this.requestDuration = new Histogram({
      name: `${this.prefix}request_duration_seconds`,
      help: 'OPC UA request duration in seconds',
      labelNames: ['endpoint', 'operation'],
      buckets,
      registers: [this.registry]
    });
    
    this.requestsTotal = new Counter({
      name: `${this.prefix}requests_total`,
      help: 'Total number of OPC UA requests',
      labelNames: ['endpoint', 'operation', 'status'],
      registers: [this.registry]
    });
    
    this.requestErrors = new Counter({
      name: `${this.prefix}request_errors_total`,
      help: 'Total number of OPC UA request errors',
      labelNames: ['endpoint', 'operation', 'error_type'],
      registers: [this.registry]
    });
  }

  /**
   * Record connection attempt
   */
  recordConnectionAttempt(endpoint: string, success: boolean): void {
    this.connectionsTotal.inc({ 
      endpoint, 
      status: success ? 'success' : 'failure' 
    });
  }

  /**
   * Update active connections
   */
  updateActiveConnections(endpoint: string, count: number): void {
    this.connectionsActive.set({ endpoint }, count);
  }

  /**
   * Record connection error
   */
  recordConnectionError(endpoint: string, errorType: string): void {
    this.connectionErrors.inc({ endpoint, error_type: errorType });
  }

  /**
   * Record connection duration
   */
  recordConnectionDuration(endpoint: string, durationSeconds: number): void {
    this.connectionDuration.observe({ endpoint }, durationSeconds);
  }

  /**
   * Update active subscriptions
   */
  updateActiveSubscriptions(endpoint: string, count: number): void {
    this.subscriptionsActive.set({ endpoint }, count);
  }

  /**
   * Update monitored items
   */
  updateMonitoredItems(endpoint: string, subscriptionId: string, count: number): void {
    this.monitoredItemsActive.set({ endpoint, subscription_id: subscriptionId }, count);
  }

  /**
   * Record subscription error
   */
  recordSubscriptionError(endpoint: string, errorType: string): void {
    this.subscriptionErrors.inc({ endpoint, error_type: errorType });
  }

  /**
   * Record data value received
   */
  recordDataValueReceived(endpoint: string, nodeId: string, dataType: string): void {
    this.dataValuesReceived.inc({ endpoint, node_id: nodeId, data_type: dataType });
  }

  /**
   * Record data value processed
   */
  recordDataValueProcessed(endpoint: string, success: boolean): void {
    this.dataValuesProcessed.inc({ 
      endpoint, 
      status: success ? 'success' : 'failure' 
    });
  }

  /**
   * Record data processing duration
   */
  recordDataProcessingDuration(endpoint: string, dataType: string, durationSeconds: number): void {
    this.dataProcessingDuration.observe({ endpoint, data_type: dataType }, durationSeconds);
  }

  /**
   * Record data processing error
   */
  recordDataProcessingError(endpoint: string, errorType: string): void {
    this.dataProcessingErrors.inc({ endpoint, error_type: errorType });
  }

  /**
   * Update circuit breaker state
   */
  updateCircuitBreakerState(endpoint: string, state: CircuitBreakerState): void {
    let stateValue = 0;
    switch (state) {
      case CircuitBreakerState.OPEN:
        stateValue = 1;
        break;
      case CircuitBreakerState.HALF_OPEN:
        stateValue = 2;
        break;
    }
    this.circuitBreakerState.set({ endpoint }, stateValue);
  }

  /**
   * Record circuit breaker state change
   */
  recordCircuitBreakerStateChange(
    endpoint: string, 
    fromState: CircuitBreakerState, 
    toState: CircuitBreakerState
  ): void {
    this.circuitBreakerStateChanges.inc({ 
      endpoint, 
      from_state: fromState, 
      to_state: toState 
    });
  }

  /**
   * Record request duration
   */
  recordRequestDuration(endpoint: string, operation: string, durationSeconds: number): void {
    this.requestDuration.observe({ endpoint, operation }, durationSeconds);
  }

  /**
   * Record request
   */
  recordRequest(endpoint: string, operation: string, success: boolean): void {
    this.requestsTotal.inc({ 
      endpoint, 
      operation, 
      status: success ? 'success' : 'failure' 
    });
  }

  /**
   * Record request error
   */
  recordRequestError(endpoint: string, operation: string, errorType: string): void {
    this.requestErrors.inc({ endpoint, operation, error_type: errorType });
  }

  /**
   * Get metrics for export
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get metrics in JSON format
   */
  async getMetricsJson(): Promise<any> {
    return this.registry.getMetricsAsJSON();
  }

  /**
   * Get summary metrics
   */
  async getSummaryMetrics(): Promise<OPCUAMetrics> {
    const metrics = await this.getMetricsJson();
    
    // Extract key metrics
    const connectionsActive = this.extractGaugeValue(metrics, `${this.prefix}connections_active`);
    const connectionsTotal = this.extractCounterValue(metrics, `${this.prefix}connections_total`);
    const connectionErrors = this.extractCounterValue(metrics, `${this.prefix}connection_errors_total`);
    const subscriptionsActive = this.extractGaugeValue(metrics, `${this.prefix}subscriptions_active`);
    const monitoredItemsActive = this.extractGaugeValue(metrics, `${this.prefix}monitored_items_active`);
    const dataValuesReceived = this.extractCounterValue(metrics, `${this.prefix}data_values_received_total`);
    const dataValuesProcessed = this.extractCounterValue(metrics, `${this.prefix}data_values_processed_total`);
    const averageProcessingTime = this.extractHistogramAverage(metrics, `${this.prefix}data_processing_duration_seconds`);
    
    return {
      connectionsActive,
      connectionsTotal,
      connectionErrors,
      subscriptionsActive,
      monitoredItemsActive,
      dataValuesReceived,
      dataValuesProcessed,
      averageProcessingTime,
      circuitBreakerState: CircuitBreakerState.CLOSED // Default, should be updated based on actual state
    };
  }

  /**
   * Extract gauge value from metrics
   */
  private extractGaugeValue(metrics: any[], name: string): number {
    const metric = metrics.find(m => m.name === name);
    if (metric && metric.values && metric.values.length > 0) {
      return metric.values.reduce((sum: number, v: any) => sum + v.value, 0);
    }
    return 0;
  }

  /**
   * Extract counter value from metrics
   */
  private extractCounterValue(metrics: any[], name: string): number {
    const metric = metrics.find(m => m.name === name);
    if (metric && metric.values && metric.values.length > 0) {
      return metric.values.reduce((sum: number, v: any) => sum + v.value, 0);
    }
    return 0;
  }

  /**
   * Extract histogram average from metrics
   */
  private extractHistogramAverage(metrics: any[], name: string): number {
    const metric = metrics.find(m => m.name === name);
    if (metric && metric.values && metric.values.length > 0) {
      const sum = metric.values.find((v: any) => v.metricName === `${name}_sum`);
      const count = metric.values.find((v: any) => v.metricName === `${name}_count`);
      if (sum && count && count.value > 0) {
        return sum.value / count.value;
      }
    }
    return 0;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.registry.resetMetrics();
  }

  /**
   * Clear metrics registry
   */
  clear(): void {
    this.registry.clear();
  }
}