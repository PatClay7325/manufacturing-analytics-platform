/**
 * Communication Manager
 * Handles inter-agent messaging and coordination
 */

import { AgentCommunication, AgentMessage, AgentType } from './types';
import { logger } from '@/lib/logger';

export class CommunicationManager implements AgentCommunication {
  private messages: Map<AgentType, AgentMessage[]> = new Map();
  private subscribers: Map<AgentType, ((message: AgentMessage) => void)[]> = new Map();
  private messageHistory: AgentMessage[] = [];
  private maxHistorySize: number = 1000;

  constructor() {
    // Initialize message queues for all agent types
    const agentTypes: AgentType[] = [
      'data_collector',
      'quality_analyzer',
      'performance_optimizer',
      'maintenance_predictor',
      'root_cause_analyzer',
      'visualization_generator',
      'report_generator',
      'orchestrator'
    ];

    agentTypes.forEach(type => {
      this.messages.set(type, []);
      this.subscribers.set(type, []);
    });
  }

  /**
   * Send a message to a specific agent
   */
  async send(message: AgentMessage): Promise<void> {
    try {
      // Add to message history
      this.addToHistory(message);

      // If message has a specific recipient
      if (message.toAgent) {
        const queue = this.messages.get(message.toAgent);
        if (queue) {
          queue.push(message);
          logger.debug(`Message sent from ${message.fromAgent} to ${message.toAgent}`, {
            messageId: message.id,
            type: message.type
          });

          // Notify subscribers
          this.notifySubscribers(message.toAgent, message);
        } else {
          logger.warn(`No message queue for agent type: ${message.toAgent}`);
        }
      } else {
        // Broadcast message
        await this.broadcast(message);
      }
    } catch (error) {
      logger.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Receive messages for a specific agent
   */
  async receive(agentType: AgentType): Promise<AgentMessage[]> {
    const queue = this.messages.get(agentType);
    if (!queue) {
      return [];
    }

    // Return and clear the queue
    const messages = [...queue];
    queue.length = 0;
    
    logger.debug(`${agentType} received ${messages.length} messages`);
    return messages;
  }

  /**
   * Broadcast a message to all agents
   */
  async broadcast(message: AgentMessage): Promise<void> {
    logger.debug(`Broadcasting message from ${message.fromAgent}`, {
      messageId: message.id,
      type: message.type
    });

    // Add to all queues except the sender
    this.messages.forEach((queue, agentType) => {
      if (agentType !== message.fromAgent) {
        queue.push(message);
        this.notifySubscribers(agentType, message);
      }
    });

    // Add to history
    this.addToHistory(message);
  }

  /**
   * Subscribe to messages for a specific agent
   */
  subscribe(agentType: AgentType, callback: (message: AgentMessage) => void): void {
    const subscribers = this.subscribers.get(agentType);
    if (subscribers) {
      subscribers.push(callback);
      logger.debug(`New subscriber added for ${agentType}`);
    }
  }

  /**
   * Unsubscribe from messages
   */
  unsubscribe(agentType: AgentType): void {
    const subscribers = this.subscribers.get(agentType);
    if (subscribers) {
      subscribers.length = 0;
      logger.debug(`All subscribers removed for ${agentType}`);
    }
  }

  /**
   * Get message history
   */
  getHistory(filter?: {
    fromAgent?: AgentType;
    toAgent?: AgentType;
    stage?: string;
    type?: string;
    limit?: number;
  }): AgentMessage[] {
    let history = [...this.messageHistory];

    if (filter) {
      if (filter.fromAgent) {
        history = history.filter(m => m.fromAgent === filter.fromAgent);
      }
      if (filter.toAgent) {
        history = history.filter(m => m.toAgent === filter.toAgent);
      }
      if (filter.stage) {
        history = history.filter(m => m.stage === filter.stage);
      }
      if (filter.type) {
        history = history.filter(m => m.type === filter.type);
      }
      if (filter.limit) {
        history = history.slice(-filter.limit);
      }
    }

    return history;
  }

  /**
   * Clear all messages
   */
  clear(): void {
    this.messages.forEach(queue => queue.length = 0);
    this.messageHistory.length = 0;
    logger.info('All message queues cleared');
  }

  /**
   * Get queue status
   */
  getQueueStatus(): Record<AgentType, number> {
    const status: Record<string, number> = {};
    this.messages.forEach((queue, agentType) => {
      status[agentType] = queue.length;
    });
    return status;
  }

  /**
   * Add message to history
   */
  private addToHistory(message: AgentMessage): void {
    this.messageHistory.push(message);
    
    // Trim history if it exceeds max size
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Notify subscribers of a new message
   */
  private notifySubscribers(agentType: AgentType, message: AgentMessage): void {
    const subscribers = this.subscribers.get(agentType);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(message);
        } catch (error) {
          logger.error(`Error in subscriber callback for ${agentType}:`, error);
        }
      });
    }
  }
}