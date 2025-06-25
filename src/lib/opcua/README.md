# Production-Ready OPC UA Client for Manufacturing

A comprehensive OPC UA client implementation designed for manufacturing equipment data collection with enterprise-grade features.

## Features

### Core Functionality
- **Connection Pooling**: Efficient management of multiple OPC UA connections
- **Real-time Subscriptions**: Monitor equipment parameters with configurable sampling rates
- **Type Mapping**: Automatic conversion between OPC UA and TypeScript types
- **Batch Operations**: Read/write multiple values in a single operation
- **Node Browsing**: Discover available nodes on OPC UA servers

### Production Features
- **Circuit Breaker Pattern**: Prevents cascade failures with automatic recovery
- **Security Management**: Certificate-based authentication and encryption
- **Metrics & Monitoring**: Prometheus-compatible metrics for observability
- **Error Handling**: Comprehensive error handling with typed exceptions
- **Health Checks**: Automatic connection health monitoring
- **Graceful Degradation**: Continues operation even with partial failures

## Installation

```bash
npm install node-opcua node-opcua-client node-opcua-crypto
```

## Quick Start

```typescript
import { OPCUAClient } from './lib/opcua';

// Create client
const client = new OPCUAClient({
  connectionPool: {
    maxConnections: 10,
    minConnections: 2
  },
  metrics: {
    enabled: true
  }
});

// Initialize with connections
await client.initialize([
  {
    endpointUrl: 'opc.tcp://localhost:4840',
    applicationName: 'MyApp'
  }
]);

// Monitor equipment
await client.monitorEquipment(
  'opc.tcp://localhost:4840',
  'CNC-001',
  'subscription-1'
);
```

## Architecture

### Components

1. **Connection Pool** (`connection-pool.ts`)
   - Manages multiple OPC UA connections
   - Implements connection reuse and lifecycle management
   - Handles automatic reconnection

2. **Subscription Manager** (`subscription-manager.ts`)
   - Manages subscriptions and monitored items
   - Buffers data for efficient processing
   - Handles real-time data changes

3. **Security Manager** (`security-manager.ts`)
   - Certificate generation and management
   - Authentication handling
   - Security policy enforcement

4. **Type Mapper** (`type-mapper.ts`)
   - Converts OPC UA data types to JavaScript
   - Handles complex types and arrays
   - Supports custom type mappings

5. **Circuit Breaker** (`circuit-breaker.ts`)
   - Prevents cascade failures
   - Automatic recovery after failures
   - Configurable thresholds

6. **Metrics Collector** (`metrics-collector.ts`)
   - Collects operational metrics
   - Prometheus-compatible format
   - Performance monitoring

## Configuration

### Connection Configuration
```typescript
interface OPCUAConnectionConfig {
  endpointUrl: string;              // OPC UA server endpoint
  applicationName: string;          // Client application name
  securityMode?: MessageSecurityMode;
  securityPolicy?: SecurityPolicy;
  userName?: string;                // For user authentication
  password?: string;
  maxRetries?: number;              // Connection retry attempts
  retryDelay?: number;              // Delay between retries
}
```

### Client Configuration
```typescript
interface OPCUAClientConfig {
  connectionPool?: {
    maxConnections: number;         // Maximum connections (default: 10)
    minConnections: number;         // Minimum connections (default: 2)
    connectionIdleTimeout: number;  // Idle timeout in ms (default: 300000)
    healthCheckInterval: number;    // Health check interval (default: 30000)
  };
  security?: SecurityConfig;        // Security configuration
  typeMapping?: TypeMappingConfig;  // Custom type mappings
  metrics?: {
    enabled: boolean;               // Enable metrics collection
    prefix?: string;                // Metrics prefix
    defaultLabels?: Record<string, string>;
  };
}
```

## Usage Examples

### Basic Data Collection
```typescript
// Read current values
const values = await client.readValues(
  'opc.tcp://localhost:4840',
  ['ns=2;s=Temperature', 'ns=2;s=Pressure']
);

// Write values
const results = await client.writeValues(
  'opc.tcp://localhost:4840',
  [
    {
      nodeId: 'ns=2;s=Setpoint',
      value: 75.5,
      dataType: DataType.Double
    }
  ]
);
```

### Equipment Monitoring
```typescript
// Configure equipment mappings
client.configureEquipment([
  {
    equipmentId: 'CNC-001',
    equipmentName: 'CNC Machine 001',
    nodes: {
      status: 'ns=2;s=CNC001.Status',
      temperature: 'ns=2;s=CNC001.Temperature',
      speed: 'ns=2;s=CNC001.SpindleSpeed'
    }
  }
]);

// Monitor specific parameters
await client.monitorEquipment(
  'opc.tcp://localhost:4840',
  'CNC-001',
  'subscription-1',
  ['temperature', 'speed'] // Optional: specify parameters
);
```

### Event Handling
```typescript
const client = new OPCUAClient(config, {
  onDataChange: async (data) => {
    console.log('Data received:', {
      equipment: data.equipmentName,
      parameter: data.parameterName,
      value: data.value,
      timestamp: data.timestamp
    });
  },
  onConnectionLost: (error) => {
    console.error('Connection lost:', error);
  },
  onError: (error) => {
    console.error('OPC UA error:', error);
  }
});
```

### Security Configuration
```typescript
const client = new OPCUAClient({
  security: {
    certificatePath: './pki/client_cert.pem',
    privateKeyPath: './pki/client_key.pem',
    rejectUnknownCertificates: true,
    trustedCertificatesPath: './pki/trusted'
  }
});
```

## Monitoring & Metrics

### Prometheus Metrics
```typescript
// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  const metrics = await client.getPrometheusMetrics();
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});
```

### Available Metrics
- `opcua_connections_total`: Total connection attempts
- `opcua_connections_active`: Active connections
- `opcua_subscriptions_active`: Active subscriptions
- `opcua_monitored_items_active`: Active monitored items
- `opcua_data_values_received_total`: Data values received
- `opcua_data_processing_duration_seconds`: Processing time histogram
- `opcua_circuit_breaker_state`: Circuit breaker state

## Error Handling

The client uses typed errors for different failure scenarios:

```typescript
try {
  await client.readValues(endpoint, nodeIds);
} catch (error) {
  if (error instanceof ConnectionError) {
    // Handle connection errors
  } else if (error instanceof SubscriptionError) {
    // Handle subscription errors
  } else if (error instanceof SecurityError) {
    // Handle security errors
  }
}
```

## Best Practices

1. **Connection Management**
   - Use connection pooling for multiple endpoints
   - Configure appropriate timeout values
   - Monitor connection health

2. **Data Collection**
   - Use subscriptions for real-time data
   - Batch read operations when possible
   - Configure appropriate sampling intervals

3. **Security**
   - Always use encryption in production
   - Regularly rotate certificates
   - Validate server certificates

4. **Performance**
   - Monitor metrics regularly
   - Adjust buffer sizes based on load
   - Use circuit breakers for external dependencies

5. **Error Handling**
   - Implement proper error handling
   - Log errors with context
   - Set up alerts for critical failures

## Integration with Manufacturing Analytics Platform

See `examples/platform-integration.ts` for a complete example of integrating the OPC UA client with the manufacturing analytics platform, including:
- Automatic equipment discovery
- Data persistence to database
- Alert generation
- Metrics exposure

## Troubleshooting

### Connection Issues
- Verify endpoint URL is correct
- Check firewall rules
- Ensure OPC UA server is running
- Validate certificates

### Performance Issues
- Increase connection pool size
- Adjust sampling intervals
- Enable data buffering
- Monitor metrics

### Security Issues
- Check certificate validity
- Verify security policies match
- Ensure proper authentication

## License

Part of the Manufacturing Analytics Platform