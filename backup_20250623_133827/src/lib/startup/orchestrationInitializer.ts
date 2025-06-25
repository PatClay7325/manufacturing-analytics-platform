/**
 * Workflow orchestration system initializer
 * Handles startup, configuration, and graceful shutdown
 */

import { logger } from '@/lib/logger';
import { WorkflowEngine } from '@/lib/orchestration';
import { MANUFACTURING_WORKFLOWS } from '@/lib/orchestration/workflows/ManufacturingWorkflows';

let workflowEngine: WorkflowEngine | null = null;
let isInitialized = false;

/**
 * Initialize the workflow orchestration system
 */
export async function initializeOrchestration(): Promise<void> {
  if (isInitialized) {
    logger.warn('Orchestration system already initialized');
    return;
  }

  try {
    logger.info('Initializing workflow orchestration system...');

    // Get engine instance
    workflowEngine = WorkflowEngine.getInstance();

    // Start the engine
    await workflowEngine.start();

    // Register built-in manufacturing workflows
    if (process.env.REGISTER_BUILTIN_WORKFLOWS !== 'false') {
      await registerBuiltInWorkflows();
    }

    isInitialized = true;
    logger.info('Workflow orchestration system initialized successfully');

  } catch (error) {
    logger.error({ error }, 'Failed to initialize orchestration system');
    throw error;
  }
}

/**
 * Shutdown the workflow orchestration system
 */
export async function shutdownOrchestration(): Promise<void> {
  if (!isInitialized || !workflowEngine) {
    return;
  }

  try {
    logger.info('Shutting down workflow orchestration system...');
    
    await workflowEngine.stop();
    workflowEngine = null;
    isInitialized = false;
    
    logger.info('Workflow orchestration system shutdown completed');
  } catch (error) {
    logger.error({ error }, 'Error during orchestration shutdown');
    throw error;
  }
}

/**
 * Get the workflow engine instance
 */
export function getWorkflowEngine(): WorkflowEngine | null {
  return workflowEngine;
}

/**
 * Check if orchestration is initialized
 */
export function isOrchestrationInitialized(): boolean {
  return isInitialized && workflowEngine !== null;
}

/**
 * Register built-in manufacturing workflows
 */
async function registerBuiltInWorkflows(): Promise<void> {
  if (!workflowEngine) {
    throw new Error('Workflow engine not initialized');
  }

  try {
    logger.info('Registering built-in manufacturing workflows...');

    const workflows = Object.values(MANUFACTURING_WORKFLOWS);
    let registered = 0;
    let failed = 0;

    for (const workflow of workflows) {
      try {
        await workflowEngine.registerWorkflow(workflow);
        registered++;
        logger.debug({ workflowId: workflow.id }, 'Built-in workflow registered');
      } catch (error) {
        failed++;
        logger.error({ 
          error, 
          workflowId: workflow.id,
          workflowName: workflow.name 
        }, 'Failed to register built-in workflow');
      }
    }

    logger.info({ 
      total: workflows.length,
      registered,
      failed 
    }, 'Built-in workflow registration completed');

  } catch (error) {
    logger.error({ error }, 'Failed to register built-in workflows');
    throw error;
  }
}

/**
 * Health check for orchestration system
 */
export async function checkOrchestrationHealth(): Promise<{
  healthy: boolean;
  details: Record<string, any>;
}> {
  try {
    if (!isInitialized || !workflowEngine) {
      return {
        healthy: false,
        details: {
          initialized: false,
          engine: null,
        },
      };
    }

    const metrics = await workflowEngine.getMetrics();
    
    return {
      healthy: true,
      details: {
        initialized: true,
        activeExecutions: metrics.activeExecutions,
        queuedExecutions: metrics.queuedExecutions,
        errorRate: metrics.errorRate,
        resourceUtilization: metrics.resourceUtilization,
      },
    };
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    return {
      healthy: false,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}