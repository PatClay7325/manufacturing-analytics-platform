/**
 * Base Agent Class
 * Provides common functionality for all manufacturing analysis agents
 */

import { 
  IAgent, 
  AgentType, 
  AgentStatus, 
  AgentConfig, 
  AgentContext, 
  AgentResult,
  AgentCommunication 
} from './types';
import { logger } from '@/lib/logger';

export abstract class BaseAgent implements IAgent {
  public type: AgentType;
  public status: AgentStatus = 'idle';
  public config: AgentConfig;
  protected communication?: AgentCommunication;
  protected startTime?: Date;

  constructor(type: AgentType, config: AgentConfig) {
    this.type = type;
    this.config = config;
  }

  /**
   * Set the communication channel for inter-agent messaging
   */
  setCommunication(communication: AgentCommunication): void {
    this.communication = communication;
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    logger.info(`Initializing ${this.type} agent`);
    this.status = 'idle';
  }

  /**
   * Execute the agent's main logic
   */
  abstract execute(context: AgentContext, data?: any): Promise<AgentResult>;

  /**
   * Validate input data
   */
  validate(data: any): boolean {
    return true; // Override in subclasses for specific validation
  }

  /**
   * Handle errors gracefully
   */
  handleError(error: Error): void {
    logger.error(`Error in ${this.type} agent:`, error);
    this.status = 'failed';
  }

  /**
   * Get current agent status
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Shutdown the agent
   */
  async shutdown(): Promise<void> {
    logger.info(`Shutting down ${this.type} agent`);
    this.status = 'idle';
  }

  /**
   * Helper method to create a result object
   */
  protected createResult<T>(data: T, errors?: Error[], warnings?: string[]): AgentResult<T> {
    const endTime = new Date();
    const executionTime = this.startTime ? endTime.getTime() - this.startTime.getTime() : 0;

    return {
      agentType: this.type,
      status: this.status,
      startTime: this.startTime || new Date(),
      endTime,
      executionTime,
      data,
      errors,
      warnings,
      metadata: {
        agentVersion: '1.0.0',
        configuredTimeout: this.config.timeout
      }
    };
  }

  /**
   * Helper method to update status
   */
  protected setStatus(status: AgentStatus): void {
    this.status = status;
    logger.debug(`${this.type} agent status changed to: ${status}`);
  }

  /**
   * Helper method to log execution start
   */
  protected logStart(context: AgentContext): void {
    this.startTime = new Date();
    this.setStatus('processing');
    logger.info(`${this.type} agent started processing`, {
      sessionId: context.sessionId,
      analysisType: context.analysisType,
      query: context.query.substring(0, 100) // Log first 100 chars of query
    });
  }

  /**
   * Helper method to log execution completion
   */
  protected logComplete(result: AgentResult): void {
    this.setStatus('completed');
    logger.info(`${this.type} agent completed processing`, {
      executionTime: result.executionTime,
      errors: result.errors?.length || 0,
      warnings: result.warnings?.length || 0
    });
  }

  /**
   * Send a message to another agent
   */
  protected async sendMessage(toAgent: AgentType, content: any, type: 'request' | 'response' | 'status' = 'request'): Promise<void> {
    if (!this.communication) {
      logger.warn(`No communication channel set for ${this.type} agent`);
      return;
    }

    await this.communication.send({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      fromAgent: this.type,
      toAgent,
      stage: this.getCurrentStage(),
      type,
      content
    });
  }

  /**
   * Receive messages for this agent
   */
  protected async receiveMessages(): Promise<any[]> {
    if (!this.communication) {
      return [];
    }

    const messages = await this.communication.receive(this.type);
    return messages.map(msg => msg.content);
  }

  /**
   * Get the current pipeline stage based on agent type
   */
  private getCurrentStage(): any {
    const stageMap = {
      'data_collector': 'data_collection',
      'quality_analyzer': 'analysis',
      'performance_optimizer': 'optimization',
      'maintenance_predictor': 'analysis',
      'root_cause_analyzer': 'analysis',
      'visualization_generator': 'visualization',
      'report_generator': 'reporting',
      'orchestrator': 'data_collection'
    };

    return stageMap[this.type] || 'analysis';
  }
}