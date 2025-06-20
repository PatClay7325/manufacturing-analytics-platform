# Performance Optimization Guide - Analytics-Level Performance

## 1. Database Optimization with TimescaleDB

### Why TimescaleDB?
- **100-1000x faster** queries for time-series data vs regular PostgreSQL
- Automatic data partitioning by time
- Built-in data retention policies
- Compression for older data (90% space savings)

### Implementation:

```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert Metric table to hypertable
SELECT create_hypertable('Metric', 'timestamp', 
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Convert PerformanceMetric table
SELECT create_hypertable('PerformanceMetric', 'timestamp',
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- Add compression policy (compress data older than 7 days)
ALTER TABLE Metric SET (
  timescaledb.compress,
  timescaledb.compress_orderby = 'timestamp DESC',
  timescaledb.compress_segmentby = 'workUnitId, name'
);

SELECT add_compression_policy('Metric', INTERVAL '7 days');

-- Add retention policy (delete data older than 1 year)
SELECT add_retention_policy('Metric', INTERVAL '1 year');
```

## 2. Continuous Aggregates (Real-time Materialized Views)

```sql
-- Create continuous aggregate for OEE metrics (1-minute buckets)
CREATE MATERIALIZED VIEW oee_1min
WITH (timescaledb.continuous) AS
SELECT 
  workUnitId,
  time_bucket('1 minute', timestamp) AS bucket,
  AVG(oeeScore) as avg_oee,
  AVG(availability) as avg_availability,
  AVG(performance) as avg_performance,
  AVG(quality) as avg_quality,
  COUNT(*) as sample_count
FROM PerformanceMetric
GROUP BY workUnitId, bucket
WITH NO DATA;

-- Add refresh policy
SELECT add_continuous_aggregate_policy('oee_1min',
  start_offset => INTERVAL '2 hours',
  end_offset => INTERVAL '1 minute',
  schedule_interval => INTERVAL '1 minute'
);

-- Create hierarchical aggregates (5min, 1hour, 1day)
CREATE MATERIALIZED VIEW oee_5min
WITH (timescaledb.continuous) AS
SELECT 
  workUnitId,
  time_bucket('5 minutes', bucket) AS bucket,
  AVG(avg_oee) as avg_oee,
  AVG(avg_availability) as avg_availability,
  AVG(avg_performance) as avg_performance,
  AVG(avg_quality) as avg_quality,
  SUM(sample_count) as sample_count
FROM oee_1min
GROUP BY workUnitId, bucket
WITH NO DATA;
```

## 3. Query Performance Patterns

### Analytics Query Optimization:

```typescript
// Bad: Scanning millions of rows
const data = await prisma.performanceMetric.findMany({
  where: {
    timestamp: { gte: startTime, lte: endTime },
    workUnitId: unitId
  }
});

// Good: Use continuous aggregates based on time range
const getOptimalAggregate = (timeRange: number) => {
  const hours = timeRange / (1000 * 60 * 60);
  
  if (hours <= 1) return 'oee_1min';      // Raw or 1-min data
  if (hours <= 6) return 'oee_5min';      // 5-minute aggregates
  if (hours <= 48) return 'oee_1hour';    // Hourly aggregates
  return 'oee_1day';                      // Daily aggregates
};

// Optimized query
const aggregate = getOptimalAggregate(endTime - startTime);
const data = await prisma.$queryRaw`
  SELECT 
    bucket as timestamp,
    avg_oee as value
  FROM ${Prisma.sql([aggregate])}
  WHERE workUnitId = ${unitId}
    AND bucket >= ${startTime}
    AND bucket <= ${endTime}
  ORDER BY bucket
`;
```

## 4. Caching Strategy

### Redis Integration:

```typescript
import Redis from 'ioredis';

class MetricsCache {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: 3
    });
  }

  async getOrFetch(key: string, ttl: number, fetchFn: () => Promise<any>) {
    // Try cache first
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch and cache
    const data = await fetchFn();
    await this.redis.setex(key, ttl, JSON.stringify(data));
    return data;
  }

  // Analytics cache key generation
  generateKey(params: {
    metric: string;
    workUnitId: string;
    timeRange: { from: string; to: string };
    aggregation: string;
  }): string {
    return `metrics:${params.metric}:${params.workUnitId}:${params.timeRange.from}:${params.timeRange.to}:${params.aggregation}`;
  }
}
```

## 5. Streaming Architecture

### WebSocket Streaming (like Analytics Live):

```typescript
class MetricsStreamer {
  private subscribers = new Map<string, Set<WebSocket>>();

  // Subscribe to real-time metrics
  subscribe(workUnitId: string, ws: WebSocket) {
    if (!this.subscribers.has(workUnitId)) {
      this.subscribers.set(workUnitId, new Set());
      this.startStreaming(workUnitId);
    }
    this.subscribers.get(workUnitId)!.add(ws);
  }

  private async startStreaming(workUnitId: string) {
    // Use PostgreSQL LISTEN/NOTIFY for real-time updates
    await prisma.$executeRaw`LISTEN metric_updates_${workUnitId}`;
    
    // Or use tailable cursor on metrics
    const stream = prisma.metric.findMany({
      where: { workUnitId },
      cursor: { timestamp: new Date() },
      take: 1,
      orderBy: { timestamp: 'desc' }
    });
  }

  // Broadcast updates to subscribers
  broadcast(workUnitId: string, data: any) {
    const subs = this.subscribers.get(workUnitId);
    if (subs) {
      const message = JSON.stringify(data);
      subs.forEach(ws => ws.send(message));
    }
  }
}
```

## 6. Query Batching and DataLoader Pattern

```typescript
import DataLoader from 'dataloader';

class MetricsDataLoader {
  private loader: DataLoader<string, any>;

  constructor() {
    this.loader = new DataLoader(
      async (keys: readonly string[]) => {
        // Batch multiple metric queries into one
        const results = await prisma.$queryRaw`
          SELECT 
            workUnitId,
            name as metric,
            AVG(value) as value,
            MAX(timestamp) as latest
          FROM Metric
          WHERE (workUnitId, name) IN (${Prisma.join(keys)})
            AND timestamp >= NOW() - INTERVAL '5 minutes'
          GROUP BY workUnitId, name
        `;
        
        // Map results back to keys
        return keys.map(key => results.find(r => 
          `${r.workUnitId}:${r.metric}` === key
        ));
      },
      {
        cache: true,
        batchScheduleFn: callback => setTimeout(callback, 10) // 10ms batch window
      }
    );
  }

  async getMetric(workUnitId: string, metric: string) {
    return this.loader.load(`${workUnitId}:${metric}`);
  }
}
```

## 7. Client-Side Optimizations

### Data Windowing (like Analytics):

```typescript
class DataWindow {
  private maxPoints = 1000; // Maximum points to render

  downsample(data: any[], targetPoints: number = this.maxPoints) {
    if (data.length <= targetPoints) return data;

    const bucketSize = data.length / targetPoints;
    const downsampled = [];

    for (let i = 0; i < targetPoints; i++) {
      const start = Math.floor(i * bucketSize);
      const end = Math.floor((i + 1) * bucketSize);
      const bucket = data.slice(start, end);

      // LTTB algorithm (Largest Triangle Three Buckets)
      downsampled.push(this.selectBestPoint(bucket));
    }

    return downsampled;
  }

  private selectBestPoint(bucket: any[]) {
    // Implement LTTB algorithm for optimal point selection
    // This preserves visual appearance while reducing points
    return bucket[Math.floor(bucket.length / 2)]; // Simplified
  }
}
```

## 8. Connection Pooling Configuration

```typescript
// Optimal Prisma configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings
  connectionLimit: 25,  // Match Analytics's default
  pool: {
    min: 5,
    max: 25,
    acquire: 60000,
    idle: 10000
  }
});
```

## 9. Performance Monitoring

```typescript
// Add query performance tracking
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const duration = Date.now() - start;

  // Log slow queries
  if (duration > 100) {
    console.warn(`Slow query (${duration}ms):`, params);
  }

  // Track metrics
  metricsCollector.recordQueryTime(params.model, params.action, duration);

  return result;
});
```

## Performance Targets (Analytics-level)

- **Query Response**: < 100ms for aggregated data
- **Dashboard Load**: < 2 seconds for complex dashboards
- **Real-time Updates**: < 50ms latency
- **Concurrent Users**: Support 1000+ concurrent dashboard viewers
- **Data Points**: Handle millions of data points efficiently

## Implementation Priority:

1. **TimescaleDB** - Immediate 10-100x performance boost
2. **Continuous Aggregates** - Pre-compute common queries
3. **Redis Caching** - Reduce database load
4. **WebSocket Streaming** - Real-time updates
5. **Client Optimization** - Smooth rendering