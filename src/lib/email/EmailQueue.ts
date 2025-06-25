import { EventEmitter } from 'events';
import { EmailQueueItem, EmailMessage } from './types';
import { v4 as uuidv4 } from 'uuid';

export interface QueueStorage {
  add(item: EmailQueueItem): Promise<void>;
  get(id: string): Promise<EmailQueueItem | null>;
  getNext(limit?: number): Promise<EmailQueueItem[]>;
  update(id: string, updates: Partial<EmailQueueItem>): Promise<void>;
  delete(id: string): Promise<void>;
  getByStatus(status: EmailQueueItem['status'], limit?: number): Promise<EmailQueueItem[]>;
  cleanup(olderThan: Date): Promise<number>;
}

export class EmailQueue extends EventEmitter {
  private storage: QueueStorage;
  private processing = false;
  private processInterval: NodeJS.Timeout | null = null;
  private retryDelays = [60, 300, 900, 3600]; // seconds: 1min, 5min, 15min, 1hr

  constructor(storage: QueueStorage) {
    super();
    this.storage = storage;
  }

  async enqueue(
    message: EmailMessage,
    options: {
      maxAttempts?: number;
      priority?: 'high' | 'normal' | 'low';
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const item: EmailQueueItem = {
      id: uuidv4(),
      message: {
        ...message,
        priority: options.priority || message.priority || 'normal',
      },
      status: 'pending',
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: new Date(),
      metadata: options.metadata,
    };

    await this.storage.add(item);
    this.emit('enqueued', item);
    
    // Trigger processing if not already running
    if (!this.processing) {
      this.startProcessing();
    }

    return item.id;
  }

  async bulkEnqueue(
    messages: EmailMessage[],
    options: {
      maxAttempts?: number;
      priority?: 'high' | 'normal' | 'low';
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string[]> {
    const ids: string[] = [];

    for (const message of messages) {
      const id = await this.enqueue(message, options);
      ids.push(id);
    }

    return ids;
  }

  startProcessing(intervalMs: number = 5000) {
    if (this.processing) return;

    this.processing = true;
    this.processInterval = setInterval(() => {
      this.processQueue().catch(error => {
        console.error('Queue processing error:', error);
        this.emit('error', error);
      });
    }, intervalMs);

    // Process immediately
    this.processQueue().catch(error => {
      console.error('Initial queue processing error:', error);
      this.emit('error', error);
    });
  }

  stopProcessing() {
    this.processing = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
  }

  private async processQueue() {
    if (!this.processing) return;

    // Get items to process (prioritize high priority)
    const items = await this.getItemsToProcess();
    
    for (const item of items) {
      try {
        await this.processItem(item);
      } catch (error) {
        console.error(`Error processing email ${item.id}:`, error);
        await this.handleFailure(item, error);
      }
    }
  }

  private async getItemsToProcess(): Promise<EmailQueueItem[]> {
    // Get pending items
    const pending = await this.storage.getByStatus('pending', 10);
    
    // Get failed items that are ready for retry
    const failed = await this.storage.getByStatus('failed', 5);
    const retryReady = failed.filter(item => this.isReadyForRetry(item));

    // Combine and sort by priority
    const items = [...pending, ...retryReady];
    return items.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const aPriority = priorityOrder[a.message.priority || 'normal'];
      const bPriority = priorityOrder[b.message.priority || 'normal'];
      return aPriority - bPriority;
    });
  }

  private isReadyForRetry(item: EmailQueueItem): boolean {
    if (item.attempts >= item.maxAttempts) return false;
    if (!item.failedAt) return false;

    const delaySeconds = this.retryDelays[Math.min(item.attempts - 1, this.retryDelays.length - 1)];
    const nextRetryTime = new Date(item.failedAt.getTime() + delaySeconds * 1000);
    return new Date() >= nextRetryTime;
  }

  private async processItem(item: EmailQueueItem) {
    // Update status to processing
    await this.storage.update(item.id, {
      status: 'processing',
      processedAt: new Date(),
    });

    this.emit('processing', item);

    // The actual sending will be handled by the EmailService
    // This is just the queue management
  }

  private async handleFailure(item: EmailQueueItem, error: any) {
    const attempts = item.attempts + 1;
    const isFinalAttempt = attempts >= item.maxAttempts;

    await this.storage.update(item.id, {
      status: 'failed',
      attempts,
      failedAt: new Date(),
      error: error?.message || 'Unknown error',
    });

    this.emit('failed', item, error, isFinalAttempt);

    if (isFinalAttempt) {
      this.emit('maxAttemptsReached', item);
    }
  }

  async markAsSent(id: string, messageId?: string) {
    const item = await this.storage.get(id);
    if (!item) throw new Error(`Queue item ${id} not found`);

    await this.storage.update(id, {
      status: 'sent',
      sentAt: new Date(),
      messageId,
    });

    this.emit('sent', item);
  }

  async getStatus(id: string): Promise<EmailQueueItem | null> {
    return this.storage.get(id);
  }

  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    sent: number;
    failed: number;
    total: number;
  }> {
    const [pending, processing, sent, failed] = await Promise.all([
      this.storage.getByStatus('pending').then(items => items.length),
      this.storage.getByStatus('processing').then(items => items.length),
      this.storage.getByStatus('sent').then(items => items.length),
      this.storage.getByStatus('failed').then(items => items.length),
    ]);

    return {
      pending,
      processing,
      sent,
      failed,
      total: pending + processing + sent + failed,
    };
  }

  async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const deleted = await this.storage.cleanup(cutoffDate);
    this.emit('cleanup', deleted);
    
    return deleted;
  }

  async retryFailed(id: string): Promise<void> {
    const item = await this.storage.get(id);
    if (!item || item.status !== 'failed') {
      throw new Error(`Cannot retry item ${id}`);
    }

    await this.storage.update(id, {
      status: 'pending',
      error: undefined,
    });

    this.emit('retry', item);
  }

  async cancel(id: string): Promise<void> {
    const item = await this.storage.get(id);
    if (!item || item.status === 'sent') {
      throw new Error(`Cannot cancel item ${id}`);
    }

    await this.storage.delete(id);
    this.emit('cancelled', item);
  }
}