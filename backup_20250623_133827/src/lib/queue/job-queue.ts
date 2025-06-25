/**
 * BullMQ Job Queue Implementation
 * Production-ready distributed job processing
 */

import { Queue, Worker, Job, QueueScheduler, FlowProducer } from 'bullmq';
import Redis from 'ioredis';
import { performance } from 'perf_hooks';

interface JobData {
  type: string;
  payload: any;
  tenantId?: string;
  userId?: string;
  correlationId?: string;
  priority?: number;
  metadata?: Record<string, any>;
}

interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  processingTime?: number;
}

interface QueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultJobOptions: {
    removeOnComplete: number | boolean;
    removeOnFail: number | boolean;
    attempts: number;
    backoff: {
      type: string;
      delay: number;
    };
  };
}

export class JobQueueService {
  private static instance: JobQueueService;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private schedulers: Map<string, QueueScheduler> = new Map();
  private flowProducer: FlowProducer;
  private redis: Redis;
  private config: QueueConfig;

  constructor() {
    this.config = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_QUEUE_DB || '2'),
      },
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    };

    // Create Redis connection
    this.redis = new Redis(this.config.redis);
    
    // Create flow producer for complex workflows
    this.flowProducer = new FlowProducer({
      connection: this.redis.duplicate(),
    });
  }

  static getInstance(): JobQueueService {
    if (!JobQueueService.instance) {
      JobQueueService.instance = new JobQueueService();
    }
    return JobQueueService.instance;
  }

  /**
   * Get or create a queue
   */
  getQueue(queueName: string): Queue {
    if (!this.queues.has(queueName)) {
      const queue = new Queue(queueName, {
        connection: this.redis.duplicate(),
        defaultJobOptions: this.config.defaultJobOptions,
      });

      // Create scheduler for delayed/repeated jobs
      const scheduler = new QueueScheduler(queueName, {
        connection: this.redis.duplicate(),
      });

      this.queues.set(queueName, queue);
      this.schedulers.set(queueName, scheduler);
    }

    return this.queues.get(queueName)!;
  }

  /**
   * Add a job to queue
   */
  async addJob(
    queueName: string,
    jobData: JobData,
    options?: {
      delay?: number;
      priority?: number;
      repeat?: {
        pattern: string;
        limit?: number;
      };
      jobId?: string;
    }
  ): Promise<Job> {
    const queue = this.getQueue(queueName);

    // Add correlation ID if not present
    if (!jobData.correlationId) {
      jobData.correlationId = this.generateCorrelationId();
    }

    return await queue.add(jobData.type, jobData, {
      ...options,
      priority: options?.priority || jobData.priority || 0,
    });
  }

  /**
   * Add bulk jobs
   */
  async addBulkJobs(
    queueName: string,
    jobs: Array<{
      name: string;
      data: JobData;
      opts?: any;
    }>
  ): Promise<Job[]> {
    const queue = this.getQueue(queueName);
    return await queue.addBulk(jobs);
  }

  /**
   * Create a workflow (dependent jobs)
   */
  async createWorkflow(
    name: string,
    jobs: Array<{
      queueName: string;
      name: string;
      data: JobData;
      children?: any[];
    }>
  ): Promise<any> {
    return await this.flowProducer.add({
      name,
      queueName: 'workflows',
      children: jobs,
    });
  }

  /**
   * Register job processor
   */
  registerProcessor(
    queueName: string,
    processor: (job: Job<JobData>) => Promise<JobResult>,
    options?: {
      concurrency?: number;
      limiter?: {
        max: number;
        duration: number;
      };
    }
  ): Worker {
    if (this.workers.has(queueName)) {
      throw new Error(`Worker already registered for queue: ${queueName}`);
    }

    const worker = new Worker(
      queueName,
      async (job: Job<JobData>) => {
        const startTime = performance.now();
        
        try {
          // Add job context to async local storage
          await this.setJobContext(job);
          
          // Process job
          const result = await processor(job);
          
          // Record metrics
          const processingTime = performance.now() - startTime;
          await this.recordJobMetrics(queueName, job, 'completed', processingTime);
          
          return {
            ...result,
            processingTime,
          };
        } catch (error) {
          const processingTime = performance.now() - startTime;
          await this.recordJobMetrics(queueName, job, 'failed', processingTime);
          
          throw error;
        }
      },
      {
        connection: this.redis.duplicate(),
        concurrency: options?.concurrency || 5,
        limiter: options?.limiter,
      }
    );

    // Add event listeners
    this.setupWorkerEventListeners(worker, queueName);

    this.workers.set(queueName, worker);
    return worker;
  }

  /**
   * Setup worker event listeners
   */
  private setupWorkerEventListeners(worker: Worker, queueName: string): void {
    worker.on('completed', (job: Job, result: any) => {
      console.log(`Job ${job.id} completed in queue ${queueName}`, {
        jobType: job.data.type,
        correlationId: job.data.correlationId,
        processingTime: result.processingTime,
      });
    });

    worker.on('failed', (job: Job | undefined, error: Error) => {
      console.error(`Job ${job?.id} failed in queue ${queueName}`, {
        jobType: job?.data.type,
        correlationId: job?.data.correlationId,
        error: error.message,
        stack: error.stack,
      });
    });

    worker.on('error', (error: Error) => {
      console.error(`Worker error in queue ${queueName}:`, error);
    });

    worker.on('stalled', (jobId: string) => {
      console.warn(`Job ${jobId} stalled in queue ${queueName}`);
    });
  }

  /**
   * Get job by ID
   */
  async getJob(queueName: string, jobId: string): Promise<Job | undefined> {
    const queue = this.getQueue(queueName);
    return await queue.getJob(jobId);
  }

  /**
   * Get jobs by status
   */
  async getJobs(
    queueName: string,
    status: 'completed' | 'failed' | 'delayed' | 'active' | 'waiting' | 'paused',
    start = 0,
    end = 10
  ): Promise<Job[]> {
    const queue = this.getQueue(queueName);
    return await queue.getJobs([status], start, end);
  }

  /**
   * Retry failed job
   */
  async retryJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job && (await job.isFailed())) {
      await job.retry();
    }
  }

  /**
   * Remove job
   */
  async removeJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (job) {
      await job.remove();
    }
  }

  /**
   * Pause/Resume queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
  }

  /**
   * Clean queue
   */
  async cleanQueue(
    queueName: string,
    grace: number,
    limit: number,
    status?: 'completed' | 'failed'
  ): Promise<string[]> {
    const queue = this.getQueue(queueName);
    if (status) {
      return await queue.clean(grace, limit, status);
    }
    return await queue.clean(grace, limit);
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(queueName: string): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  }> {
    const queue = this.getQueue(queueName);
    
    const [
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    ] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };
  }

  /**
   * Set job context for async local storage
   */
  private async setJobContext(job: Job<JobData>): Promise<void> {
    // This would integrate with AsyncLocalStorage for request context
    // For now, we'll use a simplified version
    (global as any).__currentJob = {
      id: job.id,
      type: job.data.type,
      correlationId: job.data.correlationId,
      tenantId: job.data.tenantId,
      userId: job.data.userId,
    };
  }

  /**
   * Record job metrics
   */
  private async recordJobMetrics(
    queueName: string,
    job: Job<JobData>,
    status: 'completed' | 'failed',
    processingTime: number
  ): Promise<void> {
    // This would integrate with Prometheus
    // For now, we'll use Redis to store metrics
    const metricsKey = `metrics:${queueName}:${status}`;
    const dayKey = new Date().toISOString().split('T')[0];
    
    await this.redis.hincrby(metricsKey, dayKey, 1);
    await this.redis.hincrbyfloat(`${metricsKey}:time`, dayKey, processingTime);
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    // Close all workers
    await Promise.all(
      Array.from(this.workers.values()).map(worker => worker.close())
    );

    // Close all schedulers
    await Promise.all(
      Array.from(this.schedulers.values()).map(scheduler => scheduler.close())
    );

    // Close all queues
    await Promise.all(
      Array.from(this.queues.values()).map(queue => queue.close())
    );

    // Close flow producer
    await this.flowProducer.close();

    // Close Redis connection
    this.redis.disconnect();
  }
}

// Export singleton instance
export const jobQueue = JobQueueService.getInstance();

// Export types
export type { JobData, JobResult };