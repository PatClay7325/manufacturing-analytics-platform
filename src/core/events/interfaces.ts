/**
 * Event Interfaces for the Hybrid Manufacturing Intelligence Platform
 * 
 * This file defines the interfaces for the event-driven architecture components.
 */

import { 
  Event, 
  EventHandler, 
  SubscriptionOptions, 
  PublishOptions, 
  EventAck 
} from './types';

/**
 * Event bus interface
 * Central component for event publication and subscription
 */
export interface EventBus {
  /**
   * Publish an event to the event bus
   * @param event Event to publish
   * @param options Publication options
   */
  publish<T>(event: Event<T>, options?: PublishOptions): Promise<void>;
  
  /**
   * Subscribe to events of a specific type
   * @param eventType Event type to subscribe to
   * @param handler Event handler function
   * @param options Subscription options
   */
  subscribe<T>(
    eventType: string, 
    handler: EventHandler<T>, 
    options?: SubscriptionOptions
  ): Promise<string>;
  
  /**
   * Subscribe to multiple event types
   * @param eventTypes Event types to subscribe to
   * @param handler Event handler function
   * @param options Subscription options
   */
  subscribeMany<T>(
    eventTypes: string[], 
    handler: EventHandler<T>, 
    options?: SubscriptionOptions
  ): Promise<string[]>;
  
  /**
   * Unsubscribe from events
   * @param subscriptionId Subscription ID returned from subscribe method
   */
  unsubscribe(subscriptionId: string): Promise<void>;
  
  /**
   * Unsubscribe from multiple subscriptions
   * @param subscriptionIds Subscription IDs to unsubscribe
   */
  unsubscribeMany(subscriptionIds: string[]): Promise<void>;
  
  /**
   * Acknowledge event processing
   * @param ack Event acknowledgment
   */
  acknowledge(ack: EventAck): Promise<void>;
}

/**
 * Event store interface
 * Stores and retrieves events for replay and auditing
 */
export interface EventStore {
  /**
   * Store an event
   * @param event Event to store
   */
  storeEvent<T>(event: Event<T>): Promise<void>;
  
  /**
   * Retrieve an event by ID
   * @param eventId Event ID
   */
  getEvent<T>(eventId: string): Promise<Event<T> | null>;
  
  /**
   * Retrieve events by type
   * @param eventType Event type
   * @param options Query options
   */
  getEventsByType<T>(
    eventType: string, 
    options?: { 
      limit?: number; 
      offset?: number; 
      startDate?: Date; 
      endDate?: Date;
    }
  ): Promise<Event<T>[]>;
  
  /**
   * Retrieve events by correlation ID
   * @param correlationId Correlation ID
   */
  getEventsByCorrelationId<T>(correlationId: string): Promise<Event<T>[]>;
  
  /**
   * Update event status
   * @param eventId Event ID
   * @param status New status
   */
  updateEventStatus(eventId: string, status: string): Promise<void>;
}

/**
 * Event producer interface
 * Produces events of specific types
 */
export interface EventProducer {
  /**
   * Create and publish an event
   * @param eventType Event type
   * @param payload Event payload
   * @param options Publication options
   */
  createAndPublishEvent<T>(
    eventType: string, 
    payload: T, 
    options?: PublishOptions
  ): Promise<string>;
}

/**
 * Event consumer interface
 * Consumes events of specific types
 */
export interface EventConsumer {
  /**
   * Start consuming events
   */
  start(): Promise<void>;
  
  /**
   * Stop consuming events
   */
  stop(): Promise<void>;
  
  /**
   * Add event handler
   * @param eventType Event type
   * @param handler Event handler
   * @param options Subscription options
   */
  addHandler<T>(
    eventType: string, 
    handler: EventHandler<T>, 
    options?: SubscriptionOptions
  ): Promise<string>;
  
  /**
   * Remove event handler
   * @param handlerId Handler ID
   */
  removeHandler(handlerId: string): Promise<void>;
}