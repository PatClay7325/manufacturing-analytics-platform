# Prisma Best Practices for Manufacturing Analytics Platform

## Overview

This document outlines best practices for using Prisma with our TimescaleDB-based manufacturing analytics platform.

## Schema Design Principles

### 1. Single Source of Truth

**DO:**
- Maintain ONE production schema file: `prisma/schema.prisma`
- Use `schema-production.prisma` as the template
- Version control all schema changes

**DON'T:**
- Create multiple schema files for different environments
- Make manual database changes without updating Prisma schema
- Use different schemas for development and production

### 2. TimescaleDB Compatibility

**Required for Time-Series Tables:**
```prisma
model EquipmentState {
  // Composite primary key for partitioning
  timestamp     DateTime  @db.Timestamptz
  equipmentId   String    @db.VarChar(30)
  startTime     DateTime  @db.Timestamptz
  
  @@id([timestamp, equipmentId, startTime])
  @@map("equipment_states") // Match SQL table name
}
```

**Best Practices:**
- Use composite primary keys with timestamp first
- Use `@db.Timestamptz` for all timestamps
- Use `@db.VarChar(30)` for IDs to match CUID length
- Map model names to snake_case table names

### 3. Field Types and Constraints

**Recommended Field Types:**
```prisma
// IDs
id String @id @default(cuid()) @db.VarChar(30)

// Timestamps
createdAt DateTime @default(now()) @db.Timestamptz
updatedAt DateTime @updatedAt @db.Timestamptz

// Numbers
quantity Int                           // For counts
percentage Float @db.DoublePrecision   // For rates (0-1)
measurement Decimal @db.Decimal(10,4)  // For precise measurements

// Text
code String @db.VarChar(50)     // Short identifiers
name String @db.VarChar(255)    // Names
description String? @db.Text    // Long text
```

### 4. Relations and Indexes

**Always Include:**
```prisma
model Equipment {
  // Foreign keys
  workCenterId String @db.VarChar(30)
  
  // Relations
  workCenter WorkCenter @relation(fields: [workCenterId], references: [id])
  
  // Indexes for foreign keys
  @@index([workCenterId])
  @@index([equipmentType])
  @@index([currentState])
}
```

## Migration Best Practices

### 1. Migration Workflow

```bash
# 1. Make schema changes
# Edit prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name descriptive_migration_name

# 3. Review generated SQL
# Check prisma/migrations/*/migration.sql

# 4. Test in development
npm run dev

# 5. Deploy to production
npx prisma migrate deploy
```

### 2. Migration Naming

**Good Names:**
- `add_oee_calculations_table`
- `add_index_equipment_state`
- `rename_workunit_to_equipment`

**Bad Names:**
- `update`
- `fix`
- `changes`

### 3. Breaking Changes

**Before removing/renaming fields:**
1. Add new field/table
2. Migrate data
3. Update application code
4. Deploy
5. Remove old field/table in next release

## Query Optimization

### 1. Use Proper Selects

```typescript
// ❌ Bad - Fetches everything
const equipment = await prisma.equipment.findMany();

// ✅ Good - Select only needed fields
const equipment = await prisma.equipment.findMany({
  select: {
    id: true,
    code: true,
    name: true,
    currentState: true
  }
});
```

### 2. Pagination for Large Datasets

```typescript
// ❌ Bad - Could return millions of records
const states = await prisma.equipmentState.findMany();

// ✅ Good - Paginated query
const states = await prisma.equipmentState.findMany({
  take: 100,
  skip: page * 100,
  orderBy: { timestamp: 'desc' }
});
```

### 3. Use Raw Queries for Complex Operations

```typescript
// For time-series aggregations, use raw SQL
const oeeByHour = await prisma.$queryRaw`
  SELECT 
    time_bucket('1 hour', timestamp) as hour,
    AVG(oee) as avg_oee
  FROM oee_calculations
  WHERE "equipmentId" = ${equipmentId}
    AND timestamp >= ${startDate}
    AND timestamp <= ${endDate}
  GROUP BY hour
  ORDER BY hour
`;
```

## Testing with Prisma

### 1. Test Database Setup

```typescript
// test-setup.ts
import { PrismaClient } from '@prisma/client';

const testDbUrl = process.env.TEST_DATABASE_URL;
export const testPrisma = new PrismaClient({
  datasources: {
    db: { url: testDbUrl }
  }
});

// Clean database before each test
beforeEach(async () => {
  await testPrisma.$executeRaw`TRUNCATE TABLE equipment_states CASCADE`;
});
```

### 2. Mock Prisma in Unit Tests

```typescript
// __mocks__/prisma.ts
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

export const prismaMock = mockDeep<PrismaClient>();

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: prismaMock,
}));

beforeEach(() => {
  mockReset(prismaMock);
});
```

## Common Pitfalls and Solutions

### 1. N+1 Query Problem

```typescript
// ❌ Bad - Causes N+1 queries
const workCenters = await prisma.workCenter.findMany();
for (const wc of workCenters) {
  const equipment = await prisma.equipment.findMany({
    where: { workCenterId: wc.id }
  });
}

// ✅ Good - Single query with includes
const workCenters = await prisma.workCenter.findMany({
  include: {
    equipment: true
  }
});
```

### 2. Transaction Handling

```typescript
// ✅ Use transactions for related operations
const result = await prisma.$transaction(async (tx) => {
  const order = await tx.productionOrder.create({ data: orderData });
  
  await tx.equipmentState.create({
    data: {
      equipmentId: order.equipmentId,
      state: 'PRODUCING',
      productionOrderId: order.id
    }
  });
  
  return order;
});
```

### 3. Connection Pool Management

```typescript
// ✅ Singleton pattern for Prisma client
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    }
  }
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

## Maintenance Tasks

### 1. Regular Schema Validation

```bash
# Run weekly
npm run validate:schema

# Check for schema drift
npx prisma db pull --print
```

### 2. Performance Monitoring

```typescript
// Enable query logging in development
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
  ],
});

prisma.$on('query', (e) => {
  console.log(`Query: ${e.query}`);
  console.log(`Duration: ${e.duration}ms`);
});
```

### 3. Schema Documentation

Always document:
- Purpose of each model
- Meaning of enums
- Business rules in comments
- Indexes and their purpose

```prisma
/// Manufacturing equipment (ISO 22400: Work Unit)
/// Represents physical machines on the production floor
model Equipment {
  /// Unique identifier (CUID)
  id String @id @default(cuid()) @db.VarChar(30)
  
  /// SAP equipment number for integration
  sapEquipmentNumber String? @db.VarChar(50)
  
  /// Current operational state
  /// PRODUCING: Actively manufacturing
  /// IDLE: Available but not producing
  /// DOWN: Unplanned downtime
  /// PLANNED_STOP: Scheduled maintenance
  currentState String @default("STOPPED") @db.VarChar(20)
}
```

## Deployment Checklist

Before deploying schema changes:

- [ ] Schema validates: `npx prisma validate`
- [ ] Migration is reversible
- [ ] Indexes are added for new foreign keys
- [ ] Time-series tables have composite keys
- [ ] Documentation is updated
- [ ] Tests pass with new schema
- [ ] Performance impact assessed
- [ ] Backup plan documented

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [TimescaleDB Best Practices](https://docs.timescale.com/timescaledb/latest/how-to-guides/best-practices/)
- [ISO 22400 Standard](https://www.iso.org/standard/54497.html)
- Internal: `/docs/SCHEMA-MIGRATION-GUIDE.md`