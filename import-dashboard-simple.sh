#!/bin/bash
# Simple dashboard import using Grafana UI import feature

echo "Simple Dashboard Import Guide"
echo "============================"
echo ""
echo "To import community dashboards:"
echo ""
echo "1. Open Grafana: http://localhost:3001"
echo "2. Login with: admin/admin"
echo "3. Go to: Dashboards → Browse → Import"
echo ""
echo "Recommended Manufacturing Dashboards to Import:"
echo ""
echo "🏭 ESSENTIAL DASHBOARDS:"
echo "   • 1860  - Node Exporter Full (System Metrics)"
echo "   • 9628  - PostgreSQL Database"
echo "   • 13639 - Loki & Promtail (Logs)"
echo "   • 893   - Docker and System Monitoring"
echo ""
echo "📊 MANUFACTURING SPECIFIC:"
echo "   • 15427 - OEE Dashboard"
echo "   • 14997 - Production Line Monitoring"
echo "   • 10844 - Industrial IoT Sensor Data"
echo "   • 14199 - Energy Monitoring"
echo ""
echo "🔧 INFRASTRUCTURE:"
echo "   • 3662  - Prometheus 2.0 Overview"
echo "   • 10001 - Jaeger / Tracing"
echo "   • 9578  - Alertmanager"
echo "   • 11835 - Redis Dashboard"
echo ""
echo "📈 BUSINESS & QUALITY:"
echo "   • 14348 - SLO / Error Budget"
echo "   • 11190 - Business Metrics"
echo "   • 13332 - SPC Dashboard (Statistical Process Control)"
echo ""
echo "When importing, map data sources as follows:"
echo "   • DS_PROMETHEUS → Prometheus"
echo "   • DS_LOKI → Loki"
echo "   • DS_POSTGRESQL → Manufacturing PostgreSQL"
echo ""

# Create a simple API-based importer for one dashboard as example
API_KEY=$(curl -s -X POST http://admin:admin@localhost:3001/api/auth/keys \
  -H "Content-Type: application/json" \
  -d '{"name":"simple-import","role":"Admin","secondsToLive":300}' 2>/dev/null | grep -o '"key":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$API_KEY" ]; then
    echo "Importing a sample dashboard via API..."
    
    # Import a simple dashboard
    curl -X POST "http://localhost:3001/api/dashboards/import" \
      -H "Authorization: Bearer $API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "dashboard": {
          "id": null,
          "title": "Quick Manufacturing Overview",
          "tags": ["manufacturing"],
          "timezone": "browser",
          "panels": [
            {
              "datasource": {
                "type": "prometheus",
                "uid": "${prometheus}"
              },
              "fieldConfig": {
                "defaults": {
                  "color": {"mode": "palette-classic"},
                  "unit": "percent"
                }
              },
              "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
              "id": 1,
              "targets": [
                {
                  "expr": "100 - (avg(irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
                  "refId": "A"
                }
              ],
              "title": "CPU Usage",
              "type": "timeseries"
            }
          ],
          "schemaVersion": 38,
          "version": 0
        },
        "overwrite": true
      }' 2>/dev/null
    
    echo "✓ Sample dashboard created"
fi

echo ""
echo "Visit http://localhost:3001 to start importing dashboards!"