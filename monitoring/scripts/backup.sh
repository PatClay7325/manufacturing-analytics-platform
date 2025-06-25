#!/bin/bash
set -euo pipefail

# Manufacturing Analytics Platform - Monitoring Backup Script
# This script backs up Prometheus data, manufacturingPlatform dashboards, and configurations

BACKUP_DIR="/backups/monitoring/$(date +%Y%m%d_%H%M%S)"
PROMETHEUS_CONTAINER="manufacturing-prometheus"
MANUFACTURING_PLATFORM_CONTAINER="manufacturing-manufacturingPlatform"

echo "🔄 Starting monitoring backup..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup Prometheus data
echo "📊 Backing up Prometheus data..."
docker exec "$PROMETHEUS_CONTAINER" curl -XPOST http://localhost:9090/api/v1/admin/tsdb/snapshot
SNAPSHOT_NAME=$(docker exec "$PROMETHEUS_CONTAINER" ls -t /prometheus/snapshots | head -1)
docker cp "$PROMETHEUS_CONTAINER:/prometheus/snapshots/$SNAPSHOT_NAME" "$BACKUP_DIR/prometheus-snapshot"

# Backup manufacturingPlatform dashboards
echo "📈 Backing up manufacturingPlatform dashboards..."
mkdir -p "$BACKUP_DIR/manufacturingPlatform/dashboards"

# Export all dashboards
DASHBOARDS=$(docker exec "$MANUFACTURING_PLATFORM_CONTAINER" curl -s http://admin:${MANUFACTURING_PLATFORM_PASSWORD:-admin}@localhost:3000/api/search | jq -r '.[] | select(.type=="dash-db") | .uid')

for dashboard in $DASHBOARDS; do
    echo "  - Exporting dashboard: $dashboard"
    docker exec "$MANUFACTURING_PLATFORM_CONTAINER" curl -s \
        http://admin:${MANUFACTURING_PLATFORM_PASSWORD:-admin}@localhost:3000/api/dashboards/uid/$dashboard \
        | jq '.dashboard' > "$BACKUP_DIR/manufacturingPlatform/dashboards/$dashboard.json"
done

# Backup manufacturingPlatform datasources
echo "🔌 Backing up manufacturingPlatform datasources..."
docker exec "$MANUFACTURING_PLATFORM_CONTAINER" curl -s \
    http://admin:${MANUFACTURING_PLATFORM_PASSWORD:-admin}@localhost:3000/api/datasources \
    > "$BACKUP_DIR/manufacturingPlatform/datasources.json"

# Backup configurations
echo "⚙️ Backing up configurations..."
cp -r prometheus "$BACKUP_DIR/"
cp -r manufacturingPlatform "$BACKUP_DIR/"
cp -r alertmanager "$BACKUP_DIR/"
cp -r loki "$BACKUP_DIR/"
cp docker-compose.yml "$BACKUP_DIR/"

# Create backup metadata
cat > "$BACKUP_DIR/backup-metadata.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "1.0",
  "components": {
    "prometheus": {
      "snapshot": "$SNAPSHOT_NAME",
      "container": "$PROMETHEUS_CONTAINER"
    },
    "manufacturingPlatform": {
      "dashboards_count": $(echo "$DASHBOARDS" | wc -w),
      "container": "$MANUFACTURING_PLATFORM_CONTAINER"
    }
  }
}
EOF

# Compress backup
echo "🗜️ Compressing backup..."
tar -czf "$BACKUP_DIR.tar.gz" -C "$(dirname "$BACKUP_DIR")" "$(basename "$BACKUP_DIR")"
rm -rf "$BACKUP_DIR"

echo "✅ Backup completed: $BACKUP_DIR.tar.gz"
echo "📦 Backup size: $(du -h "$BACKUP_DIR.tar.gz" | cut -f1)"