#!/bin/bash
# Import popular community dashboards from Grafana.com

set -e

echo "Importing community dashboards for Manufacturing Analytics..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get API key
API_KEY=$(curl -s -X POST http://admin:admin@localhost:3001/api/auth/keys \
  -H "Content-Type: application/json" \
  -d '{"name":"dashboard-importer","role":"Admin","secondsToLive":3600}' | grep -o '"key":"[^"]*' | cut -d'"' -f4)

if [ -z "$API_KEY" ]; then
    echo "Failed to create API key"
    exit 1
fi

echo -e "${BLUE}API Key created successfully${NC}"

# Function to import dashboard from grafana.com
import_dashboard() {
    local dashboard_id=$1
    local dashboard_name=$2
    local folder_uid=$3
    
    echo -e "${BLUE}Importing ${dashboard_name} (ID: ${dashboard_id})...${NC}"
    
    # Download dashboard from grafana.com
    dashboard_json=$(curl -s "https://grafana.com/api/dashboards/${dashboard_id}/revisions/latest/download")
    
    # Import to Grafana
    curl -s -X POST http://localhost:3001/api/dashboards/import \
      -H "Authorization: Bearer $API_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"dashboard\": ${dashboard_json},
        \"overwrite\": true,
        \"inputs\": [
          {\"name\": \"DS_PROMETHEUS\", \"type\": \"datasource\", \"pluginId\": \"prometheus\", \"value\": \"Prometheus\"},
          {\"name\": \"DS_LOKI\", \"type\": \"datasource\", \"pluginId\": \"loki\", \"value\": \"Loki\"},
          {\"name\": \"DS_POSTGRESQL\", \"type\": \"datasource\", \"pluginId\": \"postgres\", \"value\": \"Manufacturing PostgreSQL\"}
        ],
        \"folderUid\": \"${folder_uid}\"
      }" > /dev/null
      
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ${dashboard_name} imported successfully${NC}"
    else
        echo -e "${YELLOW}⚠ Failed to import ${dashboard_name}${NC}"
    fi
}

# Create folders
echo -e "${BLUE}Creating dashboard folders...${NC}"

# System folder
SYSTEM_FOLDER=$(curl -s -X POST http://localhost:3001/api/folders \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"System Monitoring","uid":"system-monitoring"}' | grep -o '"uid":"[^"]*' | cut -d'"' -f4)

# Infrastructure folder  
INFRA_FOLDER=$(curl -s -X POST http://localhost:3001/api/folders \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Infrastructure","uid":"infrastructure"}' | grep -o '"uid":"[^"]*' | cut -d'"' -f4)

# Application folder
APP_FOLDER=$(curl -s -X POST http://localhost:3001/api/folders \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Applications","uid":"applications"}' | grep -o '"uid":"[^"]*' | cut -d'"' -f4)

# Import popular dashboards
echo -e "\n${BLUE}Importing System Monitoring Dashboards...${NC}"

# Node Exporter Full - Most popular system metrics dashboard
import_dashboard 1860 "Node Exporter Full" "$SYSTEM_FOLDER"

# Docker Container & Host Metrics
import_dashboard 10619 "Docker Host & Container Overview" "$SYSTEM_FOLDER"

# PostgreSQL Database Stats
import_dashboard 9628 "PostgreSQL Database" "$INFRA_FOLDER"

# Loki & Promtail Dashboard
import_dashboard 13639 "Logs / App" "$INFRA_FOLDER"

# Prometheus Stats
import_dashboard 3662 "Prometheus 2.0 Overview" "$INFRA_FOLDER"

# Jaeger Dashboard
import_dashboard 10001 "Jaeger / Tracing" "$INFRA_FOLDER"

# Alertmanager Dashboard
import_dashboard 9578 "Alertmanager" "$INFRA_FOLDER"

# Kubernetes Cluster Monitoring (if using K8s)
import_dashboard 7249 "Kubernetes Cluster Summary" "$INFRA_FOLDER"

# NGINX Monitoring
import_dashboard 12708 "NGINX" "$APP_FOLDER"

# Redis Dashboard
import_dashboard 11835 "Redis Dashboard" "$INFRA_FOLDER"

# Application Performance Monitoring
import_dashboard 11159 "APM / Application" "$APP_FOLDER"

# SLO/SLI Dashboard
import_dashboard 14348 "SLO / Error Budget" "$APP_FOLDER"

echo -e "\n${BLUE}Creating custom manufacturing dashboards...${NC}"

# Create a custom OEE/Manufacturing specific dashboard
curl -s -X POST http://localhost:3001/api/dashboards/db \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "dashboard": {
      "title": "Manufacturing KPIs",
      "tags": ["manufacturing", "kpi", "oee"],
      "timezone": "browser",
      "panels": [
        {
          "datasource": {"type": "postgres", "uid": "Manufacturing PostgreSQL"},
          "targets": [
            {
              "format": "table",
              "group": [],
              "metricColumn": "none",
              "rawQuery": true,
              "rawSql": "SELECT NOW() as time, AVG(\"oeeScore\") * 100 as \"OEE %\" FROM \"PerformanceMetric\" WHERE timestamp > NOW() - INTERVAL '\''1 hour'\''",
              "refId": "A"
            }
          ],
          "title": "Current OEE",
          "type": "gauge",
          "gridPos": {"h": 8, "w": 6, "x": 0, "y": 0},
          "id": 1
        }
      ],
      "schemaVersion": 27,
      "version": 0
    },
    "folderUid": "manufacturing",
    "overwrite": true
  }' > /dev/null

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Dashboard Import Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${YELLOW}Imported Dashboards:${NC}"
echo "• Node Exporter Full - Complete system metrics"
echo "• Docker Monitoring - Container and host metrics"
echo "• PostgreSQL Database - Database performance"
echo "• Logs / App - Log analysis with Loki"
echo "• Prometheus Overview - Metrics system health"
echo "• Jaeger / Tracing - Distributed tracing"
echo "• Alertmanager - Alert overview"
echo "• Redis Dashboard - Cache metrics"
echo "• APM / Application - Application performance"
echo "• SLO / Error Budget - Service level objectives"

echo -e "\n${YELLOW}Access Grafana:${NC}"
echo "• URL: http://localhost:3001"
echo "• Username: admin"
echo "• Password: admin"

echo -e "\n${YELLOW}Tips:${NC}"
echo "• Dashboards may need minor adjustments for your specific metrics"
echo "• Check dashboard variables/queries if data doesn't appear"
echo "• You can find more dashboards at: https://grafana.com/grafana/dashboards"
echo "• Search for tags like 'prometheus', 'postgresql', 'industrial', 'iot'"