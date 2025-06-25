/**
 * Job Queue Service
 * Background job processing with retry and persistence
 */

import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface Job {
  id: string;
  type: string;
  payload: any;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'critical';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
  metadata?: Record<string, any>;
}

interface JobOptions {
  priority?: 'low' | 'normal' | 'high' | 'critical';
  retries?: number;
  backoff?: 'linear' | 'exponential';
  delay?: number;
  timeout?: number;
  metadata?: Record<string, any>;
}

interface QueueOptions {
  concurrency?: number;
  pollInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
}

type JobHandler = (job: Job) => Promise<any>;

export class JobQueue extends EventEmitter {
  private handlers: Map<string, JobHandler>;
  private workers: Map<string, NodeJS.Timeout>;
  private processing: Set<string>;
  private options: Required<QueueOptions>;
  private isRunning: boolean;

  constructor(options: QueueOptions = {}) {
    super();
    this.handlers = new Map();
    this.workers = new Map();
    this.processing = new Set();
    this.isRunning = false;
    
    this.options = {
      concurrency: options.concurrency || 5,
      pollInterval: options.pollInterval || 1000,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 5000,
    };
  }

  /**
   * Register a job handler
   */
  register(type: string, handler: JobHandler): void {
    this.handlers.set(type, handler);
  }

  /**
   * Enqueue a new job
   */
  async enqueue(
    type: string,
    payload: any,
    options: JobOptions = {}
  ): Promise<string> {
    const jobId = crypto.randomUUID();
    
    const job = await prisma.jobQueue.create({
      data: {
        id: jobId,
        type,
        payload: JSON.stringify(payload),
        status: 'pending',
        priority: options.priority || 'normal',
        attempts: 0,
        maxAttempts: options.retries || this.options.maxRetries,
        scheduledFor: options.delay 
          ? new Date(Date.now() + options.delay)
          : new Date(),
        metadata: options.metadata 
          ? JSON.stringify(options.metadata)
          : null,
      },
    });

    this.emit('job:created', { jobId, type, priority: job.priority });
    
    // Start processing if not already running
    if (!this.isRunning) {
      this.start();
    }

    return jobId;
  }

  /**
   * Cancel a job
   */
  async cancel(jobId: string): Promise<boolean> {
    const job = await prisma.jobQueue.findUnique({
      where: { id: jobId },
    });

    if (!job || job.status !== 'pending') {
      return false;
    }

    await prisma.jobQueue.update({
      where: { id: jobId },
      data: {
        status: 'cancelled',
        completedAt: new Date(),
      },
    });

    this.emit('job:cancelled', { jobId });
    return true;
  }

  /**
   * Start processing jobs
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.emit('queue:started');
    
    // Start worker loops
    for (let i = 0; i < this.options.concurrency; i++) {
      this.startWorker(i);
    }
  }

  /**
   * Stop processing jobs
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    
    // Clear all worker intervals
    for (const [id, interval] of this.workers.entries()) {
      clearInterval(interval);
      this.workers.delete(id);
    }

    // Wait for current jobs to complete
    while (this.processing.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.emit('queue:stopped');
  }

  /**
   * Start a worker loop
   */
  private startWorker(workerId: number): void {
    const workerKey = `worker-${workerId}`;
    
    const interval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(interval);
        this.workers.delete(workerKey);
        return;
      }

      try {
        await this.processNextJob(workerId);
      } catch (error) {
        console.error(`Worker ${workerId} error:`, error);
      }
    }, this.options.pollInterval);

    this.workers.set(workerKey, interval);
  }

  /**
   * Process the next available job
   */
  private async processNextJob(workerId: number): Promise<void> {
    // Get next job with priority ordering
    const job = await prisma.jobQueue.findFirst({
      where: {
        status: 'pending',
        scheduledFor: { lte: new Date() },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    if (!job) return;

    // Mark as processing
    const processingKey = `${job.type}:${job.id}`;
    if (this.processing.has(processingKey)) return;
    
    this.processing.add(processingKey);

    try {
      // Update job status
      await prisma.jobQueue.update({
        where: { id: job.id },
        data: {
          status: 'processing',
          startedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      this.emit('job:started', { jobId: job.id, type: job.type, workerId });

      // Get handler
      const handler = this.handlers.get(job.type);
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`);
      }

      // Execute job
      const jobData: Job = {
        ...job,
        payload: JSON.parse(job.payload),
        metadata: job.metadata ? JSON.parse(job.metadata) : undefined,
      };

      const result = await handler(jobData);

      // Mark as completed
      await prisma.jobQueue.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          result: result ? JSON.stringify(result) : null,
        },
      });

      this.emit('job:completed', { jobId: job.id, type: job.type, result });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if should retry
      const shouldRetry = job.attempts < job.maxAttempts;
      
      await prisma.jobQueue.update({
        where: { id: job.id },
        data: {
          status: shouldRetry ? 'pending' : 'failed',
          error: errorMessage,
          completedAt: shouldRetry ? null : new Date(),
          scheduledFor: shouldRetry
            ? new Date(Date.now() + this.calculateBackoff(job.attempts))
            : undefined,
        },
      });

      this.emit('job:failed', { 
        jobId: job.id, 
        type: job.type, 
        error: errorMessage,
        willRetry: shouldRetry,
      });

    } finally {
      this.processing.delete(processingKey);
    }
  }

  /**
   * Calculate backoff delay
   */
  private calculateBackoff(attempts: number): number {
    // Exponential backoff: 5s, 10s, 20s, 40s, etc.
    return this.options.retryDelay * Math.pow(2, attempts - 1);
  }

  /**
   * Get job status
   */
  async getJob(jobId: string): Promise<Job | null> {
    const job = await prisma.jobQueue.findUnique({
      where: { id: jobId },
    });

    if (!job) return null;

    return {
      ...job,
      payload: JSON.parse(job.payload),
      metadata: job.metadata ? JSON.parse(job.metadata) : undefined,
      result: job.result ? JSON.parse(job.result) : undefined,
    };
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    const [pending, processing, completed, failed, cancelled] = await Promise.all([
      prisma.jobQueue.count({ where: { status: 'pending' } }),
      prisma.jobQueue.count({ where: { status: 'processing' } }),
      prisma.jobQueue.count({ where: { status: 'completed' } }),
      prisma.jobQueue.count({ where: { status: 'failed' } }),
      prisma.jobQueue.count({ where: { status: 'cancelled' } }),
    ]);

    return { pending, processing, completed, failed, cancelled };
  }

  /**
   * Clean up old jobs
   */
  async cleanup(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await prisma.jobQueue.deleteMany({
      where: {
        completedAt: { lt: cutoffDate },
        status: { in: ['completed', 'failed', 'cancelled'] },
      },
    });

    return result.count;
  }
}

// Export singleton instance
export const jobQueue = new JobQueue();