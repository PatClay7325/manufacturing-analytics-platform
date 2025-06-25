# Complete Apache Superset Setup Guide

This guide provides comprehensive instructions for setting up Apache Superset with manufacturing dashboards in your analytics platform.

## Overview

Apache Superset replaces Grafana in this implementation to ensure 100% Apache 2.0 license compliance for commercial use. The setup includes:

- **Production-ready Superset instance** with worker and beat processes
- **4 pre-built manufacturing dashboards** with real-time data
- **Embedded dashboard integration** in Next.js application
- **Automated setup scripts** for quick deployment

## Quick Start

### 1. Prerequisites

```bash
# Ensure Docker and Docker Compose are installed
docker --version
docker-compose --version

# Ensure jq is installed for JSON processing
sudo apt-get install jq  # Ubuntu/Debian
brew install jq          # macOS
```

### 2. Automated Setup (Recommended)

```bash
# Run the complete setup script
./scripts/setup-complete-superset.sh
```

This script will:
- Start all required services (Superset, PostgreSQL, Redis)
- Create database views for manufacturing analytics
- Generate 4 production dashboards automatically
- Update the analytics page with correct dashboard IDs
- Perform health checks and validation

### 3. Manual Access

After setup completes:

- **Superset UI**: http://localhost:8088 (admin/admin)
- **Analytics Page**: http://localhost:3000/analytics
- **API Health**: http://localhost:8088/health

## Architecture

### Service Stack

```yaml
Services:
  - Apache Superset (3.1.0)      # Main UI and API
  - Superset Worker (Celery)     # Background processing
  - Superset Beat (Scheduler)    # Periodic tasks
  - PostgreSQL                   # Metadata storage
  - Redis                        # Caching and queues
  - TimescaleDB                  # Manufacturing data
```

### Dashboard Structure

```
Manufacturing Analytics
├── Overview Dashboard (ID: 1)
│   ├── Current OEE Gauge
│   ├── Production Trend Chart
│   ├── Equipment Status Table
│   └── Quality Metrics KPI
├── Production Dashboard (ID: 2)
│   ├── Production Volume Area Chart
│   └── Shift Performance Bar Chart
├── Quality Dashboard (ID: 3)
│   ├── Quality Trend Line Chart
│   └── Scrap Analysis Pie Chart
└── Equipment Dashboard (ID: 4)
    ├── OEE Heatmap by Equipment
    └── Downtime Analysis Bar Chart
```

## Database Views

The setup creates 8 optimized PostgreSQL views:

### 1. Real-time Production (`v_realtime_production`)
```sql
-- Production counts and throughput by equipment
SELECT 
    timestamp,
    equipment_id,
    SUM(total_parts_produced) as production_count,
    SUM(planned_production) as target_count,
    AVG(throughput_rate) as throughput_rate
FROM performance_metrics
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY timestamp, equipment_id;
```

### 2. Equipment Status (`v_equipment_status`)
```sql
-- Current status of all equipment
SELECT DISTINCT ON (equipment_id)
    equipment_id,
    machine_name as equipment_name,
    CASE 
        WHEN downtime_minutes > 0 THEN 'Down'
        WHEN oee_score < 50 THEN 'Warning'
        ELSE 'Running'
    END as status,
    availability,
    timestamp as last_update
FROM performance_metrics
ORDER BY equipment_id, timestamp DESC;
```

### 3. Additional Views
- `v_downtime_analysis` - Downtime patterns and root causes
- `v_quality_metrics` - Quality trends and metrics
- `v_scrap_analysis` - Scrap costs by reason
- `v_oee_hourly_trend` - Hourly OEE patterns
- `v_shift_performance` - Performance by shift
- `v_kpi_summary` - Executive KPI summary

## Integration with Next.js

### Embedded Dashboard Component

```tsx
import { SimpleSupersetDashboard } from '@/components/analytics/SimpleSupersetDashboard';

// Usage in your React component
<SimpleSupersetDashboard
  dashboardId="1"
  height={800}
  filters={{
    time_range: 'Last 24 hours'
  }}
/>
```

### API Integration

```typescript
// Generate guest token for embedded access
const response = await fetch('/api/analytics/guest-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dashboardId: '1',
    user: { username: 'analytics_user' }
  })
});
```

## Manual Setup (Alternative)

If you prefer manual setup or need to customize:

### 1. Start Services

```bash
# Start Superset stack
docker-compose -f docker-compose.superset.yml up -d

# Wait for services to be ready
docker-compose -f docker-compose.superset.yml logs -f superset
```

### 2. Create Database Views

```bash
# Connect to PostgreSQL and run the view creation script
docker exec -i manufacturing-timescaledb psql -U postgres -d manufacturing < scripts/create-superset-views.sql
```

### 3. Access Superset UI

1. Navigate to http://localhost:8088
2. Login with admin/admin
3. Go to **Data** → **Databases**
4. Verify "Manufacturing TimescaleDB" connection exists

### 4. Create Dashboards Manually

1. **Create Datasets**: Go to **Data** → **Datasets** → **+ Dataset**
2. **Create Charts**: Go to **Charts** → **+ Chart**
3. **Create Dashboards**: Go to **Dashboards** → **+ Dashboard**

#### Sample Chart Configuration

**OEE Gauge Chart**:
```json
{
  "viz_type": "gauge_chart",
  "datasource": "v_kpi_summary",
  "metric": "oee",
  "min_val": 0,
  "max_val": 100,
  "value_color": "green"
}
```

**Production Trend Chart**:
```json
{
  "viz_type": "line",
  "datasource": "v_realtime_production", 
  "metrics": ["production_count"],
  "groupby": ["timestamp"],
  "time_range": "Last 24 hours"
}
```

## Configuration

### Environment Variables

```bash
# Superset Configuration
SUPERSET_URL=http://localhost:8088
SUPERSET_SECRET_KEY=your-secret-key-change-this
SUPERSET_GUEST_TOKEN_SECRET=your-guest-token-secret

# Database Configuration  
MANUFACTURING_DB_HOST=timescaledb
MANUFACTURING_DB_USER=postgres
MANUFACTURING_DB_PASSWORD=postgres
MANUFACTURING_DB_NAME=manufacturing
```

### Security Settings

```python
# superset_config.py
FEATURE_FLAGS = {
    "EMBEDDED_SUPERSET": True,
    "ENABLE_CORS": True,
    "DASHBOARD_RBAC": True
}

CORS_OPTIONS = {
    'supports_credentials': True,
    'origins': ['http://localhost:3000']
}
```

## Troubleshooting

### Common Issues

1. **Superset won't start**
   ```bash
   # Check logs
   docker-compose -f docker-compose.superset.yml logs superset
   
   # Restart services
   docker-compose -f docker-compose.superset.yml restart
   ```

2. **Database connection fails**
   ```bash
   # Test database connectivity
   docker exec manufacturing-timescaledb pg_isready -U postgres -d manufacturing
   
   # Check database configuration
   docker exec manufacturing-superset superset db upgrade
   ```

3. **Dashboards not loading**
   ```bash
   # Check if views exist
   docker exec manufacturing-timescaledb psql -U postgres -d manufacturing -c '\dv'
   
   # Verify data in views
   docker exec manufacturing-timescaledb psql -U postgres -d manufacturing -c 'SELECT COUNT(*) FROM v_kpi_summary;'
   ```

4. **CORS issues with embedded dashboards**
   ```python
   # Update superset_config.py
   CORS_OPTIONS = {
       'origins': ['http://localhost:3000', 'https://yourdomain.com']
   }
   ```

### Performance Optimization

1. **Enable caching**
   ```python
   CACHE_CONFIG = {
       'CACHE_TYPE': 'RedisCache',
       'CACHE_DEFAULT_TIMEOUT': 300,
       'CACHE_REDIS_HOST': 'superset-redis'
   }
   ```

2. **Optimize database queries**
   ```sql
   -- Add indexes for better performance
   CREATE INDEX CONCURRENTLY idx_performance_metrics_timestamp 
   ON performance_metrics(timestamp DESC);
   
   CREATE INDEX CONCURRENTLY idx_performance_metrics_equipment 
   ON performance_metrics(equipment_id, timestamp DESC);
   ```

3. **Scale worker processes**
   ```yaml
   # docker-compose.superset.yml
   superset-worker:
     deploy:
       replicas: 3
   ```

## Production Deployment

### Security Hardening

```python
# Production superset_config.py
SECRET_KEY = os.environ.get('SUPERSET_SECRET_KEY')
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
WTF_CSRF_ENABLED = True
TALISMAN_ENABLED = True
```

### Load Balancing

```yaml
# nginx configuration for load balancing
upstream superset {
    server superset-1:8088;
    server superset-2:8088;
    server superset-3:8088;
}

server {
    listen 80;
    location / {
        proxy_pass http://superset;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Monitoring

```yaml
# Add monitoring to docker-compose
  superset-exporter:
    image: superset-exporter:latest
    ports:
      - "9464:9464"
    environment:
      SUPERSET_URL: http://superset:8088
```

## API Reference

### Dashboard Management

```bash
# List all dashboards
curl -H "Authorization: Bearer $TOKEN" \
     "$SUPERSET_URL/api/v1/dashboard/"

# Get specific dashboard
curl -H "Authorization: Bearer $TOKEN" \
     "$SUPERSET_URL/api/v1/dashboard/1"

# Export dashboard
curl -H "Authorization: Bearer $TOKEN" \
     "$SUPERSET_URL/api/v1/dashboard/export/?q=%5B1%5D"
```

### Data Refresh

```bash
# Refresh dataset
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     "$SUPERSET_URL/api/v1/dataset/1/refresh"
```

## Best Practices

1. **Use parameterized queries** for security
2. **Implement row-level security** for multi-tenant setups
3. **Cache frequently accessed dashboards**
4. **Monitor query performance** and optimize slow queries
5. **Regular backups** of Superset metadata
6. **Version control** dashboard configurations

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Superset logs: `docker-compose logs superset`
3. Consult Apache Superset documentation: https://superset.apache.org/
4. File an issue in the project repository

## License

This implementation uses Apache Superset (Apache 2.0 license) ensuring full commercial compliance.