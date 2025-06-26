/**
 * Saga Pattern Implementation for Complex Workflow Compensation
 * Manufacturing Analytics Platform
 */

import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import { EventSourcingService, EventType } from './event-sourcing.service';
import crypto from 'crypto';

export enum SagaStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
}

export enum StepStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
}

export interface SagaStep {
  id: string;
  name: string;
  execute: () => Promise<any>;
  compensate: () => Promise<any>;
  retryable?: boolean;
  maxRetries?: number;
  timeout?: number;
}

export interface SagaContext {
  sagaId: string;
  userId?: string;
  correlationId?: string;
  data: Record<string, any>;
  stepResults: Record<string, any>;
}

export interface SagaDefinition {
  id: string;
  name: string;
  description?: string;
  steps: SagaStep[];
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
  };
}

export interface SagaExecution {
  sagaId: string;
  definitionId: string;
  status: SagaStatus;
  context: SagaContext;
  currentStepIndex: number;
  completedSteps: string[];
  failedSteps: string[];
  compensatedSteps: string[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface StepExecution {
  stepId: string;
  sagaId: string;
  status: StepStatus;
  startedAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  retryCount: number;
}

/**
 * Saga Orchestrator
 * Manages complex distributed transactions with compensation
 */
export class SagaOrchestrator extends EventEmitter {
  private sagaDefinitions: Map<string, SagaDefinition> = new Map();
  private runningExecutions: Map<string, SagaExecution> = new Map();
  private stepExecutions: Map<string, StepExecution> = new Map();

  constructor(
    private prisma: PrismaClient,
    private eventService: EventSourcingService
  ) {
    super();
    this.startSagaMonitoring();
  }

  /**
   * Register a saga definition
   */
  registerSaga(definition: SagaDefinition): void {
    this.sagaDefinitions.set(definition.id, definition);
    console.log(`[Saga] Registered saga definition: ${definition.id}`);
  }

  /**
   * Start a saga execution
   */
  async startSaga(
    definitionId: string,
    context: Partial<SagaContext>
  ): Promise<string> {
    const definition = this.sagaDefinitions.get(definitionId);
    if (!definition) {
      throw new Error(`Saga definition not found: ${definitionId}`);
    }

    const sagaId = crypto.randomUUID();
    const sagaContext: SagaContext = {
      sagaId,
      correlationId: context.correlationId || crypto.randomUUID(),
      data: context.data || {},
      stepResults: {},
      ...context,
    };

    const execution: SagaExecution = {
      sagaId,
      definitionId,
      status: SagaStatus.PENDING,
      context: sagaContext,
      currentStepIndex: 0,
      completedSteps: [],
      failedSteps: [],
      compensatedSteps: [],
      startedAt: new Date(),
    };

    this.runningExecutions.set(sagaId, execution);

    // Persist saga execution state
    await this.persistSagaExecution(execution);

    // Emit saga started event
    await this.eventService.publish({
      eventType: EventType.MAINTENANCE_SCHEDULED, // Using closest available event type
      aggregateId: sagaId,
      aggregateType: 'saga',
      eventData: {
        sagaId,
        definitionId,
        status: SagaStatus.PENDING,
        context: sagaContext,
      },
      eventMetadata: {
        userId: context.userId,
        correlationId: sagaContext.correlationId,
        timestamp: new Date(),
        version: 1,
      },
    });

    // Start execution asynchronously
    this.executeSaga(sagaId).catch(error => {
      console.error(`[Saga] Error executing saga ${sagaId}:`, error);
    });

    return sagaId;
  }

  /**
   * Execute saga steps
   */
  private async executeSaga(sagaId: string): Promise<void> {
    const execution = this.runningExecutions.get(sagaId);
    if (!execution) {
      throw new Error(`Saga execution not found: ${sagaId}`);
    }

    const definition = this.sagaDefinitions.get(execution.definitionId);
    if (!definition) {
      throw new Error(`Saga definition not found: ${execution.definitionId}`);
    }

    try {
      execution.status = SagaStatus.RUNNING;
      await this.persistSagaExecution(execution);

      // Execute steps sequentially
      for (let i = execution.currentStepIndex; i < definition.steps.length; i++) {
        const step = definition.steps[i];
        execution.currentStepIndex = i;

        try {
          await this.executeStep(sagaId, step);
          execution.completedSteps.push(step.id);
          execution.context.stepResults[step.id] = this.stepExecutions.get(`${sagaId}:${step.id}`)?.result;
        } catch (error) {
          console.error(`[Saga] Step ${step.id} failed in saga ${sagaId}:`, error);
          execution.failedSteps.push(step.id);
          
          // Start compensation
          await this.compensateSaga(sagaId, error as Error);
          return;
        }
      }

      // All steps completed successfully
      execution.status = SagaStatus.COMPLETED;
      execution.completedAt = new Date();
      await this.persistSagaExecution(execution);

      this.emit('sagaCompleted', execution);
      console.log(`[Saga] Saga ${sagaId} completed successfully`);

    } catch (error) {
      execution.status = SagaStatus.FAILED;
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();
      await this.persistSagaExecution(execution);

      this.emit('sagaFailed', execution);
      console.error(`[Saga] Saga ${sagaId} failed:`, error);
    } finally {
      this.runningExecutions.delete(sagaId);
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(sagaId: string, step: SagaStep): Promise<any> {
    const stepExecutionId = `${sagaId}:${step.id}`;
    const maxRetries = step.maxRetries || 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const stepExecution: StepExecution = {
        stepId: step.id,
        sagaId,
        status: StepStatus.RUNNING,
        startedAt: new Date(),
        retryCount: attempt,
      };

      this.stepExecutions.set(stepExecutionId, stepExecution);

      try {
        // Set timeout if specified
        const result = step.timeout
          ? await Promise.race([
              step.execute(),
              this.createTimeoutPromise(step.timeout, `Step ${step.id} timed out`),
            ])
          : await step.execute();

        stepExecution.status = StepStatus.COMPLETED;
        stepExecution.completedAt = new Date();
        stepExecution.result = result;

        this.emit('stepCompleted', stepExecution);
        return result;

      } catch (error) {
        stepExecution.status = StepStatus.FAILED;
        stepExecution.completedAt = new Date();
        stepExecution.error = error instanceof Error ? error.message : String(error);

        this.emit('stepFailed', stepExecution);

        // Retry if step is retryable and we haven't exceeded max retries
        if (step.retryable && attempt < maxRetries) {
          console.warn(`[Saga] Retrying step ${step.id} (attempt ${attempt + 1}/${maxRetries + 1})`);
          await this.sleep(1000 * Math.pow(2, attempt)); // Exponential backoff
          continue;
        }

        throw error;
      }
    }

    throw new Error(`Step ${step.id} failed after ${maxRetries + 1} attempts`);
  }

  /**
   * Compensate saga by executing compensation actions for completed steps
   */
  private async compensateSaga(sagaId: string, error: Error): Promise<void> {
    const execution = this.runningExecutions.get(sagaId);
    if (!execution) {
      throw new Error(`Saga execution not found: ${sagaId}`);
    }

    const definition = this.sagaDefinitions.get(execution.definitionId);
    if (!definition) {
      throw new Error(`Saga definition not found: ${execution.definitionId}`);
    }

    execution.status = SagaStatus.COMPENSATING;
    execution.error = error.message;
    await this.persistSagaExecution(execution);

    console.log(`[Saga] Starting compensation for saga ${sagaId}`);

    // Compensate completed steps in reverse order
    const completedSteps = [...execution.completedSteps].reverse();
    
    for (const stepId of completedSteps) {
      const step = definition.steps.find(s => s.id === stepId);
      if (!step) {
        console.warn(`[Saga] Step definition not found for compensation: ${stepId}`);
        continue;
      }

      try {
        await this.compensateStep(sagaId, step);
        execution.compensatedSteps.push(stepId);
      } catch (compensationError) {
        console.error(`[Saga] Compensation failed for step ${stepId}:`, compensationError);
        // Continue with other compensations even if one fails
      }
    }

    execution.status = SagaStatus.COMPENSATED;
    execution.completedAt = new Date();
    await this.persistSagaExecution(execution);

    this.emit('sagaCompensated', execution);
    console.log(`[Saga] Saga ${sagaId} compensated`);
  }

  /**
   * Compensate a single step
   */
  private async compensateStep(sagaId: string, step: SagaStep): Promise<void> {
    const stepExecutionId = `${sagaId}:${step.id}:compensation`;
    
    const stepExecution: StepExecution = {
      stepId: `${step.id}:compensation`,
      sagaId,
      status: StepStatus.COMPENSATING,
      startedAt: new Date(),
      retryCount: 0,
    };

    this.stepExecutions.set(stepExecutionId, stepExecution);

    try {
      await step.compensate();
      
      stepExecution.status = StepStatus.COMPENSATED;
      stepExecution.completedAt = new Date();

      this.emit('stepCompensated', stepExecution);
      console.log(`[Saga] Compensated step ${step.id} in saga ${sagaId}`);

    } catch (error) {
      stepExecution.status = StepStatus.FAILED;
      stepExecution.completedAt = new Date();
      stepExecution.error = error instanceof Error ? error.message : String(error);

      this.emit('stepCompensationFailed', stepExecution);
      throw error;
    }
  }

  /**
   * Get saga execution status
   */
  getSagaStatus(sagaId: string): SagaExecution | null {
    return this.runningExecutions.get(sagaId) || null;
  }

  /**
   * Get all running sagas
   */
  getRunningSagas(): SagaExecution[] {
    return Array.from(this.runningExecutions.values());
  }

  /**
   * Cancel a running saga
   */
  async cancelSaga(sagaId: string): Promise<void> {
    const execution = this.runningExecutions.get(sagaId);
    if (!execution) {
      throw new Error(`Saga execution not found: ${sagaId}`);
    }

    if (execution.status === SagaStatus.RUNNING) {
      await this.compensateSaga(sagaId, new Error('Saga cancelled by user'));
    }
  }

  /**
   * Persist saga execution state
   */
  private async persistSagaExecution(execution: SagaExecution): Promise<void> {
    try {
      // In a real implementation, save to database
      // For now, just emit event for audit trail
      await this.eventService.publish({
        eventType: EventType.MAINTENANCE_COMPLETED, // Using closest available event type
        aggregateId: execution.sagaId,
        aggregateType: 'saga',
        eventData: {
          status: execution.status,
          currentStepIndex: execution.currentStepIndex,
          completedSteps: execution.completedSteps,
          failedSteps: execution.failedSteps,
          error: execution.error,
        },
        eventMetadata: {
          userId: execution.context.userId,
          correlationId: execution.context.correlationId,
          timestamp: new Date(),
          version: 1,
        },
      });
    } catch (error) {
      console.error(`[Saga] Failed to persist execution state:`, error);
    }
  }

  /**
   * Start monitoring for saga timeouts and cleanup
   */
  private startSagaMonitoring(): void {
    setInterval(() => {
      const now = Date.now();
      
      this.runningExecutions.forEach(async (execution, sagaId) => {
        const definition = this.sagaDefinitions.get(execution.definitionId);
        if (!definition?.timeout) return;

        const elapsedTime = now - execution.startedAt.getTime();
        if (elapsedTime > definition.timeout) {
          console.warn(`[Saga] Saga ${sagaId} timed out after ${elapsedTime}ms`);
          await this.compensateSaga(sagaId, new Error(`Saga timed out after ${elapsedTime}ms`));
        }
      });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise<T>(timeoutMs: number, message: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Manufacturing Saga Definitions
 */
export class ManufacturingSagas {
  constructor(
    private sagaOrchestrator: SagaOrchestrator,
    private prisma: PrismaClient
  ) {
    this.registerManufacturingSagas();
  }

  /**
   * Register all manufacturing saga definitions
   */
  private registerManufacturingSagas(): void {
    this.registerProductionOrderSaga();
    this.registerMaintenanceWorkflowSaga();
    this.registerQualityIncidentSaga();
    this.registerEquipmentDecommissionSaga();
  }

  /**
   * Production Order Processing Saga
   */
  private registerProductionOrderSaga(): void {
    const saga: SagaDefinition = {
      id: 'production-order-processing',
      name: 'Production Order Processing',
      description: 'Complete workflow for processing a production order',
      timeout: 3600000, // 1 hour
      steps: [
        {
          id: 'validate-order',
          name: 'Validate Production Order',
          execute: async () => {
            // Validate order data, check material availability, etc.
            console.log('Validating production order...');
            return { validated: true };
          },
          compensate: async () => {
            console.log('Cancelling order validation...');
          },
          retryable: true,
          maxRetries: 2,
        },
        {
          id: 'reserve-materials',
          name: 'Reserve Materials',
          execute: async () => {
            // Reserve required materials
            console.log('Reserving materials...');
            return { materialsReserved: ['material1', 'material2'] };
          },
          compensate: async () => {
            console.log('Releasing reserved materials...');
          },
          retryable: true,
          maxRetries: 3,
        },
        {
          id: 'schedule-production',
          name: 'Schedule Production',
          execute: async () => {
            // Schedule production on equipment
            console.log('Scheduling production...');
            return { scheduledTime: new Date() };
          },
          compensate: async () => {
            console.log('Cancelling production schedule...');
          },
          retryable: false,
        },
        {
          id: 'notify-operators',
          name: 'Notify Operators',
          execute: async () => {
            // Send notifications to operators
            console.log('Notifying operators...');
            return { notificationsSent: 3 };
          },
          compensate: async () => {
            console.log('Sending cancellation notifications...');
          },
          retryable: true,
          maxRetries: 5,
        },
      ],
    };

    this.sagaOrchestrator.registerSaga(saga);
  }

  /**
   * Maintenance Workflow Saga
   */
  private registerMaintenanceWorkflowSaga(): void {
    const saga: SagaDefinition = {
      id: 'maintenance-workflow',
      name: 'Equipment Maintenance Workflow',
      description: 'Complete maintenance workflow from scheduling to completion',
      timeout: 7200000, // 2 hours
      steps: [
        {
          id: 'create-work-order',
          name: 'Create Maintenance Work Order',
          execute: async () => {
            console.log('Creating maintenance work order...');
            return { workOrderId: 'WO-' + Date.now() };
          },
          compensate: async () => {
            console.log('Cancelling work order...');
          },
        },
        {
          id: 'stop-equipment',
          name: 'Stop Equipment',
          execute: async () => {
            console.log('Stopping equipment for maintenance...');
            return { stopped: true, stopTime: new Date() };
          },
          compensate: async () => {
            console.log('Restarting equipment...');
          },
          timeout: 300000, // 5 minutes
        },
        {
          id: 'assign-technician',
          name: 'Assign Technician',
          execute: async () => {
            console.log('Assigning maintenance technician...');
            return { technicianId: 'TECH-001' };
          },
          compensate: async () => {
            console.log('Unassigning technician...');
          },
          retryable: true,
          maxRetries: 3,
        },
        {
          id: 'update-maintenance-log',
          name: 'Update Maintenance Log',
          execute: async () => {
            console.log('Updating maintenance log...');
            return { logUpdated: true };
          },
          compensate: async () => {
            console.log('Reverting maintenance log...');
          },
        },
      ],
    };

    this.sagaOrchestrator.registerSaga(saga);
  }

  /**
   * Quality Incident Response Saga
   */
  private registerQualityIncidentSaga(): void {
    const saga: SagaDefinition = {
      id: 'quality-incident-response',
      name: 'Quality Incident Response',
      description: 'Response workflow for quality incidents',
      timeout: 1800000, // 30 minutes
      steps: [
        {
          id: 'stop-production',
          name: 'Stop Production',
          execute: async () => {
            console.log('Stopping production due to quality incident...');
            return { productionStopped: true };
          },
          compensate: async () => {
            console.log('Resuming production...');
          },
        },
        {
          id: 'quarantine-products',
          name: 'Quarantine Products',
          execute: async () => {
            console.log('Quarantining affected products...');
            return { quarantinedProducts: ['BATCH-001', 'BATCH-002'] };
          },
          compensate: async () => {
            console.log('Releasing quarantined products...');
          },
        },
        {
          id: 'notify-quality-team',
          name: 'Notify Quality Team',
          execute: async () => {
            console.log('Notifying quality assurance team...');
            return { notified: true };
          },
          compensate: async () => {
            console.log('Cancelling quality team alert...');
          },
          retryable: true,
          maxRetries: 2,
        },
        {
          id: 'create-incident-report',
          name: 'Create Incident Report',
          execute: async () => {
            console.log('Creating quality incident report...');
            return { reportId: 'QI-' + Date.now() };
          },
          compensate: async () => {
            console.log('Deleting incident report...');
          },
        },
      ],
    };

    this.sagaOrchestrator.registerSaga(saga);
  }

  /**
   * Equipment Decommission Saga
   */
  private registerEquipmentDecommissionSaga(): void {
    const saga: SagaDefinition = {
      id: 'equipment-decommission',
      name: 'Equipment Decommission',
      description: 'Complete workflow for decommissioning equipment',
      timeout: 7200000, // 2 hours
      steps: [
        {
          id: 'complete-current-production',
          name: 'Complete Current Production',
          execute: async () => {
            console.log('Completing current production runs...');
            return { productionCompleted: true };
          },
          compensate: async () => {
            console.log('Reverting production completion...');
          },
          timeout: 3600000, // 1 hour
        },
        {
          id: 'transfer-scheduled-orders',
          name: 'Transfer Scheduled Orders',
          execute: async () => {
            console.log('Transferring scheduled orders to other equipment...');
            return { ordersTransferred: 5 };
          },
          compensate: async () => {
            console.log('Reverting order transfers...');
          },
        },
        {
          id: 'update-equipment-status',
          name: 'Update Equipment Status',
          execute: async () => {
            console.log('Updating equipment status to decommissioned...');
            return { statusUpdated: true };
          },
          compensate: async () => {
            console.log('Reverting equipment status...');
          },
        },
        {
          id: 'archive-historical-data',
          name: 'Archive Historical Data',
          execute: async () => {
            console.log('Archiving equipment historical data...');
            return { dataArchived: true };
          },
          compensate: async () => {
            console.log('Restoring archived data...');
          },
        },
      ],
    };

    this.sagaOrchestrator.registerSaga(saga);
  }

  /**
   * Start a production order saga
   */
  async startProductionOrderProcessing(orderData: any): Promise<string> {
    return this.sagaOrchestrator.startSaga('production-order-processing', {
      data: orderData,
      userId: orderData.userId,
    });
  }

  /**
   * Start a maintenance workflow saga
   */
  async startMaintenanceWorkflow(maintenanceData: any): Promise<string> {
    return this.sagaOrchestrator.startSaga('maintenance-workflow', {
      data: maintenanceData,
      userId: maintenanceData.userId,
    });
  }

  /**
   * Start a quality incident response saga
   */
  async startQualityIncidentResponse(incidentData: any): Promise<string> {
    return this.sagaOrchestrator.startSaga('quality-incident-response', {
      data: incidentData,
      userId: incidentData.userId,
    });
  }

  /**
   * Start an equipment decommission saga
   */
  async startEquipmentDecommission(equipmentData: any): Promise<string> {
    return this.sagaOrchestrator.startSaga('equipment-decommission', {
      data: equipmentData,
      userId: equipmentData.userId,
    });
  }
}