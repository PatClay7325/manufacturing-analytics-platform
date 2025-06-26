# Production-Ready Implementation Plan

## Overview

This plan addresses the critical failures identified in the senior engineer's review, transforming the system into a truly production-ready platform.

## Phase 1: Prisma-First Architecture (Week 1)

### 1.1 Complete Prisma Schema Definition

```prisma
// schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions", "views", "multiSchema"]
}

datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
  extensions        = [pgcrypto, pg_stat_statements, btree_gin]
  schemas           = ["public", "monitoring", "audit"]
}

// Dimension Tables
model Equipment {
  id               Int                @id @default(autoincrement()) @map("equipment_id")
  code             String             @unique @db.VarChar(50) @map("equipment_code")
  name             String             @db.VarChar(100) @map("equipment_name")
  model            String?            @db.VarChar(100)
  manufacturer     String?            @db.VarChar(100)
  serialNumber     String?            @db.VarChar(100) @map("serial_number")
  workCenterId     Int                @map("work_center_id")
  isActive         Boolean            @default(true) @map("is_active")
  attributes       Json?              @db.JsonB
  createdAt        DateTime           @default(now()) @map("created_at")
  updatedAt        DateTime           @updatedAt @map("updated_at")
  
  // Relations
  workCenter       WorkCenter         @relation(fields: [workCenterId], references: [id])
  production       Production[]
  downtime         Downtime[]
  sensorEvents     SensorEvent[]
  maintenanceEvents MaintenanceEvent[]
  
  // Indexes
  @@index([workCenterId, isActive])
  @@index([code])
  @@index([attributes], type: Gin)
  @@map("dim_equipment")
}

model Production {
  id                    BigInt    @id @default(autoincrement()) @map("production_id")
  equipmentId           Int       @map("equipment_id")
  shiftId               Int       @map("shift_id")
  productId             Int       @map("product_id")
  orderId               String?   @db.VarChar(50) @map("order_id")
  batchNumber           String?   @db.VarChar(50) @map("batch_number")
  startTime             DateTime  @map("start_time")
  endTime               DateTime  @map("end_time")
  plannedProductionTime BigInt    @map("planned_production_time") // seconds
  operatingTime         BigInt    @map("operating_time") // seconds
  totalPartsProduced    Int       @map("total_parts_produced")
  goodParts             Int       @map("good_parts")
  scrapParts            Int       @default(0) @map("scrap_parts")
  reworkParts           Int       @default(0) @map("rework_parts")
  createdAt             DateTime  @default(now()) @map("created_at")
  
  // Relations
  equipment             Equipment @relation(fields: [equipmentId], references: [id])
  shift                 Shift     @relation(fields: [shiftId], references: [id])
  product               Product   @relation(fields: [productId], references: [id])
  
  // Indexes
  @@index([equipmentId, startTime(sort: Desc)])
  @@index([productId, startTime(sort: Desc)])
  @@index([startTime(sort: Desc), endTime])
  @@map("fact_production")
}

// Add check constraints via migration
// Implement event sourcing for sensor data instead of direct storage
```

### 1.2 Migration Strategy

```typescript
// prisma/migrations/20250625_production_ready/migration.sql
-- Add check constraints properly
ALTER TABLE fact_production 
ADD CONSTRAINT chk_production_valid CHECK (
  end_time > start_time AND
  operating_time <= planned_production_time AND
  good_parts <= total_parts_produced AND
  (good_parts + scrap_parts + rework_parts) <= total_parts_produced
) NOT VALID;

-- Validate constraint in background
ALTER TABLE fact_production VALIDATE CONSTRAINT chk_production_valid;
```

### 1.3 Type-Safe Repository Pattern

```typescript
// src/repositories/equipment.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { Equipment, Prisma } from '@prisma/client';

@Injectable()
export class EquipmentRepository {
  constructor(private prisma: PrismaService) {}

  async findActive(
    workCenterId?: number,
    options?: {
      include?: Prisma.EquipmentInclude;
      take?: number;
      skip?: number;
    }
  ): Promise<Equipment[]> {
    return this.prisma.equipment.findMany({
      where: {
        isActive: true,
        ...(workCenterId && { workCenterId }),
      },
      include: options?.include,
      take: options?.take,
      skip: options?.skip,
      orderBy: { name: 'asc' },
    });
  }

  async findWithRecentProduction(
    equipmentId: number,
    days: number = 7
  ): Promise<Equipment & { production: Production[] }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.prisma.equipment.findUniqueOrThrow({
      where: { id: equipmentId },
      include: {
        production: {
          where: { startTime: { gte: since } },
          orderBy: { startTime: 'desc' },
          take: 100,
        },
      },
    });
  }
}
```

## Phase 2: Event-Driven Architecture (Week 2)

### 2.1 Replace Synchronous Triggers with Event Sourcing

```typescript
// src/events/audit-event.handler.ts
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { AuditEventStore } from '../services/audit-event-store.service';

export class EntityUpdatedEvent {
  constructor(
    public readonly entityName: string,
    public readonly entityId: string,
    public readonly changes: any,
    public readonly userId: string,
    public readonly timestamp: Date
  ) {}
}

@EventsHandler(EntityUpdatedEvent)
export class AuditEventHandler implements IEventHandler<EntityUpdatedEvent> {
  constructor(private eventStore: AuditEventStore) {}

  async handle(event: EntityUpdatedEvent) {
    // Async audit logging
    await this.eventStore.append({
      streamId: `${event.entityName}-${event.entityId}`,
      eventType: 'EntityUpdated',
      data: event.changes,
      metadata: {
        userId: event.userId,
        timestamp: event.timestamp,
      },
    });
  }
}
```

### 2.2 Implement CQRS for Analytics

```typescript
// src/cqrs/queries/oee-query.handler.ts
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ClickHouseService } from '../services/clickhouse.service';

export class GetOEEQuery {
  constructor(
    public readonly equipmentId: number,
    public readonly startDate: Date,
    public readonly endDate: Date
  ) {}
}

@QueryHandler(GetOEEQuery)
export class GetOEEQueryHandler implements IQueryHandler<GetOEEQuery> {
  constructor(private clickhouse: ClickHouseService) {}

  async execute(query: GetOEEQuery) {
    // Read from optimized analytics database
    const result = await this.clickhouse.query(`
      SELECT 
        toDate(start_time) as date,
        availability,
        performance,
        quality,
        availability * performance * quality as oee
      FROM oee_daily
      WHERE equipment_id = {equipmentId:UInt32}
        AND date >= {startDate:Date}
        AND date <= {endDate:Date}
      ORDER BY date
    `, {
      equipmentId: query.equipmentId,
      startDate: query.startDate,
      endDate: query.endDate,
    });

    return result.rows;
  }
}
```

## Phase 3: Performance & Scalability (Week 3)

### 3.1 Proper Connection Pooling

```typescript
// src/config/database.config.ts
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

export const createPrismaClient = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'production' 
      ? ['error'] 
      : ['query', 'info', 'warn', 'error'],
    // Connection pool configuration
    __internal: {
      engine: {
        connection_string: process.env.DATABASE_URL,
        pool_size: 25,
        statement_cache_size: 1000,
        query_timeout: 30000,
        connect_timeout: 10000,
        socket_timeout: 60000,
        // PgBouncer compatibility
        pgbouncer: true,
        statement_timeout: 30000,
      },
    },
  });
};

// PgBouncer configuration
export const pgBouncerConfig = {
  databases: {
    manufacturing: {
      host: process.env.DB_HOST,
      port: 5432,
      dbname: 'manufacturing_db',
      pool_mode: 'transaction',
      max_client_conn: 1000,
      default_pool_size: 25,
      min_pool_size: 10,
      reserve_pool_size: 5,
      reserve_pool_timeout: 3,
      max_db_connections: 100,
      log_connections: 1,
      log_disconnections: 1,
    },
  },
};
```

### 3.2 Implement Read Replicas

```typescript
// src/services/read-replica.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ReadReplicaService {
  private readReplicas: PrismaClient[] = [];
  private currentIndex = 0;

  constructor() {
    const replicaUrls = process.env.READ_REPLICA_URLS?.split(',') || [];
    
    this.readReplicas = replicaUrls.map(url => 
      new PrismaClient({
        datasources: { db: { url } },
        log: ['error'],
      })
    );
  }

  // Round-robin load balancing
  getReadClient(): PrismaClient {
    if (this.readReplicas.length === 0) {
      throw new Error('No read replicas configured');
    }
    
    const client = this.readReplicas[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.readReplicas.length;
    return client;
  }

  async executeQuery<T>(
    query: (prisma: PrismaClient) => Promise<T>
  ): Promise<T> {
    const client = this.getReadClient();
    try {
      return await query(client);
    } catch (error) {
      // Fallback to primary if replica fails
      console.error('Read replica failed, falling back to primary', error);
      return query(this.primaryClient);
    }
  }
}
```

### 3.3 Optimize Queries with Proper Indexes

```sql
-- Optimized indexes based on actual query patterns
CREATE INDEX CONCURRENTLY idx_production_equipment_time 
ON fact_production(equipment_id, start_time DESC) 
INCLUDE (total_parts_produced, good_parts, operating_time, planned_production_time)
WHERE end_time IS NOT NULL;

-- Partial index for active records
CREATE INDEX CONCURRENTLY idx_equipment_active 
ON dim_equipment(work_center_id, code) 
WHERE is_active = true;

-- BRIN index for time-series with optimal configuration
CREATE INDEX idx_sensor_event_time_brin 
ON fact_sensor_event USING BRIN(event_ts) 
WITH (pages_per_range = 32, autosummarize = on);

-- Proper JSONB GIN index
CREATE INDEX idx_equipment_attributes_gin 
ON dim_equipment USING GIN(attributes jsonb_path_ops)
WHERE attributes IS NOT NULL;
```

## Phase 4: Security Implementation (Week 4)

### 4.1 Implement Proper RLS with Prisma

```typescript
// src/middleware/tenant-isolation.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantIsolationMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID required' });
    }

    // Set PostgreSQL session variable for RLS
    await prisma.$executeRaw`SET LOCAL app.current_tenant_id = ${tenantId}`;
    
    next();
  }
}

// Prisma extension for automatic tenant filtering
const xprisma = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // Automatically add tenant filter
        if (['findMany', 'findFirst', 'findUnique'].includes(operation)) {
          args.where = {
            ...args.where,
            tenantId: getCurrentTenantId(),
          };
        }
        
        return query(args);
      },
    },
  },
});
```

### 4.2 Implement Column-Level Encryption

```typescript
// src/services/encryption.service.ts
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyDerivation = 'pbkdf2';
  
  async encryptField(
    data: string,
    fieldName: string,
    entityId: string
  ): Promise<{ encrypted: Buffer; metadata: EncryptionMetadata }> {
    // Use field-specific key derivation
    const key = await this.deriveKey(fieldName, entityId);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      metadata: {
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        algorithm: this.algorithm,
        keyId: await this.getCurrentKeyId(),
      },
    };
  }

  // Transparent encryption via Prisma middleware
  static createEncryptionMiddleware() {
    return prisma.$use(async (params, next) => {
      // Encrypt sensitive fields before write
      if (params.model === 'User' && params.action === 'create') {
        if (params.args.data.email) {
          params.args.data.emailEncrypted = await encryptionService.encryptField(
            params.args.data.email,
            'email',
            params.args.data.id
          );
          delete params.args.data.email;
        }
      }
      
      const result = await next(params);
      
      // Decrypt sensitive fields after read
      if (params.model === 'User' && result) {
        if (result.emailEncrypted) {
          result.email = await encryptionService.decryptField(
            result.emailEncrypted,
            'email',
            result.id
          );
          delete result.emailEncrypted;
        }
      }
      
      return result;
    });
  }
}
```

## Phase 5: Monitoring & Observability (Week 5)

### 5.1 Prometheus Integration

```typescript
// src/metrics/database.metrics.ts
import { Injectable } from '@nestjs/common';
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class DatabaseMetrics {
  private readonly queryDuration: Histogram<string>;
  private readonly queryErrors: Counter<string>;
  private readonly activeConnections: Gauge<string>;
  private readonly poolSize: Gauge<string>;

  constructor(private readonly registry: Registry) {
    this.queryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'model', 'status'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [registry],
    });

    this.queryErrors = new Counter({
      name: 'db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['operation', 'model', 'error_type'],
      registers: [registry],
    });

    this.activeConnections = new Gauge({
      name: 'db_active_connections',
      help: 'Number of active database connections',
      labelNames: ['pool'],
      registers: [registry],
    });

    this.poolSize = new Gauge({
      name: 'db_pool_size',
      help: 'Database connection pool size',
      labelNames: ['pool'],
      registers: [registry],
    });
  }

  // Prisma instrumentation
  instrumentPrisma(prisma: PrismaClient) {
    prisma.$use(async (params, next) => {
      const start = Date.now();
      const labels = {
        operation: params.action,
        model: params.model || 'raw',
      };

      try {
        const result = await next(params);
        const duration = (Date.now() - start) / 1000;
        
        this.queryDuration.observe(
          { ...labels, status: 'success' },
          duration
        );
        
        return result;
      } catch (error) {
        const duration = (Date.now() - start) / 1000;
        
        this.queryDuration.observe(
          { ...labels, status: 'error' },
          duration
        );
        
        this.queryErrors.inc({
          ...labels,
          error_type: error.constructor.name,
        });
        
        throw error;
      }
    });
  }
}
```

### 5.2 Distributed Tracing

```typescript
// src/tracing/tracing.module.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

export const initializeTracing = () => {
  const sdk = new NodeSDK({
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new PrismaInstrumentation({
        middleware: true,
      }),
    ],
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'manufacturing-analytics',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version,
    }),
    spanProcessor: new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      })
    ),
  });

  sdk.start();
};
```

## Phase 6: Testing & Quality Assurance (Week 6)

### 6.1 Database Testing Strategy

```typescript
// src/testing/database-test.utils.ts
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

export class DatabaseTestUtils {
  private static testDbUrl: string;
  
  static async setupTestDatabase(): Promise<PrismaClient> {
    // Create isolated test database
    const testDbName = `test_${process.env.JEST_WORKER_ID}_${Date.now()}`;
    const testDbUrl = process.env.DATABASE_URL.replace('/manufacturing_db', `/${testDbName}`);
    
    // Create test database
    execSync(`createdb ${testDbName}`);
    
    // Run migrations
    execSync(`DATABASE_URL=${testDbUrl} npx prisma migrate deploy`);
    
    // Create test client
    const prisma = new PrismaClient({
      datasources: { db: { url: testDbUrl } },
    });
    
    await prisma.$connect();
    
    return prisma;
  }

  static async teardownTestDatabase(prisma: PrismaClient, dbName: string) {
    await prisma.$disconnect();
    execSync(`dropdb ${dbName}`);
  }

  static async seedTestData(prisma: PrismaClient) {
    // Use factories for consistent test data
    const equipment = await EquipmentFactory.create(prisma, {
      code: 'TEST-001',
      name: 'Test Equipment',
    });

    const production = await ProductionFactory.createList(prisma, 10, {
      equipmentId: equipment.id,
    });

    return { equipment, production };
  }
}
```

### 6.2 Performance Testing

```typescript
// src/testing/performance.test.ts
import autocannon from 'autocannon';

describe('Performance Tests', () => {
  test('OEE calculation endpoint', async () => {
    const result = await autocannon({
      url: 'http://localhost:3000/api/oee/1',
      connections: 100,
      pipelining: 10,
      duration: 30,
      headers: {
        'Authorization': 'Bearer test-token',
        'X-Tenant-Id': 'test-tenant',
      },
    });

    expect(result.requests.average).toBeGreaterThan(1000); // >1000 req/s
    expect(result.latency.p99).toBeLessThan(100); // <100ms p99
    expect(result.errors).toBe(0);
  });

  test('Concurrent write performance', async () => {
    const promises = Array.from({ length: 1000 }, (_, i) => 
      prisma.production.create({
        data: ProductionFactory.build({ equipmentId: i % 10 + 1 }),
      })
    );

    const start = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000); // <5s for 1000 inserts
  });
});
```

## Phase 7: Deployment & Operations (Week 7)

### 7.1 Blue-Green Deployment

```yaml
# kubernetes/deployment.yaml
apiVersion: v1
kind: Service
metadata:
  name: manufacturing-api
spec:
  selector:
    app: manufacturing-api
    version: active
  ports:
    - port: 80
      targetPort: 3000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: manufacturing-api-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: manufacturing-api
      version: blue
  template:
    metadata:
      labels:
        app: manufacturing-api
        version: blue
    spec:
      containers:
      - name: api
        image: manufacturing-api:${BLUE_VERSION}
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 7.2 Database Migration Strategy

```typescript
// src/migrations/migration-runner.ts
export class MigrationRunner {
  async runWithZeroDowntime(migration: Migration) {
    // 1. Add new columns as nullable
    await this.addNewColumns(migration);
    
    // 2. Deploy new code that writes to both old and new
    await this.deployDualWriteVersion();
    
    // 3. Backfill data
    await this.backfillData(migration);
    
    // 4. Deploy new code that reads from new columns
    await this.deployNewReadVersion();
    
    // 5. Drop old columns
    await this.dropOldColumns(migration);
  }

  private async backfillData(migration: Migration) {
    const batchSize = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const updated = await prisma.$executeRaw`
        UPDATE ${migration.table}
        SET ${migration.newColumn} = ${migration.transformation}
        WHERE ${migration.newColumn} IS NULL
        LIMIT ${batchSize}
      `;

      hasMore = updated === batchSize;
      offset += batchSize;

      // Avoid replication lag
      await this.sleep(100);
    }
  }
}
```

## Success Criteria

### Performance
- [ ] <100ms p99 latency for reads
- [ ] >1000 writes/second sustained
- [ ] <5% CPU under normal load
- [ ] Zero data loss during deployments

### Security
- [ ] All PII encrypted at rest
- [ ] Row-level security enforced
- [ ] Audit trail immutable
- [ ] Penetration test passed

### Reliability
- [ ] 99.99% uptime SLA
- [ ] <1 minute failover time
- [ ] Point-in-time recovery tested
- [ ] Disaster recovery plan tested

### Monitoring
- [ ] All queries tracked
- [ ] Alerts for anomalies
- [ ] Performance dashboards
- [ ] Cost tracking enabled

This is what production-ready actually looks like.