/**
 * Events Module for the Hybrid Manufacturing Intelligence Platform
 * 
 * This module exports all components of the event-driven architecture.
 */

// Export types and interfaces
export * from './types';
export * from './interfaces';

// Export event bus implementation
export * from './InMemoryEventBus';

// Export event store implementation
export * from './InMemoryEventStore';

// Export event producer implementation
export * from './EventProducer';

// Export event consumer implementation
export * from './EventConsumer';

// Export a function to initialize the event system
import { InMemoryEventBus } from './InMemoryEventBus';
import { InMemoryEventStore } from './InMemoryEventStore';

/**
 * Initialize the event system
 * @param eventBus Optional custom event bus implementation
 * @param eventStore Optional custom event store implementation
 * @returns Initialized event bus
 */
export async function initializeEventSystem(
  eventBus?: InMemoryEventBus,
  eventStore?: InMemoryEventStore
): Promise<InMemoryEventBus> {
  // Get or create event bus
  const bus = eventBus || InMemoryEventBus.getInstance();
  
  // Get or create event store
  const store = eventStore || InMemoryEventStore.getInstance();
  
  // Initialize and start event store
  await store.initialize({
    environment: 'development',
    debug: true,
    logLevel: 'info',
    tracing: false,
  });
  await store.start();
  
  // Connect event bus to event store
  bus.setEventStore(store);
  
  // Initialize and start event bus
  await bus.initialize({
    environment: 'development',
    debug: true,
    logLevel: 'info',
    tracing: false,
  });
  await bus.start();
  
  return bus;
}