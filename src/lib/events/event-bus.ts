/**
 * Event Bus for Distributed Event-Driven Architecture
 * Production-ready event system with persistence and replay
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { Redis } from 'ioredis';
import { performance } from 'perf_hooks';
import { webSocketServer } from '@/lib/realtime/websocket-server';
import { sseServer } from '@/lib/realtime/sse-server';

interface DomainEvent {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  tenantId?: string;
  userId?: string;
  version: number;
  timestamp: Date;
  correlationId?: string;
  causationId?: string;
  data: any;
  metadata?: Record<string, any>;
}

interface EventHandler<T = any> {
  eventType: string;
  handler: (event: DomainEvent & { data: T }) => Promise<void>;
  options?: {
    retry?: boolean;
    maxRetries?: number;
    timeout?: number;
    deadLetterQueue?: boolean;
  };
}

interface EventSubscription {
  id: string;
  eventType: string;
  tenantId?: string;
  userId?: string;
  filters?: Record<string, any>;
  handler: EventHandler;
  active: boolean;
  createdAt: Date;
  lastProcessed?: Date;
  processedCount: number;
  errorCount: number;
}

interface EventStream {
  aggregateId: string;
  aggregateType: string;
  tenantId?: string;
  events: DomainEvent[];
  version: number;
  lastModified: Date;
}

interface EventReplay {
  id: string;
  fromTimestamp?: Date;
  toTimestamp?: Date;
  eventTypes?: string[];
  aggregateIds?: string[];
  tenantId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: {
    processed: number;
    total: number;
    errors: number;
  };
  startedAt?: Date;
  completedAt?: Date;
}

export class EventBus extends EventEmitter {
  private static instance: EventBus;
  private redis: Redis;
  private redisSubscriber: Redis;
  private redisPublisher: Redis;
  private handlers: Map<string, EventHandler[]> = new Map();
  private subscriptions: Map<string, EventSubscription> = new Map();
  private eventStore: Map<string, EventStream> = new Map();
  private processingEvents: Set<string> = new Set();

  constructor() {
    super();
    
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_EVENTBUS_DB || '11'),
    });

    this.redisSubscriber = this.redis.duplicate();
    this.redisPublisher = this.redis.duplicate();
    
    this.setupRedisSubscriptions();
  }

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Publish domain event
   */
  async publishEvent(event: Omit<DomainEvent, 'id' | 'timestamp' | 'version'>): Promise<string> {
    // Get current version for aggregate
    const streamKey = `${event.aggregateType}:${event.aggregateId}`;
    const stream = this.eventStore.get(streamKey);
    const version = (stream?.version || 0) + 1;

    const domainEvent: DomainEvent = {
      id: randomUUID(),
      timestamp: new Date(),
      version,
      ...event,
    };

    // Store event
    await this.storeEvent(domainEvent);

    // Update event stream
    if (!stream) {
      this.eventStore.set(streamKey, {
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        tenantId: event.tenantId,
        events: [domainEvent],
        version,
        lastModified: domainEvent.timestamp,
      });
    } else {
      stream.events.push(domainEvent);
      stream.version = version;
      stream.lastModified = domainEvent.timestamp;
    }

    // Publish to Redis for distribution
    await this.redisPublisher.publish('events:published', JSON.stringify({
      event: domainEvent,
      serverId: process.env.SERVER_ID || 'default',
    }));

    // Process locally
    await this.processEvent(domainEvent);

    // Broadcast to real-time clients
    await this.broadcastEvent(domainEvent);

    this.emit('event_published', domainEvent);

    return domainEvent.id;
  }

  /**
   * Subscribe to events
   */
  subscribe<T = any>(
    eventType: string,
    handler: (event: DomainEvent & { data: T }) => Promise<void>,
    options: {
      tenantId?: string;
      userId?: string;
      filters?: Record<string, any>;
      retry?: boolean;
      maxRetries?: number;
      timeout?: number;
    } = {}
  ): string {
    const subscriptionId = randomUUID();
    
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      tenantId: options.tenantId,
      userId: options.userId,
      filters: options.filters,
      handler: {
        eventType,
        handler,
        options: {
          retry: options.retry ?? true,
          maxRetries: options.maxRetries ?? 3,
          timeout: options.timeout ?? 30000,
          deadLetterQueue: true,
        },
      },
      active: true,
      createdAt: new Date(),
      processedCount: 0,
      errorCount: 0,
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Add to handlers map
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(subscription.handler);

    this.emit('subscription_created', subscription);

    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    subscription.active = false;

    // Remove from handlers
    const handlers = this.handlers.get(subscription.eventType);
    if (handlers) {
      const index = handlers.indexOf(subscription.handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
      
      if (handlers.length === 0) {
        this.handlers.delete(subscription.eventType);
      }
    }

    this.subscriptions.delete(subscriptionId);
    this.emit('subscription_removed', subscription);

    return true;
  }

  /**
   * Process event through handlers
   */
  private async processEvent(event: DomainEvent): Promise<void> {
    if (this.processingEvents.has(event.id)) {
      return; // Already processing
    }

    this.processingEvents.add(event.id);

    try {
      const handlers = this.handlers.get(event.type) || [];
      const relevantHandlers = handlers.filter(h => 
        this.matchesFilters(event, h)
      );

      // Process handlers in parallel
      await Promise.allSettled(
        relevantHandlers.map(handler => this.executeHandler(event, handler))
      );
    } finally {
      this.processingEvents.delete(event.id);
    }
  }

  /**
   * Execute event handler with retry logic
   */
  private async executeHandler(event: DomainEvent, handler: EventHandler): Promise<void> {
    const maxRetries = handler.options?.maxRetries || 3;
    const timeout = handler.options?.timeout || 30000;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const startTime = performance.now();

        // Execute with timeout
        await Promise.race([
          handler.handler(event),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Handler timeout')), timeout)
          ),
        ]);

        const duration = performance.now() - startTime;

        this.emit('handler_executed', {
          eventId: event.id,
          eventType: event.type,
          handler: handler.eventType,
          duration,
          attempt,
        });

        return;
      } catch (error) {
        attempt++;
        
        if (attempt <= maxRetries && handler.options?.retry) {
          // Exponential backoff
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          this.emit('handler_retry', {
            eventId: event.id,
            eventType: event.type,
            handler: handler.eventType,
            attempt,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        } else {
          this.emit('handler_failed', {
            eventId: event.id,
            eventType: event.type,
            handler: handler.eventType,
            error: error instanceof Error ? error.message : 'Unknown error',
            attempts: attempt,
          });

          // Send to dead letter queue if enabled
          if (handler.options?.deadLetterQueue) {
            await this.sendToDeadLetterQueue(event, handler, error as Error);
          }

          throw error;
        }
      }
    }
  }

  /**
   * Check if event matches handler filters
   */
  private matchesFilters(event: DomainEvent, handler: EventHandler): boolean {
    // Find subscription for this handler
    const subscription = Array.from(this.subscriptions.values())
      .find(s => s.handler === handler);

    if (!subscription || !subscription.active) {
      return false;
    }

    // Tenant filtering
    if (subscription.tenantId && event.tenantId !== subscription.tenantId) {
      return false;
    }

    // User filtering
    if (subscription.userId && event.userId !== subscription.userId) {
      return false;
    }

    // Custom filters
    if (subscription.filters) {
      for (const [key, value] of Object.entries(subscription.filters)) {
        if (event.data[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Store event in persistent storage
   */
  private async storeEvent(event: DomainEvent): Promise<void> {
    const eventKey = `event:${event.id}`;
    const streamKey = `stream:${event.aggregateType}:${event.aggregateId}`;
    const typeKey = `type:${event.type}`;

    // Store individual event
    await this.redis.setex(eventKey, 30 * 24 * 60 * 60, JSON.stringify(event)); // 30 days

    // Add to stream
    await this.redis.zadd(streamKey, event.version, event.id);

    // Add to type index
    await this.redis.zadd(typeKey, event.timestamp.getTime(), event.id);

    // Add to tenant index if applicable
    if (event.tenantId) {
      const tenantKey = `tenant:${event.tenantId}`;
      await this.redis.zadd(tenantKey, event.timestamp.getTime(), event.id);
    }
  }

  /**
   * Get events from stream
   */
  async getEventStream(
    aggregateType: string,
    aggregateId: string,
    fromVersion?: number,
    toVersion?: number
  ): Promise<DomainEvent[]> {
    const streamKey = `stream:${aggregateType}:${aggregateId}`;
    
    const min = fromVersion || 0;
    const max = toVersion || '+inf';
    
    const eventIds = await this.redis.zrangebyscore(streamKey, min, max);
    
    const events: DomainEvent[] = [];
    for (const eventId of eventIds) {
      const eventData = await this.redis.get(`event:${eventId}`);
      if (eventData) {
        events.push(JSON.parse(eventData));
      }
    }
    
    return events;
  }

  /**
   * Get events by type
   */
  async getEventsByType(
    eventType: string,
    fromTimestamp?: Date,
    toTimestamp?: Date,
    limit = 100
  ): Promise<DomainEvent[]> {
    const typeKey = `type:${eventType}`;
    
    const min = fromTimestamp ? fromTimestamp.getTime() : 0;
    const max = toTimestamp ? toTimestamp.getTime() : '+inf';
    
    const eventIds = await this.redis.zrangebyscore(
      typeKey,
      min,
      max,
      'LIMIT',
      0,
      limit
    );
    
    const events: DomainEvent[] = [];
    for (const eventId of eventIds) {
      const eventData = await this.redis.get(`event:${eventId}`);
      if (eventData) {
        events.push(JSON.parse(eventData));
      }
    }
    
    return events;
  }

  /**
   * Replay events
   */
  async replayEvents(options: {
    fromTimestamp?: Date;
    toTimestamp?: Date;
    eventTypes?: string[];
    aggregateIds?: string[];
    tenantId?: string;
    onEvent?: (event: DomainEvent) => Promise<void>;
  }): Promise<string> {
    const replayId = randomUUID();
    
    const replay: EventReplay = {
      id: replayId,
      fromTimestamp: options.fromTimestamp,
      toTimestamp: options.toTimestamp,
      eventTypes: options.eventTypes,
      aggregateIds: options.aggregateIds,
      tenantId: options.tenantId,
      status: 'pending',
      startedAt: new Date(),
    };

    // Start replay in background
    setImmediate(async () => {
      try {
        replay.status = 'running';
        
        let events: DomainEvent[] = [];
        
        if (options.eventTypes) {
          // Get events by type
          for (const eventType of options.eventTypes) {
            const typeEvents = await this.getEventsByType(
              eventType,
              options.fromTimestamp,
              options.toTimestamp,
              10000
            );
            events.push(...typeEvents);
          }
        } else if (options.tenantId) {
          // Get tenant events
          const tenantKey = `tenant:${options.tenantId}`;
          const min = options.fromTimestamp?.getTime() || 0;
          const max = options.toTimestamp?.getTime() || '+inf';
          
          const eventIds = await this.redis.zrangebyscore(tenantKey, min, max);
          
          for (const eventId of eventIds) {
            const eventData = await this.redis.get(`event:${eventId}`);
            if (eventData) {
              events.push(JSON.parse(eventData));
            }
          }
        }

        // Sort by timestamp
        events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        replay.progress = {
          processed: 0,
          total: events.length,
          errors: 0,
        };

        // Process events
        for (const event of events) {
          try {
            if (options.onEvent) {
              await options.onEvent(event);
            } else {
              await this.processEvent(event);
            }
            
            replay.progress.processed++;
          } catch (error) {
            replay.progress.errors++;
          }
        }

        replay.status = 'completed';
        replay.completedAt = new Date();
        
        this.emit('replay_completed', replay);
      } catch (error) {
        replay.status = 'failed';
        replay.completedAt = new Date();
        
        this.emit('replay_failed', { replay, error });
      }
    });

    return replayId;
  }

  /**
   * Broadcast event to real-time clients
   */
  private async broadcastEvent(event: DomainEvent): Promise<void> {
    // WebSocket broadcast
    if (event.tenantId) {
      await webSocketServer.broadcastToTenant(event.tenantId, {
        type: 'notification',
        data: {
          type: 'domain_event',
          event,
        },
      });

      // SSE broadcast
      await sseServer.broadcastToTenant(event.tenantId, {
        type: 'notification',
        data: {
          type: 'domain_event',
          event,
        },
      });
    }
  }

  /**
   * Send failed event to dead letter queue
   */
  private async sendToDeadLetterQueue(
    event: DomainEvent,
    handler: EventHandler,
    error: Error
  ): Promise<void> {
    const dlqKey = `dlq:events`;
    
    const dlqEntry = {
      eventId: event.id,
      event,
      handler: handler.eventType,
      error: error.message,
      failedAt: new Date(),
    };

    await this.redis.lpush(dlqKey, JSON.stringify(dlqEntry));
    
    // Keep only last 1000 failed events
    await this.redis.ltrim(dlqKey, 0, 999);
  }

  /**
   * Setup Redis subscriptions for multi-server coordination
   */
  private setupRedisSubscriptions(): void {
    this.redisSubscriber.subscribe('events:published');

    this.redisSubscriber.on('message', (channel, message) => {
      if (channel === 'events:published') {
        const data = JSON.parse(message);
        
        // Skip events from this server
        if (data.serverId === (process.env.SERVER_ID || 'default')) {
          return;
        }

        // Process event from other server
        this.processEvent(data.event);
      }
    });
  }

  /**
   * Get event bus statistics
   */
  async getStatistics(): Promise<{
    totalEvents: number;
    totalSubscriptions: number;
    eventsByType: Record<string, number>;
    recentEvents: DomainEvent[];
    processingEvents: number;
  }> {
    // Get total events count (approximate)
    const eventKeys = await this.redis.keys('event:*');
    const totalEvents = eventKeys.length;

    // Get events by type
    const typeKeys = await this.redis.keys('type:*');
    const eventsByType: Record<string, number> = {};
    
    for (const key of typeKeys) {
      const type = key.replace('type:', '');
      const count = await this.redis.zcard(key);
      eventsByType[type] = count;
    }

    // Get recent events (last 10)
    const recentEventIds = await this.redis.keys('event:*');
    const recentEvents: DomainEvent[] = [];
    
    for (const eventId of recentEventIds.slice(-10)) {
      const eventData = await this.redis.get(eventId);
      if (eventData) {
        recentEvents.push(JSON.parse(eventData));
      }
    }

    return {
      totalEvents,
      totalSubscriptions: this.subscriptions.size,
      eventsByType,
      recentEvents: recentEvents.sort((a, b) => 
        b.timestamp.getTime() - a.timestamp.getTime()
      ),
      processingEvents: this.processingEvents.size,
    };
  }

  /**
   * Shutdown event bus gracefully
   */
  async shutdown(): Promise<void> {
    // Wait for processing events to complete
    while (this.processingEvents.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Close Redis connections
    await this.redis.quit();
    await this.redisSubscriber.quit();
    await this.redisPublisher.quit();
  }
}

// Export singleton instance
export const eventBus = EventBus.getInstance();