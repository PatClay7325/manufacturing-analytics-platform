/**
 * Production-ready workflow orchestration engine
 * Coordinates OPC UA, MQTT, and AI agents for complex manufacturing workflows
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { RedisMessageQueue } from './MessageQueue';
import { AgentExecutor } from './AgentExecutor';
import { 
  IWorkflowEngine, 
  WorkflowDefinition, 
  WorkflowExecution, 
  WorkflowExecutionStatus,
  StepExecution,
  StepExecutionStatus,
  WorkflowEvent,
  WorkflowContext,
  WorkflowError,
  QueueMessage,
  WorkflowPriority,
  WorkflowMonitoringData,
  WorkflowStep,
  WorkflowCondition
} from './types';
import { CircuitBreakerFactory } from '@/lib/resilience/circuitBreaker';
import { 
  workflowExecutionDuration,
  workflowExecutionCounter,
  activeWorkflowsGauge,
  stepExecutionDuration,
  workflowErrorCounter
} from '@/lib/observability/workflowMetrics';
import { SecurityValidator } from './utils/SecurityValidator';
import { TransformationEngine } from './utils/TransformationEngine';

export class WorkflowEngine extends EventEmitter implements IWorkflowEngine {
  private static instance: WorkflowEngine;
  private messageQueue: RedisMessageQueue;
  private agentExecutor: AgentExecutor;
  private circuitBreaker;
  private isRunning = false;
  private workerPromises: Promise<void>[] = [];
  private readonly maxConcurrentWorkflows = 50;
  private readonly activeExecutions = new Map<string, WorkflowExecution>();

  constructor() {
    super();
    this.messageQueue = new RedisMessageQueue();
    this.agentExecutor = new AgentExecutor();
    this.circuitBreaker = CircuitBreakerFactory.getOrCreate('workflow-engine', {
      failureThreshold: 10,
      resetTimeout: 60000,
      monitoringPeriod: 120000,
    });
  }

  static getInstance(): WorkflowEngine {
    if (!WorkflowEngine.instance) {
      WorkflowEngine.instance = new WorkflowEngine();
    }
    return WorkflowEngine.instance;
  }

  /**
   * Register a new workflow definition
   */
  async registerWorkflow(definition: WorkflowDefinition): Promise<void> {
    try {
      await this.circuitBreaker.execute(async () => {
        // Validate workflow definition
        this.validateWorkflowDefinition(definition);

        // Store in database
        await prisma.workflowDefinition.upsert({
          where: { id: definition.id },
          update: {
            name: definition.name,
            description: definition.description,
            version: definition.version,
            definition: definition as any,
            updatedAt: new Date(),
          },
          create: {
            id: definition.id,
            name: definition.name,
            description: definition.description,
            version: definition.version,
            definition: definition as any,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        logger.info({
          workflowId: definition.id,
          workflowName: definition.name,
          version: definition.version,
        }, 'Workflow registered');

        this.emit('workflow:registered', definition);
      });
    } catch (error) {
      logger.error({ error, workflowId: definition.id }, 'Failed to register workflow');
      throw error;
    }
  }

  /**
   * Update existing workflow definition
   */
  async updateWorkflow(id: string, definition: Partial<WorkflowDefinition>): Promise<void> {
    try {
      await this.circuitBreaker.execute(async () => {
        const existing = await prisma.workflowDefinition.findUnique({
          where: { id },
        });

        if (!existing) {
          throw new Error(`Workflow ${id} not found`);
        }

        const updatedDefinition = { ...existing.definition, ...definition } as WorkflowDefinition;
        this.validateWorkflowDefinition(updatedDefinition);

        await prisma.workflowDefinition.update({
          where: { id },
          data: {
            definition: updatedDefinition as any,
            updatedAt: new Date(),
          },
        });

        logger.info({ workflowId: id }, 'Workflow updated');
        this.emit('workflow:updated', updatedDefinition);
      });
    } catch (error) {
      logger.error({ error, workflowId: id }, 'Failed to update workflow');
      throw error;
    }
  }

  /**
   * Delete workflow definition
   */
  async deleteWorkflow(id: string): Promise<void> {
    try {
      await this.circuitBreaker.execute(async () => {
        // Check for active executions
        const activeCount = await prisma.workflowExecution.count({
          where: {
            workflowId: id,
            status: {
              in: [WorkflowExecutionStatus.QUEUED, WorkflowExecutionStatus.RUNNING],
            },
          },
        });

        if (activeCount > 0) {
          throw new Error(`Cannot delete workflow ${id}: ${activeCount} active executions`);
        }

        await prisma.workflowDefinition.delete({
          where: { id },
        });

        logger.info({ workflowId: id }, 'Workflow deleted');
        this.emit('workflow:deleted', { workflowId: id });
      });
    } catch (error) {
      logger.error({ error, workflowId: id }, 'Failed to delete workflow');
      throw error;
    }
  }

  /**
   * Get workflow definition
   */
  async getWorkflow(id: string): Promise<WorkflowDefinition | null> {
    try {
      const result = await prisma.workflowDefinition.findUnique({
        where: { id },
      });

      return result ? (result.definition as any) : null;
    } catch (error) {
      logger.error({ error, workflowId: id }, 'Failed to get workflow');
      return null;
    }
  }

  /**
   * List all workflow definitions
   */
  async listWorkflows(): Promise<WorkflowDefinition[]> {
    try {
      const results = await prisma.workflowDefinition.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return results.map(r => r.definition as any);
    } catch (error) {
      logger.error({ error }, 'Failed to list workflows');
      return [];
    }
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string, 
    input: any, 
    context?: Partial<WorkflowContext>
  ): Promise<string> {
    const executionId = uuidv4();
    const traceId = context?.traceId || uuidv4();

    try {
      await this.circuitBreaker.execute(async () => {
        // Validate and sanitize input
        const inputValidation = SecurityValidator.validateExecutionInput(input);
        if (!inputValidation.valid) {
          throw new Error(`Invalid input: ${inputValidation.errors.join(', ')}`);
        }

        // Get workflow definition
        const workflow = await this.getWorkflow(workflowId);
        if (!workflow) {
          throw new Error(`Workflow ${workflowId} not found`);
        }

        // Create execution context with sanitized data
        const executionContext: WorkflowContext = {
          sessionId: context.sessionId,
          userId: context.userId,
          equipmentId: context.equipmentId,
          variables: SecurityValidator.validateExecutionInput(context?.variables || {}).sanitized || {},
          metadata: { workflowId, executionId, ...context?.metadata },
          traceId,
        };

        // Create execution record with sanitized input
        const execution: WorkflowExecution = {
          id: executionId,
          workflowId,
          workflowVersion: workflow.version,
          status: WorkflowExecutionStatus.QUEUED,
          input: inputValidation.sanitized,
          context: executionContext,
          startedAt: new Date(),
          steps: [],
          metrics: {
            queueTime: 0,
            executionTime: 0,
            stepCount: workflow.steps.length,
            retryCount: 0,
          },
        };

        // Store execution in database
        await prisma.workflowExecution.create({
          data: {
            id: executionId,
            workflowId,
            workflowVersion: workflow.version,
            status: execution.status,
            input: input as any,
            context: executionContext as any,
            startedAt: execution.startedAt,
            metadata: execution.metrics as any,
          },
        });

        // Queue for execution
        const message: QueueMessage = {
          id: uuidv4(),
          type: 'workflow-execution',
          priority: workflow.priority,
          payload: {
            executionId,
            workflowId,
            workflow,
            input,
            context: executionContext,
          },
          metadata: {
            workflowId,
            executionId,
            traceId,
            createdAt: new Date(),
            retryCount: 0,
            maxRetries: 3,
          },
        };

        await this.messageQueue.enqueue(message);

        logger.info({
          executionId,
          workflowId,
          traceId,
          priority: workflow.priority,
        }, 'Workflow execution queued');

        this.emit('workflow:queued', execution);
        workflowExecutionCounter.inc({ workflow: workflowId, status: 'queued' });
      });

      return executionId;
    } catch (error) {
      logger.error({ 
        error, 
        executionId, 
        workflowId, 
        traceId 
      }, 'Failed to execute workflow');
      
      workflowErrorCounter.inc({ workflow: workflowId, type: 'execution_error' });
      throw error;
    }
  }

  /**
   * Cancel workflow execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    try {
      await this.circuitBreaker.execute(async () => {
        const execution = this.activeExecutions.get(executionId);
        if (execution) {
          execution.status = WorkflowExecutionStatus.CANCELLED;
          execution.completedAt = new Date();
          
          // Update database
          await this.updateExecutionStatus(execution);
          
          // Clean up
          this.activeExecutions.delete(executionId);
          
          logger.info({ executionId }, 'Workflow execution cancelled');
          this.emit('workflow:cancelled', execution);
        }
      });
    } catch (error) {
      logger.error({ error, executionId }, 'Failed to cancel execution');
      throw error;
    }
  }

  /**
   * Get workflow execution details
   */
  async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    try {
      // Check active executions first
      const activeExecution = this.activeExecutions.get(executionId);
      if (activeExecution) {
        return activeExecution;
      }

      // Query database
      const result = await prisma.workflowExecution.findUnique({
        where: { id: executionId },
        include: {
          steps: true,
        },
      });

      if (!result) {
        return null;
      }

      return {
        id: result.id,
        workflowId: result.workflowId,
        workflowVersion: result.workflowVersion,
        status: result.status as WorkflowExecutionStatus,
        input: result.input as any,
        output: result.output as any,
        error: result.error as any,
        context: result.context as any,
        startedAt: result.startedAt,
        completedAt: result.completedAt || undefined,
        duration: result.duration || undefined,
        steps: result.steps.map(step => ({
          stepId: step.stepId,
          status: step.status as StepExecutionStatus,
          input: step.input as any,
          output: step.output as any,
          error: step.error as any,
          attempt: step.attempt,
          startedAt: step.startedAt,
          completedAt: step.completedAt || undefined,
          duration: step.duration || undefined,
          logs: step.logs as string[],
        })),
        metrics: result.metadata as any,
      };
    } catch (error) {
      logger.error({ error, executionId }, 'Failed to get execution');
      return null;
    }
  }

  /**
   * List workflow executions
   */
  async listExecutions(
    workflowId?: string, 
    status?: WorkflowExecutionStatus
  ): Promise<WorkflowExecution[]> {
    try {
      const where: any = {};
      if (workflowId) where.workflowId = workflowId;
      if (status) where.status = status;

      const results = await prisma.workflowExecution.findMany({
        where,
        include: { steps: true },
        orderBy: { startedAt: 'desc' },
        take: 100,
      });

      return results.map(result => ({
        id: result.id,
        workflowId: result.workflowId,
        workflowVersion: result.workflowVersion,
        status: result.status as WorkflowExecutionStatus,
        input: result.input as any,
        output: result.output as any,
        error: result.error as any,
        context: result.context as any,
        startedAt: result.startedAt,
        completedAt: result.completedAt || undefined,
        duration: result.duration || undefined,
        steps: result.steps.map(step => ({
          stepId: step.stepId,
          status: step.status as StepExecutionStatus,
          input: step.input as any,
          output: step.output as any,
          error: step.error as any,
          attempt: step.attempt,
          startedAt: step.startedAt,
          completedAt: step.completedAt || undefined,
          duration: step.duration || undefined,
          logs: step.logs as string[],
        })),
        metrics: result.metadata as any,
      }));
    } catch (error) {
      logger.error({ error, workflowId, status }, 'Failed to list executions');
      return [];
    }
  }

  /**
   * Publish workflow event
   */
  async publishEvent(event: WorkflowEvent): Promise<void> {
    try {
      this.emit('workflow:event', event);
      
      // Find workflows triggered by this event
      const workflows = await this.findTriggeredWorkflows(event);
      
      for (const workflow of workflows) {
        await this.executeWorkflow(workflow.id, event.payload, {
          traceId: event.metadata.traceId,
          metadata: { triggeredBy: event.type, eventSource: event.source },
        });
      }
    } catch (error) {
      logger.error({ error, eventType: event.type }, 'Failed to publish event');
    }
  }

  /**
   * Get workflow monitoring metrics
   */
  async getMetrics(): Promise<WorkflowMonitoringData> {
    try {
      const [activeCount, queuedCount, completedToday, failedToday] = await Promise.all([
        this.activeExecutions.size,
        prisma.workflowExecution.count({
          where: { status: WorkflowExecutionStatus.QUEUED },
        }),
        prisma.workflowExecution.count({
          where: {
            status: WorkflowExecutionStatus.COMPLETED,
            completedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.workflowExecution.count({
          where: {
            status: WorkflowExecutionStatus.FAILED,
            completedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      // Calculate average execution time (last 100 executions)
      const recentExecutions = await prisma.workflowExecution.findMany({
        where: { 
          status: WorkflowExecutionStatus.COMPLETED,
          duration: { not: null },
        },
        select: { duration: true },
        orderBy: { completedAt: 'desc' },
        take: 100,
      });

      const avgExecutionTime = recentExecutions.length > 0
        ? recentExecutions.reduce((sum, exec) => sum + (exec.duration || 0), 0) / recentExecutions.length
        : 0;

      const totalProcessed = completedToday + failedToday;
      const throughput = totalProcessed / 24; // per hour
      const errorRate = totalProcessed > 0 ? failedToday / totalProcessed : 0;

      // Resource utilization (simplified)
      const memUsage = process.memoryUsage();
      const resourceUtilization = {
        cpu: 0, // Would need separate monitoring
        memory: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
        queue: Math.min((queuedCount / 1000) * 100, 100), // Assume 1000 is max healthy queue size
      };

      return {
        activeExecutions: activeCount,
        queuedExecutions: queuedCount,
        completedExecutions: completedToday,
        failedExecutions: failedToday,
        averageExecutionTime: Math.round(avgExecutionTime),
        throughput: Math.round(throughput * 100) / 100,
        errorRate: Math.round(errorRate * 10000) / 100, // Percentage with 2 decimals
        resourceUtilization,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get workflow metrics');
      return {
        activeExecutions: 0,
        queuedExecutions: 0,
        completedExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        throughput: 0,
        errorRate: 0,
        resourceUtilization: { cpu: 0, memory: 0, queue: 0 },
      };
    }
  }

  /**
   * Start the workflow engine
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Start message queue
    await this.messageQueue.start();

    // Start worker processes
    this.startWorkers();

    // Start monitoring
    this.startMonitoring();

    logger.info('Workflow engine started');
    this.emit('engine:started');
  }

  /**
   * Stop the workflow engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Wait for active workflows to complete
    await this.waitForActiveWorkflows();

    // Stop message queue
    await this.messageQueue.stop();

    // Wait for workers to finish
    await Promise.allSettled(this.workerPromises);

    logger.info('Workflow engine stopped');
    this.emit('engine:stopped');
  }

  private startWorkers(): void {
    const queueNames = [
      'workflow-critical',
      'workflow-high', 
      'workflow-normal',
      'workflow-background',
    ];

    for (const queueName of queueNames) {
      // Start multiple workers per queue based on priority
      const workerCount = queueName.includes('critical') ? 5 : 
                         queueName.includes('high') ? 3 : 2;

      for (let i = 0; i < workerCount; i++) {
        const worker = this.createWorker(queueName);
        this.workerPromises.push(worker);
      }
    }
  }

  private async createWorker(queueName: string): Promise<void> {
    while (this.isRunning) {
      try {
        if (this.activeExecutions.size >= this.maxConcurrentWorkflows) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const message = await this.messageQueue.dequeue(queueName);
        if (!message) {
          continue;
        }

        try {
          await this.processWorkflowMessage(message);
          await this.messageQueue.ack(message.id);
        } catch (error) {
          logger.error({ 
            error, 
            messageId: message.id, 
            queueName 
          }, 'Workflow processing failed');
          
          await this.messageQueue.nack(message.id, true);
        }
      } catch (error) {
        logger.error({ error, queueName }, 'Worker error');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async processWorkflowMessage(message: QueueMessage): Promise<void> {
    const { executionId, workflowId, workflow, input, context } = message.payload;
    const timer = workflowExecutionDuration.startTimer({ workflow: workflowId });

    try {
      // Create execution object
      const execution: WorkflowExecution = {
        id: executionId,
        workflowId,
        workflowVersion: workflow.version,
        status: WorkflowExecutionStatus.RUNNING,
        input,
        context,
        startedAt: new Date(),
        steps: [],
        metrics: {
          queueTime: Date.now() - message.metadata.createdAt.getTime(),
          executionTime: 0,
          stepCount: workflow.steps.length,
          retryCount: message.metadata.retryCount,
        },
      };

      // Track active execution
      this.activeExecutions.set(executionId, execution);
      activeWorkflowsGauge.set(this.activeExecutions.size);

      // Update status in database
      await this.updateExecutionStatus(execution);

      // Execute workflow steps
      const result = await this.executeWorkflowSteps(workflow.steps, execution);

      // Update final status
      execution.status = result.success ? WorkflowExecutionStatus.COMPLETED : WorkflowExecutionStatus.FAILED;
      execution.output = result.output;
      execution.error = result.error;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      execution.metrics.executionTime = execution.duration;

      await this.updateExecutionStatus(execution);

      // Clean up
      this.activeExecutions.delete(executionId);
      activeWorkflowsGauge.set(this.activeExecutions.size);

      // Emit completion event
      this.emit('workflow:completed', execution);
      workflowExecutionCounter.inc({ 
        workflow: workflowId, 
        status: execution.status 
      });

      logger.info({
        executionId,
        workflowId,
        status: execution.status,
        duration: execution.duration,
        stepCount: execution.steps.length,
      }, 'Workflow execution completed');

    } catch (error) {
      logger.error({ 
        error, 
        executionId, 
        workflowId 
      }, 'Workflow execution failed');
      
      workflowErrorCounter.inc({ workflow: workflowId, type: 'execution_error' });
      throw error;
    } finally {
      timer();
    }
  }

  private async executeWorkflowSteps(
    steps: WorkflowStep[], 
    execution: WorkflowExecution
  ): Promise<{ success: boolean; output?: any; error?: WorkflowError }> {
    let currentData = execution.input;
    const completedSteps = new Set<string>();

    for (const step of steps) {
      // Check dependencies
      if (step.dependencies) {
        const unmetDeps = step.dependencies.filter(dep => !completedSteps.has(dep));
        if (unmetDeps.length > 0) {
          // Skip for now - would need proper dependency resolution
          continue;
        }
      }

      // Evaluate condition if present
      if (step.condition && !this.evaluateCondition(step.condition, currentData, execution.context)) {
        const stepExecution: StepExecution = {
          stepId: step.id,
          status: StepExecutionStatus.SKIPPED,
          input: currentData,
          attempt: 1,
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 0,
          logs: ['Step skipped due to condition'],
        };
        execution.steps.push(stepExecution);
        completedSteps.add(step.id);
        continue;
      }

      // Execute step
      const stepTimer = stepExecutionDuration.startTimer({ step: step.type });
      const stepExecution: StepExecution = {
        stepId: step.id,
        status: StepExecutionStatus.RUNNING,
        input: currentData,
        attempt: 1,
        startedAt: new Date(),
        logs: [],
      };

      try {
        const stepResult = await this.executeStep(step, currentData, execution.context);
        
        stepExecution.status = StepExecutionStatus.COMPLETED;
        stepExecution.output = stepResult;
        stepExecution.completedAt = new Date();
        stepExecution.duration = stepExecution.completedAt.getTime() - stepExecution.startedAt.getTime();
        
        // Update current data for next step
        currentData = stepResult;
        completedSteps.add(step.id);

      } catch (error) {
        stepExecution.status = StepExecutionStatus.FAILED;
        stepExecution.error = {
          code: 'STEP_EXECUTION_ERROR',
          message: error.message,
          details: error,
          retryable: true,
        };
        stepExecution.completedAt = new Date();
        stepExecution.duration = stepExecution.completedAt.getTime() - stepExecution.startedAt.getTime();

        execution.steps.push(stepExecution);
        stepTimer();

        return {
          success: false,
          error: stepExecution.error,
        };
      }

      execution.steps.push(stepExecution);
      stepTimer();
    }

    return {
      success: true,
      output: currentData,
    };
  }

  private async executeStep(
    step: WorkflowStep, 
    input: any, 
    context: WorkflowContext
  ): Promise<any> {
    switch (step.type) {
      case 'agent':
        return await this.agentExecutor.execute({
          agentType: step.config.agentType!,
          input,
          context,
          config: step.config.agentConfig,
        });

      case 'transform':
        return this.executeTransform(step.config.transformer!, input, step.config.transformConfig);

      case 'condition':
        return this.evaluateCondition(
          { expression: step.config.expression! },
          input,
          context
        );

      case 'delay':
        await new Promise(resolve => setTimeout(resolve, step.config.duration || 1000));
        return input;

      case 'webhook':
        return await this.executeWebhook(step.config, input);

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private validateWorkflowDefinition(definition: WorkflowDefinition): void {
    // Use security validator for comprehensive validation
    const validation = SecurityValidator.validateWorkflowDefinition(definition);
    if (!validation.valid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
    }

    // Additional structural validations
    if (!definition.steps || definition.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }

    // Validate step dependencies for circular references
    const stepIds = new Set(definition.steps.map(s => s.id));
    const dependencyGraph = new Map<string, string[]>();
    
    for (const step of definition.steps) {
      dependencyGraph.set(step.id, step.dependencies || []);
      
      if (step.dependencies) {
        for (const dep of step.dependencies) {
          if (!stepIds.has(dep)) {
            throw new Error(`Step ${step.id} depends on non-existent step ${dep}`);
          }
        }
      }
    }

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) {
        return true;
      }
      if (visited.has(stepId)) {
        return false;
      }

      visited.add(stepId);
      recursionStack.add(stepId);

      const dependencies = dependencyGraph.get(stepId) || [];
      for (const dep of dependencies) {
        if (hasCycle(dep)) {
          return true;
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const stepId of stepIds) {
      if (hasCycle(stepId)) {
        throw new Error(`Circular dependency detected involving step ${stepId}`);
      }
    }
  }

  private evaluateCondition(
    condition: WorkflowCondition,
    data: any,
    context: WorkflowContext
  ): boolean {
    try {
      // Use secure evaluation
      const evaluation = SecurityValidator.safeEvaluate(condition.expression, data, context);
      if (!evaluation.success) {
        logger.error({ 
          error: evaluation.error, 
          expression: condition.expression 
        }, 'Condition evaluation failed');
        return false;
      }
      return Boolean(evaluation.result);
    } catch (error) {
      logger.error({ error, expression: condition.expression }, 'Condition evaluation failed');
      return false;
    }
  }

  private executeTransform(transformer: string, input: any, config?: any): any {
    // Use secure transformation engine
    const result = TransformationEngine.transform(transformer, input, config);
    if (!result.success) {
      throw new Error(result.error || 'Transformation failed');
    }
    return result.data;
  }

  private async executeWebhook(config: any, input: any): Promise<any> {
    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  private async findTriggeredWorkflows(event: WorkflowEvent): Promise<WorkflowDefinition[]> {
    // Implementation would query workflows with matching triggers
    return [];
  }

  private async updateExecutionStatus(execution: WorkflowExecution): Promise<void> {
    await prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: execution.status,
        output: execution.output as any,
        error: execution.error as any,
        completedAt: execution.completedAt,
        duration: execution.duration,
        metadata: execution.metrics as any,
      },
    });

    // Update step executions
    for (const step of execution.steps) {
      await prisma.stepExecution.upsert({
        where: {
          executionId_stepId: {
            executionId: execution.id,
            stepId: step.stepId,
          },
        },
        update: {
          status: step.status,
          output: step.output as any,
          error: step.error as any,
          completedAt: step.completedAt,
          duration: step.duration,
          logs: step.logs,
        },
        create: {
          executionId: execution.id,
          stepId: step.stepId,
          status: step.status,
          input: step.input as any,
          output: step.output as any,
          error: step.error as any,
          attempt: step.attempt,
          startedAt: step.startedAt,
          completedAt: step.completedAt,
          duration: step.duration,
          logs: step.logs,
        },
      });
    }
  }

  private async waitForActiveWorkflows(): Promise<void> {
    const timeout = 60000; // 1 minute
    const start = Date.now();

    while (this.activeExecutions.size > 0 && (Date.now() - start) < timeout) {
      logger.info({ 
        activeCount: this.activeExecutions.size 
      }, 'Waiting for active workflows to complete');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (this.activeExecutions.size > 0) {
      logger.warn({ 
        remaining: this.activeExecutions.size 
      }, 'Shutting down with active workflows remaining');
    }
  }

  private startMonitoring(): void {
    const monitor = async () => {
      if (!this.isRunning) return;

      try {
        const metrics = await this.getMetrics();
        activeWorkflowsGauge.set(metrics.activeExecutions);
        
        // Log metrics periodically
        logger.info({ metrics }, 'Workflow engine metrics');
      } catch (error) {
        logger.error({ error }, 'Monitoring failed');
      }

      setTimeout(monitor, 60000); // Every minute
    };

    setTimeout(monitor, 10000); // Start after 10 seconds
  }
}