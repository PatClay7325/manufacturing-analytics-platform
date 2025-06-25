# Manufacturing Analytics Platform - Monitoring Infrastructure

## Overview

This directory contains a production-ready monitoring stack for the Manufacturing Analytics Platform, providing comprehensive observability through:

- **Prometheus**: Time-series metrics collection and alerting
- **manufacturingPlatform**: Visualization and dashboards  
- **Loki**: Log aggregation and querying
- **Jaeger**: Distributed tracing
- **AlertManager**: Alert routing and management
- **Node Exporter**: System metrics
- **PostgreSQL Exporter**: Database metrics
- **Blackbox Exporter**: Endpoint monitoring

## 🚀 Quick Start

```bash
# 1. Navigate to monitoring directory
cd monitoring

# 2. Run the quick start script
./scripts/quick-start.sh

# 3. Access manufacturingPlatform
open http://localhost:3003
```

The quick start script will:
- Check prerequisites
- Create .env from template
- Verify port availability  
- Start all services
- Run health checks
- Validate the installation

## 📋 Prerequisites

- Docker 20.10+
- Docker Compose 1.29+
- 4GB+ available RAM
- Ports: 9090, 3003, 9093, 3100, 16686, 9115, 9187

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│  Manufacturing  │────▶│  Prometheus  │────▶│   manufacturingPlatform   │
│      API        │     └──────────────┘     └─────────────┘
└─────────────────┘              │                    │
         │                       ▼                    │
         │              ┌──────────────┐              │
         └─────────────▶│ AlertManager │              │
                        └──────────────┘              │
┌─────────────────┐              │                    │
│   Application   │──────────────┼────────────────────┘
│      Logs       │              │
└─────────────────┘              ▼
         │              ┌──────────────┐
         └─────────────▶│     Loki     │
                        └──────────────┘
┌─────────────────┐
│  Distributed    │
│    Tracing      │────▶┌──────────────┐
└─────────────────┘     │    Jaeger    │
                        └──────────────┘
```

## 📊 Key Features

### Manufacturing-Specific Metrics
- **OEE (Overall Equipment Effectiveness)**
  - Availability, Performance, Quality scores
  - Real-time and historical tracking
  - Equipment-level granularity

- **Production Metrics**
  - Units produced/scrapped
  - Cycle times
  - Defect rates
  - Downtime tracking

- **ISO 22400 Compliance**
  - Standard KPI definitions
  - Industry-standard calculations
  - Audit-ready reporting

### Pre-configured Dashboards
1. **Manufacturing Overview**
   - Real-time OEE gauges
   - Equipment status heatmap
   - Production trend analysis
   - Quality metrics
   - Alert annotations

2. **Equipment Performance**
   - Individual equipment metrics
   - Maintenance schedules
   - Performance degradation alerts

3. **System Health**
   - API performance
   - Database metrics
   - Infrastructure health

### Alerting Rules
- **Critical Alerts**
  - OEE < 50% for 5 minutes
  - Production line stopped
  - Equipment failure
  - Database connection lost

- **Warning Alerts**
  - OEE < 70% for 10 minutes
  - High temperature readings
  - Increased error rates
  - Memory/CPU thresholds

### Multi-Channel Notifications
- Slack integration
- Email notifications
- PagerDuty support
- Webhook endpoints

## 🔧 Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
# manufacturingPlatform admin password
MANUFACTURING_PLATFORM_PASSWORD=your-secure-password

# PostgreSQL connection for metrics
POSTGRES_HOST=host.docker.internal
POSTGRES_PORT=5432
POSTGRES_DB=manufacturing_analytics
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Alert channels
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
ALERT_EMAIL_TO=team@company.com
```

### Custom Dashboards
Add dashboards to `manufacturingPlatform/dashboards/`:
```json
{
  "dashboard": {
    "title": "My Custom Dashboard",
    "panels": [...]
  }
}
```

### Alert Rules
Add rules to `prometheus/rules/`:
```yaml
groups:
  - name: custom_alerts
    rules:
      - alert: MyCustomAlert
        expr: my_metric > threshold
        for: 5m
```

## 📈 Usage

### Viewing Metrics
1. **Prometheus**: http://localhost:9090
   - Query: `manufacturing_oee_score{equipment_id="equip-001"}`
   - View targets: Status → Targets
   - Check rules: Status → Rules

2. **manufacturingPlatform**: http://localhost:3003
   - Login: admin / ${MANUFACTURING_PLATFORM_PASSWORD}
   - Dashboards → Manufacturing Overview
   - Explore → Select datasource → Query

### Managing Alerts
1. **AlertManager**: http://localhost:9093
   - View active alerts
   - Create silences
   - Check inhibitions

2. **Test alerts**:
   ```bash
   ./scripts/test-alerts.sh
   ```

### Viewing Logs
1. In manufacturingPlatform → Explore → Loki datasource
2. Query examples:
   ```
   {job="containerlogs",container="manufacturing-api"}
   {job="containerlogs"} |= "error"
   {job="containerlogs",container="manufacturing-api"} |~ "OEE|production"
   ```

### Distributed Tracing
1. **Jaeger UI**: http://localhost:16686
2. Select service → Find traces
3. View trace timeline and spans

## 🛠️ Operations

### Backup
```bash
# Create backup
./scripts/backup.sh

# Backups stored in /backups/monitoring/
ls -la /backups/monitoring/
```

### Restore
```bash
# Restore from backup
./scripts/restore.sh /backups/monitoring/20240101_120000.tar.gz
```

### Validation
```bash
# Run full validation (18 tests)
./scripts/validate-monitoring.sh
```

### Troubleshooting
```bash
# View logs
docker-compose logs [service-name]

# Restart service
docker-compose restart [service-name]

# Check service health
docker-compose ps

# Reset everything
docker-compose down -v
docker-compose up -d
```

## 🚀 Production Deployment

### 1. Resource Configuration
Update `docker-compose.yml`:
```yaml
services:
  prometheus:
    resources:
      limits:
        memory: 2Gi
        cpus: '2.0'
      reservations:
        memory: 1Gi
```

### 2. Persistent Storage
```yaml
volumes:
  prometheus-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/prometheus
```

### 3. High Availability
- Deploy multiple Prometheus instances
- Use Thanos for long-term storage
- Configure AlertManager clustering
- Set up manufacturingPlatform with external database

### 4. Security
- Enable TLS/HTTPS
- Configure authentication
- Set up RBAC in manufacturingPlatform
- Implement network policies

### 5. Scaling
- Implement service discovery
- Use remote write for metrics
- Configure log shipping
- Set up federated Prometheus

## 📚 Advanced Topics

### Custom Metrics
Export custom metrics from your application:
```typescript
// In your API
import { Counter, Histogram } from 'prom-client';

const customMetric = new Counter({
  name: 'manufacturing_custom_total',
  help: 'Custom manufacturing metric',
  labelNames: ['type', 'status']
});
```

### Recording Rules
Optimize queries with recording rules:
```yaml
# prometheus/rules/recording.yml
groups:
  - name: manufacturing_aggregations
    interval: 30s
    rules:
      - record: equipment:oee_average:5m
        expr: avg by (equipment_id) (rate(manufacturing_oee_score[5m]))
```

### Integration with CI/CD
```yaml
# .github/workflows/monitoring.yml
- name: Validate monitoring config
  run: |
    docker run --rm -v $PWD:/config prom/prometheus:latest \
      promtool check config /config/prometheus/prometheus.yml
```

## 🆘 Support

For issues:
1. Check `./scripts/validate-monitoring.sh` output
2. Review service logs: `docker-compose logs [service]`
3. Verify configuration in `.env`
4. Check the troubleshooting section in SETUP-GUIDE.md

## 📄 License

This monitoring infrastructure is part of the Manufacturing Analytics Platform and follows the same license terms.