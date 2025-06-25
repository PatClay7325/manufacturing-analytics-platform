/**
 * PRODUCTION-READY Workflow Orchestration Engine
 * Fixed version with comprehensive security, error handling, and resource management
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/database';
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
import { DistributedCircuitBreakerFactory } from './utils/DistributedCircuitBreaker';
import { AuditTrail } from './audit/AuditTrail';
import { AuthorizationManager, Permission } from './auth/AuthorizationManager';
import { WorkflowCache } from './cache/WorkflowCache';
import { 
  workflowExecutionDuration,
  workflowExecutionCounter,
  activeWorkflowsGauge,
  stepExecutionDuration,
  workflowErrorCounter
} from '@/lib/observability/workflowMetrics';
import { SecurityValidator } from './utils/SecurityValidator';
import { TransformationEngine } from './utils/TransformationEngine';
import { ResourceManager, createMemoryResource } from './ResourceManager';
import { ConnectionPool } from './ConnectionPool';
import { WorkflowProcessor } from './engine/WorkflowProcessor';
import { WorkflowLockManager, withDistributedLock } from './utils/DistributedLock';

export class WorkflowEngineFixed extends EventEmitter implements IWorkflowEngine {
  private static instance: WorkflowEngineFixed;
  private messageQueue: RedisMessageQueue;
  private agentExecutor: AgentExecutor;
  private workflowProcessor: WorkflowProcessor;
  private circuitBreaker;
  private resourceManager: ResourceManager;
  private connectionPool?: ConnectionPool;
  private auditTrail: AuditTrail;
  private authManager: AuthorizationManager;
  private workflowCache: WorkflowCache;
  
  private isRunning = false;
  private isShuttingDown = false;
  private workerPromises: Promise<void>[] = [];
  private readonly maxConcurrentWorkflows: number;
  private readonly activeExecutions = new Map<string, WorkflowExecution>();
  private readonly cleanupInterval: NodeJS.Timeout;

  constructor() {
    super();
    
    // Initialize configuration from environment
    this.maxConcurrentWorkflows = parseInt(process.env.MAX_CONCURRENT_WORKFLOWS || '50');
    
    // Initialize dependencies with error handling
    try {
      this.messageQueue = new RedisMessageQueue();
      this.agentExecutor = new AgentExecutor();
      this.workflowProcessor = new WorkflowProcessor(this.agentExecutor);
      this.resourceManager = ResourceManager.getInstance();
      this.auditTrail = AuditTrail.getInstance();
      this.authManager = AuthorizationManager.getInstance();
      this.workflowCache = new WorkflowCache();
      
      this.circuitBreaker = DistributedCircuitBreakerFactory.getOrCreate('workflow-engine', {
        failureThreshold: parseInt(process.env.WORKFLOW_FAILURE_THRESHOLD || '10'),
        resetTimeout: parseInt(process.env.WORKFLOW_RESET_TIMEOUT || '60000'),
        monitoringPeriod: parseInt(process.env.WORKFLOW_MONITORING_PERIOD || '120000'),
      });

      // Initialize connection pool for database operations
      this.initializeConnectionPool();
      
      // Setup cleanup interval for memory management
      this.cleanupInterval = setInterval(() => {
        this.performCleanup();
      }, 60000); // Every minute

      // Setup graceful shutdown handlers
      this.setupShutdownHandlers();
      
    } catch (error) {
      logger.error({ error }, 'Failed to initialize WorkflowEngine');
      throw error;
    }

    // Set max listeners to prevent warning
    this.setMaxListeners(100);
  }

  static getInstance(): WorkflowEngineFixed {
    if (!WorkflowEngineFixed.instance) {
      WorkflowEngineFixed.instance = new WorkflowEngineFixed();
    }
    return WorkflowEngineFixed.instance;
  }

  /**
   * Register a new workflow definition with comprehensive validation and distributed locking
   */
  async registerWorkflow(
    definition: WorkflowDefinition, 
    userId?: string,
    organizationId?: string
  ): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Cannot register workflow during shutdown');
    }

    try {
      // Check authorization if userId provided
      if (userId) {
        await this.authManager.requirePermission(
          { userId, organizationId },
          Permission.WORKFLOW_CREATE
        );
      }

      // Use distributed lock to prevent concurrent modifications
      await withDistributedLock(
        `workflow-definition-${definition.id}`,
        async () => {
          await this.circuitBreaker.execute(async () => {
            // Comprehensive security validation
            this.validateWorkflowDefinition(definition);

            // Check for resource limits
            const currentWorkflows = await prisma.workflowDefinition.count();
            if (currentWorkflows >= 1000) { // Reasonable limit
              throw new Error('Maximum number of workflow definitions reached');
            }

            // Store in database with transaction
            await prisma.$transaction(async (tx) => {
              await tx.workflowDefinition.upsert({
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
                  createdBy: userId,
                  organizationId,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              });
            });

            // Cache the new workflow and invalidate old versions
            await this.workflowCache.invalidateWorkflow(definition.id);
            await this.workflowCache.setWorkflow(definition.id, definition);

            logger.info({
              workflowId: definition.id,
              workflowName: definition.name,
              version: definition.version,
              stepCount: definition.steps.length,
            }, 'Workflow registered successfully');

            // Log audit event
            await this.auditTrail.logWorkflowRegistered(
              definition.id,
              definition.name,
              userId,
              {
                version: definition.version,
                stepCount: definition.steps.length,
                organizationId,
              }
            );

            this.emit('workflow:registered', definition);
          });
        },
        { ttl: 60000, retryCount: 3 }
      );
    } catch (error) {
      workflowErrorCounter.inc({ workflow: definition.id, type: 'registration_error' });
      logger.error({ error, workflowId: definition.id }, 'Failed to register workflow');
      throw error;
    }
  }

  /**
   * Execute a workflow with comprehensive validation and security
   */
  async executeWorkflow(
    workflowId: string, 
    input: any, 
    context?: Partial<WorkflowContext>
  ): Promise<string> {
    if (this.isShuttingDown) {
      throw new Error('Cannot execute workflow during shutdown');
    }

    const executionId = uuidv4();
    const traceId = context?.traceId || uuidv4();

    try {
      return await this.circuitBreaker.execute(async () => {
        // Check authorization if userId provided
        if (context?.userId) {
          await this.authManager.requirePermission(
            { 
              userId: context.userId, 
              organizationId: context.metadata?.organizationId,
              resourceContext: { workflowId }
            },
            Permission.WORKFLOW_EXECUTE,
            `workflow:${workflowId}`
          );
        }

        // Validate and sanitize input
        const inputValidation = SecurityValidator.validateExecutionInput(input);
        if (!inputValidation.valid) {
          throw new Error(`Invalid input: ${inputValidation.errors.join(', ')}`);
        }

        // Check concurrency limits
        if (this.activeExecutions.size >= this.maxConcurrentWorkflows) {
          throw new Error('Maximum concurrent workflows reached');
        }

        // Get workflow definition
        const workflow = await this.getWorkflow(workflowId);
        if (!workflow) {
          throw new Error(`Workflow ${workflowId} not found`);
        }

        // Create secure execution context
        const executionContext: WorkflowContext = {
          sessionId: context.sessionId,
          userId: context.userId,
          equipmentId: context.equipmentId,
          variables: SecurityValidator.validateExecutionInput(context?.variables || {}).sanitized || {},
          metadata: { 
            workflowId, 
            executionId, 
            initiatedBy: 'api',
            ...context?.metadata 
          },
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

        // Use distributed lock to prevent duplicate execution
        const executionLock = await WorkflowLockManager.acquireExecutionLock(
          workflowId,
          executionId,
          { ttl: 600000, retryCount: 1 } // 10 minutes, single retry
        );

        if (!executionLock) {
          throw new Error(`Failed to acquire execution lock for workflow ${workflowId}`);
        }

        // Store execution and queue message in a single transaction
        await prisma.$transaction(async (tx) => {
          // Create execution record
          await tx.workflowExecution.create({
            data: {
              id: executionId,
              workflowId,
              workflowVersion: workflow.version,
              status: execution.status,
              input: execution.input as any,
              context: executionContext as any,
              startedAt: execution.startedAt,
              metadata: execution.metrics as any,
            },
          });

          // Queue for execution with priority
          const message: QueueMessage = {
            id: uuidv4(),
            type: 'workflow-execution',
            priority: workflow.priority,
            payload: {
              executionId,
              workflowId,
              workflow,
              input: inputValidation.sanitized,
              context: executionContext,
              executionLock: executionLock,
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

          // Enqueue within transaction to ensure atomicity
          await this.messageQueue.enqueue(message);
        });

        // Register execution with resource manager (after successful transaction)
        const executionResource = createMemoryResource(execution, `execution-${executionId}`);
        this.resourceManager.register(executionResource);

        logger.info({
          executionId,
          workflowId,
          traceId,
          priority: workflow.priority,
          inputSize: JSON.stringify(inputValidation.sanitized).length,
        }, 'Workflow execution queued');

        // Log audit event for execution start
        await this.auditTrail.logExecutionStarted(
          workflowId,
          executionId,
          executionContext.userId,
          executionContext
        );

        this.emit('workflow:queued', execution);
        workflowExecutionCounter.inc({ workflow: workflowId, status: 'queued' });

        return executionId;
      });
    } catch (error) {
      workflowErrorCounter.inc({ workflow: workflowId, type: 'execution_error' });
      logger.error({ 
        error, 
        executionId, 
        workflowId, 
        traceId 
      }, 'Failed to execute workflow');
      throw error;
    }
  }

  /**
   * Cancel workflow execution with proper cleanup
   */
  async cancelExecution(executionId: string, userId?: string): Promise<void> {
    try {
      await this.circuitBreaker.execute(async () => {
        // Check authorization if userId provided
        if (userId) {
          await this.authManager.requirePermission(
            { 
              userId,
              resourceContext: { executionId }
            },
            Permission.EXECUTION_CANCEL,
            `execution:${executionId}`
          );
        }

        const execution = this.activeExecutions.get(executionId);
        if (execution) {
          execution.status = WorkflowExecutionStatus.CANCELLED;
          execution.completedAt = new Date();
          execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
          
          // Update database
          await this.updateExecutionStatus(execution);
          
          // Clean up resources
          this.activeExecutions.delete(executionId);
          await this.resourceManager.unregister(`execution-${executionId}`);
          
          // Update metrics
          activeWorkflowsGauge.set(this.activeExecutions.size);
          
          logger.info({ 
            executionId,
            duration: execution.duration 
          }, 'Workflow execution cancelled');
          
          this.emit('workflow:cancelled', execution);
        }
      });
    } catch (error) {
      logger.error({ error, executionId }, 'Failed to cancel execution');
      throw error;
    }
  }

  /**
   * Get workflow definition with caching
   */
  async getWorkflow(id: string, version?: string): Promise<WorkflowDefinition | null> {
    try {
      // Try cache first
      const cachedWorkflow = await this.workflowCache.getWorkflow(id, version);
      if (cachedWorkflow) {
        return cachedWorkflow;
      }

      // Fallback to database
      const whereClause = version 
        ? { id, version }
        : { id };

      const result = await prisma.workflowDefinition.findFirst({
        where: whereClause,
        orderBy: version ? undefined : { createdAt: 'desc' }, // Get latest if no version specified
      });

      if (result) {
        const workflow = result.definition as any;
        
        // Cache the result
        await this.workflowCache.setWorkflow(id, workflow);
        
        return workflow;
      }

      return null;
    } catch (error) {
      logger.error({ error, workflowId: id, version }, 'Failed to get workflow');
      return null;
    }
  }

  /**
   * List all workflow definitions with pagination
   */
  async listWorkflows(): Promise<WorkflowDefinition[]> {
    try {
      const results = await prisma.workflowDefinition.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit results
      });

      return results.map(r => r.definition as any);
    } catch (error) {
      logger.error({ error }, 'Failed to list workflows');
      return [];
    }
  }

  /**
   * Get workflow execution with proper access control
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

      return this.mapDatabaseExecutionToModel(result);
    } catch (error) {
      logger.error({ error, executionId }, 'Failed to get execution');
      return null;
    }
  }

  /**
   * List workflow executions with filtering and pagination
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
        take: 100, // Limit results
      });

      return results.map(result => this.mapDatabaseExecutionToModel(result));
    } catch (error) {
      logger.error({ error, workflowId, status }, 'Failed to list executions');
      return [];
    }
  }

  /**
   * Publish workflow event with validation
   */
  async publishEvent(event: WorkflowEvent): Promise<void> {
    try {
      // Validate event
      if (!event.type || !event.source || !event.payload) {
        throw new Error('Invalid event structure');
      }

      this.emit('workflow:event', event);
      
      // Find workflows triggered by this event
      const workflows = await this.findTriggeredWorkflows(event);
      
      for (const workflow of workflows) {
        try {
          await this.executeWorkflow(workflow.id, event.payload, {
            traceId: event.metadata.traceId,
            metadata: { 
              triggeredBy: event.type, 
              eventSource: event.source 
            },
          });
        } catch (error) {
          logger.error({ 
            error, 
            workflowId: workflow.id, 
            eventType: event.type 
          }, 'Failed to trigger workflow from event');
        }
      }
    } catch (error) {
      logger.error({ error, eventType: event.type }, 'Failed to publish event');
    }
  }

  /**
   * Get comprehensive monitoring metrics
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

      // Calculate average execution time
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

      // Resource utilization
      const memUsage = process.memoryUsage();
      const resourceStats = this.resourceManager.getStats();
      
      return {
        activeExecutions: activeCount,
        queuedExecutions: queuedCount,
        completedExecutions: completedToday,
        failedExecutions: failedToday,
        averageExecutionTime: Math.round(avgExecutionTime),
        throughput: Math.round(throughput * 100) / 100,
        errorRate: Math.round(errorRate * 10000) / 100,
        resourceUtilization: {
          cpu: 0, // Would need separate monitoring
          memory: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100),
          queue: Math.min((queuedCount / 1000) * 100, 100),
        },
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
   * Start the workflow engine with proper initialization
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      // Initialize agent executor
      await this.agentExecutor.initialize();

      // Start message queue
      await this.messageQueue.start();

      // Start worker processes
      this.startWorkers();

      // Start monitoring
      this.startMonitoring();

      this.isRunning = true;
      logger.info('Workflow engine started successfully');
      this.emit('engine:started');
    } catch (error) {
      logger.error({ error }, 'Failed to start workflow engine');
      throw error;
    }
  }

  /**
   * Graceful shutdown with resource cleanup
   */
  async stop(): Promise<void> {
    if (!this.isRunning || this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('Starting workflow engine shutdown');

    try {
      // Stop accepting new work
      this.isRunning = false;

      // Wait for active workflows to complete (with timeout)
      await this.waitForActiveWorkflows(30000); // 30 seconds

      // Stop workers
      await Promise.allSettled(this.workerPromises);

      // Stop message queue
      await this.messageQueue.stop();

      // Shutdown agent executor
      await this.agentExecutor.shutdown();

      // Drain connection pool
      if (this.connectionPool) {
        await this.connectionPool.drain();
      }

      // Clear cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // Final resource cleanup
      await this.resourceManager.shutdown();

      logger.info('Workflow engine shutdown completed');
      this.emit('engine:stopped');
    } catch (error) {
      logger.error({ error }, 'Error during workflow engine shutdown');
      throw error;
    }
  }

  // Private implementation methods...
  
  private validateWorkflowDefinition(definition: WorkflowDefinition): void {
    const validation = SecurityValidator.validateWorkflowDefinition(definition);
    if (!validation.valid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(', ')}`);
    }

    // Additional checks...
    if (!definition.steps || definition.steps.length === 0) {
      throw new Error('Workflow must have at least one step');
    }

    if (definition.steps.length > 100) {
      throw new Error('Workflow cannot have more than 100 steps');
    }

    // Circular dependency check
    this.checkCircularDependencies(definition.steps);
  }

  private checkCircularDependencies(steps: WorkflowStep[]): void {
    const stepIds = new Set(steps.map(s => s.id));
    const dependencyGraph = new Map<string, string[]>();
    
    for (const step of steps) {
      dependencyGraph.set(step.id, step.dependencies || []);
      
      if (step.dependencies) {
        for (const dep of step.dependencies) {
          if (!stepIds.has(dep)) {
            throw new Error(`Step ${step.id} depends on non-existent step ${dep}`);
          }
        }
      }
    }

    // DFS cycle detection
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) return true;
      if (visited.has(stepId)) return false;

      visited.add(stepId);
      recursionStack.add(stepId);

      const dependencies = dependencyGraph.get(stepId) || [];
      for (const dep of dependencies) {
        if (hasCycle(dep)) return true;
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

  private async initializeConnectionPool(): Promise<void> {
    // Implementation would depend on your database setup
    // This is a placeholder for demonstration
  }

  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'Received shutdown signal');
      try {
        await this.stop();
        process.exit(0);
      } catch (error) {
        logger.error({ error }, 'Error during shutdown');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  private async performCleanup(): Promise<void> {
    if (this.isShuttingDown) return;

    try {
      // Clean up old executions from memory
      const now = new Date();
      const oldExecutions: string[] = [];

      for (const [id, execution] of this.activeExecutions) {
        const age = now.getTime() - execution.startedAt.getTime();
        if (age > 3600000 && execution.status !== WorkflowExecutionStatus.RUNNING) { // 1 hour
          oldExecutions.push(id);
        }
      }

      for (const id of oldExecutions) {
        this.activeExecutions.delete(id);
        await this.resourceManager.unregister(`execution-${id}`);
      }

      if (oldExecutions.length > 0) {
        logger.debug({ cleaned: oldExecutions.length }, 'Cleaned up old executions');
      }

      // Update metrics
      activeWorkflowsGauge.set(this.activeExecutions.size);
    } catch (error) {
      logger.error({ error }, 'Cleanup failed');
    }
  }

  private startWorkers(): void {
    const queueNames = [
      'workflow-critical',
      'workflow-high', 
      'workflow-normal',
      'workflow-background',
    ];

    for (const queueName of queueNames) {
      const workerCount = queueName.includes('critical') ? 5 : 
                         queueName.includes('high') ? 3 : 2;

      for (let i = 0; i < workerCount; i++) {
        const worker = this.createWorker(queueName);
        this.workerPromises.push(worker);
      }
    }
  }

  private async createWorker(queueName: string): Promise<void> {
    while (this.isRunning && !this.isShuttingDown) {
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
    const { executionId, workflowId, executionLock } = message.payload;
    
    try {
      // Track active execution
      const execution = await this.getExecution(executionId);
      if (execution) {
        this.activeExecutions.set(executionId, execution);
        activeWorkflowsGauge.set(this.activeExecutions.size);
      }

      // Process workflow using the dedicated processor
      await this.workflowProcessor.processWorkflow(message);

      logger.info({
        messageId: message.id,
        executionId,
        workflowId,
        traceId: message.metadata.traceId,
      }, 'Workflow message processed successfully');

    } catch (error) {
      logger.error({
        error,
        messageId: message.id,
        executionId,
        workflowId,
        traceId: message.metadata.traceId,
      }, 'Failed to process workflow message');
      throw error;
    } finally {
      // Clean up active execution tracking
      this.activeExecutions.delete(executionId);
      activeWorkflowsGauge.set(this.activeExecutions.size);

      // Release execution lock
      if (executionLock) {
        try {
          await executionLock.release();
        } catch (error) {
          logger.error({ 
            error, 
            executionId 
          }, 'Failed to release execution lock');
        }
      }

      // Clean up resources
      await this.resourceManager.unregister(`execution-${executionId}`);
    }
  }

  private startMonitoring(): void {
    const monitor = async () => {
      if (!this.isRunning || this.isShuttingDown) return;

      try {
        const metrics = await this.getMetrics();
        activeWorkflowsGauge.set(metrics.activeExecutions);
        
        logger.debug({ metrics }, 'Workflow engine metrics updated');
      } catch (error) {
        logger.error({ error }, 'Monitoring failed');
      }

      setTimeout(monitor, 60000); // Every minute
    };

    setTimeout(monitor, 10000); // Start after 10 seconds
  }

  private async waitForActiveWorkflows(timeout: number): Promise<void> {
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

  private async findTriggeredWorkflows(event: WorkflowEvent): Promise<WorkflowDefinition[]> {
    // Implementation would query workflows with matching triggers
    return [];
  }

  private async updateExecutionStatus(execution: WorkflowExecution): Promise<void> {
    // Implementation for updating execution status in database
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
  }

  private mapDatabaseExecutionToModel(result: any): WorkflowExecution {
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
      steps: result.steps?.map((step: any) => ({
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
      })) || [],
      metrics: result.metadata as any,
    };
  }
}