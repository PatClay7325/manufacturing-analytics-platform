/**
 * Saga Pattern Implementation for Distributed Transactions
 * Production-ready transaction orchestration with compensation
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { Redis } from 'ioredis';
import { performance } from 'perf_hooks';

interface SagaStep {
  id: string;
  name: string;
  action: (context: SagaContext) => Promise<any>;
  compensate: (context: SagaContext, actionResult?: any) => Promise<void>;
  timeout?: number;
  retries?: number;
  critical?: boolean; // If true, failure stops the saga
}

interface SagaDefinition {
  id: string;
  name: string;
  steps: SagaStep[];
  timeout?: number;
  onComplete?: (context: SagaContext) => Promise<void>;
  onFailed?: (context: SagaContext, error: Error) => Promise<void>;
}

interface SagaContext {
  sagaId: string;
  tenantId?: string;
  userId?: string;
  correlationId?: string;
  input: any;
  stepResults: Record<string, any>;
  metadata: Record<string, any>;
  startTime: Date;
  currentStep?: string;
}

interface SagaExecution {
  sagaId: string;
  definitionId: string;
  context: SagaContext;
  status: 'running' | 'completed' | 'failed' | 'compensating' | 'compensated';
  currentStepIndex: number;
  completedSteps: string[];
  compensatedSteps: string[];
  error?: Error;
  startTime: Date;
  endTime?: Date;
  metrics: {
    totalSteps: number;
    completedSteps: number;
    failedStep?: string;
    executionTime?: number;
  };
}

export class SagaOrchestrator extends EventEmitter {
  private static instance: SagaOrchestrator;
  private redis: Redis;
  private definitions: Map<string, SagaDefinition> = new Map();
  private executions: Map<string, SagaExecution> = new Map();
  private keyPrefix = 'saga:';

  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_SAGA_DB || '6'),
      keyPrefix: this.keyPrefix,
    });
  }

  static getInstance(): SagaOrchestrator {
    if (!SagaOrchestrator.instance) {
      SagaOrchestrator.instance = new SagaOrchestrator();
    }
    return SagaOrchestrator.instance;
  }

  /**
   * Register saga definition
   */
  registerSaga(definition: SagaDefinition): void {
    // Validate definition
    if (!definition.id || !definition.name || !definition.steps.length) {
      throw new Error('Invalid saga definition');
    }

    // Validate steps
    for (const step of definition.steps) {
      if (!step.id || !step.name || !step.action || !step.compensate) {
        throw new Error(`Invalid step definition: ${step.id}`);
      }
    }

    this.definitions.set(definition.id, definition);
    this.emit('saga_registered', definition);
  }

  /**
   * Start saga execution
   */
  async startSaga(
    definitionId: string,
    input: any,
    options?: {
      tenantId?: string;
      userId?: string;
      correlationId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<string> {
    const definition = this.definitions.get(definitionId);
    if (!definition) {
      throw new Error(`Saga definition not found: ${definitionId}`);
    }

    const sagaId = randomUUID();
    const context: SagaContext = {
      sagaId,
      tenantId: options?.tenantId,
      userId: options?.userId,
      correlationId: options?.correlationId || sagaId,
      input,
      stepResults: {},
      metadata: options?.metadata || {},
      startTime: new Date(),
    };

    const execution: SagaExecution = {
      sagaId,
      definitionId,
      context,
      status: 'running',
      currentStepIndex: 0,
      completedSteps: [],
      compensatedSteps: [],
      startTime: new Date(),
      metrics: {
        totalSteps: definition.steps.length,
        completedSteps: 0,
      },
    };

    // Store execution
    this.executions.set(sagaId, execution);
    await this.persistExecution(execution);

    this.emit('saga_started', { sagaId, definitionId, context });

    // Start execution asynchronously
    setImmediate(() => this.executeSaga(sagaId));

    return sagaId;
  }

  /**
   * Execute saga steps
   */
  private async executeSaga(sagaId: string): Promise<void> {
    const execution = this.executions.get(sagaId);
    if (!execution) {
      throw new Error(`Saga execution not found: ${sagaId}`);
    }

    const definition = this.definitions.get(execution.definitionId);
    if (!definition) {
      throw new Error(`Saga definition not found: ${execution.definitionId}`);
    }

    try {
      // Execute steps sequentially
      for (let i = execution.currentStepIndex; i < definition.steps.length; i++) {
        const step = definition.steps[i];
        execution.currentStepIndex = i;
        execution.context.currentStep = step.id;

        await this.persistExecution(execution);

        try {
          await this.executeStep(execution, step);
          execution.completedSteps.push(step.id);
          execution.metrics.completedSteps++;

          this.emit('step_completed', {
            sagaId,
            stepId: step.id,
            stepName: step.name,
          });
        } catch (error) {
          this.emit('step_failed', {
            sagaId,
            stepId: step.id,
            stepName: step.name,
            error,
          });

          // If step is critical or it's the last attempt, start compensation
          if (step.critical || (step.retries || 0) === 0) {
            execution.error = error as Error;
            execution.metrics.failedStep = step.id;
            await this.startCompensation(execution);
            return;
          }

          throw error;
        }
      }

      // All steps completed successfully
      await this.completeSaga(execution);
    } catch (error) {
      execution.error = error as Error;
      await this.failSaga(execution);
    }
  }

  /**
   * Execute individual step
   */
  private async executeStep(execution: SagaExecution, step: SagaStep): Promise<any> {
    const timeout = step.timeout || 30000; // 30 second default
    const maxRetries = step.retries || 3;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const startTime = performance.now();

        // Execute with timeout
        const result = await Promise.race([
          step.action(execution.context),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Step timeout')), timeout)
          ),
        ]);

        const duration = performance.now() - startTime;

        // Store result
        execution.context.stepResults[step.id] = result;

        this.emit('step_executed', {
          sagaId: execution.sagaId,
          stepId: step.id,
          duration,
          attempt,
          result,
        });

        return result;
      } catch (error) {
        attempt++;
        
        if (attempt <= maxRetries) {
          // Exponential backoff
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          this.emit('step_retry', {
            sagaId: execution.sagaId,
            stepId: step.id,
            attempt,
            error,
          });
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Start compensation process
   */
  private async startCompensation(execution: SagaExecution): Promise<void> {
    execution.status = 'compensating';
    await this.persistExecution(execution);

    this.emit('compensation_started', {
      sagaId: execution.sagaId,
      completedSteps: execution.completedSteps,
    });

    const definition = this.definitions.get(execution.definitionId)!;

    // Compensate in reverse order
    for (let i = execution.completedSteps.length - 1; i >= 0; i--) {
      const stepId = execution.completedSteps[i];
      const step = definition.steps.find(s => s.id === stepId);

      if (step) {
        try {
          await this.compensateStep(execution, step);
          execution.compensatedSteps.push(stepId);

          this.emit('step_compensated', {
            sagaId: execution.sagaId,
            stepId: step.id,
          });
        } catch (error) {
          this.emit('compensation_failed', {
            sagaId: execution.sagaId,
            stepId: step.id,
            error,
          });

          // Log compensation failure but continue
          console.error(`Compensation failed for step ${stepId}:`, error);
        }
      }
    }

    execution.status = 'compensated';
    execution.endTime = new Date();
    execution.metrics.executionTime = execution.endTime.getTime() - execution.startTime.getTime();

    await this.persistExecution(execution);

    // Call saga failure handler
    const sagaDefinition = this.definitions.get(execution.definitionId)!;
    if (sagaDefinition.onFailed) {
      try {
        await sagaDefinition.onFailed(execution.context, execution.error!);
      } catch (error) {
        console.error('Saga failure handler error:', error);
      }
    }

    this.emit('saga_compensated', {
      sagaId: execution.sagaId,
      compensatedSteps: execution.compensatedSteps,
    });
  }

  /**
   * Compensate individual step
   */
  private async compensateStep(execution: SagaExecution, step: SagaStep): Promise<void> {
    const timeout = step.timeout || 30000;
    const stepResult = execution.context.stepResults[step.id];

    await Promise.race([
      step.compensate(execution.context, stepResult),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Compensation timeout')), timeout)
      ),
    ]);
  }

  /**
   * Complete saga successfully
   */
  private async completeSaga(execution: SagaExecution): Promise<void> {
    execution.status = 'completed';
    execution.endTime = new Date();
    execution.metrics.executionTime = execution.endTime.getTime() - execution.startTime.getTime();

    await this.persistExecution(execution);

    // Call saga completion handler
    const definition = this.definitions.get(execution.definitionId)!;
    if (definition.onComplete) {
      try {
        await definition.onComplete(execution.context);
      } catch (error) {
        console.error('Saga completion handler error:', error);
      }
    }

    this.emit('saga_completed', {
      sagaId: execution.sagaId,
      executionTime: execution.metrics.executionTime,
    });
  }

  /**
   * Fail saga without compensation
   */
  private async failSaga(execution: SagaExecution): Promise<void> {
    execution.status = 'failed';
    execution.endTime = new Date();
    execution.metrics.executionTime = execution.endTime.getTime() - execution.startTime.getTime();

    await this.persistExecution(execution);

    this.emit('saga_failed', {
      sagaId: execution.sagaId,
      error: execution.error,
    });
  }

  /**
   * Get saga execution status
   */
  async getSagaStatus(sagaId: string): Promise<SagaExecution | null> {
    // Try memory first
    let execution = this.executions.get(sagaId);
    
    if (!execution) {
      // Try Redis
      const stored = await this.redis.get(`execution:${sagaId}`);
      if (stored) {
        execution = JSON.parse(stored);
        this.executions.set(sagaId, execution!);
      }
    }

    return execution || null;
  }

  /**
   * Cancel running saga
   */
  async cancelSaga(sagaId: string): Promise<boolean> {
    const execution = await this.getSagaStatus(sagaId);
    
    if (!execution || execution.status !== 'running') {
      return false;
    }

    // Start compensation
    await this.startCompensation(execution);
    return true;
  }

  /**
   * Retry failed saga from last successful step
   */
  async retrySaga(sagaId: string): Promise<boolean> {
    const execution = await this.getSagaStatus(sagaId);
    
    if (!execution || !['failed', 'compensated'].includes(execution.status)) {
      return false;
    }

    // Reset execution state
    execution.status = 'running';
    execution.error = undefined;
    execution.endTime = undefined;
    
    // Continue from last successful step
    execution.currentStepIndex = execution.completedSteps.length;

    await this.persistExecution(execution);

    // Resume execution
    setImmediate(() => this.executeSaga(sagaId));

    return true;
  }

  /**
   * Persist execution state
   */
  private async persistExecution(execution: SagaExecution): Promise<void> {
    const key = `execution:${execution.sagaId}`;
    const ttl = 7 * 24 * 60 * 60; // 7 days

    await this.redis.setex(key, ttl, JSON.stringify(execution));
  }

  /**
   * Get saga statistics
   */
  async getStatistics(): Promise<{
    totalSagas: number;
    runningSagas: number;
    completedSagas: number;
    failedSagas: number;
    averageExecutionTime: number;
    registeredDefinitions: number;
  }> {
    const executions = Array.from(this.executions.values());
    
    const stats = {
      totalSagas: executions.length,
      runningSagas: executions.filter(e => e.status === 'running').length,
      completedSagas: executions.filter(e => e.status === 'completed').length,
      failedSagas: executions.filter(e => ['failed', 'compensated'].includes(e.status)).length,
      averageExecutionTime: 0,
      registeredDefinitions: this.definitions.size,
    };

    const completedExecutions = executions.filter(e => e.metrics.executionTime);
    if (completedExecutions.length > 0) {
      stats.averageExecutionTime = completedExecutions.reduce(
        (sum, e) => sum + (e.metrics.executionTime || 0),
        0
      ) / completedExecutions.length;
    }

    return stats;
  }

  /**
   * Cleanup old executions
   */
  async cleanup(olderThan: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = Date.now() - olderThan;
    let cleaned = 0;

    for (const [sagaId, execution] of this.executions.entries()) {
      if (execution.startTime.getTime() < cutoff && 
          ['completed', 'failed', 'compensated'].includes(execution.status)) {
        
        this.executions.delete(sagaId);
        await this.redis.del(`execution:${sagaId}`);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Export singleton instance
export const sagaOrchestrator = SagaOrchestrator.getInstance();