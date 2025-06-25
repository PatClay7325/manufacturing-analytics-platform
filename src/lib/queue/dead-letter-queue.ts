/**
 * Dead Letter Queue Implementation
 * Production-ready failed job handling and recovery
 */

import { Queue, Job, Worker } from 'bullmq';
import Redis from 'ioredis';
import { jobQueue, JobData, JobResult } from './job-queue';

interface DeadLetterEntry {
  originalQueue: string;
  jobId: string;
  jobData: JobData;
  error: {
    message: string;
    stack?: string;
    code?: string;
  };
  attempts: number;
  failedAt: Date;
  lastAttempt: Date;
  metadata?: {
    processingTime?: number;
    workerId?: string;
    originalDelay?: number;
  };
}

interface RetryStrategy {
  maxRetries: number;
  backoffType: 'fixed' | 'exponential' | 'linear';
  backoffDelay: number;
  maxBackoffDelay?: number;
  retryableErrors?: string[];
  nonRetryableErrors?: string[];
}

export class DeadLetterQueue {
  private static instance: DeadLetterQueue;
  private dlq: Queue<DeadLetterEntry>;
  private dlqWorker?: Worker<DeadLetterEntry>;
  private redis: Redis;
  private retryStrategies: Map<string, RetryStrategy> = new Map();
  private alertThresholds: Map<string, number> = new Map();

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DLQ_DB || '4'),
    });

    this.dlq = new Queue('dead-letter-queue', {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: false, // Keep for analysis
        removeOnFail: false,
      },
    });

    this.initializeDefaultStrategies();
    this.startMonitoring();
  }

  static getInstance(): DeadLetterQueue {
    if (!DeadLetterQueue.instance) {
      DeadLetterQueue.instance = new DeadLetterQueue();
    }
    return DeadLetterQueue.instance;
  }

  /**
   * Initialize default retry strategies
   */
  private initializeDefaultStrategies(): void {
    // Default strategy
    this.retryStrategies.set('default', {
      maxRetries: 3,
      backoffType: 'exponential',
      backoffDelay: 5000, // 5 seconds
      maxBackoffDelay: 300000, // 5 minutes
      nonRetryableErrors: [
        'ValidationError',
        'AuthenticationError',
        'AuthorizationError',
        'NotFoundError',
      ],
    });

    // Network errors - more aggressive retry
    this.retryStrategies.set('network', {
      maxRetries: 5,
      backoffType: 'exponential',
      backoffDelay: 1000,
      maxBackoffDelay: 60000,
      retryableErrors: [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'NetworkError',
      ],
    });

    // File processing - moderate retry
    this.retryStrategies.set('file-processing', {
      maxRetries: 2,
      backoffType: 'fixed',
      backoffDelay: 10000,
      nonRetryableErrors: [
        'FileNotFoundError',
        'InvalidFileFormat',
        'FileTooLarge',
      ],
    });
  }

  /**
   * Add failed job to DLQ
   */
  async addToDeadLetter(
    job: Job<JobData>,
    error: Error,
    originalQueue: string
  ): Promise<void> {
    const entry: DeadLetterEntry = {
      originalQueue,
      jobId: job.id!,
      jobData: job.data,
      error: {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      },
      attempts: job.attemptsMade,
      failedAt: new Date(),
      lastAttempt: new Date(),
      metadata: {
        processingTime: job.processedOn ? Date.now() - job.processedOn : undefined,
        workerId: job.workerId,
        originalDelay: job.opts.delay,
      },
    };

    // Determine if job should be retried
    const strategy = this.getRetryStrategy(job);
    const shouldRetry = this.shouldRetry(entry, strategy);

    if (shouldRetry) {
      // Add to DLQ with retry scheduled
      const delay = this.calculateBackoff(entry.attempts, strategy);
      await this.dlq.add('retry', entry, {
        delay,
        attempts: 1, // Single attempt for retry
      });
    } else {
      // Add to DLQ for manual intervention
      await this.dlq.add('failed', entry, {
        priority: this.getPriorityFromError(error),
      });

      // Check alert threshold
      await this.checkAlertThreshold(originalQueue);
    }

    // Log to persistent storage
    await this.logFailure(entry);
  }

  /**
   * Get retry strategy for job
   */
  private getRetryStrategy(job: Job<JobData>): RetryStrategy {
    // Check job-specific strategy
    if (job.data.metadata?.retryStrategy) {
      return this.retryStrategies.get(job.data.metadata.retryStrategy) || 
             this.retryStrategies.get('default')!;
    }

    // Check queue-specific strategy
    const queueStrategy = this.retryStrategies.get(job.queueName);
    if (queueStrategy) {
      return queueStrategy;
    }

    // Check error type strategy
    if (job.failedReason?.includes('ECONNREFUSED') || 
        job.failedReason?.includes('ETIMEDOUT')) {
      return this.retryStrategies.get('network')!;
    }

    return this.retryStrategies.get('default')!;
  }

  /**
   * Determine if job should be retried
   */
  private shouldRetry(entry: DeadLetterEntry, strategy: RetryStrategy): boolean {
    // Check max retries
    if (entry.attempts >= strategy.maxRetries) {
      return false;
    }

    // Check non-retryable errors
    if (strategy.nonRetryableErrors) {
      for (const errorType of strategy.nonRetryableErrors) {
        if (entry.error.message.includes(errorType) || 
            entry.error.code === errorType) {
          return false;
        }
      }
    }

    // Check retryable errors (if specified)
    if (strategy.retryableErrors && strategy.retryableErrors.length > 0) {
      let isRetryable = false;
      for (const errorType of strategy.retryableErrors) {
        if (entry.error.message.includes(errorType) || 
            entry.error.code === errorType) {
          isRetryable = true;
          break;
        }
      }
      return isRetryable;
    }

    return true;
  }

  /**
   * Calculate backoff delay
   */
  private calculateBackoff(attempts: number, strategy: RetryStrategy): number {
    let delay: number;

    switch (strategy.backoffType) {
      case 'fixed':
        delay = strategy.backoffDelay;
        break;
      
      case 'linear':
        delay = strategy.backoffDelay * attempts;
        break;
      
      case 'exponential':
        delay = strategy.backoffDelay * Math.pow(2, attempts - 1);
        break;
      
      default:
        delay = strategy.backoffDelay;
    }

    // Apply max delay cap
    if (strategy.maxBackoffDelay) {
      delay = Math.min(delay, strategy.maxBackoffDelay);
    }

    // Add jitter (±10%)
    const jitter = delay * 0.1;
    delay += (Math.random() - 0.5) * 2 * jitter;

    return Math.round(delay);
  }

  /**
   * Get priority from error type
   */
  private getPriorityFromError(error: Error): number {
    // Critical errors get higher priority
    if (error.message.includes('Database') || 
        error.message.includes('Critical')) {
      return 1;
    }
    
    // Business logic errors
    if (error.message.includes('Validation') || 
        error.message.includes('Business')) {
      return 5;
    }

    // Default priority
    return 10;
  }

  /**
   * Process DLQ entries (retry handler)
   */
  startProcessing(): void {
    this.dlqWorker = new Worker<DeadLetterEntry>(
      'dead-letter-queue',
      async (job) => {
        if (job.name === 'retry') {
          return await this.retryJob(job.data);
        } else {
          // Manual intervention required
          return { requiresManualIntervention: true };
        }
      },
      {
        connection: this.redis,
        concurrency: 5,
      }
    );

    this.dlqWorker.on('completed', (job) => {
      console.log(`DLQ job ${job.id} completed`);
    });

    this.dlqWorker.on('failed', (job, error) => {
      console.error(`DLQ job ${job?.id} failed:`, error);
    });
  }

  /**
   * Retry a job from DLQ
   */
  private async retryJob(entry: DeadLetterEntry): Promise<JobResult> {
    try {
      // Re-add to original queue
      const job = await jobQueue.addJob(
        entry.originalQueue,
        {
          ...entry.jobData,
          metadata: {
            ...entry.jobData.metadata,
            dlqRetry: true,
            previousAttempts: entry.attempts,
          },
        },
        {
          priority: 5, // Medium priority for retries
        }
      );

      return {
        success: true,
        data: { retriedJobId: job.id },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Retry failed',
      };
    }
  }

  /**
   * Manually retry a DLQ entry
   */
  async manualRetry(dlqJobId: string): Promise<boolean> {
    const job = await this.dlq.getJob(dlqJobId);
    if (!job) return false;

    const result = await this.retryJob(job.data);
    if (result.success) {
      await job.remove();
      return true;
    }

    return false;
  }

  /**
   * Get DLQ statistics
   */
  async getStats(): Promise<{
    total: number;
    failed: number;
    pending: number;
    byQueue: Record<string, number>;
    byError: Record<string, number>;
    oldestEntry?: Date;
  }> {
    const [failed, pending] = await Promise.all([
      this.dlq.getJobCounts('failed'),
      this.dlq.getJobCounts('delayed'),
    ]);

    const allJobs = await this.dlq.getJobs(['failed', 'delayed'], 0, -1);
    
    const byQueue: Record<string, number> = {};
    const byError: Record<string, number> = {};
    let oldestEntry: Date | undefined;

    for (const job of allJobs) {
      const data = job.data;
      
      // Count by queue
      byQueue[data.originalQueue] = (byQueue[data.originalQueue] || 0) + 1;
      
      // Count by error type
      const errorType = data.error.code || data.error.message.split(':')[0];
      byError[errorType] = (byError[errorType] || 0) + 1;
      
      // Track oldest
      if (!oldestEntry || data.failedAt < oldestEntry) {
        oldestEntry = data.failedAt;
      }
    }

    return {
      total: failed.failed + pending.delayed,
      failed: failed.failed,
      pending: pending.delayed,
      byQueue,
      byError,
      oldestEntry,
    };
  }

  /**
   * Get DLQ entries with filters
   */
  async getEntries(options: {
    queue?: string;
    errorType?: string;
    status?: 'failed' | 'pending';
    limit?: number;
    offset?: number;
  }): Promise<DeadLetterEntry[]> {
    const status = options.status || 'failed';
    const jobs = await this.dlq.getJobs(
      [status === 'pending' ? 'delayed' : 'failed'],
      options.offset || 0,
      options.limit || 10
    );

    let entries = jobs.map(job => job.data);

    // Apply filters
    if (options.queue) {
      entries = entries.filter(e => e.originalQueue === options.queue);
    }

    if (options.errorType) {
      entries = entries.filter(e => 
        e.error.message.includes(options.errorType!) ||
        e.error.code === options.errorType
      );
    }

    return entries;
  }

  /**
   * Purge old DLQ entries
   */
  async purgeOldEntries(olderThan: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    const jobs = await this.dlq.getJobs(['failed'], 0, -1);
    const cutoff = Date.now() - olderThan;
    let purged = 0;

    for (const job of jobs) {
      if (job.data.failedAt.getTime() < cutoff) {
        await job.remove();
        purged++;
      }
    }

    return purged;
  }

  /**
   * Log failure to persistent storage
   */
  private async logFailure(entry: DeadLetterEntry): Promise<void> {
    // In production, this would write to a database or file
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };

    console.error('Job failure logged:', JSON.stringify(logEntry, null, 2));
  }

  /**
   * Check and trigger alerts
   */
  private async checkAlertThreshold(queue: string): Promise<void> {
    const threshold = this.alertThresholds.get(queue) || 10;
    const stats = await this.getStats();
    
    if (stats.byQueue[queue] >= threshold) {
      // Trigger alert
      console.error(`ALERT: DLQ threshold reached for queue ${queue}: ${stats.byQueue[queue]} failures`);
      
      // In production, send to monitoring service
      // await alertingService.send({
      //   severity: 'high',
      //   queue,
      //   failures: stats.byQueue[queue],
      // });
    }
  }

  /**
   * Start monitoring DLQ health
   */
  private startMonitoring(): void {
    setInterval(async () => {
      const stats = await this.getStats();
      
      // Log metrics
      console.log('DLQ Stats:', stats);
      
      // Check for old entries
      if (stats.oldestEntry) {
        const age = Date.now() - stats.oldestEntry.getTime();
        if (age > 7 * 24 * 60 * 60 * 1000) { // 7 days
          console.warn('DLQ contains entries older than 7 days');
        }
      }
      
      // Check queue health
      if (stats.total > 100) {
        console.warn(`High DLQ count: ${stats.total} entries`);
      }
    }, 60000); // Every minute
  }

  /**
   * Set retry strategy
   */
  setRetryStrategy(name: string, strategy: RetryStrategy): void {
    this.retryStrategies.set(name, strategy);
  }

  /**
   * Set alert threshold
   */
  setAlertThreshold(queue: string, threshold: number): void {
    this.alertThresholds.set(queue, threshold);
  }

  /**
   * Export DLQ data for analysis
   */
  async exportData(format: 'json' | 'csv' = 'json'): Promise<string> {
    const entries = await this.getEntries({ limit: -1 });
    
    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    } else {
      // CSV format
      const headers = [
        'Queue',
        'Job ID',
        'Error',
        'Attempts',
        'Failed At',
        'Type',
        'Tenant ID',
        'User ID',
      ];
      
      const rows = entries.map(e => [
        e.originalQueue,
        e.jobId,
        e.error.message,
        e.attempts,
        e.failedAt.toISOString(),
        e.jobData.type,
        e.jobData.tenantId || '',
        e.jobData.userId || '',
      ]);
      
      return [
        headers.join(','),
        ...rows.map(r => r.map(v => `"${v}"`).join(',')),
      ].join('\n');
    }
  }
}

// Export singleton instance
export const deadLetterQueue = DeadLetterQueue.getInstance();