# Next.js + Apache Superset Integration Guide

## Overview

This guide documents the complete integration between your Next.js manufacturing analytics platform and Apache Superset for embedded dashboards and reporting.

## Architecture

```
┌─────────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Next.js App       │────▶│  Apache Superset │────▶│   TimescaleDB    │
│   (Port 3000)       │     │   (Port 8088)   │     │  (Manufacturing) │
└─────────────────────┘     └──────────────────┘     └──────────────────┘
         │                           │
         └───── Guest Token ─────────┘
              Authentication
```

## Quick Start

1. **Start all services**:
   ```cmd
   start-superset-integration.cmd
   ```
   Or manually:
   ```bash
   docker-compose up -d
   ```

2. **Access the applications**:
   - Next.js App: http://localhost:3000
   - Apache Superset: http://localhost:8088 (admin/admin)

3. **View embedded dashboards**:
   - Navigate to: http://localhost:3000/analytics
   - Or manage dashboards: http://localhost:3000/dashboards/manage

## Integration Features

### 1. Embedded Dashboards
- Dashboards are embedded using iframes with guest tokens
- No separate login required for end users
- Automatic token refresh every 5 minutes
- Full-screen mode support

### 2. API Integration
- `/api/analytics/guest-token` - Generate guest tokens
- `/api/superset/dashboards` - List available dashboards
- SupersetClient library for advanced operations

### 3. Components

#### SimpleSupersetDashboard
Basic embedded dashboard component:
```tsx
import { SimpleSupersetDashboard } from '@/components/analytics/SimpleSupersetDashboard';

<SimpleSupersetDashboard
  dashboardId="1"
  title="Production Overview"
  height={800}
  filters={{ time_range: 'Last 24 hours' }}
/>
```

#### Dashboard Management
Full CRUD operations from Next.js:
- List all dashboards
- Preview in modal
- Direct edit in Superset
- Export functionality

## Creating Dashboards

### 1. Connect to Manufacturing Database
The Manufacturing TimescaleDB is automatically connected on startup.

### 2. Create Datasets
1. Go to Data → Datasets → + Dataset
2. Select "Manufacturing TimescaleDB"
3. Choose your table (e.g., production_metrics, equipment_status)
4. Save

### 3. Build Charts
1. Go to Charts → + Chart
2. Select your dataset
3. Choose visualization type:
   - Time-series for production trends
   - Big Number for KPIs
   - Table for equipment status
   - Gauge for OEE metrics

### 4. Assemble Dashboard
1. Go to Dashboards → + Dashboard
2. Drag and drop your charts
3. Add filters for date range, equipment, etc.
4. Save and get the dashboard ID

### 5. Embed in Next.js
Update the dashboard IDs in `/src/app/analytics/page.tsx`:
```tsx
const dashboards = {
  production: 'your-production-dashboard-id',
  quality: 'your-quality-dashboard-id',
  equipment: 'your-equipment-dashboard-id',
  overview: 'your-overview-dashboard-id'
};
```

## Sample Manufacturing Queries

### Production Overview
```sql
SELECT 
  time_bucket('1 hour', timestamp) as hour,
  SUM(units_produced) as total_production,
  AVG(oee_score) * 100 as avg_oee,
  SUM(units_defective) as defects
FROM production_metrics
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

### Equipment Status Matrix
```sql
SELECT 
  equipment_id,
  equipment_name,
  status,
  ROUND(AVG(availability) * 100, 1) as availability_pct,
  ROUND(AVG(performance) * 100, 1) as performance_pct,
  ROUND(AVG(quality) * 100, 1) as quality_pct,
  ROUND(AVG(oee_score) * 100, 1) as oee_pct
FROM equipment_metrics
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY equipment_id, equipment_name, status
ORDER BY oee_pct DESC;
```

### Quality Trends
```sql
WITH daily_quality AS (
  SELECT 
    date_trunc('day', timestamp) as day,
    product_type,
    COUNT(*) as total_units,
    SUM(CASE WHEN quality_check = 'PASS' THEN 1 ELSE 0 END) as passed_units
  FROM quality_inspections
  WHERE timestamp > NOW() - INTERVAL '30 days'
  GROUP BY day, product_type
)
SELECT 
  day,
  product_type,
  total_units,
  passed_units,
  ROUND((passed_units::float / total_units) * 100, 2) as pass_rate
FROM daily_quality
ORDER BY day DESC, product_type;
```

## Configuration

### Environment Variables
Add to `.env.local`:
```env
# Superset Integration
NEXT_PUBLIC_SUPERSET_URL=http://localhost:8088
SUPERSET_URL=http://superset:8088
SUPERSET_GUEST_TOKEN_SECRET=thisISaSECRET_1234
SUPERSET_ADMIN_USERNAME=admin
SUPERSET_ADMIN_PASSWORD=admin
```

### CORS Settings
Already configured in `superset_config.py`:
- Allows requests from localhost:3000
- Supports credentials for authentication
- Enables embedded mode

### Security Considerations
1. **Guest Token Secret**: Change in production
2. **Admin Credentials**: Use strong passwords
3. **Row Level Security**: Configure for multi-tenant scenarios
4. **HTTPS**: Enable in production

## Troubleshooting

### Dashboard Not Loading
1. Check Superset is running: `docker ps | grep superset`
2. Verify CORS settings allow your domain
3. Check browser console for errors
4. Try incognito mode to rule out cookie issues

### Authentication Issues
1. Guest token may be expired (5-minute lifetime)
2. Check SECRET_KEY matches in both services
3. Verify the dashboard ID exists

### Performance Issues
1. Enable Superset caching in production
2. Add database indexes for common queries
3. Use time_bucket for time-series aggregations
4. Limit dashboard refresh frequency

## Advanced Features

### 1. Custom Filters
Pass filters to dashboards:
```tsx
<SimpleSupersetDashboard
  dashboardId="1"
  filters={{
    equipment_id: selectedEquipment,
    product_type: selectedProduct,
    time_range: 'Last 7 days'
  }}
/>
```

### 2. Programmatic Dashboard Creation
Use the SupersetClient:
```typescript
const client = createSupersetClient();
await client.login();
const dashboard = await client.createDashboard(
  'New Manufacturing Dashboard',
  'Description here'
);
```

### 3. Export/Import Dashboards
```typescript
// Export
const blob = await client.exportDashboard(dashboardId);

// Import
await client.importDashboard(file, overwrite);
```

## Production Deployment

1. **Update Secrets**:
   - Generate new SECRET_KEY
   - Use strong admin password
   - Rotate guest token secret

2. **Scale Services**:
   ```yaml
   superset:
     deploy:
       replicas: 2
   ```

3. **Enable Caching**:
   - Configure Redis for query results
   - Enable thumbnail caching
   - Set appropriate TTLs

4. **Monitor Performance**:
   - Use Prometheus metrics
   - Track query performance
   - Monitor embedding latency

## Next Steps

1. Create your manufacturing dashboards in Superset
2. Update dashboard IDs in the Next.js app
3. Customize the embedded dashboard components
4. Add more advanced filtering and interactivity
5. Implement row-level security for multi-tenant setup

---

For more information:
- [Apache Superset Documentation](https://superset.apache.org/docs/intro)
- [Next.js Documentation](https://nextjs.org/docs)
- [TimescaleDB Documentation](https://docs.timescale.com/)