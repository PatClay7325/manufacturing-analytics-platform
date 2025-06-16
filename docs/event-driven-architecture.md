# Event-Driven Architecture

## Overview

The Hybrid Manufacturing Intelligence Platform implements an event-driven architecture to enable loose coupling, scalability, and resilience. This document explains the key components and patterns used in the event system.

## Core Components

### 1. Event

An Event is a record of something that happened in the system. Events have the following properties:

- **id**: Unique identifier for the event
- **type**: The type of event (e.g., 'equipment.status.changed')
- **source**: The service or component that created the event
- **timestamp**: When the event occurred
- **payload**: The event data
- **correlationId**: Optional ID to link related events
- **priority**: Event priority (LOW, NORMAL, HIGH, CRITICAL)
- **status**: Current status of the event (CREATED, PUBLISHED, DELIVERED, PROCESSED, FAILED)
- **metadata**: Additional contextual information

### 2. Event Bus

The Event Bus is the central component that manages event distribution. It provides:

- **Publishing**: Send events to interested subscribers
- **Subscription**: Register interest in specific event types
- **Acknowledgment**: Confirm event processing
- **Delivery guarantees**: Ensure events reach subscribers

### 3. Event Store

The Event Store persists events for:

- **Event sourcing**: Reconstructing state from event history
- **Audit**: Tracking all system activities
- **Replay**: Reprocessing events if needed
- **Analysis**: Historical trend and pattern analysis

### 4. Event Producers

Event Producers are services that generate events:

- **Domain Producers**: Specific to business domains (Equipment, Production, etc.)
- **System Producers**: Generate system-level events (monitoring, health, etc.)

### 5. Event Consumers

Event Consumers are services that react to events:

- **Process Managers**: Coordinate long-running processes
- **Aggregators**: Combine multiple events into higher-level information
- **Projectors**: Update read models based on events
- **Monitors**: Watch for specific patterns or thresholds

## Event Types

The platform uses a hierarchical naming convention for events:

```
<domain>.<entity>.<action>
```

Examples:
- `equipment.status.changed`
- `production.order.started`
- `quality.check.failed`
- `maintenance.scheduled`

## Event Patterns

### 1. Event Notification

Simple notification of something that happened:

```typescript
// Producer
await eventProducer.createAndPublishEvent(
  'equipment.status.changed',
  {
    equipmentId: 'equip-123',
    newStatus: 'maintenance',
    oldStatus: 'operational'
  }
);

// Consumer
eventConsumer.addHandler('equipment.status.changed', async (event) => {
  // Handle the event
});
```

### 2. Event-Carried State Transfer

Transfer state via events to reduce service coupling:

```typescript
await eventProducer.createAndPublishEvent(
  'quality.measurement.recorded',
  {
    equipmentId: 'equip-123',
    parameter: 'dimension',
    value: 10.5,
    timestamp: new Date(),
    isWithinSpec: true,
    lowerLimit: 10.0,
    upperLimit: 11.0
  }
);
```

### 3. Event Sourcing

Reconstruct entity state from its event history:

```typescript
// Get all events for a specific equipment
const events = await eventStore.getEventsByType('equipment.*', {
  filter: (event) => event.payload.equipmentId === 'equip-123'
});

// Replay events to reconstruct current state
const equipmentState = events.reduce((state, event) => {
  // Apply each event to the state
  return applyEvent(state, event);
}, {});
```

### 4. CQRS (Command Query Responsibility Segregation)

Separate command and query models:

- **Command Side**: Processes commands, emits events
- **Query Side**: Builds read models from events for efficient querying

## Implementation

The platform provides several implementations:

1. **In-Memory**: For development and small deployments
   - `InMemoryEventBus`
   - `InMemoryEventStore`

2. **Durable**: For production environments (future implementation)
   - `KafkaEventBus`
   - `PostgresEventStore`

## Event Flow

1. A service creates an event
2. The event is published to the Event Bus
3. The Event Bus stores the event in the Event Store
4. The Event Bus delivers the event to subscribers
5. Subscribers process the event and acknowledge receipt
6. The Event Store updates the event status

## Best Practices

1. **Event Design**:
   - Make events immutable
   - Include all relevant data in the payload
   - Use past tense for event names (happened, changed, created)

2. **Error Handling**:
   - Handle failures gracefully in consumers
   - Implement retry mechanisms for transient failures
   - Use dead-letter queues for unprocessable events

3. **Performance**:
   - Keep events small and focused
   - Use batch processing for high-volume events
   - Implement backpressure mechanisms

4. **Monitoring**:
   - Track event processing times
   - Monitor queue sizes and processing backlogs
   - Alert on failed event deliveries

## Conclusion

The event-driven architecture provides the foundation for a flexible, scalable, and resilient platform. By decoupling services through events, the system can evolve independently while maintaining consistency and reliability.