/**
 * Production Batch Operation Manager - Efficient batch processing for Kubernetes operations
 */

import { KubeConfig, V1Deployment, V1Service, V1ConfigMap, V1Secret } from '@kubernetes/client-node';
import { logger } from '@/lib/logger';
import { EventEmitter } from 'events';
import { Counter, Histogram, Gauge } from 'prom-client';
import pLimit from 'p-limit';
import PQueue from 'p-queue';

// Metrics
const batchOperations = new Counter({
  name: 'batch_operations_total',
  help: 'Total batch operations',
  labelNames: ['operation', 'resource_type', 'result']
});

const batchSize = new Histogram({
  name: 'batch_operation_size',
  help: 'Size of batch operations',
  labelNames: ['operation', 'resource_type'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500]
});

const batchDuration = new Histogram({
  name: 'batch_operation_duration_seconds',
  help: 'Duration of batch operations',
  labelNames: ['operation', 'resource_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
});

const queueSize = new Gauge({
  name: 'batch_operation_queue_size',
  help: 'Current batch operation queue size',
  labelNames: ['resource_type']
});

export interface BatchConfig {
  maxBatchSize: number;
  maxConcurrency: number;
  batchTimeout: number; // ms
  retryAttempts: number;
  retryDelay: number; // ms
  queueSize: number;
}

export interface BatchOperation<T> {
  id: string;
  type: 'create' | 'update' | 'delete' | 'patch';
  resourceType: string;
  namespace?: string;
  resource: T;
  options?: any;
  priority?: number;
}

export interface BatchResult<T> {
  operation: BatchOperation<T>;
  success: boolean;
  result?: T;
  error?: Error;
  duration: number;
  attempts: number;
}

export interface BatchReport {
  totalOperations: number;
  successful: number;
  failed: number;
  duration: number;
  results: BatchResult<any>[];
  errors: Array<{ operation: string; error: string }>;
}

export class BatchOperationManager extends EventEmitter {
  private config: BatchConfig;
  private kubeConfig: KubeConfig;
  private queue: PQueue;
  private batchQueues: Map<string, BatchOperation<any>[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private concurrencyLimiter: ReturnType<typeof pLimit>;

  constructor(kubeConfig: KubeConfig, config: Partial<BatchConfig> = {}) {
    super();

    this.kubeConfig = kubeConfig;
    this.config = {
      maxBatchSize: 100,
      maxConcurrency: 10,
      batchTimeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      queueSize: 1000,
      ...config
    };

    this.concurrencyLimiter = pLimit(this.config.maxConcurrency);
    this.queue = new PQueue({ 
      concurrency: this.config.maxConcurrency,
      queueSize: this.config.queueSize
    });

    this.startMetricsUpdater();
  }

  /**
   * Add operation to batch
   */
  async addOperation<T>(operation: BatchOperation<T>): Promise<void> {
    const key = this.getBatchKey(operation);
    
    if (!this.batchQueues.has(key)) {
      this.batchQueues.set(key, []);
      this.scheduleBatchExecution(key);
    }

    const queue = this.batchQueues.get(key)!;
    queue.push(operation);

    // Execute immediately if batch is full
    if (queue.length >= this.config.maxBatchSize) {
      this.executeBatch(key);
    }

    queueSize.set({ resource_type: operation.resourceType }, queue.length);
  }

  /**
   * Execute all pending batches
   */
  async flush(): Promise<BatchReport[]> {
    const reports: BatchReport[] = [];

    // Cancel all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();

    // Execute all pending batches
    const promises: Promise<BatchReport>[] = [];
    for (const key of this.batchQueues.keys()) {
      promises.push(this.executeBatch(key));
    }

    const results = await Promise.allSettled(promises);
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        reports.push(result.value);
      }
    }

    return reports;
  }

  /**
   * Schedule batch execution
   */
  private scheduleBatchExecution(key: string): void {
    const timer = setTimeout(() => {
      this.executeBatch(key);
    }, this.config.batchTimeout);

    this.batchTimers.set(key, timer);
  }

  /**
   * Execute batch operations
   */
  private async executeBatch(key: string): Promise<BatchReport> {
    const operations = this.batchQueues.get(key) || [];
    if (operations.length === 0) {
      return this.createEmptyReport();
    }

    // Clear queue and timer
    this.batchQueues.delete(key);
    const timer = this.batchTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(key);
    }

    const startTime = Date.now();
    const { resourceType, type } = operations[0];

    batchSize.observe(
      { operation: type, resource_type: resourceType },
      operations.length
    );

    logger.info({
      key,
      count: operations.length,
      type,
      resourceType
    }, 'Executing batch operations');

    // Group operations by type for efficiency
    const grouped = this.groupOperations(operations);
    const results: BatchResult<any>[] = [];

    try {
      // Execute each group
      for (const [opType, ops] of Object.entries(grouped)) {
        const groupResults = await this.executeOperationGroup(opType, ops);
        results.push(...groupResults);
      }

      const duration = Date.now() - startTime;
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      batchOperations.inc({
        operation: type,
        resource_type: resourceType,
        result: failed === 0 ? 'success' : 'partial'
      }, operations.length);

      batchDuration.observe(
        { operation: type, resource_type: resourceType },
        duration / 1000
      );

      const report: BatchReport = {
        totalOperations: operations.length,
        successful,
        failed,
        duration,
        results,
        errors: results
          .filter(r => !r.success)
          .map(r => ({
            operation: r.operation.id,
            error: r.error?.message || 'Unknown error'
          }))
      };

      this.emit('batchComplete', report);
      return report;

    } catch (error) {
      logger.error({
        key,
        error: error.message
      }, 'Batch execution failed');

      batchOperations.inc({
        operation: type,
        resource_type: resourceType,
        result: 'error'
      }, operations.length);

      return {
        totalOperations: operations.length,
        successful: 0,
        failed: operations.length,
        duration: Date.now() - startTime,
        results: operations.map(op => ({
          operation: op,
          success: false,
          error: error,
          duration: 0,
          attempts: 0
        })),
        errors: [{
          operation: 'batch',
          error: error.message
        }]
      };
    }
  }

  /**
   * Group operations by type
   */
  private groupOperations(operations: BatchOperation<any>[]): Record<string, BatchOperation<any>[]> {
    const grouped: Record<string, BatchOperation<any>[]> = {};

    for (const op of operations) {
      if (!grouped[op.type]) {
        grouped[op.type] = [];
      }
      grouped[op.type].push(op);
    }

    return grouped;
  }

  /**
   * Execute operation group
   */
  private async executeOperationGroup(
    type: string,
    operations: BatchOperation<any>[]
  ): Promise<BatchResult<any>[]> {
    const promises = operations.map(op => 
      this.concurrencyLimiter(() => this.executeOperation(op))
    );

    return Promise.all(promises);
  }

  /**
   * Execute single operation
   */
  private async executeOperation<T>(operation: BatchOperation<T>): Promise<BatchResult<T>> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    let attempts = 0;

    for (let i = 0; i < this.config.retryAttempts; i++) {
      attempts++;

      try {
        const result = await this.performOperation(operation);
        
        return {
          operation,
          success: true,
          result,
          duration: Date.now() - startTime,
          attempts
        };

      } catch (error) {
        lastError = error;
        
        logger.warn({
          operationId: operation.id,
          attempt: attempts,
          error: error.message
        }, 'Operation failed, retrying');

        if (i < this.config.retryAttempts - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, this.config.retryDelay * (i + 1))
          );
        }
      }
    }

    return {
      operation,
      success: false,
      error: lastError || new Error('Operation failed'),
      duration: Date.now() - startTime,
      attempts
    };
  }

  /**
   * Perform the actual Kubernetes operation
   */
  private async performOperation<T>(operation: BatchOperation<T>): Promise<T> {
    const { type, resourceType, namespace, resource, options } = operation;

    switch (resourceType) {
      case 'Deployment':
        return this.performDeploymentOperation(type, namespace!, resource as any, options);
      
      case 'Service':
        return this.performServiceOperation(type, namespace!, resource as any, options);
      
      case 'ConfigMap':
        return this.performConfigMapOperation(type, namespace!, resource as any, options);
      
      case 'Secret':
        return this.performSecretOperation(type, namespace!, resource as any, options);
      
      default:
        throw new Error(`Unsupported resource type: ${resourceType}`);
    }
  }

  /**
   * Perform deployment operations
   */
  private async performDeploymentOperation(
    type: string,
    namespace: string,
    deployment: V1Deployment,
    options?: any
  ): Promise<V1Deployment> {
    const appsApi = this.kubeConfig.makeApiClient(AppsV1Api);

    switch (type) {
      case 'create':
        const created = await appsApi.createNamespacedDeployment(namespace, deployment);
        return created.body;
      
      case 'update':
        const updated = await appsApi.replaceNamespacedDeployment(
          deployment.metadata!.name!,
          namespace,
          deployment
        );
        return updated.body;
      
      case 'patch':
        const patched = await appsApi.patchNamespacedDeployment(
          deployment.metadata!.name!,
          namespace,
          deployment,
          undefined,
          undefined,
          undefined,
          undefined,
          { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
        );
        return patched.body;
      
      case 'delete':
        await appsApi.deleteNamespacedDeployment(
          deployment.metadata!.name!,
          namespace
        );
        return deployment;
      
      default:
        throw new Error(`Unsupported operation type: ${type}`);
    }
  }

  /**
   * Perform service operations
   */
  private async performServiceOperation(
    type: string,
    namespace: string,
    service: V1Service,
    options?: any
  ): Promise<V1Service> {
    const coreApi = this.kubeConfig.makeApiClient(CoreV1Api);

    switch (type) {
      case 'create':
        const created = await coreApi.createNamespacedService(namespace, service);
        return created.body;
      
      case 'update':
        const updated = await coreApi.replaceNamespacedService(
          service.metadata!.name!,
          namespace,
          service
        );
        return updated.body;
      
      case 'patch':
        const patched = await coreApi.patchNamespacedService(
          service.metadata!.name!,
          namespace,
          service,
          undefined,
          undefined,
          undefined,
          undefined,
          { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
        );
        return patched.body;
      
      case 'delete':
        await coreApi.deleteNamespacedService(
          service.metadata!.name!,
          namespace
        );
        return service;
      
      default:
        throw new Error(`Unsupported operation type: ${type}`);
    }
  }

  /**
   * Perform configmap operations
   */
  private async performConfigMapOperation(
    type: string,
    namespace: string,
    configMap: V1ConfigMap,
    options?: any
  ): Promise<V1ConfigMap> {
    const coreApi = this.kubeConfig.makeApiClient(CoreV1Api);

    switch (type) {
      case 'create':
        const created = await coreApi.createNamespacedConfigMap(namespace, configMap);
        return created.body;
      
      case 'update':
        const updated = await coreApi.replaceNamespacedConfigMap(
          configMap.metadata!.name!,
          namespace,
          configMap
        );
        return updated.body;
      
      case 'patch':
        const patched = await coreApi.patchNamespacedConfigMap(
          configMap.metadata!.name!,
          namespace,
          configMap,
          undefined,
          undefined,
          undefined,
          undefined,
          { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
        );
        return patched.body;
      
      case 'delete':
        await coreApi.deleteNamespacedConfigMap(
          configMap.metadata!.name!,
          namespace
        );
        return configMap;
      
      default:
        throw new Error(`Unsupported operation type: ${type}`);
    }
  }

  /**
   * Perform secret operations
   */
  private async performSecretOperation(
    type: string,
    namespace: string,
    secret: V1Secret,
    options?: any
  ): Promise<V1Secret> {
    const coreApi = this.kubeConfig.makeApiClient(CoreV1Api);

    switch (type) {
      case 'create':
        const created = await coreApi.createNamespacedSecret(namespace, secret);
        return created.body;
      
      case 'update':
        const updated = await coreApi.replaceNamespacedSecret(
          secret.metadata!.name!,
          namespace,
          secret
        );
        return updated.body;
      
      case 'patch':
        const patched = await coreApi.patchNamespacedSecret(
          secret.metadata!.name!,
          namespace,
          secret,
          undefined,
          undefined,
          undefined,
          undefined,
          { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
        );
        return patched.body;
      
      case 'delete':
        await coreApi.deleteNamespacedSecret(
          secret.metadata!.name!,
          namespace
        );
        return secret;
      
      default:
        throw new Error(`Unsupported operation type: ${type}`);
    }
  }

  /**
   * Get batch key for grouping
   */
  private getBatchKey(operation: BatchOperation<any>): string {
    return `${operation.resourceType}-${operation.type}-${operation.namespace || 'cluster'}`;
  }

  /**
   * Create empty report
   */
  private createEmptyReport(): BatchReport {
    return {
      totalOperations: 0,
      successful: 0,
      failed: 0,
      duration: 0,
      results: [],
      errors: []
    };
  }

  /**
   * Start metrics updater
   */
  private startMetricsUpdater(): void {
    setInterval(() => {
      for (const [key, queue] of this.batchQueues) {
        const [resourceType] = key.split('-');
        queueSize.set({ resource_type: resourceType }, queue.length);
      }
    }, 5000);
  }

  /**
   * Get queue statistics
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {
      totalQueues: this.batchQueues.size,
      pendingOperations: 0,
      queues: {}
    };

    for (const [key, queue] of this.batchQueues) {
      stats.queues[key] = queue.length;
      stats.pendingOperations += queue.length;
    }

    stats.queueUtilization = this.queue.size;
    stats.queuePending = this.queue.pending;

    return stats;
  }

  /**
   * Clear all pending operations
   */
  clear(): void {
    // Cancel all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    
    this.batchTimers.clear();
    this.batchQueues.clear();
    this.queue.clear();
    
    logger.info('Batch operation manager cleared');
  }
}

// Add missing imports
import { CoreV1Api, AppsV1Api } from '@kubernetes/client-node';