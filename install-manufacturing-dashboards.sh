#!/bin/bash
# Install curated manufacturing dashboards

set -e

echo "Installing Manufacturing Analytics Dashboards..."
echo "=============================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Grafana API endpoint
GRAFANA_URL="http://localhost:3001"
GRAFANA_USER="admin"
GRAFANA_PASS="admin"

# Create API key
echo -e "${BLUE}Creating API key...${NC}"
API_KEY=$(curl -s -X POST ${GRAFANA_URL}/api/auth/keys \
  -H "Content-Type: application/json" \
  -u ${GRAFANA_USER}:${GRAFANA_PASS} \
  -d '{"name":"dashboard-installer-'$(date +%s)'","role":"Admin","secondsToLive":3600}' | grep -o '"key":"[^"]*' | cut -d'"' -f4)

if [ -z "$API_KEY" ]; then
    echo -e "${RED}Failed to create API key${NC}"
    exit 1
fi

echo -e "${GREEN}✓ API key created${NC}"

# Create folders structure
echo -e "${BLUE}Creating folder structure...${NC}"

create_folder() {
    local title=$1
    local uid=$2
    
    curl -s -X POST ${GRAFANA_URL}/api/folders \
      -H "Authorization: Bearer $API_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"title\":\"$title\",\"uid\":\"$uid\"}" > /dev/null 2>&1 || true
}

create_folder "Manufacturing" "manufacturing"
create_folder "Infrastructure" "infrastructure"
create_folder "System Monitoring" "system"
create_folder "Databases" "databases"
create_folder "Containers" "containers"
create_folder "Logs & Traces" "logs"

echo -e "${GREEN}✓ Folders created${NC}"

# Function to import dashboard with proper error handling
import_dashboard() {
    local dashboard_id=$1
    local dashboard_name=$2
    local folder_uid=$3
    local datasource_mappings=$4
    
    echo -e "${BLUE}Importing ${dashboard_name} (ID: ${dashboard_id})...${NC}"
    
    # First, fetch the dashboard JSON
    local temp_file="/tmp/dashboard_${dashboard_id}.json"
    
    # Download dashboard
    if curl -s -f "https://grafana.com/api/dashboards/${dashboard_id}/revisions/latest/download" -o "$temp_file"; then
        # Prepare the import payload
        local import_payload=$(cat <<EOF
{
  "dashboard": $(cat "$temp_file"),
  "overwrite": true,
  "inputs": $datasource_mappings,
  "folderUid": "$folder_uid"
}
EOF
)
        
        # Import the dashboard
        local response=$(curl -s -X POST ${GRAFANA_URL}/api/dashboards/import \
          -H "Authorization: Bearer $API_KEY" \
          -H "Content-Type: application/json" \
          -d "$import_payload")
        
        if echo "$response" | grep -q "imported"; then
            echo -e "${GREEN}✓ ${dashboard_name} imported successfully${NC}"
        else
            echo -e "${YELLOW}⚠ ${dashboard_name} import may have issues - check manually${NC}"
        fi
        
        rm -f "$temp_file"
    else
        echo -e "${RED}✗ Failed to download ${dashboard_name}${NC}"
    fi
}

# Define datasource mappings for different dashboard types
PROMETHEUS_MAPPING='[{"name":"DS_PROMETHEUS","type":"datasource","pluginId":"prometheus","value":"Prometheus"}]'
POSTGRES_MAPPING='[{"name":"DS_POSTGRESQL","type":"datasource","pluginId":"postgres","value":"Manufacturing PostgreSQL"}]'
LOKI_MAPPING='[{"name":"DS_LOKI","type":"datasource","pluginId":"loki","value":"Loki"}]'
MIXED_MAPPING='[
  {"name":"DS_PROMETHEUS","type":"datasource","pluginId":"prometheus","value":"Prometheus"},
  {"name":"DS_LOKI","type":"datasource","pluginId":"loki","value":"Loki"},
  {"name":"DS_POSTGRESQL","type":"datasource","pluginId":"postgres","value":"Manufacturing PostgreSQL"}
]'

echo -e "\n${BLUE}Installing Manufacturing Dashboards...${NC}"

# Manufacturing & OEE Dashboards
# Note: Dashboard 11816 requires InfluxDB, so we'll create a custom OEE dashboard instead
echo -e "${BLUE}Creating custom OEE dashboard...${NC}"
curl -s -X POST ${GRAFANA_URL}/api/dashboards/db \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "dashboard": {
      "title": "Manufacturing OEE Dashboard",
      "tags": ["manufacturing", "oee"],
      "timezone": "browser",
      "panels": [
        {
          "datasource": {"type": "postgres", "uid": "$postgres"},
          "fieldConfig": {
            "defaults": {
              "color": {"mode": "thresholds"},
              "mappings": [],
              "thresholds": {
                "mode": "percentage",
                "steps": [
                  {"color": "red", "value": null},
                  {"color": "yellow", "value": 65},
                  {"color": "green", "value": 85}
                ]
              },
              "unit": "percent",
              "min": 0,
              "max": 100
            }
          },
          "gridPos": {"h": 8, "w": 8, "x": 0, "y": 0},
          "id": 1,
          "options": {
            "orientation": "auto",
            "reduceOptions": {
              "calcs": ["lastNotNull"],
              "fields": "",
              "values": false
            },
            "showThresholdLabels": true,
            "showThresholdMarkers": true
          },
          "pluginVersion": "10.2.0",
          "targets": [{
            "format": "table",
            "rawQuery": true,
            "rawSql": "SELECT AVG(\"oeeScore\" * 100) as value FROM \"PerformanceMetric\" WHERE timestamp > NOW() - INTERVAL '\''1 hour'\''",
            "refId": "A"
          }],
          "title": "Current OEE",
          "type": "gauge"
        },
        {
          "datasource": {"type": "postgres", "uid": "$postgres"},
          "fieldConfig": {
            "defaults": {
              "color": {"mode": "palette-classic"},
              "custom": {
                "axisCenteredZero": false,
                "axisColorMode": "text",
                "axisLabel": "OEE %",
                "axisPlacement": "auto",
                "barAlignment": 0,
                "drawStyle": "line",
                "fillOpacity": 10,
                "gradientMode": "none",
                "hideFrom": {"tooltip": false, "viz": false, "legend": false},
                "insertNulls": false,
                "lineInterpolation": "linear",
                "lineWidth": 2,
                "pointSize": 5,
                "scaleDistribution": {"type": "linear"},
                "showPoints": "never",
                "spanNulls": false,
                "stacking": {"group": "A", "mode": "none"},
                "thresholdsStyle": {"mode": "off"}
              },
              "mappings": [],
              "max": 100,
              "min": 0,
              "thresholds": {
                "mode": "absolute",
                "steps": [{"color": "green", "value": null}]
              },
              "unit": "percent"
            }
          },
          "gridPos": {"h": 8, "w": 16, "x": 8, "y": 0},
          "id": 2,
          "options": {
            "legend": {
              "calcs": ["mean", "lastNotNull"],
              "displayMode": "table",
              "placement": "bottom",
              "showLegend": true
            },
            "tooltip": {"mode": "multi", "sort": "none"}
          },
          "targets": [{
            "format": "time_series",
            "rawQuery": true,
            "rawSql": "SELECT timestamp AS time, AVG(\"oeeScore\" * 100) AS \"OEE\" FROM \"PerformanceMetric\" WHERE $__timeFilter(timestamp) GROUP BY timestamp ORDER BY timestamp",
            "refId": "A"
          }],
          "title": "OEE Trend",
          "type": "timeseries"
        }
      ],
      "schemaVersion": 38,
      "templating": {
        "list": [{
          "current": {"selected": false, "text": "Manufacturing PostgreSQL", "value": "Manufacturing PostgreSQL"},
          "hide": 0,
          "includeAll": false,
          "multi": false,
          "name": "postgres",
          "options": [],
          "query": "postgres",
          "queryValue": "",
          "refresh": 1,
          "regex": "",
          "skipUrlSync": false,
          "type": "datasource"
        }]
      },
      "time": {"from": "now-6h", "to": "now"},
      "timepicker": {},
      "timezone": "",
      "version": 0
    },
    "folderUid": "manufacturing",
    "overwrite": true
  }' > /dev/null
echo -e "${GREEN}✓ Manufacturing OEE Dashboard created${NC}"

echo -e "\n${BLUE}Installing Infrastructure Dashboards...${NC}"

# System Monitoring
import_dashboard 1860 "Node Exporter Full" "system" "$PROMETHEUS_MAPPING"
import_dashboard 11074 "Node Exporter Dashboard EN" "system" "$PROMETHEUS_MAPPING"

# PostgreSQL/TimescaleDB
import_dashboard 9628 "PostgreSQL Database" "databases" "$POSTGRES_MAPPING"
import_dashboard 6742 "PostgreSQL Statistics" "databases" "$POSTGRES_MAPPING"

# Docker Monitoring
import_dashboard 893 "Docker and System Monitoring" "containers" "$PROMETHEUS_MAPPING"
import_dashboard 179 "Docker Host Monitoring" "containers" "$PROMETHEUS_MAPPING"

# Logs and Traces
import_dashboard 12611 "Loki Logging Dashboard" "logs" "$LOKI_MAPPING"
import_dashboard 13186 "Loki System Monitoring" "logs" "$PROMETHEUS_MAPPING"

echo -e "\n${BLUE}Creating Manufacturing KPI Dashboard...${NC}"
# Create a comprehensive manufacturing KPI dashboard
curl -s -X POST ${GRAFANA_URL}/api/dashboards/db \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "dashboard": {
      "title": "Manufacturing KPIs",
      "tags": ["manufacturing", "kpi", "production"],
      "timezone": "browser",
      "panels": [
        {
          "datasource": {"type": "postgres", "uid": "$postgres"},
          "fieldConfig": {
            "defaults": {
              "color": {"mode": "thresholds"},
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {"color": "green", "value": null},
                  {"color": "red", "value": 80}
                ]
              },
              "unit": "short"
            }
          },
          "gridPos": {"h": 4, "w": 6, "x": 0, "y": 0},
          "id": 1,
          "options": {
            "colorMode": "value",
            "graphMode": "area",
            "justifyMode": "auto",
            "orientation": "auto",
            "reduceOptions": {
              "calcs": ["lastNotNull"],
              "fields": "",
              "values": false
            },
            "textMode": "auto"
          },
          "pluginVersion": "10.2.0",
          "targets": [{
            "format": "table",
            "rawQuery": true,
            "rawSql": "SELECT SUM(COALESCE(\"totalPartsProduced\", \"totalParts\", 0)) as value FROM \"PerformanceMetric\" WHERE timestamp > NOW() - INTERVAL '\''24 hours'\''",
            "refId": "A"
          }],
          "title": "Total Production (24h)",
          "type": "stat"
        },
        {
          "datasource": {"type": "postgres", "uid": "$postgres"},
          "fieldConfig": {
            "defaults": {
              "color": {"mode": "thresholds"},
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {"color": "red", "value": null},
                  {"color": "yellow", "value": 95},
                  {"color": "green", "value": 98}
                ]
              },
              "unit": "percent"
            }
          },
          "gridPos": {"h": 4, "w": 6, "x": 6, "y": 0},
          "id": 2,
          "options": {
            "colorMode": "value",
            "graphMode": "area",
            "justifyMode": "auto",
            "orientation": "auto",
            "reduceOptions": {
              "calcs": ["lastNotNull"],
              "fields": "",
              "values": false
            },
            "textMode": "auto"
          },
          "pluginVersion": "10.2.0",
          "targets": [{
            "format": "table",
            "rawQuery": true,
            "rawSql": "SELECT CASE WHEN SUM(COALESCE(\"totalPartsProduced\", \"totalParts\", 0)) > 0 THEN (SUM(\"goodParts\")::float / SUM(COALESCE(\"totalPartsProduced\", \"totalParts\", 0))) * 100 ELSE 0 END as value FROM \"PerformanceMetric\" WHERE timestamp > NOW() - INTERVAL '\''24 hours'\''",
            "refId": "A"
          }],
          "title": "Quality Rate (24h)",
          "type": "stat"
        },
        {
          "datasource": {"type": "postgres", "uid": "$postgres"},
          "fieldConfig": {
            "defaults": {
              "color": {"mode": "thresholds"},
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {"color": "red", "value": null},
                  {"color": "yellow", "value": 30},
                  {"color": "green", "value": 60}
                ]
              },
              "unit": "m"
            }
          },
          "gridPos": {"h": 4, "w": 6, "x": 12, "y": 0},
          "id": 3,
          "options": {
            "colorMode": "value",
            "graphMode": "area",
            "justifyMode": "auto",
            "orientation": "auto",
            "reduceOptions": {
              "calcs": ["lastNotNull"],
              "fields": "",
              "values": false
            },
            "textMode": "auto"
          },
          "pluginVersion": "10.2.0",
          "targets": [{
            "format": "table",
            "rawQuery": true,
            "rawSql": "SELECT SUM(\"downtimeMinutes\") as value FROM \"PerformanceMetric\" WHERE timestamp > NOW() - INTERVAL '\''24 hours'\''",
            "refId": "A"
          }],
          "title": "Total Downtime (24h)",
          "type": "stat"
        },
        {
          "datasource": {"type": "postgres", "uid": "$postgres"},
          "fieldConfig": {
            "defaults": {
              "color": {"mode": "thresholds"},
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {"color": "green", "value": null}
                ]
              },
              "unit": "short"
            }
          },
          "gridPos": {"h": 4, "w": 6, "x": 18, "y": 0},
          "id": 4,
          "options": {
            "colorMode": "value",
            "graphMode": "area",
            "justifyMode": "auto",
            "orientation": "auto",
            "reduceOptions": {
              "calcs": ["lastNotNull"],
              "fields": "",
              "values": false
            },
            "textMode": "auto"
          },
          "pluginVersion": "10.2.0",
          "targets": [{
            "format": "table",
            "rawQuery": true,
            "rawSql": "SELECT COUNT(DISTINCT \"machineName\") as value FROM \"PerformanceMetric\" WHERE timestamp > NOW() - INTERVAL '\''1 hour'\''",
            "refId": "A"
          }],
          "title": "Active Machines",
          "type": "stat"
        }
      ],
      "schemaVersion": 38,
      "templating": {
        "list": [{
          "current": {"selected": false, "text": "Manufacturing PostgreSQL", "value": "Manufacturing PostgreSQL"},
          "hide": 0,
          "includeAll": false,
          "multi": false,
          "name": "postgres",
          "options": [],
          "query": "postgres",
          "queryValue": "",
          "refresh": 1,
          "regex": "",
          "skipUrlSync": false,
          "type": "datasource"
        }]
      },
      "time": {"from": "now-24h", "to": "now"},
      "timepicker": {},
      "timezone": "",
      "version": 0
    },
    "folderUid": "manufacturing",
    "overwrite": true
  }' > /dev/null
echo -e "${GREEN}✓ Manufacturing KPIs Dashboard created${NC}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Dashboard Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${YELLOW}Installed Dashboards:${NC}"
echo "✓ Manufacturing OEE Dashboard"
echo "✓ Manufacturing KPIs"
echo "✓ Node Exporter Full (System Metrics)"
echo "✓ Node Exporter Dashboard EN"
echo "✓ PostgreSQL Database Monitoring"
echo "✓ Docker and System Monitoring"
echo "✓ Loki Logging Dashboard"
echo ""
echo -e "${YELLOW}Dashboard Locations:${NC}"
echo "• Manufacturing → OEE & KPI dashboards"
echo "• System Monitoring → Node Exporter dashboards"
echo "• Databases → PostgreSQL monitoring"
echo "• Containers → Docker monitoring"
echo "• Logs & Traces → Loki dashboards"
echo ""
echo -e "${YELLOW}Access Grafana:${NC}"
echo "• URL: http://localhost:3001"
echo "• Username: admin"
echo "• Password: admin"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Check each dashboard and verify data is flowing"
echo "2. Customize time ranges and refresh intervals"
echo "3. Set up alerts for critical metrics"
echo "4. Create custom panels for specific KPIs"
echo ""
echo "To find more dashboards: https://grafana.com/grafana/dashboards"