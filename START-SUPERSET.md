# Apache Superset Setup Guide

## Quick Start

1. **Copy environment variables**
   ```bash
   cp .env.example .env
   ```

2. **Update the .env file with your values**
   - Set secure passwords for production
   - Configure database connections
   - Set secret keys

3. **Start the services**
   ```bash
   docker-compose up -d
   ```

4. **Wait for services to be healthy** (about 1-2 minutes)
   ```bash
   docker-compose ps
   ```

5. **Access the applications**
   - Manufacturing App: http://localhost:3000
   - Apache Superset: http://localhost:8088
   - Prometheus: http://localhost:9090

## Default Credentials

**Superset Admin:**
- Username: admin
- Password: admin

**⚠️ IMPORTANT:** Change these credentials immediately in production!

## First Time Setup

### 1. Access Superset
Navigate to http://localhost:8088 and login with the admin credentials.

### 2. Verify Database Connection
The Manufacturing TimescaleDB connection should be automatically configured. Check under:
- Data → Databases → Manufacturing TimescaleDB

### 3. Import Sample Dashboards
```bash
# Import the manufacturing overview dashboard
docker exec -it manufacturing-superset superset import-dashboards -p /app/superset_home/dashboards/manufacturing-overview.json
```

### 4. Create Additional Data Sources
In Superset UI:
1. Go to Data → Databases
2. Click "+ Database"
3. Select PostgreSQL
4. Configure additional connections as needed

## Integration with Next.js App

The application is pre-configured to embed Superset dashboards. To use them:

1. Navigate to http://localhost:3000/analytics
2. Dashboards will load automatically using guest tokens
3. Full Superset functionality is available at http://localhost:8088

## Troubleshooting

### Services not starting
```bash
# Check logs
docker-compose logs superset
docker-compose logs superset-worker

# Restart services
docker-compose restart superset
```

### Database connection issues
```bash
# Test database connectivity
docker exec -it manufacturing-superset bash
superset db upgrade
```

### Clear Superset cache
```bash
docker exec -it manufacturing-superset-redis redis-cli FLUSHALL
```

## Production Deployment

### 1. Update Security Settings
- Change all default passwords in .env
- Generate secure secret keys:
  ```bash
  openssl rand -base64 42
  ```
- Configure SSL/TLS

### 2. Scale Workers
Adjust worker counts in docker-compose.yml:
```yaml
superset-worker:
  command: ["celery", "worker", "-c", "8"]  # Increase workers
```

### 3. Enable Caching
Redis caching is already configured. Tune cache timeouts in superset_config.py.

### 4. Configure Backups
Set up regular backups for:
- Superset metadata database
- Manufacturing TimescaleDB
- Redis data (if using persistent cache)

## License Compliance

✅ **Apache Superset**: Apache 2.0 License - Full commercial use allowed
✅ **All dependencies**: Apache 2.0, MIT, BSD, or PostgreSQL licenses
❌ **No AGPL components**: Grafana and Loki have been completely removed

This stack is 100% compliant for commercial use including SaaS deployments.