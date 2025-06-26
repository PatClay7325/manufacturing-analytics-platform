import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { databaseConfig } from '@/config/database.config';

/**
 * Event Types for Manufacturing Domain
 */
export enum EventType {
  // Production Events
  PRODUCTION_STARTED = 'production.started',
  PRODUCTION_COMPLETED = 'production.completed',
  PRODUCTION_UPDATED = 'production.updated',
  
  // Equipment Events
  EQUIPMENT_CREATED = 'equipment.created',
  EQUIPMENT_UPDATED = 'equipment.updated',
  EQUIPMENT_DEACTIVATED = 'equipment.deactivated',
  EQUIPMENT_STATE_CHANGED = 'equipment.state_changed',
  
  // Downtime Events
  DOWNTIME_STARTED = 'downtime.started',
  DOWNTIME_ENDED = 'downtime.ended',
  
  // OEE Events
  OEE_CALCULATED = 'oee.calculated',
  OEE_THRESHOLD_BREACHED = 'oee.threshold_breached',
  
  // Quality Events
  QUALITY_ISSUE_DETECTED = 'quality.issue_detected',
  SCRAP_RECORDED = 'scrap.recorded',
  
  // Maintenance Events
  MAINTENANCE_SCHEDULED = 'maintenance.scheduled',
  MAINTENANCE_STARTED = 'maintenance.started',
  MAINTENANCE_COMPLETED = 'maintenance.completed',
}

/**
 * Base Event Interface
 */
export interface DomainEvent<T = any> {
  eventId: string;
  eventType: EventType;
  aggregateId: string;
  aggregateType: string;
  eventData: T;
  eventMetadata: {
    userId?: string;
    correlationId?: string;
    causationId?: string;
    timestamp: Date;
    version: number;
  };
}

/**
 * Event Sourcing Service
 * Replaces synchronous database triggers with async event processing
 */
export class EventSourcingService {
  private prisma: PrismaClient;
  private redis: Redis;
  private eventEmitter: EventEmitter;
  private subscribers: Map<EventType, Set<(event: DomainEvent) => Promise<void>>>;
  
  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.redis = new Redis({
      host: databaseConfig.redis.host,
      port: databaseConfig.redis.port,
      password: databaseConfig.redis.password,
      db: databaseConfig.redis.db,
    });
    this.eventEmitter = new EventEmitter();
    this.subscribers = new Map();
    
    // Set max listeners to prevent warnings
    this.eventEmitter.setMaxListeners(100);
    
    // Initialize event listeners
    this.initializeEventListeners();
  }
  
  /**
   * Publish an event
   */
  async publish<T = any>(event: Omit<DomainEvent<T>, 'eventId'>): Promise<void> {
    const fullEvent: DomainEvent<T> = {
      ...event,
      eventId: this.generateEventId(),
    };
    
    try {
      // Store event in event store (audit schema)
      await this.storeEvent(fullEvent);
      
      // Publish to Redis for distributed processing
      await this.publishToRedis(fullEvent);
      
      // Emit locally for immediate processing
      this.eventEmitter.emit(event.eventType, fullEvent);
      
      // Process subscribers
      await this.processSubscribers(fullEvent);
    } catch (error) {
      console.error('[EventSourcing] Failed to publish event:', error);
      throw error;
    }
  }
  
  /**
   * Subscribe to an event type
   */
  subscribe(eventType: EventType, handler: (event: DomainEvent) => Promise<void>): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    
    this.subscribers.get(eventType)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.get(eventType)?.delete(handler);
    };
  }
  
  /**
   * Initialize built-in event listeners for audit trail
   */
  private initializeEventListeners() {
    // Equipment audit trail
    this.subscribe(EventType.EQUIPMENT_CREATED, async (event) => {
      await this.createAuditLog({
        action: 'INSERT',
        tableName: 'dim_equipment',
        recordId: event.aggregateId,
        afterData: event.eventData,
        userId: event.eventMetadata.userId,
      });
    });
    
    this.subscribe(EventType.EQUIPMENT_UPDATED, async (event) => {
      await this.createAuditLog({
        action: 'UPDATE',
        tableName: 'dim_equipment',
        recordId: event.aggregateId,
        beforeData: event.eventData.before,
        afterData: event.eventData.after,
        userId: event.eventMetadata.userId,
      });
    });
    
    // Production audit trail
    this.subscribe(EventType.PRODUCTION_STARTED, async (event) => {
      await this.createAuditLog({
        action: 'INSERT',
        tableName: 'fact_production',
        recordId: event.aggregateId,
        afterData: event.eventData,
        userId: event.eventMetadata.userId,
      });
    });
    
    // OEE threshold monitoring
    this.subscribe(EventType.OEE_THRESHOLD_BREACHED, async (event) => {
      // Could trigger alerts, notifications, etc.
      console.warn('[OEE Alert]', event.eventData);
    });
  }
  
  /**
   * Store event in event store
   */
  private async storeEvent(event: DomainEvent): Promise<void> {
    await this.prisma.auditEvent.create({
      data: {
        eventType: event.eventType,
        aggregateId: event.aggregateId,
        aggregateType: event.aggregateType,
        eventData: event.eventData,
        eventMetadata: event.eventMetadata,
        userId: event.eventMetadata.userId,
        correlationId: event.eventMetadata.correlationId,
        causationId: event.eventMetadata.causationId,
      },
    });
  }
  
  /**
   * Publish event to Redis for distributed processing
   */
  private async publishToRedis(event: DomainEvent): Promise<void> {
    const channel = `events:${event.eventType}`;
    await this.redis.publish(channel, JSON.stringify(event));
  }
  
  /**
   * Process subscribers for an event
   */
  private async processSubscribers(event: DomainEvent): Promise<void> {
    const subscribers = this.subscribers.get(event.eventType);
    if (!subscribers || subscribers.size === 0) return;
    
    // Process all subscribers in parallel
    const promises = Array.from(subscribers).map(handler => 
      handler(event).catch(error => {
        console.error(`[EventSourcing] Subscriber error for ${event.eventType}:`, error);
      })
    );
    
    await Promise.all(promises);
  }
  
  /**
   * Create audit log entry (replaces database trigger)
   */
  private async createAuditLog(data: {
    action: string;
    tableName: string;
    recordId: string;
    beforeData?: any;
    afterData?: any;
    userId?: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        username: data.userId,
        action: data.action,
        tableName: data.tableName,
        recordId: data.recordId,
        beforeData: data.beforeData,
        afterData: data.afterData,
      },
    });
  }
  
  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Replay events for an aggregate
   */
  async replayEvents(aggregateType: string, aggregateId: string): Promise<DomainEvent[]> {
    const events = await this.prisma.auditEvent.findMany({
      where: {
        aggregateType,
        aggregateId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    
    return events.map(e => ({
      eventId: e.id.toString(),
      eventType: e.eventType as EventType,
      aggregateId: e.aggregateId,
      aggregateType: e.aggregateType,
      eventData: e.eventData,
      eventMetadata: e.eventMetadata as any,
    }));
  }
  
  /**
   * Get event statistics
   */
  async getEventStats(timeRange: { start: Date; end: Date }) {
    return this.prisma.$queryRaw`
      SELECT 
        event_type,
        COUNT(*)::int as event_count,
        COUNT(DISTINCT aggregate_id)::int as unique_aggregates,
        MIN(created_at) as first_event,
        MAX(created_at) as last_event
      FROM audit.audit_event
      WHERE created_at >= ${timeRange.start}
        AND created_at <= ${timeRange.end}
      GROUP BY event_type
      ORDER BY event_count DESC
    `;
  }
  
  /**
   * Cleanup and close connections
   */
  async cleanup() {
    await this.redis.quit();
    this.eventEmitter.removeAllListeners();
    this.subscribers.clear();
  }
}

/**
 * Event Publisher Mixin for Repositories
 * Allows repositories to easily publish events
 */
export class EventPublisherMixin {
  constructor(
    private eventService: EventSourcingService,
    private aggregateType: string
  ) {}
  
  protected async publishEvent<T = any>(
    eventType: EventType,
    aggregateId: string,
    eventData: T,
    metadata?: Partial<DomainEvent['eventMetadata']>
  ): Promise<void> {
    await this.eventService.publish({
      eventType,
      aggregateId,
      aggregateType: this.aggregateType,
      eventData,
      eventMetadata: {
        timestamp: new Date(),
        version: 1,
        ...metadata,
      },
    });
  }
}