/**
 * Integration Pipeline
 * 
 * Provides a pipeline system for processing data from 
 * The pipeline combines data acquisition, transformation, validation, and delivery
 * into a configurable workflow.
 */

import { EventProducer } from './events/interfaces';
import { LoggerService } from './architecture/interfaces';
import { ServiceStatus } from './architecture/types';
import { IntegrationAdapter } from './interfaces/IntegrationAdapter';
import { DataTransformer, TransformationResult } from './interfaces/DataTransformer';
import { DataValidator, ValidationResult } from './interfaces/DataValidator';
import { IntegrationDataPacket, IntegrationError, IntegrationErrorType } from './types';

/**
 * Pipeline stage type
 */
export enum PipelineStageType {
  SOURCE = 'source',
  TRANSFORMER = 'transformer',
  VALIDATOR = 'validator',
  SINK = 'sink',
  FILTER = 'filter',
  CUSTOM = 'custom'
}

/**
 * Pipeline execution context
 * Passed through the pipeline to track progress and carry metadata
 */
export interface PipelineContext {
  /**
   * Pipeline ID
   */
  pipelineId: string;
  
  /**
   * Execution ID for this run
   */
  executionId: string;
  
  /**
   * Timestamp when processing started
   */
  startTime: Date;
  
  /**
   * Source adapter ID
   */
  sourceId: string;
  
  /**
   * Current stage index
   */
  currentStage: number;
  
  /**
   * Total number of stages
   */
  totalStages: number;
  
  /**
   * Original data received from source
   */
  originalData?: unknown;
  
  /**
   * Processing time at each stage in milliseconds
   */
  stageTiming: number[];
  
  /**
   * Additional metadata and context
   */
  metadata: Record<string, unknown>;
  
  /**
   * Error encountered during processing, if any
   */
  error?: IntegrationError;
}

/**
 * Pipeline stage configuration
 */
export interface PipelineStageConfig {
  /**
   * Stage ID
   */
  id: string;
  
  /**
   * Stage name
   */
  name: string;
  
  /**
   * Stage type
   */
  type: PipelineStageType;
  
  /**
   * Component ID (adapter, transformer, validator, etc.)
   */
  componentId: string;
  
  /**
   * Stage-specific configuration
   */
  config?: Record<string, unknown>;
  
  /**
   * Condition to determine if this stage should be executed
   */
  condition?: string;
  
  /**
   * Error handling strategy
   */
  errorHandling?: {
    /**
     * What to do on error (continue, retry, abort)
     */
    strategy: 'continue' | 'retry' | 'abort';
    
    /**
     * Maximum retry attempts
     */
    maxRetries?: number;
    
    /**
     * Retry delay in milliseconds
     */
    retryDelay?: number;
    
    /**
     * Whether to use exponential backoff for retries
     */
    useExponentialBackoff?: boolean;
  };
}

/**
 * Pipeline configuration
 */
export interface PipelineCoreConfig {
  /**
   * Pipeline ID
   */
  id: string;
  
  /**
   * Pipeline name
   */
  name: string;
  
  /**
   * Pipeline description
   */
  description?: string;
  
  /**
   * Whether the pipeline should auto-start
   */
  autoStart?: boolean;
  
  /**
   * Pipeline stages
   */
  stages: PipelineStageConfig[];
  
  /**
   * Error handling configuration
   */
  errorHandling?: {
    /**
     * What to do on error (continue, retry, abort)
     */
    defaultStrategy: 'continue' | 'retry' | 'abort';
    
    /**
     * Maximum retry attempts
     */
    maxRetries?: number;
    
    /**
     * Retry delay in milliseconds
     */
    retryDelay?: number;
  };
  
  /**
   * Monitoring configuration
   */
  monitoring?: {
    /**
     * Whether to collect metrics
     */
    collectMetrics?: boolean;
    
    /**
     * Whether to log detailed processing information
     */
    detailedLogging?: boolean;
  };
}

/**
 * Pipeline statistics
 */
export interface PipelineStats {
  /**
   * Number of messages processed
   */
  processedCount: number;
  
  /**
   * Number of errors encountered
   */
  errorCount: number;
  
  /**
   * Number of retries performed
   */
  retryCount: number;
  
  /**
   * Average processing time in milliseconds
   */
  averageProcessingTime: number;
  
  /**
   * Stage-specific statistics
   */
  stageStats: Record<string, {
    /**
     * Number of messages processed by this stage
     */
    processedCount: number;
    
    /**
     * Number of errors encountered in this stage
     */
    errorCount: number;
    
    /**
     * Average processing time for this stage in milliseconds
     */
    averageProcessingTime: number;
  }>;
  
  /**
   * Timestamp when statistics were last updated
   */
  lastUpdated: Date;
}

/**
 * Pipeline execution result
 */
export interface PipelineResult<T = unknown> {
  /**
   * Whether the pipeline execution was successful
   */
  success: boolean;
  
  /**
   * Output data from the pipeline
   */
  data?: T;
  
  /**
   * Error information if the pipeline failed
   */
  error?: IntegrationError;
  
  /**
   * Pipeline execution context
   */
  context: PipelineContext;
  
  /**
   * Total processing time in milliseconds
   */
  processingTime: number;
}

/**
 * Custom stage handler function
 */
export type CustomStageHandler = (
  data: unknown,
  context: PipelineContext,
  config: Record<string, unknown>
) => Promise<unknown>;

/**
 * Integration pipeline
 */
export class IntegrationPipeline {
  /**
   * Pipeline ID
   */
  readonly id: string;
  
  /**
   * Pipeline name
   */
  readonly name: string;
  
  /**
   * Pipeline status
   */
  status: ServiceStatus = ServiceStatus.INITIALIZING;
  
  /**
   * Pipeline configuration
   */
  config: PipelineCoreConfig;
  
  /**
   * Map of source adapters
   */
  private sourceAdapters: Map<string, IntegrationAdapter> = new Map();
  
  /**
   * Map of sink adapters
   */
  private sinkAdapters: Map<string, IntegrationAdapter> = new Map();
  
  /**
   * Map of transformers
   */
  private transformers: Map<string, DataTransformer> = new Map();
  
  /**
   * Map of validators
   */
  private validators: Map<string, DataValidator> = new Map();
  
  /**
   * Map of custom stage handlers
   */
  private customHandlers: Map<string, CustomStageHandler> = new Map();
  
  /**
   * Map of active subscriptions by source adapter ID
   */
  private subscriptions: Map<string, string[]> = new Map();
  
  /**
   * Pipeline statistics
   */
  private stats: PipelineStats = {
    processedCount: 0,
    errorCount: 0,
    retryCount: 0,
    averageProcessingTime: 0,
    stageStats: {},
    lastUpdated: new Date()
  };
  
  /**
   * Constructor
   * @param id Pipeline ID
   * @param name Pipeline name
   * @param logger Logger service
   * @param eventProducer Event producer
   * @param config Pipeline configuration
   */
  constructor(
    id: string,
    name: string,
    private readonly logger: LoggerService,
    private readonly eventProducer: EventProducer,
    config: Record<string, unknown>
  ) {
    this.id = id;
    this.name = name;
    this.config = this.parseConfig(config);
    
    // Initialize stage statistics
    for (const stage of this.config.stages) {
      this.stats.stageStats[stage.id] = {
        processedCount: 0,
        errorCount: 0,
        averageProcessingTime: 0
      };
    }
    
    this.status = ServiceStatus.READY;
  }
  
  /**
   * Start the pipeline
   */
  async start(): Promise<void> {
    if (this.status === ServiceStatus.RUNNING) {
      this.logger.warn(`Pipeline ${this.name} is already running`);
      return;
    }
    
    this.logger.info(`Starting pipeline: ${this.name}`);
    this.status = ServiceStatus.STARTING;
    
    try {
      // Set up subscriptions to source adapters
      const sourceStages = this.config.stages.filter(stage => stage.type === PipelineStageType.SOURCE);
      
      for (const sourceStage of sourceStages) {
        const adapter = this.sourceAdapters.get(sourceStage.componentId);
        
        if (!adapter) {
          throw new Error(`Source adapter with ID ${sourceStage.componentId} not found`);
        }
        
        // Make sure the adapter is connected
        if (adapter.status !== ServiceStatus.RUNNING) {
          this.logger.info(`Starting source adapter: ${adapter.name}`);
          await adapter.start();
        }
        
        this.logger.debug(`Setting up subscription to source adapter: ${adapter.name}`);
        
        // Create a subscription for this source
        const subscriptionIds = await this.subscribeToSource(adapter, sourceStage.config || {});
        
        // Store the subscription IDs
        this.subscriptions.set(adapter.id, subscriptionIds);
      }
      
      this.status = ServiceStatus.RUNNING;
      this.logger.info(`Pipeline ${this.name} started successfully`);
      
      // Publish pipeline started event
      await this.eventProducer.createAndPublishEvent(
        'integration.pipeline.started',
        {
          pipelineId: this.id,
          pipelineName: this.name,
          timestamp: new Date()
        }
      );
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      this.logger.error(`Failed to start pipeline ${this.name}`, error);
      
      // Publish pipeline error event
      await this.eventProducer.createAndPublishEvent(
        'integration.pipeline.error',
        {
          pipelineId: this.id,
          pipelineName: this.name,
          error: error.message,
          timestamp: new Date()
        }
      );
      
      throw error;
    }
  }
  
  /**
   * Stop the pipeline
   */
  async stop(): Promise<void> {
    if (this.status !== ServiceStatus.RUNNING) {
      this.logger.warn(`Pipeline ${this.name} is not running`);
      return;
    }
    
    this.logger.info(`Stopping pipeline: ${this.name}`);
    this.status = ServiceStatus.STOPPING;
    
    try {
      // Unsubscribe from all sources
      for (const [adapterId, subscriptionIds] of this.subscriptions.entries()) {
        const adapter = this.sourceAdapters.get(adapterId);
        
        if (adapter) {
          for (const subscriptionId of subscriptionIds) {
            try {
              this.logger.debug(`Unsubscribing from name} (subscription: ${subscriptionId})`);
              await adapter.unsubscribe(subscriptionId);
            } catch (error) {
              this.logger.error(`Failed to unsubscribe from name}`, error);
            }
          }
        }
      }
      
      // Clear all subscriptions
      this.subscriptions.clear();
      
      this.status = ServiceStatus.READY;
      this.logger.info(`Pipeline ${this.name} stopped successfully`);
      
      // Publish pipeline stopped event
      await this.eventProducer.createAndPublishEvent(
        'integration.pipeline.stopped',
        {
          pipelineId: this.id,
          pipelineName: this.name,
          timestamp: new Date()
        }
      );
    } catch (error) {
      this.status = ServiceStatus.ERROR;
      this.logger.error(`Failed to stop pipeline ${this.name}`, error);
      
      // Publish pipeline error event
      await this.eventProducer.createAndPublishEvent(
        'integration.pipeline.error',
        {
          pipelineId: this.id,
          pipelineName: this.name,
          error: error.message,
          timestamp: new Date()
        }
      );
      
      throw error;
    }
  }
  
  /**
   * Add a source adapter to the pipeline
   * @param adapter The source adapter
   */
  addSourceAdapter(adapter: IntegrationAdapter): void {
    if (this.status === ServiceStatus.RUNNING) {
      throw new Error(`Cannot add components to a running pipeline`);
    }
    
    this.sourceAdapters.set(adapter.id, adapter);
    this.logger.debug(`Added source adapter to pipeline ${this.name}: ${adapter.name}`);
  }
  
  /**
   * Add a sink adapter to the pipeline
   * @param adapter The sink adapter
   */
  addSinkAdapter(adapter: IntegrationAdapter): void {
    if (this.status === ServiceStatus.RUNNING) {
      throw new Error(`Cannot add components to a running pipeline`);
    }
    
    this.sinkAdapters.set(adapter.id, adapter);
    this.logger.debug(`Added sink adapter to pipeline ${this.name}: ${adapter.name}`);
  }
  
  /**
   * Add a transformer to the pipeline
   * @param id Transformer ID
   * @param transformer The transformer
   */
  addTransformer(id: string, transformer: DataTransformer): void {
    if (this.status === ServiceStatus.RUNNING) {
      throw new Error(`Cannot add components to a running pipeline`);
    }
    
    this.transformers.set(id, transformer);
    this.logger.debug(`Added transformer to pipeline ${this.name}: ${id}`);
  }
  
  /**
   * Add a validator to the pipeline
   * @param id Validator ID
   * @param validator The validator
   */
  addValidator(id: string, validator: DataValidator): void {
    if (this.status === ServiceStatus.RUNNING) {
      throw new Error(`Cannot add components to a running pipeline`);
    }
    
    this.validators.set(id, validator);
    this.logger.debug(`Added validator to pipeline ${this.name}: ${id}`);
  }
  
  /**
   * Register a custom stage handler
   * @param id Handler ID
   * @param handler The handler function
   */
  registerCustomHandler(id: string, handler: CustomStageHandler): void {
    if (this.status === ServiceStatus.RUNNING) {
      throw new Error(`Cannot add components to a running pipeline`);
    }
    
    this.customHandlers.set(id, handler);
    this.logger.debug(`Registered custom handler in pipeline ${this.name}: ${id}`);
  }
  
  /**
   * Process data through the pipeline
   * @param data Input data
   * @param sourceId Source ID
   * @param metadata Additional metadata
   * @returns Pipeline execution result
   */
  async process<T = unknown, U = unknown>(
    data: T,
    sourceId: string,
    metadata: Record<string, unknown> = {}
  ): Promise<PipelineResult<U>> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();
    
    // Create pipeline context
    const context: PipelineContext = {
      pipelineId: this.id,
      executionId,
      startTime: new Date(),
      sourceId,
      currentStage: 0,
      totalStages: this.config.stages.length,
      originalData: data,
      stageTiming: [],
      metadata
    };
    
    this.logger.debug(`Starting pipeline execution: ${executionId}`, {
      pipelineId: this.id,
      sourceId
    });
    
    let currentData: unknown = data;
    let success = true;
    
    // Process each stage
    for (let i = 0; i < this.config.stages.length; i++) {
      const stage = this.config.stages[i];
      context.currentStage = i;
      
      // Check if we should skip this stage based on condition
      if (stage.condition && !this.evaluateCondition(stage.condition, currentData, context)) {
        this.logger.debug(`Skipping stage ${stage.name} due to condition`, {
          pipelineId: this.id,
          executionId,
          stageId: stage.id
        });
        context.stageTiming.push(0); // Add 0 for skipped stage
        continue;
      }
      
      const stageStartTime = Date.now();
      
      try {
        // Process the stage
        this.logger.debug(`Executing stage ${stage.name}`, {
          pipelineId: this.id,
          executionId,
          stageId: stage.id
        });
        
        currentData = await this.executeStage(stage, currentData, context);
        
        // Record stage timing
        const stageDuration = Date.now() - stageStartTime;
        context.stageTiming.push(stageDuration);
        
        // Update stage statistics
        this.updateStageStats(stage.id, stageDuration, false);
        
        this.logger.debug(`Stage ${stage.name} completed successfully`, {
          pipelineId: this.id,
          executionId,
          stageId: stage.id,
          duration: stageDuration
        });
      } catch (error) {
        // Handle stage error
        success = false;
        
        // Record stage timing even for errors
        const stageDuration = Date.now() - stageStartTime;
        context.stageTiming.push(stageDuration);
        
        // Update stage statistics
        this.updateStageStats(stage.id, stageDuration, true);
        
        // Create integration error
        const integrationError: IntegrationError = {
          type: IntegrationErrorType.UNKNOWN,
          message: error.message,
          originalError: error,
          timestamp: new Date(),
          integrationId: sourceId,
          context: {
            pipelineId: this.id,
            stageId: stage.id,
            stageName: stage.name
          }
        };
        
        context.error = integrationError;
        
        this.logger.error(`Error in pipeline stage ${stage.name}: ${error.message}`, error, {
          pipelineId: this.id,
          executionId,
          stageId: stage.id
        });
        
        // Check if we should retry
        if (stage.errorHandling?.strategy === 'retry') {
          const retryResult = await this.retryStage(stage, currentData, context, error);
          
          if (retryResult.success) {
            // Retry succeeded, continue with next stage
            currentData = retryResult.data;
            success = true;
            continue;
          }
        }
        
        // Check if we should abort or continue
        if (!stage.errorHandling || stage.errorHandling.strategy === 'abort') {
          // Abort the pipeline
          this.logger.info(`Aborting pipeline execution due to error in stage ${stage.name}`, {
            pipelineId: this.id,
            executionId
          });
          
          // Publish pipeline error event
          await this.eventProducer.createAndPublishEvent(
            'integration.pipeline.execution.error',
            {
              pipelineId: this.id,
              executionId,
              stageId: stage.id,
              error: error.message,
              timestamp: new Date()
            }
          );
          
          break;
        }
        
        // Continue to next stage
        this.logger.info(`Continuing pipeline execution despite error in stage ${stage.name}`, {
          pipelineId: this.id,
          executionId
        });
      }
    }
    
    const totalDuration = Date.now() - startTime;
    
    // Update pipeline statistics
    this.updatePipelineStats(totalDuration, !success);
    
    // Create result
    const result: PipelineResult<U> = {
      success,
      data: success ? currentData as U : undefined,
      error: context.error,
      context,
      processingTime: totalDuration
    };
    
    // Log completion
    this.logger.info(`Pipeline execution completed: ${success ? 'SUCCESS' : 'FAILURE'}`, {
      pipelineId: this.id,
      executionId,
      duration: totalDuration
    });
    
    // Publish execution completion event
    await this.eventProducer.createAndPublishEvent(
      'integration.pipeline.execution.completed',
      {
        pipelineId: this.id,
        executionId,
        success,
        duration: totalDuration,
        timestamp: new Date()
      }
    );
    
    return result;
  }
  
  /**
   * Get pipeline statistics
   * @returns Pipeline statistics
   */
  getStats(): PipelineStats {
    return { ...this.stats, lastUpdated: new Date() };
  }
  
  /**
   * Reset pipeline statistics
   */
  resetStats(): void {
    this.stats = {
      processedCount: 0,
      errorCount: 0,
      retryCount: 0,
      averageProcessingTime: 0,
      stageStats: {},
      lastUpdated: new Date()
    };
    
    // Reset stage statistics
    for (const stage of this.config.stages) {
      this.stats.stageStats[stage.id] = {
        processedCount: 0,
        errorCount: 0,
        averageProcessingTime: 0
      };
    }
    
    this.logger.debug(`Reset statistics for pipeline ${this.name}`);
  }
  
  /**
   * Get the number of adapters in the pipeline
   * @returns The adapter count
   */
  getAdapterCount(): number {
    return this.sourceAdapters.size + this.sinkAdapters.size;
  }
  
  /**
   * Get the number of transformers in the pipeline
   * @returns The transformer count
   */
  getTransformerCount(): number {
    return this.transformers.size;
  }
  
  /**
   * Get the number of validators in the pipeline
   * @returns The validator count
   */
  getValidatorCount(): number {
    return this.validators.size;
  }
  
  /**
   * Get the number of messages processed by the pipeline
   * @returns The processed count
   */
  getProcessedCount(): number {
    return this.stats.processedCount;
  }
  
  /**
   * Get the number of errors encountered by the pipeline
   * @returns The error count
   */
  getErrorCount(): number {
    return this.stats.errorCount;
  }
  
  /**
   * Parse pipeline configuration
   * @param config Raw configuration object
   * @returns Parsed pipeline configuration
   */
  private parseConfig(config: Record<string, unknown>): PipelineCoreConfig {
    // Basic validation
    if (!config.id || typeof config.id !== 'string') {
      throw new Error('Pipeline configuration must include a string id');
    }
    
    if (!config.name || typeof config.name !== 'string') {
      throw new Error('Pipeline configuration must include a string name');
    }
    
    if (!config.stages || !Array.isArray(config.stages)) {
      throw new Error('Pipeline configuration must include an array of stages');
    }
    
    // Parse and validate stages
    const stages = config.stages.map((stage: any) => {
      if (!stage.id || typeof stage.id !== 'string') {
        throw new Error('Each pipeline stage must include a string id');
      }
      
      if (!stage.name || typeof stage.name !== 'string') {
        throw new Error('Each pipeline stage must include a string name');
      }
      
      if (!stage.type || typeof stage.type !== 'string') {
        throw new Error('Each pipeline stage must include a string type');
      }
      
      if (!Object.values(PipelineStageType).includes(stage.type as PipelineStageType)) {
        throw new Error(`Invalid pipeline stage type: ${stage.type}`);
      }
      
      if (!stage.componentId || typeof stage.componentId !== 'string') {
        throw new Error('Each pipeline stage must include a string componentId');
      }
      
      return {
        id: stage.id,
        name: stage.name,
        type: stage.type,
        componentId: stage.componentId,
        config: stage.config || {},
        condition: stage.condition,
        errorHandling: stage.errorHandling
      } as PipelineStageConfig;
    });
    
    return {
      id: config.id as string,
      name: config.name as string,
      description: config.description as string,
      autoStart: config.autoStart as boolean,
      stages,
      errorHandling: config.errorHandling as any,
      monitoring: config.monitoring as any
    };
  }
  
  /**
   * Execute a pipeline stage
   * @param stage Stage configuration
   * @param data Input data
   * @param context Pipeline context
   * @returns Output data
   */
  private async executeStage(
    stage: PipelineStageConfig,
    data: unknown,
    context: PipelineContext
  ): Promise<unknown> {
    switch (stage.type) {
      case PipelineStageType.SOURCE:
        // Source stages are handled separately during pipeline startup
        return data;
        
      case PipelineStageType.TRANSFORMER:
        return this.executeTransformerStage(stage, data, context);
        
      case PipelineStageType.VALIDATOR:
        return this.executeValidatorStage(stage, data, context);
        
      case PipelineStageType.SINK:
        return this.executeSinkStage(stage, data, context);
        
      case PipelineStageType.FILTER:
        return this.executeFilterStage(stage, data, context);
        
      case PipelineStageType.CUSTOM:
        return this.executeCustomStage(stage, data, context);
        
      default:
        throw new Error(`Unsupported pipeline stage type: ${stage.type}`);
    }
  }
  
  /**
   * Execute a transformer stage
   * @param stage Stage configuration
   * @param data Input data
   * @param context Pipeline context
   * @returns Transformed data
   */
  private async executeTransformerStage(
    stage: PipelineStageConfig,
    data: unknown,
    context: PipelineContext
  ): Promise<unknown> {
    const transformer = this.transformers.get(stage.componentId);
    
    if (!transformer) {
      throw new Error(`Transformer with ID ${stage.componentId} not found`);
    }
    
    // Determine the transformation direction
    const direction = stage.config?.direction as string || 'inbound';
    let result: TransformationResult;
    
    if (direction === 'outbound') {
      // Transform from internal format to external format
      if (!this.isIntegrationDataPacket(data)) {
        throw new Error('Outbound transformation requires an IntegrationDataPacket as input');
      }
      
      result = await transformer.transformOutbound(data, {
        ...stage.config,
        pipelineContext: context
      });
    } else {
      // Transform from external format to internal format
      result = await transformer.transformInbound(data, {
        ...stage.config,
        pipelineContext: context
      });
    }
    
    if (!result.success) {
      throw new Error(
        `Transformation failed: ${result.error?.message || 'Unknown error'}`
      );
    }
    
    return result.data;
  }
  
  /**
   * Execute a validator stage
   * @param stage Stage configuration
   * @param data Input data
   * @param context Pipeline context
   * @returns Validated data
   */
  private async executeValidatorStage(
    stage: PipelineStageConfig,
    data: unknown,
    context: PipelineContext
  ): Promise<unknown> {
    const validator = this.validators.get(stage.componentId);
    
    if (!validator) {
      throw new Error(`Validator with ID ${stage.componentId} not found`);
    }
    
    // Determine the validation direction
    const direction = stage.config?.direction as string || 'inbound';
    let result: ValidationResult;
    
    if (direction === 'outbound') {
      // Validate outbound data
      if (!this.isIntegrationDataPacket(data)) {
        throw new Error('Outbound validation requires an IntegrationDataPacket as input');
      }
      
      result = await validator.validateOutbound(data, {
        ...stage.config,
        pipelineContext: context
      });
    } else {
      // Validate inbound data
      result = await validator.validateInbound(data, {
        ...stage.config,
        pipelineContext: context
      });
    }
    
    if (!result.valid) {
      const errorMessages = result.errors?.map(e => e.message).join(', ') || 'Unknown validation error';
      throw new Error(`Validation failed: ${errorMessages}`);
    }
    
    // Return the original data if valid
    return data;
  }
  
  /**
   * Execute a sink stage
   * @param stage Stage configuration
   * @param data Input data
   * @param context Pipeline context
   * @returns The original data
   */
  private async executeSinkStage(
    stage: PipelineStageConfig,
    data: unknown,
    context: PipelineContext
  ): Promise<unknown> {
    const adapter = this.sinkAdapters.get(stage.componentId);
    
    if (!adapter) {
      throw new Error(`Sink adapter with ID ${stage.componentId} not found`);
    }
    
    // Ensure the adapter is connected
    if (adapter.connectionStatus !== ConnectionStatus.CONNECTED) {
      throw new Error(`Sink adapter ${adapter.name} is not connected`);
    }
    
    // Convert to IntegrationDataPacket if necessary
    let dataPacket: IntegrationDataPacket;
    
    if (this.isIntegrationDataPacket(data)) {
      dataPacket = data;
    } else {
      // Create a new data packet
      dataPacket = {
        id: context.executionId,
        source: context.sourceId,
        timestamp: new Date(),
        payload: data,
        metadata: { ...context.metadata }
      };
    }
    
    // Send the data to the sink
    await adapter.sendData(dataPacket, stage.config);
    
    // Return the original data
    return data;
  }
  
  /**
   * Execute a filter stage
   * @param stage Stage configuration
   * @param data Input data
   * @param context Pipeline context
   * @returns Filtered data or null if filtered out
   */
  private async executeFilterStage(
    stage: PipelineStageConfig,
    data: unknown,
    context: PipelineContext
  ): Promise<unknown> {
    const filterCondition = stage.config?.condition as string;
    
    if (!filterCondition) {
      throw new Error('Filter stage requires a condition configuration');
    }
    
    // Evaluate the filter condition
    const include = this.evaluateCondition(filterCondition, data, context);
    
    // If the condition is false, filter out the data
    if (!include) {
      this.logger.debug(`Data filtered out by condition in stage ${stage.name}`, {
        pipelineId: this.id,
        executionId: context.executionId,
        stageId: stage.id
      });
      
      // Signal to skip remaining stages
      throw new Error('FILTER_SKIP');
    }
    
    // Return the original data if it passes the filter
    return data;
  }
  
  /**
   * Execute a custom stage
   * @param stage Stage configuration
   * @param data Input data
   * @param context Pipeline context
   * @returns Processed data
   */
  private async executeCustomStage(
    stage: PipelineStageConfig,
    data: unknown,
    context: PipelineContext
  ): Promise<unknown> {
    const handler = this.customHandlers.get(stage.componentId);
    
    if (!handler) {
      throw new Error(`Custom handler with ID ${stage.componentId} not found`);
    }
    
    // Execute the custom handler
    return await handler(data, context, stage.config || {});
  }
  
  /**
   * Retry a failed stage
   * @param stage Stage configuration
   * @param data Input data
   * @param context Pipeline context
   * @param originalError The original error
   * @returns Retry result
   */
  private async retryStage(
    stage: PipelineStageConfig,
    data: unknown,
    context: PipelineContext,
    originalError: Error
  ): Promise<{ success: boolean; data?: unknown }> {
    const maxRetries = stage.errorHandling?.maxRetries || 
                       this.config.errorHandling?.maxRetries || 
                       3;
    
    const retryDelay = stage.errorHandling?.retryDelay || 
                      this.config.errorHandling?.retryDelay || 
                      1000;
    
    const useExponentialBackoff = stage.errorHandling?.useExponentialBackoff !== false;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Calculate delay with exponential backoff if enabled
      const delay = useExponentialBackoff ? 
                   retryDelay * Math.pow(2, attempt - 1) : 
                   retryDelay;
      
      this.logger.info(`Retrying stage ${stage.name} (attempt ${attempt}/${maxRetries}) after ${delay}ms`, {
        pipelineId: this.id,
        executionId: context.executionId,
        stageId: stage.id
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      try {
        // Retry the stage
        const retryStartTime = Date.now();
        const result = await this.executeStage(stage, data, context);
        
        // Update statistics
        this.stats.retryCount++;
        
        this.logger.info(`Retry succeeded for stage ${stage.name} (attempt ${attempt}/${maxRetries})`, {
          pipelineId: this.id,
          executionId: context.executionId,
          stageId: stage.id,
          duration: Date.now() - retryStartTime
        });
        
        return { success: true, data: result };
      } catch (error) {
        this.logger.error(`Retry failed for stage ${stage.name} (attempt ${attempt}/${maxRetries}): ${error.message}`, error, {
          pipelineId: this.id,
          executionId: context.executionId,
          stageId: stage.id
        });
        
        // Continue to next retry attempt
      }
    }
    
    this.logger.error(`All retry attempts failed for stage ${stage.name}`, originalError, {
      pipelineId: this.id,
      executionId: context.executionId,
      stageId: stage.id,
      maxRetries
    });
    
    return { success: false };
  }
  
  /**
   * Subscribe to a source adapter
   * @param adapter Source adapter
   * @param config Subscription configuration
   * @returns Array of subscription IDs
   */
  private async subscribeToSource(
    adapter: IntegrationAdapter,
    config: Record<string, unknown>
  ): Promise<string[]> {
    const subscriptionIds: string[] = [];
    
    // Create a data handler for this source
    const dataHandler = async (data: IntegrationDataPacket): Promise<void> => {
      this.logger.debug(`Received data from name}`, {
        pipelineId: this.id,
        adapterId: adapter.id,
        dataId: data.id
      });
      
      try {
        // Process the data through the pipeline
        await this.process(data, adapter.id, {
          sourceAdapter: adapter.id,
          sourceConfig: config
        });
      } catch (error) {
        // If the error is FILTER_SKIP, it's just a filter stage signal, not a real error
        if (error.message === 'FILTER_SKIP') {
          return;
        }
        
        this.logger.error(`Error processing data from message}`, error, {
          pipelineId: this.id,
          adapterId: adapter.id,
          dataId: data.id
        });
        
        // Publish pipeline error event
        await this.eventProducer.createAndPublishEvent(
          'integration.pipeline.data.error',
          {
            pipelineId: this.id,
            pipelineName: this.name,
            adapterId: adapter.id,
            dataId: data.id,
            error: error.message,
            timestamp: new Date()
          }
        );
      }
    };
    
    // Handle topic subscriptions for MQTT-like adapters
    if (config.topics && Array.isArray(config.topics)) {
      for (const topic of config.topics as string[]) {
        const subscriptionId = await adapter.receiveData(
          dataHandler,
          { ...config, topic }
        );
        
        subscriptionIds.push(subscriptionId);
        
        this.logger.debug(`Subscribed to topic ${topic} on adapter ${adapter.name}`, {
          pipelineId: this.id,
          adapterId: adapter.id,
          subscriptionId
        });
      }
    } else {
      // Default subscription
      const subscriptionId = await adapter.receiveData(dataHandler, config);
      subscriptionIds.push(subscriptionId);
      
      this.logger.debug(`Subscribed to adapter ${adapter.name}`, {
        pipelineId: this.id,
        adapterId: adapter.id,
        subscriptionId
      });
    }
    
    return subscriptionIds;
  }
  
  /**
   * Evaluate a condition expression
   * @param condition Condition expression
   * @param data Data to evaluate against
   * @param context Pipeline context
   * @returns Whether the condition is met
   */
  private evaluateCondition(
    condition: string,
    data: unknown,
    context: PipelineContext
  ): boolean {
    try {
      // This is a simple implementation. In a real system, you would use
      // a proper expression evaluator or rules engine.
      // For now, we'll just use Function constructor to evaluate the expression.
      // Note: This is not secure for production use with untrusted conditions.
      
      // Create a function that evaluates the condition
      const evaluator = new Function(
        'data',
        'context',
        `return ${condition};`
      );
      
      // Evaluate the condition
      return Boolean(evaluator(data, context));
    } catch (error) {
      this.logger.error(`Error evaluating condition: ${condition}`, error, {
        pipelineId: this.id,
        executionId: context.executionId
      });
      
      // Default to false on error
      return false;
    }
  }
  
  /**
   * Update pipeline statistics
   * @param duration Processing duration in milliseconds
   * @param isError Whether an error occurred
   */
  private updatePipelineStats(duration: number, isError: boolean): void {
    this.stats.processedCount++;
    
    if (isError) {
      this.stats.errorCount++;
    }
    
    // Update average processing time
    if (this.stats.processedCount === 1) {
      this.stats.averageProcessingTime = duration;
    } else {
      const oldWeight = (this.stats.processedCount - 1) / this.stats.processedCount;
      const newWeight = 1 / this.stats.processedCount;
      this.stats.averageProcessingTime = this.stats.averageProcessingTime * oldWeight + duration * newWeight;
    }
    
    this.stats.lastUpdated = new Date();
  }
  
  /**
   * Update stage statistics
   * @param stageId Stage ID
   * @param duration Processing duration in milliseconds
   * @param isError Whether an error occurred
   */
  private updateStageStats(stageId: string, duration: number, isError: boolean): void {
    const stats = this.stats.stageStats[stageId];
    
    if (!stats) {
      return;
    }
    
    stats.processedCount++;
    
    if (isError) {
      stats.errorCount++;
    }
    
    // Update average processing time
    if (stats.processedCount === 1) {
      stats.averageProcessingTime = duration;
    } else {
      const oldWeight = (stats.processedCount - 1) / stats.processedCount;
      const newWeight = 1 / stats.processedCount;
      stats.averageProcessingTime = stats.averageProcessingTime * oldWeight + duration * newWeight;
    }
  }
  
  /**
   * Generate a unique execution ID
   * @returns Execution ID
   */
  private generateExecutionId(): string {
    return `${this.id}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  }
  
  /**
   * Type guard for IntegrationDataPacket
   * @param data Data to check
   * @returns Whether the data is an IntegrationDataPacket
   */
  private isIntegrationDataPacket(data: unknown): data is IntegrationDataPacket {
    return (
      typeof data === 'object' &&
      data !== null &&
      'id' in data &&
      'source' in data &&
      'timestamp' in data &&
      'payload' in data
    );
  }
}