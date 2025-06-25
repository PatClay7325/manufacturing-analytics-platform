# ISO-Compliant Manufacturing Analytics Implementation SOP

## Purpose
This Standard Operating Procedure (SOP) establishes the single source of truth for the Manufacturing Analytics Platform database schema, implementing ISO 22400 (OEE), ISO 9001 (Quality), and ISO 14224 (Reliability) standards with AI-ready enhancements.

## Scope
This SOP covers:
- Complete database schema redesign
- Removal of legacy/conflicting schemas
- Implementation of ISO-compliant data models
- AI-ready synonym mapping and materialized views
- Automated data population for development
- Performance optimization with partitioning

## Prerequisites
- PostgreSQL 15+ with TimescaleDB extension
- Prisma CLI installed
- Node.js 18+
- Docker environment running

## Implementation Steps

### Step 1: Backup and Clean Existing Data
**Responsible Party:** Database Administrator  
**Estimated Time:** 30 minutes

1. Create backup of existing data:
   ```bash
   docker exec manufacturing-timescaledb pg_dump -U postgres -d manufacturing > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. Stop all services:
   ```bash
   docker-compose down
   ```

3. Clean existing volumes (WARNING: This will delete all data):
   ```bash
   docker volume rm manufacturing-analytics-platform_timescaledb-data
   docker volume rm manufacturing-analytics-platform_superset-db-data
   ```

### Step 2: Initialize Clean Database
**Responsible Party:** Database Administrator  
**Estimated Time:** 15 minutes

1. Start only the database service:
   ```bash
   docker-compose up -d timescaledb
   ```

2. Wait for database to be ready:
   ```bash
   docker exec manufacturing-timescaledb pg_isready -U postgres
   ```

3. Create clean database:
   ```bash
   docker exec manufacturing-timescaledb psql -U postgres -c "DROP DATABASE IF EXISTS manufacturing;"
   docker exec manufacturing-timescaledb psql -U postgres -c "CREATE DATABASE manufacturing;"
   ```

### Step 3: Apply ISO-Compliant Schema
**Responsible Party:** Database Administrator  
**Estimated Time:** 45 minutes

Execute the schema creation script:
```bash
docker exec -i manufacturing-timescaledb psql -U postgres -d manufacturing < scripts/iso-compliant-schema.sql
```

### Step 4: Update Prisma Schema
**Responsible Party:** Backend Developer  
**Estimated Time:** 30 minutes

1. Backup existing Prisma schema:
   ```bash
   cp prisma/schema.prisma prisma/schema.prisma.backup
   ```

2. Replace with ISO-compliant schema:
   ```bash
   cp prisma/schema-iso-compliant.prisma prisma/schema.prisma
   ```

3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

### Step 5: Populate Development Data
**Responsible Party:** Data Engineer  
**Estimated Time:** 45 minutes

Execute data population scripts:
```bash
npm run seed:iso-compliant
```

### Step 6: Create Materialized Views
**Responsible Party:** Database Administrator  
**Estimated Time:** 20 minutes

Execute view creation script:
```bash
docker exec -i manufacturing-timescaledb psql -U postgres -d manufacturing < scripts/create-materialized-views.sql
```

### Step 7: Set Up Automated Jobs
**Responsible Party:** DevOps Engineer  
**Estimated Time:** 30 minutes

1. Install pg_cron extension:
   ```bash
   docker exec manufacturing-timescaledb psql -U postgres -d manufacturing -c "CREATE EXTENSION IF NOT EXISTS pg_cron;"
   ```

2. Schedule automated jobs:
   ```bash
   docker exec -i manufacturing-timescaledb psql -U postgres -d manufacturing < scripts/schedule-automated-jobs.sql
   ```

### Step 8: Verify Implementation
**Responsible Party:** QA Engineer  
**Estimated Time:** 30 minutes

Run verification script:
```bash
npm run verify:iso-compliance
```

## Data Model Overview

### Dimension Tables
- `dim_date`: Calendar dimension with fiscal periods
- `dim_time`: Time of day dimension (minute granularity)
- `dim_shift`: Work shift definitions
- `dim_equipment`: Equipment master data with JSON attributes
- `dim_product`: Product specifications
- `dim_unit_of_measure`: Standardized units
- `dim_quality_defect_type`: Quality defect classifications
- `dim_downtime_reason`: Downtime categorization (ISO 14224)
- `dim_date_range`: Named date ranges for queries

### Fact Tables
- `fact_production`: Core production events
- `fact_downtime`: Equipment downtime records
- `fact_quality`: Quality inspection results
- `fact_scrap`: Scrap and waste tracking
- `fact_sensor_event`: High-volume sensor data (partitioned)

### AI-Ready Components
- `ontology_term`: Synonym mapping for natural language queries
- Materialized views for pre-aggregated metrics
- Audit log with JSONB for complete traceability

## Maintenance Procedures

### Daily Tasks
- Verify automated job execution
- Monitor partition health
- Check materialized view refresh status

### Weekly Tasks
- Review audit logs for anomalies
- Validate data quality metrics
- Update ontology terms based on user queries

### Monthly Tasks
- Create new partitions for sensor data
- Archive old audit logs
- Performance tune slow queries

## Troubleshooting

### Common Issues

1. **Materialized view refresh fails**
   - Check disk space
   - Verify source table integrity
   - Review pg_cron logs

2. **Partition creation fails**
   - Ensure sufficient privileges
   - Check date calculations
   - Verify partition naming conventions

3. **AI queries return incorrect data**
   - Update ontology_term mappings
   - Refresh materialized views
   - Check synonym priorities

## Change Management

All schema changes must:
1. Be reviewed by the Data Architecture team
2. Include migration scripts for both upgrade and rollback
3. Update this SOP document
4. Be tested in staging environment
5. Include updated Prisma schema

## Compliance Verification

Run monthly compliance checks:
```bash
npm run audit:iso-compliance
```

This generates a report verifying:
- ISO 22400 OEE calculations
- ISO 9001 quality metrics
- ISO 14224 reliability indicators
- Data retention policies
- Audit trail completeness

## Contact Information

- **Database Administrator:** dba@manufacturing.com
- **Data Architecture Team:** data-arch@manufacturing.com
- **Emergency Support:** +1-555-0123 (24/7)

## Document Control

- **Version:** 1.0
- **Effective Date:** December 2024
- **Review Date:** June 2025
- **Owner:** Data Architecture Team
- **Approval:** CTO

---

**Note:** This document supersedes all previous database schemas and is the authoritative source for the Manufacturing Analytics Platform data model.