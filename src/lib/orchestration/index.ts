/**
 * Production-ready workflow orchestration exports
 * Centralized exports for all orchestration components
 */

// Core engine
export { WorkflowEngineFixed as WorkflowEngine } from './WorkflowEngineFixed';

// Message queue and agent execution
export { RedisMessageQueue } from './MessageQueue';
export { AgentExecutor } from './AgentExecutor';

// Resource management
export { ResourceManager, resourceManager } from './ResourceManager';
export { ConnectionPool } from './ConnectionPool';

// Security and validation
export { SecurityValidator } from './utils/SecurityValidator';
export { TransformationEngine } from './utils/TransformationEngine';

// Pre-defined workflows
export { 
  MANUFACTURING_WORKFLOWS,
  getAllWorkflowDefinitions
} from './workflows/ManufacturingWorkflows';

// Type definitions
export * from './types';

// Metrics
export * from '@/lib/observability/workflowMetrics';