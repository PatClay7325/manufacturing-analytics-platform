# Technical Architecture - ISO-Compliant AI Analytics Platform

## System Overview

```mermaid
graph TB
    subgraph "Existing Systems"
        SAP[SAP ERP]
        IGN[Ignition SCADA]
        MES[Other MES]
    end
    
    subgraph "Integration Layer"
        SAPCON[SAP Connector<br/>BAPI/OData]
        IGNCON[Ignition Connector<br/>SQL Gateway]
        MESCON[MES Adapters<br/>REST/CSV]
    end
    
    subgraph "Data Platform"
        ETL[ETL Service<br/>Node.js]
        PG[(PostgreSQL<br/>+ TimescaleDB)]
        PRISMA[Prisma ORM<br/>Type-safe API]
    end
    
    subgraph "Application Layer"
        API[GraphQL API<br/>w/ Guardrails]
        AI[AI Query Service<br/>OpenAI/Claude]
        DASH[Dashboard Service<br/>Next.js]
    end
    
    subgraph "User Interface"
        WEB[Web Dashboard]
        CHAT[AI Chat Interface]
        EMBED[Embedded Views<br/>SAP Fiori/PowerBI]
    end
    
    SAP --> SAPCON
    IGN --> IGNCON
    MES --> MESCON
    
    SAPCON --> ETL
    IGNCON --> ETL
    MESCON --> ETL
    
    ETL --> PG
    PG --> PRISMA
    PRISMA --> API
    PRISMA --> AI
    API --> DASH
    AI --> CHAT
    DASH --> WEB
    DASH --> EMBED
```

## Component Architecture

### 1. Data Connectors

```typescript
// Connector interface for extensibility
interface DataConnector {
  connect(): Promise<void>;
  testConnection(): Promise<boolean>;
  extractData(query: ExtractQuery): Promise<any[]>;
  getSchema(): Promise<SchemaDefinition>;
}

// SAP connector implementation
class SAPConnector implements DataConnector {
  private client: SAPClient;
  
  constructor(private config: SAPConfig) {
    this.client = new SAPClient({
      ashost: config.host,
      sysnr: config.systemNumber,
      client: config.client,
      user: config.user,
      passwd: config.password
    });
  }
  
  async extractData(query: ExtractQuery): Promise<any[]> {
    switch (query.type) {
      case 'equipment':
        return this.extractEquipment(query.filters);
      case 'production_orders':
        return this.extractProductionOrders(query.filters);
      case 'material_master':
        return this.extractMaterials(query.filters);
      default:
        throw new Error(`Unsupported query type: ${query.type}`);
    }
  }
  
  private async extractEquipment(filters: any) {
    // Use standard BAPI for equipment data
    const result = await this.client.invoke('BAPI_EQUI_GETLIST', {
      PLANT: filters.plant,
      EQUIPMENT_TYPE: 'M'
    });
    
    return result.EQUIPMENT_LIST.map(this.mapEquipment);
  }
}
```

### 2. Data Model (ISO-Compliant)

```sql
-- Core dimensional model based on ISO 22400-2
CREATE SCHEMA manufacturing;

-- Equipment hierarchy (ISO 14224 compliant)
CREATE TABLE manufacturing.dim_equipment (
    equipment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_code VARCHAR(50) UNIQUE NOT NULL,
    equipment_name VARCHAR(200) NOT NULL,
    
    -- ISO 14224 taxonomy
    taxonomy_level_1 VARCHAR(50), -- Industry
    taxonomy_level_2 VARCHAR(50), -- Business category  
    taxonomy_level_3 VARCHAR(50), -- Installation
    taxonomy_level_4 VARCHAR(50), -- Plant/Unit
    taxonomy_level_5 VARCHAR(50), -- Section/System
    taxonomy_level_6 VARCHAR(50), -- Equipment
    
    -- Reference to source systems
    sap_equipment_number VARCHAR(18),
    ignition_tag_path VARCHAR(500),
    
    -- Additional attributes
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    commissioned_date DATE,
    criticality_rating VARCHAR(20),
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- Time dimension with manufacturing calendar
CREATE TABLE manufacturing.dim_time (
    time_id TIMESTAMP PRIMARY KEY,
    date_actual DATE NOT NULL,
    year INT NOT NULL,
    quarter INT NOT NULL,
    month INT NOT NULL,
    week INT NOT NULL,
    day_of_month INT NOT NULL,
    day_of_week INT NOT NULL,
    
    -- Manufacturing specific
    shift_date DATE NOT NULL,
    shift_number INT NOT NULL,
    shift_name VARCHAR(20),
    is_working_day BOOLEAN DEFAULT TRUE,
    is_holiday BOOLEAN DEFAULT FALSE,
    holiday_name VARCHAR(100)
);

-- OEE metrics fact table (ISO 22400-2 KPIs)
CREATE TABLE manufacturing.fact_oee (
    time_bucket TIMESTAMPTZ NOT NULL,
    equipment_id UUID NOT NULL REFERENCES manufacturing.dim_equipment,
    
    -- Time categories in minutes
    calendar_time DECIMAL(10,2) NOT NULL,
    scheduled_time DECIMAL(10,2) NOT NULL,
    planned_busy_time DECIMAL(10,2) NOT NULL,
    actual_production_time DECIMAL(10,2) NOT NULL,
    
    -- Losses
    planned_downtime DECIMAL(10,2) DEFAULT 0,
    unplanned_downtime DECIMAL(10,2) DEFAULT 0,
    speed_loss DECIMAL(10,2) DEFAULT 0,
    quality_loss DECIMAL(10,2) DEFAULT 0,
    
    -- Production counts
    target_quantity DECIMAL(10,2),
    produced_quantity DECIMAL(10,2),
    good_quantity DECIMAL(10,2),
    scrap_quantity DECIMAL(10,2),
    rework_quantity DECIMAL(10,2),
    
    -- Calculated KPIs
    availability_rate DECIMAL(5,4),
    performance_rate DECIMAL(5,4),
    quality_rate DECIMAL(5,4),
    oee_rate DECIMAL(5,4),
    
    PRIMARY KEY (time_bucket, equipment_id)
);

-- Enable TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('manufacturing.fact_oee', 'time_bucket');
```

### 3. Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Equipment {
  id                 String   @id @default(uuid()) @map("equipment_id")
  code               String   @unique @map("equipment_code")
  name               String   @map("equipment_name")
  
  // ISO taxonomy
  taxonomyLevel1     String?  @map("taxonomy_level_1")
  taxonomyLevel2     String?  @map("taxonomy_level_2")
  taxonomyLevel3     String?  @map("taxonomy_level_3")
  taxonomyLevel4     String?  @map("taxonomy_level_4")
  taxonomyLevel5     String?  @map("taxonomy_level_5")
  taxonomyLevel6     String?  @map("taxonomy_level_6")
  
  // Source system references
  sapEquipmentNumber String?  @map("sap_equipment_number")
  ignitionTagPath    String?  @map("ignition_tag_path")
  
  // Attributes
  manufacturer       String?
  model             String?
  serialNumber      String?  @map("serial_number")
  commissionedDate  DateTime? @map("commissioned_date")
  criticalityRating String?   @map("criticality_rating")
  
  // Audit
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  createdBy         String?  @map("created_by")
  updatedBy         String?  @map("updated_by")
  
  // Relations
  oeeMetrics        OEEMetric[]
  
  @@map("dim_equipment")
  @@schema("manufacturing")
}

model OEEMetric {
  timeBucket            DateTime @map("time_bucket")
  equipmentId           String   @map("equipment_id")
  
  // Time categories
  calendarTime          Decimal  @map("calendar_time")
  scheduledTime         Decimal  @map("scheduled_time")
  plannedBusyTime       Decimal  @map("planned_busy_time")
  actualProductionTime  Decimal  @map("actual_production_time")
  
  // Losses
  plannedDowntime       Decimal  @map("planned_downtime")
  unplannedDowntime     Decimal  @map("unplanned_downtime")
  speedLoss             Decimal  @map("speed_loss")
  qualityLoss           Decimal  @map("quality_loss")
  
  // Production
  targetQuantity        Decimal? @map("target_quantity")
  producedQuantity      Decimal? @map("produced_quantity")
  goodQuantity          Decimal? @map("good_quantity")
  scrapQuantity         Decimal? @map("scrap_quantity")
  reworkQuantity        Decimal? @map("rework_quantity")
  
  // KPIs
  availabilityRate      Decimal  @map("availability_rate")
  performanceRate       Decimal  @map("performance_rate")
  qualityRate           Decimal  @map("quality_rate")
  oeeRate               Decimal  @map("oee_rate")
  
  // Relations
  equipment             Equipment @relation(fields: [equipmentId], references: [id])
  
  @@id([timeBucket, equipmentId])
  @@map("fact_oee")
  @@schema("manufacturing")
}
```

### 4. AI Query Service

```typescript
// AI service with schema awareness and guardrails
export class AIQueryService {
  private openai: OpenAI;
  private prisma: PrismaClient;
  private schemaContext: string;
  
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.prisma = new PrismaClient();
    this.schemaContext = this.generateSchemaContext();
  }
  
  private generateSchemaContext(): string {
    return `
You are a manufacturing analytics assistant with access to the following data:

Tables:
1. Equipment: Manufacturing equipment with hierarchy, criticality, and source system references
2. OEEMetric: Hourly OEE metrics including availability, performance, quality rates

You can query this data using Prisma. Always:
- Limit results to prevent overload (max 1000 rows)
- Only access allowed tables
- Apply user's plant/area filters
- Format numerical results appropriately
- Explain calculations when showing OEE metrics
    `;
  }
  
  async processQuery(
    naturalLanguageQuery: string,
    userContext: UserContext
  ): Promise<QueryResult> {
    // Step 1: Generate Prisma query from natural language
    const queryGeneration = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: this.schemaContext },
        { role: "system", content: `User has access to plants: ${userContext.allowedPlants.join(', ')}` },
        { role: "user", content: naturalLanguageQuery }
      ],
      functions: [{
        name: "execute_prisma_query",
        parameters: {
          type: "object",
          properties: {
            model: { type: "string", enum: ["equipment", "oeeMetric"] },
            method: { type: "string", enum: ["findMany", "findFirst", "aggregate"] },
            args: { type: "object" }
          }
        }
      }],
      function_call: { name: "execute_prisma_query" }
    });
    
    // Step 2: Validate and execute query
    const querySpec = JSON.parse(queryGeneration.choices[0].message.function_call.arguments);
    const validatedQuery = this.validateAndSanitizeQuery(querySpec, userContext);
    
    // Step 3: Execute with timeout and row limits
    const result = await this.executeQuery(validatedQuery);
    
    // Step 4: Format response
    return this.formatResponse(result, naturalLanguageQuery);
  }
  
  private validateAndSanitizeQuery(query: any, context: UserContext): any {
    // Ensure plant-level security
    if (!query.args.where) query.args.where = {};
    query.args.where.equipment = {
      taxonomyLevel4: { in: context.allowedPlants }
    };
    
    // Apply row limits
    if (query.method === 'findMany') {
      query.args.take = Math.min(query.args.take || 100, 1000);
    }
    
    return query;
  }
}
```

### 5. Dashboard Components

```typescript
// Lightweight, focused dashboard components
export const OEEDashboard: React.FC<{ equipmentId: string }> = ({ equipmentId }) => {
  const { data: current } = useOEECurrent(equipmentId);
  const { data: trend } = useOEETrend(equipmentId, '7d');
  const { data: losses } = useOEELosses(equipmentId, '24h');
  
  return (
    <div className="grid grid-cols-12 gap-4 p-4">
      {/* Current OEE */}
      <div className="col-span-3">
        <GaugeChart
          value={current?.oeeRate || 0}
          title="Current OEE"
          target={0.85}
          thresholds={[
            { value: 0.85, color: 'green', label: 'World Class' },
            { value: 0.65, color: 'yellow', label: 'Average' },
            { value: 0, color: 'red', label: 'Poor' }
          ]}
        />
      </div>
      
      {/* OEE Components */}
      <div className="col-span-3">
        <WaterfallChart
          title="OEE Components"
          data={[
            { name: 'Availability', value: current?.availabilityRate || 0 },
            { name: 'Performance', value: current?.performanceRate || 0 },
            { name: 'Quality', value: current?.qualityRate || 0 }
          ]}
        />
      </div>
      
      {/* Trend Chart */}
      <div className="col-span-6">
        <TimeSeriesChart
          title="OEE Trend (7 Days)"
          data={trend || []}
          lines={[
            { dataKey: 'oeeRate', name: 'OEE', color: '#2563eb' },
            { dataKey: 'target', name: 'Target', color: '#10b981', dashed: true }
          ]}
        />
      </div>
      
      {/* Loss Analysis */}
      <div className="col-span-12">
        <LossAnalysisTable
          title="Loss Analysis (24 Hours)"
          data={losses || []}
          columns={[
            { key: 'lossType', header: 'Loss Type' },
            { key: 'duration', header: 'Duration (min)' },
            { key: 'impact', header: 'OEE Impact (%)' },
            { key: 'reason', header: 'Reason' }
          ]}
        />
      </div>
    </div>
  );
};
```

## Deployment Architecture

```yaml
# docker-compose.yml for development
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_DB: manufacturing
      POSTGRES_USER: analytics
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
  
  app:
    build: .
    environment:
      DATABASE_URL: postgresql://analytics:${DB_PASSWORD}@postgres:5432/manufacturing
      REDIS_URL: redis://redis:6379
      OPENAI_API_KEY: ${OPENAI_API_KEY}
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    volumes:
      - ./src:/app/src
      - ./prisma:/app/prisma

volumes:
  postgres_data:
  redis_data:
```

## Security Architecture

```typescript
// Multi-layer security implementation
export class SecurityMiddleware {
  // 1. Authentication
  async authenticate(req: Request): Promise<User> {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new UnauthorizedError();
    
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return await prisma.user.findUnique({ where: { id: payload.userId } });
  }
  
  // 2. Authorization
  async authorize(user: User, resource: string, action: string): Promise<boolean> {
    const permissions = await this.getPermissions(user.roleId);
    return permissions.some(p => 
      p.resource === resource && p.actions.includes(action)
    );
  }
  
  // 3. Data-level security
  applyDataFilters(query: any, user: User): any {
    // Apply plant-level restrictions
    const allowedPlants = user.permissions.plants || [];
    
    return {
      ...query,
      where: {
        ...query.where,
        equipment: {
          taxonomyLevel4: { in: allowedPlants }
        }
      }
    };
  }
  
  // 4. Query validation
  validateQuery(query: any): void {
    // Prevent expensive operations
    if (query.include && Object.keys(query.include).length > 3) {
      throw new Error('Too many nested includes');
    }
    
    // Enforce row limits
    if (!query.take || query.take > 1000) {
      query.take = 1000;
    }
  }
}
```

## Performance Optimization

```typescript
// Caching layer for common queries
export class CacheService {
  private redis: Redis;
  private defaultTTL = 300; // 5 minutes
  
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }
  
  async set(key: string, value: any, ttl?: number): Promise<void> {
    await this.redis.setex(
      key,
      ttl || this.defaultTTL,
      JSON.stringify(value)
    );
  }
  
  // Intelligent cache key generation
  generateKey(model: string, method: string, args: any): string {
    const normalized = this.normalizeArgs(args);
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(normalized))
      .digest('hex');
    
    return `${model}:${method}:${hash}`;
  }
}
```

## Monitoring & Observability

```typescript
// Application metrics
export class MetricsService {
  private metrics = {
    queryDuration: new Histogram({
      name: 'query_duration_seconds',
      help: 'Query execution time',
      labelNames: ['model', 'method'],
      buckets: [0.1, 0.5, 1, 2, 5]
    }),
    
    activeUsers: new Gauge({
      name: 'active_users_total',
      help: 'Number of active users'
    }),
    
    dataFreshness: new Gauge({
      name: 'data_freshness_seconds',
      help: 'Time since last data sync',
      labelNames: ['source']
    })
  };
  
  recordQuery(model: string, method: string, duration: number): void {
    this.metrics.queryDuration
      .labels(model, method)
      .observe(duration);
  }
}
```

## Conclusion

This architecture provides a practical, production-ready implementation that:

1. **Integrates with existing systems** rather than replacing them
2. **Focuses on analytics** not transactional processing  
3. **Provides clear value** through AI-powered insights
4. **Maintains security** with multi-layer controls
5. **Scales appropriately** for the defined use case

The key is maintaining discipline around scope while delivering exceptional value within those boundaries.

---
*Architecture Version: 1.0*  
*Aligned with Executive Blueprint*  
*Last Updated: 2024-12-24*