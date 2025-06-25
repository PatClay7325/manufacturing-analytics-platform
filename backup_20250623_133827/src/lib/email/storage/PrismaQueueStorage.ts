import { QueueStorage } from '../EmailQueue';
import { EmailQueueItem } from '../types';
import { prisma } from '@/lib/prisma';

export class PrismaQueueStorage implements QueueStorage {
  async add(item: EmailQueueItem): Promise<void> {
    await prisma.emailQueue.create({
      data: {
        id: item.id,
        message: item.message as any, // Store as JSON
        status: item.status,
        attempts: item.attempts,
        maxAttempts: item.maxAttempts,
        createdAt: item.createdAt,
        processedAt: item.processedAt,
        sentAt: item.sentAt,
        failedAt: item.failedAt,
        error: item.error,
        messageId: item.messageId,
        metadata: item.metadata as any,
      },
    });
  }

  async get(id: string): Promise<EmailQueueItem | null> {
    const item = await prisma.emailQueue.findUnique({
      where: { id },
    });

    if (!item) return null;

    return {
      id: item.id,
      message: item.message as any,
      status: item.status as EmailQueueItem['status'],
      attempts: item.attempts,
      maxAttempts: item.maxAttempts,
      createdAt: item.createdAt,
      processedAt: item.processedAt || undefined,
      sentAt: item.sentAt || undefined,
      failedAt: item.failedAt || undefined,
      error: item.error || undefined,
      messageId: item.messageId || undefined,
      metadata: item.metadata as any,
    };
  }

  async getNext(limit: number = 10): Promise<EmailQueueItem[]> {
    const items = await prisma.emailQueue.findMany({
      where: {
        status: 'pending',
      },
      orderBy: [
        {
          message: {
            path: ['priority'],
            sort: 'asc',
          },
        },
        {
          createdAt: 'asc',
        },
      ],
      take: limit,
    });

    return items.map(item => ({
      id: item.id,
      message: item.message as any,
      status: item.status as EmailQueueItem['status'],
      attempts: item.attempts,
      maxAttempts: item.maxAttempts,
      createdAt: item.createdAt,
      processedAt: item.processedAt || undefined,
      sentAt: item.sentAt || undefined,
      failedAt: item.failedAt || undefined,
      error: item.error || undefined,
      messageId: item.messageId || undefined,
      metadata: item.metadata as any,
    }));
  }

  async update(id: string, updates: Partial<EmailQueueItem>): Promise<void> {
    await prisma.emailQueue.update({
      where: { id },
      data: {
        message: updates.message as any,
        status: updates.status,
        attempts: updates.attempts,
        maxAttempts: updates.maxAttempts,
        processedAt: updates.processedAt,
        sentAt: updates.sentAt,
        failedAt: updates.failedAt,
        error: updates.error,
        messageId: updates.messageId,
        metadata: updates.metadata as any,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.emailQueue.delete({
      where: { id },
    });
  }

  async getByStatus(status: EmailQueueItem['status'], limit?: number): Promise<EmailQueueItem[]> {
    const items = await prisma.emailQueue.findMany({
      where: { status },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return items.map(item => ({
      id: item.id,
      message: item.message as any,
      status: item.status as EmailQueueItem['status'],
      attempts: item.attempts,
      maxAttempts: item.maxAttempts,
      createdAt: item.createdAt,
      processedAt: item.processedAt || undefined,
      sentAt: item.sentAt || undefined,
      failedAt: item.failedAt || undefined,
      error: item.error || undefined,
      messageId: item.messageId || undefined,
      metadata: item.metadata as any,
    }));
  }

  async cleanup(olderThan: Date): Promise<number> {
    const result = await prisma.emailQueue.deleteMany({
      where: {
        status: 'sent',
        sentAt: {
          lt: olderThan,
        },
      },
    });

    return result.count;
  }
}