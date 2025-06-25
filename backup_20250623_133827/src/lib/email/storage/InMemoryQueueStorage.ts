import { QueueStorage } from '../EmailQueue';
import { EmailQueueItem } from '../types';

export class InMemoryQueueStorage implements QueueStorage {
  private items: Map<string, EmailQueueItem> = new Map();

  async add(item: EmailQueueItem): Promise<void> {
    this.items.set(item.id, item);
  }

  async get(id: string): Promise<EmailQueueItem | null> {
    return this.items.get(id) || null;
  }

  async getNext(limit: number = 10): Promise<EmailQueueItem[]> {
    const items = Array.from(this.items.values())
      .filter(item => item.status === 'pending')
      .sort((a, b) => {
        // Sort by priority then by creation date
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const aPriority = priorityOrder[a.message.priority || 'normal'];
        const bPriority = priorityOrder[b.message.priority || 'normal'];
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .slice(0, limit);

    return items;
  }

  async update(id: string, updates: Partial<EmailQueueItem>): Promise<void> {
    const item = this.items.get(id);
    if (!item) throw new Error(`Queue item ${id} not found`);

    const updated = { ...item, ...updates };
    this.items.set(id, updated);
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }

  async getByStatus(status: EmailQueueItem['status'], limit?: number): Promise<EmailQueueItem[]> {
    const items = Array.from(this.items.values())
      .filter(item => item.status === status);

    return limit ? items.slice(0, limit) : items;
  }

  async cleanup(olderThan: Date): Promise<number> {
    let deleted = 0;
    
    for (const [id, item] of this.items.entries()) {
      if (item.status === 'sent' && item.sentAt && item.sentAt < olderThan) {
        this.items.delete(id);
        deleted++;
      }
    }

    return deleted;
  }

  // Additional utility methods
  async clear(): Promise<void> {
    this.items.clear();
  }

  async size(): Promise<number> {
    return this.items.size;
  }
}