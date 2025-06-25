/**
 * Production-ready workflow orchestration system types
 * Coordinates OPC UA, MQTT, and AI agents for manufacturing workflows
 */

import { EventEmitter } from 'events';

// Core workflow types
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  retryPolicy?: RetryPolicy;
  timeout?: number;
  priority: WorkflowPriority;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'http' | 'message';
  config: {
    eventType?: string;
    schedule?: string; // Cron expression
    endpoint?: string;
    queueName?: string;
    filter?: Record<string, any>;
  };
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: 'agent' | 'transform' | 'condition' | 'parallel' | 'delay' | 'webhook';
  config: WorkflowStepConfig;
  dependencies?: string[]; // Step IDs this step depends on
  retryPolicy?: RetryPolicy;
  timeout?: number;
  condition?: WorkflowCondition;
}

export interface WorkflowStepConfig {
  // Agent execution
  agentType?: 'intent-classifier' | 'iso-compliance' | 'quality-analyzer' | 'opc-reader' | 'mqtt-processor';
  agentConfig?: Record<string, any>;
  
  // Data transformation
  transformer?: string; // Function name or transformation rule
  transformConfig?: Record<string, any>;
  
  // Condition evaluation
  expression?: string;
  
  // Parallel execution
  parallelSteps?: WorkflowStep[];
  
  // Delay
  duration?: number;
  
  // Webhook
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
}

export interface WorkflowCondition {
  expression: string; // JavaScript expression
  variables?: string[]; // Available variables
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffType: 'fixed' | 'exponential' | 'linear';
  initialDelay: number;
  maxDelay?: number;
  multiplier?: number;
}

export enum WorkflowPriority {
  CRITICAL = 1,
  HIGH = 2,
  MEDIUM = 3,
  LOW = 4,
  BACKGROUND = 5,
}

// Execution types
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowVersion: string;
  status: WorkflowExecutionStatus;
  input: any;
  output?: any;
  error?: WorkflowError;
  context: WorkflowContext;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  steps: StepExecution[];
  metrics: WorkflowMetrics;
}

export interface StepExecution {
  stepId: string;
  status: StepExecutionStatus;
  input: any;
  output?: any;
  error?: WorkflowError;
  attempt: number;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  logs: string[];
}

export enum WorkflowExecutionStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMED_OUT = 'timed_out',
}

export enum StepExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  RETRYING = 'retrying',
}

export interface WorkflowContext {
  sessionId?: string;
  userId?: string;
  equipmentId?: string;
  variables: Record<string, any>;
  metadata: Record<string, any>;
  traceId: string;
}

export interface WorkflowError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  retryable: boolean;
}

export interface WorkflowMetrics {
  queueTime: number;
  executionTime: number;
  stepCount: number;
  retryCount: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

// Message queue types
export interface QueueMessage {
  id: string;
  type: 'workflow-execution' | 'step-execution' | 'event';
  priority: WorkflowPriority;
  payload: any;
  metadata: {
    workflowId?: string;
    executionId?: string;
    stepId?: string;
    traceId: string;
    createdAt: Date;
    scheduledAt?: Date;
    retryCount: number;
    maxRetries: number;
  };
}

export interface QueueConfig {
  name: string;
  maxConcurrency: number;
  retryDelay: number;
  maxRetries: number;
  deadLetterQueue?: string;
  visibility: number;
}

// Event types
export interface WorkflowEvent {
  type: string;
  source: 'opcua' | 'mqtt' | 'api' | 'timer' | 'agent';
  payload: any;
  metadata: {
    timestamp: Date;
    traceId: string;
    sourceId?: string;
    correlationId?: string;
  };
}

// Agent integration types
export interface AgentExecutionRequest {
  agentType: string;
  input: any;
  context: WorkflowContext;
  config?: Record<string, any>;
}

export interface AgentExecutionResponse {
  success: boolean;
  output?: any;
  error?: WorkflowError;
  metadata?: Record<string, any>;
}

// Manufacturing-specific workflow types
export interface ManufacturingWorkflowConfig {
  equipmentMonitoring: {
    samplingRate: number;
    alertThresholds: Record<string, number>;
    qualityChecks: string[];
  };
  qualityAnalysis: {
    spcRules: string[];
    toleranceLimits: Record<string, [number, number]>;
    complianceStandards: string[];
  };
  alerting: {
    channels: string[];
    escalationRules: EscalationRule[];
    suppressionRules: SuppressionRule[];
  };
}

export interface EscalationRule {
  condition: string;
  delay: number;
  targets: string[];
}

export interface SuppressionRule {
  condition: string;
  duration: number;
}

// Monitoring types
export interface WorkflowMonitoringData {
  activeExecutions: number;
  queuedExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  throughput: number;
  errorRate: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
    queue: number;
  };
}

// Plugin system types
export interface WorkflowPlugin {
  name: string;
  version: string;
  initialize(config: any): Promise<void>;
  execute(context: WorkflowContext, config: any): Promise<any>;
  cleanup?(): Promise<void>;
}

export interface PluginRegistry {
  register(plugin: WorkflowPlugin): void;
  get(name: string): WorkflowPlugin | undefined;
  list(): WorkflowPlugin[];
}

// Service interfaces
export interface IWorkflowEngine extends EventEmitter {
  // Workflow management
  registerWorkflow(definition: WorkflowDefinition): Promise<void>;
  updateWorkflow(id: string, definition: Partial<WorkflowDefinition>): Promise<void>;
  deleteWorkflow(id: string): Promise<void>;
  getWorkflow(id: string): Promise<WorkflowDefinition | null>;
  listWorkflows(): Promise<WorkflowDefinition[]>;
  
  // Execution management
  executeWorkflow(workflowId: string, input: any, context?: Partial<WorkflowContext>): Promise<string>;
  cancelExecution(executionId: string): Promise<void>;
  getExecution(executionId: string): Promise<WorkflowExecution | null>;
  listExecutions(workflowId?: string, status?: WorkflowExecutionStatus): Promise<WorkflowExecution[]>;
  
  // Event handling
  publishEvent(event: WorkflowEvent): Promise<void>;
  
  // Monitoring
  getMetrics(): Promise<WorkflowMonitoringData>;
  
  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface IMessageQueue {
  enqueue(message: QueueMessage): Promise<void>;
  dequeue(queueName: string): Promise<QueueMessage | null>;
  ack(messageId: string): Promise<void>;
  nack(messageId: string, requeue?: boolean): Promise<void>;
  getQueueStats(queueName: string): Promise<{
    size: number;
    processing: number;
    failed: number;
  }>;
}

export interface IAgentExecutor {
  execute(request: AgentExecutionRequest): Promise<AgentExecutionResponse>;
  isHealthy(): boolean;
  getMetrics(): Record<string, number>;
}