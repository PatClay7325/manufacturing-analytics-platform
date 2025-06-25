/**
 * COMPLETE Workflow Processing Engine
 * Implements full workflow execution with dependency resolution and error recovery
 */

import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { 
  WorkflowExecution, 
  WorkflowStep, 
  StepExecution, 
  StepExecutionStatus,
  WorkflowExecutionStatus,
  WorkflowContext,
  QueueMessage,
  WorkflowError
} from '../types';
import { SecureExpressionEvaluator } from '../utils/SecureExpressionEvaluator';
import { TransformationEngine } from '../utils/TransformationEngine';
import { AgentExecutor } from '../AgentExecutor';
import { CircuitBreakerFactory } from '@/lib/resilience/circuitBreaker';
import { DistributedCircuitBreakerFactory } from '../utils/DistributedCircuitBreaker';
import { AuditTrail } from '../audit/AuditTrail';
import { WorkflowCache } from '../cache/WorkflowCache';
import { 
  workflowExecutionDuration,
  stepExecutionDuration,
  workflowErrorCounter,
  stepExecutionCounter
} from '@/lib/observability/workflowMetrics';

export class WorkflowProcessor {
  private agentExecutor: AgentExecutor;
  private circuitBreaker;
  private auditTrail: AuditTrail;
  private workflowCache: WorkflowCache;

  constructor(agentExecutor: AgentExecutor) {
    this.agentExecutor = agentExecutor;
    this.circuitBreaker = DistributedCircuitBreakerFactory.getOrCreate('workflow-processor', {
      failureThreshold: 5,
      resetTimeout: 30000,
      monitoringPeriod: 60000,
    });
    this.auditTrail = AuditTrail.getInstance();
    this.workflowCache = new WorkflowCache();
  }

  /**
   * Process a complete workflow execution
   */
  async processWorkflow(message: QueueMessage): Promise<void> {
    const { executionId, workflowId, workflow, input, context } = message.payload;
    const timer = workflowExecutionDuration.startTimer({ workflow: workflowId });

    let execution: WorkflowExecution | null = null;

    try {
      // Create execution record
      execution = {
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

      // Update status in database with transaction
      await this.updateExecutionStatusWithTransaction(execution);

      logger.info({
        executionId,
        workflowId,
        stepCount: workflow.steps.length,
        traceId: context.traceId,
      }, 'Starting workflow execution');

      // Execute workflow steps with dependency resolution
      const result = await this.executeWorkflowSteps(workflow.steps, execution);

      // Update final status
      execution.status = result.success ? WorkflowExecutionStatus.COMPLETED : WorkflowExecutionStatus.FAILED;
      execution.output = result.output;
      execution.error = result.error;
      execution.completedAt = new Date();
      execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
      execution.metrics.executionTime = execution.duration;

      await this.updateExecutionStatusWithTransaction(execution);

      // Log completion
      logger.info({
        executionId,
        workflowId,
        status: execution.status,
        duration: execution.duration,
        stepCount: execution.steps.length,
        successfulSteps: execution.steps.filter(s => s.status === StepExecutionStatus.COMPLETED).length,
        traceId: context.traceId,
      }, 'Workflow execution completed');

      // Log audit event for execution completion
      await this.auditTrail.logExecutionCompleted(
        workflowId,
        executionId,
        execution.duration || 0,
        execution.steps.length,
        execution.status === WorkflowExecutionStatus.COMPLETED ? 'success' : 'failure',
        execution.error
      );

    } catch (error) {
      workflowErrorCounter.inc({ workflow: workflowId, type: 'processing_error' });
      
      logger.error({
        error,
        executionId,
        workflowId,
        traceId: context.traceId,
      }, 'Workflow processing failed');

      // Update execution with error
      if (execution) {
        execution.status = WorkflowExecutionStatus.FAILED;
        execution.error = {
          code: 'WORKFLOW_PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
          retryable: this.isRetryableError(error),
        };
        execution.completedAt = new Date();
        execution.duration = execution.completedAt.getTime() - execution.startedAt.getTime();
        
        await this.updateExecutionStatusWithTransaction(execution);
      }

      throw error;
    } finally {
      timer({ status: execution.status || 'failed' });
    }
  }

  /**
   * Execute workflow steps with proper dependency resolution
   */
  private async executeWorkflowSteps(
    steps: WorkflowStep[], 
    execution: WorkflowExecution
  ): Promise<{ success: boolean; output?: any; error?: WorkflowError }> {
    try {
      // Build dependency graph
      const dependencyGraph = this.buildDependencyGraph(steps);
      
      // Perform topological sort to get execution order
      const executionOrder = this.topologicalSort(dependencyGraph);
      
      // Validate all steps are included
      if (executionOrder.length !== steps.length) {
        throw new Error('Circular dependency detected in workflow steps');
      }

      // Execute steps in dependency order
      const stepResults = new Map<string, any>();
      let lastResult = execution.input;

      for (const stepId of executionOrder) {
        const step = steps.find(s => s.id === stepId);
        if (!step) {
          throw new Error(`Step ${stepId} not found`);
        }

        // Check if step should be executed based on conditions
        if (step.condition) {
          const shouldExecute = this.evaluateCondition(step.condition, lastResult, execution.context);
          if (!shouldExecute) {
            const skippedExecution: StepExecution = {
              stepId: step.id,
              status: StepExecutionStatus.SKIPPED,
              input: lastResult,
              attempt: 1,
              startedAt: new Date(),
              completedAt: new Date(),
              duration: 0,
              logs: ['Step skipped due to condition'],
            };
            execution.steps.push(skippedExecution);
            stepResults.set(step.id, lastResult);
            continue;
          }
        }

        // Prepare step input based on dependencies
        const stepInput = this.prepareStepInput(step, stepResults, lastResult);

        // Execute the step
        const stepResult = await this.executeStep(step, stepInput, execution.context);
        
        execution.steps.push(stepResult);
        stepResults.set(step.id, stepResult.output);

        // If step failed and is not retryable, fail the workflow
        if (stepResult.status === StepExecutionStatus.FAILED) {
          const isRetryable = stepResult.error?.retryable ?? false;
          if (!isRetryable) {
            return {
              success: false,
              error: {
                code: 'STEP_EXECUTION_FAILED',
                message: `Step ${step.id} failed: ${stepResult.error?.message}`,
                details: stepResult.error,
                retryable: false,
              },
            };
          }
        }

        // Update last result for next step
        if (stepResult.status === StepExecutionStatus.COMPLETED) {
          lastResult = stepResult.output;
        }

        // Update execution in database periodically with transaction
        await this.updateExecutionStatusWithTransaction(execution);
      }

      return {
        success: true,
        output: lastResult,
      };

    } catch (error) {
      logger.error({ error, executionId: execution.id }, 'Step execution failed');
      return {
        success: false,
        error: {
          code: 'STEP_EXECUTION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error,
          retryable: this.isRetryableError(error),
        },
      };
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    step: WorkflowStep,
    input: any,
    context: WorkflowContext
  ): Promise<StepExecution> {
    const stepTimer = stepExecutionDuration.startTimer({ step: step.type });
    
    const stepExecution: StepExecution = {
      stepId: step.id,
      status: StepExecutionStatus.RUNNING,
      input,
      attempt: 1,
      startedAt: new Date(),
      logs: [],
    };

    try {
      stepExecution.logs.push(`Starting step execution: ${step.type}`);

      let result: any;

      switch (step.type) {
        case 'agent':
          result = await this.executeAgentStep(step, input, context);
          break;

        case 'transform':
          result = await this.executeTransformStep(step, input, context);
          break;

        case 'condition':
          result = this.executeConditionStep(step, input, context);
          break;

        case 'parallel':
          result = await this.executeParallelStep(step, input, context);
          break;

        case 'delay':
          result = await this.executeDelayStep(step, input, context);
          break;

        case 'webhook':
          result = await this.executeWebhookStep(step, input, context);
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      stepExecution.status = StepExecutionStatus.COMPLETED;
      stepExecution.output = result;
      stepExecution.completedAt = new Date();
      stepExecution.duration = stepExecution.completedAt.getTime() - stepExecution.startedAt.getTime();
      stepExecution.logs.push('Step completed successfully');

      stepExecutionCounter.inc({ step: step.type, status: 'completed' });

      // Log audit event for step completion
      await this.auditTrail.logStepExecution(
        context.metadata?.workflowId || '',
        context.metadata?.executionId || '',
        step.id,
        step.type,
        'success',
        stepExecution.duration
      );

      logger.debug({
        stepId: step.id,
        stepType: step.type,
        duration: stepExecution.duration,
        traceId: context.traceId,
      }, 'Step executed successfully');

    } catch (error) {
      stepExecution.status = StepExecutionStatus.FAILED;
      stepExecution.error = {
        code: 'STEP_EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error,
        retryable: this.isRetryableError(error),
      };
      stepExecution.completedAt = new Date();
      stepExecution.duration = stepExecution.completedAt.getTime() - stepExecution.startedAt.getTime();
      stepExecution.logs.push(`Step failed: ${stepExecution.error.message}`);

      stepExecutionCounter.inc({ step: step.type, status: 'failed' });

      // Log audit event for step failure
      await this.auditTrail.logStepExecution(
        context.metadata?.workflowId || '',
        context.metadata?.executionId || '',
        step.id,
        step.type,
        'failure',
        stepExecution.duration,
        stepExecution.error
      );

      logger.error({
        error,
        stepId: step.id,
        stepType: step.type,
        duration: stepExecution.duration,
        traceId: context.traceId,
      }, 'Step execution failed');
    } finally {
      stepTimer({ status: stepExecution.status });
    }

    return stepExecution;
  }

  /**
   * Execute agent step
   */
  private async executeAgentStep(step: WorkflowStep, input: any, context: WorkflowContext): Promise<any> {
    const agentType = step.config.agentType!;
    const agentConfig = step.config.agentConfig;

    // Generate cache key for agent execution (if cacheable)
    const isCacheable = this.isAgentExecutionCacheable(agentType);
    let cachedResult = null;
    let inputHash = '';

    if (isCacheable) {
      inputHash = this.workflowCache.generateInputHash({ input, agentConfig });
      cachedResult = await this.workflowCache.getAgentResult(agentType, inputHash);
      
      if (cachedResult) {
        logger.debug({
          agentType,
          inputHash,
          cacheHit: true,
        }, 'Agent result retrieved from cache');
        return cachedResult.result;
      }
    }

    // Execute agent
    const agentRequest = {
      agentType,
      input,
      context,
      config: agentConfig,
    };

    const response = await this.agentExecutor.execute(agentRequest);
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Agent execution failed');
    }

    // Cache the result if cacheable
    if (isCacheable && inputHash) {
      await this.workflowCache.setAgentResult(agentType, inputHash, response.output);
    }

    return response.output;
  }

  /**
   * Execute transformation step
   */
  private async executeTransformStep(step: WorkflowStep, input: any, context: WorkflowContext): Promise<any> {
    const transformerName = step.config.transformer!;
    const transformConfig = step.config.transformConfig;

    // Generate cache key for transformation
    const inputHash = this.workflowCache.generateInputHash({ input, transformConfig });
    
    // Check cache first
    const cachedResult = await this.workflowCache.getTransformationResult(transformerName, inputHash);
    if (cachedResult) {
      logger.debug({
        transformer: transformerName,
        inputHash,
        cacheHit: true,
      }, 'Transformation result retrieved from cache');
      return cachedResult.result;
    }

    // Execute transformation
    const result = TransformationEngine.transform(transformerName, input, transformConfig);
    
    if (!result.success) {
      throw new Error(result.error || 'Transformation failed');
    }

    // Cache the result
    await this.workflowCache.setTransformationResult(transformerName, inputHash, result.data);

    return result.data;
  }

  /**
   * Execute condition step
   */
  private executeConditionStep(step: WorkflowStep, input: any, context: WorkflowContext): boolean {
    const expression = step.config.expression!;
    return this.evaluateCondition({ expression }, input, context);
  }

  /**
   * Execute parallel steps
   */
  private async executeParallelStep(step: WorkflowStep, input: any, context: WorkflowContext): Promise<any[]> {
    const parallelSteps = step.config.parallelSteps || [];
    
    const promises = parallelSteps.map(async (parallelStep) => {
      const stepResult = await this.executeStep(parallelStep, input, context);
      if (stepResult.status === StepExecutionStatus.FAILED) {
        throw new Error(`Parallel step ${parallelStep.id} failed: ${stepResult.error?.message}`);
      }
      return stepResult.output;
    });

    return await Promise.all(promises);
  }

  /**
   * Execute delay step
   */
  private async executeDelayStep(step: WorkflowStep, input: any, context: WorkflowContext): Promise<any> {
    const duration = step.config.duration || 1000;
    await new Promise(resolve => setTimeout(resolve, duration));
    return input;
  }

  /**
   * Execute webhook step
   */
  private async executeWebhookStep(step: WorkflowStep, input: any, context: WorkflowContext): Promise<any> {
    const { url, method = 'POST', headers = {}, timeout = 30000 } = step.config;

    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid webhook URL');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Manufacturing-Analytics-Workflow/1.0',
          ...headers,
        },
        body: method !== 'GET' ? JSON.stringify(input) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Build dependency graph from workflow steps
   */
  private buildDependencyGraph(steps: WorkflowStep[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    for (const step of steps) {
      graph.set(step.id, step.dependencies || []);
    }
    
    return graph;
  }

  /**
   * Perform topological sort to determine execution order
   */
  private topologicalSort(graph: Map<string, string[]>): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (nodeId: string): void => {
      if (visiting.has(nodeId)) {
        throw new Error(`Circular dependency detected involving step: ${nodeId}`);
      }
      
      if (visited.has(nodeId)) {
        return;
      }

      visiting.add(nodeId);
      
      const dependencies = graph.get(nodeId) || [];
      for (const dep of dependencies) {
        visit(dep);
      }
      
      visiting.delete(nodeId);
      visited.add(nodeId);
      result.push(nodeId);
    };

    for (const nodeId of graph.keys()) {
      if (!visited.has(nodeId)) {
        visit(nodeId);
      }
    }

    return result.reverse(); // Reverse to get correct execution order
  }

  /**
   * Prepare input for a step based on its dependencies
   */
  private prepareStepInput(step: WorkflowStep, stepResults: Map<string, any>, defaultInput: any): any {
    if (!step.dependencies || step.dependencies.length === 0) {
      return defaultInput;
    }

    // If step has dependencies, create input object with dependency results
    const dependencyResults: Record<string, any> = {};
    for (const depId of step.dependencies) {
      if (stepResults.has(depId)) {
        dependencyResults[depId] = stepResults.get(depId);
      }
    }

    return {
      ...defaultInput,
      dependencies: dependencyResults,
    };
  }

  /**
   * Evaluate condition safely
   */
  private evaluateCondition(
    condition: { expression: string },
    data: any,
    context: WorkflowContext
  ): boolean {
    const evaluation = SecureExpressionEvaluator.evaluate(condition.expression, data, context);
    if (!evaluation.success) {
      logger.error({
        error: evaluation.error,
        expression: condition.expression,
        traceId: context.traceId,
      }, 'Condition evaluation failed');
      return false;
    }
    return Boolean(evaluation.result);
  }

  /**
   * Update execution status in database with proper transaction boundaries
   */
  private async updateExecutionStatusWithTransaction(execution: WorkflowExecution): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Update main execution record
        await tx.workflowExecution.update({
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

        // Update step executions within the same transaction
        for (const step of execution.steps) {
          await tx.stepExecution.upsert({
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
      });
    } catch (error) {
      logger.error({ error, executionId: execution.id }, 'Failed to update execution status');
      // Don't throw here as it would fail the entire workflow
    }
  }

  /**
   * Update execution status in database (deprecated - use updateExecutionStatusWithTransaction)
   */
  private async updateExecutionStatus(execution: WorkflowExecution): Promise<void> {
    // Redirect to transaction version for compatibility
    await this.updateExecutionStatusWithTransaction(execution);
  }

  /**
   * Determine if agent execution is cacheable
   */
  private isAgentExecutionCacheable(agentType: string): boolean {
    // Only cache deterministic operations that don't depend on external state
    const cacheableAgents = [
      'intent-classifier',
      'iso-compliance', 
      'quality-analyzer',
      'alert-generator',
    ];
    
    const nonCacheableAgents = [
      'opc-reader',       // Real-time data
      'mqtt-processor',   // Real-time data
      'equipment-monitor', // Real-time data
      'memory-pruner',    // Side effects
    ];
    
    return cacheableAgents.includes(agentType) && !nonCacheableAgents.includes(agentType);
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      return true;
    }
    
    if (error?.message?.includes('timeout') || error?.message?.includes('connection')) {
      return true;
    }
    
    if (error?.status >= 500 && error?.status < 600) {
      return true;
    }
    
    return false;
  }
}