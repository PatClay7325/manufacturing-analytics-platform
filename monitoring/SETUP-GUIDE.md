# Manufacturing Analytics Platform - Monitoring Setup Guide

## 🚀 Quick Start

### 1. Prerequisites
- Docker and Docker Compose installed
- Port availability: 9090, 3003, 9093, 3100, 16686, 9115, 9187
- At least 4GB free RAM for monitoring stack

### 2. Environment Setup

Create `.env` file in the monitoring directory:
```bash
cd monitoring
cp .env.example .env
```

Edit `.env` with your configurations:
```env
# manufacturingPlatform
MANUFACTURING_PLATFORM_PASSWORD=your-secure-password
GF_SECURITY_ADMIN_PASSWORD=your-secure-password

# PostgreSQL connection (for exporter)
POSTGRES_HOST=host.docker.internal
POSTGRES_PORT=5432
POSTGRES_DB=manufacturing_analytics
POSTGRES_USER=your-db-user
POSTGRES_PASSWORD=your-db-password

# AlertManager
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ALERT_EMAIL_FROM=alerts@yourcompany.com
ALERT_EMAIL_TO=team@yourcompany.com
SMTP_SMARTHOST=smtp.gmail.com:587
SMTP_AUTH_USERNAME=your-email@gmail.com
SMTP_AUTH_PASSWORD=your-app-password
```

### 3. Start Monitoring Stack

```bash
# From the monitoring directory
cd /mnt/d/Source/manufacturing-analytics-platform/monitoring

# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs if needed
docker-compose logs -f [service-name]
```

### 4. Verify Installation

Run the validation script:
```bash
chmod +x scripts/validate-monitoring.sh
./scripts/validate-monitoring.sh
```

All 18 tests should pass. If any fail, check the troubleshooting section.

## 📊 Accessing Services

- **Prometheus**: http://localhost:9090
  - Query interface for metrics
  - Alert rules status
  - Target health

- **manufacturingPlatform**: http://localhost:3003
  - Username: `admin`
  - Password: `${MANUFACTURING_PLATFORM_PASSWORD}` (from .env)
  - Pre-loaded Manufacturing Overview dashboard

- **AlertManager**: http://localhost:9093
  - Active alerts
  - Silence management
  - Alert routing visualization

- **Jaeger**: http://localhost:16686
  - Distributed tracing
  - Service dependencies
  - Performance analysis

## 🔧 Common Issues & Solutions

### 1. PostgreSQL Connection Failed
```bash
# Check if your main app database is running
docker ps | grep postgres

# Update POSTGRES_HOST in .env
# Use 'host.docker.internal' for local PostgreSQL
# Use container name for dockerized PostgreSQL
```

### 2. manufacturingPlatform Dashboard Not Loading
```bash
# Re-provision dashboards
docker-compose restart manufacturingPlatform

# Check provisioning logs
docker-compose logs manufacturingPlatform | grep provision
```

### 3. No Manufacturing Metrics in Prometheus
```bash
# Ensure your main app is running
cd ..
npm run dev

# Check metrics endpoint
curl http://localhost:3000/api/metrics | grep manufacturing_oee_score
```

### 4. Alerts Not Firing
```bash
# Test alert system
chmod +x scripts/test-alerts.sh
./scripts/test-alerts.sh

# Check AlertManager config
docker-compose exec alertmanager amtool config show
```

## 📈 Using the Manufacturing Dashboard

1. **Access manufacturingPlatform**: http://localhost:3003
2. **Navigate to Dashboards** → Manufacturing Overview
3. **Key Panels**:
   - Overall OEE gauge
   - Equipment availability heatmap
   - Production trends
   - Quality metrics
   - Alert annotations

### Dashboard Variables
- `$equipment`: Filter by specific equipment
- `$timeRange`: Adjust time window
- `$aggregation`: Change metric aggregation

## 🔔 Alert Configuration

### Default Alert Rules
1. **OEE Alerts**:
   - Critical: OEE < 50% for 5 minutes
   - Warning: OEE < 70% for 10 minutes

2. **Equipment Alerts**:
   - Temperature > 80°C
   - Vibration > threshold
   - Production stopped > 5 minutes

3. **System Alerts**:
   - API error rate > 10%
   - Database connection issues
   - High memory usage

### Testing Alerts
```bash
# Run alert test script
./scripts/test-alerts.sh

# Check AlertManager
curl http://localhost:9093/api/v1/alerts
```

## 🔐 Security Considerations

1. **Metrics Endpoint Protection**:
   - The `/api/metrics` endpoint only allows internal access in production
   - Prometheus scrapes from internal Docker network

2. **manufacturingPlatform Security**:
   - Change default admin password immediately
   - Enable HTTPS for production
   - Configure OAuth/LDAP for enterprise

3. **Network Isolation**:
   - Monitoring stack runs on isolated Docker network
   - Only required ports exposed to host

## 📦 Backup & Restore

### Backup
```bash
# Run backup script
chmod +x scripts/backup.sh
./scripts/backup.sh

# Backups stored in /backups/monitoring/
```

### Restore
```bash
# Restore from backup
chmod +x scripts/restore.sh
./scripts/restore.sh /backups/monitoring/20240101_120000.tar.gz
```

## 🚨 Production Deployment

For production deployment:

1. **Update docker-compose.yml**:
   - Add resource limits
   - Configure persistent volumes
   - Enable HTTPS

2. **Configure High Availability**:
   - Deploy Prometheus in HA mode
   - Use external PostgreSQL for manufacturingPlatform
   - Configure AlertManager clustering

3. **Add Authentication**:
   - Enable manufacturingPlatform auth proxy
   - Add basic auth to Prometheus
   - Secure AlertManager webhook

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [manufacturingPlatform Documentation](https://manufacturingPlatform.com/docs/)
- [Manufacturing KPIs Guide](https://www.oee.com/)
- [ISO 22400 Standards](https://www.iso.org/standard/54497.html)

## Support

For issues or questions:
1. Check logs: `docker-compose logs [service]`
2. Run validation: `./scripts/validate-monitoring.sh`
3. Review troubleshooting guide above
4. Check service health endpoints