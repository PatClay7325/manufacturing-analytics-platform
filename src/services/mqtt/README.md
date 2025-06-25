# MQTT Integration for IoT Sensor Data Collection

This module provides a production-ready MQTT integration for collecting IoT sensor data with the following features:

## Features

- **Automatic Reconnection**: Handles connection failures with configurable retry logic
- **Topic Subscription Management**: Support for wildcard topics and dynamic subscriptions
- **Message Queue and Buffering**: Reliable message delivery with configurable buffer sizes
- **Data Transformation and Validation**: Flexible data transformation for various sensor formats
- **Security**: TLS/SSL support with certificate-based authentication
- **Dead Letter Queue**: Failed messages are stored for retry or analysis
- **Monitoring and Alerting**: Real-time health monitoring with configurable alerts
- **WebSocket Streaming**: Real-time data streaming to web clients

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   IoT Sensors   │────▶│   MQTT Broker    │────▶│  MQTT Service   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │  Message Buffer │
                                                  └─────────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │  Transformer    │
                                                  └─────────────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │   Database      │
                                                  └─────────────────┘
```

## Usage

### 1. Basic Configuration

```typescript
import { MqttService } from '@/services/mqtt/MqttService';

const mqttConfig = {
  brokerUrl: 'mqtt://localhost:1883',
  clientId: 'manufacturing-platform',
  topics: {
    sensors: ['sensors/+/data', 'sensors/+/telemetry'],
    commands: 'commands/+',
    status: 'status/+',
    deadLetter: 'deadletter/sensors'
  },
  buffer: {
    maxSize: 10000,
    flushInterval: 5000
  }
};

const mqttService = new MqttService(mqttConfig);
await mqttService.connect();
```

### 2. Secure Connection (TLS)

```typescript
const secureConfig = {
  brokerUrl: 'mqtts://broker.example.com:8883',
  username: 'iot-client',
  password: 'secure-password',
  tls: {
    enabled: true,
    ca: fs.readFileSync('ca.crt'),
    cert: fs.readFileSync('client.crt'),
    key: fs.readFileSync('client.key'),
    rejectUnauthorized: true
  }
};
```

### 3. Data Transformation

The service supports multiple sensor data formats:

#### JSON Format
```json
{
  "sensorId": "temp-001",
  "timestamp": "2024-01-20T10:30:00Z",
  "value": 23.5,
  "unit": "°C",
  "quality": 100
}
```

#### CSV Format
```csv
sensorId,timestamp,value,unit
temp-001,2024-01-20T10:30:00Z,23.5,°C
temp-002,2024-01-20T10:30:00Z,24.1,°C
```

#### Binary Format
Binary data is automatically parsed based on predefined structure.

### 4. Monitoring

```typescript
import { MqttMonitor } from '@/services/mqtt/MqttMonitor';

const monitor = new MqttMonitor(mqttService, {
  checkInterval: 10000,
  thresholds: {
    messageRate: 1000,    // max 1000 msgs/sec
    errorRate: 5,         // max 5% error rate
    bufferSize: 5000,     // alert if buffer > 5000
    deadLetterSize: 100   // alert if DLQ > 100
  },
  alerting: {
    enabled: true,
    channels: ['log', 'database']
  }
});

monitor.start();
```

### 5. API Endpoints

#### Connect to MQTT Broker
```bash
POST /api/mqtt
{
  "brokerUrl": "mqtt://localhost:1883",
  "topics": {
    "sensors": ["sensors/+/data"]
  }
}
```

#### Get Service Status
```bash
GET /api/mqtt
```

#### Publish Message
```bash
POST /api/mqtt/publish
{
  "topic": "sensors/temp-001/data",
  "payload": {
    "value": 23.5,
    "unit": "°C"
  }
}
```

#### Manage Dead Letter Queue
```bash
# Get dead letter messages
GET /api/mqtt/deadletter

# Retry failed messages
POST /api/mqtt/deadletter/retry

# Clear dead letter queue
DELETE /api/mqtt/deadletter
```

### 6. WebSocket Integration

```javascript
// Client-side code
const socket = io('/mqtt');

// Subscribe to topics
socket.emit('subscribe', ['sensors/+/data']);

// Receive real-time data
socket.on('message', (message) => {
  console.log('Received:', message);
});

// Monitor health status
socket.on('health', (health) => {
  console.log('Health:', health);
});
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `brokerUrl` | string | required | MQTT broker URL |
| `clientId` | string | auto-generated | Client identifier |
| `username` | string | - | Authentication username |
| `password` | string | - | Authentication password |
| `tls.enabled` | boolean | false | Enable TLS/SSL |
| `tls.ca` | string | - | CA certificate |
| `tls.cert` | string | - | Client certificate |
| `tls.key` | string | - | Client private key |
| `reconnectPeriod` | number | 5000 | Reconnect interval (ms) |
| `connectTimeout` | number | 30000 | Connection timeout (ms) |
| `keepalive` | number | 60 | Keep-alive interval (seconds) |
| `qos` | 0\|1\|2 | 1 | Default QoS level |
| `topics.sensors` | string[] | ['sensors/+/data'] | Sensor topic patterns |
| `buffer.maxSize` | number | 10000 | Max buffer size |
| `buffer.flushInterval` | number | 5000 | Buffer flush interval (ms) |

## Performance Considerations

1. **Buffer Size**: Adjust `buffer.maxSize` based on your message volume
2. **Flush Interval**: Lower intervals provide lower latency but higher database load
3. **QoS Level**: 
   - QoS 0: Best performance, no delivery guarantee
   - QoS 1: Balanced, at least once delivery
   - QoS 2: Slowest, exactly once delivery
4. **Topic Wildcards**: Use specific topics when possible for better performance

## Troubleshooting

### Connection Issues
- Check broker URL and port
- Verify network connectivity
- Check authentication credentials
- Review TLS certificates

### High Error Rate
- Check data format compatibility
- Verify database connectivity
- Review transformation rules
- Check sensor data quality

### Memory Usage
- Reduce buffer size
- Increase flush frequency
- Implement data sampling
- Archive old data

### Dead Letter Queue Growth
- Review failed messages for patterns
- Check data validation rules
- Verify database schema
- Implement retry logic

## Security Best Practices

1. Always use TLS in production
2. Implement proper authentication
3. Use unique client IDs
4. Rotate credentials regularly
5. Monitor for anomalies
6. Implement rate limiting
7. Validate all incoming data
8. Use least privilege principle