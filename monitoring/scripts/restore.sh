#!/bin/bash
set -euo pipefail

# Manufacturing Analytics Platform - Monitoring Restore Script
# Usage: ./restore.sh <backup-file.tar.gz>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup-file.tar.gz>"
    exit 1
fi

BACKUP_FILE="$1"
RESTORE_DIR="/tmp/monitoring-restore-$(date +%Y%m%d_%H%M%S)"
PROMETHEUS_CONTAINER="manufacturing-prometheus"
MANUFACTURING_PLATFORM_CONTAINER="manufacturing-manufacturingPlatform"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "🔄 Starting monitoring restore from: $BACKUP_FILE"

# Extract backup
echo "📦 Extracting backup..."
mkdir -p "$RESTORE_DIR"
tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR"
BACKUP_DIR=$(find "$RESTORE_DIR" -maxdepth 1 -type d | tail -1)

# Read metadata
if [ -f "$BACKUP_DIR/backup-metadata.json" ]; then
    echo "📋 Backup metadata:"
    jq . "$BACKUP_DIR/backup-metadata.json"
fi

# Confirm restore
read -p "⚠️  This will overwrite current monitoring data. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Restore cancelled"
    rm -rf "$RESTORE_DIR"
    exit 1
fi

# Stop services
echo "⏹️  Stopping monitoring services..."
docker-compose down

# Restore Prometheus data
echo "📊 Restoring Prometheus data..."
if [ -d "$BACKUP_DIR/prometheus-snapshot" ]; then
    # Clear existing data
    docker volume rm monitoring_prometheus-data || true
    docker volume create monitoring_prometheus-data
    
    # Copy snapshot data
    docker run --rm -v monitoring_prometheus-data:/prometheus \
        -v "$BACKUP_DIR/prometheus-snapshot":/backup \
        busybox sh -c "cp -r /backup/* /prometheus/"
fi

# Restore configurations
echo "⚙️ Restoring configurations..."
cp -r "$BACKUP_DIR/prometheus"/* prometheus/
cp -r "$BACKUP_DIR/manufacturingPlatform"/* manufacturingPlatform/
cp -r "$BACKUP_DIR/alertmanager"/* alertmanager/
cp -r "$BACKUP_DIR/loki"/* loki/

# Start services
echo "▶️  Starting monitoring services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 20

# Restore manufacturingPlatform dashboards
echo "📈 Restoring manufacturingPlatform dashboards..."
if [ -d "$BACKUP_DIR/manufacturingPlatform/dashboards" ]; then
    for dashboard_file in "$BACKUP_DIR/manufacturingPlatform/dashboards"/*.json; do
        if [ -f "$dashboard_file" ]; then
            dashboard_name=$(basename "$dashboard_file" .json)
            echo "  - Importing dashboard: $dashboard_name"
            
            # Wrap dashboard in import format
            jq '{dashboard: ., overwrite: true}' "$dashboard_file" | \
            docker exec -i "$MANUFACTURING_PLATFORM_CONTAINER" curl -s -X POST \
                -H "Content-Type: application/json" \
                -d @- \
                http://admin:${MANUFACTURING_PLATFORM_PASSWORD:-admin}@localhost:3000/api/dashboards/db
        fi
    done
fi

# Restore manufacturingPlatform datasources
echo "🔌 Restoring manufacturingPlatform datasources..."
if [ -f "$BACKUP_DIR/manufacturingPlatform/datasources.json" ]; then
    # Note: Datasources are typically provisioned, so this is informational
    echo "  - Datasources are managed by provisioning"
fi

# Clean up
rm -rf "$RESTORE_DIR"

echo "✅ Restore completed successfully!"
echo ""
echo "📊 Access your monitoring stack at:"
echo "  - Prometheus: http://localhost:9090"
echo "  - manufacturingPlatform: http://localhost:3003 (admin/${MANUFACTURING_PLATFORM_PASSWORD:-admin})"
echo "  - AlertManager: http://localhost:9093"