/**
 * Event Types for the Hybrid Manufacturing Intelligence Platform
 * 
 * This file defines the types and interfaces for the event-driven architecture.
 */

/**
 * Event priority levels
 */
export enum EventPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Event status enum
 */
export enum EventStatus {
  CREATED = 'created',
  PUBLISHED = 'published',
  DELIVERED = 'delivered',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

/**
 * Base event interface
 * All events in the system must implement this interface
 */
export interface Event<T = unknown> {
  /**
   * Unique event identifier
   */
  id: string;
  
  /**
   * Event type
   */
  type: string;
  
  /**
   * Event source (service or component that created the event)
   */
  source: string;
  
  /**
   * Event timestamp
   */
  timestamp: Date;
  
  /**
   * Event data payload
   */
  payload: T;
  
  /**
   * Event correlation ID (for tracking related events)
   */
  correlationId?: string;
  
  /**
   * Event priority
   */
  priority?: EventPriority;
  
  /**
   * Event status
   */
  status?: EventStatus;
  
  /**
   * Optional metadata
   */
  metadata?: Record<string, unknown>;
  
  /**
   * Tenant ID for multi-tenancy support
   */
  tenantId?: string;
}

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (event: Event<T>) => Promise<void> | void;

/**
 * Tenant-specific event options
 */
export interface TenantEventOptions {
  /**
   * Tenant ID for tenant-specific events or subscriptions
   */
  tenantId?: string;
  
  /**
   * Whether the event or subscription should be tenant-specific
   * If true and no tenantId is provided, current tenant context will be used
   */
  isTenantSpecific?: boolean;
}

/**
 * Event subscription options
 */
export interface SubscriptionOptions {
  /**
   * Handler identifier
   */
  id?: string;
  
  /**
   * Only receive events with these priorities
   */
  priority?: EventPriority | EventPriority[];
  
  /**
   * Filter function to determine if an event should be processed
   */
  filter?: (event: Event) => boolean;
  
  /**
   * Maximum number of concurrent event processing
   */
  concurrency?: number;
  
  /**
   * Auto-acknowledge events (default: true)
   */
  autoAck?: boolean;
}

/**
 * Event publication options
 */
export interface PublishOptions {
  /**
   * Event priority
   */
  priority?: EventPriority;
  
  /**
   * Event correlation ID
   */
  correlationId?: string;
  
  /**
   * Optional delay before delivering the event (in ms)
   */
  delay?: number;
  
  /**
   * Optional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Event acknowledgment
 */
export interface EventAck {
  /**
   * Event ID
   */
  eventId: string;
  
  /**
   * Whether the event was successfully processed
   */
  success: boolean;
  
  /**
   * Error message if processing failed
   */
  error?: string;
  
  /**
   * Optional result data
   */
  result?: unknown;
}