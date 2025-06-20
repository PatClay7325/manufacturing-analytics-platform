/**
 * Event Consumer Implementation
 * 
 * This class implements the EventConsumer interface and provides
 * a convenient way for services to consume events.
 */

import { AbstractBaseService } from './architecture/BaseService';
import { EventConsumer } from './interfaces';
import { Event, EventHandler, SubscriptionOptions } from './types';
import { InMemoryEventBus } from './InMemoryEventBus';

/**
 * Base event consumer implementation
 */
export class BaseEventConsumer extends AbstractBaseService implements EventConsumer {
  /**
   * Event bus instance
   */
  protected readonly eventBus: InMemoryEventBus;
  
  /**
   * Map of subscription IDs by handler ID
   */
  protected readonly subscriptions: Map<string, string[]> = new Map();
  
  /**
   * Flag indicating if consumer is active
   */
  protected isActive: boolean = false;
  
  /**
   * Create a new event consumer
   * @param name Consumer name
   * @param eventBus Event bus to subscribe to (defaults to singleton instance)
   */
  constructor(name: string, eventBus?: InMemoryEventBus) {
    super(name, '1.0.0');
    this.eventBus = eventBus || InMemoryEventBus.getInstance();
  }
  
  /**
   * Initialize the consumer
   */
  protected async doInitialize(): Promise<void> {
    this.subscriptions.clear();
    this.isActive = false;
    console.log(`Event consumer initialized: ${this.name}`);
  }
  
  /**
   * Start the consumer
   */
  public async start(): Promise<void> {
    if (this.isActive) {
      console.log(`Event consumer already started: ${this.name}`);
      return;
    }
    
    // Set up event handlers
    await this.setupEventHandlers();
    
    this.isActive = true;
    console.log(`Event consumer started: ${this.name}`);
  }
  
  /**
   * Stop the consumer
   */
  public async stop(): Promise<void> {
    if (!this.isActive) {
      console.log(`Event consumer already stopped: ${this.name}`);
      return;
    }
    
    // Unsubscribe from all events
    for (const [handlerId, subscriptionIds] of this.subscriptions.entries()) {
      try {
        await this.eventBus.unsubscribeMany(subscriptionIds);
        console.log(`Unsubscribed handler: ${handlerId} from length} event types`);
      } catch (error) {
        console.error(`Error unsubscribing handler ${handlerId}:`, error);
      }
    }
    
    this.subscriptions.clear();
    this.isActive = false;
    console.log(`Event consumer stopped: ${this.name}`);
  }
  
  /**
   * Set up event handlers
   * This method should be overridden by subclasses
   */
  protected async setupEventHandlers(): Promise<void> {
    // Default implementation does nothing
  }
  
  /**
   * Add event handler
   * @param eventType Event type
   * @param handler Event handler
   * @param options Subscription options
   */
  public async addHandler<T>(
    eventType: string, 
    handler: EventHandler<T>, 
    options: SubscriptionOptions = {}
  ): Promise<string> {
    // Generate handler ID if not provided
    const handlerId = options.id || `${this.name}.handler.${Date.now()}`;
    
    // Subscribe to event
    const subscriptionId = await this.eventBus.subscribe(
      eventType,
      handler,
      { ...options, id: `${handlerId}.${eventType}` }
    );
    
    // Track subscription
    if (!this.subscriptions.has(handlerId)) {
      this.subscriptions.set(handlerId, []);
    }
    this.subscriptions.get(handlerId)!.push(subscriptionId);
    
    console.log(`Added handler: ${handlerId} for event type: ${eventType}`);
    return handlerId;
  }
  
  /**
   * Remove event handler
   * @param handlerId Handler ID
   */
  public async removeHandler(handlerId: string): Promise<void> {
    const subscriptionIds = this.subscriptions.get(handlerId);
    if (!subscriptionIds) {
      console.warn(`Handler not found: ${handlerId}`);
      return;
    }
    
    // Unsubscribe from events
    await this.eventBus.unsubscribeMany(subscriptionIds);
    
    // Remove handler
    this.subscriptions.delete(handlerId);
    
    console.log(`Removed handler: ${handlerId}`);
  }
  
  /**
   * Start the service
   */
  protected async doStart(): Promise<void> {
    await this.start();
  }
  
  /**
   * Stop the service
   */
  protected async doStop(): Promise<void> {
    await this.stop();
  }
}

/**
 * Domain-specific event consumer base class
 */
export abstract class DomainEventConsumer extends BaseEventConsumer {
  /**
   * Domain name
   */
  protected readonly domain: string;
  
  /**
   * Create a new domain event consumer
   * @param domain Domain name
   * @param eventBus Event bus to subscribe to
   */
  constructor(domain: string, eventBus?: InMemoryEventBus) {
    super(`${domain}EventConsumer`, eventBus);
    this.domain = domain;
  }
}

/**
 * Equipment event consumer for handling equipment-related events
 */
export class EquipmentEventConsumer extends DomainEventConsumer {
  constructor(eventBus?: InMemoryEventBus) {
    super('equipment', eventBus);
  }
  
  /**
   * Set up event handlers
   */
  protected async setupEventHandlers(): Promise<void> {
    await this.addHandler(
      'equipment.status.changed',
      this.handleStatusChange.bind(this)
    );
    
    await this.addHandler(
      'equipment.maintenance.required',
      this.handleMaintenanceRequired.bind(this)
    );
  }
  
  /**
   * Handle equipment status change event
   * @param event Status change event
   */
  private async handleStatusChange(event: Event<any>): Promise<void> {
    const { equipmentId, newStatus, oldStatus } = event.payload;
    console.log(`Equipment ${equipmentId} status changed from ${oldStatus} to ${newStatus}`);
    
    // Here you would add your business logic for handling status changes
  }
  
  /**
   * Handle equipment maintenance required event
   * @param event Maintenance required event
   */
  private async handleMaintenanceRequired(event: Event<any>): Promise<void> {
    const { equipmentId, reason, priority } = event.payload;
    console.log(`Equipment ${equipmentId} requires maintenance: ${reason} (${priority})`);
    
    // Here you would add your business logic for handling maintenance requirements
  }
}

/**
 * Production event consumer for handling production-related events
 */
export class ProductionEventConsumer extends DomainEventConsumer {
  constructor(eventBus?: InMemoryEventBus) {
    super('production', eventBus);
  }
  
  /**
   * Set up event handlers
   */
  protected async setupEventHandlers(): Promise<void> {
    await this.addHandler(
      'production.order.status.changed',
      this.handleOrderStatusChange.bind(this)
    );
    
    await this.addHandler(
      'production.started',
      this.handleProductionStarted.bind(this)
    );
    
    await this.addHandler(
      'production.completed',
      this.handleProductionCompleted.bind(this)
    );
  }
  
  /**
   * Handle production order status change event
   * @param event Order status change event
   */
  private async handleOrderStatusChange(event: Event<any>): Promise<void> {
    const { orderId, newStatus, oldStatus } = event.payload;
    console.log(`Production order ${orderId} status changed from ${oldStatus} to ${newStatus}`);
    
    // Here you would add your business logic for handling order status changes
  }
  
  /**
   * Handle production started event
   * @param event Production started event
   */
  private async handleProductionStarted(event: Event<any>): Promise<void> {
    const { orderId, productionLineId } = event.payload;
    console.log(`Production started for order ${orderId} on line ${productionLineId}`);
    
    // Here you would add your business logic for handling production start
  }
  
  /**
   * Handle production completed event
   * @param event Production completed event
   */
  private async handleProductionCompleted(event: Event<any>): Promise<void> {
    const { orderId, productionLineId, quantity } = event.payload;
    console.log(`Production completed for order ${orderId} on line ${productionLineId}: ${quantity} units`);
    
    // Here you would add your business logic for handling production completion
  }
}