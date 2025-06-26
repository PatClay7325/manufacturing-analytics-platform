# Schema Migration Guide

## From Complex Schema to Optimized ISO 22400 Schema

This guide provides step-by-step instructions for migrating from the original complex 17-table schema or the oversimplified 7-table schema to the optimized 12-table ISO 22400 compliant schema.

## Migration Overview

### Schema Comparison

| Original Complex (17 tables) | Simplified (7 tables) | Optimized (12 tables) |
|----------------------------|---------------------|---------------------|
| Plant, Area, Line, Cell | Consolidated | Site, WorkCenter |
| WorkUnit + detailed types | Equipment only | Equipment with type field |
| 5 metric tables | 1 metric table | 3 time-series tables |
| Complex alert system | Removed | Basic maintenance events |
| Full user management | Basic user | User + Session |

### Key Improvements in Optimized Schema

1. **Balanced Hierarchy**: 2-level (Site → WorkCenter → Equipment) instead of 4-level
2. **Proper Time-Series**: Separate tables for states, counts, and quality
3. **ISO 22400 Compliance**: All required fields for OEE calculation
4. **TimescaleDB Native**: Designed for hypertables and continuous aggregates
5. **Shift Management**: Proper shift instance tracking

## Pre-Migration Checklist

- [ ] Backup existing database
- [ ] Document custom fields or tables
- [ ] Identify data retention requirements
- [ ] Plan downtime window
- [ ] Test migration in staging environment

## Migration Steps

### Step 1: Prepare New Schema

```bash
# Create new database
createdb manufacturing_analytics_optimized

# Apply optimized schema
psql manufacturing_analytics_optimized < prisma/migrations/iso22400-optimized.sql
```

### Step 2: Export Reference Data

Create export scripts for reference data:

```sql
-- Export sites/plants
COPY (
  SELECT 
    id,
    code,
    name,
    timezone,
    country
  FROM "Plant"
) TO '/tmp/sites_export.csv' WITH CSV HEADER;

-- Export work centers
COPY (
  SELECT 
    wc.id,
    wc.code,
    wc.name,
    p.code as site_code,
    'LINE' as work_center_type
  FROM "Line" wc
  JOIN "Area" a ON wc."areaId" = a.id
  JOIN "Plant" p ON a."plantId" = p.id
) TO '/tmp/workcenters_export.csv' WITH CSV HEADER;

-- Export equipment
COPY (
  SELECT 
    wu.id,
    wu.code,
    wu.name,
    l.code as workcenter_code,
    wu."workUnitType" as equipment_type,
    wu."nominalSpeed",
    wu."theoreticalCycleTime"
  FROM "WorkUnit" wu
  JOIN "Line" l ON wu."lineId" = l.id
) TO '/tmp/equipment_export.csv' WITH CSV HEADER;
```

### Step 3: Transform and Import Reference Data

```python
# migration_transform.py
import pandas as pd
import psycopg2
from datetime import datetime

def migrate_reference_data():
    # Read exported data
    sites_df = pd.read_csv('/tmp/sites_export.csv')
    workcenters_df = pd.read_csv('/tmp/workcenters_export.csv')
    equipment_df = pd.read_csv('/tmp/equipment_export.csv')
    
    # Connect to new database
    conn = psycopg2.connect("dbname=manufacturing_analytics_optimized")
    cur = conn.cursor()
    
    # Import sites
    for _, site in sites_df.iterrows():
        cur.execute("""
            INSERT INTO "Site" (id, code, name, timezone, country, "isActive")
            VALUES (%s, %s, %s, %s, %s, true)
        """, (site['id'], site['code'], site['name'], 
              site['timezone'] or 'UTC', site['country']))
    
    # Import work centers with mapping
    site_map = {}
    cur.execute('SELECT id, code FROM "Site"')
    for row in cur.fetchall():
        site_map[row[1]] = row[0]
    
    for _, wc in workcenters_df.iterrows():
        cur.execute("""
            INSERT INTO "WorkCenter" 
            (id, code, name, "siteId", "workCenterType", "isActive")
            VALUES (%s, %s, %s, %s, %s, true)
        """, (wc['id'], wc['code'], wc['name'], 
              site_map[wc['site_code']], wc['work_center_type']))
    
    conn.commit()
    conn.close()

# Run migration
migrate_reference_data()
```

### Step 4: Migrate Time-Series Data

```sql
-- Migrate equipment states from multiple sources
INSERT INTO equipment_states (
    timestamp,
    "equipmentId",
    state,
    "stateCategory",
    reason,
    "startTime",
    "endTime",
    "durationSeconds"
)
SELECT 
    om."timestamp",
    om."workUnitId" as "equipmentId",
    CASE 
        WHEN om."actualSpeed" > 0 THEN 'PRODUCING'
        WHEN dt."downtimeTypeId" IS NOT NULL THEN 'DOWN'
        ELSE 'IDLE'
    END as state,
    CASE 
        WHEN om."actualSpeed" > 0 THEN 'PRODUCTION'
        WHEN dt."isPlanned" = true THEN 'PLANNED'
        ELSE 'AVAILABILITY_LOSS'
    END as "stateCategory",
    dt."reason",
    COALESCE(dt."startTime", om."timestamp") as "startTime",
    dt."endTime",
    EXTRACT(EPOCH FROM (dt."endTime" - dt."startTime"))::INTEGER as "durationSeconds"
FROM "OperationalMetric" om
LEFT JOIN "DowntimeEvent" dt ON dt."workUnitId" = om."workUnitId"
    AND dt."startTime" <= om."timestamp" 
    AND (dt."endTime" IS NULL OR dt."endTime" > om."timestamp");

-- Migrate production counts
INSERT INTO production_counts (
    timestamp,
    "equipmentId",
    "totalCount",
    "goodCount",
    "rejectCount",
    "actualCycleTime"
)
SELECT 
    pm."timestamp",
    pm."workUnitId" as "equipmentId",
    pm."totalOutput" as "totalCount",
    pm."goodOutput" as "goodCount", 
    pm."defectiveOutput" as "rejectCount",
    pm."actualCycleTime"
FROM "ProductionMetric" pm
WHERE pm."totalOutput" > 0;

-- Migrate quality events
INSERT INTO quality_events (
    timestamp,
    "equipmentId",
    "eventType",
    "defectCode",
    quantity
)
SELECT 
    qm."timestamp",
    qm."workUnitId" as "equipmentId",
    'DEFECT' as "eventType",
    dt."code" as "defectCode",
    qm."defectCount" as quantity
FROM "QualityMetric" qm
JOIN "DefectType" dt ON dt.id = qm."defectTypeId"
WHERE qm."defectCount" > 0;
```

### Step 5: Create Hypertables and Indexes

```sql
-- Convert to hypertables
SELECT create_hypertable('equipment_states', 'timestamp', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

SELECT create_hypertable('production_counts', 'timestamp', 
    chunk_time_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

SELECT create_hypertable('quality_events', 'timestamp', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Add compression
ALTER TABLE equipment_states SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = '"equipmentId"',
    timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy('equipment_states', INTERVAL '7 days');
```

### Step 6: Calculate Historical OEE

```typescript
// calculate-historical-oee.ts
import { oeeCalculationService } from '@/services/oee-calculation-service';
import { prisma } from '@/lib/database';

async function calculateHistoricalOEE() {
  // Get all equipment
  const equipment = await prisma.equipment.findMany({
    where: { isActive: true }
  });

  // Get all shift instances for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const shiftInstances = await prisma.shiftInstance.findMany({
    where: {
      actualStartTime: { gte: thirtyDaysAgo }
    },
    orderBy: { actualStartTime: 'asc' }
  });

  console.log(`Calculating OEE for ${equipment.length} equipment across ${shiftInstances.length} shifts...`);

  for (const eq of equipment) {
    for (const shift of shiftInstances) {
      try {
        const oee = await oeeCalculationService.calculateOEE(
          eq.id,
          shift.actualStartTime,
          shift.actualEndTime || new Date(),
          shift.id
        );

        await oeeCalculationService.storeOEECalculation(
          eq.id,
          shift.id,
          oee
        );

        console.log(`✓ Calculated OEE for ${eq.code} on ${shift.shiftDate}: ${(oee.oee * 100).toFixed(1)}%`);
      } catch (error) {
        console.error(`✗ Failed to calculate OEE for ${eq.code} on ${shift.shiftDate}:`, error.message);
      }
    }
  }
}

calculateHistoricalOEE();
```

### Step 7: Verify Migration

```sql
-- Verify row counts
SELECT 
    'Sites' as table_name, COUNT(*) as row_count FROM "Site"
UNION ALL
SELECT 'WorkCenters', COUNT(*) FROM "WorkCenter"
UNION ALL
SELECT 'Equipment', COUNT(*) FROM "Equipment"
UNION ALL
SELECT 'Equipment States', COUNT(*) FROM equipment_states
UNION ALL
SELECT 'Production Counts', COUNT(*) FROM production_counts
UNION ALL
SELECT 'Quality Events', COUNT(*) FROM quality_events
UNION ALL
SELECT 'OEE Calculations', COUNT(*) FROM oee_calculations;

-- Verify OEE calculations are reasonable
SELECT 
    e.code as equipment_code,
    AVG(oc.oee) as avg_oee,
    MIN(oc.oee) as min_oee,
    MAX(oc.oee) as max_oee,
    COUNT(*) as calculation_count
FROM oee_calculations oc
JOIN "Equipment" e ON oc."equipmentId" = e.id
GROUP BY e.code
ORDER BY avg_oee DESC;

-- Check for data gaps
WITH state_gaps AS (
    SELECT 
        "equipmentId",
        "startTime",
        LAG("endTime") OVER (PARTITION BY "equipmentId" ORDER BY "startTime") as prev_end,
        "startTime" - LAG("endTime") OVER (PARTITION BY "equipmentId" ORDER BY "startTime") as gap
    FROM equipment_states
)
SELECT 
    "equipmentId",
    COUNT(*) as gap_count,
    AVG(EXTRACT(EPOCH FROM gap)/60) as avg_gap_minutes
FROM state_gaps
WHERE gap > INTERVAL '1 minute'
GROUP BY "equipmentId";
```

## Rollback Plan

If migration fails:

```bash
# 1. Stop application
systemctl stop manufacturing-analytics

# 2. Restore original database
pg_restore -d manufacturing_analytics /backup/pre_migration_backup.dump

# 3. Restart application with old schema
systemctl start manufacturing-analytics
```

## Post-Migration Tasks

1. **Update Application Code**
   ```bash
   # Generate new Prisma client
   npx prisma generate --schema=prisma/schema-iso22400-optimized.prisma
   ```

2. **Update API Endpoints**
   - Modify queries to use new table structure
   - Update field mappings

3. **Refresh Continuous Aggregates**
   ```sql
   CALL refresh_continuous_aggregate('oee_hourly', NULL, NULL);
   CALL refresh_continuous_aggregate('oee_daily_workcenter', NULL, NULL);
   ```

4. **Monitor Performance**
   - Check query execution times
   - Verify compression is working
   - Monitor disk usage

## Common Issues and Solutions

### Issue 1: Foreign Key Violations
**Solution**: Ensure all reference data is migrated before time-series data

### Issue 2: Duplicate Key Errors
**Solution**: Use ON CONFLICT clauses or check for existing records

### Issue 3: Performance Degradation
**Solution**: Run ANALYZE on all tables after migration

### Issue 4: Missing Historical Data
**Solution**: Extend the migration date range in Step 4

## Support

For migration assistance:
- Check logs in `/var/log/manufacturing-analytics/migration.log`
- Run validation script: `npm run validate-migration`
- Contact support with migration ID from logs