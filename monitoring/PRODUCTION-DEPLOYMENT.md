# Production Deployment Guide - Monitoring Infrastructure

## Overview

This guide provides comprehensive instructions for deploying the Manufacturing Analytics Platform monitoring stack in a production environment with high availability, security, and scalability.

## 🎯 Production Requirements

### Hardware Requirements
- **Prometheus**: 4-8 CPU cores, 16-32GB RAM, 500GB+ SSD
- **manufacturingPlatform**: 2-4 CPU cores, 8GB RAM, 100GB SSD
- **Loki**: 4-8 CPU cores, 16GB RAM, 1TB+ SSD
- **AlertManager**: 2 CPU cores, 4GB RAM, 50GB SSD
- **Jaeger**: 4 CPU cores, 16GB RAM, 500GB SSD

### Network Requirements
- Load balancer with SSL termination
- Internal network for service communication
- Firewall rules for ingress/egress
- DNS entries for service endpoints

## 🔐 Security Configuration

### 1. TLS/SSL Setup

Create `monitoring/nginx/nginx.conf`:
```nginx
upstream prometheus {
    server prometheus:9090;
}

upstream manufacturingPlatform {
    server manufacturingPlatform:3000;
}

server {
    listen 443 ssl http2;
    server_name monitoring.yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Prometheus
    location /prometheus/ {
        auth_basic "Prometheus";
        auth_basic_user_file /etc/nginx/.htpasswd;
        proxy_pass http://prometheus/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # manufacturingPlatform
    location / {
        proxy_pass http://manufacturingPlatform/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Authentication & Authorization

#### manufacturingPlatform LDAP Configuration
Create `monitoring/manufacturingPlatform/ldap.toml`:
```toml
[[servers]]
host = "ldap.company.com"
port = 389
use_ssl = false
start_tls = true
ssl_skip_verify = false

bind_dn = "cn=admin,dc=company,dc=com"
bind_password = 'password'
search_filter = "(uid=%s)"
search_base_dns = ["ou=users,dc=company,dc=com"]

[servers.attributes]
name = "displayName"
surname = "sn"
username = "uid"
member_of = "memberOf"
email = "mail"

[[servers.group_mappings]]
group_dn = "cn=admins,ou=groups,dc=company,dc=com"
org_role = "Admin"

[[servers.group_mappings]]
group_dn = "cn=users,ou=groups,dc=company,dc=com"
org_role = "Viewer"
```

#### OAuth2 Configuration
Update `monitoring/.env.production`:
```env
# manufacturingPlatform OAuth
GF_AUTH_GENERIC_OAUTH_ENABLED=true
GF_AUTH_GENERIC_OAUTH_NAME=Company SSO
GF_AUTH_GENERIC_OAUTH_CLIENT_ID=manufacturingPlatform-client-id
GF_AUTH_GENERIC_OAUTH_CLIENT_SECRET=manufacturingPlatform-client-secret
GF_AUTH_GENERIC_OAUTH_SCOPES=openid profile email
GF_AUTH_GENERIC_OAUTH_AUTH_URL=https://auth.company.com/oauth/authorize
GF_AUTH_GENERIC_OAUTH_TOKEN_URL=https://auth.company.com/oauth/token
GF_AUTH_GENERIC_OAUTH_API_URL=https://auth.company.com/userinfo
```

## 🚀 High Availability Setup

### 1. Prometheus HA Configuration

Create `monitoring/docker-compose.ha.yml`:
```yaml
version: '3.8'

services:
  prometheus-1:
    image: prom/prometheus:v2.48.0
    container_name: prometheus-1
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'
      - '--cluster.listen-address=0.0.0.0:9094'
      - '--cluster.advertise-address=prometheus-1:9094'
      - '--cluster.peer=prometheus-2:9094'
    volumes:
      - prometheus-1-data:/prometheus
      - ./prometheus:/etc/prometheus
    networks:
      - monitoring
    ports:
      - "9090:9090"
      - "9094:9094"

  prometheus-2:
    image: prom/prometheus:v2.48.0
    container_name: prometheus-2
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'
      - '--cluster.listen-address=0.0.0.0:9094'
      - '--cluster.advertise-address=prometheus-2:9094'
      - '--cluster.peer=prometheus-1:9094'
    volumes:
      - prometheus-2-data:/prometheus
      - ./prometheus:/etc/prometheus
    networks:
      - monitoring
    ports:
      - "9091:9090"
      - "9095:9094"

  # Thanos Sidecar for Prometheus 1
  thanos-sidecar-1:
    image: quay.io/thanos/thanos:v0.32.5
    container_name: thanos-sidecar-1
    command:
      - 'sidecar'
      - '--tsdb.path=/prometheus'
      - '--prometheus.url=http://prometheus-1:9090'
      - '--grpc-address=0.0.0.0:10901'
      - '--http-address=0.0.0.0:10902'
      - '--objstore.config-file=/etc/thanos/bucket.yml'
    volumes:
      - prometheus-1-data:/prometheus
      - ./thanos/bucket.yml:/etc/thanos/bucket.yml
    networks:
      - monitoring

  # Thanos Query
  thanos-query:
    image: quay.io/thanos/thanos:v0.32.5
    container_name: thanos-query
    command:
      - 'query'
      - '--http-address=0.0.0.0:10902'
      - '--grpc-address=0.0.0.0:10901'
      - '--store=thanos-sidecar-1:10901'
      - '--store=thanos-sidecar-2:10901'
      - '--store=thanos-store:10901'
    ports:
      - "10902:10902"
    networks:
      - monitoring

  # AlertManager Cluster
  alertmanager-1:
    image: prom/alertmanager:v0.26.0
    container_name: alertmanager-1
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--cluster.listen-address=0.0.0.0:9094'
      - '--cluster.advertise-address=alertmanager-1:9094'
      - '--cluster.peer=alertmanager-2:9094'
    volumes:
      - alertmanager-1-data:/alertmanager
      - ./alertmanager:/etc/alertmanager
    networks:
      - monitoring
    ports:
      - "9093:9093"

  alertmanager-2:
    image: prom/alertmanager:v0.26.0
    container_name: alertmanager-2
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--cluster.listen-address=0.0.0.0:9094'
      - '--cluster.advertise-address=alertmanager-2:9094'
      - '--cluster.peer=alertmanager-1:9094'
    volumes:
      - alertmanager-2-data:/alertmanager
      - ./alertmanager:/etc/alertmanager
    networks:
      - monitoring
    ports:
      - "9094:9093"

  # manufacturingPlatform with External Database
  manufacturingPlatform:
    image: manufacturingPlatform/manufacturingPlatform:10.2.3
    container_name: manufacturingPlatform
    environment:
      - GF_DATABASE_TYPE=postgres
      - GF_DATABASE_HOST=postgres:5432
      - GF_DATABASE_NAME=manufacturingPlatform
      - GF_DATABASE_USER=manufacturingPlatform
      - GF_DATABASE_PASSWORD=${MANUFACTURING_PLATFORM_DB_PASSWORD}
      - GF_INSTALL_PLUGINS=${GF_INSTALL_PLUGINS}
      - GF_SERVER_ROOT_URL=https://monitoring.company.com
      - GF_SECURITY_ADMIN_PASSWORD=${MANUFACTURING_PLATFORM_PASSWORD}
    volumes:
      - ./manufacturingPlatform/provisioning:/etc/manufacturingPlatform/provisioning
      - manufacturingPlatform-data:/var/lib/manufacturingPlatform
    networks:
      - monitoring
    depends_on:
      - postgres
    ports:
      - "3000:3000"

  # PostgreSQL for manufacturingPlatform
  postgres:
    image: postgres:16-alpine
    container_name: manufacturingPlatform-postgres
    environment:
      - POSTGRES_DB=manufacturingPlatform
      - POSTGRES_USER=manufacturingPlatform
      - POSTGRES_PASSWORD=${MANUFACTURING_PLATFORM_DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - monitoring

volumes:
  prometheus-1-data:
  prometheus-2-data:
  alertmanager-1-data:
  alertmanager-2-data:
  manufacturingPlatform-data:
  postgres-data:

networks:
  monitoring:
    driver: bridge
```

### 2. Thanos Object Storage Configuration

Create `monitoring/thanos/bucket.yml`:
```yaml
type: S3
config:
  bucket: "thanos-metrics"
  endpoint: "s3.amazonaws.com"
  region: "us-east-1"
  access_key: "${AWS_ACCESS_KEY_ID}"
  secret_key: "${AWS_SECRET_ACCESS_KEY}"
  insecure: false
  signature_version2: false
  encrypt_sse: true
  put_user_metadata: {}
  http_config:
    idle_conn_timeout: 90s
    response_header_timeout: 2m
    insecure_skip_verify: false
  trace:
    enable: false
```

## 📊 Performance Optimization

### 1. Prometheus Optimization

Update `prometheus/prometheus.yml`:
```yaml
global:
  scrape_interval: 30s  # Increase for production
  evaluation_interval: 30s
  external_labels:
    cluster: 'production'
    replica: '$(HOSTNAME)'

# Remote write for long-term storage
remote_write:
  - url: "http://thanos-receive:19291/api/v1/receive"
    queue_config:
      capacity: 10000
      max_shards: 30
      min_shards: 1
      max_samples_per_send: 5000
      batch_send_deadline: 5s
      min_backoff: 30ms
      max_backoff: 100ms

# Optimized scrape configs
scrape_configs:
  - job_name: 'manufacturing_api'
    scrape_interval: 15s
    metrics_path: '/api/metrics'
    static_configs:
      - targets: ['manufacturing-api:3000']
    metric_relabel_configs:
      # Drop unnecessary metrics
      - source_labels: [__name__]
        regex: 'go_.*'
        action: drop
```

### 2. manufacturingPlatform Performance

Create `monitoring/manufacturingPlatform/manufacturingPlatform.ini`:
```ini
[database]
type = postgres
host = postgres:5432
name = manufacturingPlatform
user = manufacturingPlatform
password = ${MANUFACTURING_PLATFORM_DB_PASSWORD}
max_open_conn = 100
max_idle_conn = 100
conn_max_lifetime = 14400

[cache]
enabled = true

[dataproxy]
timeout = 300
keep_alive_seconds = 300
idle_conn_timeout_seconds = 300

[dashboards]
versions_to_keep = 20
min_refresh_interval = 10s

[rendering]
concurrent_render_request_limit = 4

[metrics]
enabled = true
interval_seconds = 10
```

### 3. Loki Optimization

Create `monitoring/loki/loki-production.yml`:
```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 2
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: consul
      consul:
        host: consul:8500

ingester:
  chunk_idle_period: 30m
  max_chunk_age: 2h
  chunk_target_size: 1572864
  chunk_retain_period: 5m
  max_transfer_retries: 0
  wal:
    enabled: true
    dir: /loki/wal

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: s3
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  aws:
    s3: s3://us-east-1/loki-logs
    bucketnames: loki-logs
    region: us-east-1
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    cache_ttl: 24h

compactor:
  working_directory: /loki/boltdb-shipper-compactor
  shared_store: s3

limits_config:
  enforce_metric_name: false
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  ingestion_rate_mb: 16
  ingestion_burst_size_mb: 32
  max_query_series: 100000
  max_query_parallelism: 32

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h
```

## 🔄 Backup & Disaster Recovery

### 1. Automated Backup Script

Create `monitoring/scripts/production-backup.sh`:
```bash
#!/bin/bash
set -euo pipefail

# Production backup script with S3 upload

BACKUP_DIR="/backups/monitoring/$(date +%Y%m%d_%H%M%S)"
S3_BUCKET="s3://company-backups/monitoring"
RETENTION_DAYS=30

echo "🔄 Starting production backup..."

# Create backup using existing script
./backup.sh

# Find latest backup
LATEST_BACKUP=$(ls -t /backups/monitoring/*.tar.gz | head -1)

# Upload to S3
echo "☁️ Uploading to S3..."
aws s3 cp "$LATEST_BACKUP" "$S3_BUCKET/" \
  --storage-class STANDARD_IA \
  --metadata "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Clean up old local backups
echo "🧹 Cleaning up old backups..."
find /backups/monitoring -name "*.tar.gz" -mtime +7 -delete

# Clean up old S3 backups
echo "🧹 Cleaning up old S3 backups..."
aws s3 ls "$S3_BUCKET/" | while read -r line; do
  createDate=$(echo $line | awk '{print $1" "$2}')
  createDate=$(date -d "$createDate" +%s)
  olderThan=$(date -d "$RETENTION_DAYS days ago" +%s)
  if [[ $createDate -lt $olderThan ]]; then
    fileName=$(echo $line | awk '{print $4}')
    if [[ $fileName != "" ]]; then
      aws s3 rm "$S3_BUCKET/$fileName"
    fi
  fi
done

echo "✅ Production backup completed"
```

### 2. Disaster Recovery Runbook

Create `monitoring/DISASTER-RECOVERY.md`:
```markdown
# Disaster Recovery Runbook

## Recovery Time Objectives
- RTO: 4 hours
- RPO: 1 hour

## Recovery Procedures

### 1. Complete System Failure
```bash
# 1. Deploy new infrastructure
terraform apply -auto-approve

# 2. Restore from S3 backup
aws s3 cp s3://company-backups/monitoring/latest.tar.gz .
./scripts/restore.sh latest.tar.gz

# 3. Verify services
./scripts/validate-monitoring.sh
```

### 2. Data Corruption
```bash
# 1. Stop affected service
docker-compose stop prometheus

# 2. Restore data from snapshot
./scripts/restore-prometheus-snapshot.sh

# 3. Restart service
docker-compose start prometheus
```

### 3. Network Partition
1. Check network connectivity
2. Verify DNS resolution
3. Check firewall rules
4. Restart affected services
```

## 📈 Monitoring the Monitoring

### 1. Meta-Monitoring Setup

Create a separate Prometheus instance to monitor your monitoring stack:

```yaml
# monitoring/meta-monitoring/prometheus.yml
global:
  scrape_interval: 60s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['prometheus-1:9090', 'prometheus-2:9090']

  - job_name: 'manufacturingPlatform'
    static_configs:
      - targets: ['manufacturingPlatform:3000']

  - job_name: 'alertmanager'
    static_configs:
      - targets: ['alertmanager-1:9093', 'alertmanager-2:9093']

  - job_name: 'loki'
    static_configs:
      - targets: ['loki:3100']

  - job_name: 'jaeger'
    static_configs:
      - targets: ['jaeger:14269']

rule_files:
  - '/etc/prometheus/meta-alerts.yml'
```

### 2. Meta-Monitoring Alerts

Create `monitoring/meta-monitoring/meta-alerts.yml`:
```yaml
groups:
  - name: meta_monitoring
    interval: 30s
    rules:
      - alert: PrometheusDown
        expr: up{job="prometheus"} == 0
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "Prometheus instance {{ $labels.instance }} is down"

      - alert: ManufacturingPlatformDown
        expr: up{job="manufacturingPlatform"} == 0
        for: 5m
        labels:
          severity: critical
          team: platform
        annotations:
          summary: "manufacturingPlatform is down"

      - alert: HighMemoryUsage
        expr: >
          (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))
          * 100 > 90
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
```

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Review security configuration
- [ ] Test backup/restore procedures
- [ ] Verify resource requirements
- [ ] Update DNS entries
- [ ] Configure SSL certificates
- [ ] Review alert routing
- [ ] Test authentication

### Deployment
- [ ] Deploy infrastructure (Terraform/K8s)
- [ ] Configure persistent storage
- [ ] Deploy monitoring stack
- [ ] Import dashboards
- [ ] Configure data sources
- [ ] Test alert channels
- [ ] Run validation script

### Post-Deployment
- [ ] Monitor resource usage
- [ ] Verify data retention
- [ ] Test disaster recovery
- [ ] Document access procedures
- [ ] Train operations team
- [ ] Schedule regular reviews

## 📞 Support Escalation

### Level 1: On-Call Engineer
- Check service health
- Review recent changes
- Restart failed services
- Check disk space

### Level 2: Platform Team
- Debug configuration issues
- Investigate performance problems
- Implement fixes

### Level 3: Vendor Support
- Prometheus/manufacturingPlatform enterprise support
- Cloud provider support
- Database vendor support

## 📚 References

- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [manufacturingPlatform Production Guide](https://manufacturingPlatform.com/docs/manufacturingPlatform/latest/administration/)
- [Thanos Documentation](https://thanos.io/tip/thanos/)
- [Monitoring Strategy Guide](https://sre.google/sre-book/monitoring-distributed-systems/)
```