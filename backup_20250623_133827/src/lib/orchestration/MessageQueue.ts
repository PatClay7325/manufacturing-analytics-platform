/**
 * Redis-based message queue for workflow orchestration
 * Provides reliable message processing with priority queues and dead letter handling
 */

import Redis from 'ioredis';
import { logger } from '@/lib/logger';
import { getRedisClient } from '@/lib/redis/redisClient';
import { IMessageQueue, QueueMessage, QueueConfig, WorkflowPriority } from './types';
import { v4 as uuidv4 } from 'uuid';
import { CircuitBreakerFactory } from '@/lib/resilience/circuitBreaker';
import { 
  queueSizeGauge,
  messageProcessingDuration,
  messageRetryCounter,
  deadLetterQueueGauge
} from '@/lib/observability/workflowMetrics';

export class RedisMessageQueue implements IMessageQueue {
  private redis: Redis;
  private circuitBreaker;
  private readonly queues: Map<string, QueueConfig> = new Map();
  private readonly processingMessages: Map<string, QueueMessage> = new Map();
  private isShuttingDown = false;

  constructor() {
    this.redis = getRedisClient();
    this.circuitBreaker = CircuitBreakerFactory.getOrCreate('message-queue', {
      failureThreshold: 5,
      resetTimeout: 30000,
      monitoringPeriod: 60000,
    });
    
    this.setupDefaultQueues();
  }

  private setupDefaultQueues(): void {
    // Priority queues for different workflow types
    this.queues.set('workflow-critical', {
      name: 'workflow-critical',
      maxConcurrency: 10,
      retryDelay: 1000,
      maxRetries: 3,
      deadLetterQueue: 'dlq-critical',
      visibility: 30000,
    });

    this.queues.set('workflow-high', {
      name: 'workflow-high',
      maxConcurrency: 20,
      retryDelay: 2000,
      maxRetries: 5,
      deadLetterQueue: 'dlq-high',
      visibility: 60000,
    });

    this.queues.set('workflow-normal', {
      name: 'workflow-normal',
      maxConcurrency: 50,
      retryDelay: 5000,
      maxRetries: 3,
      deadLetterQueue: 'dlq-normal',
      visibility: 120000,
    });

    this.queues.set('workflow-background', {
      name: 'workflow-background',
      maxConcurrency: 100,
      retryDelay: 10000,
      maxRetries: 2,
      deadLetterQueue: 'dlq-background',
      visibility: 300000,
    });

    // Agent-specific queues
    this.queues.set('agent-execution', {
      name: 'agent-execution',
      maxConcurrency: 30,
      retryDelay: 3000,
      maxRetries: 3,
      deadLetterQueue: 'dlq-agents',
      visibility: 90000,
    });

    // Data processing queues
    this.queues.set('opcua-data', {
      name: 'opcua-data',
      maxConcurrency: 100,
      retryDelay: 1000,
      maxRetries: 2,
      deadLetterQueue: 'dlq-opcua',
      visibility: 30000,
    });

    this.queues.set('mqtt-data', {
      name: 'mqtt-data',
      maxConcurrency: 200,
      retryDelay: 500,
      maxRetries: 2,
      deadLetterQueue: 'dlq-mqtt',
      visibility: 15000,
    });
  }

  /**
   * Enqueue a message with priority handling
   */
  async enqueue(message: QueueMessage): Promise<void> {
    const timer = messageProcessingDuration.startTimer({ operation: 'enqueue' });
    
    try {
      await this.circuitBreaker.execute(async () => {
        const queueName = this.getQueueNameByPriority(message.priority);
        const messageData = {
          ...message,
          id: message.id || uuidv4(),
          metadata: {
            ...message.metadata,
            createdAt: message.metadata.createdAt || new Date(),
            retryCount: message.metadata.retryCount || 0,
            traceId: message.metadata.traceId || uuidv4(),
          },
        };

        // Use Redis sorted set for priority queues
        const score = this.calculatePriorityScore(message.priority, messageData.metadata.createdAt);
        const key = `queue:${queueName}`;
        
        await this.redis.zadd(key, score, JSON.stringify(messageData));
        
        // Update metrics
        queueSizeGauge.set({ queue: queueName }, await this.redis.zcard(key));
        
        logger.debug({
          messageId: messageData.id,
          queueName,
          priority: message.priority,
          traceId: messageData.metadata.traceId,
        }, 'Message enqueued');
      });
    } catch (error) {
      logger.error({ error, messageId: message.id }, 'Failed to enqueue message');
      throw error;
    } finally {
      timer();
    }
  }

  /**
   * Dequeue the highest priority message from specified queue
   */
  async dequeue(queueName: string): Promise<QueueMessage | null> {
    if (this.isShuttingDown) {
      return null;
    }

    const timer = messageProcessingDuration.startTimer({ operation: 'dequeue' });
    
    try {
      return await this.circuitBreaker.execute(async () => {
        const key = `queue:${queueName}`;
        const processingKey = `processing:${queueName}`;
        
        // Use BZPOPMIN for blocking pop with timeout
        const result = await this.redis.bzpopmin(key, 1);
        
        if (!result || result.length < 3) {
          return null;
        }

        const messageJson = result[2];
        const message: QueueMessage = JSON.parse(messageJson);
        
        // Move to processing set with visibility timeout
        const config = this.queues.get(queueName);
        if (config) {
          const visibilityScore = Date.now() + config.visibility;
          await this.redis.zadd(processingKey, visibilityScore, messageJson);
        }
        
        // Track processing message
        this.processingMessages.set(message.id, message);
        
        // Update metrics
        queueSizeGauge.set({ queue: queueName }, await this.redis.zcard(key));
        
        logger.debug({
          messageId: message.id,
          queueName,
          traceId: message.metadata.traceId,
        }, 'Message dequeued');
        
        return message;
      });
    } catch (error) {
      logger.error({ error, queueName }, 'Failed to dequeue message');
      return null;
    } finally {
      timer();
    }
  }

  /**
   * Acknowledge successful message processing
   */
  async ack(messageId: string): Promise<void> {
    const timer = messageProcessingDuration.startTimer({ operation: 'ack' });
    
    try {
      await this.circuitBreaker.execute(async () => {
        const message = this.processingMessages.get(messageId);
        if (!message) {
          logger.warn({ messageId }, 'Attempting to ack unknown message');
          return;
        }

        const queueName = this.getQueueNameByPriority(message.priority);
        const processingKey = `processing:${queueName}`;
        const messageJson = JSON.stringify(message);
        
        // Remove from processing set
        await this.redis.zrem(processingKey, messageJson);
        
        // Remove from tracking
        this.processingMessages.delete(messageId);
        
        logger.debug({
          messageId,
          traceId: message.metadata.traceId,
        }, 'Message acknowledged');
      });
    } catch (error) {
      logger.error({ error, messageId }, 'Failed to acknowledge message');
      throw error;
    } finally {
      timer();
    }
  }

  /**
   * Negative acknowledge - requeue or send to dead letter queue
   */
  async nack(messageId: string, requeue: boolean = true): Promise<void> {
    const timer = messageProcessingDuration.startTimer({ operation: 'nack' });
    
    try {
      await this.circuitBreaker.execute(async () => {
        const message = this.processingMessages.get(messageId);
        if (!message) {
          logger.warn({ messageId }, 'Attempting to nack unknown message');
          return;
        }

        const queueName = this.getQueueNameByPriority(message.priority);
        const config = this.queues.get(queueName);
        const processingKey = `processing:${queueName}`;
        const messageJson = JSON.stringify(message);
        
        // Remove from processing set
        await this.redis.zrem(processingKey, messageJson);
        
        if (requeue && config && message.metadata.retryCount < config.maxRetries) {
          // Increment retry count and requeue with delay
          const updatedMessage: QueueMessage = {
            ...message,
            metadata: {
              ...message.metadata,
              retryCount: message.metadata.retryCount + 1,
            },
          };
          
          const delay = this.calculateRetryDelay(config, message.metadata.retryCount);
          const score = Date.now() + delay;
          
          await this.redis.zadd(`queue:${queueName}`, score, JSON.stringify(updatedMessage));
          
          // Update retry metrics
          messageRetryCounter.inc({ queue: queueName, attempt: message.metadata.retryCount + 1 });
          
          logger.info({
            messageId,
            retryCount: updatedMessage.metadata.retryCount,
            delay,
            traceId: message.metadata.traceId,
          }, 'Message requeued for retry');
        } else {
          // Send to dead letter queue
          await this.sendToDeadLetterQueue(message, queueName);
        }
        
        // Remove from tracking
        this.processingMessages.delete(messageId);
      });
    } catch (error) {
      logger.error({ error, messageId }, 'Failed to nack message');
      throw error;
    } finally {
      timer();
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<{
    size: number;
    processing: number;
    failed: number;
  }> {
    try {
      const [size, processing, failed] = await Promise.all([
        this.redis.zcard(`queue:${queueName}`),
        this.redis.zcard(`processing:${queueName}`),
        this.redis.zcard(`dlq:${queueName}`),
      ]);

      return { size, processing, failed };
    } catch (error) {
      logger.error({ error, queueName }, 'Failed to get queue stats');
      return { size: 0, processing: 0, failed: 0 };
    }
  }

  /**
   * Start background tasks for queue maintenance
   */
  async start(): Promise<void> {
    // Start visibility timeout recovery
    this.startVisibilityTimeoutRecovery();
    
    // Start metrics collection
    this.startMetricsCollection();
    
    logger.info('Message queue started');
  }

  /**
   * Graceful shutdown
   */
  async stop(): Promise<void> {
    this.isShuttingDown = true;
    
    // Wait for processing messages to complete
    const timeout = 30000; // 30 seconds
    const start = Date.now();
    
    while (this.processingMessages.size > 0 && (Date.now() - start) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (this.processingMessages.size > 0) {
      logger.warn({ 
        remaining: this.processingMessages.size 
      }, 'Shutting down with processing messages remaining');
    }
    
    logger.info('Message queue stopped');
  }

  private getQueueNameByPriority(priority: WorkflowPriority): string {
    switch (priority) {
      case WorkflowPriority.CRITICAL:
        return 'workflow-critical';
      case WorkflowPriority.HIGH:
        return 'workflow-high';
      case WorkflowPriority.MEDIUM:
        return 'workflow-normal';
      case WorkflowPriority.LOW:
      case WorkflowPriority.BACKGROUND:
        return 'workflow-background';
      default:
        return 'workflow-normal';
    }
  }

  private calculatePriorityScore(priority: WorkflowPriority, createdAt: Date): number {
    // Lower score = higher priority
    // Combine priority with timestamp for FIFO within priority levels
    const priorityWeight = priority * 1000000000; // Ensure priority dominates
    const timestampOffset = createdAt.getTime();
    return priorityWeight + timestampOffset;
  }

  private calculateRetryDelay(config: QueueConfig, retryCount: number): number {
    // Exponential backoff with jitter
    const baseDelay = config.retryDelay;
    const maxDelay = 300000; // 5 minutes max
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  private async sendToDeadLetterQueue(message: QueueMessage, queueName: string): Promise<void> {
    const config = this.queues.get(queueName);
    const dlqName = config?.deadLetterQueue || `dlq-${queueName}`;
    
    const dlqMessage = {
      ...message,
      metadata: {
        ...message.metadata,
        deadLetteredAt: new Date(),
        originalQueue: queueName,
        finalRetryCount: message.metadata.retryCount,
      },
    };
    
    await this.redis.zadd(`dlq:${dlqName}`, Date.now(), JSON.stringify(dlqMessage));
    
    // Update dead letter queue metrics
    deadLetterQueueGauge.set({ queue: dlqName }, await this.redis.zcard(`dlq:${dlqName}`));
    
    logger.error({
      messageId: message.id,
      queueName,
      dlqName,
      retryCount: message.metadata.retryCount,
      traceId: message.metadata.traceId,
    }, 'Message sent to dead letter queue');
  }

  private startVisibilityTimeoutRecovery(): void {
    const recover = async () => {
      if (this.isShuttingDown) return;
      
      try {
        for (const [queueName] of this.queues) {
          const processingKey = `processing:${queueName}`;
          const queueKey = `queue:${queueName}`;
          const now = Date.now();
          
          // Find messages that have exceeded visibility timeout
          const expiredMessages = await this.redis.zrangebyscore(
            processingKey, 
            0, 
            now, 
            'LIMIT', 
            0, 
            100
          );
          
          for (const messageJson of expiredMessages) {
            try {
              const message: QueueMessage = JSON.parse(messageJson);
              
              // Remove from processing and requeue
              await this.redis.zrem(processingKey, messageJson);
              
              // Increment retry count
              const updatedMessage: QueueMessage = {
                ...message,
                metadata: {
                  ...message.metadata,
                  retryCount: message.metadata.retryCount + 1,
                },
              };
              
              const config = this.queues.get(queueName);
              if (config && updatedMessage.metadata.retryCount <= config.maxRetries) {
                const score = now + this.calculateRetryDelay(config, updatedMessage.metadata.retryCount);
                await this.redis.zadd(queueKey, score, JSON.stringify(updatedMessage));
                
                logger.warn({
                  messageId: message.id,
                  queueName,
                  retryCount: updatedMessage.metadata.retryCount,
                }, 'Message visibility timeout recovered');
              } else {
                // Send to dead letter queue
                await this.sendToDeadLetterQueue(updatedMessage, queueName);
              }
              
              // Remove from local tracking
              this.processingMessages.delete(message.id);
            } catch (error) {
              logger.error({ error, messageJson }, 'Failed to recover expired message');
            }
          }
        }
      } catch (error) {
        logger.error({ error }, 'Visibility timeout recovery failed');
      }
      
      // Schedule next recovery
      setTimeout(recover, 30000); // Every 30 seconds
    };
    
    // Start recovery loop
    setTimeout(recover, 30000);
  }

  private startMetricsCollection(): void {
    const collect = async () => {
      if (this.isShuttingDown) return;
      
      try {
        for (const [queueName] of this.queues) {
          const stats = await this.getQueueStats(queueName);
          
          queueSizeGauge.set({ queue: queueName }, stats.size);
          
          // Update dead letter queue metrics
          const dlqName = this.queues.get(queueName)?.deadLetterQueue || `dlq-${queueName}`;
          deadLetterQueueGauge.set({ queue: dlqName }, stats.failed);
        }
      } catch (error) {
        logger.error({ error }, 'Metrics collection failed');
      }
      
      // Schedule next collection
      setTimeout(collect, 60000); // Every minute
    };
    
    // Start metrics collection
    setTimeout(collect, 10000); // Start after 10 seconds
  }
}