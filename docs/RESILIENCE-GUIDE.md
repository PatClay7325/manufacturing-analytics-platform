# System Resilience and Error Handling Guide

This guide covers the comprehensive resilience and error handling system implemented in the Manufacturing Analytics Platform.

## Overview

The resilience system provides:

- **Circuit Breakers** - Prevent cascading failures by temporarily blocking failing operations
- **Retry Mechanisms** - Automatically retry failed operations with configurable strategies  
- **Health Monitoring** - Continuous monitoring of system components
- **Enhanced Error Handling** - Structured error handling with categorization and context
- **Graceful Degradation** - Continue operating when non-critical services fail

## Components

### 1. Circuit Breakers

Circuit breakers prevent system overload by monitoring operation failures and temporarily blocking requests when failure thresholds are exceeded.

#### States
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Blocking requests due to failures, requests fail fast
- **HALF_OPEN**: Testing if service has recovered

#### Usage

```typescript
import { circuitBreakers } from '@/lib/resilience';

// Use database circuit breaker
await circuitBreakers.database.execute(async () => {
  return await prisma.user.findMany();
});

// Create custom circuit breaker
const customBreaker = new CircuitBreaker({
  name: 'ExternalAPI',
  failureThreshold: 5,
  timeout: 30000,
  monitoringPeriod: 15000,
});
```

#### Configuration

```typescript
const breaker = new CircuitBreaker({
  failureThreshold: 5,    // Open after 5 failures
  timeout: 60000,         // Stay open for 60 seconds
  monitoringPeriod: 30000, // Reset failure count every 30 seconds
  expectedErrors: ['NetworkError'], // Don't count these as failures
  name: 'ServiceName',    // For logging/monitoring
});
```

### 2. Retry Manager

Automatically retries failed operations with configurable strategies and backoff.

#### Strategies
- **FIXED**: Fixed delay between retries
- **EXPONENTIAL**: Exponentially increasing delay
- **LINEAR**: Linearly increasing delay

#### Usage

```typescript
import { RetryManager, RetryStrategy } from '@/lib/resilience';

// Custom retry configuration
const retryManager = new RetryManager({
  maxAttempts: 3,
  strategy: RetryStrategy.EXPONENTIAL,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableErrors: ['TimeoutError', 'NetworkError'],
});

const result = await retryManager.execute(async () => {
  return await someRiskyOperation();
});

// Convenience methods
const result = await RetryManager.withExponentialBackoff(
  async () => await operation(),
  3, // max attempts
  1000 // base delay
);
```

### 3. Health Monitoring

Continuous monitoring of system components with configurable health checks.

#### Built-in Health Checks
- Database connectivity
- External service availability  
- Redis connection
- MQTT broker status

#### Creating Custom Health Checks

```typescript
import { systemHealthChecker, HealthChecker } from '@/lib/resilience';

// Add custom health check
systemHealthChecker.addCheck({
  name: 'CustomService',
  timeout: 5000,
  critical: true,
  check: async () => {
    try {
      await testServiceConnection();
      return {
        status: HealthStatus.HEALTHY,
        message: 'Service is responsive',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: `Service check failed: ${error.message}`,
        timestamp: new Date(),
      };
    }
  },
});
```

#### Using Factory Methods

```typescript
// Database health check
const dbCheck = HealthChecker.createDatabaseCheck(
  'Database',
  async () => await prisma.$queryRaw`SELECT 1`
);

// HTTP service health check  
const httpCheck = HealthChecker.createHttpCheck(
  'ExternalAPI',
  'https://api.example.com/health'
);

systemHealthChecker.addCheck(dbCheck);
systemHealthChecker.addCheck(httpCheck);
```

### 4. Enhanced Error Handling

Structured error handling with automatic categorization, severity levels, and context.

#### Error Categories
- `AUTHENTICATION` - Authentication failures
- `AUTHORIZATION` - Permission denied
- `VALIDATION` - Invalid input data
- `NETWORK` - Network connectivity issues
- `DATABASE` - Database operation failures
- `EXTERNAL_SERVICE` - Third-party service failures
- `BUSINESS_LOGIC` - Business rule violations
- `SYSTEM` - System-level errors

#### Usage

```typescript
import { EnhancedError, ErrorCategory, ErrorSeverity } from '@/lib/enhanced-error/EnhancedError';

// Create specific error types
throw EnhancedError.validation(
  'Invalid email format',
  'Please enter a valid email address',
  { userId: '123', field: 'email' }
);

throw EnhancedError.database(
  'Connection timeout',
  { operation: 'getUserById', userId: '123' }
);

// Create custom error
throw new EnhancedError(
  'Custom error message',
  {
    category: ErrorCategory.BUSINESS_LOGIC,
    severity: ErrorSeverity.MEDIUM,
    retryable: false,
    userMessage: 'User-friendly message',
    context: {
      userId: '123',
      operation: 'processOrder',
    },
  }
);
```

#### API Error Handling

```typescript
import { withErrorHandler } from '@/lib/middleware/errorHandler';

// Wrap API route with error handling
export const GET = withErrorHandler(async (request: NextRequest) => {
  // Your API logic here
  const data = await someOperation();
  return NextResponse.json(data);
});

// Errors are automatically caught, categorized, logged, and returned as structured responses
```

## API Endpoints

### Health Check
```
GET /api/health
```

Returns comprehensive system health information including:
- Overall system status
- Individual health check results
- Circuit breaker states
- System metrics

### Resilience Metrics
```
GET /api/metrics/resilience
```

Returns detailed resilience metrics:
- Circuit breaker statistics
- Health check history
- Summary statistics

```
POST /api/metrics/resilience
```

Administrative actions:
- Reset circuit breakers
- Force circuit breaker states

## Monitoring Dashboard

Access the resilience dashboard at `/monitoring/resilience` for:

- Real-time circuit breaker status
- Health check results
- System status overview
- Manual circuit breaker controls
- Auto-refreshing metrics

## Service Initialization

The system automatically initializes resilience features on startup:

```typescript
import { serviceManager } from '@/lib/startup/initializeServices';

// Manual initialization
await serviceManager.initialize();

// Check service status
const status = serviceManager.getServiceStatus();

// Graceful shutdown
await serviceManager.shutdown();
```

## Configuration

### Environment Variables

```bash
# Health monitoring
ENABLE_HEALTH_MONITORING=true
HEALTH_CHECK_INTERVAL=30000

# Circuit breaker settings
DATABASE_CIRCUIT_BREAKER_THRESHOLD=5
DATABASE_CIRCUIT_BREAKER_TIMEOUT=60000

# Error handling
ENABLE_STACK_TRACES=false  # Set to true in development
LOG_LEVEL=info

# Service URLs for health checks
GRAFANA_URL=http://grafana:3000
REDIS_URL=redis://redis:6379
MQTT_URL=mqtt://mosquitto:1883
```

### Docker Compose

```yaml
services:
  nextjs:
    environment:
      - ENABLE_HEALTH_MONITORING=true
      - AUTO_INITIALIZE_SERVICES=true
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Best Practices

### Circuit Breakers
1. **Choose appropriate thresholds** - Balance between fast failure detection and false positives
2. **Set reasonable timeouts** - Allow enough time for services to recover
3. **Use expected errors** - Don't trip breakers for expected error conditions
4. **Monitor metrics** - Regular review of circuit breaker statistics

### Retry Logic
1. **Identify retryable operations** - Only retry transient failures
2. **Use exponential backoff** - Prevent thundering herd problems
3. **Set maximum delays** - Avoid indefinite retry delays
4. **Add jitter** - Reduce synchronized retry storms

### Error Handling
1. **Categorize errors correctly** - Choose appropriate error categories
2. **Provide user-friendly messages** - Clear, actionable error messages
3. **Include context** - Add relevant context for debugging
4. **Log appropriately** - Match log level to error severity

### Health Checks
1. **Keep checks lightweight** - Avoid expensive operations
2. **Set appropriate timeouts** - Balance thoroughness with responsiveness
3. **Mark critical vs non-critical** - Distinguish between essential and optional services
4. **Test actual functionality** - Don't just ping endpoints

## Troubleshooting

### Circuit Breaker Issues

**Problem**: Circuit breaker stuck open
```bash
# Check circuit breaker status
curl http://localhost:3001/api/metrics/resilience

# Reset specific circuit breaker
curl -X POST http://localhost:3001/api/metrics/resilience \
  -H "Content-Type: application/json" \
  -d '{"action": "reset_circuit_breaker", "name": "database"}'
```

**Problem**: Too many false positives
- Increase failure threshold
- Add expected error types
- Review timeout settings

### Health Check Failures

**Problem**: Health checks timing out
- Increase timeout values
- Check network connectivity
- Verify service availability

**Problem**: False unhealthy status
- Review health check logic
- Check service dependencies
- Verify configuration

### Performance Issues

**Problem**: High retry overhead
- Reduce retry attempts
- Increase base delay
- Use circuit breakers to fail fast

**Problem**: Circuit breaker latency
- Review failure threshold
- Optimize monitored operations
- Consider async operations

## Integration Examples

### Database Operations
```typescript
// Wrap database operations with resilience
async function getUserById(id: string) {
  return await circuitBreakers.database.execute(async () => {
    return await RetryManager.withExponentialBackoff(async () => {
      return await prisma.user.findUnique({ where: { id } });
    });
  });
}
```

### External API Calls
```typescript
async function callExternalAPI(endpoint: string) {
  return await circuitBreakers.external.execute(async () => {
    return await retryManager.execute(async () => {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    });
  });
}
```

### MQTT Operations
```typescript
// MQTT service with built-in resilience
const mqttService = new MqttIngestionService({
  // Circuit breaker and retry logic built-in
  mqttUrl: process.env.MQTT_URL,
  retryConfig: {
    maxAttempts: 3,
    strategy: RetryStrategy.EXPONENTIAL,
  },
});
```

## Metrics and Monitoring

### Prometheus Metrics

The system exports metrics in Prometheus format:

```
GET /api/metrics/resilience?format=prometheus
```

Key metrics:
- `circuit_breaker_state` - Circuit breaker state (0=CLOSED, 1=HALF_OPEN, 2=OPEN)
- `circuit_breaker_failures` - Total failures per circuit breaker
- `circuit_breaker_successes` - Total successes per circuit breaker
- `health_check_status` - Health check status
- `health_check_response_time` - Health check response times

### Grafana Dashboard

Import the included Grafana dashboard for visualization:
- Circuit breaker status over time
- Health check success rates
- Error rate trends
- Response time distributions

## Testing

### Unit Tests
```typescript
import { CircuitBreaker } from '@/lib/resilience/CircuitBreaker';

describe('CircuitBreaker', () => {
  it('should open after threshold failures', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      timeout: 1000,
      monitoringPeriod: 5000,
    });

    // Simulate failures
    await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    await expect(breaker.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    
    // Should be open now
    expect(breaker.getMetrics().state).toBe('OPEN');
  });
});
```

### Integration Tests
```typescript
describe('Health Checks', () => {
  it('should detect database connectivity', async () => {
    const result = await systemHealthChecker.runCheck('Database');
    expect(result.status).toBe('HEALTHY');
  });
});
```

## Migration Guide

### Existing Error Handling
Replace existing try-catch blocks:

```typescript
// Before
try {
  const result = await database.query(sql);
  return result;
} catch (error) {
  logger.error('Database error:', error);
  throw error;
}

// After  
return await circuitBreakers.database.execute(async () => {
  return await retryManager.execute(async () => {
    return await database.query(sql);
  });
});
```

### API Route Updates
Wrap existing API routes:

```typescript
// Before
export async function GET(request: NextRequest) {
  try {
    const data = await getData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// After
export const GET = withErrorHandler(async (request: NextRequest) => {
  const data = await getData();
  return NextResponse.json(data);
});
```

This resilience system provides comprehensive protection against failures while maintaining system observability and providing tools for manual intervention when needed.