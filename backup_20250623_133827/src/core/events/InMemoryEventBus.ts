/**
 * In-Memory Event Bus Implementation
 * 
 * This class implements the EventBus interface with an in-memory pub/sub mechanism.
 * Suitable for development and testing, or for production use in small deployments.
 * Supports multi-tenancy with tenant isolation.
 */

import { v4 as uuidv4 } from 'uuid';
import { AbstractBaseService } from './architecture/BaseService';
import { EventBus, EventStore } from './interfaces';
import { 
  Event, 
  EventHandler, 
  SubscriptionOptions, 
  PublishOptions, 
  EventAck,
  EventStatus,
  EventPriority,
  TenantEventOptions 
} from './types';
import { TenantContext } from './multi-tenancy/interfaces/TenantContext';

/**
 * Subscription information
 */
interface Subscription<T = unknown> {
  id: string;
  eventType: string;
  handler: EventHandler<T>;
  options: SubscriptionOptions;
  tenantId?: string;
}

/**
 * In-memory event bus implementation with tenant isolation
 */
export class InMemoryEventBus extends AbstractBaseService implements EventBus {
  /**
   * Singleton instance
   */
  private static instance: InMemoryEventBus;
  
  /**
   * Map of subscriptions by event type
   */
  private subscriptions: Map<string, Map<string, Subscription>> = new Map();
  
  /**
   * Map of tenant-specific subscriptions by tenant ID, event type, and subscription ID
   */
  private tenantSubscriptions: Map<string, Map<string, Map<string, Subscription>>> = new Map();
  
  /**
   * Optional event store for persisting events
   */
  private eventStore: EventStore | null = null;
  
  /**
   * Event processing queue for delayed events
   */
  private delayedEvents: Map<string, NodeJS.Timeout> = new Map();
  
  /**
   * Tenant context for tenant-aware operations
   */
  private tenantContext?: TenantContext;
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super('InMemoryEventBus', '1.0.0');
  }
  
  /**
   * Get the singleton instance
   * @param tenantContext Optional tenant context
   */
  public static getInstance(tenantContext?: TenantContext): InMemoryEventBus {
    if (!InMemoryEventBus.instance) {
      InMemoryEventBus.instance = new InMemoryEventBus();
    }
    
    if (tenantContext) {
      InMemoryEventBus.instance.setTenantContext(tenantContext);
    }
    
    return InMemoryEventBus.instance;
  }
  
  /**
   * Set the tenant context
   * @param tenantContext Tenant context
   */
  public setTenantContext(tenantContext: TenantContext): void {
    this.tenantContext = tenantContext;
  }
  
  /**
   * Set the event store for persisting events
   * @param store Event store implementation
   */
  public setEventStore(store: EventStore): void {
    this.eventStore = store;
  }
  
  /**
   * Initialize the event bus
   */
  protected async doInitialize(): Promise<void> {
    this.subscriptions.clear();
    this.delayedEvents.clear();
    console.log('In-memory event bus initialized');
  }
  
  /**
   * Start the event bus
   */
  protected async doStart(): Promise<void> {
    console.log('In-memory event bus started');
  }
  
  /**
   * Stop the event bus
   */
  protected async doStop(): Promise<void> {
    // Clear all delayed events
    for (const [eventId, timeout] of this.delayedEvents.entries()) {
      clearTimeout(timeout);
      console.log(`Cleared delayed event: ${eventId}`);
    }
    this.delayedEvents.clear();
    
    console.log('In-memory event bus stopped');
  }
  
  /**
   * Publish an event to the event bus
   * @param event Event to publish
   * @param options Publication options
   */
  public async publish<T>(
    event: Event<T>, 
    options?: PublishOptions & TenantEventOptions
  ): Promise<void> {
    // Ensure event has an ID
    if (!event.id) {
      event.id = uuidv4();
    }
    
    // Set event status
    event.status = EventStatus.CREATED;
    
    // Apply options
    if (options) {
      if (options.priority) {
        event.priority = options.priority;
      }
      if (options.correlationId) {
        event.correlationId = options.correlationId;
      }
      if (options.metadata) {
        event.metadata = { ...event.metadata, ...options.metadata };
      }
    }
    
    // Set default priority if not specified
    if (!event.priority) {
      event.priority = EventPriority.NORMAL;
    }
    
    // Add tenant information from options or current context
    if (options?.tenantId) {
      // Use tenant ID from options
      event.tenantId = options.tenantId;
    } else if (this.tenantContext?.getCurrentTenantId()) {
      // Use tenant ID from current context
      event.tenantId = this.tenantContext.getCurrentTenantId();
    }
    
    // Store event if event store is available
    if (this.eventStore) {
      await this.eventStore.storeEvent(event);
    }
    
    // Handle delayed event
    if (options?.delay && options.delay > 0) {
      this.scheduleDelayedEvent(event, options.delay);
      return;
    }
    
    // Mark as published
    event.status = EventStatus.PUBLISHED;
    if (this.eventStore) {
      await this.eventStore.updateEventStatus(event.id, EventStatus.PUBLISHED);
    }
    
    // Dispatch to subscribers with tenant isolation
    this.dispatchEvent(event);
  }
  
  /**
   * Subscribe to events of a specific type
   * @param eventType Event type to subscribe to
   * @param handler Event handler function
   * @param options Subscription options
   */
  public async subscribe<T>(
    eventType: string, 
    handler: EventHandler<T>, 
    options: SubscriptionOptions & TenantEventOptions = {}
  ): Promise<string> {
    // Generate subscription ID if not provided
    const subscriptionId = options.id || uuidv4();
    
    // Create subscription
    const subscription: Subscription<T> = {
      id: subscriptionId,
      eventType,
      handler,
      options: {
        ...options,
        autoAck: options.autoAck !== false, // Default to true
      },
    };
    
    // Determine tenant context for the subscription
    if (options.tenantId) {
      // Use tenant ID from options
      subscription.tenantId = options.tenantId;
      
      // Initialize tenant subscription maps if needed
      if (!this.tenantSubscriptions.has(options.tenantId)) {
        this.tenantSubscriptions.set(options.tenantId, new Map());
      }
      
      const tenantEventMap = this.tenantSubscriptions.get(options.tenantId)!;
      if (!tenantEventMap.has(eventType)) {
        tenantEventMap.set(eventType, new Map());
      }
      
      // Add to tenant-specific subscriptions
      tenantEventMap.get(eventType)!.set(subscriptionId, subscription);
      
      console.log(`Tenant-specific subscription created: ${subscriptionId} for event type: ${eventType} (tenant: ${options.tenantId})`);
    } else if (options.isTenantSpecific && this.tenantContext?.getCurrentTenantId()) {
      // Use current tenant context if available
      const tenantId = this.tenantContext.getCurrentTenantId()!;
      subscription.tenantId = tenantId;
      
      // Initialize tenant subscription maps if needed
      if (!this.tenantSubscriptions.has(tenantId)) {
        this.tenantSubscriptions.set(tenantId, new Map());
      }
      
      const tenantEventMap = this.tenantSubscriptions.get(tenantId)!;
      if (!tenantEventMap.has(eventType)) {
        tenantEventMap.set(eventType, new Map());
      }
      
      // Add to tenant-specific subscriptions
      tenantEventMap.get(eventType)!.set(subscriptionId, subscription);
      
      console.log(`Tenant-specific subscription created: ${subscriptionId} for event type: ${eventType} (tenant: ${tenantId})`);
    } else {
      // Global subscription
      // Add to subscriptions map
      if (!this.subscriptions.has(eventType)) {
        this.subscriptions.set(eventType, new Map());
      }
      this.subscriptions.get(eventType)!.set(subscriptionId, subscription);
      
      console.log(`Subscription created: ${subscriptionId} for event type: ${eventType}`);
    }
    
    return subscriptionId;
  }
  
  /**
   * Subscribe to multiple event types
   * @param eventTypes Event types to subscribe to
   * @param handler Event handler function
   * @param options Subscription options
   */
  public async subscribeMany<T>(
    eventTypes: string[], 
    handler: EventHandler<T>, 
    options?: SubscriptionOptions
  ): Promise<string[]> {
    const subscriptionIds: string[] = [];
    
    for (const eventType of eventTypes) {
      const id = await this.subscribe(eventType, handler, options);
      subscriptionIds.push(id);
    }
    
    return subscriptionIds;
  }
  
  /**
   * Unsubscribe from events
   * @param subscriptionId Subscription ID returned from subscribe method
   * @param tenantId Optional tenant ID for tenant-specific subscriptions
   */
  public async unsubscribe(subscriptionId: string, tenantId?: string): Promise<void> {
    // If tenantId is provided, check tenant-specific subscriptions
    if (tenantId && this.tenantSubscriptions.has(tenantId)) {
      const tenantEventMap = this.tenantSubscriptions.get(tenantId)!;
      
      for (const [eventType, subscriptions] of tenantEventMap.entries()) {
        if (subscriptions.has(subscriptionId)) {
          subscriptions.delete(subscriptionId);
          console.log(`Unsubscribed tenant-specific: ${subscriptionId} from event type: ${eventType} (tenant: ${tenantId})`);
          
          // Remove event type entry if no more subscriptions
          if (subscriptions.size === 0) {
            tenantEventMap.delete(eventType);
          }
          
          // Remove tenant entry if no more event types
          if (tenantEventMap.size === 0) {
            this.tenantSubscriptions.delete(tenantId);
          }
          
          return;
        }
      }
    } 
    // If no tenantId is provided but we have a tenant context, check current tenant
    else if (!tenantId && this.tenantContext?.getCurrentTenantId()) {
      const currentTenantId = this.tenantContext.getCurrentTenantId()!;
      
      if (this.tenantSubscriptions.has(currentTenantId)) {
        const tenantEventMap = this.tenantSubscriptions.get(currentTenantId)!;
        
        for (const [eventType, subscriptions] of tenantEventMap.entries()) {
          if (subscriptions.has(subscriptionId)) {
            subscriptions.delete(subscriptionId);
            console.log(`Unsubscribed tenant-specific: ${subscriptionId} from event type: ${eventType} (tenant: ${currentTenantId})`);
            
            // Remove event type entry if no more subscriptions
            if (subscriptions.size === 0) {
              tenantEventMap.delete(eventType);
            }
            
            // Remove tenant entry if no more event types
            if (tenantEventMap.size === 0) {
              this.tenantSubscriptions.delete(currentTenantId);
            }
            
            return;
          }
        }
      }
    }
    
    // Check global subscriptions
    for (const [eventType, subscriptions] of this.subscriptions.entries()) {
      if (subscriptions.has(subscriptionId)) {
        subscriptions.delete(subscriptionId);
        console.log(`Unsubscribed: ${subscriptionId} from event type: ${eventType}`);
        
        // Remove event type entry if no more subscriptions
        if (subscriptions.size === 0) {
          this.subscriptions.delete(eventType);
        }
        
        return;
      }
    }
    
    console.warn(`Subscription not found: ${subscriptionId}`);
  }
  
  /**
   * Unsubscribe from multiple subscriptions
   * @param subscriptionIds Subscription IDs to unsubscribe
   */
  public async unsubscribeMany(subscriptionIds: string[]): Promise<void> {
    for (const id of subscriptionIds) {
      await this.unsubscribe(id);
    }
  }
  
  /**
   * Acknowledge event processing
   * @param ack Event acknowledgment
   */
  public async acknowledge(ack: EventAck): Promise<void> {
    if (!this.eventStore) {
      return;
    }
    
    try {
      // Update event status based on acknowledgment
      const status = ack.success ? EventStatus.PROCESSED : EventStatus.FAILED;
      await this.eventStore.updateEventStatus(ack.eventId, status);
    } catch (error) {
      console.error(`Error acknowledging event ${ack.eventId}:`, error);
    }
  }
  
  /**
   * Schedule a delayed event
   * @param event Event to schedule
   * @param delay Delay in milliseconds
   */
  private scheduleDelayedEvent<T>(event: Event<T>, delay: number): void {
    // Create timeout for delayed publishing
    const timeout = setTimeout(() => {
      this.delayedEvents.delete(event.id);
      
      // Mark as published
      event.status = EventStatus.PUBLISHED;
      if (this.eventStore) {
        this.eventStore.updateEventStatus(event.id, EventStatus.PUBLISHED)
          .catch(error => console.error(`Error updating event status: ${error}`));
      }
      
      // Dispatch to subscribers
      this.dispatchEvent(event);
    }, delay);
    
    // Store timeout reference
    this.delayedEvents.set(event.id, timeout);
    console.log(`Scheduled delayed event: ${event.id}, type: ${event.type}, delay: ${delay}ms`);
  }
  
  /**
   * Dispatch an event to subscribers
   * @param event Event to dispatch
   */
  private dispatchEvent<T>(event: Event<T>): void {
    const subscribers: Subscription[] = [];
    
    // If event has a tenant ID, dispatch to tenant-specific subscribers first
    if (event.tenantId && this.tenantSubscriptions.has(event.tenantId)) {
      const tenantEventMap = this.tenantSubscriptions.get(event.tenantId)!;
      const tenantTypeSubscriptions = tenantEventMap.get(event.type);
      
      if (tenantTypeSubscriptions && tenantTypeSubscriptions.size > 0) {
        subscribers.push(...tenantTypeSubscriptions.values());
      }
    }
    
    // Also dispatch to global subscribers
    const globalTypeSubscriptions = this.subscriptions.get(event.type);
    if (globalTypeSubscriptions && globalTypeSubscriptions.size > 0) {
      subscribers.push(...globalTypeSubscriptions.values());
    }
    
    if (subscribers.length === 0) {
      console.log(`No subscribers for event type: ${event.type}${event.tenantId ? ` (tenant: ${event.tenantId})` : ''}`);
      return;
    }
    
    console.log(`Dispatching event: ${event.id}, type: ${event.type}${event.tenantId ? ` (tenant: ${event.tenantId})` : ''} to ${subscribers.length} subscribers`);
    
    // Notify all subscribers
    for (const subscription of subscribers) {
      this.notifySubscriber(event, subscription);
    }
  }
  
  /**
   * Notify a subscriber of an event
   * @param event Event to notify about
   * @param subscription Subscription to notify
   */
  private async notifySubscriber<T>(
    event: Event<T>, 
    subscription: Subscription
  ): Promise<void> {
    // Check priority filter
    if (subscription.options.priority) {
      const priorities = Array.isArray(subscription.options.priority)
        ? subscription.options.priority
        : [subscription.options.priority];
      
      if (event.priority && !priorities.includes(event.priority)) {
        return;
      }
    }
    
    // Check custom filter
    if (subscription.options.filter && !subscription.options.filter(event)) {
      return;
    }
    
    try {
      // Mark as delivered
      event.status = EventStatus.DELIVERED;
      if (this.eventStore) {
        await this.eventStore.updateEventStatus(event.id, EventStatus.DELIVERED);
      }
      
      // Call handler
      await subscription.handler(event);
      
      // Auto-acknowledge if enabled
      if (subscription.options.autoAck) {
        await this.acknowledge({
          eventId: event.id,
          success: true,
        });
      }
    } catch (error) {
      console.error(`Error handling event ${event.id} in subscription ${subscription.id}:`, error);
      
      // Auto-acknowledge failure if enabled
      if (subscription.options.autoAck) {
        await this.acknowledge({
          eventId: event.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}