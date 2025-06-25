#!/bin/bash
# Configure Grafana to use Prisma via JSON datasource

set -e

GRAFANA_URL="http://localhost:3001"
GRAFANA_USER="admin"
GRAFANA_PASS="admin"
AUTH="Authorization: Basic $(echo -n ${GRAFANA_USER}:${GRAFANA_PASS} | base64)"

echo "Configuring Prisma datasource in Grafana..."
echo "=========================================="

# First check if it already exists
existing=$(curl -s -H "$AUTH" "${GRAFANA_URL}/api/datasources/name/Prisma%20API" | grep -c "id" || echo "0")

if [ "$existing" = "1" ]; then
    echo "Updating existing Prisma API datasource..."
    ds_id=$(curl -s -H "$AUTH" "${GRAFANA_URL}/api/datasources/name/Prisma%20API" | grep -o '"id":[0-9]*' | grep -o '[0-9]*')
    
    response=$(curl -s -X PUT \
        -H "Content-Type: application/json" \
        -H "$AUTH" \
        -d '{
            "id": '$ds_id',
            "name": "Prisma API",
            "type": "grafana-simple-json-datasource",
            "url": "http://host.docker.internal:3000/api/grafana",
            "access": "proxy",
            "basicAuth": false,
            "jsonData": {
                "timeInterval": "10s"
            }
        }' \
        "${GRAFANA_URL}/api/datasources/${ds_id}")
else
    echo "Creating new Prisma API datasource..."
    response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "$AUTH" \
        -d '{
            "name": "Prisma API",
            "type": "grafana-simple-json-datasource",
            "url": "http://host.docker.internal:3000/api/grafana",
            "access": "proxy",
            "basicAuth": false,
            "isDefault": false,
            "jsonData": {
                "timeInterval": "10s"
            }
        }' \
        "${GRAFANA_URL}/api/datasources")
fi

if echo "$response" | grep -q "Datasource added\|Datasource updated\|success"; then
    echo "✓ Prisma API datasource configured"
else
    echo "✗ Failed to configure Prisma API: $response"
fi

# Test the datasource
echo ""
echo "Testing Prisma API datasource..."
ds_id=$(curl -s -H "$AUTH" "${GRAFANA_URL}/api/datasources/name/Prisma%20API" | grep -o '"id":[0-9]*' | grep -o '[0-9]*' || echo "")

if [ -n "$ds_id" ]; then
    test_response=$(curl -s -X POST \
        -H "$AUTH" \
        "${GRAFANA_URL}/api/datasources/${ds_id}/health")
    
    if echo "$test_response" | grep -q '"status":"OK"\|"status":"ok"'; then
        echo "✓ Prisma API datasource is healthy"
    else
        echo "Testing connection to API..."
        api_test=$(curl -s http://localhost:3000/api/grafana)
        if echo "$api_test" | grep -q "ok"; then
            echo "✓ API endpoint is accessible"
        else
            echo "✗ API endpoint not accessible: $api_test"
        fi
    fi
fi

echo ""
echo "Creating a sample dashboard using Prisma data..."
echo "=============================================="

# Create a dashboard that uses Prisma datasource
dashboard_json=$(cat <<'EOF'
{
  "dashboard": {
    "title": "Manufacturing Metrics (Prisma)",
    "panels": [
      {
        "id": 1,
        "title": "OEE by Equipment",
        "type": "table",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
        "datasource": "Prisma API",
        "targets": [
          {
            "target": "oee_by_equipment",
            "type": "table"
          }
        ]
      },
      {
        "id": 2,
        "title": "Production Summary",
        "type": "table",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
        "datasource": "Prisma API",
        "targets": [
          {
            "target": "production_summary",
            "type": "table"
          }
        ]
      },
      {
        "id": 3,
        "title": "Downtime Analysis",
        "type": "piechart",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 },
        "datasource": "Prisma API",
        "targets": [
          {
            "target": "downtime_analysis",
            "type": "table"
          }
        ]
      },
      {
        "id": 4,
        "title": "Shift Performance",
        "type": "bargauge",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 8 },
        "datasource": "Prisma API",
        "targets": [
          {
            "target": "shift_performance",
            "type": "table"
          }
        ]
      }
    ],
    "schemaVersion": 30,
    "time": { "from": "now-6h", "to": "now" },
    "timepicker": {},
    "timezone": "browser",
    "uid": "prisma-metrics"
  },
  "overwrite": true
}
EOF
)

dashboard_response=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -H "$AUTH" \
    -d "$dashboard_json" \
    "${GRAFANA_URL}/api/dashboards/import")

if echo "$dashboard_response" | grep -q "imported successfully\|\"imported\":true"; then
    echo "✓ Sample dashboard created"
    echo ""
    echo "View the new dashboard at:"
    echo "http://localhost:3001/d/prisma-metrics/manufacturing-metrics-prisma"
else
    echo "✗ Failed to create dashboard: $dashboard_response"
fi

echo ""
echo "Configuration complete!"
echo "====================="
echo ""
echo "The Prisma API datasource is now available in Grafana."
echo "You can:"
echo "1. Create new dashboards using 'Prisma API' as the datasource"
echo "2. Update existing dashboards to use 'Prisma API' instead of PostgreSQL"
echo "3. Available queries:"
echo "   - performance_metrics"
echo "   - oee_by_equipment"
echo "   - production_summary"
echo "   - downtime_analysis"
echo "   - quality_metrics"
echo "   - equipment_list"
echo "   - shift_performance"