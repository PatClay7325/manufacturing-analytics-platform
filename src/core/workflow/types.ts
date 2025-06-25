/**
 * Workflow Orchestration System Types
 * Production-ready workflow engine for manufacturing analytics
 */

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying';
export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type RetryStrategy = 'immediate' | 'linear' | 'exponential' | 'fixed';

// Core Workflow Interfaces
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  timeout?: number;
  maxRetries?: number;
  retryStrategy?: RetryStrategy;
  priority: Priority;
  tags?: string[];
  
  // Workflow structure
  tasks: TaskDefinition[];
  dependencies: TaskDependency[];
  
  // Configuration
  variables?: Record<string, any>;
  triggers?: WorkflowTrigger[];
  conditions?: WorkflowCondition[];
  
  // Error handling
  errorHandling?: {
    strategy: 'abort' | 'continue' | 'retry' | 'fallback';
    fallbackWorkflow?: string;
    notifyOnError?: boolean;
    escalationPolicy?: string;
  };
  
  // Monitoring
  monitoring?: {
    enabled: boolean;
    metrics?: string[];
    alerts?: WorkflowAlert[];
  };
}

export interface TaskDefinition {
  id: string;
  name: string;
  type: TaskType;
  description?: string;
  timeout?: number;
  retries?: number;
  retryStrategy?: RetryStrategy;
  priority?: Priority;
  
  // Task configuration
  config: Record<string, any>;
  
  // Input/Output
  inputs?: TaskInput[];
  outputs?: TaskOutput[];
  
  // Conditions
  conditions?: TaskCondition[];
  
  // Error handling
  onError?: {
    action: 'retry' | 'skip' | 'fail' | 'fallback';
    fallbackTask?: string;
    maxRetries?: number;
  };
}

export interface TaskDependency {
  taskId: string;
  dependsOn: string[];
  condition?: 'all' | 'any' | 'none';
  waitForCompletion?: boolean;
}

export type TaskType = 
  | 'data_collection'
  | 'data_processing'
  | 'ai_analysis'
  | 'quality_check'
  | 'compliance_check'
  | 'alert_generation'
  | 'report_generation'
  | 'notification'
  | 'integration'
  | 'custom';

export interface TaskInput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  default?: any;
  validation?: any;
}

export interface TaskOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
}

export interface TaskCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists';
  value: any;
  logicalOperator?: 'and' | 'or';
}

export interface WorkflowTrigger {
  type: 'schedule' | 'event' | 'manual' | 'webhook' | 'data_change';
  config: Record<string, any>;
  enabled: boolean;
}

export interface WorkflowCondition {
  name: string;
  expression: string;
  description?: string;
}

export interface WorkflowAlert {
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  channels: string[];
  message: string;
}

// Runtime Interfaces
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  
  // Context
  context: WorkflowContext;
  
  // Results
  tasks: TaskExecution[];
  output?: any;
  error?: WorkflowError;
  
  // Metrics
  metrics: WorkflowMetrics;
  
  // Audit
  auditLog: WorkflowAuditEntry[];
}

export interface WorkflowContext {
  sessionId: string;
  userId?: string;
  tenantId?: string;
  organizationId?: string;
  
  // Input data
  input: Record<string, any>;
  
  // Variables
  variables: Record<string, any>;
  
  // Environment
  environment: 'development' | 'staging' | 'production';
  
  // Metadata
  metadata: Record<string, any>;
}

export interface TaskExecution {
  id: string;
  taskId: string;
  status: TaskStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  
  // Results
  input?: any;
  output?: any;
  error?: TaskError;
  
  // Retry info
  attempt: number;
  maxRetries: number;
  
  // Metrics
  metrics: TaskMetrics;
}

export interface WorkflowError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  taskId?: string;
  stackTrace?: string;
}

export interface TaskError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  retryable: boolean;
}

export interface WorkflowMetrics {
  executionTime: number;
  tasksCompleted: number;
  tasksSkipped: number;
  tasksFailed: number;
  retryCount: number;
  memoryUsage?: number;
  cpuUsage?: number;
  throughput?: number;
}

export interface TaskMetrics {
  executionTime: number;
  retryCount: number;
  memoryUsage?: number;
  cpuUsage?: number;
  dataProcessed?: number;
}

export interface WorkflowAuditEntry {
  timestamp: Date;
  event: string;
  details: any;
  userId?: string;
  taskId?: string;
}

// Message Queue Interfaces
export interface QueueMessage {
  id: string;
  type: MessageType;
  payload: any;
  priority: Priority;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
  delay?: number;
  expiration?: Date;
  metadata?: Record<string, any>;
}

export type MessageType = 
  | 'workflow_start'
  | 'workflow_complete'
  | 'workflow_failed'
  | 'task_start'
  | 'task_complete'
  | 'task_failed'
  | 'data_available'
  | 'alert_triggered'
  | 'custom';

export interface QueueConfig {
  name: string;
  type: 'standard' | 'priority' | 'delay' | 'dead_letter';
  maxSize?: number;
  ttl?: number;
  retryPolicy?: RetryPolicy;
  deadLetterQueue?: string;
  visibilityTimeout?: number;
}

export interface RetryPolicy {
  maxRetries: number;
  strategy: RetryStrategy;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier?: number;
}

// Integration Interfaces
export interface DataSource {
  id: string;
  name: string;
  type: 'opcua' | 'mqtt' | 'database' | 'api' | 'file';
  config: Record<string, any>;
  enabled: boolean;
  healthCheck?: {
    endpoint: string;
    interval: number;
    timeout: number;
  };
}

export interface Integration {
  id: string;
  name: string;
  type: 'opcua' | 'mqtt' | 'ai_agent' | 'notification' | 'database' | 'api';
  config: Record<string, any>;
  enabled: boolean;
  
  // Methods
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  healthCheck?(): Promise<boolean>;
  process?(data: any): Promise<any>;
}

// OPC UA Integration
export interface OPCUAConfig {
  endpoint: string;
  securityMode: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy: string;
  username?: string;
  password?: string;
  certificate?: string;
  privateKey?: string;
  nodes: OPCUANode[];
  subscriptionInterval: number;
}

export interface OPCUANode {
  nodeId: string;
  name: string;
  dataType: string;
  samplingInterval?: number;
  queueSize?: number;
}

// MQTT Integration
export interface MQTTConfig {
  broker: string;
  port: number;
  username?: string;
  password?: string;
  clientId?: string;
  topics: MQTTTopic[];
  qos: 0 | 1 | 2;
  keepAlive: number;
  clean: boolean;
}

export interface MQTTTopic {
  topic: string;
  qos: 0 | 1 | 2;
  retain?: boolean;
  messageHandler?: string;
}

// AI Agent Integration
export interface AIAgentConfig {
  agentId: string;
  type: 'manufacturing_engineering' | 'quality_analysis' | 'predictive_maintenance';
  endpoint?: string;
  timeout: number;
  retries: number;
  priority: Priority;
  config: Record<string, any>;
}

// Monitoring and Observability
export interface WorkflowMonitor {
  trackExecution(execution: WorkflowExecution): void;
  trackTask(taskExecution: TaskExecution): void;
  recordMetric(metric: string, value: number, tags?: Record<string, string>): void;
  sendAlert(alert: WorkflowAlert, context: any): void;
  getMetrics(workflowId: string, timeRange?: { start: Date; end: Date }): Promise<WorkflowMetrics>;
}

// Event System
export interface WorkflowEvent {
  id: string;
  type: string;
  workflowId: string;
  executionId: string;
  taskId?: string;
  timestamp: Date;
  data: any;
  metadata?: Record<string, any>;
}

export interface EventHandler {
  handle(event: WorkflowEvent): Promise<void>;
  canHandle(eventType: string): boolean;
}

// Service Interfaces
export interface WorkflowEngine {
  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;
  
  // Workflow management
  registerWorkflow(definition: WorkflowDefinition): Promise<void>;
  unregisterWorkflow(workflowId: string): Promise<void>;
  getWorkflow(workflowId: string): Promise<WorkflowDefinition | null>;
  listWorkflows(): Promise<WorkflowDefinition[]>;
  
  // Execution
  executeWorkflow(workflowId: string, context: WorkflowContext): Promise<WorkflowExecution>;
  pauseWorkflow(executionId: string): Promise<void>;
  resumeWorkflow(executionId: string): Promise<void>;
  cancelWorkflow(executionId: string): Promise<void>;
  
  // Monitoring
  getExecution(executionId: string): Promise<WorkflowExecution | null>;
  listExecutions(workflowId?: string): Promise<WorkflowExecution[]>;
  getMetrics(workflowId: string): Promise<WorkflowMetrics>;
}

export interface TaskExecutor {
  execute(task: TaskDefinition, context: WorkflowContext, input?: any): Promise<any>;
  canExecute(taskType: TaskType): boolean;
  validate(task: TaskDefinition): boolean;
}

export interface MessageQueue {
  // Queue management
  createQueue(config: QueueConfig): Promise<void>;
  deleteQueue(queueName: string): Promise<void>;
  
  // Message operations
  enqueue(queueName: string, message: QueueMessage): Promise<void>;
  dequeue(queueName: string): Promise<QueueMessage | null>;
  peek(queueName: string): Promise<QueueMessage | null>;
  
  // Batch operations
  enqueueBatch(queueName: string, messages: QueueMessage[]): Promise<void>;
  dequeueBatch(queueName: string, count: number): Promise<QueueMessage[]>;
  
  // Queue info
  getQueueSize(queueName: string): Promise<number>;
  getQueueInfo(queueName: string): Promise<QueueInfo>;
  
  // Health
  healthCheck(): Promise<boolean>;
}

export interface QueueInfo {
  name: string;
  size: number;
  processingCount: number;
  deadLetterCount: number;
  throughput: number;
  averageProcessingTime: number;
}

// Factory Functions
export interface WorkflowFactory {
  createWorkflow(definition: WorkflowDefinition): WorkflowExecution;
  createTask(definition: TaskDefinition): TaskExecution;
  createContext(input: any, metadata?: any): WorkflowContext;
}

// Error Types
export class WorkflowExecutionError extends Error {
  constructor(
    message: string,
    public code: string,
    public workflowId: string,
    public executionId: string,
    public taskId?: string
  ) {
    super(message);
    this.name = 'WorkflowExecutionError';
  }
}

export class TaskExecutionError extends Error {
  constructor(
    message: string,
    public code: string,
    public taskId: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'TaskExecutionError';
  }
}

export class IntegrationError extends Error {
  constructor(
    message: string,
    public integrationId: string,
    public integrationName: string
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}