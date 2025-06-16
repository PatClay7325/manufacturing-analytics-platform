/**
 * In-Memory Event Store Implementation
 * 
 * This class implements the EventStore interface with an in-memory storage mechanism.
 * Suitable for development and testing, or for small deployments with limited event history needs.
 */

import { AbstractBaseService } from '../architecture/BaseService';
import { EventStore } from './interfaces';
import { Event, EventStatus } from './types';

/**
 * In-memory event store implementation
 */
export class InMemoryEventStore extends AbstractBaseService implements EventStore {
  /**
   * Singleton instance
   */
  private static instance: InMemoryEventStore;
  
  /**
   * Map of events by ID
   */
  private events: Map<string, Event> = new Map();
  
  /**
   * Map of event IDs by type
   */
  private eventsByType: Map<string, Set<string>> = new Map();
  
  /**
   * Map of event IDs by correlation ID
   */
  private eventsByCorrelation: Map<string, Set<string>> = new Map();
  
  /**
   * Maximum number of events to store (per type)
   */
  private maxEventsPerType: number = 1000;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super('InMemoryEventStore', '1.0.0');
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): InMemoryEventStore {
    if (!InMemoryEventStore.instance) {
      InMemoryEventStore.instance = new InMemoryEventStore();
    }
    return InMemoryEventStore.instance;
  }
  
  /**
   * Set the maximum number of events to store per type
   * @param max Maximum number of events
   */
  public setMaxEventsPerType(max: number): void {
    this.maxEventsPerType = max;
  }
  
  /**
   * Initialize the event store
   */
  protected async doInitialize(): Promise<void> {
    this.events.clear();
    this.eventsByType.clear();
    this.eventsByCorrelation.clear();
    console.log('In-memory event store initialized');
  }
  
  /**
   * Start the event store
   */
  protected async doStart(): Promise<void> {
    console.log('In-memory event store started');
  }
  
  /**
   * Stop the event store
   */
  protected async doStop(): Promise<void> {
    console.log('In-memory event store stopped');
  }
  
  /**
   * Store an event
   * @param event Event to store
   */
  public async storeEvent<T>(event: Event<T>): Promise<void> {
    // Store event by ID
    this.events.set(event.id, event as Event);
    
    // Index by event type
    if (!this.eventsByType.has(event.type)) {
      this.eventsByType.set(event.type, new Set());
    }
    this.eventsByType.get(event.type)!.add(event.id);
    
    // Index by correlation ID if available
    if (event.correlationId) {
      if (!this.eventsByCorrelation.has(event.correlationId)) {
        this.eventsByCorrelation.set(event.correlationId, new Set());
      }
      this.eventsByCorrelation.get(event.correlationId)!.add(event.id);
    }
    
    // Enforce storage limits
    this.enforceStorageLimits(event.type);
  }
  
  /**
   * Retrieve an event by ID
   * @param eventId Event ID
   */
  public async getEvent<T>(eventId: string): Promise<Event<T> | null> {
    const event = this.events.get(eventId) as Event<T> | undefined;
    return event || null;
  }
  
  /**
   * Retrieve events by type
   * @param eventType Event type
   * @param options Query options
   */
  public async getEventsByType<T>(
    eventType: string, 
    options: { 
      limit?: number; 
      offset?: number; 
      startDate?: Date; 
      endDate?: Date;
    } = {}
  ): Promise<Event<T>[]> {
    const eventIds = this.eventsByType.get(eventType);
    if (!eventIds || eventIds.size === 0) {
      return [];
    }
    
    // Get all events of this type
    let events = Array.from(eventIds)
      .map(id => this.events.get(id))
      .filter((event): event is Event => !!event) as Event<T>[];
    
    // Filter by date range if specified
    if (options.startDate || options.endDate) {
      events = events.filter(event => {
        if (options.startDate && event.timestamp < options.startDate) {
          return false;
        }
        if (options.endDate && event.timestamp > options.endDate) {
          return false;
        }
        return true;
      });
    }
    
    // Sort by timestamp descending (newest first)
    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply pagination if specified
    if (options.offset !== undefined || options.limit !== undefined) {
      const offset = options.offset || 0;
      const limit = options.limit || events.length;
      events = events.slice(offset, offset + limit);
    }
    
    return events;
  }
  
  /**
   * Retrieve events by correlation ID
   * @param correlationId Correlation ID
   */
  public async getEventsByCorrelationId<T>(correlationId: string): Promise<Event<T>[]> {
    const eventIds = this.eventsByCorrelation.get(correlationId);
    if (!eventIds || eventIds.size === 0) {
      return [];
    }
    
    // Get all events with this correlation ID
    const events = Array.from(eventIds)
      .map(id => this.events.get(id))
      .filter((event): event is Event => !!event) as Event<T>[];
    
    // Sort by timestamp ascending (oldest first)
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    return events;
  }
  
  /**
   * Update event status
   * @param eventId Event ID
   * @param status New status
   */
  public async updateEventStatus(eventId: string, status: string): Promise<void> {
    const event = this.events.get(eventId);
    if (event) {
      event.status = status as EventStatus;
    }
  }
  
  /**
   * Enforce storage limits
   * @param eventType Event type
   */
  private enforceStorageLimits(eventType: string): void {
    const eventIds = this.eventsByType.get(eventType);
    if (!eventIds || eventIds.size <= this.maxEventsPerType) {
      return;
    }
    
    // Get all events of this type
    const events = Array.from(eventIds)
      .map(id => ({ id, event: this.events.get(id)! }))
      .filter(item => !!item.event);
    
    // Sort by timestamp ascending (oldest first)
    events.sort((a, b) => a.event.timestamp.getTime() - b.event.timestamp.getTime());
    
    // Remove oldest events beyond the limit
    const eventsToRemove = events.slice(0, events.length - this.maxEventsPerType);
    
    for (const { id, event } of eventsToRemove) {
      // Remove from main store
      this.events.delete(id);
      
      // Remove from type index
      eventIds.delete(id);
      
      // Remove from correlation index if applicable
      if (event.correlationId && this.eventsByCorrelation.has(event.correlationId)) {
        this.eventsByCorrelation.get(event.correlationId)!.delete(id);
        // Remove correlation entry if empty
        if (this.eventsByCorrelation.get(event.correlationId)!.size === 0) {
          this.eventsByCorrelation.delete(event.correlationId);
        }
      }
    }
  }
  
  /**
   * Get additional health details
   */
  protected async getHealthDetails(): Promise<Record<string, unknown>> {
    const baseDetails = await super.getHealthDetails();
    
    // Count events by type
    const eventCountByType: Record<string, number> = {};
    for (const [type, eventIds] of this.eventsByType.entries()) {
      eventCountByType[type] = eventIds.size;
    }
    
    return {
      ...baseDetails,
      totalEvents: this.events.size,
      eventTypes: this.eventsByType.size,
      correlationIds: this.eventsByCorrelation.size,
      eventCountByType,
    };
  }
}