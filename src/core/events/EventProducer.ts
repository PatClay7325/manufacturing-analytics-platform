/**
 * Event Producer Implementation
 * 
 * This class implements the EventProducer interface and provides
 * a convenient way for services to produce events.
 */

import { v4 as uuidv4 } from 'uuid';
import { EventProducer } from './interfaces';
import { Event, PublishOptions } from './types';
import { InMemoryEventBus } from './InMemoryEventBus';

/**
 * Base event producer implementation
 */
export class BaseEventProducer implements EventProducer {
  /**
   * Source identifier for events produced by this producer
   */
  protected readonly source: string;
  
  /**
   * Event bus instance
   */
  protected readonly eventBus: InMemoryEventBus;
  
  /**
   * Create a new event producer
   * @param source Source identifier for events
   * @param eventBus Event bus to publish events to (defaults to singleton instance)
   */
  constructor(source: string, eventBus?: InMemoryEventBus) {
    this.source = source;
    this.eventBus = eventBus || InMemoryEventBus.getInstance();
  }
  
  /**
   * Create and publish an event
   * @param eventType Event type
   * @param payload Event payload
   * @param options Publication options
   * @returns Event ID
   */
  public async createAndPublishEvent<T>(
    eventType: string, 
    payload: T, 
    options?: PublishOptions
  ): Promise<string> {
    // Generate event ID
    const eventId = uuidv4();
    
    // Create event object
    const event: Event<T> = {
      id: eventId,
      type: eventType,
      source: this.source,
      timestamp: new Date(),
      payload,
      correlationId: options.correlationId,
      priority: options.priority,
      metadata: options.metadata,
    };
    
    // Publish event
    await this.eventBus.publish(event, options);
    
    return eventId;
  }
}

/**
 * Create a domain-specific event producer for a particular context
 * @param domain Domain name
 * @param context Context within the domain
 * @returns Event producer for the domain/context
 */
export function createDomainEventProducer(
  domain: string, 
  context: string
): EventProducer {
  return new BaseEventProducer(`${domain}.${context}`);
}

/**
 * Equipment event producer for equipment-related events
 */
export class EquipmentEventProducer extends BaseEventProducer {
  constructor() {
    super('equipment');
  }
  
  /**
   * Emit equipment status change event
   * @param equipmentId Equipment ID
   * @param newStatus New status
   * @param oldStatus Old status
   * @param options Publication options
   */
  public async emitStatusChange(
    equipmentId: string, 
    newStatus: string, 
    oldStatus: string, 
    options?: PublishOptions
  ): Promise<string> {
    return this.createAndPublishEvent(
      'equipment.status.changed',
      {
        equipmentId,
        newStatus,
        oldStatus,
        changedAt: new Date(),
      },
      options
    );
  }
  
  /**
   * Emit equipment maintenance required event
   * @param equipmentId Equipment ID
   * @param reason Maintenance reason
   * @param priority Maintenance priority
   * @param options Publication options
   */
  public async emitMaintenanceRequired(
    equipmentId: string, 
    reason: string, 
    priority: string, 
    options?: PublishOptions
  ): Promise<string> {
    return this.createAndPublishEvent(
      'equipment.maintenance.required',
      {
        equipmentId,
        reason,
        priority,
        detectedAt: new Date(),
      },
      options
    );
  }
}

/**
 * Production event producer for production-related events
 */
export class ProductionEventProducer extends BaseEventProducer {
  constructor() {
    super('production');
  }
  
  /**
   * Emit production order status change event
   * @param orderId Order ID
   * @param newStatus New status
   * @param oldStatus Old status
   * @param options Publication options
   */
  public async emitOrderStatusChange(
    orderId: string, 
    newStatus: string, 
    oldStatus: string, 
    options?: PublishOptions
  ): Promise<string> {
    return this.createAndPublishEvent(
      'production.order.status.changed',
      {
        orderId,
        newStatus,
        oldStatus,
        changedAt: new Date(),
      },
      options
    );
  }
  
  /**
   * Emit production started event
   * @param orderId Order ID
   * @param productionLineId Production line ID
   * @param options Publication options
   */
  public async emitProductionStarted(
    orderId: string, 
    productionLineId: string, 
    options?: PublishOptions
  ): Promise<string> {
    return this.createAndPublishEvent(
      'production.started',
      {
        orderId,
        productionLineId,
        startedAt: new Date(),
      },
      options
    );
  }
  
  /**
   * Emit production completed event
   * @param orderId Order ID
   * @param productionLineId Production line ID
   * @param quantity Quantity produced
   * @param options Publication options
   */
  public async emitProductionCompleted(
    orderId: string, 
    productionLineId: string, 
    quantity: number, 
    options?: PublishOptions
  ): Promise<string> {
    return this.createAndPublishEvent(
      'production.completed',
      {
        orderId,
        productionLineId,
        quantity,
        completedAt: new Date(),
      },
      options
    );
  }
}