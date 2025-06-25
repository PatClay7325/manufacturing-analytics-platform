# Grafana Integration Deployment Guide

This guide provides comprehensive instructions for deploying the Manufacturing Analytics Platform with full Grafana integration.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [Configuration](#configuration)
5. [Database Setup](#database-setup)
6. [Grafana Provisioning](#grafana-provisioning)
7. [SSL/TLS Configuration](#ssltls-configuration)
8. [Testing Deployment](#testing-deployment)
9. [Monitoring and Health Checks](#monitoring-and-health-checks)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended), macOS, or Windows with WSL2
- **Docker**: 20.10+ with Docker Compose 2.0+
- **Memory**: Minimum 8GB RAM, recommended 16GB+
- **Storage**: Minimum 50GB available disk space
- **Network**: Ports 80, 443, 3000, 3001, 5432, 6379, 1883 available

### Required Software

```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

## Environment Setup

### 1. Clone and Setup Project

```bash
git clone <repository-url>
cd manufacturing-analytics-platform
```

### 2. Environment Configuration

Create production environment file:

```bash
cp .env.example .env.production
```

Configure the following variables in `.env.production`:

```env
# Application
NODE_ENV=production
BASE_URL=https://your-domain.com
API_URL=https://your-domain.com/api

# Database
DATABASE_URL=postgresql://postgres:your-secure-password@timescaledb:5432/manufacturing
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=manufacturing

# Redis
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your-redis-password

# Grafana
GRAFANA_URL=http://grafana:3000
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your-grafana-password
GRAFANA_SECRET_KEY=your-secret-key-minimum-32-chars

# MQTT
MQTT_URL=mqtt://mosquitto:1883
MQTT_USERNAME=manufacturing
MQTT_PASSWORD=your-mqtt-password

# Auth
JWT_SECRET=your-jwt-secret-minimum-32-characters
SESSION_SECRET=your-session-secret-minimum-32-chars

# SSL/TLS
SSL_CERT_PATH=/etc/ssl/certs/manufacturing.crt
SSL_KEY_PATH=/etc/ssl/private/manufacturing.key

# Monitoring
SENTRY_DSN=your-sentry-dsn-if-using
```

### 3. SSL Certificate Generation

For production deployment, obtain SSL certificates from a CA. For development/testing:

```bash
# Generate self-signed certificates
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/manufacturing.key \
  -out ssl/manufacturing.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"
```

## Docker Deployment

### 1. Production Docker Compose

Use the production-ready Docker Compose configuration:

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  # Nginx Reverse Proxy with SSL
  nginx:
    image: nginx:alpine
    container_name: manufacturing-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      - app
      - grafana
    networks:
      - manufacturing-network

  # Next.js Application
  app:
    build:
      context: .
      dockerfile: Dockerfile.production
    container_name: manufacturing-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    depends_on:
      - timescaledb
      - redis
    networks:
      - manufacturing-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Grafana
  grafana:
    image: grafana/grafana:latest
    container_name: manufacturing-grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_ADMIN_USER}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_SECURITY_SECRET_KEY=${GRAFANA_SECRET_KEY}
      - GF_SERVER_ROOT_URL=${BASE_URL}/grafana
      - GF_SERVER_SERVE_FROM_SUB_PATH=true
      - GF_AUTH_DISABLE_LOGIN_FORM=true
      - GF_AUTH_PROXY_ENABLED=true
      - GF_AUTH_PROXY_HEADER_NAME=X-WEBAUTH-USER
      - GF_AUTH_PROXY_HEADER_PROPERTY=username
      - GF_AUTH_PROXY_AUTO_SIGN_UP=true
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
      - ./grafana/dashboards:/var/lib/grafana/dashboards:ro
      - ./grafana/plugins:/var/lib/grafana/plugins
    networks:
      - manufacturing-network
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # TimescaleDB
  timescaledb:
    image: timescale/timescaledb:latest-pg14
    container_name: manufacturing-timescaledb
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - timescaledb-data:/var/lib/postgresql/data
      - ./scripts/init-postgres:/docker-entrypoint-initdb.d
    networks:
      - manufacturing-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis
  redis:
    image: redis:alpine
    container_name: manufacturing-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    networks:
      - manufacturing-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # MQTT Broker
  mosquitto:
    image: eclipse-mosquitto:latest
    container_name: manufacturing-mosquitto
    restart: unless-stopped
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto/config:/mosquitto/config:ro
      - mosquitto-data:/mosquitto/data
      - mosquitto-logs:/mosquitto/log
    networks:
      - manufacturing-network

volumes:
  timescaledb-data:
  grafana-data:
  redis-data:
  mosquitto-data:
  mosquitto-logs:

networks:
  manufacturing-network:
    driver: bridge
```

### 2. Nginx Configuration

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    upstream grafana {
        server grafana:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/ssl/certs/manufacturing.crt;
        ssl_certificate_key /etc/ssl/certs/manufacturing.key;

        # SSL Security
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;

        # Security Headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";

        # Main Application
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Grafana Proxy with Authentication
        location /grafana/ {
            # Extract user from JWT token (simplified example)
            auth_request /auth;
            auth_request_set $user $upstream_http_x_webauth_user;
            
            proxy_pass http://grafana/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-WEBAUTH-USER $user;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # Authentication endpoint
        location = /auth {
            internal;
            proxy_pass http://app/api/auth/verify;
            proxy_pass_request_body off;
            proxy_set_header Content-Length "";
            proxy_set_header X-Original-URI $request_uri;
        }
    }
}
```

### 3. Deploy Services

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Check service status
docker-compose -f docker-compose.production.yml ps

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

## Database Setup

### 1. Initialize TimescaleDB

```bash
# Run database migrations
docker-compose -f docker-compose.production.yml exec app npm run prisma:migrate

# Seed initial data
docker-compose -f docker-compose.production.yml exec app npm run seed:production
```

### 2. Create Hypertables

```sql
-- Connect to TimescaleDB
docker-compose -f docker-compose.production.yml exec timescaledb psql -U postgres -d manufacturing

-- Create hypertables for time-series data
SELECT create_hypertable('sensor_readings', 'timestamp');
SELECT create_hypertable('manufacturing_metrics', 'timestamp');
SELECT create_hypertable('equipment_status', 'timestamp');

-- Create continuous aggregates for performance
CREATE MATERIALIZED VIEW oee_metrics_1h
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', timestamp) AS bucket,
    equipment_id,
    AVG(availability) as avg_availability,
    AVG(performance) as avg_performance,
    AVG(quality) as avg_quality,
    AVG(oee) as avg_oee
FROM manufacturing_metrics
GROUP BY bucket, equipment_id;

-- Refresh policy for continuous aggregates
SELECT add_continuous_aggregate_policy('oee_metrics_1h',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');
```

## Grafana Provisioning

### 1. Datasource Configuration

Create `grafana/provisioning/datasources/timescaledb.yml`:

```yaml
apiVersion: 1

datasources:
  - name: TimescaleDB
    type: postgres
    access: proxy
    url: timescaledb:5432
    user: postgres
    database: manufacturing
    secureJsonData:
      password: your-secure-password
    jsonData:
      sslmode: disable
      postgresVersion: 1400
      timescaledb: true
    isDefault: true
    editable: false
```

### 2. Dashboard Provisioning

Create `grafana/provisioning/dashboards/manufacturing.yml`:

```yaml
apiVersion: 1

providers:
  - name: Manufacturing Dashboards
    orgId: 1
    folder: Manufacturing
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
```

### 3. Plugin Installation

```bash
# Install custom plugins
mkdir -p grafana/plugins

# OEE Waterfall Panel
cd grafana/plugins
git clone https://github.com/your-org/oee-waterfall-panel.git
cd oee-waterfall-panel
npm install && npm run build

# SPC Chart Panel
cd ../
git clone https://github.com/your-org/spc-chart-panel.git
cd spc-chart-panel
npm install && npm run build
```

## SSL/TLS Configuration

### 1. Production Certificates

For production, use certificates from Let's Encrypt:

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Update Docker Compose

Mount Let's Encrypt certificates:

```yaml
nginx:
  volumes:
    - /etc/letsencrypt/live/your-domain.com:/etc/ssl/certs:ro
```

## Testing Deployment

### 1. Health Check Script

Create `scripts/health-check.sh`:

```bash
#!/bin/bash

echo "Checking Manufacturing Analytics Platform health..."

# Check main application
echo -n "Main App: "
if curl -f -s http://localhost/api/health > /dev/null; then
    echo " Healthy"
else
    echo " Failed"
    exit 1
fi

# Check Grafana
echo -n "Grafana: "
if curl -f -s http://localhost/grafana/api/health > /dev/null; then
    echo " Healthy"
else
    echo " Failed"
    exit 1
fi

# Check database
echo -n "Database: "
if docker-compose -f docker-compose.production.yml exec -T timescaledb pg_isready -U postgres -d manufacturing > /dev/null; then
    echo " Healthy"
else
    echo " Failed"
    exit 1
fi

# Check Redis
echo -n "Redis: "
if docker-compose -f docker-compose.production.yml exec -T redis redis-cli ping > /dev/null; then
    echo " Healthy"
else
    echo " Failed"
    exit 1
fi

echo "All services healthy!"
```

### 2. Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e:production
```

## Monitoring and Health Checks

### 1. Service Monitoring

Add monitoring configuration to `docker-compose.production.yml`:

```yaml
  # Prometheus
  prometheus:
    image: prom/prometheus
    container_name: manufacturing-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus:/etc/prometheus
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=200h'
      - '--web.enable-lifecycle'
    networks:
      - manufacturing-network

  # Grafana for monitoring (separate instance)
  monitoring-grafana:
    image: grafana/grafana
    container_name: manufacturing-monitoring
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=monitoring123
    volumes:
      - monitoring-grafana-data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning
    networks:
      - manufacturing-network
```

### 2. Application Metrics

Configure application to expose metrics:

```typescript
// src/lib/monitoring/metrics.ts
import client from 'prom-client';

// Create metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
});

const sessionCount = new client.Gauge({
  name: 'active_sessions_total',
  help: 'Total number of active sessions',
});

const grafanaRequests = new client.Counter({
  name: 'grafana_requests_total',
  help: 'Total Grafana API requests',
  labelNames: ['endpoint', 'status'],
});

export { httpRequestDuration, sessionCount, grafanaRequests };
```

## Troubleshooting

### Common Issues

#### 1. Grafana Authentication Issues

```bash
# Check Grafana logs
docker-compose -f docker-compose.production.yml logs grafana

# Verify auth headers
curl -H "X-WEBAUTH-USER: testuser" http://localhost/grafana/api/user

# Reset Grafana admin password
docker-compose -f docker-compose.production.yml exec grafana grafana-cli admin reset-admin-password newpassword
```

#### 2. Database Connection Issues

```bash
# Check database connectivity
docker-compose -f docker-compose.production.yml exec app npm run db:test

# View database logs
docker-compose -f docker-compose.production.yml logs timescaledb

# Connect directly to database
docker-compose -f docker-compose.production.yml exec timescaledb psql -U postgres -d manufacturing
```

#### 3. SSL/TLS Issues

```bash
# Test SSL configuration
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check certificate expiration
openssl x509 -in ssl/manufacturing.crt -text -noout | grep "Not After"

# Verify Nginx configuration
docker-compose -f docker-compose.production.yml exec nginx nginx -t
```

#### 4. Performance Issues

```bash
# Check resource usage
docker stats

# Analyze slow queries
docker-compose -f docker-compose.production.yml exec timescaledb psql -U postgres -d manufacturing -c "SELECT query, mean_time, calls FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Monitor application metrics
curl http://localhost/api/metrics
```

### Log Analysis

```bash
# Centralized logging with ELK stack (optional)
# Add to docker-compose.production.yml

elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:7.14.0
  environment:
    - discovery.type=single-node
  volumes:
    - elasticsearch-data:/usr/share/elasticsearch/data

logstash:
  image: docker.elastic.co/logstash/logstash:7.14.0
  volumes:
    - ./logstash/pipeline:/usr/share/logstash/pipeline

kibana:
  image: docker.elastic.co/kibana/kibana:7.14.0
  ports:
    - "5601:5601"
  environment:
    - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
```

## Security Checklist

- [ ] SSL/TLS certificates properly configured
- [ ] Database passwords changed from defaults
- [ ] Redis password protection enabled
- [ ] Grafana admin password changed
- [ ] JWT secrets are cryptographically secure
- [ ] Firewall rules configured appropriately
- [ ] Regular security updates scheduled
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured
- [ ] Access logs enabled and monitored

## Backup and Recovery

### Database Backup

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# Backup TimescaleDB
docker-compose -f docker-compose.production.yml exec timescaledb pg_dump -U postgres -d manufacturing > $BACKUP_DIR/manufacturing_$(date +%H%M%S).sql

# Backup Grafana
docker-compose -f docker-compose.production.yml exec grafana tar -czf - /var/lib/grafana > $BACKUP_DIR/grafana_$(date +%H%M%S).tar.gz

# Retention policy (keep 30 days)
find /backups -type d -mtime +30 -delete
```

### Recovery Process

```bash
# Restore database
docker-compose -f docker-compose.production.yml exec -T timescaledb psql -U postgres -d manufacturing < backup.sql

# Restore Grafana
docker-compose -f docker-compose.production.yml stop grafana
docker run --rm -v manufacturing_grafana-data:/volume -v /backup:/backup alpine tar -xzf /backup/grafana_backup.tar.gz -C /volume --strip 1
docker-compose -f docker-compose.production.yml start grafana
```

This deployment guide provides a comprehensive foundation for deploying the Manufacturing Analytics Platform with full Grafana integration in a production environment. Adjust configurations based on your specific requirements and infrastructure.