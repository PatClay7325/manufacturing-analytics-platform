# Manufacturing Analytics Platform - Integration Framework

The integration framework provides a flexible, extensible architecture for connecting to various external manufacturing systems. It follows the hexagonal architecture pattern, allowing for clean separation of concerns and easy addition of new integration adapters.

## Key Components

### Core Interfaces

- **IntegrationAdapter**: Defines the contract for all integration adapters
- **DataTransformer**: Responsible for transforming data between external system formats and internal standardized formats
- **DataValidator**: Ensures data integrity and format validation

### Abstract Implementations

- **AbstractIntegrationAdapter**: Base implementation for integration adapters that provides common functionality

### Management

- **IntegrationManager**: Central service for managing all integration adapters

## Supported Systems

The framework is designed to support connecting to various manufacturing systems including:

- MQTT brokers
- OPC UA servers
- REST APIs
- Databases
- File systems
- Websockets
- Modbus
- Serial interfaces
- PROFINET
- Custom protocols

## Usage

### Registering an Integration Adapter

```typescript
// Get the integration manager from the application
const integrationManager = app.getService('integration-manager') as IntegrationManager;

// Register a new integration configuration
await integrationManager.registerIntegrationConfig({
  id: 'mqtt-factory-floor',
  name: 'Factory Floor MQTT',
  type: IntegrationSystemType.MQTT,
  description: 'Connection to factory floor MQTT broker',
  connectionParams: {
    host: 'mqtt.factory.example.com',
    port: 1883,
    clientId: 'manufacturing-analytics-platform',
    keepalive: 60
  },
  authParams: {
    username: 'mqtt-user',
    password: 'mqtt-password'
  }
});

// Start the integration
await integrationManager.connect('mqtt-factory-floor');
```

### Sending Data

```typescript
// Create a data packet
const dataPacket: IntegrationDataPacket<unknown> = {
  id: uuidv4(),
  source: 'analytics-platform',
  timestamp: new Date(),
  payload: {
    command: 'start',
    parameters: {
      machineId: 'machine-123',
      program: 'cutting-program-456'
    }
  }
};

// Send data through the integration
await integrationManager.sendData('mqtt-factory-floor', dataPacket);
```

### Receiving Data

```typescript
// Subscribe to data from the integration
const subscriptionId = await integrationManager.receiveData(
  'mqtt-factory-floor',
  (data) => {
    console.log('Received data:', data);
    // Process the data...
  },
  {
    topic: 'factory/machines/+/data',
    qos: 1
  }
);

// Later, unsubscribe
const adapter = integrationManager.getAdapter('mqtt-factory-floor');
if (adapter) {
  await adapter.unsubscribe(subscriptionId);
}
```

## Creating a Custom Adapter

To create a custom integration adapter:

1. Extend the `AbstractIntegrationAdapter` class
2. Implement the required abstract methods
3. Register a factory function with the `IntegrationManager`

Example factory registration:

```typescript
// Register a factory for MQTT adapters
integrationManager.registerAdapterFactory(
  IntegrationSystemType.MQTT,
  async (config: IntegrationConfig) => {
    return new MQTTIntegrationAdapter(
      config,
      new MQTTDataTransformer(),
      new MQTTDataValidator(),
      app.logger
    );
  }
);
```

## Error Handling

The integration framework provides robust error handling:

- All errors are categorized by `IntegrationErrorType`
- Adapters include automatic reconnection with configurable retry strategies
- Health checks monitor connection status and attempt recovery
- All errors are logged and can be retrieved via the adapter's `getLastError()` method